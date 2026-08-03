// 실시간 화면 최상단 지도 — 네이버 지도 SDK(@mj-studio/react-native-naver-map).
// locationTrackingMode="Follow"로 GPS·카메라를 네이티브가 알아서 따라가게 한다 — 킥보드를 타고 움직이면 화면도 같이 움직인다.
//
// 주의: 지금은 "폰 자체 GPS"를 킥보드 위치의 대역으로 쓰고 있다. 실제로는 킥보드에 탑재된 모듈의
// GPS/게이트웨이 위치를 서버가 내려줘야 하는데 그 방식이 아직 O1로 미확정이다
// (../../../planning/decisions/open-questions.md#o1). O1이 정해지면 initialCamera/locationTrackingMode를
// 서버가 준 좌표 기반 camera 제어(controlled prop)로 바꿔야 한다.
//
// 네이티브 전용 컴포넌트라 웹에서는 안 뜬다 — 웹 빌드는 DeviceMap.web.tsx(SVG 플레이스홀더)가 대신 쓰인다.
// 실행 전 scooter-app/.env에 NAVER_MAP_CLIENT_ID를 채우고 `npx expo prebuild` + dev-client 빌드가 먼저 필요하다 (CLAUDE.md 참고).
import { useRef } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { NaverMapView, type NaverMapViewRef } from "@mj-studio/react-native-naver-map";
import { colors } from "@/constants/tokens";
import type { Level } from "@/mocks/channels";

// 성동구 행당동 대략 좌표 — GPS 픽스 전까지 보여줄 기본 카메라 위치(플레이스홀더 값).
const DEFAULT_CAMERA = { latitude: 37.5573, longitude: 127.0329, zoom: 16 };

export function DeviceMap({
  addrMain,
  addrSub,
}: {
  level: Level;
  addrMain: string;
  addrSub: string;
}) {
  const scheme = useColorScheme() ?? "light";
  const t = colors[scheme];
  const mapRef = useRef<NaverMapViewRef>(null);

  return (
    <View style={styles.container}>
      <NaverMapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialCamera={DEFAULT_CAMERA}
        isShowLocationButton
        // locationTrackingMode는 선언형 prop이 아니라 ref 메서드로만 설정할 수 있다.
        onInitialized={() => mapRef.current?.setLocationTrackingMode("Follow")}
      />

      <View style={[styles.addr, { backgroundColor: t.bgElev, borderColor: t.lineNormal }]}>
        <Text style={[styles.addrMain, { color: t.labelStrong }]} numberOfLines={1}>
          {addrMain}
        </Text>
        <Text style={[styles.addrSub, { color: t.labelNeutral }]} numberOfLines={1}>
          {addrSub}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 196, overflow: "hidden" },
  addr: {
    position: "absolute",
    left: 14,
    bottom: 12,
    maxWidth: "78%",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  addrMain: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  addrSub: { fontSize: 11 },
});
