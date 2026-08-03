// 하단 탭. 채택된 프로토타입은 4탭(실시간·기록·통계·설정)이지만 O5 열린 결정에서
// 통계 탭을 없애고 기록 탭 요약 카드로 흡수하는 안이 유력하다. 확정되면 이 파일에서 탭만 정리하면 된다.
import { Tabs } from "expo-router";
import { Text } from "react-native";

const ICON: Record<string, string> = {
  index: "◉",
  record: "▤",
  stats: "◔",
  settings: "···",
};

function TabIcon({ name, color }: { name: keyof typeof ICON; color: string }) {
  return <Text style={{ color, fontSize: 18 }}>{ICON[name]}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{ title: "실시간", tabBarIcon: ({ color }) => <TabIcon name="index" color={color} /> }}
      />
      <Tabs.Screen
        name="record"
        options={{ title: "기록", tabBarIcon: ({ color }) => <TabIcon name="record" color={color} /> }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: "통계", tabBarIcon: ({ color }) => <TabIcon name="stats" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "설정", tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} /> }}
      />
    </Tabs>
  );
}
