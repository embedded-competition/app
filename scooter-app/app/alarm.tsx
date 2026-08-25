// 경보 화면. planning/prototypes/b-live-monitor.html 화면 3(ALARM 데모) 레이아웃은 그대로
// 옮기되, 2026-08-24부터 내용은 실시간 데이터를 읽는다 — 예전엔 이 화면 전체가 프로토타입
// 원문 그대로 하드코딩돼 있어서, 실제 값이 정상으로 돌아온 뒤에도(또는 다른 채널이 원인이어도)
// 항상 "46초째 늘고 있음"·"평소의 24배"·"관리실 통보: 전송됨 09:41" 같은 고정 문구만 보여주는
// 버그가 있었다(경보가 한 번이라도 뜨면 그 뒤로 항상 같은 화면처럼 보임). "왜 울렸나"는
// conditions[]에 실제로 걸린 원인만 나열하고, "지금 단계"는 실제 stage를, 시간은 실제
// at(마지막 관측 시각)을 쓴다. "자동 조치"는 앱이 실행 여부를 확인할 방법이 없어서 확정적인
// 문구("차단됨"·특정 시각)를 지우고 정직하게 표현한다.
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/tokens";
import { useAlarmRelease } from "@/hooks/useAlarmRelease";
import { useAppState } from "@/contexts/AppStateContext";
import { useDevice } from "@/contexts/DeviceContext";
import { AlarmPulseOverlay } from "@/components/alarm/AlarmPulseOverlay";
import { CHANNELS, ADDRESS_MAIN, STEPPER_LABELS } from "@/mocks/channels";
import { CHANNEL_API_FIELD, channelKeyForCondition } from "@/constants/channelApiMap";
import { formatAgo } from "@/utils/time";
import type { Stage } from "@/types/telemetry";

function callPhone(number: string) {
  Linking.openURL(`tel:${number}`).catch(() => {});
}

const STAGE_INDEX: Record<Stage, number> = { NONE: 0, TEMP_RISE: 1, GAS_LEAK: 2, RAPID_WORSENING: 3, IGNITION: 4 };

export default function AlarmScreen() {
  const scheme = useScheme();
  const t = colors[scheme];
  const insets = useSafeAreaInsets();
  const { releasing, error: releaseError, requestRelease } = useAlarmRelease();
  const { managementPhone } = useDevice();
  const { state, channels, conditions, stage, at, latched } = useAppState();

  // "N초 전"은 화면을 계속 열어두는 동안에도 흘러가야 하니 1초마다 다시 그린다.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // 원인 채널 목록 — conditions[]에 실제로 걸린 것만. SENSOR_FAULT·UNKNOWN은 채널 매핑이
  // 없어서(channelKeyForCondition이 undefined) 이름 대신 원인 코드 자체를 보여준다.
  const causeRows = conditions.map((condition) => {
    const channelKey = channelKeyForCondition(condition);
    const channel = channelKey ? CHANNELS.find((c) => c.key === channelKey) : undefined;
    const apiField = channelKey ? CHANNEL_API_FIELD[channelKey] : undefined;
    const reading = apiField ? channels?.[apiField] : null;
    const valueText =
      reading && reading.value !== null
        ? `실측 ${reading.value.toFixed(1)}${reading.slope !== null ? ` · 분당 ${reading.slope >= 0 ? "+" : ""}${reading.slope.toFixed(1)}` : ""}`
        : "감지됨";
    return { label: channel?.name ?? condition, value: valueText };
  });

  const stageLabel = stage ? STEPPER_LABELS[STAGE_INDEX[stage]].replace("\n", " ") : "확인 중";
  const isStillAlarm = state === "ALARM";

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
        <Text style={styles.title}>{isStillAlarm ? "화재 발생 직전이에요" : "지금은 값이 가라앉았어요"}</Text>
        <Text style={styles.lead}>
          {isStillAlarm
            ? "배터리에서 이상 신호가 감지됐습니다."
            : "다만 경보는 사람이 확인할 때까지 자동으로 풀리지 않습니다(latch)."}
          {"\n"}
          <Text style={{ fontWeight: "700" }}>{isStillAlarm ? "즉시 대피하세요." : "안전이 확인되면 아래에서 해제 요청을 보내주세요."}</Text>
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>왜 울렸나</Text>
          {causeRows.length === 0 ? (
            <Row label="원인" value="정보 없음" />
          ) : (
            causeRows.map((row, i) => <Row key={i} label={row.label} value={row.value} />)
          )}
          <Row label="지금 단계" value={stageLabel} />
          <Row label="마지막 확인" value={formatAgo(at)} />
          <Row label="경보 유지(latch)" value={latched ? "예 — 해제 전까지 유지" : "아니오"} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>자동 조치</Text>
          <Text style={styles.cardNote}>
            앱에서는 서버·기기가 실제로 조치를 실행했는지 확인할 방법이 아직 없습니다 — 설정에서 켜둔 항목대로 서버가
            처리합니다.
          </Text>
          <Row label="위치" value={`${ADDRESS_MAIN} (등록 위치)`} />
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
  cardNote: { fontSize: 11, color: "#ffffffcc", lineHeight: 16, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  rowLabel: { fontSize: 12, color: "#fff" },
  rowValue: { fontSize: 12, fontWeight: "700", color: "#fff" },
  actions: { gap: 9, marginTop: 24 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "#ffffff8f" },
  btnText: { fontSize: 15, fontWeight: "700" },
  releaseError: { color: "#fff", fontSize: 12, textAlign: "center", marginTop: -2 },
  close: { color: "#ffffffb0", textAlign: "center", marginTop: 16, fontSize: 13 },
});
