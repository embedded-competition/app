// 설정 화면 (O5 데이터 매핑): 기기 등록, 알림 대상·강도, 플러그 자동차단, 경보 해제 요청(O8).
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useScheme } from "@/contexts/ThemeModeContext";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/tokens";
import { useDevice } from "@/contexts/DeviceContext";
import { isDevBypassMac } from "@/services/deviceRegistry";
import { useAlarmRelease } from "@/hooks/useAlarmRelease";
import { ThemeModeToggle } from "@/components/settings/ThemeModeToggle";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const scheme = useScheme();
  const t = colors[scheme];
  return (
    <View style={[styles.row, { borderColor: t.lineWeak }]}>
      <Text style={{ color: t.labelNormal, fontSize: 15 }}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const scheme = useScheme();
  const t = colors[scheme];
  const insets = useSafeAreaInsets();
  const { pairedMac } = useDevice();
  const [autoPlugCut, setAutoPlugCut] = useState(true);
  const [notifyOnWatch, setNotifyOnWatch] = useState(true);
  const { releasing, error: releaseError, requestRelease } = useAlarmRelease();

  return (
    <View style={[styles.container, { backgroundColor: t.bgAlt, paddingTop: insets.top + 16 }]}>
      <Row label="등록된 기기">
        <Pressable onPress={() => router.push("/pairing")} style={styles.deviceValue}>
          <Text style={{ color: t.labelNeutral, fontSize: 13 }}>
            {isDevBypassMac(pairedMac) ? "개발용 미리보기" : (pairedMac ?? "미등록")}
          </Text>
          <Text style={{ color: t.primary, fontSize: 13, fontWeight: "600" }}>변경</Text>
        </Pressable>
      </Row>
      <Row label="화면 테마">
        <ThemeModeToggle />
      </Row>
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
        <Text style={{ color: t.negative, fontSize: 12, marginTop: -8, marginBottom: 8 }}>{releaseError}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  deviceValue: { flexDirection: "row", alignItems: "center", gap: 8 },
  releaseBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, minWidth: 56, alignItems: "center" },
});
