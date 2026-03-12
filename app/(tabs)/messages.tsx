import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import { useFocusEffect } from "@react-navigation/native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const HOME_BAR_SPACE = 44;
const TYPING_HANDOFF_MS = 500;

export default function MessagesScreen() {
  const thread = useGameStore((s) => s.thread);
  const clearUnreadMessages = useGameStore((s) => s.clearUnreadMessages);
  const replyChips = useGameStore((s) => s.replyChips);
  const inputEnabled = useGameStore((s) => s.messagesInputEnabled);
  const sendEnabled = useGameStore((s) => s.messagesSendEnabled);
  const messagesTyping = useGameStore((s) => s.messagesTyping);
  const submitMessageText = useGameStore((s) => s.submitMessageText);
  const handleMessageReplyAction = useGameStore(
    (s) => s.handleMessageReplyAction,
  );

  const [input, setInput] = useState("");
  const [dots, setDots] = useState("…");
  const [showTypingBubble, setShowTypingBubble] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const typingHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInboundIdRef = useRef<string | null>(null);

  const lastInboundMessage = useMemo(() => {
    for (let i = thread.length - 1; i >= 0; i -= 1) {
      const item = thread[i];
      if (item.from !== "player") return item;
    }
    return null;
  }, [thread]);

  useFocusEffect(
    useCallback(() => {
      clearUnreadMessages();
    }, [clearUnreadMessages]),
  );

  useEffect(() => {
    return () => {
      if (typingHideTimer.current) clearTimeout(typingHideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (messagesTyping) {
      if (typingHideTimer.current) {
        clearTimeout(typingHideTimer.current);
        typingHideTimer.current = null;
      }
      setShowTypingBubble(true);
      return;
    }

    if (!showTypingBubble) return;

    typingHideTimer.current = setTimeout(() => {
      setShowTypingBubble(false);
      typingHideTimer.current = null;
    }, TYPING_HANDOFF_MS);
  }, [messagesTyping, showTypingBubble]);

  useEffect(() => {
    const currentInboundId = lastInboundMessage?.id ?? null;

    if (currentInboundId && currentInboundId !== lastInboundIdRef.current) {
      lastInboundIdRef.current = currentInboundId;

      if (typingHideTimer.current) {
        clearTimeout(typingHideTimer.current);
        typingHideTimer.current = null;
      }

      setShowTypingBubble(false);
    }
  }, [lastInboundMessage]);

  useEffect(() => {
    if (!showTypingBubble) {
      setDots("…");
      return;
    }

    let i = 0;
    const frames = [".", "..", "..."];
    const id = setInterval(() => {
      i = (i + 1) % frames.length;
      setDots(frames[i]);
    }, 260);

    return () => clearInterval(id);
  }, [showTypingBubble]);

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 40);

    return () => clearTimeout(id);
  }, [thread.length, replyChips.length, showTypingBubble]);

  function handleSend(raw?: string) {
    if (!inputEnabled || !sendEnabled || messagesTyping) return;

    const text = (raw ?? input).trim();
    if (!text) return;

    setInput("");
    submitMessageText(text);
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
            {showTypingBubble ? "ops typing" : "channel active"}
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

            {showTypingBubble && (
              <View style={[styles.row, styles.rowLeft]}>
                <View style={[styles.bubble, styles.handlerBubble]}>
                  <Text style={[styles.meta, styles.handlerMeta]}>OPS</Text>
                  <Text style={styles.typingText}>{dots}</Text>
                </View>
              </View>
            )}
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
                  onPress={() => {
                    void handleMessageReplyAction(item.action, item.label);
                  }}
                  style={[
                    styles.quickBtn,
                    messagesTyping ? styles.quickBtnDisabled : undefined,
                  ]}
                  disabled={messagesTyping}
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
            placeholder={
              inputEnabled ? "Send burst..." : "Messaging unavailable..."
            }
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={[
              styles.input,
              !inputEnabled ? styles.inputDisabled : undefined,
            ]}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            editable={inputEnabled && !messagesTyping}
          />

          <Pressable
            onPress={() => handleSend()}
            style={[
              styles.sendBtn,
              !inputEnabled || !sendEnabled || messagesTyping
                ? styles.sendBtnDisabled
                : undefined,
            ]}
            disabled={!inputEnabled || !sendEnabled || messagesTyping}
          >
            <Text
              style={[
                styles.sendBtnText,
                !inputEnabled || !sendEnabled || messagesTyping
                  ? styles.sendBtnTextDisabled
                  : undefined,
              ]}
            >
              SEND
            </Text>
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

  typingText: {
    fontSize: 18,
    lineHeight: 20,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "700",
    letterSpacing: 1,
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

  quickBtnDisabled: {
    opacity: 0.45,
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

  inputDisabled: {
    opacity: 0.5,
  },

  sendBtn: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d7dde8",
  },

  sendBtnDisabled: {
    opacity: 0.4,
  },

  sendBtnText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#0f141c",
  },

  sendBtnTextDisabled: {
    color: "#0f141c",
  },
});
