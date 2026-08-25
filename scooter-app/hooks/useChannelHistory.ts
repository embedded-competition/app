// 항목 상세 "최근 1분" 실시간 추이 차트용 — 실제 누적은 contexts/AppStateContext.tsx가
// 폴링될 때마다(services/telemetrySource.ts, 5초 간격) 담당한다. 여기서는 그 이력 중 이
// 화면이 보고 있는 채널 하나만 골라서 돌려준다. Provider가 앱 내내 살아있어서, 상세보기를
// 나갔다 다시 들어와도 이력이 유지된다(2026-08-24 — 예전엔 이 훅 안에서 로컬로 쌓아서 화면을
// 나갈 때마다 이력이 사라지는 문제가 있었다).
import { useAppState } from "@/contexts/AppStateContext";

export function useChannelHistory(field: "gas" | "h2" | "co" | "pressure" | undefined) {
  const { history } = useAppState();
  return field ? history[field] : [];
}
