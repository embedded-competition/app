// 메인 화면의 "기록" 섹션. 예전엔 별도 탭(record.tsx)이었는데, 탭바를 없애면서 채널 그리드
// 바로 아래 접이식(아코디언)으로 옮겼다(B안 확정) — 평소엔 접혀 있어 화면이 안 길어진다.
import { useState } from "react";
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { colors } from "@/constants/tokens";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface RecordItem {
  id: string;
  /** 이미 표시용으로 포맷된 문자열(예: "오늘 14:32", "8/7 14:32") — ISO 원본은 호출부에서 변환해서 넘긴다. */
  time: string;
  description: string;
}

export function RecordAccordion({
  summary,
  items,
  defaultOpen = false,
}: {
  summary: string;
  items: RecordItem[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const scheme = useScheme();
  const t = colors[scheme];

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bgElev, borderColor: t.lineNormal }]}>
      <Pressable onPress={toggle} style={styles.summaryRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.labelStrong }]}>기록</Text>
          <Text style={[styles.summary, { color: t.labelAlt }]}>{summary}</Text>
        </View>
        <Text style={{ color: t.labelAssist, fontSize: 14 }}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      {open && (
        <View style={[styles.body, { borderTopColor: t.lineWeak }]}>
          {items.length === 0 ? (
            <Text style={[styles.empty, { color: t.labelAssist }]}>이 기간엔 기록이 없어요.</Text>
          ) : (
            items.map((item, i) => (
              <View
                key={item.id}
                style={[styles.row, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.lineWeak }]}
              >
                <Text style={{ color: t.labelNormal, fontSize: 12, flex: 1 }}>{item.description}</Text>
                <Text style={{ color: t.labelAssist, fontSize: 11 }}>{item.time}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 22, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 15 },
  title: { fontSize: 14, fontWeight: "600" },
  summary: { fontSize: 11, marginTop: 3 },
  body: { paddingHorizontal: 15, paddingBottom: 12, borderTopWidth: 1 },
  empty: { fontSize: 12, paddingVertical: 12, textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, paddingVertical: 10 },
});
