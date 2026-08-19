// 메인 화면 헤더의 햄버거 버튼을 누르면 오버레이로 뜨는 설정 패널의 내용물(B안 확정) — 별도
// 화면으로 이동하지 않고, 메인 화면 위에 오른쪽에서 화면 너비의 2/3쯤을 덮는 패널로 뜬다
// (오버레이 자체는 app/index.tsx가 감싼다). 예전에 설정 탭에 있던 내용(기기 등록·테마·알림·경보 해제) 전부와,
// 예전에 실시간 화면에 있던 "모듈 상태"(기기 번호·배터리·연결 상태·센서 점검)를 여기로 모았다.
//
// "센서 점검"만 2026-08-19부터 실제 API(GET /v1/devices/{mac}, useSensorCheck)로 붙었다 —
// 배터리·연결 상태는 아직 대응 엔드포인트가 없어서 MODULE_STATUS 목데이터 그대로다.
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useState } from "react";
import { useScheme } from "@/contexts/ThemeModeContext";
import { colors } from "@/constants/tokens";
import { useDevice } from "@/contexts/DeviceContext";
import { useAlarmRelease } from "@/hooks/useAlarmRelease";
import { useSensorCheck } from "@/hooks/useSensorCheck";
import { ThemeModeToggle } from "@/components/settings/ThemeModeToggle";
import { MODULE_STATUS } from "@/mocks/channels";

function SectionLabel({ label }: { label: string }) {
  const scheme = useScheme();
  const t = colors[scheme];
  return <Text style={[styles.section, { color: t.labelAlt }]}>{label}</Text>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const scheme = useScheme();
  const t = colors[scheme];
  return (
    <View style={[styles.row, { borderColor: t.lineWeak }]}>
      <Text style={[styles.rowLabel, { color: t.labelNormal }]}>{label}</Text>
      {children}
    </View>
  );
}

export function SettingsPanel() {
  const scheme = useScheme();
  const t = colors[scheme];
  const { pairedMac } = useDevice();
  const [autoPlugCut, setAutoPlugCut] = useState(true);
  const [notifyOnWatch, setNotifyOnWatch] = useState(true);
  const { releasing, error: releaseError, requestRelease } = useAlarmRelease();
  const { status: sensorStatus, loading: sensorLoading, error: sensorError } = useSensorCheck();

  const sensorCheckLabel = sensorLoading
    ? "확인 중…"
    : sensorError
      ? "확인 실패"
      : sensorStatus === "FAULT"
        ? "이상 감지됨"
        : sensorStatus === "OK"
          ? "이상 없음"
          : "관측 없음";
  const sensorCheckColor = sensorStatus === "FAULT" ? t.negative : t.labelNeutral;

  return (
    <View style={[styles.container, { backgroundColor: t.bgElev, borderColor: t.lineWeak }]}>
      <SectionLabel label="기기" />
      <Row label="등록된 기기">
        <Pressable onPress={() => router.push("/pairing")} style={styles.deviceValue}>
          <Text style={{ color: t.labelNeutral, fontSize: 13 }}>
            {pairedMac ?? "미등록"}
          </Text>
          <Text style={{ color: t.primary, fontSize: 13, fontWeight: "600" }}>변경</Text>
        </Pressable>
      </Row>
      <Row label="감지 모듈 배터리">
        <Text style={{ color: t.labelNeutral, fontSize: 13 }}>{MODULE_STATUS.battery}</Text>
      </Row>
      <Row label="연결 상태">
        <Text style={{ color: t.labelNeutral, fontSize: 13 }}>{MODULE_STATUS.connection}</Text>
      </Row>
      <Row label="센서 점검">
        <Text style={{ color: sensorCheckColor, fontSize: 13 }}>{sensorCheckLabel}</Text>
      </Row>

      <SectionLabel label="화면" />
      <Row label="화면 테마">
        <ThemeModeToggle />
      </Row>

      <SectionLabel label="알림·조치" />
      <Row label="스마트플러그 자동 차단">
        <Switch value={autoPlugCut} onValueChange={setAutoPlugCut} />
      </Row>
      <Row label="정비 필요 알림">
        <Switch value={notifyOnWatch} onValueChange={setNotifyOnWatch} />
      </Row>
      <Row label="경보 해제">
        <Pressable
          onPress={() => requestRelease()}
          disabled={releasing}
          style={[styles.releaseBtn, { backgroundColor: t.fillNormal }]}
        >
          {releasing ? (
            <ActivityIndicator size="small" color={t.labelStrong} />
          ) : (
            <Text style={{ color: t.labelStrong, fontSize: 13, fontWeight: "600" }}>요청</Text>
          )}
        </Pressable>
      </Row>
      {releaseError && (
        <Text style={{ color: t.negative, fontSize: 12, paddingHorizontal: 18, paddingBottom: 10 }}>
          {releaseError}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 18, marginTop: 10, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  section: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    columnGap: 14,
    rowGap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  // 라벨은 절대 두 줄로 안 접히게(flexShrink:0) — 옆의 값(테마 토글처럼 폭이 넓은 것)이
  // 자리가 부족하면 row가 flexWrap으로 값 쪽을 다음 줄로 내린다.
  rowLabel: { fontSize: 14, flexShrink: 0 },
  deviceValue: { flexDirection: "row", alignItems: "center", gap: 8 },
  releaseBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, minWidth: 56, alignItems: "center" },
});
