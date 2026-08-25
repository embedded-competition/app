// 상태(정상/주의/경보) 판정은 앱이 하지 않는다 — 노드/서버가 계산해서 내려주는 값만 받는다
// (A1: 절대 임계값 금지, C5: 상태→문구 매핑은 서버 책임). 이 파일이 그 "받는" 경계다.
//
// 응답을 여기서 AppState로 미리 변환하지 않고 raw DeviceCurrentResponse를 그대로 넘긴다 —
// AppStateContext가 deriveAppState()로 상태를 뽑는 것과 별개로, 채널별 실측값(gas/h2/co/
// pressure의 value·slope)도 화면(채널 카드)에 필요해서 원본을 보존해야 한다.
import type { DeviceCurrentResponse } from "@/types/telemetry";

export interface TelemetrySource {
  /** 서버가 응답을 보낼 때마다 호출된다. null=아직 관측 없음(또는 연결이 끊김). 구독 해제 함수를 반환한다. */
  subscribe(onData: (data: DeviceCurrentResponse | null) => void): () => void;
}

// 페어링된 기기가 없을 때 쓰는 기본 소스 — 아무 것도 방출하지 않는다.
export const noTelemetrySource: TelemetrySource = {
  subscribe() {
    return () => {};
  },
};

const API_BASE = "https://api.agenthub.work";
const POLL_INTERVAL_MS = 5000;
// 이 횟수만큼 연속으로 폴링이 실패하면(약 15초) "연결 끊김"으로 본다 — 2026-08-25: 네트워크가
// 잠깐 끊겼을 때 마지막으로 받은 값을 계속 붙들고 있는 버그가 있었다("정상"으로 보였던 순간
// 이후 실제로는 값이 위험 수준으로 바뀌었는데도 화면은 계속 "정상"). 조기경보 앱에서 오래된
// 값을 지금 값처럼 보여주는 건 위험해서, 계속 실패하면 정직하게 null(연결된 기기 없음)로
// 떨어뜨린다 — "정상"으로 착각하게 두지 않는다는 원칙(AppStateContext 주석)의 연장선.
const MAX_CONSECUTIVE_FAILURES = 3;

// mac으로 GET /v1/devices/{mac}/telemetry/current를 주기적으로 폴링하는 실 구현체.
// setInterval 대신 setTimeout 재귀를 쓴다 — 한 번의 폴링이 간격보다 오래 걸려도 요청이
// 겹치지 않게 하기 위해서.
export function createHttpTelemetrySource(mac: string): TelemetrySource {
  return {
    subscribe(onData) {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let consecutiveFailures = 0;

      const poll = async () => {
        let failed = false;
        try {
          const res = await fetch(`${API_BASE}/v1/devices/${encodeURIComponent(mac)}/telemetry/current`);
          if (res.ok) {
            const data = (await res.json()) as DeviceCurrentResponse;
            consecutiveFailures = 0;
            if (!cancelled) onData(data);
          } else {
            failed = true;
          }
        } catch {
          failed = true;
        } finally {
          if (failed) {
            consecutiveFailures += 1;
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && !cancelled) {
              onData(null);
            }
          }
          if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      };

      poll();
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    },
  };
}
