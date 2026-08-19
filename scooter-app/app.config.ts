// 네이버 지도 Client ID를 커밋하지 않기 위해 app.json 대신 app.config.ts를 쓴다.
// 실행 전 scooter-app/.env에 NAVER_MAP_CLIENT_ID=발급받은값 을 넣을 것 (CLAUDE.md 참고).
import type { ExpoConfig } from "expo/config";

const NAVER_MAP_CLIENT_ID = process.env.NAVER_MAP_CLIENT_ID ?? "";

if (!NAVER_MAP_CLIENT_ID) {
  console.warn(
    "[app.config.ts] NAVER_MAP_CLIENT_ID가 비어 있습니다. 지도 기능은 prebuild/빌드 전에 .env에 값을 채워야 동작합니다.",
  );
}

const config: ExpoConfig = {
  name: "scooter-app",
  slug: "scooter-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "scooterapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.embeddedcompetition.scooterapp",
  },
  android: {
    package: "com.embeddedcompetition.scooterapp",
    // NAVER_MAP_CLIENT_ID(.env)와 달리 이 파일은 gitignore하지 않고 커밋한다 — 안에 든 API
    // 키는 패키지명+서명 SHA1로 제한돼 있어 공개돼도 안전하고(구글 공식 입장), 애초에 APK
    // 안에도 그대로 박혀서 배포된다. EAS Build는 git에 커밋된 파일만 업로드하므로, 커밋 안
    // 하면 클라우드 빌드가 "google-services.json is missing"으로 실패한다.
    googleServicesFile: "./google-services.json",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "@mj-studio/react-native-naver-map",
      {
        client_id: NAVER_MAP_CLIENT_ID,
        android: {
          ACCESS_FINE_LOCATION: true,
          ACCESS_COARSE_LOCATION: true,
        },
        ios: {
          NSLocationWhenInUseUsageDescription: "킥보드 위치를 지도에 표시하려면 위치 정보가 필요합니다.",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          extraMavenRepos: ["https://repository.map.naver.com/archive/maven"],
        },
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#0066ff",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission: "킥보드 위치를 지도에 표시하려면 위치 정보가 필요합니다.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  owner: "junholeee",
  extra: {
    eas: {
      projectId: "fa7cc985-7281-406a-9002-9287cf975c72",
    },
  },
};

export default config;
