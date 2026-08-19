// 경보 해제 요청의 서버 경계. [O8](../../planning/decisions/open-questions.md#o8) 확정:
// 해제 "권한 판단"은 서버가 내부에서 한다 — 앱은 그 규칙을 몰라도 되고, 그냥 요청만 보낸다.
// 서버가 허용하면 성공, 아니면 실패만 돌려준다(왜 거부됐는지 세세한 사유는 앱에 안 내려줌).
//
// 실 엔드포인트: POST /v1/devices/{mac}/alarm/release, body { note?: string },
// 응답 { released: boolean } — 인증 없음, sensorCheck.ts·events.ts와 같은 패턴으로
// 페어링된 맥주소를 그대로 경로에 쓴다. 2026-08-19: 실제 HTTP 호출로 연결함(항상 실패하던
// 스텁 대체).
const API_BASE = "https://api.agenthub.work";

export interface AlarmReleaseResult {
  ok: boolean;
  error?: string;
}

export interface AlarmReleaseService {
  /** mac은 페어링된 맥주소. note는 선택 — 해제 사유 메모. */
  request(mac: string, note?: string): Promise<AlarmReleaseResult>;
}

export const httpAlarmReleaseService: AlarmReleaseService = {
  async request(mac, note) {
    try {
      const res = await fetch(`${API_BASE}/v1/devices/${encodeURIComponent(mac)}/alarm/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note ?? null }),
      });
      if (!res.ok) {
        return { ok: false, error: res.status === 403 ? "not_allowed" : `http_${res.status}` };
      }
      const data = (await res.json()) as { released: boolean };
      return data.released ? { ok: true } : { ok: false, error: "not_allowed" };
    } catch {
      return { ok: false, error: "network_error" };
    }
  },
};
