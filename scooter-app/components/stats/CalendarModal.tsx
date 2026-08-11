// 기간 선택용 범위 캘린더. 숙소 예약 캘린더처럼 시작일을 먼저 찍고 종료일을 찍으면 그 사이가
// 채워지면서 "OO일간"이 표시된다 — 단일 날짜만 찍고 끝(자동으로 오늘까지)이던 예전 버전은
// 어디서부터 어디까지를 고른 건지 안 보여서 부자연스럽다는 피드백으로 이렇게 바뀌었다.
// 네이티브 모듈 없이 순수 RN으로 구현 — 새 dev-client 빌드 필요 없음.
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

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`;
}

function dayCount(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
}

export function CalendarModal({
  visible,
  onSelectRange,
  onClose,
}: {
  visible: boolean;
  onSelectRange: (from: string, to: string) => void;
  onClose: () => void;
}) {
  const scheme = useScheme();
  const t = colors[scheme];
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const today = toDateString(now);
  const weeks = getMonthMatrix(viewYear, viewMonth);

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handlePress = (dStr: string) => {
    // 아직 시작일이 없거나, 시작·종료가 이미 다 찍혀 있으면(재선택) 새로 시작일부터.
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dStr);
      setRangeEnd(null);
      return;
    }
    // 시작일보다 이전 날짜를 찍으면 그게 새 시작일이 된다.
    if (dStr < rangeStart) {
      setRangeStart(dStr);
    } else {
      setRangeEnd(dStr);
    }
  };

  const confirm = () => {
    if (!rangeStart || !rangeEnd) return;
    onSelectRange(rangeStart, rangeEnd);
    setRangeStart(null);
    setRangeEnd(null);
  };

  const handleClose = () => {
    setRangeStart(null);
    setRangeEnd(null);
    onClose();
  };

  const infoText = rangeStart && rangeEnd
    ? `${formatKoreanDate(rangeStart)} ~ ${formatKoreanDate(rangeEnd)} · ${dayCount(rangeStart, rangeEnd)}일간`
    : rangeStart
      ? `${formatKoreanDate(rangeStart)} ~ 끝나는 날짜를 선택하세요`
      : "시작하는 날짜를 선택하세요";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
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
                const isStart = dStr === rangeStart;
                const isEnd = dStr === rangeEnd;
                const isEdge = isStart || isEnd;
                const isBetween = !!rangeStart && !!rangeEnd && dStr > rangeStart && dStr < rangeEnd;
                return (
                  <Pressable
                    key={di}
                    disabled={isFuture}
                    onPress={() => handlePress(dStr)}
                    style={[
                      styles.cell,
                      isBetween && { backgroundColor: `${t.primary}22` },
                      isEdge && { backgroundColor: t.primary, borderRadius: 8 },
                    ]}
                  >
                    <Text
                      style={{
                        color: isFuture ? t.labelAssist : isEdge ? "#fff" : t.labelNormal,
                        fontSize: 13,
                        fontWeight: isEdge ? "700" : "400",
                      }}
                    >
                      {day.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <Text style={[styles.info, { color: t.labelNeutral }]}>{infoText}</Text>

          <Pressable
            disabled={!(rangeStart && rangeEnd)}
            onPress={confirm}
            style={[styles.confirmBtn, { backgroundColor: rangeStart && rangeEnd ? t.primary : t.fillStrong }]}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>확인</Text>
          </Pressable>
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
  info: { textAlign: "center", fontSize: 12.5, fontWeight: "600", marginTop: 10 },
  confirmBtn: { marginTop: 12, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
});
