// 실시간 화면 상단 리본: 상태 문구 + 점검요청 버튼, 그라데이션 위험도 바 + 커서, 5단 진행 스테퍼.
// U1(화면 구조)·U6(문구 3단)을 그대로 반영 — 문구/수치는 mocks/channels.ts의 STATE_CONTENT.
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { colors } from "@/constants/tokens";
import { STEPPER_LABELS, type StateContent } from "@/mocks/channels";

export function StatusRibbon({
  content,
  onReportPress,
}: {
  content: StateContent;
  onReportPress?: () => void;
}) {
  const scheme = useColorScheme() ?? "light";
  const t = colors[scheme];

  return (
    <View style={[styles.card, { backgroundColor: t.bgElev, borderColor: t.lineNormal }]}>
      <View style={styles.msgRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headline, { color: t.labelStrong }]}>{content.msg}</Text>
          <Text style={[styles.sub, { color: t.labelAlt }]}>{content.sub}</Text>
        </View>
        <Pressable
          onPress={onReportPress}
          style={[styles.reportBtn, { backgroundColor: content.danger ? t.negative : t.fillNormal }]}
        >
          <Text style={{ color: content.danger ? "#fff" : t.labelStrong, fontSize: 12, fontWeight: "700" }}>
            {content.btn}
          </Text>
        </Pressable>
      </View>

      <View style={styles.scale}>
        <View style={styles.barWrap}>
          <LinearGradient
            colors={[t.primary, t.positive, t.cautionary, t.negative]}
            locations={[0, 0.34, 0.68, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bar}
          />
          <View
            style={[
              styles.cursor,
              { left: `${content.cursorPct}%`, borderColor: t.labelStrong, backgroundColor: t.bgElev },
            ]}
          />
        </View>
        <View style={styles.ticks}>
          <Text style={{ fontSize: 10, color: t.labelAlt }}>안정</Text>
          <Text style={{ fontSize: 10, color: t.labelAlt, fontWeight: "600" }}>정비 요망</Text>
          <Text style={{ fontSize: 10, color: t.labelAlt, fontWeight: "600" }}>신고</Text>
        </View>
      </View>

      <View style={styles.stepper}>
        {STEPPER_LABELS.map((label, i) => {
          const kind = content.stage < 0 ? "idle" : i === content.stage ? "hit" : i < content.stage ? "on" : "idle";
          const barColor = kind === "hit" ? t.negative : kind === "on" ? t.cautionary : t.fillStrong;
          return (
            <View key={label} style={styles.stepperItem}>
              <View style={[styles.stepperBar, { backgroundColor: barColor }]} />
              <Text
                style={[
                  styles.stepperLabel,
                  { color: kind === "idle" ? t.labelAssist : t.labelNeutral, fontWeight: kind === "idle" ? "400" : "600" },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, borderRadius: 20, borderWidth: 1, padding: 16, paddingBottom: 14 },
  msgRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", justifyContent: "space-between" },
  headline: { fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  sub: { fontSize: 11.5, marginTop: 5 },
  reportBtn: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14 },
  scale: { marginTop: 16 },
  barWrap: { height: 15, justifyContent: "center" },
  bar: { height: 7, borderRadius: 4 },
  cursor: { position: "absolute", width: 15, height: 15, borderRadius: 8, borderWidth: 3, marginLeft: -7.5 },
  ticks: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  stepper: { flexDirection: "row", gap: 5, marginTop: 16 },
  stepperItem: { flex: 1, alignItems: "center" },
  stepperBar: { height: 4, borderRadius: 2, alignSelf: "stretch" },
  stepperLabel: { fontSize: 9, marginTop: 6, textAlign: "center", lineHeight: 12 },
});
