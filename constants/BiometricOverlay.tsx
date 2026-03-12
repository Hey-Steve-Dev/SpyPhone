import { useGameStore } from "@/store/useGameStore";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function BiometricOverlay() {
  const biometricOverlay = useGameStore((s) => s.biometricOverlay);

  if (!biometricOverlay.active) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Text style={styles.label}>Biometrics recognized.</Text>
      <Text style={styles.loading}>Loading</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 99998,
    elevation: 99998,
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
  loading: {
    padding: 3,
    position: "absolute",
    top: 24,
    left: 8,
    color: "rgba(120, 255, 181, 0.7)",
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "500",
    opacity: 0.35,
  },
});
