// 날짜 텍스트를 탭하면 뜨는 달력. 네이티브 모듈 없이 순수 RN으로 구현 — 새 dev-client 빌드 필요 없음.
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/tokens";
import { useScheme } from "@/contexts/ThemeModeContext";
import { toDateString } from "@/mocks/history";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getMonthMatrix(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function CalendarModal({
  visible,
  selectedDate,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const scheme = useScheme();
  const t = colors[scheme];
  const selected = new Date(selectedDate);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const today = toDateString(new Date());
  const weeks = getMonthMatrix(viewYear, viewMonth);

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: t.bgElev }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={8}>
              <Text style={{ color: t.primary, fontSize: 16, fontWeight: "700" }}>‹</Text>
            </Pressable>
            <Text style={{ color: t.labelStrong, fontWeight: "700", fontSize: 15 }}>
              {viewYear}년 {viewMonth + 1}월
            </Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={8}>
              <Text style={{ color: t.primary, fontSize: 16, fontWeight: "700" }}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={[styles.weekday, { color: t.labelAssist }]}>
                {w}
              </Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => {
                if (!day) return <View key={di} style={styles.cell} />;
                const dStr = toDateString(day);
                const isFuture = dStr > today;
                const isSelected = dStr === selectedDate;
                return (
                  <Pressable
                    key={di}
                    disabled={isFuture}
                    onPress={() => onSelect(dStr)}
                    style={[styles.cell, isSelected && { backgroundColor: t.primary, borderRadius: 8 }]}
                  >
                    <Text
                      style={{
                        color: isFuture ? t.labelAssist : isSelected ? "#fff" : t.labelNormal,
                        fontSize: 13,
                        fontWeight: isSelected ? "700" : "400",
                      }}
                    >
                      {day.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "center", alignItems: "center" },
  sheet: { width: 300, borderRadius: 16, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekday: { width: 36, textAlign: "center", fontSize: 11, marginBottom: 4 },
  cell: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
