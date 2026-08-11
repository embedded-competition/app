// 기간 설정 세그먼트 [지금·오늘·최근 7일·기간 선택]. 메인 화면과 상세보기 화면이 같이 쓴다.
// PeriodContext를 직접 읽고 써서 두 화면이 항상 같은 기간을 보게 한다(B안 확정 — 상세보기에서
// 고른 기간이 메인 화면에도 반영된다).
//
// 상세보기(variant="detail")에는 "지금"이 없다 — 그 화면 위쪽 판정·게이지는 이미 항상 "지금"
// 상태를 보여주고 있어서, 세그먼트는 과거 조회 전용으로만 쓴다.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { colors } from "@/constants/tokens";
import { usePeriod } from "@/contexts/PeriodContext";
import { CalendarModal } from "@/components/stats/CalendarModal";

const OPTIONS = [
  { key: "live", label: "지금" },
  { key: "today", label: "오늘" },
  { key: "week", label: "최근 7일" },
  { key: "custom", label: "기간 선택" },
] as const;

export function PeriodSegment({ variant }: { variant: "main" | "detail" }) {
  const scheme = useScheme();
  const t = colors[scheme];
  const { period, setPeriod } = usePeriod();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const options = variant === "main" ? OPTIONS : OPTIONS.filter((o) => o.key !== "live");

  const handlePress = (key: (typeof OPTIONS)[number]["key"]) => {
    if (key === "custom") {
      setCalendarOpen(true);
      return;
    }
    setPeriod({ kind: key });
  };

  return (
    <>
      <View style={[styles.seg, { backgroundColor: t.fillNormal }]}>
        {options.map((opt) => {
          const active = period.kind === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => handlePress(opt.key)}
              style={[styles.btn, active && { backgroundColor: t.bgElev }]}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: active ? t.labelStrong : t.labelAlt }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <CalendarModal
        visible={calendarOpen}
        onSelectRange={(from, to) => {
          setPeriod({ kind: "custom", from, to });
          setCalendarOpen(false);
        }}
        onClose={() => setCalendarOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: "row", borderRadius: 14, padding: 3, gap: 2 },
  btn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 11 },
});
