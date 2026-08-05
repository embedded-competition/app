// 페어링된 킥보드(MAC 주소)의 유일한 출처. 등록 전에는 앱 전체가 PairingForm만 보여준다 —
// 등록 안 된 기기의 데이터를 보여줄 수 없으니, 텔레메트리(AppStateContext)보다 앞선 게이트다.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { localOnlyDeviceRegistry, type DeviceRegistry } from "@/services/deviceRegistry";

const MAC_STORAGE_KEY = "scooter-app:paired-mac";
const MANAGEMENT_PHONE_STORAGE_KEY = "scooter-app:management-phone";

interface DeviceContextValue {
  /** null이면 아직 등록된 기기가 없다는 뜻. */
  pairedMac: string | null;
  /** 맥주소 등록 시 서버가 같이 내려준 관리실 전화번호. 경보 화면 "관리실 전화" 버튼에 씀. */
  managementPhone: string | null;
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
  const [managementPhone, setManagementPhone] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(MAC_STORAGE_KEY), AsyncStorage.getItem(MANAGEMENT_PHONE_STORAGE_KEY)])
      .then(([mac, phone]) => {
        setPairedMac(mac);
        setManagementPhone(phone);
      })
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
        await AsyncStorage.setItem(MAC_STORAGE_KEY, mac);
        setPairedMac(mac);
        if (result.managementPhone) {
          await AsyncStorage.setItem(MANAGEMENT_PHONE_STORAGE_KEY, result.managementPhone);
          setManagementPhone(result.managementPhone);
        }
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
    setManagementPhone(null);
    AsyncStorage.multiRemove([MAC_STORAGE_KEY, MANAGEMENT_PHONE_STORAGE_KEY]).catch(() => {});
  }, []);

  const value = useMemo<DeviceContextValue>(
    () => ({ pairedMac, managementPhone, isLoaded, pairing, error, pair, unpair }),
    [pairedMac, managementPhone, isLoaded, pairing, error, pair, unpair],
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
