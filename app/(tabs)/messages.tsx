import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import React, { useEffect, useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const HOME_BAR_SPACE = 44;

export default function MessagesScreen() {
  const thread = useGameStore((s) => s.thread);
  const replyChips = useGameStore((s) => s.replyChips);
  const pushThread = useGameStore((s) => s.pushThread);
  const setReplyChips = useGameStore((s) => s.setReplyChips);
  const clearReplyChips = useGameStore((s) => s.clearReplyChips);
  const setStandbyMode = useGameStore((s) => s.setStandbyMode);
  const standbyMode = useGameStore((s) => s.standbyMode);
  const standbyMessage = useGameStore((s) => s.standbyMessage);
  const hallwayOneOccupied = useGameStore((s) => s.hallwayOneOccupied);
  const mission = useGameStore((s) => s.mission);
  const setMissionStep = useGameStore((s) => s.setMissionStep);
  const bannerPush = useGameStore((s) => s.bannerPush);

  const scrollRef = useRef<ScrollView>(null);
  const bootedFlowRef = useRef(false);

  useEffect(() => {
    if (bootedFlowRef.current) return;
    if (thread.length > 0) return;

    bootedFlowRef.current = true;

    pushThread("handler", "Confirm you're in.");
    setReplyChips([
      { id: "confirm_in", label: "confirm in", action: "confirm_in" },
    ]);
  }, [thread.length, pushThread, setReplyChips]);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 30);
    return () => clearTimeout(t);
  }, [thread, replyChips, standbyMode]);

  const handleChip = (action: string, label: string) => {
    if (action === "confirm_in") {
      pushThread("player", "I'm in.");
      clearReplyChips();
      setMissionStep(1);

      setTimeout(() => {
        pushThread(
          "handler",
          "Check Camera 12. Wait for the guard to pass by on his rounds.",
        );
        pushThread("handler", "When he clears, text me you are on the move.");
        setReplyChips([
          { id: "move_now", label: "on the move", action: "moving_now" },
        ]);
      }, 450);

      return;
    }

    if (action === "moving_now") {
      if (hallwayOneOccupied) {
        pushThread(
          "handler",
          "Negative. Guard is still in the corridor. Wait for a clear window.",
        );
        bannerPush("HOLD", "Wait for the guard to clear Camera 12.", 1800);
        return;
      }

      pushThread("player", "On the move.");
      clearReplyChips();
      setMissionStep(2);
      setStandbyMode(true, "STANDBY");

      setTimeout(() => {
        setStandbyMode(false);
        setReplyChips([{ id: "im_in", label: "I'm in", action: "im_in" }]);
      }, 2600);

      return;
    }

    if (action === "im_in") {
      pushThread("player", "I'm in.");
      clearReplyChips();

      // Hand off into the normal mission flow
      setMissionStep(0);

      setTimeout(() => {
        pushThread("handler", "You're online.");
        pushThread("handler", "First action: get us on a network.");
        pushThread("handler", "Open Network → Scan → Link. Keep it quiet.");

        setReplyChips([
          { id: "copy_network", label: "copy", action: "copy_network" },
        ]);
      }, 350);

      return;
    }

    if (action === "copy_network") {
      pushThread("player", "Copy.");
      clearReplyChips();
      return;
    }

    pushThread("player", label);
    clearReplyChips();
  };

  const renderedThread = useMemo(() => thread, [thread]);

  return (
    <PhoneFrame>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerMeta}>OPS SECURE THREAD</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          showsVerticalScrollIndicator={false}
        >
          {renderedThread.map((item) => {
            const mine = item.from === "player";
            const system = item.from === "system";

            return (
              <View
                key={item.id}
                style={[
                  styles.row,
                  mine && styles.rowMine,
                  system && styles.rowSystem,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    mine && styles.bubbleMine,
                    system && styles.bubbleSystem,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      mine && styles.bubbleTextMine,
                      system && styles.bubbleTextSystem,
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.chipsWrap}>
          {replyChips.map((chip) => (
            <Pressable
              key={chip.id}
              onPress={() => handleChip(chip.action, chip.label)}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={styles.chipText}>{chip.label}</Text>
            </Pressable>
          ))}
        </View>

        {standbyMode && (
          <View style={styles.standbyOverlay}>
            <Text style={styles.standbyText}>{standbyMessage}</Text>
          </View>
        )}

        <View style={{ height: HOME_BAR_SPACE }} />
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 12,
  },

  header: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  headerTitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 17,
    fontWeight: "700",
  },

  headerMeta: {
    marginTop: 2,
    color: "rgba(255,255,255,0.58)",
    fontSize: 11,
    letterSpacing: 0.6,
  },

  thread: {
    flex: 1,
  },

  threadContent: {
    paddingTop: 6,
    paddingBottom: 12,
    gap: 8,
  },

  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },

  rowMine: {
    justifyContent: "flex-end",
  },

  rowSystem: {
    justifyContent: "center",
  },

  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  bubbleMine: {
    backgroundColor: "rgba(111,123,255,0.22)",
    borderColor: "rgba(111,123,255,0.34)",
  },

  bubbleSystem: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.05)",
  },

  bubbleText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    lineHeight: 18,
  },

  bubbleTextMine: {
    color: "rgba(255,255,255,0.94)",
  },

  bubbleTextSystem: {
    color: "rgba(255,255,255,0.62)",
    textAlign: "center",
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },

  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  chipPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  chipText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  standbyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.96)",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    paddingTop: 20,
    paddingHorizontal: 14,
  },

  standbyText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    letterSpacing: 1.2,
  },
});
