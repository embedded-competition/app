// 실제 서버(Orca Backend) 응답을 화면이 쓰는 AppState(NORMAL/WATCH/ALARM/FAULT)로 변환한다.
// 서버는 더 이상 단일 상태 문자열을 안 주고 status/stage/conditions/latched/water 5개 필드로
// 쪼개서 준다(scooter-app/docs/interface.md §2 참고) — 화면 쪽 콘텐츠 시스템(mocks/channels.ts의
// STATE_CONTENT 등)은 그대로 4키 구조를 쓰고 있어서, 그 사이를 잇는 매핑이 필요하다.
//
// **2026-08-24 시뮬레이터로 직접 확인함: status만 보면 안 된다.** `/v1/simulation/devices/{mac}/
// channels/voc/flow`로 VOC_RISE를 걸어서 재현해보니 `stage`가 즉시 "GAS_LEAK"으로 바뀌고
// `conditions`에 "VOC_RISE"가 뜨는데도 `status`는 계속 "STABLE"로 남아있었다(알람 임계치
// 96% 지점까지도) — status와 stage가 같이 안 움직이는 게 확인됐다(backend-requests.md §2.2
// 질문이 실제로 참이었음). status만 보고 판정하면 명백한 이상 신호가 있는데도 화면이 계속
// "정상"으로 보여서, 이 앱의 핵심 목적(조기경보)에 어긋난다 — 그래서 stage도 같이 반영해서
// 둘 중 더 심각한 쪽을 취한다. 정확한 관계(status가 왜 안 움직였는지)는 여전히 백엔드
// 확인 필요(§2.2) — 회신 오면 이 매핑을 다시 검토할 것.
import type { AppState } from "@/mocks/channels";
import type { DeviceCurrentResponse, DeviceStatus, Stage } from "@/types/telemetry";

type ClassifiedAppState = Exclude<AppState, "FAULT">;

const SEVERITY: Record<ClassifiedAppState, number> = { NORMAL: 0, WATCH: 1, ALARM: 2 };

// status 설명("화면 게이지의 세 지점과 1:1")을 근거로 한 추정 매핑.
const STATUS_TO_APP_STATE: Record<DeviceStatus, ClassifiedAppState> = {
  STABLE: "NORMAL",
  SERVICE_NEEDED: "WATCH",
  REPORT: "ALARM",
};

// stage(화재 진행 단계) 쪽 추정 매핑 — STEPPER_LABELS(이상없음/온도상승/가스누출/급격히악화/발화)
// 5단과 순서가 같다. NONE=평소, TEMP_RISE·GAS_LEAK=주의, RAPID_WORSENING·IGNITION=경보로 봤다.
const STAGE_TO_APP_STATE: Record<Stage, ClassifiedAppState> = {
  NONE: "NORMAL",
  TEMP_RISE: "WATCH",
  GAS_LEAK: "WATCH",
  RAPID_WORSENING: "ALARM",
  IGNITION: "ALARM",
};

/**
 * null이면 "분류할 데이터가 없음"(AppStateContext가 이미 null을 그렇게 다룬다) —
 * status와 stage 둘 다 없을 때만 null. 둘 중 하나만 있어도 그걸로 판정한다.
 */
export function deriveAppState(current: DeviceCurrentResponse): AppState | null {
  // ALARM latch는 자동 해제 없음(A7) — latched가 true면 다른 값이 뭐든 최소 ALARM으로 본다.
  if (current.latched) return "ALARM";

  // SENSOR_FAULT는 가스 심각도 축이 아니라 "기기 자체가 고장남" 축이라 FAULT로 뺀다 —
  // status/stage가 뭐든 우선한다. 이것도 추정이다(§2.5 확인 요청).
  if (current.conditions.includes("SENSOR_FAULT")) return "FAULT";

  if (current.status === null && current.stage === null) return null;

  const fromStatus = current.status === null ? null : STATUS_TO_APP_STATE[current.status];
  const fromStage = current.stage === null ? null : STAGE_TO_APP_STATE[current.stage];

  if (fromStatus === null) return fromStage;
  if (fromStage === null) return fromStatus;
  return SEVERITY[fromStage] > SEVERITY[fromStatus] ? fromStage : fromStatus;
}
