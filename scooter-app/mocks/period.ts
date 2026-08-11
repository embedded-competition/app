// 메인 화면·상세보기의 "기간 조회" 목데이터. planning/prototypes/e-single-tab-period-detail-B.html의
// 시나리오(배터리 가스가 8/7 14:32경 평소의 8배로 스파이크)를 그대로 이식했다.
// 서버가 없어서(C4) 다른 mocks/*.ts처럼 스크립트된 값이다 — 실 서버가 붙으면 "날짜별 센서값 조회"
// API 응답으로 이 함수의 반환값을 교체하면 된다.
import { CHANNELS, type ChannelStateContent, type RibbonContent } from "@/mocks/channels";

export interface PeriodRecordEvent {
  time: string;
  description: string;
}

export interface PeriodSummary {
  rangeLabel: string;
  ribbon: RibbonContent;
  channels: Record<string, ChannelStateContent>;
  events: PeriodRecordEvent[];
  /** 상세보기 연속 차트용 시리즈(날짜/시간별 피크치) */
  series: number[];
  seriesLabels: string[];
  /** series와 같은 스케일의 "평소 수준" 값 — TrendChart의 점선 기준선에 씀 */
  baseline: number;
  peakChannelKey: string;
}

function channelDefaults(): Record<string, ChannelStateContent> {
  const result: Record<string, ChannelStateContent> = {};
  for (const ch of CHANNELS) {
    result[ch.key] = ch.states.NORMAL;
  }
  return result;
}

const TODAY_SUMMARY: PeriodSummary = {
  rangeLabel: "오늘 하루",
  ribbon: {
    msg: "오늘은 이상 없었어요",
    sub: "오늘 하루 동안 평소와 같은 상태였어요",
    btn: "기록 보기",
    danger: false,
    cursorPct: 16,
    stage: -1,
  },
  channels: channelDefaults(),
  events: [],
  series: [22, 20, 24, 21, 23, 25, 22, 24, 27, 24, 22, 23, 24, 22, 21, 23, 22, 24, 23, 22, 21, 22, 23, 22],
  seriesLabels: ["0시", "6시", "12시", "18시", "23시"],
  baseline: 22,
  peakChannelKey: "voc",
};

// "최근 7일"과 "기간 선택"은 지금은 같은 시나리오를 재사용한다 — 서버가 없는 지금 커스텀
// 범위별로 다른 데이터를 만들 근거가 없다(components/period/PeriodSegment.tsx 참고).
const WEEK_SUMMARY: PeriodSummary = {
  rangeLabel: "8월 4일 (월) ~ 8월 10일 (일) · 7일간",
  ribbon: {
    msg: "이 기간 중 주의 단계까지 갔어요",
    sub: "8/7 14:32 · 배터리 가스가 평소의 8배 속도로 늘어남",
    btn: "기록 보기",
    danger: false,
    cursorPct: 56,
    stage: 2,
  },
  channels: {
    ...channelDefaults(),
    voc: {
      val: "평소의 8배",
      speed: "8/7 14:32 최고",
      lv: "warn",
      tech: "+3.1 z · +2.4 z/min",
      series: CHANNELS[0].states.WATCH.series,
    },
  },
  events: [
    { time: "8/7 14:32", description: "정상 → 주의 전환" },
    { time: "8/7 14:58", description: "주의 → 정상 복귀" },
    { time: "8/5 09:07", description: "습도 급변으로 가스 채널 승격 보류 (오경보 아님)" },
  ],
  series: [22, 24, 21, 68, 26, 23, 22],
  seriesLabels: ["8/4(월)", "8/6(수)", "8/8(금)", "8/10(일)"],
  baseline: 22,
  peakChannelKey: "voc",
};

export function getPeriodSummary(kind: "today" | "week"): PeriodSummary {
  return kind === "today" ? TODAY_SUMMARY : WEEK_SUMMARY;
}
