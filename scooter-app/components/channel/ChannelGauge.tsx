// 항목 상세 "지금 얼마나 새고 있나요" 게이지. 프로토타입 .gauge(track+knob+pill)를 그대로 이식.
import { StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { colors } from "@/constants/tokens";
import type { Level } from "@/mocks/channels";

const TONE: Record<Level, "positive" | "cautionary" | "negative"> = {
  ok: "positive",
  warn: "cautionary",
  bad: "negative",
};

export function ChannelGauge({
  pct,
  level,
  pillTitle,
  pillValue,
}: {
  pct: number;
  level: Level;
  pillTitle: string;
  pillValue: string;
}) {
  const scheme = useScheme();
  const t = colors[scheme];
  const tone = t[TONE[level]];

  return (
    <View style={styles.container}>
      <View style={styles.pillWrap}>
        <View style={[styles.pill, { left: `${pct}%`, backgroundColor: tone }]}>
          <Text style={styles.pillText}>{pillTitle}</Text>
          <Text style={styles.pillText}>{pillValue}</Text>
        </View>
      </View>
      <View style={styles.trackWrap}>
        <View style={[styles.track, { backgroundColor: t.fillStrong }]}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: tone }]} />
        </View>
        <View style={[styles.knob, { left: `${pct}%`, borderColor: tone, backgroundColor: t.bgElev }]} />
      </View>
      <View style={styles.ends}>
        <Text style={{ fontSize: 10.5, color: t.labelAlt }}>평소</Text>
        <Text style={{ fontSize: 10.5, color: t.labelAlt }}>주의</Text>
        <Text style={{ fontSize: 10.5, color: t.labelAlt }}>위험</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16, marginBottom: 6 },
  pillWrap: { height: 38, justifyContent: "flex-end" },
  pill: { position: "absolute", bottom: 6, marginLeft: -32, width: 64, borderRadius: 10, paddingVertical: 4, alignItems: "center" },
  pillText: { color: "#fff", fontSize: 10, fontWeight: "700", lineHeight: 13 },
  trackWrap: { height: 14, justifyContent: "center" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 3 },
  knob: { position: "absolute", top: "50%", marginTop: -7, width: 14, height: 14, borderRadius: 7, borderWidth: 3, marginLeft: -7 },
  ends: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
});
