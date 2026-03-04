import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

export default function HomeGestureBar() {
  const router = useRouter();

  return (
    <Pressable onPress={() => router.replace("/(tabs)")}>
      <View style={styles.wrap}>
        <View style={styles.bar} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  bar: {
    width: 120,
    height: 4,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
});
