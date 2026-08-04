// 화면이 보여줄 상태(정상/주의/경보)의 유일한 출처. 이 컨텍스트는 상태를 "계산"하지 않고 "받는다" —
// 판정은 노드/서버 책임이라 클라이언트가 임계값을 굴리지 않는다 (A1, C5).
//
// telemetrySource가 아직 아무 것도 보내주지 않으면(C4 — 서버 없음) isLive=false이고, 화면은
// "분류된 상태"가 아니라 "데이터 없음"으로 취급해야 한다 — DevStateToggle은 그 상태에서만
// 로컬로 값을 채워 넣는 개발용 오버라이드다. 실 데이터가 들어오면 오버라이드는 자동으로 무시된다.
//
// 예전에는 이걸 화면마다 useState로 따로 들고 있어서(hooks/useAppState.ts) 화면 간에 상태가
// 공유되지 않는 버그가 있었다 — Context로 올려서 앱 전체가 같은 값을 보게 한다.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppState } from "@/mocks/channels";
import { noTelemetrySource, type TelemetrySource } from "@/services/telemetrySource";

interface AppStateContextValue {
  state: AppState;
  /** true면 telemetrySource가 실제로 값을 보내고 있다는 뜻. false면 devOverride(목데이터)를 보여주는 중. */
  isLive: boolean;
  /** 개발용 로컬 오버라이드. isLive일 때는 화면에 반영되지 않는다. */
  setDevState: (state: AppState) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({
  children,
  source = noTelemetrySource,
}: {
  children: ReactNode;
  source?: TelemetrySource;
}) {
  const [remoteState, setRemoteState] = useState<AppState | null>(null);
  const [devOverride, setDevOverride] = useState<AppState>("normal");

  useEffect(() => source.subscribe(setRemoteState), [source]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      state: remoteState ?? devOverride,
      isLive: remoteState !== null,
      setDevState: setDevOverride,
    }),
    [remoteState, devOverride],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState는 AppStateProvider 안에서만 쓸 수 있다 (app/_layout.tsx 확인).");
  }
  return ctx;
}
