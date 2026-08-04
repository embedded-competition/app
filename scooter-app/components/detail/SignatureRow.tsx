// "경보는 이렇게 판단합니다" 3요소(급변/지속/무회복, A4) 박스. 프로토타입 .sig를 이식.
import { StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { colors } from "@/constants/tokens";
import { SIG_LABELS } from "@/mocks/channels";

export function SignatureRow({
  sig,
  sigOn,
}: {
  sig: readonly [string, string, string];
  sigOn: readonly [boolean, boolean, boolean];
}) {
  const scheme = useScheme();
  const t = colors[scheme];

  return (
    <View style={styles.row}>
      {SIG_LABELS.map((label, i) => (
        <View key={label.title} style={[styles.box, { backgroundColor: t.fillAlt, borderColor: sigOn[i] ? t.negative : t.lineWeak }]}>
          <Text style={[styles.check, { color: sigOn[i] ? t.accRed : t.labelAssist }]}>{sig[i]}</Text>
          <Text style={[styles.title, { color: t.labelStrong }]}>{label.title}</Text>
          <Text style={[styles.sub, { color: t.labelAlt }]}>{label.sub}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginTop: 12 },
  box: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 11, alignItems: "center" },
  check: { fontSize: 15 },
  title: { fontSize: 11, fontWeight: "600", marginTop: 6, textAlign: "center" },
  sub: { fontSize: 9.5, marginTop: 2, textAlign: "center", lineHeight: 13 },
});
