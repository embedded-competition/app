// 메인 화면과 상세보기 화면이 공유하는 "지금 보고 있는 기간" — 상세보기에서 기간을 고르면
// 메인 화면도 같은 기간을 반영해야 해서(B안 확정) 화면별 로컬 상태가 아니라 여기서 공유한다.
// AppStateContext(텔레메트리 전용)와는 관심사가 달라 별도 컨텍스트로 뺐다.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Period =
  | { kind: "live" }
  | { kind: "today" }
  | { kind: "week" }
  | { kind: "custom"; from: string; to: string };

interface PeriodContextValue {
  period: Period;
  setPeriod: (period: Period) => void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<Period>({ kind: "live" });

  const value = useMemo<PeriodContextValue>(() => ({ period, setPeriod }), [period]);

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) {
    throw new Error("usePeriod는 PeriodProvider 안에서만 쓸 수 있다 (app/_layout.tsx 확인).");
  }
  return ctx;
}
