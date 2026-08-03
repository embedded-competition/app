// 실시간 화면 (U1 B안): 지도 → 상태 리본(문구·위험도 바·진행 단계) → 채널 카드 그리드 → 모듈 상태.
// planning/prototypes/b-live-monitor.html 화면 1을 그대로 옮긴 것 — 문구·수치는 mocks/channels.ts.
import { router } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { colors, type ColorTokens } from "@/constants/tokens";
import { useAppState } from "@/hooks/useAppState";
import { LiveBadge } from "@/components/badges/LiveBadge";
import { DevStateToggle } from "@/components/dev/DevStateToggle";
import { DeviceMap } from "@/components/map/DeviceMap";
import { StatusRibbon } from "@/components/ribbon/StatusRibbon";
import { ChannelCard } from "@/components/channel/ChannelCard";
import { ADDRESS_MAIN, CHANNELS, MODULE_STATUS, OWNER_NAME, STATE_CONTENT } from "@/mocks/channels";

export default function LiveScreen() {
  const scheme = useColorScheme() ?? "light";
  const t = colors[scheme];
  const insets = useSafeAreaInsets();
  const { state, setState } = useAppState();
  const content = STATE_CONTENT[state];

  // 지도의 locationTrackingMode="Follow"가 실제로 위치를 따라가려면 권한이 먼저 있어야 한다.
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: t.bgAlt }}>
      <View
        style={[
          styles.header,
          { backgroundColor: t.bgNormal, borderBottomColor: t.lineWeak, paddingTop: insets.top + 8 },
        ]}
      >
        <Text style={[styles.title, { color: t.labelStrong }]}>{OWNER_NAME}의 킥보드</Text>
        <LiveBadge />
      </View>

      {/* 서버 연동 전까지 상태를 직접 바꿔보기 위한 개발용 토글. 실 데이터 연동 후 제거. */}
      <DevStateToggle state={state} onChange={setState} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <DeviceMap level={content.pinLevel} addrMain={ADDRESS_MAIN} addrSub={content.addr2} />

        <View style={styles.padH}>
          <StatusRibbon content={content} />

          <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>
            센서 채널 <Text style={{ fontSize: 11, fontWeight: "500", color: t.labelAlt }}>{content.rateLabel}</Text>
          </Text>
          <Text style={[styles.sectionSub, { color: t.labelAlt }]}>
            탭하면 자세히 볼 수 있어요 · 양보다 얼마나 빠르게 변하는지를 봅니다
          </Text>

          <View style={styles.grid}>
            {CHANNELS.map((ch) => (
              <ChannelCard
                key={ch.key}
                channel={ch}
                content={ch.states[state]}
                onPress={() => router.push(`/detail/${ch.key}`)}
              />
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>모듈 상태</Text>
          <View style={[styles.table, { borderColor: t.lineWeak }]}>
            <Row label="기기 번호" value={MODULE_STATUS.nodeId} t={t} />
            <Row label="감지 모듈 배터리" value={MODULE_STATUS.battery} t={t} />
            <Row label="연결 상태" value={MODULE_STATUS.connection} t={t} />
            <Row label="센서 점검" value={state === "alarm" ? "이상 없음 · 경보 중" : "이상 없음"} t={t} last />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, t, last }: { label: string; value: string; t: ColorTokens; last?: boolean }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: t.lineWeak }]}>
      <Text style={{ color: t.labelNeutral, fontSize: 12.5 }}>{label}</Text>
      <Text style={{ color: t.labelNeutral, fontSize: 12.5 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: "600" },
  scroll: { paddingBottom: 24 },
  padH: { paddingHorizontal: 18 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginTop: 22, marginBottom: 3 },
  sectionSub: { fontSize: 11.5, marginBottom: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  table: { marginTop: 8, borderTopWidth: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
});
