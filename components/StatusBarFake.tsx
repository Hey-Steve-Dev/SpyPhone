import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function StatusBarFake() {
  const [time, setTime] = useState("");

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
        <Text style={styles.muted}>SILENT</Text>
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
  muted: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
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
