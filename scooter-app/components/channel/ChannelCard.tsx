// 실시간 화면 채널 그리드 카드(원형 배지 = "ring"). 프로토타입 .gcard를 그대로 이식.
//
// liveReading은 실제 백엔드가 준 그 채널의 실측값(value·slope) — 있으면 링 아래에 같이
// 보여준다(2026-08-19, 실 데이터 확인용). content(val/speed 등)는 여전히 상태별 고정 문구다 —
// 서버가 문구를 안 주기 때문(interface.md §3.1) — liveReading은 그 문구를 뒷받침하는 실제
// 숫자를 옆에서 보여줄 뿐, 문구 자체를 대체하지 않는다.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { colors } from "@/constants/tokens";
import type { ChannelDef, ChannelStateContent, Level } from "@/mocks/channels";
import type { ChannelReading } from "@/types/telemetry";

const LEVEL_TEXT: Record<Level, string> = { ok: "정상", warn: "주의", bad: "위험" };
const LEVEL_TONE: Record<Level, "positive" | "cautionary" | "negative"> = {
  ok: "positive",
  warn: "cautionary",
  bad: "negative",
};
const LEVEL_ACC: Record<Level, "accGreen" | "accOrange" | "accRed"> = {
  ok: "accGreen",
  warn: "accOrange",
  bad: "accRed",
};

function formatReading(reading: ChannelReading | null | undefined): string | null {
  if (!reading || reading.value === null) return null;
  const slope = reading.slope;
  const slopeText = slope === null ? "" : ` · ${slope >= 0 ? "+" : ""}${slope.toFixed(1)}/분`;
  return `실측 ${reading.value.toFixed(1)}${slopeText}`;
}

export function ChannelCard({
  channel,
  content,
  liveReading,
  onPress,
}: {
  channel: ChannelDef;
  content: ChannelStateContent;
  /** 이 채널의 실제 백엔드 실측값 — 없으면(아직 폴링 전이거나 이 채널이 API에 없으면) 안 보여준다. */
  liveReading?: ChannelReading | null;
  onPress: () => void;
}) {
  const scheme = useScheme();
  const t = colors[scheme];
  const tone = t[LEVEL_TONE[content.lv]];
  const acc = t[LEVEL_ACC[content.lv]];
  const readingText = formatReading(liveReading);

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: t.bgElev, borderColor: t.lineNormal }]}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: t.labelStrong }]}>{channel.name}</Text>
            {channel.primary && (
              <View style={[styles.tag, { backgroundColor: `${t.primary}1f` }]}>
                <Text style={[styles.tagText, { color: t.primary }]}>주요</Text>
              </View>
            )}
          </View>
          <Text style={[styles.sub, { color: t.labelAssist }]}>{channel.alias}</Text>
        </View>
        <Text style={{ color: t.labelAssist, fontSize: 13 }}>›</Text>
      </View>

      <View style={styles.ringRow}>
        <View style={[styles.ring, { borderColor: tone }]}>
          <Text style={[styles.ringLabel, { color: acc }]}>{LEVEL_TEXT[content.lv]}</Text>
          <Text style={[styles.ringValue, { color: t.labelAlt }]} numberOfLines={1}>
            {content.val}
          </Text>
        </View>
        {readingText && (
          <Text style={[styles.reading, { color: t.labelAssist }]} numberOfLines={2}>
            {readingText}
          </Text>
        )}
      </View>

      <Text style={[styles.rate, { color: acc }]} numberOfLines={1}>
        {content.speed}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: "47%", flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 13 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  name: { fontSize: 13, fontWeight: "600" },
  tag: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 8.5, fontWeight: "700" },
  sub: { fontSize: 10, marginTop: 2 },
  ringRow: { alignItems: "center", marginTop: 12 },
  ring: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  ringLabel: { fontSize: 14, fontWeight: "700" },
  ringValue: { fontSize: 10.5, marginTop: 2, textAlign: "center", paddingHorizontal: 6 },
  reading: { fontSize: 9.5, marginTop: 5, textAlign: "center" },
  rate: { fontSize: 10, textAlign: "center", marginTop: 9, fontWeight: "700" },
});
