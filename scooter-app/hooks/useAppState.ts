// 실시간/항목상세/경보 화면이 공유하는 정상·주의·경보 상태.
// 백엔드가 없는 지금은 사용자가 DevStateToggle로 직접 바꾸면서 세 상태를 확인한다.
// 실 서버가 붙으면 이 훅 내부만 폴링/구독으로 교체.
import { useState } from "react";
import type { AppState } from "@/mocks/channels";

export function useAppState(initial: AppState = "normal") {
  const [state, setState] = useState<AppState>(initial);
  return { state, setState };
}
