// 기록 화면. O5 의견: 통계 탭을 따로 두지 않고 상단 요약 카드로 흡수.
// events[]/suppressed[]/actions[]는 서버가 생성 (C5) — 지금은 목데이터.
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/tokens";
import { mockEvents } from "@/mocks/channels";

export default function RecordScreen() {
  const scheme = useScheme();
  const t = colors[scheme];
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: t.bgAlt, paddingTop: insets.top + 16 }]}>
      <View style={[styles.summary, { backgroundColor: t.bgElev, borderColor: t.lineSolid }]}>
        <Text style={{ color: t.labelNormal, fontWeight: "600" }}>
          이번 달 경보 0건 · 오경보 차단 2건 · 완충 방치 4회
        </Text>
      </View>
      <FlatList
        data={mockEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderColor: t.lineWeak }]}>
            <Text style={{ color: t.labelNormal }}>{item.description}</Text>
            <Text style={{ color: t.labelAssist, fontSize: 12 }}>{item.timestamp}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  summary: { borderRadius: 16, borderWidth: 1, padding: 14 },
  row: { borderBottomWidth: 1, paddingBottom: 8, gap: 2 },
});
