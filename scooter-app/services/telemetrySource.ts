// 상태(정상/주의/경보) 판정은 앱이 하지 않는다 — 노드/서버가 계산해서 내려주는 값만 받는다
// (A1: 절대 임계값 금지, C5: 상태→문구 매핑은 서버 책임). 이 파일이 그 "받는" 경계다.
//
// 서버(Orca Backend) 자체는 이제 실제로 있지만, 아직 이 파일에 HTTP 폴링 구현체를 안 붙였다.
// 붙일 때는 GET /v1/devices/{mac}/telemetry/current를 폴링해서 DeviceCurrentResponse
// (types/telemetry.ts)를 받고, services/deriveAppState.ts의 deriveAppState()로 이 AppState로
// 변환해서 onState에 넘기면 된다 — 화면 코드는 건드릴 필요가 없어야 한다.
import type { AppState } from "@/mocks/channels";

export interface TelemetrySource {
  /** 서버가 상태를 보낼 때마다 호출된다. 구독 해제 함수를 반환한다. */
  subscribe(onState: (state: AppState) => void): () => void;
}

// 아직 연결할 서버가 없어서 아무 것도 방출하지 않는 기본 소스.
// useAppState가 이걸 기본값으로 쓰면 "실시간 데이터 없음" 상태가 되고, 개발 중에는
// DevStateToggle로 로컬에서만 값을 채워 넣는다.
export const noTelemetrySource: TelemetrySource = {
  subscribe() {
    return () => {};
  },
};
