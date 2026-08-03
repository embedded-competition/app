import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="detail/[channel]"
        options={{ headerShown: true, title: "항목 상세" }}
      />
      <Stack.Screen
        name="alarm"
        options={{ presentation: "fullScreenModal", animation: "fade" }}
      />
    </Stack>
  );
}
