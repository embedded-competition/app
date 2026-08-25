// 메인 화면 (B안 최종): 하단 탭 없이 이 화면 하나가 앱의 홈이다. 예전엔 실시간/기록/통계/설정
// 4탭이었는데, 기록·통계는 이 화면(기록은 아코디언)과 상세보기(기간 조회)로 흡수되고, 설정은
// 헤더 햄버거를 누르면 뜨는 오버레이 패널이 됐다 — 페이지 이동도 아니고, 메인 화면을 밀어내지도
// 않는다. 메인 화면은 뒤에 그대로 있고 오른쪽에서 화면 너비의 2/3쯤을 덮는 패널이 뜬다(왼쪽
// 1/3은 메인 화면이 비치는 배경).
//
// 순서: 헤더(제목+LiveBadge+햄버거) → 지도 → 리본 → 기간 세그먼트 → 채널 그리드 → 기록.
// state가 null(연결된 기기 없음)이면 절대 "정상"으로 보여주지 않는다 — 단, 이건 period가
// "지금"일 때만 적용된다. 기간 조회(오늘/최근 7일/기간선택)는 라이브 연결 여부와 무관한
// 목데이터라 상태가 null이어도 늘 보여준다.
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { colors } from "@/constants/tokens";
import { useAppState } from "@/contexts/AppStateContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { LiveBadge } from "@/components/badges/LiveBadge";
import { NoDataState } from "@/components/dev/NoDataState";
import { FaultState } from "@/components/dev/FaultState";
import { DeviceMap } from "@/components/map/DeviceMap";
import { StatusRibbon } from "@/components/ribbon/StatusRibbon";
import { ChannelCard } from "@/components/channel/ChannelCard";
import { PeriodSegment } from "@/components/period/PeriodSegment";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { RecordAccordion, type RecordItem } from "@/components/record/RecordAccordion";
import { ADDRESS_MAIN, CHANNELS, STATE_CONTENT, type ChannelStateContent, type ClassifiedState } from "@/mocks/channels";
import type { ChannelReading } from "@/types/telemetry";
import { CHANNEL_API_FIELD, deriveChannelLevel } from "@/constants/channelApiMap";
import { getPeriodSummary } from "@/mocks/period";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useEvents } from "@/hooks/useEvents";
import { formatAgo } from "@/utils/time";

function formatEventTime(iso: string) {
  const d = new Date(iso);
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday ? `오늘 ${hm}` : `${d.getMonth() + 1}월 ${d.getDate()}일 ${hm}`;
}

export default function MainScreen() {
  const scheme = useScheme();
  const t = colors[scheme];
  const insets = useSafeAreaInsets();
  const { state, isLive, channels, conditions, at } = useAppState();
  const { period, setPeriod } = usePeriod();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { items: liveEvents, truncated: liveEventsTruncated, loading: eventsLoading } = useEvents();

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().catch(() => {});
  }, []);

  usePushNotifications();

  const header = (
    <View
      style={[styles.header, { backgroundColor: t.bgNormal, borderBottomColor: t.lineWeak, paddingTop: insets.top + 8 }]}
    >
      <Text style={[styles.title, { color: t.labelStrong }]}>내 킥보드</Text>
      <View style={styles.headerRight}>
        <LiveBadge status={isLive ? "live" : "offline"} />
        <Pressable onPress={() => setSettingsOpen(true)} hitSlop={8}>
          <Text style={{ color: t.labelStrong, fontSize: 20 }}>☰</Text>
        </Pressable>
      </View>
    </View>
  );

  // 햄버거를 누르면 메인 화면을 밀어내지 않고, 그 위에 오른쪽에서 화면 너비의 2/3쯤을 덮는
  // 패널이 뜬다(왼쪽 1/3은 메인 화면이 흐릿하게 비치는 배경) — 페이지 이동도 아니고 레이아웃을
  // 밀지도 않는다. 패널은 위아래로는 화면 전체 높이를 그대로 쓴다.
  const settingsOverlay = (
    <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
      <View style={styles.overlayRow}>
        <Pressable style={styles.backdrop} onPress={() => setSettingsOpen(false)} />
        <Pressable
          style={[styles.sheet, { backgroundColor: t.bgAlt, paddingTop: insets.top + 12 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView>
            <SettingsPanel />
          </ScrollView>
        </Pressable>
      </View>
    </Modal>
  );

  if (period.kind === "live" && state === null) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bgAlt }}>
        {header}
        {settingsOverlay}
        <NoDataState />
      </View>
    );
  }

  // FAULT(기기 고장)는 가스 심각도 개념이 아니라서 리본·게이지·채널 그리드 틀에 안 맞는다 —
  // state===null과 마찬가지로 별도 화면으로 뺀다.
  if (period.kind === "live" && state === "FAULT") {
    return (
      <View style={{ flex: 1, backgroundColor: t.bgAlt }}>
        {header}
        {settingsOverlay}
        <FaultState />
      </View>
    );
  }

  const isLivePeriod = period.kind === "live";
  const periodSummary = isLivePeriod ? null : getPeriodSummary(period.kind === "custom" ? "week" : period.kind);
  const liveState = state as ClassifiedState; // 위 두 게이트가 null/FAULT를 이미 걸러냈음을 보장함

  // 채널 카드는 채널마다 다른 상태를 보여줘야 한다 — 예전엔 전체 state만 보고 6채널이
  // 전부 똑같이 물들었다(voc만 올랐는데 h2·물누액까지 주의/위험으로 보이던 버그, 2026-08-24
  // 수정). conditions[]에 이 채널이 안 걸려있으면 그 채널은 NORMAL 버킷을 쓴다.
  //
  // "채널마다 다른 상태를 낼 수 있는가"는 apiField(숫자 실측값)가 있는지와는 별개다 — 물·누액
  // (leak)은 value/slope 같은 숫자 채널이 없지만 conditions[]에 "WATER"로 뜨니까 그걸로
  // 판정할 수 있다. apiField 유무로 이 판단 자체를 걸렀던 게 버그였다(leak이 실측 데이터 없다는
  // 이유로 조건 체크를 건너뛰고 전체 상태색을 그대로 썼음) — channels!==null(폴링 한 번이라도
  // 됐는지)만 보고 판정하도록 고쳤다.
  function channelCardContent(ch: (typeof CHANNELS)[number]): ChannelStateContent {
    if (!isLivePeriod) return periodSummary!.channels[ch.key];
    if (channels === null) return ch.states[liveState];
    const level = deriveChannelLevel(ch.key, liveState, conditions, true);
    return ch.states[level === "ok" ? "NORMAL" : liveState];
  }

  const ribbonContent = isLivePeriod ? STATE_CONTENT[liveState] : periodSummary!.ribbon;
  const pinLevel = isLivePeriod ? STATE_CONTENT[liveState].pinLevel : periodSummary!.channels[periodSummary!.peakChannelKey].lv;
  // 예전엔 "충전 중 · 마지막 수신 42초 전"이 고정 문구였다 — "충전 중"은 뒷받침할 API가 없어서
  // 뺐고, "마지막 수신"은 실제 at(관측 시각)으로 계산한다(2026-08-24).
  const addrSub = isLivePeriod ? `마지막 수신 ${formatAgo(at)}` : `${periodSummary!.rangeLabel} · 실시간 아님`;
  const rateLabel = isLivePeriod ? STATE_CONTENT[liveState].rateLabel : "· 이 기간 중 최고치";
  const sectionSub = isLivePeriod
    ? "탭하면 자세히 볼 수 있어요 · 양보다 얼마나 빠르게 변하는지를 봅니다"
    : "탭하면 채널별로 자세히 볼 수 있어요";

  const recordSummary = isLivePeriod
    ? eventsLoading
      ? "불러오는 중…"
      : `최근 30일 · 기록 ${liveEvents.length}건${liveEventsTruncated ? "+" : ""}`
    : `${periodSummary!.rangeLabel} · 기록 ${periodSummary!.events.length}건`;
  const recordItems: RecordItem[] = isLivePeriod
    ? liveEvents.map((e) => ({ id: String(e.id), time: formatEventTime(e.timestamp), description: e.description }))
    : periodSummary!.events.map((e, i) => ({ id: String(i), time: e.time, description: e.description }));

  return (
    <View style={{ flex: 1, backgroundColor: t.bgAlt }}>
      {header}
      {settingsOverlay}

      {!isLivePeriod && (
        <View style={[styles.periodBanner, { backgroundColor: `${t.primary}14`, borderColor: `${t.primary}38` }]}>
          <Text style={{ color: t.labelNeutral, fontSize: 12, flex: 1 }}>
            <Text style={{ color: t.primary, fontWeight: "700" }}>{periodSummary!.rangeLabel}</Text> 데이터 보는 중 ·
            실시간 아님
          </Text>
          <Pressable onPress={() => setPeriod({ kind: "live" })} hitSlop={6}>
            <Text style={{ color: t.primary, fontSize: 12, fontWeight: "700" }}>지금으로</Text>
          </Pressable>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <DeviceMap level={pinLevel} addrMain={ADDRESS_MAIN} addrSub={addrSub} />

        <View style={styles.padH}>
          <StatusRibbon
            content={ribbonContent}
            onReportPress={() => {
              if (ribbonContent.danger) router.push("/alarm");
            }}
          />

          <PeriodSegment variant="main" />
          {!isLivePeriod && (
            <Text style={[styles.rangeLabel, { color: t.labelAlt }]}>{periodSummary!.rangeLabel}</Text>
          )}

          <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>
            센서 채널 <Text style={{ fontSize: 11, fontWeight: "500", color: t.labelAlt }}>{rateLabel}</Text>
          </Text>
          <Text style={[styles.sectionSub, { color: t.labelAlt }]}>{sectionSub}</Text>

          <View style={styles.grid}>
            {CHANNELS.map((ch) => (
              <ChannelCard
                key={ch.key}
                channel={ch}
                content={channelCardContent(ch)}
                liveReading={
                  isLivePeriod && channels
                    ? ((CHANNEL_API_FIELD[ch.key] && channels[CHANNEL_API_FIELD[ch.key]!]) as ChannelReading | null)
                    : null
                }
                onPress={() => router.push(`/detail/${ch.key}`)}
              />
            ))}
            {/* 채널 수가 홀수면(온도 삭제 후 5개) 마지막 카드가 flexGrow로 한 줄을 다 차지해서
                두 칸짜리처럼 보인다 — 안 보이는 자리채움으로 오른쪽을 비워둔다. */}
            {CHANNELS.length % 2 === 1 && <View style={styles.gridSpacer} />}
          </View>

          <RecordAccordion summary={recordSummary} items={recordItems} />
        </View>
      </ScrollView>
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  title: { fontSize: 17, fontWeight: "600" },
  overlayRow: { flex: 1, flexDirection: "row" },
  backdrop: { flex: 1, backgroundColor: "#00000066" },
  // 처음엔 2/3(66%)로 했더니 설정 패널 안 글씨(예: "화면 테마")가 좁아서 두 줄로 밀렸다 —
  // 폭을 좀 더 넓혀서 라벨·값이 한 줄에 들어가게 했다.
  sheet: { width: "80%" },
  periodBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scroll: { paddingBottom: 24 },
  padH: { paddingHorizontal: 18 },
  rangeLabel: { fontSize: 11.5, marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginTop: 22, marginBottom: 3 },
  sectionSub: { fontSize: 11.5, marginBottom: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  gridSpacer: { flexBasis: "47%", flexGrow: 1 },
});
