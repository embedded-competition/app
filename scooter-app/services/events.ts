// 기록(이벤트) 조회 — GET /v1/devices/{mac}/events?since=&until= (둘 다 필수).
// 인증 없음 — sensorCheck.ts와 같은 패턴으로 페어링된 맥주소를 그대로 경로에 쓴다.
import type { EventListResponse } from "@/types/telemetry";

const API_BASE = "https://api.agenthub.work";

export interface EventsResult {
  ok: boolean;
  items?: EventListResponse["items"];
  truncated?: boolean;
  error?: string;
}

export interface EventsService {
  list(mac: string, since: Date, until: Date): Promise<EventsResult>;
}

export const httpEventsService: EventsService = {
  async list(mac, since, until) {
    try {
      const qs = new URLSearchParams({ since: since.toISOString(), until: until.toISOString() });
      const res = await fetch(`${API_BASE}/v1/devices/${encodeURIComponent(mac)}/events?${qs}`);
      if (!res.ok) {
        return { ok: false, error: `http_${res.status}` };
      }
      const data = (await res.json()) as EventListResponse;
      return { ok: true, items: data.items, truncated: data.truncated };
    } catch {
      return { ok: false, error: "network_error" };
    }
  },
};
