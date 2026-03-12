import { useGameStore } from "@/store/useGameStore";
import { Stack } from "expo-router";
import React, { useEffect } from "react";

export default function PhoneLayout() {
  const bootGame = useGameStore((s) => s.bootGame);
  const booted = useGameStore((s) => s.booted);

  const triggerBiometricOverlay = useGameStore(
    (s) => s.triggerBiometricOverlay,
  );

  useEffect(() => {
    if (booted) return;

    let mounted = true;

    const runBoot = async () => {
      await triggerBiometricOverlay();
      if (!mounted) return;

      bootGame();
    };

    void runBoot();

    return () => {
      mounted = false;
    };
  }, [bootGame, booted, triggerBiometricOverlay]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="terminal" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="network" />
      <Stack.Screen name="audio-scanner" />
      <Stack.Screen name="scanner" />
      <Stack.Screen name="jammer" />
      <Stack.Screen name="cameras" />
      <Stack.Screen name="notes" />
      <Stack.Screen name="mask" />
      <Stack.Screen name="vault" />
      <Stack.Screen name="ops" />
      <Stack.Screen name="log" />
      <Stack.Screen name="tunnel" />
    </Stack>
  );
}
