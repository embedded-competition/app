// 설정 패널의 "센서 점검" 행 로직 — pairedMac으로 GET /v1/devices/{mac}를 불러서
// sensorCheck 결과를 받는다. 패널이 열릴 때마다(마운트 시) 한 번 조회한다.
import { useEffect, useState } from "react";
import { useDevice } from "@/contexts/DeviceContext";
import { httpSensorCheckService, type SensorCheckStatus } from "@/services/sensorCheck";

export function useSensorCheck() {
  const { pairedMac } = useDevice();
  const [status, setStatus] = useState<SensorCheckStatus>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pairedMac) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    httpSensorCheckService.check(pairedMac).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? "unknown_error");
        return;
      }
      setStatus(result.status ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [pairedMac]);

  return { status, loading, error };
}
