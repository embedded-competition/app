// 기록 화면. 평소엔 최근 기록을 보여주고, 통계 탭에서 "이 날짜 기록 보기"로 들어오면
// 그 날짜(date 쿼리 파라미터)로 필터링해서 보여준다 — mocks/history.ts의 이벤트를 그대로 쓴다.
import { router, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/tokens";
import { mockEvents } from "@/mocks/channels";
import { getDailyHistory } from "@/mocks/history";

export default function RecordScreen() {
  const scheme = useScheme();
  const t = colors[scheme];
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date?: string }>();

  const items = date
    ? getDailyHistory(date).events.map((e, i) => ({
        id: `${date}-${i}`,
        timestamp: `${date} ${e.time}`,
        description: e.description,
      }))
    : mockEvents;

  return (
    <View style={[styles.container, { backgroundColor: t.bgAlt, paddingTop: insets.top + 16 }]}>
      {date ? (
        <View style={styles.filterBar}>
          <Text style={{ color: t.labelStrong, fontWeight: "700", fontSize: 15 }}>{date} 기록</Text>
          <Pressable onPress={() => router.push("/(tabs)/record")}>
            <Text style={{ color: t.primary, fontSize: 13, fontWeight: "600" }}>전체 보기</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.summary, { backgroundColor: t.bgElev, borderColor: t.lineSolid }]}>
          <Text style={{ color: t.labelNormal, fontWeight: "600" }}>
            이번 달 경보 0건 · 오경보 차단 2건 · 완충 방치 4회
          </Text>
        </View>
      )}

      {items.length === 0 ? (
        <Text style={{ color: t.labelAssist, textAlign: "center", marginTop: 24 }}>이 날짜엔 기록이 없어요.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderColor: t.lineWeak }]}>
              <Text style={{ color: t.labelNormal }}>{item.description}</Text>
              <Text style={{ color: t.labelAssist, fontSize: 12 }}>{item.timestamp}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  summary: { borderRadius: 16, borderWidth: 1, padding: 14 },
  filterBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { borderBottomWidth: 1, paddingBottom: 8, gap: 2 },
});
