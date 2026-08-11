// 항목 상세 화면. planning/prototypes/b-live-monitor.html 화면 2를 그대로 옮긴 것.
// 게이지·차트·판단근거·비교는 상태 단위(STATE_CONTENT) 공통 템플릿이고, 채널마다 다른 건
// 이름·설명·각주뿐이다 — 프로토타입도 배터리 가스(voc) 채널 하나만 실제로 디자인했기 때문에 그 구조를 그대로 따른다.
//
// 기간 조회 중(period !== "live")일 땐 이 라이브 화면을 그대로 보여주지 않는다 — 게이지·판단근거·
// 비교는 전부 "지금" 개념이라 기간과 섞으면 뭘 보고 있는지 헷갈린다(B안 확정). 대신
// planning/prototypes/e-single-tab-period-detail-B.html 화면 3 그대로 기간 전용 화면을 보여준다:
// 판정(그 기간 중 최고 수준) → 요약 → 기간 세그먼트 → 연속 차트 → 이 기간의 기록 → 원본 수치.
import { Stack, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { colors } from "@/constants/tokens";
import { useAppState } from "@/contexts/AppStateContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { CHANNELS, CHANNEL_EXPLAIN, CHANNEL_FOOTNOTE, OWNER_NAME, STATE_CONTENT, type AppState } from "@/mocks/channels";
import { getPeriodSummary } from "@/mocks/period";
import { RichText } from "@/components/common/RichText";
import { ChannelGauge } from "@/components/channel/ChannelGauge";
import { TrendChart } from "@/components/chart/TrendChart";
import { SignatureRow } from "@/components/detail/SignatureRow";
import { CompareRow } from "@/components/detail/CompareRow";
import { RawValuesDisclosure } from "@/components/channel/RawValuesDisclosure";
import { NoDataState } from "@/components/dev/NoDataState";
import { PeriodSegment } from "@/components/period/PeriodSegment";

const TONE_KEY = { ok: "positive", warn: "cautionary", bad: "negative" } as const;
const ACC_KEY = { ok: "accGreen", warn: "accOrange", bad: "accRed" } as const;
const LEVEL_TEXT = { ok: "정상", warn: "주의", bad: "위험" } as const;

export default function ChannelDetailScreen() {
  const { channel: channelKey } = useLocalSearchParams<{ channel: string }>();
  const scheme = useScheme();
  const t = colors[scheme];
  const { state, isLive, setDevState } = useAppState();
  const { period } = usePeriod();

  const channel = CHANNELS.find((c) => c.key === channelKey) ?? CHANNELS[0];
  const periodSummary = period.kind === "live" ? null : getPeriodSummary(period.kind === "custom" ? "week" : period.kind);

  // 기간 조회는 라이브 연결 여부와 무관한 목데이터 미리보기라, "연결된 기기 없음" 게이트는
  // period가 "지금"일 때만 적용한다(메인 화면과 동일한 원칙).
  if (period.kind === "live" && state === null) {
    return (
      <>
        <Stack.Screen options={{ title: channel.name }} />
        <NoDataState onPreview={setDevState} />
      </>
    );
  }

  if (periodSummary) {
    const periodChannel = periodSummary.channels[channel.key];
    const tone = t[TONE_KEY[periodChannel.lv]];
    const acc = t[ACC_KEY[periodChannel.lv]];
    const isPeakChannel = channel.key === periodSummary.peakChannelKey && periodChannel.lv !== "ok";

    return (
      <>
        <Stack.Screen options={{ title: channel.name }} />
        <ScrollView style={{ backgroundColor: t.bgAlt }} contentContainerStyle={styles.content}>
          <View style={styles.head}>
            <Text style={[styles.question, { color: t.labelStrong }]}>
              {periodSummary.rangeLabel} 동안{"\n"}
              {channel.name} 상태입니다.
            </Text>
            <View style={styles.verdictRow}>
              <View style={[styles.dot, { backgroundColor: tone }]} />
              <Text style={{ color: acc, fontSize: 12.5, fontWeight: "600" }}>
                {isPeakChannel ? `이 기간 중 ${LEVEL_TEXT[periodChannel.lv]} 단계까지 올라간 적이 있어요` : "이 기간 동안 평소와 같았습니다"}
              </Text>
            </View>
          </View>

          <PeriodSegment variant="detail" />
          <Text style={[styles.rangeLabel, { color: t.labelAlt }]}>{periodSummary.rangeLabel}</Text>

          <View style={[styles.easy, { backgroundColor: t.fillAlt }]}>
            <Text style={{ color: t.labelNormal, fontSize: 13, lineHeight: 21 }}>
              {isPeakChannel
                ? `이 기간 동안 ${channel.name}에서 최대 ${periodChannel.val} 늘어난 적이 있어요. ${periodSummary.ribbon.sub}`
                : `이 기간 동안 ${channel.name} 값은 평소와 같았습니다. 특별히 하실 일은 없습니다.`}
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>{periodSummary.rangeLabel} 동안</Text>
          <TrendChart
            series={periodSummary.series}
            tone={tone}
            xLabels={periodSummary.seriesLabels}
            baselineValue={periodSummary.baseline}
            legendLabels={["날짜별 최고치 추이", "이 킥보드의 평소 수준"]}
          />
          <Text style={[styles.hint, { color: t.labelAlt }]}>날짜별로 그때 가장 높았던 값을 이어서 그렸습니다.</Text>

          <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>이 기간의 기록</Text>
          {periodSummary.events.length === 0 ? (
            <Text style={{ color: t.labelAssist, fontSize: 12 }}>이 기간엔 기록이 없어요.</Text>
          ) : (
            periodSummary.events.map((e, i) => (
              <View
                key={i}
                style={[
                  styles.recordRow,
                  i < periodSummary.events.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.lineWeak },
                ]}
              >
                <Text style={{ color: t.labelNormal, fontSize: 12, flex: 1 }}>{e.description}</Text>
                <Text style={{ color: t.labelAssist, fontSize: 11 }}>{e.time}</Text>
              </View>
            ))
          )}

          <View style={[styles.syncNote, { backgroundColor: t.fillAlt }]}>
            <Text style={{ color: t.labelAlt, fontSize: 11 }}>
              🔗 이 기간이 메인 화면에도 함께 표시돼요 — 뒤로 가면 같은 기간으로 보입니다.
            </Text>
          </View>

          <RawValuesDisclosure
            rows={[
              { label: "이 기간 중 최고", hint: "그 기간 안에서 가장 높았던 값", value: periodChannel.val },
              { label: "변화 속도", hint: "그때 얼마나 빠르게 변했는지", value: periodChannel.speed },
              { label: "원본 지표", hint: "센서 원본값 기준 편차·속도", value: periodChannel.tech },
            ]}
          />
        </ScrollView>
      </>
    );
  }

  // 라이브 모드(period.kind === "live") — 지금 상태 그대로.
  const content = STATE_CONTENT[state as AppState];
  const tone = t[TONE_KEY[content.verdictLevel]];
  const acc = t[ACC_KEY[content.verdictLevel]];

  return (
    <>
      <Stack.Screen options={{ title: channel.name }} />
      <ScrollView style={{ backgroundColor: t.bgAlt }} contentContainerStyle={styles.content}>
        {!isLive && (
          <View style={[styles.mockNotice, { backgroundColor: t.fillNormal }]}>
            <Text style={{ color: t.labelAlt, fontSize: 11, fontWeight: "600" }}>
              목데이터 · 실시간 연결 없음
            </Text>
          </View>
        )}

        <View style={styles.head}>
          <Text style={[styles.question, { color: t.labelStrong }]}>
            {OWNER_NAME} 킥보드의{"\n"}
            {channel.name} 상태입니다.
          </Text>
          <View style={styles.verdictRow}>
            <View style={[styles.dot, { backgroundColor: tone }]} />
            <Text style={{ color: acc, fontSize: 12.5, fontWeight: "600" }}>{content.verdict}</Text>
          </View>
        </View>

        <View style={[styles.easy, { backgroundColor: t.fillAlt }]}>
          <RichText text={content.easy} style={{ color: t.labelNormal, fontSize: 13, lineHeight: 21 }} />
        </View>

        <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>이게 무슨 신호인가요</Text>
        <RichText text={CHANNEL_EXPLAIN[channel.key]} style={{ color: t.labelNeutral, fontSize: 12.5, lineHeight: 22 }} />

        <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>지금 얼마나 새고 있나요</Text>
        <ChannelGauge pct={content.gaugePct} level={content.verdictLevel} pillTitle={content.pillT} pillValue={content.pillV} />
        <Text style={[styles.hint, { color: t.labelAlt }]}>
          양 자체보다 <Text style={{ fontWeight: "700" }}>얼마나 빠르게 늘어나는지</Text>로 판단합니다.
        </Text>

        <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>최근 1분 동안</Text>
        <TrendChart series={content.line} tone={tone} />
        <Text style={[styles.hint, { color: t.labelAlt }]}>
          점선은 이 킥보드가 평소에 머무는 자리입니다. 파란 선이{" "}
          <Text style={{ fontWeight: "700" }}>점선에서 크게 벌어질수록</Text> 이상 신호입니다.
        </Text>

        <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>기간 조회</Text>
        <PeriodSegment variant="detail" />

        <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>경보는 이렇게 판단합니다</Text>
        <Text style={[styles.sectionSub, { color: t.labelAlt }]}>
          세 가지가 모두 맞아야 울립니다 — 냄새 한 번 났다고 울리지 않습니다
        </Text>
        <SignatureRow sig={content.sig} sigOn={content.sigOn} />
        <Text style={[styles.hint, { color: t.labelAlt }]}>{content.sigHint}</Text>

        <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>같은 모델과 비교</Text>
        <CompareRow avg={content.avg} mine={content.mine} mineColor={acc} />
        <RichText text={content.cmp} style={{ color: t.labelNeutral, fontSize: 12, marginTop: 10, lineHeight: 20 }} />

        <RawValuesDisclosure
          rows={[
            { label: "센서 원본값", hint: "가스가 많을수록 낮아지는 값입니다", value: content.raw },
            { label: "이 킥보드의 평소 값", hint: "30분에 걸쳐 천천히 따라갑니다", value: content.base },
            { label: "평소와 벌어진 정도", hint: "평소 흔들림의 몇 배만큼 벗어났는지", value: content.dev },
            { label: "늘어나는 속도", hint: "1분에 평소 흔들림의 몇 배씩 오르는지", value: content.slope },
            { label: "이어진 시간", hint: "이 상태가 유지된 시간", value: content.hold },
            { label: "습도 확인", hint: "비·세차 때문인지 걸러냅니다", value: content.rh },
            { label: "평소 값 갱신", hint: "경보 중에는 갱신을 멈춥니다", value: content.freeze },
          ]}
        />

        <Pressable style={[styles.cta, { backgroundColor: content.danger ? t.negative : t.primary }]}>
          <Text style={styles.ctaText}>{content.cta}</Text>
        </Pressable>

        <Text style={[styles.footnote, { color: t.labelAssist, borderTopColor: t.lineWeak }]}>
          {CHANNEL_FOOTNOTE[channel.key]}
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingTop: 10, paddingBottom: 32 },
  mockNotice: { alignSelf: "center", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 4 },
  head: { alignItems: "center", paddingVertical: 8 },
  question: { fontSize: 16, fontWeight: "600", textAlign: "center", lineHeight: 24 },
  verdictRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  easy: { borderRadius: 14, padding: 14, marginTop: 14 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginTop: 22, marginBottom: 3 },
  sectionSub: { fontSize: 11.5, marginBottom: 4 },
  hint: { fontSize: 11, marginTop: 8, lineHeight: 17 },
  rangeLabel: { fontSize: 11.5, marginTop: 8 },
  recordRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, paddingVertical: 10 },
  syncNote: { borderRadius: 12, padding: 12, marginTop: 14 },
  cta: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  ctaText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  footnote: { fontSize: 10.5, lineHeight: 17, marginTop: 16, paddingTop: 14, borderTopWidth: 1 },
});
