import { useGameStore } from "@/store/useGameStore";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function BannerComms() {
  const banner = useGameStore((s) => s.banner);
  const clear = useGameStore((s) => s.bannerClear);

  if (!banner.on) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <View style={styles.dot} />
        <Text style={styles.title}>{banner.title}</Text>
      </View>

      <Text style={styles.msg} numberOfLines={1}>
        {banner.message}
      </Text>

      <Pressable onPress={clear} style={styles.close} hitSlop={10}>
        <Text style={styles.closeTxt}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: "rgba(111,123,255,0.95)",
  },
  title: {
    fontSize: 11,
    letterSpacing: 0.35,
    color: "rgba(255,255,255,0.82)",
  },
  msg: {
    flex: 1,
    fontSize: 12.4,
    color: "rgba(255,255,255,0.92)",
  },
  close: {
    width: 34,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  closeTxt: { color: "rgba(255,255,255,0.9)" },
});
