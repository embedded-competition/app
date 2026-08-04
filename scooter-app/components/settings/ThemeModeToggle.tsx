// 설정 화면의 테마 선택(시스템/라이트/다크). 값은 ThemeModeContext에 저장되고 재시작 후에도 유지된다.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/tokens";
import { useScheme, useThemeMode, type ThemeMode } from "@/contexts/ThemeModeContext";

const OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "시스템" },
  { key: "light", label: "라이트" },
  { key: "dark", label: "다크" },
];

export function ThemeModeToggle() {
  const scheme = useScheme();
  const t = colors[scheme];
  const { mode, setMode } = useThemeMode();

  return (
    <View style={[styles.seg, { backgroundColor: t.fillNormal }]}>
      {OPTIONS.map((opt) => {
        const active = opt.key === mode;
        return (
          <Pressable
            key={opt.key}
            onPress={() => setMode(opt.key)}
            style={[styles.btn, active && { backgroundColor: t.bgElev }]}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: active ? t.labelStrong : t.labelAlt }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 2 },
  btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9 },
});
