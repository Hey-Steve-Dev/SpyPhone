import { Stack } from "expo-router";
import React from "react";

export default function PhoneLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Home phone screen */}
      <Stack.Screen name="index" />

      <Stack.Screen name="terminal" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="sat" />
      <Stack.Screen name="network" />
      <Stack.Screen name="jammer" />
      <Stack.Screen name="cameras" />
      <Stack.Screen name="notes" />
      <Stack.Screen name="mask" />
      <Stack.Screen name="vault" />
      <Stack.Screen name="ops" />
    </Stack>
  );
}
