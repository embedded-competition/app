// 앱 전역 Provider와 네비게이션 크롬(헤더) 설정. 하단 탭바는 없다(B안 확정) — index가 유일한
// 메인 화면이고, 설정은 그 화면 안에서 펼쳐지는 패널이다.
// 화면 내부 콘텐츠는 각 컴포넌트가 useScheme()으로 알아서 처리하지만, React Navigation의
// 헤더 배경·테두리·활성색은 ThemeProvider 없이는 항상 라이트로 고정된다.
//
// 기기(맥주소) 등록은 텔레메트리보다 앞선 게이트다 — 등록 안 된 기기의 데이터는 애초에
// 있을 수 없으니, 등록 전에는 메인 화면 대신 PairingForm만 보여준다.
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AppStateProvider, useAppState } from "@/contexts/AppStateContext";
import { DeviceProvider, useDevice } from "@/contexts/DeviceContext";
import { ThemeModeProvider, useScheme } from "@/contexts/ThemeModeContext";
import { PeriodProvider } from "@/contexts/PeriodContext";
import { colors } from "@/constants/tokens";
import { PairingForm } from "@/components/pairing/PairingForm";

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <DeviceProvider>
        <AppStateProvider>
          <PeriodProvider>
            <Navigation />
          </PeriodProvider>
        </AppStateProvider>
      </DeviceProvider>
    </ThemeModeProvider>
  );
}

function Navigation() {
  const scheme = useScheme();
  const t = colors[scheme];
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const { pairedMac, isLoaded } = useDevice();
  const { state } = useAppState();

  // 경보(ALARM)로 "바뀌는 순간"에만 경보 화면을 강제로 띄운다 (U2: 경보 시 화면 전체가
  // 사이렌처럼 명멸). 어느 탭에 있든 상관없이 떠야 해서 화면별이 아니라 루트에 둔다.
  // 이미 경보 화면을 봤는데 계속 경보 상태라고 계속 다시 밀어넣지 않도록 rising edge만 감지.
  const wasAlarm = useRef(false);
  useEffect(() => {
    if (!pairedMac) return;
    const isAlarm = state === "ALARM";
    if (isAlarm && !wasAlarm.current) {
      router.push("/alarm");
    }
    wasAlarm.current = isAlarm;
  }, [pairedMac, state]);

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

  // AsyncStorage에서 등록 여부를 읽어오는 아주 짧은 순간(보통 한 프레임 이내) — 아무 것도 안 그린다.
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={navTheme}>
      {pairedMac ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="detail/[channel]"
            options={{ headerShown: true, title: "항목 상세" }}
          />
          <Stack.Screen
            name="alarm"
            options={{ presentation: "fullScreenModal", animation: "fade" }}
          />
          <Stack.Screen
            name="pairing"
            options={{ headerShown: true, title: "기기 등록", presentation: "modal" }}
          />
        </Stack>
      ) : (
        <PairingForm />
      )}
      {/* "auto"는 OS 설정을 직접 따라가서 사용자가 앱 안에서 라이트/다크를 강제로 고른 경우와
          어긋날 수 있다 — 우리가 실제로 적용 중인 scheme에 맞춰 명시적으로 지정한다. */}
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
