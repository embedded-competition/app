// 푸시 토큰을 서버에 등록하는 경계. 실제 엔드포인트: POST /v1/devices/{mac}/push-token
// (멱등), body { token: string }, 응답 { registered: boolean } — 인증 없음, sensorCheck.ts·
// events.ts·alarmRelease.ts와 같은 패턴으로 페어링된 맥주소를 그대로 경로에 쓴다.
// 2026-08-24: 실제 HTTP 호출로 연결함(항상 실패하던 스텁 대체) — 이 등록이 안 되면 서버가
// 이 폰의 토큰 자체를 몰라서 ALARM이 나도 푸시를 보낼 수가 없다.
const API_BASE = "https://api.agenthub.work";

export interface PushTokenResult {
  ok: boolean;
  error?: string;
}

export interface PushTokenService {
  register(mac: string, token: string): Promise<PushTokenResult>;
}

export const httpPushTokenService: PushTokenService = {
  async register(mac, token) {
    try {
      const res = await fetch(`${API_BASE}/v1/devices/${encodeURIComponent(mac)}/push-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        return { ok: false, error: `http_${res.status}` };
      }
      const data = (await res.json()) as { registered: boolean };
      return data.registered ? { ok: true } : { ok: false, error: "not_registered" };
    } catch {
      return { ok: false, error: "network_error" };
    }
  },
};
