import { useGameStore } from "@/store/useGameStore";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StatusBarFake() {
  const [time, setTime] = useState("");
  const insets = useSafeAreaInsets();

  const router = useRouter();
  const pathname = usePathname();
  const isWeb = Platform.OS === "web";

  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSoundEnabled = useGameStore((s) => s.toggleSoundEnabled);

  const onHome = useMemo(() => {
    return (
      pathname === "/(tabs)" || pathname === "/(tabs)/" || pathname === "/"
    );
  }, [pathname]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={[styles.safeTop, { paddingTop: isWeb ? 0 : insets.top }]}>
      <View style={styles.container}>
        <View style={styles.left}>
          {/* HOME BUTTON */}
          <Pressable
            onPress={() => {
              if (!onHome) router.replace("/(tabs)");
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go to home screen"
            style={({ pressed }) => [
              styles.homeButton,
              onHome && styles.homeButtonActive,
              pressed && styles.homeButtonPressed,
            ]}
          >
            <Text style={[styles.homeIcon, onHome && styles.homeIconActive]}>
              ⌂
            </Text>
          </Pressable>

          {/* SOUND TOGGLE */}
          <Pressable
            onPress={() => {
              void toggleSoundEnabled();
            }}
            hitSlop={10}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.soundButton,
              soundEnabled ? styles.soundButtonOn : styles.soundButtonOff,
              pressed && styles.soundButtonPressed,
            ]}
          >
            <Text
              style={[
                styles.soundButtonText,
                soundEnabled
                  ? styles.soundButtonTextOn
                  : styles.soundButtonTextOff,
              ]}
            >
              {soundEnabled ? "SOUND ON" : "SILENT"}
            </Text>
          </Pressable>

          <Text style={styles.time}>{time}</Text>
        </View>

        {/* CENTER ICONS (trimmed down) */}
        <View style={styles.center}>
          <Text style={styles.icon}>🛡</Text>
          <Text style={styles.icon}>⟲</Text>
        </View>

        <View style={styles.right}>
          {isWeb ? <Text style={styles.icon}>WEB</Text> : null}
          <Text style={styles.icon}>▂▄▆█</Text>
          <Text style={styles.icon}>🔋 86%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  container: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  center: {
    flexDirection: "row",
    gap: 12,
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  homeButton: {
    width: 34,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  homeButtonActive: {
    borderColor: "rgba(124,255,178,0.45)",
    backgroundColor: "rgba(124,255,178,0.15)",
  },

  homeButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },

  homeIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },

  homeIconActive: {
    color: "#7CFFB2",
  },

  soundButton: {
    minWidth: 84,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  soundButtonOn: {
    borderColor: "rgba(124,255,178,0.55)",
    backgroundColor: "rgba(124,255,178,0.14)",
  },

  soundButtonOff: {
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  soundButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },

  soundButtonText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  soundButtonTextOn: {
    color: "#7CFFB2",
  },

  soundButtonTextOff: {
    color: "rgba(255,255,255,0.82)",
  },

  time: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },

  icon: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
});
