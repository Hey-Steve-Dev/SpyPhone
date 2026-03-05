import PhoneFrame from "@/components/PhoneFrame";
import SmartReplyBar from "@/components/SmartReplyBar";
import { useGameStore } from "@/store/useGameStore";
import React, { useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";

const HOME_GESTURE_SPACE = 34;
const REPLY_DOCK_HEIGHT = 96;
const DOCK_TOTAL = REPLY_DOCK_HEIGHT + HOME_GESTURE_SPACE;

export default function MessagesScreen() {
  const commsConnected = useGameStore((s) => s.commsConnected);
  const commsConnecting = useGameStore((s) => s.commsConnecting);
  const commsJammed = useGameStore((s) => s.commsJammed);
  const connectComms = useGameStore((s) => s.connectComms);
  const bannerPush = useGameStore((s) => s.bannerPush);

  const thread = useGameStore((s) => s.thread);
  const pushThread = useGameStore((s) => s.pushThread);

  const listRef = useRef<FlatList<(typeof thread)[number]>>(null);

  useEffect(() => {
    connectComms();
  }, [connectComms]);

  const statusText = useMemo(() => {
    if (commsJammed) return "Signal Jammed";
    if (commsConnecting) return "Securing connection…";
    if (commsConnected) return "Secure Link Established";
    return "Offline";
  }, [commsConnected, commsConnecting, commsJammed]);

  const replies = useMemo(
    () => [
      { key: "onit", label: "On it" },
      { key: "repeat", label: "Repeat" },
      { key: "q", label: "?" },
    ],
    [],
  );

  function onPick(key: string) {
    if (!commsConnected) {
      bannerPush("COMMS", "No link. Unable to send.", 1800);
      return;
    }

    if (key === "onit") {
      pushThread("player", "On it.");
      setTimeout(() => pushThread("handler", "Good. Hold position."), 500);
      return;
    }

    if (key === "repeat") {
      pushThread("player", "Repeat.");
      setTimeout(
        () => pushThread("handler", "Stand by. Awaiting further instruction."),
        550,
      );
      return;
    }

    if (key === "q") {
      pushThread("player", "?");
      setTimeout(
        () =>
          pushThread(
            "handler",
            "You can ask for clarification once. Keep it short. Stay on task.",
          ),
        650,
      );
      return;
    }
  }

  const renderItem: ListRenderItem<(typeof thread)[number]> = ({ item: m }) => (
    <View
      style={[
        styles.bubble,
        m.from === "player" ? styles.bubbleYou : styles.bubbleHandler,
      ]}
    >
      <Text style={styles.bubbleTxt}>{m.text}</Text>
    </View>
  );

  // Keep pinned to bottom when new messages arrive
  useEffect(() => {
    if (thread.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [thread.length]);

  return (
    <PhoneFrame>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Messages</Text>
          <Pressable onPress={connectComms} style={styles.reconnectBtn}>
            <Text style={styles.reconnectTxt}>Reconnect</Text>
          </Pressable>
        </View>

        <Text style={styles.status}>{statusText}</Text>

        <View style={styles.body}>
          {thread.length === 0 ? (
            <View style={[styles.bubble, styles.bubbleHandler]}>
              <Text style={styles.bubbleTxt}>
                No messages yet. Establish a link and await instruction.
              </Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={thread}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              // THIS is the key: the list itself stops above the dock
              style={[styles.thread, { marginBottom: DOCK_TOTAL }]}
              contentContainerStyle={styles.threadContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                // keep pinned on first render/layout changes
                listRef.current?.scrollToEnd({ animated: false });
              }}
            />
          )}

          {/* Dock stays pinned; list never goes behind it now */}
          <View pointerEvents="box-none" style={styles.dockWrap}>
            <View style={styles.dockBg} pointerEvents="auto">
              <SmartReplyBar replies={replies} onPick={onPick} />
            </View>
          </View>
        </View>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    minHeight: 0,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "rgba(255,255,255,0.92)",
  },

  reconnectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  reconnectTxt: { color: "rgba(255,255,255,0.86)", fontWeight: "700" },

  status: {
    marginTop: 8,
    marginBottom: 14,
    fontSize: 13,
    color: "rgba(255,255,255,0.62)",
  },

  body: {
    flex: 1,
    minHeight: 0,
  },

  thread: {
    flex: 1,
    minHeight: 0,
  },

  // “Modern chat” (short lists sit at bottom)
  // We only need a little padding now since the viewport is shortened.
  threadContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingTop: 6,
    paddingBottom: 10,
  },

  bubble: {
    maxWidth: "86%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  bubbleHandler: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  bubbleYou: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(111,123,255,0.14)",
    borderColor: "rgba(111,123,255,0.22)",
  },
  bubbleTxt: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    lineHeight: 18,
  },

  dockWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: DOCK_TOTAL,
    justifyContent: "flex-end",
  },

  dockBg: {
    height: DOCK_TOTAL,
    paddingBottom: HOME_GESTURE_SPACE,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(20, 24, 34, 1)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
});
