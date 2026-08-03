// 상단 내비게이션의 LIVE 배지. 점이 1.4초 주기로 깜빡인다 (프로토타입 pulse 애니메이션).
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, useColorScheme } from "react-native";
import { colors } from "@/constants/tokens";

export function LiveBadge() {
  const scheme = useColorScheme() ?? "light";
  const t = colors[scheme];
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

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
