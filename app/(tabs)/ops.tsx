import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

function formatTime(s: number) {
  const mm = String(Math.max(0, Math.floor(s / 60))).padStart(2, "0");
  const ss = String(Math.max(0, s % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function OpsScreen() {
  const trace = useGameStore((s) => s.trace);
  const secondsLeft = useGameStore((s) => s.secondsLeft);
  const timerRunning = useGameStore((s) => s.timerRunning);

  const traceLabel = useMemo(() => {
    if (trace >= 85) return "CRITICAL";
    if (trace >= 70) return "HIGH";
    if (trace >= 45) return "ELEVATED";
    return "NOMINAL";
  }, [trace]);

  return (
    <PhoneFrame>
      <View style={styles.wrap}>
        <Text style={styles.title}>Ops HUD</Text>
        <Text style={styles.sub}>Operational status monitor</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.k}>TRACE</Text>
            <Text style={styles.v}>{trace}%</Text>
          </View>
          <Text style={styles.hint}>Status: {traceLabel}</Text>

          <View style={styles.div} />

          <View style={styles.row}>
            <Text style={styles.k}>WINDOW</Text>
            <Text style={styles.v}>{formatTime(secondsLeft)}</Text>
          </View>
          <Text style={styles.hint}>
            {timerRunning ? "Countdown active" : "Timer paused"}
          </Text>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteT}>Note</Text>
          <Text style={styles.noteB}>
            Keep exposure low. Mission mistakes elevate trace. When trace hits
            100%, you’re compromised.
          </Text>
        </View>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "900", color: "rgba(255,255,255,0.92)" },
  sub: { marginTop: 2, color: "rgba(255,255,255,0.58)", fontSize: 12 },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 14,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  k: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  v: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 18,
    fontWeight: "900",
  },
  hint: { marginTop: 6, color: "rgba(255,255,255,0.62)", fontSize: 12 },

  div: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginVertical: 12,
  },

  note: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.25)",
    padding: 12,
  },
  noteT: { color: "rgba(255,255,255,0.88)", fontWeight: "900", fontSize: 12 },
  noteB: {
    marginTop: 6,
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    lineHeight: 16,
  },
});
