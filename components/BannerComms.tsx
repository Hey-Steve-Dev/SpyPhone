import { useGameStore } from "@/store/useGameStore";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const STATUS_BAR_HEIGHT = 34;
const STATUS_BAR_GAP = 40;
const SWIPE_DISMISS_THRESHOLD = 28;
const HANDOFF_GRACE_MS = 350;

type BannerState = {
  on: boolean;
  title: string;
  message: string;
};

export default function BannerComms() {
  const banner = useGameStore((s) => s.banner);
  const pathname = usePathname();
  const router = useRouter();

  const [dots, setDots] = useState("…");
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const [visibleBanner, setVisibleBanner] = useState<BannerState>({
    on: false,
    title: "",
    message: "",
  });

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMessagesRoute =
    pathname === "/messages" ||
    pathname.endsWith("/messages") ||
    pathname.includes("(tabs)/messages");

  const liveBannerKey = useMemo(() => {
    return `${banner.title || ""}__${banner.message || ""}`;
  }, [banner.title, banner.message]);

  const visibleBannerKey = useMemo(() => {
    return `${visibleBanner.title || ""}__${visibleBanner.message || ""}`;
  }, [visibleBanner.title, visibleBanner.message]);

  const rawMessage = (visibleBanner.message || "").trim();
  const isTyping = visibleBanner.on && rawMessage === "…";

  useEffect(() => {
    if (dismissedKey && dismissedKey !== liveBannerKey) {
      setDismissedKey(null);
    }
  }, [liveBannerKey, dismissedKey]);

  useEffect(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    if (banner.on) {
      setVisibleBanner({
        on: true,
        title: banner.title || "",
        message: banner.message || "",
      });
      return;
    }

    hideTimer.current = setTimeout(() => {
      setVisibleBanner((prev) => ({
        ...prev,
        on: false,
      }));
    }, HANDOFF_GRACE_MS);

    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [banner.on, banner.title, banner.message]);

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

  if (
    !visibleBanner.on ||
    isMessagesRoute ||
    dismissedKey === visibleBannerKey
  ) {
    return null;
  }

  const title = (visibleBanner.title || "").trim();
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
            setDismissedKey(visibleBannerKey);
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
