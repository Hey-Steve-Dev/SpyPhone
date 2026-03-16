import BannerComms from "@/components/BannerComms";
import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import { Slot } from "expo-router";
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
    <PhoneFrame>
      <Slot />
      <BannerComms />
    </PhoneFrame>
  );
}
