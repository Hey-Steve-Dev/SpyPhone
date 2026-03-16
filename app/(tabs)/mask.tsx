import { useGameStore } from "@/store/useGameStore";
import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

const HOME_BAR_SPACE = 44;

export default function MaskScreen() {
  const mask = useGameStore((s) => s.mask);
  const masks = useGameStore((s) => s.masks);
  const switchMask = useGameStore((s) => s.switchMask);

  return (
    <View style={styles.wrap}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Identity Mask</Text>
        <Text style={styles.headerSub}>
          Active profile: {mask.toUpperCase()}
        </Text>
      </View>

      {/* MASK LIST */}
      <FlatList
        data={masks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: HOME_BAR_SPACE + 20,
        }}
        renderItem={({ item }) => {
          const active = item.id === mask;

          return (
            <Pressable
              style={[styles.card, active && styles.cardActive]}
              onPress={() => switchMask(item.id)}
            >
              <View style={styles.cardHeader}>
                <Text
                  style={[styles.cardTitle, active && styles.cardTitleActive]}
                >
                  {item.label}
                </Text>

                {active && <Text style={styles.activeTag}>ACTIVE</Text>}
              </View>

              <Text style={styles.cardDesc}>{item.description}</Text>

              <View style={styles.metaRow}>
                <Text style={styles.meta}>
                  Trace modifier: {item.traceModifier}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 14,
  },

  header: {
    paddingHorizontal: 4,
    paddingBottom: 12,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "rgba(255,255,255,0.92)",
  },

  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
    marginBottom: 10,
  },

  cardActive: {
    borderColor: "#4ade80",
    backgroundColor: "rgba(74,222,128,0.08)",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },

  cardTitleActive: {
    color: "#4ade80",
  },

  activeTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4ade80",
  },

  cardDesc: {
    marginTop: 6,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 18,
  },

  metaRow: {
    marginTop: 8,
    flexDirection: "row",
  },

  meta: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
});
