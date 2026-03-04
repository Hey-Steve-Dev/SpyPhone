import PhoneFrame from "@/components/PhoneFrame";
import SmartReplyBar from "@/components/SmartReplyBar";
import { useGameStore } from "@/store/useGameStore";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Msg = {
  id: string;
  from: "handler" | "you";
  text: string;
};

export default function MessagesScreen() {
  const commsConnected = useGameStore((s) => s.commsConnected);
  const commsConnecting = useGameStore((s) => s.commsConnecting);
  const commsJammed = useGameStore((s) => s.commsJammed);
  const connectComms = useGameStore((s) => s.connectComms);
  const bannerPush = useGameStore((s) => s.bannerPush);

  const [thread, setThread] = useState<Msg[]>([
    {
      id: "h1",
      from: "handler",
      text: "Stand by. Awaiting further instruction.",
    },
  ]);

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

  function pushYou(text: string) {
    setThread((t) => [...t, { id: "y" + Date.now(), from: "you", text }]);
  }

  function pushHandler(text: string) {
    setThread((t) => [...t, { id: "h" + Date.now(), from: "handler", text }]);
  }

  function onPick(key: string) {
    if (!commsConnected) {
      bannerPush("COMMS", "No link. Unable to send.", 1800);
      return;
    }

    if (key === "onit") {
      pushYou("On it.");
      setTimeout(() => pushHandler("Good. Hold position."), 500);
      return;
    }

    if (key === "repeat") {
      pushYou("Repeat.");
      setTimeout(
        () => pushHandler("Stand by. Awaiting further instruction."),
        550,
      );
      return;
    }

    if (key === "q") {
      pushYou("?");
      setTimeout(
        () =>
          pushHandler(
            "You can ask for clarification once. Keep it short. Stay on task.",
          ),
        650,
      );
      return;
    }
  }

  return (
    <PhoneFrame
      overlay={
        <View style={styles.replyDock}>
          <SmartReplyBar replies={replies} onPick={onPick} />
        </View>
      }
    >
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Messages</Text>
          <Pressable onPress={connectComms} style={styles.reconnectBtn}>
            <Text style={styles.reconnectTxt}>Reconnect</Text>
          </Pressable>
        </View>

        <Text style={styles.status}>{statusText}</Text>

        <View style={styles.thread}>
          {thread.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubble,
                m.from === "you" ? styles.bubbleYou : styles.bubbleHandler,
              ]}
            >
              <Text style={styles.bubbleTxt}>{m.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  replyDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 34, // above home gesture bar
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

  thread: {
    flex: 1,
    gap: 10,
    paddingBottom: 10,
  },

  bubble: {
    maxWidth: "86%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
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
});
