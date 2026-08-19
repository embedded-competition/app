// 연결된 기기가 없을 때(telemetrySource 미연동) 보여주는 빈 화면.
// "정상"으로 기본값을 깔아서 마치 판정된 것처럼 보이는 걸 막기 위한 명시적 상태다.
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/tokens";
import { useScheme } from "@/contexts/ThemeModeContext";

export function NoDataState() {
  const scheme = useScheme();
  const t = colors[scheme];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: t.labelStrong }]}>연결된 기기가 없어요</Text>
      <Text style={[styles.desc, { color: t.labelAlt }]}>아직 서버·임베디드 연동 전이라 분류할 데이터가 없습니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 17, fontWeight: "700" },
  desc: { fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 2 },
});
