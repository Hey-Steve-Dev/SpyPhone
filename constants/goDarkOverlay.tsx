import { useGameStore } from "@/store/useGameStore";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function GoDarkOverlay() {
  const goDark = useGameStore((s) => s.goDark);

  if (!goDark.active) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Text style={styles.label}>{goDark.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 99999,
    elevation: 99999,
  },
  label: {
    padding: 3,
    position: "absolute",
    top: 8,
    left: 8,
    color: "rgba(120, 255, 181, 0.7)",
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "500",
    opacity: 0.35,
  },
});
