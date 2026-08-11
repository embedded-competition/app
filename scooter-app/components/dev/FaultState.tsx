// state === "FAULT"일 때 보여주는 화면. state === null(연결된 기기가 아예 없음, NoDataState)과는
// 다른 경우다 — 기기는 붙어 있지만 감지 모듈 자체가 고장/이상을 보고하는 상태. 가스 심각도
// 개념(정상/주의/경보)이 아니라서 게이지·리본·판단근거 같은 "분류된" 상태 화면 틀에 억지로
//끼워넣지 않고 별도 화면으로 뺐다(mocks/channels.ts의 ClassifiedState 참고).
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/tokens";
import { useScheme } from "@/contexts/ThemeModeContext";

export function FaultState() {
  const scheme = useScheme();
  const t = colors[scheme];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: t.labelStrong }]}>기기에 문제가 있어요</Text>
      <Text style={[styles.desc, { color: t.labelAlt }]}>
        감지 모듈이 정상적으로 응답하지 않고 있어요.{"\n"}
        점검이 필요할 수 있습니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 17, fontWeight: "700" },
  desc: { fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 2 },
});
