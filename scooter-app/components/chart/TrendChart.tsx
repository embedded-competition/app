// 항목 상세 "최근 1분 동안" 추이 차트. 프로토타입 .chart(영역+선+점선 기준선)를 react-native-svg로 이식.
import { StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import Svg, { Line, Polygon, Polyline } from "react-native-svg";
import { colors } from "@/constants/tokens";

export function TrendChart({ series, tone }: { series: number[]; tone: string }) {
  const scheme = useScheme();
  const t = colors[scheme];
  const W = 320;
  const H = 150;
  const max = Math.max(...series, 120) * 1.1;
  const points = series
    .map((v, i) => `${((i * W) / (series.length - 1)).toFixed(1)},${(H - (v / max) * H).toFixed(1)}`)
    .join(" ");
  const areaPoints = `0,${H} ${points} ${W},${H}`;
  const baselineY = (H - (100 / max) * H).toFixed(1);

  return (
    <View style={[styles.card, { backgroundColor: t.bgElev, borderColor: t.lineWeak }]}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendMark, { backgroundColor: tone }]} />
          <Text style={{ color: t.labelAlt, fontSize: 10.5 }}>지금 신호</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendMark, { backgroundColor: t.labelAssist }]} />
          <Text style={{ color: t.labelAlt, fontSize: 10.5 }}>이 킥보드의 평소 수준</Text>
        </View>
      </View>
      <Svg width="100%" height={150} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={0} y1={baselineY} x2={W} y2={baselineY} stroke={t.labelAssist} strokeWidth={1.5} strokeDasharray="4 4" />
        <Polygon points={areaPoints} fill={tone} fillOpacity={0.1} />
        <Polyline points={points} fill="none" stroke={tone} strokeWidth={2.2} strokeLinejoin="round" />
      </Svg>
      <View style={styles.xlab}>
        <Text style={{ color: t.labelAlt, fontSize: 10 }}>60초 전</Text>
        <Text style={{ color: t.labelAlt, fontSize: 10 }}>30초 전</Text>
        <Text style={{ color: t.labelAlt, fontSize: 10 }}>지금</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 12, paddingBottom: 8, marginTop: 10 },
  legend: { flexDirection: "row", gap: 13, paddingBottom: 9, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendMark: { width: 10, height: 2.5, borderRadius: 2 },
  xlab: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6 },
});
