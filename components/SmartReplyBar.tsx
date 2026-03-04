import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Reply = {
  key: string;
  label: string;
};

type SmartReplyBarProps = {
  replies: Reply[];
  onPick: (key: string) => void;
};

export default function SmartReplyBar({ replies, onPick }: SmartReplyBarProps) {
  return (
    <View style={styles.wrap}>
      {replies.map((r) => (
        <Pressable
          key={r.key}
          onPress={() => onPick(r.key)}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <Text style={styles.txt} numberOfLines={1}>
            {r.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  chip: {
    maxWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  txt: {
    fontSize: 13,
    color: "rgba(255,255,255,0.90)",
  },
});
