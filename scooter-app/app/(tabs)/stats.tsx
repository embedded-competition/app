// O5 열린 결정: 통계 탭으로 낼 수 있는 게 마땅치 않다 (SoH·잔량 측정 불가).
// 3탭으로 줄이고 기록 탭 요약 카드로 흡수하는 안이 유력 — 확정 전까지 자리만 비워둔다.
import { StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/tokens";

export default function StatsScreen() {
  const scheme = useScheme();
  const t = colors[scheme];
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: t.bgAlt, paddingTop: insets.top }]}>
      <Text style={{ color: t.labelAlt, textAlign: "center", lineHeight: 20 }}>
        통계 탭은 아직 설계 전이에요.{"\n"}지금은 기록 탭 상단 요약 카드로 대신하고 있어요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
