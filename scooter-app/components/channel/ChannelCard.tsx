// 실시간 화면 채널 그리드 카드(원형 배지 = "ring"). 프로토타입 .gcard를 그대로 이식.
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { colors } from "@/constants/tokens";
import type { ChannelDef, ChannelStateContent, Level } from "@/mocks/channels";

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

export function ChannelCard({
  channel,
  content,
  onPress,
}: {
  channel: ChannelDef;
  content: ChannelStateContent;
  onPress: () => void;
}) {
  const scheme = useColorScheme() ?? "light";
  const t = colors[scheme];
  const tone = t[LEVEL_TONE[content.lv]];
  const acc = t[LEVEL_ACC[content.lv]];

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

      <View style={[styles.ring, { borderColor: tone }]}>
        <Text style={[styles.ringLabel, { color: acc }]}>{LEVEL_TEXT[content.lv]}</Text>
        <Text style={[styles.ringValue, { color: t.labelAlt }]} numberOfLines={1}>
          {content.val}
        </Text>
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
  ring: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    alignSelf: "center",
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ringLabel: { fontSize: 14, fontWeight: "700" },
  ringValue: { fontSize: 10.5, marginTop: 2, textAlign: "center", paddingHorizontal: 6 },
  rate: { fontSize: 10, textAlign: "center", marginTop: 9, fontWeight: "700" },
});
