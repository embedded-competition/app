// 실제 서버(Orca Backend) 응답을 화면이 쓰는 AppState(NORMAL/WATCH/ALARM/FAULT)로 변환한다.
// 서버는 더 이상 단일 상태 문자열을 안 주고 status/stage/conditions/latched/water 5개 필드로
// 쪼개서 준다(scooter-app/docs/interface.md §2 참고) — 화면 쪽 콘텐츠 시스템(mocks/channels.ts의
// STATE_CONTENT 등)은 그대로 4키 구조를 쓰고 있어서, 그 사이를 잇는 매핑이 필요하다.
//
// **주의: 이 매핑 규칙은 우리 쪽 추측이고 아직 백엔드 확인 전이다** — backend-requests.md
// §2.2(status/stage가 정확히 뭘 뜻하는지)·§2.5(null 조건)에 확인 요청해둠. 회신이 오면 이
// 함수만 고치면 된다 — 화면 코드는 이 함수 시그니처만 알면 되고 안쪽 규칙은 몰라도 된다.
//
// 아직 어디서도 호출하지 않는다 — services/telemetrySource.ts에 실제 HTTP 폴링 구현체를
// 추가할 때 여기 연결하면 된다.
import type { AppState } from "@/mocks/channels";
import type { DeviceCurrentResponse, DeviceStatus } from "@/types/telemetry";

// status 설명("화면 게이지의 세 지점과 1:1")을 근거로 한 추정 매핑.
const STATUS_TO_APP_STATE: Record<DeviceStatus, Exclude<AppState, "FAULT">> = {
  STABLE: "NORMAL",
  SERVICE_NEEDED: "WATCH",
  REPORT: "ALARM",
};

/**
 * null이면 "분류할 데이터가 없음"(AppStateContext가 이미 null을 그렇게 다룬다) —
 * status===null(관측 없음/예열 중)일 때와 동일하게 처리한다.
 */
export function deriveAppState(current: DeviceCurrentResponse): AppState | null {
  // SENSOR_FAULT는 가스 심각도 축이 아니라 "기기 자체가 고장남" 축이라 FAULT로 뺀다 —
  // status/stage가 뭐든 우선한다. 이것도 추정이다(§2.5 확인 요청).
  if (current.conditions.includes("SENSOR_FAULT")) return "FAULT";
  if (current.status === null) return null;
  return STATUS_TO_APP_STATE[current.status];
}
