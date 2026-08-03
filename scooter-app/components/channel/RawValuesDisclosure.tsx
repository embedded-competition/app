// "센서 원본 수치 보기" 접이식 (U4). 일반 사용자에겐 기본 숨김, 개발·벤치·심사 질의응답용으로 남겨둔다.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { colors } from "@/constants/tokens";

export function RawValuesDisclosure({
  rows,
}: {
  rows: { label: string; hint: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const scheme = useColorScheme() ?? "light";
  const t = colors[scheme];

  return (
    <View style={[styles.container, { borderColor: t.lineNormal }]}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.summary}>
        <Text style={{ color: t.labelNeutral, fontSize: 12, fontWeight: "600" }}>센서 원본 수치 보기</Text>
        <Text style={{ color: t.labelAssist, fontSize: 11 }}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      {open && (
        <View style={[styles.table, { borderTopColor: t.lineWeak }]}>
          {rows.map((row) => (
            <View key={row.label} style={[styles.row, { borderBottomColor: t.lineWeak }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.labelNeutral, fontSize: 11.5 }}>{row.label}</Text>
                <Text style={{ color: t.labelAssist, fontSize: 10 }}>{row.hint}</Text>
              </View>
              <Text style={{ color: t.labelStrong, fontSize: 11.5, fontWeight: "600" }}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 18, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12 },
  summary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  table: { borderTopWidth: 1, paddingBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 7, borderBottomWidth: 1, gap: 10 },
});
