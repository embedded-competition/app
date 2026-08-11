// 기기 등록이 끝나면(pairedMac이 생기면) 푸시 알림 권한을 요청하고 Expo 푸시 토큰을 받아서
// 서버에 등록한다 — api-spec.md "API 사용 순서" 2번. ALARM 판정 시 서버가 이 토큰으로
// Expo Push API를 직접 호출하는 것(같은 문서 "③ 서버 발신")까지가 이 기능의 목적이다.
//
// 웹·시뮬레이터는 실제 푸시 토큰을 못 받는 경우가 많아서 조용히 건너뛴다 — 이 훅이 실패해도
// 앱의 다른 기능에 영향을 주면 안 된다(치명적이지 않은 부가 기능).
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useDevice } from "@/contexts/DeviceContext";
import { noPushTokenService } from "@/services/pushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const { pairedMac } = useDevice();

  useEffect(() => {
    if (!pairedMac || Platform.OS === "web") return;

    let cancelled = false;

    (async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (status !== "granted") {
        status = (await Notifications.requestPermissionsAsync()).status;
      }
      if (status !== "granted" || cancelled) return;

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
        const { data: token } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (!cancelled) {
          await noPushTokenService.register(pairedMac, token);
        }
      } catch {
        // 시뮬레이터 등 푸시 토큰을 발급 못 받는 환경 — 조용히 무시.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pairedMac]);
}
