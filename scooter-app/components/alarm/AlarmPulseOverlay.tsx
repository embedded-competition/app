// 경보 화면 상하 그라데이션 명멸 (U2). ALARM 1.05초 강하게, WATCH 2.6초 은은하게.
// TODO: prefers-reduced-motion 상당(AccessibilityInfo.isReduceMotionEnabled) 감지 시 고정 톤으로 대체.
import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { alarmPulse } from "@/constants/tokens";

export function AlarmPulseOverlay({ level }: { level: "WATCH" | "ALARM" }) {
  const opacity = useRef(new Animated.Value(alarmPulse[level].minOpacity)).current;
  const color = level === "ALARM" ? "#ff4242" : "#ff9200";

  useEffect(() => {
    const { periodMs, minOpacity, maxOpacity } = alarmPulse[level];
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: maxOpacity, duration: periodMs / 2, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: minOpacity, duration: periodMs / 2, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [level, opacity]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity }]}>
      <LinearGradient colors={[color, "transparent"]} style={styles.top} />
      <LinearGradient colors={["transparent", color]} style={styles.bottom} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", top: 0, left: 0, right: 0, height: "45%" },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: "45%" },
});
