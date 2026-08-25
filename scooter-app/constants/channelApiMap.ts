// 화면 채널 키(voc/h2/co/temp/pres/leak, mocks/channels.ts의 CHANNELS)를 실제 백엔드
// 필드에 연결하는 공용 매핑. app/index.tsx(채널 카드)·app/detail/[channel].tsx(채널별
// 상세보기) 둘 다 여기를 쓴다 — 따로 정의해서 어긋나지 않게.
import type { ClassifiedState, Level } from "@/mocks/channels";
import type { Condition } from "@/types/telemetry";

/** telemetry/current 응답의 어느 채널 필드({value,slope})에 대응하는지. temp·leak은 대응 필드가 없다. */
export const CHANNEL_API_FIELD: Record<string, "gas" | "h2" | "co" | "pressure" | undefined> = {
  voc: "gas",
  h2: "h2",
  co: "co",
  pres: "pressure",
};

/** 이 채널이 지금 conditions[]에 걸려있는지 확인할 때 쓸 조건 이름. */
export const CHANNEL_CONDITION: Record<string, Condition | undefined> = {
  voc: "VOC_RISE",
  h2: "H2_RISE",
  co: "CO_RISE",
  pres: "PRESSURE_RISE",
  leak: "WATER",
};

export const APP_STATE_TO_LEVEL: Record<ClassifiedState, Level> = { NORMAL: "ok", WATCH: "warn", ALARM: "bad" };

/**
 * 이 채널이 지금 conditions[]에 안 걸려있으면 "정상"으로 본다 — 전체 상태(state)가 WATCH/ALARM이어도
 * 그 원인이 다른 채널이면 이 채널까지 같이 물들면 안 된다(예: voc만 올랐는데 h2·물누액까지 같이
 * 주의/위험으로 보이던 버그, 2026-08-24 수정).
 */
/** CHANNEL_CONDITION의 역방향 조회 — "이 원인이 정확히 어느 채널 얘기인가"(경보 화면 등에서 씀). */
export function channelKeyForCondition(condition: Condition): string | undefined {
  return Object.entries(CHANNEL_CONDITION).find(([, c]) => c === condition)?.[0];
}

export function deriveChannelLevel(
  channelKey: string,
  globalState: ClassifiedState,
  conditions: Condition[],
  hasLiveData: boolean,
): Level | null {
  if (!hasLiveData) return null; // 호출부가 목데이터로 폴백해야 한다는 뜻
  const conditionKey = CHANNEL_CONDITION[channelKey];
  const isFlagged = conditionKey !== undefined && conditions.includes(conditionKey);
  return isFlagged ? APP_STATE_TO_LEVEL[globalState] : "ok";
}
