// 페어링된 킥보드(MAC 주소)의 유일한 출처. 등록 전에는 앱 전체가 PairingForm만 보여준다 —
// 등록 안 된 기기의 데이터를 보여줄 수 없으니, 텔레메트리(AppStateContext)보다 앞선 게이트다.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { localOnlyDeviceRegistry, type DeviceRegistry } from "@/services/deviceRegistry";

const STORAGE_KEY = "scooter-app:paired-mac";

interface DeviceContextValue {
  /** null이면 아직 등록된 기기가 없다는 뜻. */
  pairedMac: string | null;
  /** AsyncStorage에서 저장된 값을 다 읽어오기 전까지 true — 이 동안은 화면을 그리지 않는다. */
  isLoaded: boolean;
  pairing: boolean;
  error: string | null;
  /** mac은 이미 normalizeMac()을 거친 값이어야 한다. */
  pair: (mac: string) => Promise<boolean>;
  unpair: () => void;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

export function DeviceProvider({
  children,
  registry = localOnlyDeviceRegistry,
}: {
  children: ReactNode;
  registry?: DeviceRegistry;
}) {
  const [pairedMac, setPairedMac] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(setPairedMac)
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const pair = useCallback(
    async (mac: string) => {
      setPairing(true);
      setError(null);
      try {
        const result = await registry.register(mac);
        if (!result.ok) {
          setError(result.error ?? "등록에 실패했어요. 맥주소를 다시 확인해주세요.");
          return false;
        }
        await AsyncStorage.setItem(STORAGE_KEY, mac);
        setPairedMac(mac);
        return true;
      } catch {
        setError("등록 중 문제가 생겼어요. 다시 시도해주세요.");
        return false;
      } finally {
        setPairing(false);
      }
    },
    [registry],
  );

  const unpair = useCallback(() => {
    setPairedMac(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const value = useMemo<DeviceContextValue>(
    () => ({ pairedMac, isLoaded, pairing, error, pair, unpair }),
    [pairedMac, isLoaded, pairing, error, pair, unpair],
  );

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) {
    throw new Error("useDevice는 DeviceProvider 안에서만 쓸 수 있다 (app/_layout.tsx 확인).");
  }
  return ctx;
}
