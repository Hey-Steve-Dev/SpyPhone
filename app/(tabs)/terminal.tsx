import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function TerminalScreen() {
  const terminalLocked = useGameStore((s) => s.terminalLocked);
  const setTerminalLocked = useGameStore((s) => s.setTerminalLocked);
  const bannerPush = useGameStore((s) => s.bannerPush);

  // TEMP: for testing lock. Remove later once mission engine controls this.

  return (
    <PhoneFrame>
      <View style={styles.wrap}>
        <Text style={styles.title}>Terminal</Text>
        <Text style={styles.sub}>Lock: {terminalLocked ? "ON" : "OFF"}</Text>

        <Pressable
          onPress={() => {
            setTerminalLocked(false);
            bannerPush("STATUS", "Lock released (dev).", 1600);
          }}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnTxt}>Release Lock (dev)</Text>
        </Pressable>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 18, gap: 10 },
  title: { fontSize: 20, fontWeight: "800", color: "rgba(255,255,255,0.92)" },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.65)" },
  btn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  btnTxt: { color: "rgba(255,255,255,0.92)", fontWeight: "700" },
});
