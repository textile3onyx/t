"""포스터용 그림 3장 (영문, 인쇄용 고해상도)."""
import numpy as np, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Rectangle, Circle, Wedge

HERE0 = os.path.dirname(os.path.abspath(__file__))
HERE = '/home/user/t/poster/img'
plt.rcParams['axes.unicode_minus']=False
import matplotlib as _m; _m.rcParams['font.size']=13
INK, ACC, WARN, GREY = '#14202b', '#0f6d7a', '#c2571a', '#9aa6b0'
plt.rcParams.update({'font.family': 'Noto Sans CJK KR', 'axes.edgecolor': INK,
                     'text.color': INK, 'axes.labelcolor': INK,
                     'xtick.color': INK, 'ytick.color': INK})

# ---------------------------------------------------------------- 공통 기하
R_UP = 341.07 / (2 * np.pi) / 10          # 5.43 cm
R_FO = 262.56 / (2 * np.pi) / 10          # 4.18 cm
HU, HF = R_UP + 2.4, R_FO + 1.1
A, B = 17.06, 7.5                          # 줄 출구, 전완 부착점
AXILLA, BAND_TOP = 23.575, 21.38
M_FH, D_CG = 0.023 * 72.7, 0.682 * 25.72


def pts(a, b, deg):
    t = np.radians(deg)
    U = np.array([-a, HU])
    P = np.array([b * np.cos(t) - HF * np.sin(t), b * np.sin(t) + HF * np.cos(t)])
    v = U - P; L = np.linalg.norm(v); u = v / L
    return U, P, L, abs(P[0] * u[1] - P[1] * u[0])


# =========================================================== 1. 개념도
fig, axs = plt.subplots(1, 2, figsize=(13.5, 4.9))
fig.patch.set_facecolor('white')

for ax, deg, title in zip(axs, (0, 60), ('편 자세 (0°)', '굽힌 자세 (60°)')):
    t = np.radians(deg)
    # 위팔 (고정) — 팔꿈치 원점, 어깨 방향 -x
    ax.add_patch(Rectangle((-28, -R_UP), 28, 2 * R_UP, fc='#eef2f4', ec=GREY, lw=1.2))
    # 전완 (회전)
    L_FO = 25.72
    c, s = np.cos(t), np.sin(t)
    corners = np.array([[0, -R_FO], [L_FO, -R_FO], [L_FO, R_FO], [0, R_FO]])
    rot = corners @ np.array([[c, s], [-s, c]])
    ax.fill(rot[:, 0], rot[:, 1], fc='#eef2f4', ec=GREY, lw=1.2)
    ax.add_patch(Circle((0, 0), 1.0, fc='white', ec=INK, lw=1.6, zorder=6))

    U, P, L, arm = pts(A, B, deg)
    # 상완 밴드 (5 cm 폭) + 마운트
    ax.add_patch(Rectangle((-BAND_TOP, -R_UP - .4), 5.0, 2 * R_UP + .8,
                           fc=ACC, alpha=.16, ec=ACC, lw=1.4))
    ax.add_patch(Rectangle((-21.38, R_UP), 4.8, 2.4, fc=INK, ec=INK))   # 마운트 판
    ax.add_patch(Circle((U[0], U[1] - .7), 1.7, fc='#2b3a46', ec=INK, lw=1.2))  # 모터
    # 전완 밴드 (3 cm 폭) + 앵커
    bb = np.array([[B - 1.5, -R_FO - .4], [B + 1.5, -R_FO - .4],
                   [B + 1.5, R_FO + .4], [B - 1.5, R_FO + .4]]) @ np.array([[c, s], [-s, c]])
    ax.fill(bb[:, 0], bb[:, 1], fc=ACC, alpha=.16, ec=ACC, lw=1.4)
    # 줄
    ax.plot([U[0], P[0]], [U[1], P[1]], color=WARN, lw=3.0, solid_capstyle='round', zorder=7)
    ax.plot(*P, 'o', ms=7, mfc='white', mec=WARN, mew=2.2, zorder=8)

    # 어깨끈
    ax.plot([-20.0, -29.5], [R_UP + 2.4, 13.5], color=ACC, lw=2.4, ls=(0, (6, 3)))
    if deg == 0:
        ax.text(-28.5, 6.6, '어깨끈', color=ACC, fontsize=10.5, ha='center')
        ax.annotate('', (-AXILLA, 13.6), (-AXILLA, -9.0),
                    arrowprops=dict(arrowstyle='-', color=WARN, lw=1.8, ls=(0, (5, 3))))
        ax.text(-AXILLA, 14.0, '겨드랑  23.6 cm', color=WARN, fontsize=11,
                ha='center', va='bottom', weight='bold')
        ax.annotate('', (0, -R_UP - 3.4), (-BAND_TOP, -R_UP - 3.4),
                    arrowprops=dict(arrowstyle='<->', color=INK, lw=1.3))
        ax.text(-BAND_TOP / 2, -R_UP - 5.0, '상완 밴드 윗단  21.4 cm',
                ha='center', va='top', fontsize=10.5)
        ax.text(-13.0, 16.2, '모터 + 줄 허브\nMCU · 드라이버 · 전원',
                fontsize=10.5, ha='left', va='center', color=INK, linespacing=1.4)
        ax.annotate('', (-13.6, 14.6), (-16.2, 8.2),
                    arrowprops=dict(arrowstyle='-', color=GREY, lw=1.0))
        ax.text((U[0] + P[0]) / 2 + 2.0, 9.6,
                f'줄 길이  L0 = {L:.1f} cm', color=WARN, fontsize=11,
                ha='center', weight='bold')
        ax.text(B + 2.0, -R_FO - 2.6, '전완 밴드\n6–9 cm', fontsize=10.5,
                ha='left', va='top', linespacing=1.4)
    else:
        ax.text(-9, 12.5, f'L = {L:.1f} cm\n수축  {24.69 - L:.1f} cm',
                color=WARN, fontsize=12, ha='center', weight='bold', linespacing=1.4)
        ax.annotate('', (P[0] + 1.6, P[1] + 1.6), (P[0] + 5.2, P[1] + 5.2),
                    arrowprops=dict(arrowstyle='<|-', color=WARN, lw=2, mutation_scale=18))
    pass
    ax.set_xlim(-34, 27); ax.set_ylim(-13.0, 16.2); ax.set_aspect('equal'); ax.axis('off')

pass
fig.savefig(os.path.join(HERE, 'fig_concept.png'), dpi=190, facecolor='white',
            bbox_inches='tight')
plt.close(fig)

# =========================================================== 2. 제어
deg = np.linspace(0, 90, 181)
Mg = M_FH * 9.81 * (D_CG / 100) * np.cos(np.radians(deg))
arm = np.array([pts(A, B, d)[3] for d in deg])
L = np.array([pts(A, B, d)[2] for d in deg])
L0 = L[0]
F50 = 0.5 * Mg / (arm / 100)
rt = np.sqrt(np.clip(L0 ** 2 - L ** 2, 0, None))
th = rt / 0.2
J = (0.2 ** 2 * th / L) / 100
tau = F50 * J

fig, axs = plt.subplots(2, 1, figsize=(7.2, 9.6))
fig.patch.set_facecolor('white')

ax = axs[0]
ax.plot(deg, Mg, color=GREY, lw=2.6, label='전완 무게 모멘트')
ax.plot(deg, F50 * arm / 100, color=ACC, lw=3.0, label='기기 보조 모멘트 (50 %)')
ax.fill_between(deg, F50 * arm / 100, Mg, color=ACC, alpha=.10)
ax.set_xlabel('팔꿈치 굴곡각 (°)', fontsize=12)
ax.set_ylabel('팔꿈치 모멘트 (N·m)', fontsize=12)
ax.set_title('보조는 팔 무게를 넘지 않는다', fontsize=13.5, weight='bold')
ax.legend(fontsize=10.5, frameon=False, loc='upper right')
ax.set_xlim(0, 90); ax.set_ylim(0, 3.2); ax.grid(alpha=.18)

ax = axs[1]
ax.plot(deg, F50, color=WARN, lw=3.0)
ax.set_xlabel('팔꿈치 굴곡각 (°)', fontsize=12)
ax.set_ylabel('필요 줄 장력 (N)', fontsize=12, color=WARN)
ax.tick_params(axis='y', colors=WARN)
ax.set_xlim(0, 90); ax.set_ylim(0, 27); ax.grid(alpha=.18)
ax2 = ax.twinx()
ax2.plot(deg, tau * 1000, color=ACC, lw=3.0, ls=(0, (5, 2)))
ax2.axhline(80, color=INK, lw=1.4, ls=':')
ax2.text(46, 83, 'GL30 정격 80 mN·m', fontsize=10.5, color=INK)
ax2.set_ylabel('모터 토크 (mN·m)', fontsize=12, color=ACC)
ax2.tick_params(axis='y', colors=ACC); ax2.set_ylim(0, 95)
ax.set_title('모터 토크는 정격의 25 % 이하',
             fontsize=13.5, weight='bold')
ax.text(4, 24.3, '장력', color=WARN, fontsize=11.5, weight='bold')
ax.text(58, 6.0, '모터 토크', color=ACC, fontsize=11.5, weight='bold')
fig.tight_layout()
fig.savefig(os.path.join(HERE, 'fig_control.png'), dpi=190, facecolor='white',
            bbox_inches='tight')
plt.close(fig)

# =========================================================== 3. 밴드 위치 트레이드오프
fig, axs = plt.subplots(2, 1, figsize=(7.2, 9.2))
fig.patch.set_facecolor('white')

bs = np.linspace(4, 14, 60)
con_b = [pts(A, b, 0)[2] - pts(A, b, 60)[2] for b in bs]
ten_b = [0.5 * (M_FH * 9.81 * (D_CG / 100) * np.cos(np.radians(60)))
         / (pts(A, b, 60)[3] / 100) for b in bs]
ax = axs[0]
ax.plot(bs, ten_b, color=WARN, lw=3.0)
ax.set_xlabel('전완 밴드 위치 — 팔꿈치에서 (cm)', fontsize=12)
ax.set_ylabel('60° 장력 (N)', fontsize=12, color=WARN)
ax.tick_params(axis='y', colors=WARN); ax.grid(alpha=.18)
ax2 = ax.twinx()
ax2.plot(bs, con_b, color=ACC, lw=3.0, ls=(0, (5, 2)))
ax2.set_ylabel('60° 수축량 (cm)', fontsize=12, color=ACC)
ax2.tick_params(axis='y', colors=ACC)
ax.axvspan(6, 9, color=ACC, alpha=.10)
ax.text(7.5, ax.get_ylim()[1] * .93, '선택\n6–9 cm', ha='center',
        fontsize=10.5, color=ACC, weight='bold')
ax.set_title('전완 밴드: 멀수록 장력 ↓ 수축 ↑',
             fontsize=13.5, weight='bold')

as_ = np.linspace(10, 22, 60)
ratio = [100 * (pts(a, B, 0)[2] - pts(a, B, 60)[2]) / pts(a, B, 0)[2] for a in as_]
ax = axs[1]
ax.plot(as_, ratio, color=ACC, lw=3.0)
ax.axvline(A, color=WARN, lw=2.0, ls=(0, (5, 3)))
ax.plot([A], [100 * (pts(A, B, 0)[2] - pts(A, B, 60)[2]) / pts(A, B, 0)[2]],
        'o', ms=10, mfc='white', mec=WARN, mew=2.5, zorder=5)
ax.annotate('겨드랑이 상한\n→ 필요 수축률 34 %',
            (A, 34.0), (12.4, 39.5), fontsize=11, color=WARN, weight='bold',
            arrowprops=dict(arrowstyle='->', color=WARN, lw=1.6))
ax.set_xlabel('줄 출구 위치 — 팔꿈치에서 (cm)', fontsize=12)
ax.set_ylabel('60° 필요 수축률 (%)', fontsize=12)
ax.set_xlim(10, 22); ax.set_ylim(24, 46); ax.grid(alpha=.18)
ax.set_title('상완 밴드: 높을수록 유리, 겨드랑이 상한',
             fontsize=13.5, weight='bold')
fig.tight_layout()
fig.savefig(os.path.join(HERE, 'fig_tradeoff.png'), dpi=190, facecolor='white',
            bbox_inches='tight')
plt.close(fig)

for f in ('fig_concept', 'fig_control', 'fig_tradeoff'):
    p = os.path.join(HERE, f + '.png')
    print(f'{f:16s} {os.path.getsize(p)/1024:6.0f} KB')
