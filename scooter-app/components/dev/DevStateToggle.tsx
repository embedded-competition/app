// 개발용 상태 전환 세그먼트. 프로토타입 HTML 상단의 정상/주의(WATCH)/경보(ALARM) 토글과 같은 역할.
// 서버가 붙기 전까지 세 상태를 직접 확인하기 위한 것 — 실 데이터 연동 후에는 지워야 한다.
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { colors } from "@/constants/tokens";
import type { AppState } from "@/mocks/channels";

const OPTIONS: { key: AppState; label: string }[] = [
  { key: "normal", label: "정상" },
  { key: "watch", label: "주의" },
  { key: "alarm", label: "경보" },
];

export function DevStateToggle({
  state,
  onChange,
}: {
  state: AppState;
  onChange: (next: AppState) => void;
}) {
  const scheme = useColorScheme() ?? "light";
  const t = colors[scheme];

  return (
    <View style={[styles.seg, { backgroundColor: t.fillNormal }]}>
      {OPTIONS.map((opt) => {
        const active = opt.key === state;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
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
  seg: { flexDirection: "row", marginHorizontal: 18, marginTop: 10, borderRadius: 14, padding: 3, gap: 2 },
  btn: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 11 },
});
