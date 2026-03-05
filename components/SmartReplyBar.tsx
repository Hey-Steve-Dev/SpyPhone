import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Reply = { key: string; label: string };

export default function SmartReplyBar({
  replies,
  onPick,
}: {
  replies: Reply[];
  onPick: (key: string) => void;
}) {
  return (
    <View style={styles.row}>
      {replies.map((r) => (
        <Pressable
          key={r.key}
          onPress={() => onPick(r.key)}
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        >
          <Text style={styles.chipText}>{r.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,

    // THIS is what you needed
    paddingHorizontal: 18,
    paddingVertical: 6,
  },

  chip: {
    minWidth: 100,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  chipPressed: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  chipText: {
    textAlign: "center",
    fontWeight: "800",
    color: "rgba(255,255,255,0.92)",
    letterSpacing: 0.2,
  },
});
