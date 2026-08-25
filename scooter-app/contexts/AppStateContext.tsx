// 화면이 보여줄 상태(정상/주의/경보)의 유일한 출처. 이 컨텍스트는 상태를 "계산"하지 않고 "받는다" —
// 판정은 노드/서버 책임이라 클라이언트가 임계값을 굴리지 않는다 (A1, C5).
//
// state는 AppState | null이다. **null = 아무 것도 분류되지 않은 상태** — 데이터가 없으면
// 화면은 "정상"이 아니라 "연결된 기기 없음"을 보여줘야 한다. 데이터 없이 기본값을 "NORMAL"로
// 깔아두면 마치 실제로 정상 판정을 받은 것처럼 보이는데, 그건 거짓이다.
//
// telemetrySource는 raw DeviceCurrentResponse를 주고, 여기서 deriveAppState()로 상태를
// 뽑는다 — channels(gas/h2/co/pressure의 실측 value·slope)도 같이 노출해서 채널 카드가
// 판정 상태 문구뿐 아니라 실제 숫자도 보여줄 수 있게 한다.
//
// history(채널별 최근 값 이력)도 여기서 쌓는다 — 폴링 자체가 여기서 일어나니까, 상세보기
// 화면이 열려있을 때만 쌓으면 화면을 나갔다 들어올 때마다 "최근 1분" 차트가 처음부터 다시
// 모이는 문제가 있었다(2026-08-24 발견). Provider가 앱 내내 살아있으니 여기 쌓아두면 어느
// 화면에서 봐도 이어진 이력을 볼 수 있다. mac이 바뀌면(재등록) source가 바뀌면서 이력도 같이
// 리셋한다.
//
// 예전에는 이걸 화면마다 useState로 따로 들고 있어서(hooks/useAppState.ts) 화면 간에 상태가
// 공유되지 않는 버그가 있었다 — Context로 올려서 앱 전체가 같은 값을 보게 한다.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppState } from "@/mocks/channels";
import { noTelemetrySource, type TelemetrySource } from "@/services/telemetrySource";
import { deriveAppState } from "@/services/deriveAppState";
import type { ChannelReading, Condition, DeviceCurrentResponse, Stage } from "@/types/telemetry";

interface LiveChannels {
  gas: ChannelReading | null;
  h2: ChannelReading | null;
  co: ChannelReading | null;
  pressure: ChannelReading | null;
}

type NumericChannelKey = "gas" | "h2" | "co" | "pressure";
type ChannelHistoryMap = Record<NumericChannelKey, number[]>;

const EMPTY_HISTORY: ChannelHistoryMap = { gas: [], h2: [], co: [], pressure: [] };
const HISTORY_MAX_POINTS = 12; // 5초 폴링 × 12 = 60초, 기존 "최근 1분" 틀과 맞춤

interface AppStateContextValue {
  /** null이면 분류할 데이터가 없다는 뜻 — 화면은 이걸 "정상"으로 착각해서 보여주면 안 된다. */
  state: AppState | null;
  /** true면 telemetrySource가 실제로 값을 보내고 있다는 뜻. */
  isLive: boolean;
  /** 채널별 실측값(gas/h2/co/pressure). 데이터 없으면 null. */
  channels: LiveChannels | null;
  /** 채널별 최근 값 이력(최대 60초치) — 화면을 오가도 유지된다. */
  history: ChannelHistoryMap;
  /** 지금 서버가 걸어둔 원인들 — 채널별 상세보기가 "이 채널이 지금 걸려있는지" 판단할 때 씀. */
  conditions: Condition[];
  /** 화재로 가는 진행 단계 — 경보 화면이 STEPPER_LABELS로 "지금 단계"를 보여줄 때 씀. */
  stage: Stage | null;
  /** 이 응답이 근거로 삼은 마지막 관측 시각(UTC, ISO). "마지막 수신 N초 전" 표시에 씀. */
  at: string | null;
  /** ALARM latch 유지 여부(A7) — 원본 그대로, 자동 조치 카드 등에서 씀. */
  latched: boolean;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({
  children,
  source = noTelemetrySource,
}: {
  children: ReactNode;
  source?: TelemetrySource;
}) {
  const [remoteData, setRemoteData] = useState<DeviceCurrentResponse | null>(null);
  const [history, setHistory] = useState<ChannelHistoryMap>(EMPTY_HISTORY);

  useEffect(() => {
    // source가 바뀌면(다른 기기로 재등록 등) 이전 기기의 값·이력을 들고 있지 않게 초기화한다.
    setRemoteData(null);
    setHistory(EMPTY_HISTORY);
    return source.subscribe(setRemoteData);
  }, [source]);

  useEffect(() => {
    if (!remoteData) return;
    setHistory((prev) => {
      const next = { ...prev };
      (Object.keys(EMPTY_HISTORY) as NumericChannelKey[]).forEach((key) => {
        const reading = remoteData[key];
        if (!reading || reading.value === null) return;
        const arr = [...prev[key], reading.value];
        next[key] = arr.length > HISTORY_MAX_POINTS ? arr.slice(arr.length - HISTORY_MAX_POINTS) : arr;
      });
      return next;
    });
  }, [remoteData]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      state: remoteData ? deriveAppState(remoteData) : null,
      isLive: remoteData !== null,
      channels: remoteData
        ? { gas: remoteData.gas, h2: remoteData.h2, co: remoteData.co, pressure: remoteData.pressure }
        : null,
      history,
      conditions: remoteData?.conditions ?? [],
      stage: remoteData?.stage ?? null,
      at: remoteData?.at ?? null,
      latched: remoteData?.latched ?? false,
    }),
    [remoteData, history],
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
