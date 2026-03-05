import { useGameStore } from "@/store/useGameStore";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export default function BannerComms() {
  const banner = useGameStore((s) => s.banner);

  const y = useRef(new Animated.Value(-80)).current;
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!banner.on) {
      Animated.parallel([
        Animated.timing(a, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: -80,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.spring(y, {
        toValue: 0,
        damping: 18,
        stiffness: 240,
        useNativeDriver: true,
      }),
      Animated.timing(a, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [banner.on]);

  if (!banner.on) return null;

  const title = (banner.title || "").trim();
  const msg = (banner.message || "").trim();

  const header =
    title.length > 0 && title.toLowerCase() !== "secure comms"
      ? title.toUpperCase()
      : "OPS";

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          transform: [{ translateY: y }],
          opacity: a,
        },
      ]}
    >
      <View style={styles.banner}>
        <Text style={styles.header}>{header}</Text>
        <Text style={styles.text}>{msg}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 10,
    paddingTop: 10,
    zIndex: 100,
  },

  banner: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,

    backgroundColor: "#1a1f2b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  header: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 4,
  },

  text: {
    fontSize: 14,
    lineHeight: 18,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
  },
});
