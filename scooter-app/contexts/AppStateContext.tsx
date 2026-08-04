// 화면이 보여줄 상태(정상/주의/경보)의 유일한 출처. 이 컨텍스트는 상태를 "계산"하지 않고 "받는다" —
// 판정은 노드/서버 책임이라 클라이언트가 임계값을 굴리지 않는다 (A1, C5).
//
// state는 AppState | null이다. **null = 아무 것도 분류되지 않은 상태** — 데이터가 없으면
// 화면은 "정상"이 아니라 "연결된 기기 없음"을 보여줘야 한다. 데이터 없이 기본값을 "normal"로
// 깔아두면 마치 실제로 정상 판정을 받은 것처럼 보이는데, 그건 거짓이다.
//
// setDevState(null)이 기본값이라 개발자가 명시적으로 미리보기 상태를 고르기 전까지는 계속 null이다.
// telemetrySource가 실제로 값을 보내기 시작하면 그게 항상 devState보다 우선한다.
//
// 예전에는 이걸 화면마다 useState로 따로 들고 있어서(hooks/useAppState.ts) 화면 간에 상태가
// 공유되지 않는 버그가 있었다 — Context로 올려서 앱 전체가 같은 값을 보게 한다.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppState } from "@/mocks/channels";
import { noTelemetrySource, type TelemetrySource } from "@/services/telemetrySource";

interface AppStateContextValue {
  /** null이면 분류할 데이터가 없다는 뜻 — 화면은 이걸 "정상"으로 착각해서 보여주면 안 된다. */
  state: AppState | null;
  /** true면 telemetrySource가 실제로 값을 보내고 있다는 뜻. */
  isLive: boolean;
  /** 개발용 미리보기. null을 넘기면 미리보기를 끄고 "연결된 기기 없음"으로 돌아간다. */
  setDevState: (state: AppState | null) => void;
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
  const [devState, setDevState] = useState<AppState | null>(null);

  useEffect(() => source.subscribe(setRemoteState), [source]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      state: remoteState ?? devState,
      isLive: remoteState !== null,
      setDevState,
    }),
    [remoteState, devState],
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
