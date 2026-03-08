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

          <Pressable
            onPress={() => {
              void toggleSoundEnabled();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={soundEnabled ? "Mute sound" : "Enable sound"}
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
              {soundEnabled ? "🔊" : "🔇"}
            </Text>
          </Pressable>

          <Text style={styles.time} numberOfLines={1}>
            {time}
          </Text>
        </View>

        <View style={styles.center}>
          <Text style={styles.icon}>🛡</Text>
        </View>

        <View style={styles.right}>
          {isWeb ? (
            <Text style={styles.icon} numberOfLines={1}>
              WEB
            </Text>
          ) : null}
          <Text style={styles.icon} numberOfLines={1}>
            ▃▆█
          </Text>
          <Text style={styles.icon} numberOfLines={1}>
            🔋 86%
          </Text>
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
    minWidth: 0,
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
    flex: 1,
  },

  center: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 8,
    flexShrink: 0,
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
    marginLeft: 8,
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
    flexShrink: 0,
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
    width: 36,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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
    fontSize: 14,
    fontWeight: "700",
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
    flexShrink: 1,
    minWidth: 0,
  },

  icon: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    flexShrink: 1,
  },
});
