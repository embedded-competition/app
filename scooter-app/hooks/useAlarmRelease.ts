// 경보 해제 요청 버튼 로직. alarm.tsx와 설정 탭 둘 다 같은 요청을 보낼 수 있어야 해서
// (경보 화면이 아니어도 설정에서 바로 요청 가능) 공용 훅으로 뺐다.
import { useState } from "react";
import { useDevice } from "@/contexts/DeviceContext";
import { noAlarmReleaseService } from "@/services/alarmRelease";

export function useAlarmRelease() {
  const { pairedMac } = useDevice();
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestRelease = async (note?: string) => {
    setReleasing(true);
    setError(null);
    const result = await noAlarmReleaseService.request(pairedMac ?? "unknown", note);
    setReleasing(false);
    if (!result.ok) {
      setError(
        result.error === "no_server" ? "서버 연결 전이라 해제 요청을 처리할 수 없어요." : "해제 요청이 거부됐어요.",
      );
    }
    return result;
  };

  return { releasing, error, requestRelease };
}
