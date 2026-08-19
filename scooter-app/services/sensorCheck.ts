// 센서 점검 결과 조회 — 실제 백엔드(Orca Backend)에 붙는 첫 실 HTTP 호출.
// GET /v1/devices/{mac} → { sensorCheck: "OK" | "FAULT" | null }. 인증 없음 — 등록
// 절차가 없어서(deviceRegistry.ts 참고) 그냥 페어링 때 로컬에 저장해둔 맥주소를 그대로
// 경로에 넣어 조회한다(다른 조회 API도 이 패턴을 그대로 따르면 된다).
const API_BASE = "https://api.agenthub.work";

export type SensorCheckStatus = "OK" | "FAULT" | null;

export interface SensorCheckResult {
  ok: boolean;
  status?: SensorCheckStatus;
  error?: string;
}

export interface SensorCheckService {
  check(mac: string): Promise<SensorCheckResult>;
}

export const httpSensorCheckService: SensorCheckService = {
  async check(mac) {
    try {
      const res = await fetch(`${API_BASE}/v1/devices/${encodeURIComponent(mac)}`);
      if (!res.ok) {
        return { ok: false, error: `http_${res.status}` };
      }
      const data = (await res.json()) as { sensorCheck: SensorCheckStatus };
      return { ok: true, status: data.sensorCheck };
    } catch {
      return { ok: false, error: "network_error" };
    }
  },
};
