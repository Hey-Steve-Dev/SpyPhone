import { useGameStore } from "@/store/useGameStore";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function StatusBarFake() {
  const [time, setTime] = useState("");

  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSoundEnabled = useGameStore((s) => s.toggleSoundEnabled);

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
    <View style={styles.container}>
      <View style={styles.left}>
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

      <View style={styles.center}>
        <Text style={styles.icon}>🛡</Text>
        <Text style={styles.icon}>⟲</Text>
        <Text style={styles.icon}>⧉</Text>
        <Text style={styles.icon}>☠</Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.icon}>▂▄▆█</Text>
        <Text style={styles.icon}>🔋 86%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  center: {
    flexDirection: "row",
    gap: 10,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  soundButton: {
    minWidth: 84,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
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
