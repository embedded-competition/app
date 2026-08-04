// "같은 모델과 비교" 2열 박스. 프로토타입 .cmp를 이식. 실제로는 fleet 집계(서버) 필요 — 지금은 목데이터.
import { StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { colors } from "@/constants/tokens";

export function CompareRow({
  avg,
  mine,
  mineColor,
}: {
  avg: string;
  mine: string;
  mineColor?: string;
}) {
  const scheme = useScheme();
  const t = colors[scheme];

  return (
    <View style={styles.row}>
      <View style={[styles.box, { backgroundColor: t.fillAlt }]}>
        <Text style={[styles.label, { color: t.labelAlt }]}>같은 모델 킥보드 1,284대</Text>
        <Text style={[styles.value, { color: t.labelStrong }]}>{avg}</Text>
      </View>
      <View style={[styles.box, { backgroundColor: t.fillAlt }]}>
        <Text style={[styles.label, { color: t.labelAlt }]}>이 킥보드</Text>
        <Text style={[styles.value, { color: mineColor ?? t.labelStrong }]}>{mine}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, marginTop: 12 },
  box: { flex: 1, borderRadius: 14, padding: 12 },
  label: { fontSize: 10.5, marginBottom: 5 },
  value: { fontSize: 16, fontWeight: "700" },
});
