// planning/prototypes/b-live-monitor.html(B안 채택본)의 CH·ST 데이터를 1:1로 이식.
// 실서버 페이로드가 나오기 전까지 실시간·항목상세·경보 화면은 전부 이 파일의 목데이터로 그린다.
// <b> → **, <br> → \n 로만 표기를 바꿨을 뿐 문구는 원본 그대로.

// AppState는 화면이 쓰는 "표시용" 상태다 — 2026-08-12 개편으로 실제 서버는 더 이상 이런 단일
// 문자열을 안 주고 status/stage/conditions/latched/water 5개 필드로 나눠서 준다
// (scooter-app/docs/interface.md §2 참고). services/deriveAppState.ts가 그 5개 필드를 이
// AppState 4키로 변환하는 매핑을 맡는다 — 그 매핑 규칙은 아직 백엔드 확인 전 추정치다
// (backend-requests.md §2.2). FAULT는 게이지·리본이 있는 "분류된" 상태들과 성격이 달라서
// (가스 심각도가 아니라 "기기 자체가 고장남") ClassifiedState에서 뺐다 — FaultState 화면으로 따로 처리.
export type AppState = "NORMAL" | "WATCH" | "ALARM" | "FAULT";
export type ClassifiedState = Exclude<AppState, "FAULT">;
export type Level = "ok" | "warn" | "bad";

export interface ChannelStateContent {
  val: string;
  speed: string;
  lv: Level;
  tech: string;
  series: number[];
}

export interface ChannelDef {
  key: string;
  name: string;
  alias: string;
  tag: string;
  primary: boolean;
  states: Record<ClassifiedState, ChannelStateContent>;
}

export const CHANNELS: ChannelDef[] = [
  {
    key: "voc",
    name: "배터리 가스",
    alias: "전해액 증기",
    tag: "가장 먼저 오르는 신호",
    primary: true,
    states: {
      NORMAL: { val: "평소와 같음", speed: "거의 변화 없음", lv: "ok", tech: "+0.4 z · +0.2 z/min", series: [40, 42, 39, 41, 40, 42, 41, 39, 41, 40, 42, 41] },
      WATCH: { val: "조금 늘어남", speed: "빠르게 오르는 중", lv: "warn", tech: "+3.1 z · +2.4 z/min", series: [40, 41, 40, 42, 44, 48, 54, 61, 69, 78, 86, 94] },
      ALARM: { val: "많이 새는 중", speed: "매우 빠르게 오름", lv: "bad", tech: "+9.4 z · +7.2 z/min", series: [41, 40, 43, 48, 58, 72, 90, 110, 132, 155, 178, 196] },
    },
  },
  {
    key: "h2",
    name: "과충전 가스",
    alias: "수소",
    tag: "과충전 때 먼저 나옴",
    primary: false,
    states: {
      NORMAL: { val: "평소와 같음", speed: "거의 변화 없음", lv: "ok", tech: "2,234 mV · +0.1 z/min", series: [40, 41, 40, 39, 41, 40, 41, 40, 39, 41, 40, 40] },
      WATCH: { val: "평소와 같음", speed: "거의 변화 없음", lv: "ok", tech: "2,251 mV · +0.4 z/min", series: [40, 40, 41, 42, 41, 43, 44, 43, 45, 44, 46, 45] },
      ALARM: { val: "조금 늘어남", speed: "오르는 중", lv: "warn", tech: "2,486 mV · +2.9 z/min", series: [41, 40, 42, 44, 48, 54, 62, 70, 80, 92, 104, 116] },
    },
  },
  {
    key: "co",
    name: "타는 가스",
    alias: "일산화탄소",
    tag: "불이 붙기 시작하면 나옴",
    primary: false,
    states: {
      NORMAL: { val: "없음", speed: "거의 변화 없음", lv: "ok", tech: "412 mV · 0.0 z/min", series: [40, 40, 41, 40, 40, 41, 40, 40, 41, 40, 40, 40] },
      WATCH: { val: "없음", speed: "거의 변화 없음", lv: "ok", tech: "415 mV · +0.2 z/min", series: [40, 41, 40, 41, 41, 42, 41, 42, 42, 43, 42, 43] },
      ALARM: { val: "나오는 중", speed: "오르는 중", lv: "warn", tech: "638 mV · +2.8 z/min", series: [40, 41, 41, 42, 45, 50, 58, 68, 80, 94, 108, 124] },
    },
  },
  {
    key: "temp",
    name: "배터리 온도",
    alias: "팩 표면 온도",
    tag: "",
    primary: false,
    states: {
      NORMAL: { val: "24.6°", speed: "변화 없음", lv: "ok", tech: "24.6 °C · +0.1 °C/min", series: [40, 41, 40, 41, 40, 41, 40, 41, 40, 41, 40, 41] },
      WATCH: { val: "26.2°", speed: "조금 오름", lv: "ok", tech: "26.2 °C · +0.3 °C/min", series: [40, 41, 41, 42, 43, 43, 44, 45, 45, 46, 47, 48] },
      ALARM: { val: "41.8°", speed: "빠르게 오름", lv: "warn", tech: "41.8 °C · +2.1 °C/min", series: [41, 42, 44, 48, 54, 62, 72, 84, 96, 110, 124, 138] },
    },
  },
  {
    key: "pres",
    name: "부풀어 오름",
    alias: "팩 내압·셀 팽창",
    tag: "",
    primary: false,
    states: {
      NORMAL: { val: "변화 없음", speed: "변화 없음", lv: "ok", tech: "0 Pa · 0.0 Pa/s", series: [40, 40, 41, 40, 40, 41, 40, 40, 41, 40, 40, 40] },
      WATCH: { val: "변화 없음", speed: "변화 없음", lv: "ok", tech: "2 Pa · 0.1 Pa/s", series: [40, 40, 41, 41, 40, 41, 41, 42, 41, 42, 41, 42] },
      ALARM: { val: "약간 증가", speed: "조금 오름", lv: "warn", tech: "46 Pa · 3.2 Pa/s", series: [40, 41, 41, 43, 46, 50, 55, 60, 66, 72, 78, 84] },
    },
  },
  {
    key: "leak",
    name: "물·누액",
    alias: "침수·전해액 누출",
    tag: "",
    primary: false,
    states: {
      NORMAL: { val: "없음", speed: "—", lv: "ok", tech: "프로브 0", series: [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40] },
      WATCH: { val: "없음", speed: "—", lv: "ok", tech: "프로브 0", series: [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40] },
      ALARM: { val: "감지됨", speed: "—", lv: "bad", tech: "프로브 0 → 1", series: [40, 40, 40, 40, 40, 40, 40, 40, 40, 180, 180, 180] },
    },
  },
];

// 채널별 설명(항목 상세 "이게 무슨 신호인가요"). voc만 프로토타입 원문, 나머지는 sensors.md 근거로 같은 톤을 맞춰 작성.
export const CHANNEL_EXPLAIN: Record<string, string> = {
  voc: "배터리가 뜨거워지면 안에 들어 있는 액체가 끓어서 **가스로 새어 나옵니다.** 불이 붙기 한참 전에 나오는 신호라, 이 앱은 이 가스를 가장 먼저 지켜봅니다. 사람이 냄새로 알아채기 어려운 양부터 잡습니다.",
  h2: "배터리를 필요 이상으로 오래 충전하면 나오는 가스입니다. **과충전 상황을 가장 먼저** 알려주는 신호라, 배터리 가스와 함께 초기 단계를 나눠서 지켜봅니다.",
  co: "불이 붙기 시작하면 나오는 가스입니다. 이 신호가 나온다는 건 **이미 연소가 시작됐다**는 뜻이라, 경보를 확실하게 뒷받침하는 역할을 합니다.",
  temp: "배터리 표면의 온도입니다. 단독으로는 경보를 울리지 않지만, 다른 신호와 함께 보면 지금 배터리가 얼마나 뜨거워지고 있는지 확인할 수 있습니다.",
  pres: "배터리 안쪽 압력이나 셀이 부풀어 오르는 정도입니다. 이 킥보드의 배터리 모양에서는 거의 변화가 없는 편이라, 지금은 다른 신호를 뒷받침하는 용도로만 씁니다.",
  leak: "빗물이 스며들었거나 배터리 액체가 새어 나왔는지를 확인합니다. 이 신호만으로는 경보를 울리지 않고, 다른 신호를 뒷받침하는 확증용으로 씁니다.",
};

export const CHANNEL_FOOTNOTE: Record<string, string> = {
  voc: "※ 이 가스는 배터리가 뜨거워질 때 가장 먼저 나오기 때문에, 다른 신호가 조용해도 이것만으로 경보를 울릴 수 있습니다. 대신 손소독제·향수 같은 생활 냄새에도 반응하므로 급변·지속·무회복 조건과 습도 확인으로 걸러냅니다.",
  h2: "※ 이 가스만으로도 경보를 올릴 수 있습니다 — 과열보다 과충전이 먼저 진행되는 경우를 놓치지 않기 위해서입니다.",
  co: "※ 이 가스는 확증·임박도 전용입니다. 단독으로 경보를 올리지 않고, 다른 채널이 이미 오른 상태를 뒷받침할 때만 씁니다.",
  temp: "※ 온도만으로는 경보를 울리지 않습니다. 배치·환기에 따라 절대 온도가 크게 달라지기 때문입니다.",
  pres: "※ 지금은 확증 보너스 채널입니다. 값이 거의 안 움직이는 게 정상입니다 — 원통형 배터리라 부풀어 오르는 변화가 크지 않습니다.",
  leak: "※ 이 신호만으로는 경보를 올리지 않습니다. 물이 감지되면 다른 신호의 신뢰도를 높이는 용도로만 씁니다.",
};

export interface StateContent {
  msg: string;
  sub: string;
  btn: string;
  danger: boolean;
  cursorPct: number;
  stage: number; // -1이면 스테퍼 진행 없음
  rateLabel: string;
  addr2: string;
  pinLevel: Level;
  sig: [string, string, string];
  sigOn: [boolean, boolean, boolean];
  raw: string;
  base: string;
  dev: string;
  slope: string;
  hold: string;
  rh: string;
  freeze: string;
  line: number[];
  verdict: string;
  verdictLevel: Level;
  gaugePct: number;
  pillT: string;
  pillV: string;
  easy: string;
  sigHint: string;
  avg: string;
  mine: string;
  cmp: string;
  cta: string;
}

// StatusRibbon이 실제로 쓰는 필드만 모은 타입. StateContent는 구조적으로 이 타입을 만족하므로
// 기존 호출부(STATE_CONTENT[state])는 그대로 쓸 수 있고, 기간 조회처럼 StateContent 전체를
// 만들 필요 없는 곳에서는 이 좁은 타입만 채우면 된다.
export interface RibbonContent {
  msg: string;
  sub: string;
  btn: string;
  danger: boolean;
  cursorPct: number;
  stage: number;
}

export const STATE_CONTENT: Record<ClassifiedState, StateContent> = {
  NORMAL: {
    msg: "지금은 이상 없어요",
    sub: "평소와 같은 상태예요 · 14일 6시간째 지켜보는 중",
    btn: "점검 요청",
    danger: false,
    cursorPct: 16,
    stage: -1,
    rateLabel: "· 10초마다 확인",
    addr2: "충전 중 · 마지막 수신 42초 전",
    pinLevel: "ok",
    sig: ["—", "—", "—"],
    sigOn: [false, false, false],
    raw: "26,412",
    base: "26,380",
    dev: "0.4배",
    slope: "0.2배/분",
    hold: "0초",
    rh: "통과",
    freeze: "진행 중",
    line: [100, 104, 98, 102, 100, 104, 101, 98, 101, 100, 104, 101],
    verdict: "평소와 같습니다",
    verdictLevel: "ok",
    gaugePct: 22,
    pillT: "정상",
    pillV: "평소 수준",
    easy: "배터리에서 새어 나오는 가스의 양이 **평소와 같습니다.** 특별히 하실 일은 없습니다.",
    sigHint: "지금은 세 가지 모두 해당하지 않아 경보를 울리지 않습니다.",
    avg: "평소 수준",
    mine: "평소 수준",
    cmp: "같은 모델을 쓰는 다른 킥보드들과 비슷한 범위 안에 있습니다.",
    cta: "점검 이력 전체 보기",
  },
  WATCH: {
    msg: "정비가 필요할 것 같아요",
    sub: "가스가 늘고 있어요 · 18초째 · 1초마다 확인 중",
    btn: "점검 요청",
    danger: false,
    cursorPct: 56,
    stage: 2,
    rateLabel: "· 1초마다 확인",
    addr2: "충전 중 · 실시간 수신 중",
    pinLevel: "warn",
    sig: ["✓", "—", "✓"],
    sigOn: [true, false, true],
    raw: "26,158",
    base: "26,376",
    dev: "3.1배",
    slope: "2.4배/분",
    hold: "18초",
    rh: "통과",
    freeze: "멈춤 (주의 상태)",
    line: [100, 101, 99, 102, 96, 88, 78, 68, 58, 48, 40, 32],
    verdict: "평소보다 빠르게 늘고 있습니다",
    verdictLevel: "warn",
    gaugePct: 52,
    pillT: "주의",
    pillV: "빠르게 늘어남",
    easy: "가스가 **평소보다 8배 빠르게** 늘고 있습니다. 아직 경보 단계는 아니지만, **충전을 멈추고** 주변을 환기해 주세요.",
    sigHint: '"갑자기 늘었나"와 "안 사라지나"는 해당하지만 아직 30초를 넘기지 않아, 경보 대신 감시를 강화했습니다.',
    avg: "평소 수준",
    mine: "평소의 8배",
    cmp: "같은 모델 킥보드들이 평소 움직이는 속도보다 **8배** 빠릅니다.",
    cta: "충전 중지하고 점검 요청",
  },
  ALARM: {
    msg: "화재 발생 직전이에요",
    sub: "충전 전원을 자동으로 껐어요 · 확인 전까지 경보 유지",
    btn: "신고하기",
    danger: true,
    cursorPct: 92,
    stage: 3,
    rateLabel: "· 계속 확인 중",
    addr2: "전원 차단됨 · 실시간 수신 중",
    pinLevel: "bad",
    sig: ["✓", "✓", "✓"],
    sigOn: [true, true, true],
    raw: "25,704",
    base: "26,376",
    dev: "9.4배",
    slope: "7.2배/분",
    hold: "46초",
    rh: "통과",
    freeze: "멈춤 (경보 잠김)",
    line: [100, 99, 96, 88, 76, 62, 48, 36, 26, 18, 12, 8],
    verdict: "위험 — 저절로 꺼지지 않습니다",
    verdictLevel: "bad",
    gaugePct: 88,
    pillT: "위험",
    pillV: "매우 빠르게 늘어남",
    easy: "가스가 **평소의 24배 속도로** 늘고 있고, 불이 붙을 때 나오는 가스도 함께 나왔습니다. **즉시 대피하고 신고하세요.**",
    sigHint: "세 가지가 모두 해당해 경보를 울렸습니다. 경보는 사람이 확인할 때까지 꺼지지 않습니다.",
    avg: "평소 수준",
    mine: "평소의 24배",
    cmp: "같은 모델 킥보드들이 평소 움직이는 속도보다 **24배** 빠릅니다. 타는 가스가 함께 나온 것은 이미 불이 붙기 시작했다는 신호입니다.",
    cta: "119 신고하기",
  },
};

export const STEPPER_LABELS = ["이상\n없음", "온도\n상승", "가스\n누출", "급격히\n악화", "발화"];

export const SIG_LABELS = [
  { title: "갑자기 늘었나", sub: "몇 초 만에 확 늘었는지" },
  { title: "계속 이어지나", sub: "30초 넘게 유지됐는지" },
  { title: "안 사라지나", sub: "생활 냄새는 곧 옅어짐" },
] as const;

export const MODULE_STATUS = {
  nodeId: "0x0A31",
  battery: "78% · 약 40일 남음",
  connection: "좋음",
};

export const ADDRESS_MAIN = "서울 성동구 행당동 · 지하주차장 B-14";
export const OWNER_NAME = "이현수님";
