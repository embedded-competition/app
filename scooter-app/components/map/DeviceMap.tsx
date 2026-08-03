// 실시간 화면 최상단 지도. 프로토타입의 단순화된 街 SVG + 위치 핀(halo 펄스) + 주소 오버레이를 그대로 이식.
// 위치 소스는 O1(GPS/등록위치/게이트웨이) 미확정 — 지금은 등록 위치 문자열만 표시한다.
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, useColorScheme } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import { colors } from "@/constants/tokens";
import type { Level } from "@/mocks/channels";

const LEVEL_TONE: Record<Level, "positive" | "cautionary" | "negative"> = {
  ok: "positive",
  warn: "cautionary",
  bad: "negative",
};

export function DeviceMap({
  level,
  addrMain,
  addrSub,
}: {
  level: Level;
  addrMain: string;
  addrSub: string;
}) {
  const scheme = useColorScheme() ?? "light";
  const t = colors[scheme];
  const pinColor = t[LEVEL_TONE[level]];
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    halo.setValue(0);
    const loop = Animated.loop(Animated.timing(halo, { toValue: 1, duration: 2400, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [halo, level]);

  const scale = halo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.5] });
  const opacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] });

  return (
    <View style={styles.container}>
      <Svg width="100%" height="100%" viewBox="0 0 390 196" preserveAspectRatio="xMidYMid slice">
        <Rect width={390} height={196} fill={t.fillAlt} />
        <Path d="M-10 58 H400 M-10 142 H400 M96 -10 V210 M280 -10 V210" stroke={t.lineWeak} strokeWidth={12} />
        <Rect x={14} y={72} width={66} height={54} rx={4} fill={t.fillNormal} />
        <Rect x={112} y={72} width={70} height={54} rx={4} fill={t.fillNormal} />
        <Rect x={200} y={72} width={64} height={54} rx={4} fill={t.fillNormal} />
        <Rect x={298} y={72} width={76} height={54} rx={4} fill={t.fillNormal} />
        <Rect x={14} y={8} width={66} height={36} rx={4} fill={t.fillNormal} />
        <Rect x={112} y={8} width={152} height={36} rx={4} fill={t.fillNormal} />
        <SvgText x={20} y={30} fontSize={9} fill={t.labelAssist}>
          성동구 행당동
        </SvgText>
        <SvgText x={304} y={98} fontSize={9} fill={t.labelAssist}>
          주차장 B
        </SvgText>
      </Svg>

      <View style={styles.pin} pointerEvents="none">
        <Animated.View style={[styles.halo, { backgroundColor: pinColor, opacity, transform: [{ scale }] }]} />
        <View style={[styles.dot, { backgroundColor: pinColor, borderColor: t.bgNormal }]}>
          <Text style={{ fontSize: 17 }}>🛴</Text>
        </View>
      </View>

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
  pin: { position: "absolute", left: "50%", top: "46%", marginLeft: -17, marginTop: -17, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 64, height: 64, borderRadius: 32 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 3 },
  addr: { position: "absolute", left: 14, bottom: 12, maxWidth: "78%", borderRadius: 14, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  addrMain: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  addrSub: { fontSize: 11 },
});
