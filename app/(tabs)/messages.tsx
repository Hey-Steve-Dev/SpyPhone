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
const LIVE_BUBBLE_GRACE_MS = 350;

type LiveBubble =
  | {
      phase: "typing";
      uiKey: string;
    }
  | {
      phase: "message";
      uiKey: string;
      id: string;
      text: string;
      at: number;
      from: "ops" | "system";
    }
  | null;

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
  const [dots, setDots] = useState("...");
  const [liveBubble, setLiveBubble] = useState<LiveBubble>(null);

  const scrollRef = useRef<ScrollView>(null);
  const lastInboundIdRef = useRef<string | null>(null);
  const hideLiveBubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingTypingHandoffRef = useRef(false);
  const didMountRef = useRef(false);
  const liveKeyCounterRef = useRef(0);

  const nextLiveUiKey = useCallback(() => {
    liveKeyCounterRef.current += 1;
    return `live-bubble-${liveKeyCounterRef.current}`;
  }, []);

  const lastInboundMessage = useMemo(() => {
    for (let i = thread.length - 1; i >= 0; i -= 1) {
      const item = thread[i];
      if (item.from !== "player") return item;
    }
    return null;
  }, [thread]);

  const hasLiveMessageInThread = useMemo(() => {
    if (liveBubble?.phase !== "message") return false;
    return thread.some((item) => item.id === liveBubble.id);
  }, [thread, liveBubble]);

  useFocusEffect(
    useCallback(() => {
      clearUnreadMessages();
    }, [clearUnreadMessages]),
  );

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      lastInboundIdRef.current = lastInboundMessage?.id ?? null;
      return;
    }

    if (hideLiveBubbleTimerRef.current) {
      clearTimeout(hideLiveBubbleTimerRef.current);
      hideLiveBubbleTimerRef.current = null;
    }

    if (messagesTyping) {
      pendingTypingHandoffRef.current = true;

      setLiveBubble((prev) => {
        if (prev?.phase === "typing") return prev;

        return {
          phase: "typing",
          uiKey: nextLiveUiKey(),
        };
      });

      return;
    }

    if (
      pendingTypingHandoffRef.current &&
      lastInboundMessage &&
      lastInboundMessage.id !== lastInboundIdRef.current
    ) {
      const currentInboundId = lastInboundMessage.id;
      lastInboundIdRef.current = currentInboundId;
      pendingTypingHandoffRef.current = false;

      setLiveBubble((prev) => ({
        phase: "message",
        uiKey: prev?.uiKey ?? nextLiveUiKey(),
        id: lastInboundMessage.id,
        text: lastInboundMessage.text,
        at: lastInboundMessage.at,
        from: lastInboundMessage.from === "system" ? "system" : "ops",
      }));

      hideLiveBubbleTimerRef.current = setTimeout(() => {
        setLiveBubble((current) => {
          if (current?.phase === "message" && current.id === currentInboundId) {
            return null;
          }
          return current;
        });
        hideLiveBubbleTimerRef.current = null;
      }, LIVE_BUBBLE_GRACE_MS);

      return;
    }

    if (
      lastInboundMessage?.id &&
      lastInboundMessage.id !== lastInboundIdRef.current
    ) {
      lastInboundIdRef.current = lastInboundMessage.id;
    }

    if (liveBubble?.phase === "typing") {
      hideLiveBubbleTimerRef.current = setTimeout(() => {
        setLiveBubble((current) =>
          current?.phase === "typing" ? null : current,
        );
        hideLiveBubbleTimerRef.current = null;
      }, LIVE_BUBBLE_GRACE_MS);
    }

    return () => {
      if (hideLiveBubbleTimerRef.current) {
        clearTimeout(hideLiveBubbleTimerRef.current);
        hideLiveBubbleTimerRef.current = null;
      }
    };
  }, [messagesTyping, lastInboundMessage, liveBubble?.phase, nextLiveUiKey]);

  useEffect(() => {
    if (liveBubble?.phase !== "typing") {
      setDots("...");
      return;
    }

    let i = 0;
    const frames = [".", "..", "..."];
    const id = setInterval(() => {
      i = (i + 1) % frames.length;
      setDots(frames[i]);
    }, 260);

    return () => clearInterval(id);
  }, [liveBubble]);

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 40);

    return () => clearTimeout(id);
  }, [thread.length, replyChips.length, liveBubble]);

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

  function renderThreadBubble(item: {
    id: string;
    text: string;
    at: number;
    from: "player" | "ops" | "system";
  }) {
    const mine = item.from === "player";

    return (
      <View
        key={`thread-${item.id}`}
        style={[styles.row, mine ? styles.rowRight : styles.rowLeft]}
      >
        <View
          style={[
            styles.bubble,
            mine ? styles.playerBubble : styles.handlerBubble,
          ]}
        >
          <Text
            style={[styles.meta, mine ? styles.playerMeta : styles.handlerMeta]}
          >
            {mine ? "YOU" : item.from === "system" ? "SYS" : "OPS"} ·{" "}
            {formatTime(item.at)}
          </Text>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <PhoneFrame>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.kicker}>SECURE COMMS</Text>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtle}>
            {liveBubble?.phase === "typing" ? "ops typing" : "channel active"}
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
              if (
                liveBubble?.phase === "message" &&
                hasLiveMessageInThread &&
                item.id === liveBubble.id
              ) {
                return (
                  <View
                    key={`live-inline-${liveBubble.uiKey}`}
                    style={[styles.row, styles.rowLeft]}
                  >
                    <View style={[styles.bubble, styles.handlerBubble]}>
                      <Text style={[styles.meta, styles.handlerMeta]}>
                        {liveBubble.from === "system" ? "SYS" : "OPS"} ·{" "}
                        {formatTime(liveBubble.at)}
                      </Text>
                      <Text style={styles.messageText}>{liveBubble.text}</Text>
                    </View>
                  </View>
                );
              }

              return renderThreadBubble({
                id: item.id,
                text: item.text,
                at: item.at,
                from:
                  item.from === "player"
                    ? "player"
                    : item.from === "system"
                      ? "system"
                      : "ops",
              });
            })}

            {liveBubble?.phase === "typing" && (
              <View
                key={`live-typing-${liveBubble.uiKey}`}
                style={[styles.row, styles.rowLeft]}
              >
                <View style={[styles.bubble, styles.handlerBubble]}>
                  <Text style={[styles.meta, styles.handlerMeta]}>OPS</Text>
                  <Text style={styles.typingText}>{dots}</Text>
                </View>
              </View>
            )}

            {liveBubble?.phase === "message" && !hasLiveMessageInThread && (
              <View
                key={`live-tail-${liveBubble.uiKey}`}
                style={[styles.row, styles.rowLeft]}
              >
                <View style={[styles.bubble, styles.handlerBubble]}>
                  <Text style={[styles.meta, styles.handlerMeta]}>
                    {liveBubble.from === "system" ? "SYS" : "OPS"} ·{" "}
                    {formatTime(liveBubble.at)}
                  </Text>
                  <Text style={styles.messageText}>{liveBubble.text}</Text>
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
                  key={`chip-${item.id}`}
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
    backgroundColor: "#000",
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
    backgroundColor: "#000",
    paddingBottom: 8,
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
