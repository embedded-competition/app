// 상단 내비게이션의 연결 상태 배지. live=true면 점이 1.4초 주기로 깜빡이는 LIVE 배지(프로토타입 pulse
// 애니메이션), live=false면 "실 데이터 없음"을 정직하게 보여주는 정적 배지 — 목데이터를 LIVE라고
// 속여 보여주지 않기 위해서다 (services/telemetrySource.ts 참고).
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { colors } from "@/constants/tokens";

export function LiveBadge({ live = true }: { live?: boolean }) {
  const scheme = useScheme();
  const t = colors[scheme];
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!live) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live, opacity]);

  if (!live) {
    return (
      <View style={[styles.badge, { backgroundColor: t.fillNormal }]}>
        <View style={[styles.dot, { backgroundColor: t.labelAssist }]} />
        <Text style={[styles.text, { color: t.labelAlt }]}>목데이터</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: t.fillNormal }]}>
      <Animated.View style={[styles.dot, { backgroundColor: t.negative, opacity }]} />
      <Text style={[styles.text, { color: t.accRed }]}>LIVE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 10.5, fontWeight: "700" },
});
