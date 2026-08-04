// 사용자가 고를 수 있는 테마 설정: 시스템 / 라이트 / 다크. 설정 탭에서 바꾸고 재시작 후에도 유지된다.
// 앱의 모든 화면·컴포넌트는 react-native의 useColorScheme() 대신 이 파일의 useScheme()을 써야
// 사용자가 고른 값(시스템이면 OS 값)을 정확히 반영한다.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

export type ThemeMode = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

const STORAGE_KEY = "scooter-app:theme-mode";

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  scheme: ColorScheme;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const systemScheme: ColorScheme = useSystemColorScheme() ?? "light";
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === "system" || saved === "light" || saved === "dark") {
          setModeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const scheme: ColorScheme = mode === "system" ? systemScheme : mode;

  const value = useMemo(() => ({ mode, setMode, scheme }), [mode, scheme]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode는 ThemeModeProvider 안에서만 쓸 수 있다 (app/_layout.tsx 확인).");
  }
  return ctx;
}

/** 화면 코드에서는 이걸 쓴다 — react-native의 useColorScheme()을 직접 쓰지 말 것. */
export function useScheme(): ColorScheme {
  return useThemeMode().scheme;
}
