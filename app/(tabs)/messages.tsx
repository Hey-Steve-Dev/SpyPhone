import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const HOME_BAR_SPACE = 44;
const OPS_BASE_LAG_MS = 650;
const OPS_JITTER_MS = 550;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function MessagesScreen() {
  const bootGame = useGameStore((s) => s.bootGame);
  const thread = useGameStore((s) => s.thread);
  const replyChips = useGameStore((s) => s.replyChips);
  const banner = useGameStore((s) => s.banner);
  const pushThread = useGameStore((s) => s.pushThread);
  const setBanner = useGameStore((s) => s.setBanner);
  const clearReplyChips = useGameStore((s) => s.clearReplyChips);
  const setReplyChips = useGameStore((s) => s.setReplyChips);
  const terminalLocked = useGameStore((s) => s.terminalLocked);
  const cameraObjectiveResolved = useGameStore(
    (s) => s.cameraObjectiveResolved,
  );
  const attemptMoveNow = useGameStore((s) => s.attemptMoveNow);

  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);

  useEffect(() => {
    bootGame();
  }, [bootGame]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 40);
    return () => clearTimeout(id);
  }, [thread.length, banner.on, banner.message, replyChips.length]);

  async function pushHandlerMessage(text: string, title = "OPS") {
    if (!mountedRef.current) return;

    busyRef.current = true;

    setBanner({
      on: true,
      title,
      message: "…",
    });

    const thinkingDelay = OPS_BASE_LAG_MS + rand(120, OPS_JITTER_MS);
    await wait(thinkingDelay);

    if (!mountedRef.current) return;

    setBanner({
      on: true,
      title,
      message: text,
    });

    await wait(700);

    if (!mountedRef.current) return;

    setBanner({
      on: false,
      title: "",
      message: "",
    });

    pushThread("handler", text);
    busyRef.current = false;
  }

  async function handleFreeText(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text) return;

    setInput("");
    pushThread("player", text);

    if (busyRef.current) return;

    const lower = text.toLowerCase();

    if (lower.includes("jammer")) {
      await pushHandlerMessage(
        "Jammer is not invisibility. It creates confusion and short gaps. Use it to reduce clean tracking, not to sit still.",
      );
      return;
    }

    if (lower.includes("network")) {
      await pushHandlerMessage(
        "Network gives you nearby surfaces to inspect, switch, and abuse. Treat it like opportunity, not safety.",
      );
      return;
    }

    if (lower.includes("camera") || lower.includes("cameras")) {
      await pushHandlerMessage(
        "Camera feeds are for confirming motion and fixing a location fast. Find the right feed, then move.",
      );
      return;
    }

    if (lower.includes("help")) {
      await pushHandlerMessage(
        "Keep comms short. Acknowledge, act, report. We do not hold open channels longer than necessary.",
      );
      return;
    }

    await pushHandlerMessage("Keep coms to a minimum");
  }

  async function handleChipPress(action: string, label: string) {
    if (busyRef.current) return;

    if (action === "moving_now") {
      clearReplyChips();
      attemptMoveNow();
      return;
    }

    pushThread("player", label);
    clearReplyChips();

    switch (action) {
      case "review_phone": {
        await pushHandlerMessage(
          "Ghost phone review: messages are local-first, terminal is for controlled actions, jammer buys time, network helps you pivot fast.",
        );
        await pushHandlerMessage(
          "You only get short burst comms. Read fast, act local, keep moving.",
        );
        setReplyChips([
          { id: "review_ack", label: "Got it", action: "review_ack" },
        ]);
        return;
      }

      case "skip_review": {
        await pushHandlerMessage(
          "Good. Stay dark and follow instructions exactly. We only get short burst windows.",
        );
        await pushHandlerMessage(
          "First action: get us on a network. Open Network and link up.",
        );
        return;
      }
      case "moving_now": {
        attemptMoveNow();
        return;
      }

      case "review_ack": {
        await pushHandlerMessage(
          "Good. First action: get us on a network. Open Network and link up.",
        );
        return;
      }

      case "ack_cameras": {
        await pushHandlerMessage(
          "Move. Confirm the live feed before the contact disappears.",
        );
        return;
      }

      case "open_terminal": {
        if (!cameraObjectiveResolved) {
          await pushHandlerMessage(
            "Not yet. Confirm the target feed before shifting back to Terminal.",
          );
          return;
        }

        if (terminalLocked) {
          await pushHandlerMessage("Stand by. Shell is not clear yet.");
          return;
        }

        await pushHandlerMessage("Good. Move to Terminal. We’re live.");
        return;
      }

      default: {
        await handleFreeText(action || label);
      }
    }
  }

  function formatTime(at: number) {
    return new Date(at).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <PhoneFrame>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.kicker}>SECURE COMMS</Text>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtle}>
            {banner.on ? "burst traffic active" : "channel idle"}
          </Text>
        </View>

        <View style={styles.threadWrap}>
          <ScrollView
            ref={scrollRef}
            style={styles.thread}
            contentContainerStyle={styles.threadContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {thread.map((item) => {
              const mine = item.from === "player";

              return (
                <View
                  key={item.id}
                  style={[styles.row, mine ? styles.rowRight : styles.rowLeft]}
                >
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.playerBubble : styles.handlerBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.meta,
                        mine ? styles.playerMeta : styles.handlerMeta,
                      ]}
                    >
                      {mine ? "YOU" : item.from === "system" ? "SYS" : "OPS"} ·{" "}
                      {formatTime(item.at)}
                    </Text>
                    <Text style={styles.messageText}>{item.text}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {replyChips.length > 0 && (
          <View style={styles.quickBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickBarContent}
            >
              {replyChips.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleChipPress(item.action, item.label)}
                  style={styles.quickBtn}
                >
                  <Text style={styles.quickBtnText}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.composeWrap}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Send burst..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            onSubmitEditing={() => handleFreeText()}
            returnKeyType="send"
          />
          <Pressable onPress={() => handleFreeText()} style={styles.sendBtn}>
            <Text style={styles.sendBtnText}>SEND</Text>
          </Pressable>
        </View>

        <View style={{ height: HOME_BAR_SPACE }} />
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 14,
  },

  header: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },

  kicker: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: "800",
    color: "rgba(255,255,255,0.52)",
  },

  title: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "900",
    color: "#f5f7fb",
  },

  subtle: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.58)",
  },

  threadWrap: {
    flex: 1,
    minHeight: 0,
  },

  thread: {
    flex: 1,
  },

  threadContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 10,
  },

  row: {
    width: "100%",
    flexDirection: "row",
  },

  rowLeft: {
    justifyContent: "flex-start",
  },

  rowRight: {
    justifyContent: "flex-end",
  },

  bubble: {
    maxWidth: "84%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },

  handlerBubble: {
    backgroundColor: "#1a1f2b",
    borderColor: "rgba(255,255,255,0.10)",
  },

  playerBubble: {
    backgroundColor: "#233247",
    borderColor: "rgba(255,255,255,0.12)",
  },

  meta: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 5,
  },

  handlerMeta: {
    color: "rgba(255,255,255,0.56)",
  },

  playerMeta: {
    color: "rgba(255,255,255,0.62)",
  },

  messageText: {
    fontSize: 14,
    lineHeight: 19,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
  },

  quickBar: {
    paddingTop: 6,
    paddingBottom: 8,
  },

  quickBarContent: {
    paddingHorizontal: 12,
    gap: 8,
  },

  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  quickBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.86)",
  },

  composeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
  },

  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    color: "#f5f7fb",
    fontSize: 14,
    fontWeight: "600",
  },

  sendBtn: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d7dde8",
  },

  sendBtnText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#0f141c",
  },
});
