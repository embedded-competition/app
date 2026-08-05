// 통계 탭 상단 날짜 이동(◀ 날짜 ▶). 오늘 이후로는 못 넘어가게 막는다(아직 안 생긴 데이터).
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/tokens";
import { useScheme } from "@/contexts/ThemeModeContext";

export function DateNav({
  date,
  onPrev,
  onNext,
  onPressDate,
  disableNext,
}: {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  /** 날짜 텍스트를 탭했을 때 — 달력을 띄우는 용도로 쓴다. */
  onPressDate?: () => void;
  disableNext?: boolean;
}) {
  const scheme = useScheme();
  const t = colors[scheme];

  return (
    <View style={styles.row}>
      <Pressable onPress={onPrev} hitSlop={8} style={styles.btn}>
        <Text style={{ color: t.primary, fontSize: 18, fontWeight: "700" }}>‹</Text>
      </Pressable>
      <Pressable onPress={onPressDate} hitSlop={8}>
        <Text style={{ color: t.labelStrong, fontSize: 16, fontWeight: "700" }}>{date}</Text>
      </Pressable>
      <Pressable onPress={onNext} disabled={disableNext} hitSlop={8} style={styles.btn}>
        <Text style={{ color: disableNext ? t.labelAssist : t.primary, fontSize: 18, fontWeight: "700" }}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, paddingVertical: 12 },
  btn: { paddingHorizontal: 6, paddingVertical: 4 },
});
