// 항목 상세 화면. planning/prototypes/b-live-monitor.html 화면 2를 그대로 옮긴 것.
//
// 2026-08-24: 라이브 모드(판정·게이지·차트)는 더 이상 상태 단위 공통 템플릿이 아니라 **채널별로
// 실측값을 반영**한다 — 이 채널이 지금 conditions[]에 걸려있는지로 색·문구를 정하고, 최근 1분
// 차트는 telemetry/current를 폴링할 때마다(services/telemetrySource.ts, 5초 간격)
// hooks/useChannelHistory.ts가 로컬에 쌓은 실제 시계열을 그린다(서버가 이력 API를 따로 안 줘서
// 클라이언트에서 누적). 다만 게이지 퍼센트(gaugePct)는 서버가 임계값을 안 줘서(A1: 클라이언트가
// 임계값을 굴리면 안 됨) 정확한 비율을 계산할 수 없다 — 정상/주의/위험 3단 앵커(22/52/88%)에
// 그대로 매핑하는 근사치다. 판단근거(SignatureRow)·같은 모델 비교(CompareRow) 섹션은 대응
// API가 아예 없어서(목데이터로만 존재) 삭제했다 — 컴포넌트 파일 자체도 지웠다. temp·leak
// 채널은 telemetry/current에 대응 필드가 없어서(interface.md §3) 전부 목데이터로 남는다.
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
import {
  CHANNELS,
  CHANNEL_EXPLAIN,
  CHANNEL_FOOTNOTE,
  OWNER_NAME,
  STATE_CONTENT,
  type ClassifiedState,
  type Level,
} from "@/mocks/channels";
import { CHANNEL_API_FIELD, deriveChannelLevel } from "@/constants/channelApiMap";
import { useChannelHistory } from "@/hooks/useChannelHistory";
import { getPeriodSummary } from "@/mocks/period";
import { RichText } from "@/components/common/RichText";
import { ChannelGauge } from "@/components/channel/ChannelGauge";
import { TrendChart } from "@/components/chart/TrendChart";
// 실 백엔드(Orca Backend)는 raw 센서값(sraw/mv/baseline)을 아예 안 보낸다 — 정규화된 devZ/slope만
// 준다. "센서 원본 수치 보기" 접이식은 애초에 보여줄 실데이터가 없는 기능이라 잠시 꺼둔다.
// backend-requests.md·api-spec.md 참고. 완전히 지우지는 않음 — 나중에 devZ/slope 기반으로
// 다시 쓸 수도 있어서 컴포넌트 자체(components/channel/RawValuesDisclosure.tsx)는 남겨둔다.
// import { RawValuesDisclosure } from "@/components/channel/RawValuesDisclosure";
import { NoDataState } from "@/components/dev/NoDataState";
import { FaultState } from "@/components/dev/FaultState";
import { PeriodSegment } from "@/components/period/PeriodSegment";

const TONE_KEY = { ok: "positive", warn: "cautionary", bad: "negative" } as const;
const ACC_KEY = { ok: "accGreen", warn: "accOrange", bad: "accRed" } as const;
const LEVEL_TEXT = { ok: "정상", warn: "주의", bad: "위험" } as const;
const LEVEL_VERDICT_TEXT: Record<Level, string> = {
  ok: "평소와 같습니다",
  warn: "평소보다 빠르게 늘고 있습니다",
  bad: "위험 — 즉시 확인이 필요합니다",
};
const LEVEL_GAUGE_PCT: Record<Level, number> = { ok: 22, warn: 52, bad: 88 };

export default function ChannelDetailScreen() {
  const { channel: channelKey } = useLocalSearchParams<{ channel: string }>();
  const scheme = useScheme();
  const t = colors[scheme];
  const { state, isLive, channels, conditions } = useAppState();
  const { period } = usePeriod();

  const channel = CHANNELS.find((c) => c.key === channelKey) ?? CHANNELS[0];
  const periodSummary = period.kind === "live" ? null : getPeriodSummary(period.kind === "custom" ? "week" : period.kind);

  // 훅 규칙상 이른 return 전에 무조건 불러야 한다 — channel이 temp/leak이면 apiField가
  // undefined라 이 훅은 내부적으로 아무 것도 안 쌓고 빈 배열을 유지한다.
  const apiField = CHANNEL_API_FIELD[channel.key];
  const history = useChannelHistory(apiField);

  // 기간 조회는 라이브 연결 여부와 무관한 목데이터 미리보기라, "연결된 기기 없음" 게이트는
  // period가 "지금"일 때만 적용한다(메인 화면과 동일한 원칙).
  if (period.kind === "live" && state === null) {
    return (
      <>
        <Stack.Screen options={{ title: channel.name }} />
        <NoDataState />
      </>
    );
  }

  // FAULT(기기 고장)는 게이지·판단근거 같은 "지금 얼마나 심각한지" 틀에 안 맞아서(가스 심각도
  // 개념이 아님) 메인 화면과 마찬가지로 별도 화면으로 뺀다.
  if (period.kind === "live" && state === "FAULT") {
    return (
      <>
        <Stack.Screen options={{ title: channel.name }} />
        <FaultState />
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

          {/* 원본 수치 접이식 — 실서버가 raw 값을 안 줘서 잠시 꺼둠. 위 import 주석 참고.
          <RawValuesDisclosure
            rows={[
              { label: "이 기간 중 최고", hint: "그 기간 안에서 가장 높았던 값", value: periodChannel.val },
              { label: "변화 속도", hint: "그때 얼마나 빠르게 변했는지", value: periodChannel.speed },
              { label: "원본 지표", hint: "센서 원본값 기준 편차·속도", value: periodChannel.tech },
            ]}
          /> */}
        </ScrollView>
      </>
    );
  }

  // 라이브 모드(period.kind === "live") — 지금 상태 그대로. 위 두 게이트가 null/FAULT를
  // 이미 걸러냈으니 여기선 항상 ClassifiedState(NORMAL/WATCH/ALARM)다.
  const content = STATE_CONTENT[state as ClassifiedState];

  // "이 채널을 서버 판정 기준으로 분류할 수 있는가"(hasLiveClassification)와 "숫자 실측값이
  // 있는가"(hasNumericReading)는 다르다 — 물·누액(leak)은 value/slope 같은 숫자 채널이 없지만
  // conditions[]에 "WATER"로 뜨니까 그걸로 분류는 할 수 있다. 이 둘을 하나로 묶어서 apiField
  // 없는 채널은 통째로 "실측 데이터 없음"(=예전처럼 전체 상태색을 그대로 씀) 취급하던 게 버그였다
  // — leak이 늘 조건 체크를 건너뛰고 전체 state 색을 그대로 물려받았다(2026-08-24 수정).
  const hasLiveClassification = channels !== null;
  const hasNumericReading = hasLiveClassification && apiField !== undefined;
  const liveReading = hasNumericReading ? channels![apiField!] : null;
  const channelLevel: Level = hasLiveClassification
    ? (deriveChannelLevel(channel.key, state as ClassifiedState, conditions, true) ?? "ok")
    : content.verdictLevel;

  const tone = t[TONE_KEY[channelLevel]];
  const acc = t[ACC_KEY[channelLevel]];

  const channelVerdictText = hasLiveClassification ? LEVEL_VERDICT_TEXT[channelLevel] : content.verdict;
  const channelLevelSentence =
    channelLevel === "ok" ? "특별히 하실 일은 없습니다." : channelLevel === "warn" ? "계속 지켜보고 있어요." : "즉시 확인이 필요합니다.";
  const channelEasyText = !hasLiveClassification
    ? content.easy
    : liveReading && liveReading.value !== null
      ? `${channel.name} 값이 지금 ${liveReading.value.toFixed(1)}${
          liveReading.slope !== null ? `, 분당 ${liveReading.slope >= 0 ? "+" : ""}${liveReading.slope.toFixed(1)}씩` : ""
        } 움직이고 있습니다. ${channelLevelSentence}`
      : hasNumericReading
        ? "아직 이 채널의 값을 받지 못했습니다."
        : `${channel.name}이(가) 지금 ${channelLevel === "ok" ? "평소와 같습니다." : "감지됐습니다."} ${channelLevelSentence}`;
  const gaugePct = hasLiveClassification ? LEVEL_GAUGE_PCT[channelLevel] : content.gaugePct;
  const pillTitle = hasLiveClassification ? LEVEL_TEXT[channelLevel] : content.pillT;
  const pillValue =
    hasNumericReading && liveReading && liveReading.value !== null ? `실측 ${liveReading.value.toFixed(1)}` : content.pillV;

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
            <Text style={{ color: acc, fontSize: 12.5, fontWeight: "600" }}>{channelVerdictText}</Text>
          </View>
        </View>

        <View style={[styles.easy, { backgroundColor: t.fillAlt }]}>
          <RichText text={channelEasyText} style={{ color: t.labelNormal, fontSize: 13, lineHeight: 21 }} />
        </View>

        <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>이게 무슨 신호인가요</Text>
        <RichText text={CHANNEL_EXPLAIN[channel.key]} style={{ color: t.labelNeutral, fontSize: 12.5, lineHeight: 22 }} />

        <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>지금 얼마나 새고 있나요</Text>
        <ChannelGauge pct={gaugePct} level={channelLevel} pillTitle={pillTitle} pillValue={pillValue} />
        <Text style={[styles.hint, { color: t.labelAlt }]}>
          {hasLiveClassification
            ? "이 게이지는 서버가 판정한 정상/주의/위험 단계를 3등분해서 보여줍니다(정확한 임계값은 서버만 압니다)."
            : "양 자체보다 얼마나 빠르게 늘어나는지로 판단합니다."}
        </Text>

        <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>최근 1분 동안</Text>
        {hasNumericReading ? (
          history.length >= 2 ? (
            <>
              <TrendChart series={history} tone={tone} baselineValue={history[0]} legendLabels={["실측값", "1분 전 값"]} />
              <Text style={[styles.hint, { color: t.labelAlt }]}>
                5초마다 서버에서 받은 실제 값을 이어서 그렸습니다. 점선은 1분 전 값입니다.
              </Text>
            </>
          ) : (
            <View style={[styles.collecting, { backgroundColor: t.fillAlt }]}>
              <Text style={{ color: t.labelAlt, fontSize: 12 }}>실시간 데이터를 모으고 있어요… (5초마다 갱신)</Text>
            </View>
          )
        ) : (
          <>
            <TrendChart series={content.line} tone={tone} />
            <Text style={[styles.hint, { color: t.labelAlt }]}>
              점선은 이 킥보드가 평소에 머무는 자리입니다. 파란 선이{" "}
              <Text style={{ fontWeight: "700" }}>점선에서 크게 벌어질수록</Text> 이상 신호입니다.
            </Text>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: t.labelStrong }]}>기간 조회</Text>
        <PeriodSegment variant="detail" />

        {/* 원본 수치 접이식 — 실서버가 raw 값을 안 줘서 잠시 꺼둠. 위 import 주석 참고.
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
        /> */}

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
  collecting: { borderRadius: 14, padding: 16, marginTop: 10, alignItems: "center" },
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
