/*  TSA 팔꿈치 보조기기 펌웨어 최종판  —  ESP32-C3 SuperMini
 *
 *  최종판 = v3 + 정렬 실패 시 모터를 끄고 화면에 알림
 *  최종판-2: 대화에서 찾았던 버그 다시 반영
 *   - 모드는 버튼 명령으로만 바뀜 (늦게 온 상태 요청이 모드를 되돌리던 버그)
 *   - 제어 계산을 모터 태스크로 옮김 (웹 처리 중에도 5 ms 마다 계산)
 *   - 폰 끊김 판정 0.4 s → 1.5 s  (와이파이가 잠깐 늦을 때 멈췄다 당기던 현상)
 *   - 수동 모드: 속도 자체에 걸던 브레이크 제거, 목표 속도와의 차이에만 감쇠
 *   - 화면에 응답 시간(ms) 표시, 시리얼 i1.0 / s 로 폰 없이 시험
 *
 *  v3 변경 (v2 대비):
 *   - 전압 대신 "전류(A)"로 지령.  phase_resistance·KV 로 전압을 계산하고
 *     전류 상한 1.5 A 를 넘지 않음 → DRV8313(2.5 A) 보호회로가 껐다 켜지는 문제 방지
 *   - 정렬 생략: 11/16 측정값 (1.4120 / CW) 을 사용.  모터 3선을 다시 꽂았으면 값이 틀릴 수 있음
 *   - 화면에 모터 전류 표시
 *
 *  폰에서:  와이파이 "TSA-ELBOW" (비밀번호 tsa12345) 접속 → 주소창에 192.168.4.1
 *
 *  아두이노 설정:  보드 ESP32C3 Dev Module,  USB CDC On Boot = Enabled
 *  필요한 라이브러리:  Simple FOC  2.3 이상
 *
 *  모드   0 정지(모터 힘 0)   1 수동(슬라이더)   2 자동(중력보상)   3 줄 전부 풀기
 *
 *  ※ 컴파일·실기 시험 전인 코드입니다.  수동 모드, 낮은 속도부터 시험하세요.
 */
#include <SimpleFOC.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>

// ------------------------------------------------------------------ 핀
#define PIN_IN1 0
#define PIN_IN2 1
#define PIN_IN3 3
#define PIN_EN  10
#define PIN_SCK 6
#define PIN_MISO 5
#define PIN_MOSI 7
#define PIN_CS  4
#define PIN_SDA 20
#define PIN_SCL 21
#define IMU_UPPER 0x68          // 상완, AD0 → GND
#define IMU_FORE  0x69          // 전완, AD0 → 3V3

// ------------------------------------------------------------------ 기구 (mm)
const float R_STR   = 2.0f;     // 축~줄 거리
const float A_U = 167.8f, H_U = 69.5f;   // 줄 출구: 팔꿈치에서 거리, 팔 축에서 높이
const float A_F = 70.5f,  H_F = 45.5f;   // 앵커 줄구멍
const float M_MAX   = 2.88f;    // 전완+손 최대 중력 모멘트 (Nm) — 시뮬레이터 값
const float MAX_TURNS = 16.0f;  // 꼬임 상한
const float ELBOW_MAX = 110.0f; // 이 각도를 넘으면 감기 금지

// ------------------------------------------------------------------ 모터 상수 (GL30 KV290, 실측 KV 약 255)
const float R_PHASE = 0.765f;     // 상저항 Ω (선간 1.53 / 2)
const float KV      = 255.0f;     // rpm/V
const float KT      = 0.0376f;    // 토크상수 Nm/A

// ------------------------------------------------------------------ 튜닝 (단위: A)
const float I_LIMIT  = 1.5f;      // 전체 전류 상한 — 드라이버 연속 1.75 A 아래
const float I_MANUAL = 1.5f;      // 수동 모드 상한
const float I_FOLLOW = 0.5f;      // 자동 모드에서 따라가기에 쓰는 상한
const float KP = 0.30f, KD = 0.01f;         // 자동 모드 따라가기용 (A/rad) — 부드럽게
const float KP_MAN = 1.2f;            // 수동·풀기: 위치 오차 → 전류 (A/rad)
const float KV_MAN = 0.04f;           // 수동·풀기: 속도 오차 → 전류 (A per rad/s)
const float LAG_MAX = 0.6f;           // 목표가 실제보다 앞서갈 수 있는 최대 (rad)
const float SLACK_MM    = 4.0f;   // 받쳐주지 않을 때 줄 여유
const float F_RATE      = 20.0f;  // 장력 변화 속도 제한 (N/s)
const float PHI_DEAD    = 10.0f;  // 전완이 이 각도 안쪽이면 받치지 않음 (도)
int   IMU_SIGN = 1;               // 굽혔을 때 각도가 −로 가면 화면에서 뒤집기

// ------------------------------------------------------------------ 객체
BLDCMotor         motor(7);
BLDCDriver3PWM    driver(PIN_IN1, PIN_IN2, PIN_IN3, PIN_EN);
MagneticSensorSPI sensor(AS5048_SPI, PIN_CS);
WebServer         server(80);

// ------------------------------------------------------------------ 상태
volatile int mode = 0;
volatile float sliderV = 0, assist = 0.5f;
const float MANUAL_MAX_TPS = 8.0f;   // 슬라이더 ±100 일 때 초당 바퀴 수
uint32_t lastCmdMs = 0;
volatile float testI = 0;             // 시리얼 i 명령 (모드 4)
const uint32_t STALE_MS = 1500;       // 폰 신호가 이만큼 끊기면 멈춤
bool  imuOK = false, imuZero = false, strZero = false;
float angU = 0, angF = 0, zeroU = 0, zeroF = 0;     // 도
float elbow = 0, phi = 0;                           // 도
float strZeroAngle = 0, tgt = 0, Fcmd = 0;
volatile float Icmd = 0;              // 제어 → FOC 태스크 (A)
volatile uint32_t focCount = 0;
const char *msg = "";
bool  focOK = false;                  // 정렬(initFOC) 성공 여부

// ------------------------------------------------------------------ IMU
bool mpuW(uint8_t a, uint8_t r, uint8_t v) {
  Wire.beginTransmission(a); Wire.write(r); Wire.write(v);
  return Wire.endTransmission() == 0;
}
bool mpuInit(uint8_t a) {
  return mpuW(a, 0x6B, 0x01) && mpuW(a, 0x1A, 0x06) &&   // 깨우기, DLPF 5 Hz
         mpuW(a, 0x1B, 0x00) && mpuW(a, 0x1C, 0x00) && mpuW(a, 0x19, 0x09);
}
// 보드의 X축이 팔 길이 방향, Z축이 팔이 굽는 평면 안(팔 앞쪽)을 보게 붙였다고 가정
bool mpuAngle(uint8_t a, float &deg) {
  Wire.beginTransmission(a); Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((int)a, 6) != 6) return false;
  uint8_t b[6];
  for (int i = 0; i < 6; i++) b[i] = Wire.read();    // 한 줄에 read() 두 번 쓰면 순서가 보장되지 않는다
  int16_t ax = (int16_t)((b[0] << 8) | b[1]);
  int16_t az = (int16_t)((b[4] << 8) | b[5]);
  deg = atan2f((float)az, (float)ax) * 57.29578f;
  return true;
}
float wrap180(float d) { while (d > 180) d -= 360; while (d < -180) d += 360; return d; }

// ------------------------------------------------------------------ 기구 계산
float strDist(float eDeg) {                 // 팔꿈치 각도 → 허브~앵커 직선거리
  float e = eDeg * 0.0174533f, c = cosf(e), s = sinf(e);
  float qy = -A_F * c + H_F * s, qz = A_F * s + H_F * c;
  return sqrtf((A_U - qy) * (A_U - qy) + (H_U - qz) * (H_U - qz));
}
float L0;                                   // 팔 폈을 때 줄 길이 (setup 에서 계산)
float twistFor(float x) {                   // 수축량 mm → 꼬임 rad
  if (x <= 0) return 0;
  float p = L0 - x; if (p < 1) p = 1;
  return sqrtf(L0 * L0 - p * p) / R_STR;
}
float jacobian(float th) {                  // 꼬임 rad → J (m/rad)
  float rt = R_STR * th, p2 = L0 * L0 - rt * rt;
  if (p2 < 1) p2 = 1;
  return (R_STR * R_STR * th / sqrtf(p2)) * 0.001f;
}
float momentArm(float e) {                  // 팔꿈치 각도 → 줄의 모멘트암 (m)
  static const float A[] = {0, 30, 45, 60, 90}, R[] = {6.02, 8.23, 8.92, 9.17, 7.35};
  if (e <= 0) return R[0] * 0.01f;
  for (int i = 0; i < 4; i++)
    if (e <= A[i+1]) return (R[i] + (R[i+1]-R[i]) * (e-A[i]) / (A[i+1]-A[i])) * 0.01f;
  return R[4] * 0.01f;
}

// ------------------------------------------------------------------ 웹
extern const char PAGE[] PROGMEM;
void hRoot() { server.send_P(200, "text/html; charset=utf-8", PAGE); }
void hDo() {
  String x = server.arg("x");
  if (x == "zi" && imuOK) { zeroU = angU; zeroF = angF; imuZero = true; }
  if (x == "zs") { strZeroAngle = motor.shaft_angle; tgt = 0; strZero = true; }
  if (x == "un" && strZero) mode = 3;
  if (x == "sg") IMU_SIGN = -IMU_SIGN;
  if (x == "m0") mode = 0;
  if ((x == "m1" || x == "m2") && focOK) {
    int m = x[1] - '0';
    if (m == 2 && !(imuOK && imuZero && strZero)) {
      msg = imuOK ? "자동은 ①② 영점을 먼저 잡아야 합니다" : "IMU 가 응답하지 않습니다";
    } else if (mode != 3) {
      tgt = motor.shaft_angle - strZeroAngle;      // 현재 위치에서 시작
      mode = m;
    }
  }
  lastCmdMs = millis();
  server.send(200, "text/plain", "ok");
}
void hState() {
  sliderV  = constrain(server.arg("v").toFloat(), -100, 100);
  assist   = constrain(server.arg("a").toFloat(), 0, 100) * 0.01f;
  lastCmdMs = millis();
  if (!focOK) msg = "모터 정렬 실패 — 엔코더 선을 확인하고 전원을 다시 켜세요";
  char b[260];
  snprintf(b, sizeof b,
    "{\"m\":%d,\"el\":%.1f,\"ph\":%.1f,\"tn\":%.2f,\"f\":%.1f,\"i\":%.2f,\"io\":%d,\"zi\":%d,\"zs\":%d,\"msg\":\"%s\"}",
    mode, elbow, phi, (motor.shaft_angle - strZeroAngle) / 6.2832f, Fcmd, (float)Icmd,
    imuOK, imuZero, strZero, msg);
  server.send(200, "application/json", b);
  if (focOK) msg = "";                         // 메시지는 한 번만 보낸다
}

// ------------------------------------------------------------------ 제어 (200 Hz)
void control(float dt) {
  if (!focOK) { mode = 0; Icmd = 0; return; }
  float th = motor.shaft_angle - strZeroAngle, w = motor.shaft_velocity;
  float thMax = MAX_TURNS * 6.2832f;
  bool stale = millis() - lastCmdMs > STALE_MS;      // 폰과 끊기면
  if (stale && mode != 4) { sliderV = 0; if (mode == 2) mode = 0; }
  if (mode == 4) { Icmd = constrain(testI, -I_LIMIT, I_LIMIT); tgt = th; return; }   // 시리얼 시험

  if (mode == 0) { Icmd = 0; Fcmd = 0; tgt = th; return; }

  if (mode == 1) {                                   // ---- 수동
    float v = sliderV * 0.01f * MANUAL_MAX_TPS * 6.2832f;
    if (!strZero) v *= 0.5f;                         // 0점 전에는 절반 속도
    if (v > 0 && imuOK && imuZero && elbow > ELBOW_MAX) v = 0;
    tgt += v * dt;
    if (strZero) tgt = constrain(tgt, 0, thMax);     // 0 아래로 가면 반대로 꼬인다
    if (strZero && ((tgt <= 0 && v < 0) || (tgt >= thMax && v > 0))) v = 0;   // 끝에 닿으면 속도 0
    tgt = constrain(tgt, th - LAG_MAX, th + LAG_MAX);   // 막혔을 때 목표가 혼자 달아나지 않게
    Fcmd = 0;
    Icmd = constrain(KP_MAN * (tgt - th) + KV_MAN * (v - w), -I_MANUAL, I_MANUAL);
    return;
  }

  if (mode == 3) {                                   // ---- 줄 전부 풀기
    const float vu = -4.0f * 6.2832f;
    tgt = max(0.0f, tgt + vu * dt);
    tgt = max(tgt, th - LAG_MAX);
    Icmd = constrain(KP_MAN * (tgt - th) + KV_MAN * (vu - w), -I_MANUAL, I_MANUAL);
    if (th < 0.5f) mode = 0;
    return;
  }

  // ---- 자동: 자세에 맞춰 팔 무게의 일정 비율을 받친다
  if (!imuOK) { mode = 0; Icmd = 0; return; }
  float e  = constrain(elbow, 0, 120);
  float ph = fabsf(phi);
  float Fwant = 0;
  if (ph > PHI_DEAD && elbow < ELBOW_MAX)
    Fwant = assist * M_MAX * sinf(min(ph, 90.0f) * 0.0174533f) / momentArm(e);
  float step = F_RATE * dt;                          // 힘이 갑자기 변하지 않게
  Fcmd += constrain(Fwant - Fcmd, -step, step);

  // 따라가기: 받치지 않을 때는 줄을 SLACK_MM 만큼 느슨하게, 받칠수록 여유를 없앤다
  float k = constrain(Fcmd / 5.0f, 0, 1);
  float x = (L0 - strDist(e)) - SLACK_MM * (1 - k);
  tgt = constrain(twistFor(x), 0, thMax);
  float If = constrain(KP * (tgt - th) - KD * w, -I_FOLLOW, I_FOLLOW);
  float Ia = Fcmd * jacobian(max(th, 0.0f)) / KT;   // 줄 장력 → 모터 토크 → 전류
  if (th >= thMax) Ia = 0;
  Icmd = constrain(If + Ia, -I_LIMIT, I_LIMIT);
}

// ------------------------------------------------------------------ FOC 태스크
// loop() 보다 우선순위가 높아서, 웹 요청을 처리하는 도중에도 1 ms 마다 끼어든다.
uint32_t tCtlFoc = 0;
void focTask(void *) {
  for (;;) {
    for (int i = 0; i < 4; i++) { motor.loopFOC(); motor.move(Icmd); focCount++; }
    uint32_t us = micros();                          // 제어 계산도 여기서 — 웹 처리에 안 밀린다
    if (us - tCtlFoc >= 5000) { control((us - tCtlFoc) * 1e-6f); tCtlFoc = us; }
    vTaskDelay(1);                                   // loop() 에도 시간을 준다
  }
}

// ------------------------------------------------------------------ setup
void setup() {
  pinMode(PIN_EN, OUTPUT); digitalWrite(PIN_EN, LOW);
  Serial.begin(115200);
  L0 = strDist(0);

  Wire.begin(PIN_SDA, PIN_SCL, 400000);
  Wire.setTimeOut(4);                                // 선이 빠져도 루프가 안 멈추게
  imuOK = mpuInit(IMU_UPPER) && mpuInit(IMU_FORE);

  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, PIN_CS);
  sensor.init(&SPI);
  motor.linkSensor(&sensor);
  driver.voltage_power_supply = 12.0f;
  driver.voltage_limit = 8.0f;
  driver.init();
  motor.linkDriver(&driver);
  motor.phase_resistance = R_PHASE;                  // 이 값이 있으면 move() 의 단위가 A 가 된다
  motor.KV_rating = KV;                              // 역기전력 보상
  motor.current_limit = I_LIMIT;
  motor.voltage_limit = 8.0f;                        // 전류 상한이 먼저 걸리므로 여유 있게
  motor.voltage_sensor_align = 1.5f;
  motor.torque_controller = TorqueControlType::voltage;
  motor.controller = MotionControlType::torque;
  motor.zero_electric_angle = 1.4120f;               // 11/16 정렬 결과
  motor.sensor_direction = Direction::CW;            // → 이 두 값이 있으면 켤 때 정렬 회전을 건너뛴다
  motor.init();
  focOK = motor.initFOC();
  if (!focOK) { motor.disable(); Serial.println("모터 정렬 실패 — 엔코더 배선 확인"); }
  Serial.printf("정렬: zero_electric_angle %.4f, 방향 %s\n", motor.zero_electric_angle,
                motor.sensor_direction == Direction::CW ? "CW" : "CCW");
  strZeroAngle = motor.shaft_angle;

  WiFi.mode(WIFI_AP);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);                // SuperMini: AP 켜기 전에 출력을 낮춰야 연결이 잡히는 경우가 많다
  WiFi.softAP("TSA-ELBOW", "tsa12345", 6);           // 채널 6 고정
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  Serial.printf("와이파이 TSA-ELBOW 시작, 주소 %s\n", WiFi.softAPIP().toString().c_str());
  server.on("/", hRoot); server.on("/s", hState); server.on("/do", hDo);
  server.begin();
  if (focOK) xTaskCreate(focTask, "foc", 4096, NULL, 5, NULL);   // 정렬 실패면 모터를 돌리지 않는다  // loop() 는 우선순위 1
}

// ------------------------------------------------------------------ loop
void loop() {
  static uint32_t tCtl = 0, tImu = 0, tRetry = 0, tLog = 0, lastFoc = 0;
  static bool which = false;
  uint32_t us = micros();

  if (us - tImu >= 5000) {                           // IMU 한 번에 하나씩, 각 100 Hz
    tImu = us; float a;
    if (imuOK) {
      if (mpuAngle(which ? IMU_FORE : IMU_UPPER, a)) {
        float &dst = which ? angF : angU;
        dst += 0.2f * wrap180(a - dst);              // 가벼운 평활
      } else imuOK = false;
      which = !which;
      phi   = IMU_SIGN * wrap180(angF - zeroF);
      elbow = IMU_SIGN * wrap180((angF - zeroF) - (angU - zeroU));
    } else if (millis() - tRetry > 1000) {           // 끊겼으면 1초마다 다시 시도
      tRetry = millis();
      imuOK = mpuInit(IMU_UPPER) && mpuInit(IMU_FORE);
    }
  }
  if (Serial.available()) {                        // 시리얼 시험: i1.0 → 1.0 A,  s → 정지
    String c = Serial.readStringUntil('\n'); c.trim();
    if (c.startsWith("i")) { testI = c.substring(1).toFloat(); mode = 4; }
    else if (c == "s") { testI = 0; mode = 0; }
  }
  server.handleClient();
  if (millis() - tLog >= 1000) {                     // 문제 생기면 이 줄을 보내주세요
    tLog = millis();
    uint32_t n = focCount;
    Serial.printf("FOC %lu Hz | 모드 %d | I %.2f A | 속도 %.1f 바퀴/s | 꼬임 %.2f 바퀴 | IMU %s | 팔꿈치 %.1f\n",
                  (unsigned long)(n - lastFoc), mode, (float)Icmd, motor.shaft_velocity / 6.2832f,
                  (motor.shaft_angle - strZeroAngle) / 6.2832f, imuOK ? "OK" : "없음", elbow);
    lastFoc = n;
  }
}

// ------------------------------------------------------------------ 조작 화면
const char PAGE[] PROGMEM = R"HTML(
<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>TSA 조작</title><style>
*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
body{font-family:-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;background:#11151a;color:#e8edf2;padding:14px;max-width:480px;margin:auto;user-select:none}
h1{font-size:16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
#link{font-size:12px;padding:3px 9px;border-radius:10px;background:#7a2a2a}
#link.ok{background:#1f6b4a}
.card{background:#1a2026;border:1px solid #2b343d;border-radius:12px;padding:13px;margin-bottom:11px}
.lab{font-size:11px;color:#93a1ae;letter-spacing:.06em;margin-bottom:8px}
.modes{display:flex;gap:7px}
.modes button{flex:1;padding:13px 0;border-radius:9px;border:1px solid #2b343d;background:#232c35;color:#93a1ae;font-size:15px;font-family:inherit}
.modes button.on{background:#0f6d7a;color:#fff;border-color:#4cc5d6}
#stop{width:100%;padding:18px;border-radius:12px;border:0;background:#c23a2e;color:#fff;font-size:19px;font-weight:700;font-family:inherit;margin-bottom:11px}
#stop:active{background:#8f2a21}
input[type=range]{width:100%;height:44px;accent-color:#4cc5d6}
.big{font-size:34px;font-weight:600;text-align:center;font-variant-numeric:tabular-nums}
.ends{display:flex;justify-content:space-between;font-size:12px;color:#93a1ae}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center}
.grid b{display:block;font-size:21px;font-variant-numeric:tabular-nums}
.grid span{font-size:11px;color:#93a1ae}
.row{white-space:nowrap;display:flex;align-items:center;gap:10px;font-size:13px;margin-top:6px}
.row output{width:86px;text-align:right;font-variant-numeric:tabular-nums}
.acts{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.acts button{padding:11px 4px;border-radius:9px;border:1px solid #2b343d;background:#232c35;color:#e8edf2;font-size:13px;font-family:inherit}
.acts button.done{border-color:#1f6b4a;color:#7fd6ad}
#msg{font-size:12.5px;color:#f0b072;min-height:18px;margin-top:8px}
.off{opacity:.35;pointer-events:none}
</style></head><body>
<h1>TSA 팔꿈치 보조기기<span id="link">연결 끊김</span></h1>
<button id="stop">정지</button>
<div class="card"><div class="lab">모드</div>
 <div class="modes"><button data-m="1">수동</button><button data-m="2">자동</button></div>
 <div id="msg"></div></div>
<div class="card" id="manual"><div class="lab">수동 — 속도 −100 ~ +100  (100 = 초당 8바퀴)</div>
 <div class="big" id="val">0</div>
 <input id="sl" type="range" min="-100" max="100" value="0">
 <div class="ends"><span>◀ 풀기</span><span>감기 ▶</span></div>
 <div class="row"><label><input id="hold" type="checkbox"> 손을 떼도 값 유지</label><output id="spv" style="width:auto;margin-left:auto">0.0 바퀴/초</output></div></div>
<div class="card" id="auto"><div class="lab">자동 — 받쳐주는 비율</div>
 <div class="row"><input id="as" type="range" min="0" max="100" step="5" value="50"><output id="asv">50 %</output></div></div>
<div class="card"><div class="lab">상태</div>
 <div class="grid"><div><b id="el">–</b><span>팔꿈치 °</span></div><div><b id="tn">–</b><span>꼬임 바퀴</span></div><div><b id="fo">–</b><span>목표 장력 N</span></div><div><b id="cu">–</b><span>모터 전류 A</span></div></div></div>
<div class="card"><div class="lab">준비 — 순서대로</div>
 <div class="acts"><button id="zi">① IMU 영점<br>(팔 펴고 정지)</button><button id="zs">② 줄 0점<br>(줄 안 꼬인 상태)</button>
 <button id="un">줄 전부 풀기</button><button id="sg">각도 부호 뒤집기</button></div></div>
<script>
const $=id=>document.getElementById(id);let mode=0,busy=false,miss=0,msgT=0;
const sl=$('sl');
function upd(){$('val').textContent=sl.value;$('spv').textContent=(sl.value*0.08).toFixed(1)+' 바퀴/초'}
function zero(){sl.value=0;upd()}
['pointerup','pointercancel','touchend','mouseup','blur'].forEach(e=>sl.addEventListener(e,()=>{if(!$('hold').checked)zero()}));
sl.addEventListener('input',upd);
$('hold').addEventListener('change',()=>{if(!$('hold').checked)zero()});
$('as').addEventListener('input',()=>$('asv').textContent=$('as').value+' %');
document.querySelectorAll('.modes button').forEach(b=>b.onclick=()=>{mode=+b.dataset.m;zero();paint();act('m'+mode)});
$('stop').onclick=()=>{mode=0;zero();paint();act('m0')};
const act=x=>{lastAct=Date.now();return fetch('/do?x='+x).catch(()=>{})};
$('zi').onclick=()=>act('zi');$('zs').onclick=()=>act('zs');$('sg').onclick=()=>act('sg');
$('un').onclick=()=>{zero();act('un')};
let lastAct=0;
function paint(){document.querySelectorAll('.modes button').forEach(b=>b.classList.toggle('on',+b.dataset.m===mode));
 $('manual').classList.toggle('off',mode!==1);$('auto').classList.toggle('off',mode!==2)}
function show(s,ms){
 $('link').className='ok';$('link').textContent='연결됨 · '+ms+' ms';
 if(Date.now()-lastAct>800){mode=s.m;paint()}
 $('el').textContent=s.io?s.el.toFixed(1):'–';$('tn').textContent=s.tn.toFixed(1);$('fo').textContent=s.f.toFixed(1);$('cu').textContent=s.i.toFixed(2);
 $('zi').classList.toggle('done',!!s.zi);$('zs').classList.toggle('done',!!s.zs);
 if(s.msg){$('msg').textContent=s.msg;msgT=Date.now()}else if(Date.now()-msgT>3000)$('msg').textContent='';
}
setInterval(()=>{if(busy)return;busy=true;const t0=Date.now();
 const ac=new AbortController();setTimeout(()=>ac.abort(),1000);
 fetch(`/s?v=${sl.value}&a=${$('as').value}`,{signal:ac.signal}).then(r=>r.json()).then(s=>{miss=0;show(s,Date.now()-t0)})
 .catch(()=>{if(++miss>4){$('link').className='';$('link').textContent='연결 끊김'}}).finally(()=>busy=false)},200);
</script></body></html>
)HTML";
