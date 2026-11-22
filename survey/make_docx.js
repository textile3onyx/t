const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, VerticalAlign,
  HeadingLevel, PageBreak, LevelFormat, convertMillimetersToTwip,
} = require('docx');

const KOR = '맑은 고딕';
const W = 10092;                          // 본문 폭 (DXA)
const GREY = 'A0A0A0';
const box = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: GREY },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: GREY },
  left:   { style: BorderStyle.SINGLE, size: 4, color: GREY },
  right:  { style: BorderStyle.SINGLE, size: 4, color: GREY },
};
const none = {
  top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const run = (text, o = {}) => new TextRun({ text, font: KOR, size: o.size || 19, ...o });
const p = (text, o = {}) => new Paragraph({
  children: Array.isArray(text) ? text : [run(text, o)],
  alignment: o.alignment,
  spacing: o.spacing || { before: 0, after: 40 },
});
// 밑줄 친 공백은 뷰어에 따라 안 보여서 밑줄 문자를 그대로 쓴다
const blank = (n) => run('_'.repeat(Math.max(6, Math.round(n * 0.6))));

function cell(children, o = {}) {
  return new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    columnSpan: o.span,
    borders: o.borders || box,
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: Array.isArray(children) ? children : [children],
  });
}
const tc = (text, o = {}) => cell(
  new Paragraph({
    children: [run(text, { size: o.size || 18, bold: o.bold })],
    alignment: o.align || AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
  }), o);

function h2(text) {
  return new Paragraph({
    children: [run(text, { size: 21, bold: true })],
    spacing: { before: 220, after: 90 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: '000000' } },
    keepNext: true,
  });
}

// ---------------------------------------------------------------- 1쪽
const NOTICE = [
  '이 연구는 퇴원 후 가정 재활을 위한 팔꿈치 굴곡 보조 착용기기를 설계하는 것을 목표로 합니다. 치료 효과를 확인하는 연구가 아니며, 참여로 어떤 치료적 이익도 기대되지 않습니다.',
  '참여자는 시제품을 팔에 착용하고 팔을 굽혔다 펴는 동작을 반복한 뒤, 착용감에 관한 12개 문항에 답합니다. 기기는 연구자가 착용시켜 드립니다. 이 시제품은 구동하지 않으며, 전원이 연결되지 않은 상태로 착용합니다.',
  '소요 시간은 약 15분입니다.',
  '참여는 자발적이며, 이유를 밝히지 않고 언제든 중단할 수 있습니다. 중단에 따른 불이익은 없습니다.',
  '기록되는 정보는 나이, 키, 몸무게, 팔 둘레·길이와 설문 응답이며, 이름은 기록하지 않습니다. 자료는 참여자 번호로만 관리되고 연구 종료 후 폐기됩니다.',
  '착용 중 통증, 저림, 과도한 압박이 느껴지면 즉시 말씀해 주시고 바로 벗으시면 됩니다.',
];

const MEAS = [
  [['나이', '만            세'], ['키', '            cm'], ['몸무게', '            kg']],
  [['위팔둘레', '            cm'], ['팔꿈치둘레', '            cm'], ['전완둘레', '            cm']],
  [['위팔길이', '            cm'], ['팔꿈치~손목', '            cm'], ['착용 팔', '오른쪽  /  왼쪽']],
  [['상완 밴드 길이', '            cm'], ['전완 밴드 위치', '팔꿈치에서      cm'], ['기기 총 질량', '            g']],
];

// ---------------------------------------------------------------- 2쪽
const ITEMS = [
  ['G', '착용 과정'],
  ['1', '착용하고 벗는 데 걸리는 시간이 부담스럽지 않았다.'],
  ['2', '밴드 길이가 내 팔 치수에 잘 맞았다.'],
  ['G', '고정 상태'],
  ['3', '팔을 굽혔다 펴는 동안 상완(위팔) 밴드가 제자리에 있었다.'],
  ['4', '팔을 굽혔다 펴는 동안 전완(아래팔) 밴드가 제자리에 있었다.'],
  ['5', '어깨끈이 기기가 흘러내리지 않도록 잘 잡아주었다.'],
  ['G', '압박과 자극'],
  ['6', '밴드의 조임이 아프지 않았다.'],
  ['7', '기기가 닿는 부위에 눌리거나 쓸리는 느낌이 없었다.'],
  ['8', '착용 중 팔이나 손이 저린 느낌이 없었다.'],
  ['G', '무게와 동작'],
  ['9', '기기의 무게가 부담스럽지 않았다.'],
  ['10', '기기가 팔을 굽히고 펴는 동작을 방해하지 않았다.'],
  ['G', '수용도'],
  ['11', '집에서 착용하기에 기기의 크기와 겉모습이 거부감 없다.'],
  ['12', '전반적으로 이 기기를 착용하는 것에 만족한다.'],
];
const IW = [420, 6472, 640, 640, 640, 640, 640];

const SCALE = [
  ['1', '전혀 그렇지 않다'], ['2', '그렇지 않다'], ['3', '보통이다'],
  ['4', '그렇다'], ['5', '매우 그렇다'],
];

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: KOR, size: 19 }, paragraph: { spacing: { after: 40 } } },
    },
  },
  numbering: {
    config: [{
      reference: 'notice',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '•',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 340, hanging: 200 } },
                 run: { font: KOR } },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
        margin: {
          top: convertMillimetersToTwip(15), bottom: convertMillimetersToTwip(13),
          left: convertMillimetersToTwip(16), right: convertMillimetersToTwip(16),
        },
      },
    },
    children: [
      new Paragraph({
        children: [run('TSA 팔꿈치 굴곡 보조기기 착용감 평가', { size: 30, bold: true })],
        spacing: { after: 60 },
      }),
      p('국립금오공과대학교 소재디자인공학과 어패럴공학연구실  |  책임연구자 이희란  |  수행 최현진',
        { size: 17, color: '444444', spacing: { after: 160 } }),

      h2('연구 참여 안내'),
      ...NOTICE.map((t) => new Paragraph({
        children: [run(t, { size: 17 })],
        numbering: { reference: 'notice', level: 0 },
        spacing: { after: 50 },
      })),
      new Paragraph({
        children: [run('문의: 최현진 (어패럴공학연구실)   ', { size: 17 }), blank(30)],
        numbering: { reference: 'notice', level: 0 },
        spacing: { after: 120 },
      }),

      new Table({
        columnWidths: [W / 2, W / 2],
        width: { size: W, type: WidthType.DXA },
        rows: [
          new TableRow({ children: [
            cell(p('위 내용을 읽고 이해하였으며 참여에 동의합니다.'), { w: W / 2, borders: none }),
            cell(p([run('날짜  '), blank(26)]), { w: W / 2, borders: none }),
          ] }),
          new TableRow({ children: [
            cell(p([run('참여자 서명  '), blank(34)]), { w: W / 2, borders: none }),
            cell(p([run('참여자 번호   P '), blank(14)]), { w: W / 2, borders: none }),
          ] }),
        ],
      }),

      h2('신체 치수 (진행자 기입)'),
      new Table({
        columnWidths: [1500, 1864, 1500, 1864, 1500, 1864],
        width: { size: W, type: WidthType.DXA },
        rows: MEAS.map((row) => new TableRow({
          children: row.flatMap(([label, value]) => [
            tc(label, { w: 1500, fill: 'F2F2F2', bold: true, align: AlignmentType.LEFT }),
            tc(value, { w: 1864 }),
          ]),
        })),
      }),

      new Paragraph({
        children: [run('1 / 2', { size: 16, color: '666666' }), new PageBreak()],
        alignment: AlignmentType.CENTER,
        spacing: { before: 160 },
      }),

      // ------------------------------------------------------------ 2쪽
      new Table({
        columnWidths: [W * 0.6, W * 0.4],
        width: { size: W, type: WidthType.DXA },
        rows: [new TableRow({ children: [
          cell(p([run('착용감 문항', { size: 26, bold: true })]), { w: W * 0.6, borders: none }),
          cell(new Paragraph({
            children: [run('참여자 번호   P ', { size: 18 }), blank(14)],
            alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 0 },
          }), { w: W * 0.4, borders: none }),
        ] })],
      }),
      p('각 문항에서 본인의 느낌에 가장 가까운 번호 하나에 동그라미 해주세요.',
        { size: 17, color: '444444', spacing: { after: 110 } }),

      new Table({
        columnWidths: Array(5).fill(W / 5),
        width: { size: W, type: WidthType.DXA },
        rows: [new TableRow({ children: SCALE.map(([n, t]) => cell([
          new Paragraph({ children: [run(n, { size: 20, bold: true })],
                          alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 } }),
          new Paragraph({ children: [run(t, { size: 16 })],
                          alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 } }),
        ], { w: W / 5 })) })],
      }),

      p('', { spacing: { after: 100 } }),

      new Table({
        columnWidths: IW,
        width: { size: W, type: WidthType.DXA },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              tc('', { w: IW[0], fill: 'E8E8E8' }),
              tc('문항', { w: IW[1], fill: 'E8E8E8', bold: true }),
              ...['1', '2', '3', '4', '5'].map((n, i) =>
                tc(n, { w: IW[2 + i], fill: 'E8E8E8', bold: true, size: 16 })),
            ],
          }),
          ...ITEMS.map(([num, text]) => {
            if (num === 'G') {
              return new TableRow({ children: [
                tc(text, { w: W, span: 7, fill: 'EBEBEB', bold: true, size: 16,
                           align: AlignmentType.LEFT }),
              ] });
            }
            return new TableRow({ children: [
              tc(num, { w: IW[0], size: 16, color: '555555' }),
              tc(text, { w: IW[1], align: AlignmentType.LEFT }),
              ...[0, 1, 2, 3, 4].map((i) => tc('○', { w: IW[2 + i], size: 22 })),
            ] });
          }),
        ],
      }),

      h2('자유 응답'),
      new Table({
        columnWidths: [W],
        width: { size: W, type: WidthType.DXA },
        rows: [
          new TableRow({ children: [tc('가장 불편했던 부분은 어디였습니까? 위치를 구체적으로 적어주세요.',
            { w: W, fill: 'F6F6F6', align: AlignmentType.LEFT })] }),
          new TableRow({ height: { value: convertMillimetersToTwip(20), rule: 'atLeast' },
            children: [cell(p(''), { w: W })] }),
          new TableRow({ children: [tc('고쳤으면 하는 점이 있다면 적어주세요.',
            { w: W, fill: 'F6F6F6', align: AlignmentType.LEFT })] }),
          new TableRow({ height: { value: convertMillimetersToTwip(22), rule: 'atLeast' },
            children: [cell(p(''), { w: W })] }),
        ],
      }),

      new Paragraph({
        children: [run('2 / 2   —   응답해 주셔서 감사합니다.', { size: 16, color: '666666' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 140 },
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync('/home/user/t/survey/착용감_설문지.docx', b);
  console.log('wrote 착용감_설문지.docx', b.length, 'bytes');
});
