// 맥주소 입력 폼. 앱 최초 진입 시 게이트로도 쓰고(app/_layout.tsx), 설정 탭에서 기기를
// 바꿀 때도 같은 컴포넌트를 쓴다(app/pairing.tsx).
//
// DeviceRegistry 인터페이스는 dev/prod 둘 다 동일하게 쓰고, 실제 서버가 생기면 registry
// 구현체만 바뀐다 — 이 폼은 손댈 필요 없음.
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "@/constants/tokens";
import { useScheme } from "@/contexts/ThemeModeContext";
import { useDevice } from "@/contexts/DeviceContext";
import { normalizeMac } from "@/services/deviceRegistry";

export function PairingForm({ onPaired }: { onPaired?: () => void }) {
  const scheme = useScheme();
  const t = colors[scheme];
  const { pair, pairing, error } = useDevice();
  const [input, setInput] = useState("");

  const mac = normalizeMac(input);
  const canSubmit = mac !== null && !pairing;

  const submit = async () => {
    if (!mac) return;
    const ok = await pair(mac);
    if (ok) onPaired?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bgAlt }]}>
      <Text style={[styles.title, { color: t.labelStrong }]}>기기를 등록해주세요</Text>
      <Text style={[styles.desc, { color: t.labelAlt }]}>
        점검장비(MCU) 라벨에 적힌 MAC 주소를 입력하면{"\n"}이 킥보드와 연동됩니다.
      </Text>

      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="AA:BB:CC:DD:EE:FF"
        placeholderTextColor={t.labelAssist}
        autoCapitalize="characters"
        autoCorrect={false}
        style={[styles.input, { color: t.labelStrong, borderColor: t.lineNormal, backgroundColor: t.bgElev }]}
      />

      {error && <Text style={[styles.error, { color: t.negative }]}>{error}</Text>}

      <Pressable
        onPress={submit}
        disabled={!canSubmit}
        style={[styles.btn, { backgroundColor: canSubmit ? t.primary : t.fillStrong }]}
      >
        {pairing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>등록하기</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: "700" },
  desc: { fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 8 },
  input: {
    width: "100%",
    maxWidth: 280,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    letterSpacing: 1,
    textAlign: "center",
  },
  error: { fontSize: 12, marginTop: 2 },
  btn: { width: "100%", maxWidth: 280, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
