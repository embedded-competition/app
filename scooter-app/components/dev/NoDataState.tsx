// 연결된 기기가 없을 때(telemetrySource 미연동 + 미리보기도 안 고른 상태) 보여주는 빈 화면.
// "정상"으로 기본값을 깔아서 마치 판정된 것처럼 보이는 걸 막기 위한 명시적 상태다.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/tokens";
import { useScheme } from "@/contexts/ThemeModeContext";
import type { AppState } from "@/mocks/channels";

const PREVIEW_OPTIONS: { key: AppState; label: string }[] = [
  { key: "NORMAL", label: "정상 미리보기" },
  { key: "WATCH", label: "주의 미리보기" },
  { key: "ALARM", label: "경보 미리보기" },
  { key: "FAULT", label: "고장 미리보기" },
];

export function NoDataState({ onPreview }: { onPreview: (state: AppState) => void }) {
  const scheme = useScheme();
  const t = colors[scheme];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: t.labelStrong }]}>연결된 기기가 없어요</Text>
      <Text style={[styles.desc, { color: t.labelAlt }]}>
        아직 서버·임베디드 연동 전이라 분류할 데이터가 없습니다.{"\n"}
        화면 개발용으로 상태를 미리 볼 수는 있어요.
      </Text>
      <View style={styles.previewList}>
        {PREVIEW_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => onPreview(opt.key)}
            style={[styles.previewBtn, { backgroundColor: t.fillNormal }]}
          >
            <Text style={{ color: t.labelNormal, fontSize: 13, fontWeight: "600" }}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 17, fontWeight: "700" },
  desc: { fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 2 },
  previewList: { marginTop: 20, gap: 8, width: "100%", maxWidth: 260 },
  previewBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
});
