// 기기 등록이 끝나면(pairedMac이 생기면) 푸시 알림 권한을 요청하고 Expo 푸시 토큰을 받아서
// 서버에 등록한다 — api-spec.md "API 사용 순서" 2번. ALARM 판정 시 서버가 이 토큰으로
// Expo Push API를 직접 호출하는 것(같은 문서 "③ 서버 발신")까지가 이 기능의 목적이다.
//
// expo-notifications는 네이티브 모듈(ExpoPushTokenManager)이 필요하다 — 이 모듈을 추가하기
// 전에 만들어진 dev-client 빌드나 순정 Expo Go에는 없어서, 최상단에서 그냥 import하면 import문
// 자체에서 "Cannot find native module"이 던져지고 이 파일을 import하는 index.tsx 전체가
// 죽는다(모듈 평가가 파일 로드 시점에 통째로 실패). 그래서 반드시 useEffect 안에서 동적
// import로 늦게 불러오고 try/catch로 감싼다 — 그래야 네이티브 모듈이 없는 빌드에서도 이 훅만
// 조용히 아무것도 안 하고, 나머지 앱은 정상 동작한다(치명적이지 않은 부가 기능).
import { useEffect } from "react";
import { Platform } from "react-native";
import { useDevice } from "@/contexts/DeviceContext";
import { httpPushTokenService } from "@/services/pushToken";

export function usePushNotifications() {
  const { pairedMac } = useDevice();

  useEffect(() => {
    if (!pairedMac || Platform.OS === "web") return;

    let cancelled = false;

    (async () => {
      let Notifications: typeof import("expo-notifications");
      try {
        Notifications = await import("expo-notifications");
      } catch {
        // 네이티브 모듈이 안 붙은 빌드(dev-client 재빌드 전) — 조용히 무시.
        return;
      }

      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

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

        const Constants = (await import("expo-constants")).default;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
        const { data: token } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (!cancelled) {
          await httpPushTokenService.register(pairedMac, token);
        }
      } catch {
        // 권한 거부·시뮬레이터·구버전 dev-client 등 — 조용히 무시.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pairedMac]);
}
