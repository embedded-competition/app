// 상단 내비게이션의 연결 상태 배지. 두 가지뿐이다:
// "live"    — telemetrySource가 실제로 값을 보내는 중 (빨간 점 깜빡이는 LIVE)
// "offline" — 데이터가 없음 (연결 안 됨)
// live가 아닌데 LIVE처럼 보이게 하지 않는다.
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { colors } from "@/constants/tokens";

export type LiveBadgeStatus = "live" | "offline";

export function LiveBadge({ status }: { status: LiveBadgeStatus }) {
  const scheme = useScheme();
  const t = colors[scheme];
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== "live") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [status, opacity]);

  if (status === "live") {
    return (
      <View style={[styles.badge, { backgroundColor: t.fillNormal }]}>
        <Animated.View style={[styles.dot, { backgroundColor: t.negative, opacity }]} />
        <Text style={[styles.text, { color: t.accRed }]}>LIVE</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: t.fillNormal }]}>
      <View style={[styles.dot, { backgroundColor: t.labelAssist }]} />
      <Text style={[styles.text, { color: t.labelAlt }]}>연결 안 됨</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 10.5, fontWeight: "700" },
});
