// 앱 전역 Provider와 네비게이션 크롬(탭바·헤더) 설정.
// 화면 내부 콘텐츠는 각 컴포넌트가 useScheme()으로 알아서 처리하지만, React Navigation의
// 탭바/헤더 배경·테두리·활성색은 ThemeProvider 없이는 항상 라이트로 고정된다.
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppStateProvider } from "@/contexts/AppStateContext";
import { ThemeModeProvider, useScheme } from "@/contexts/ThemeModeContext";
import { colors } from "@/constants/tokens";

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <AppStateProvider>
        <Navigation />
      </AppStateProvider>
    </ThemeModeProvider>
  );
}

function Navigation() {
  const scheme = useScheme();
  const t = colors[scheme];
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;

  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: t.bgAlt,
      card: t.bgNormal,
      text: t.labelStrong,
      border: t.lineWeak,
      primary: t.primary,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="detail/[channel]"
          options={{ headerShown: true, title: "항목 상세" }}
        />
        <Stack.Screen
          name="alarm"
          options={{ presentation: "fullScreenModal", animation: "fade" }}
        />
      </Stack>
      {/* "auto"는 OS 설정을 직접 따라가서 사용자가 앱 안에서 라이트/다크를 강제로 고른 경우와
          어긋날 수 있다 — 우리가 실제로 적용 중인 scheme에 맞춰 명시적으로 지정한다. */}
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
