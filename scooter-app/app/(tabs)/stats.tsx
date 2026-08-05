// 통계 탭. O5: 4탭 유지 + 날짜별 센서 그래프로 확정. api-spec.md의 "날짜별 센서값 조회"를
// mocks/history.ts로 흉내낸다 — 실 서버 붙으면 그 API 응답으로 교체.
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/tokens";
import { useScheme } from "@/contexts/ThemeModeContext";
import { getDailyHistory, hasAnomaly, toDateString } from "@/mocks/history";
import { DateNav } from "@/components/stats/DateNav";
import { MiniLineChart } from "@/components/stats/MiniLineChart";
import { CalendarModal } from "@/components/stats/CalendarModal";

export default function StatsScreen() {
  const scheme = useScheme();
  const t = colors[scheme];
  const insets = useSafeAreaInsets();
  const [dateStr, setDateStr] = useState(() => toDateString(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const history = useMemo(() => getDailyHistory(dateStr), [dateStr]);
  const anomaly = hasAnomaly(history);
  const isToday = dateStr >= toDateString(new Date());

  const shiftDate = (deltaDays: number) => {
    const next = new Date(dateStr);
    next.setDate(next.getDate() + deltaDays);
    setDateStr(toDateString(next));
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bgAlt, paddingTop: insets.top + 8 }]}>
      <DateNav
        date={dateStr}
        onPrev={() => shiftDate(-1)}
        onNext={() => shiftDate(1)}
        onPressDate={() => setCalendarOpen(true)}
        disableNext={isToday}
      />
      <CalendarModal
        visible={calendarOpen}
        selectedDate={dateStr}
        onSelect={(d) => {
          setDateStr(d);
          setCalendarOpen(false);
        }}
        onClose={() => setCalendarOpen(false)}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View
          style={[
            styles.summary,
            {
              backgroundColor: anomaly ? `${t.negative}1f` : t.fillAlt,
              borderColor: anomaly ? t.negative : t.lineWeak,
            },
          ]}
        >
          <Text style={{ color: anomaly ? t.accRed : t.labelNormal, fontWeight: "700", fontSize: 14 }}>
            {anomaly ? `이상 있음 · ${history.events.length}건` : "이상 없음"}
          </Text>
        </View>

        <MiniLineChart label="배터리 가스" values={history.samples.map((s) => s.gasDevZ)} tone={t.primary} />
        <MiniLineChart label="과충전 가스" values={history.samples.map((s) => s.h2Mv)} tone={t.accCyan} />
        <MiniLineChart label="타는 가스" values={history.samples.map((s) => s.coMv)} tone={t.accOrange} />
        <MiniLineChart label="부풀어 오름" values={history.samples.map((s) => s.presDev)} tone={t.accGreen} />

        <Pressable
          style={[styles.recordBtn, { backgroundColor: t.primary }]}
          onPress={() => router.push({ pathname: "/(tabs)/record", params: { date: dateStr } })}
        >
          <Text style={styles.recordBtnText}>이 날짜 기록 보기</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  summary: { borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", marginBottom: 14 },
  recordBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  recordBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
