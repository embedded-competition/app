// 통계 탭의 센서별 일별 그래프. 채널마다 하나씩, 24시간(시간당 1개) 값을 선 그래프로 보여준다.
import { StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { colors } from "@/constants/tokens";
import { useScheme } from "@/contexts/ThemeModeContext";

export function MiniLineChart({ label, values, tone }: { label: string; values: number[]; tone: string }) {
  const scheme = useScheme();
  const t = colors[scheme];
  const W = 300;
  const H = 56;
  const max = Math.max(...values, 0.001) * 1.15;
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 0.001);
  const points = values
    .map((v, i) => `${((i * W) / (values.length - 1)).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`)
    .join(" ");

  return (
    <View style={[styles.card, { backgroundColor: t.bgElev, borderColor: t.lineNormal }]}>
      <Text style={[styles.label, { color: t.labelStrong }]}>{label}</Text>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Polyline points={points} fill="none" stroke={tone} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
});
