// 메인 화면 "기록" 아코디언 로직 — pairedMac으로 최근 30일치 기록을 조회한다.
import { useEffect, useState } from "react";
import { useDevice } from "@/contexts/DeviceContext";
import { httpEventsService } from "@/services/events";
import type { EventListResponse } from "@/types/telemetry";

const WINDOW_DAYS = 30;

export function useEvents() {
  const { pairedMac } = useDevice();
  const [items, setItems] = useState<EventListResponse["items"]>([]);
  const [truncated, setTruncated] = useState(false);
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
    const until = new Date();
    const since = new Date(until.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    httpEventsService.list(pairedMac, since, until).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? "unknown_error");
        return;
      }
      setItems(result.items ?? []);
      setTruncated(result.truncated ?? false);
    });
    return () => {
      cancelled = true;
    };
  }, [pairedMac]);

  return { items, truncated, loading, error };
}
