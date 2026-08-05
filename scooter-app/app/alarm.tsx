// 경보 화면. planning/prototypes/b-live-monitor.html 화면 3(ALARM 데모)을 그대로 옮긴 것.
// 해제는 A7(latch, 자동 해제 없음) — 앱은 "해제 요청"만 보내고, 승인 여부(권한 판단)는
// 서버가 내부에서 결정한다(O8 확정). 서버가 아직 없어서 지금은 항상 실패로 온다(정직한 스텁).
import { router } from "expo-router";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/tokens";
import { useAlarmRelease } from "@/hooks/useAlarmRelease";
import { useDevice } from "@/contexts/DeviceContext";
import { AlarmPulseOverlay } from "@/components/alarm/AlarmPulseOverlay";

function callPhone(number: string) {
  Linking.openURL(`tel:${number}`).catch(() => {});
}

export default function AlarmScreen() {
  const scheme = useScheme();
  const t = colors[scheme];
  const insets = useSafeAreaInsets();
  const { releasing, error: releaseError, requestRelease } = useAlarmRelease();
  const { managementPhone } = useDevice();

  return (
    <View style={[styles.container, { backgroundColor: t.negative }]}>
      <AlarmPulseOverlay level="ALARM" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Text style={styles.siren}>🔥</Text>
        <Text style={styles.title}>화재 발생 직전이에요</Text>
        <Text style={styles.lead}>
          배터리에서 가스가 새고 있고,{"\n"}46초째 계속 늘고 있습니다.{"\n"}
          불이 붙을 때 나오는 가스도 함께 나왔습니다.{"\n"}
          <Text style={{ fontWeight: "700" }}>즉시 대피하세요.</Text>
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>왜 울렸나</Text>
          <Row label="배터리 가스" value="평소의 24배 속도" />
          <Row label="타는 가스" value="나오는 중" />
          <Row label="이어진 시간" value="46초" />
          <Row label="지금 단계" value="불이 붙기 시작" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>자동 조치</Text>
          <Row label="스마트플러그 전원" value="차단됨" />
          <Row label="관리실 통보" value="전송됨 09:41" />
          <Row label="위치" value="지하주차장 B-14" />
          <View style={styles.doneChip}>
            <Text style={styles.doneChipText}>✓ 사람 개입 없이 1차 차단 완료</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.btn, { backgroundColor: "#fff" }]} onPress={() => callPhone("119")}>
            <Text style={[styles.btnText, { color: t.accRed }]}>119 신고하기</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.outline]}
            onPress={() => managementPhone && callPhone(managementPhone)}
            disabled={!managementPhone}
          >
            <Text style={[styles.btnText, { color: managementPhone ? "#fff" : "#ffffffb0" }]}>
              {managementPhone ? "관리실 전화" : "관리실 번호 없음"}
            </Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.outline]} onPress={() => requestRelease()} disabled={releasing}>
            {releasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.btnText, { color: "#fff" }]}>경보 해제 요청</Text>
            )}
          </Pressable>
          {releaseError && <Text style={styles.releaseError}>{releaseError}</Text>}
        </View>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>닫기</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  siren: { fontSize: 44, textAlign: "center" },
  title: { fontSize: 27, fontWeight: "800", textAlign: "center", color: "#fff", marginTop: 14, letterSpacing: -0.3 },
  lead: { fontSize: 13, textAlign: "center", color: "#ffffffeb", marginTop: 10, lineHeight: 21 },
  card: { backgroundColor: "#ffffff1f", borderRadius: 16, padding: 14, marginTop: 18 },
  cardTitle: { fontSize: 11, fontWeight: "700", color: "#ffffffcc", letterSpacing: 0.6, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  rowLabel: { fontSize: 12, color: "#fff" },
  rowValue: { fontSize: 12, fontWeight: "700", color: "#fff" },
  doneChip: { alignSelf: "flex-start", backgroundColor: "#ffffff2e", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, marginTop: 12 },
  doneChipText: { fontSize: 11, fontWeight: "600", color: "#fff" },
  actions: { gap: 9, marginTop: 24 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "#ffffff8f" },
  btnText: { fontSize: 15, fontWeight: "700" },
  releaseError: { color: "#fff", fontSize: 12, textAlign: "center", marginTop: -2 },
  close: { color: "#ffffffb0", textAlign: "center", marginTop: 16, fontSize: 13 },
});
