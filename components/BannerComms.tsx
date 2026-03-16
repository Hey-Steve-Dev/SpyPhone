import { useGameStore } from "@/store/useGameStore";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const STATUS_BAR_HEIGHT = 34;
const STATUS_BAR_GAP = 40;
const SWIPE_DISMISS_THRESHOLD = 28;

export default function BannerComms() {
  const banner = useGameStore((s) => s.banner);
  const pathname = usePathname();
  const router = useRouter();

  const [dots, setDots] = useState("…");
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const isMessagesRoute =
    pathname === "/messages" ||
    pathname.endsWith("/messages") ||
    pathname.includes("(tabs)/messages");

  const bannerKey = useMemo(() => {
    return `${banner.title || ""}__${banner.message || ""}`;
  }, [banner.title, banner.message]);

  const rawMessage = (banner.message || "").trim();
  const isTyping = banner.on && rawMessage === "…";

  useEffect(() => {
    if (dismissedKey && dismissedKey !== bannerKey) {
      setDismissedKey(null);
    }
  }, [bannerKey, dismissedKey]);

  useEffect(() => {
    if (!isTyping) {
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
  }, [isTyping]);

  if (!banner.on || isMessagesRoute || dismissedKey === bannerKey) return null;

  const title = (banner.title || "").trim();
  const msg = rawMessage;

  const header =
    title.length > 0 && title.toLowerCase() !== "secure comms"
      ? title.toUpperCase()
      : "OPS";

  const displayMsg = isTyping ? dots : msg;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable
        onPress={() => router.push("/messages")}
        onTouchStart={(e) => setTouchStartY(e.nativeEvent.pageY)}
        onTouchEnd={(e) => {
          if (touchStartY == null) return;
          const deltaY = e.nativeEvent.pageY - touchStartY;
          if (deltaY <= -SWIPE_DISMISS_THRESHOLD) {
            setDismissedKey(bannerKey);
          }
          setTouchStartY(null);
        }}
        style={styles.pressable}
      >
        <View style={styles.banner}>
          <Text style={styles.header}>{header}</Text>
          <Text style={styles.text}>{displayMsg}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: STATUS_BAR_HEIGHT + STATUS_BAR_GAP,
    paddingHorizontal: 10,
    zIndex: 100,
    marginTop: 16,
  },

  pressable: {
    width: "100%",
  },

  banner: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#1a1f2b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  header: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 4,
  },

  text: {
    fontSize: 14,
    lineHeight: 18,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
  },
});
