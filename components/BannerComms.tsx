import { useGameStore } from "@/store/useGameStore";
import { usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

const STATUS_BAR_HEIGHT = 34;
const STATUS_BAR_GAP = 40;
const HANDOFF_GRACE_MS = 500;

type BannerState = {
  on: boolean;
  title: string;
  message: string;
};

export default function BannerComms() {
  const banner = useGameStore((s) => s.banner);
  const pathname = usePathname();

  const y = useRef(new Animated.Value(-80)).current;
  const a = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAnimatedIn = useRef(false);

  const [renderBanner, setRenderBanner] = useState<BannerState>({
    on: false,
    title: "",
    message: "",
  });
  const [isVisible, setIsVisible] = useState(false);
  const [dots, setDots] = useState("…");

  const isMessagesRoute =
    pathname === "/messages" ||
    pathname.endsWith("/messages") ||
    pathname.includes("(tabs)/messages");

  const isTyping = isVisible && (renderBanner.message || "").trim() === "…";

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (isMessagesRoute) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setIsVisible(false);
      setRenderBanner({
        on: false,
        title: "",
        message: "",
      });
      hasAnimatedIn.current = false;

      Animated.parallel([
        Animated.timing(a, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: -80,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();

      return;
    }

    if (banner.on) {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }

      setRenderBanner({
        on: true,
        title: banner.title || "",
        message: banner.message || "",
      });
      setIsVisible(true);
      return;
    }

    if (!banner.on && isVisible) {
      hideTimer.current = setTimeout(() => {
        setIsVisible(false);
        setRenderBanner((prev) => ({ ...prev, on: false }));
      }, HANDOFF_GRACE_MS);
    }
  }, [banner, isMessagesRoute, isVisible, a, y]);

  useEffect(() => {
    if (!isVisible) {
      hasAnimatedIn.current = false;
      Animated.parallel([
        Animated.timing(a, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: -80,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!hasAnimatedIn.current) {
      hasAnimatedIn.current = true;
      Animated.parallel([
        Animated.spring(y, {
          toValue: 0,
          damping: 18,
          stiffness: 240,
          useNativeDriver: true,
        }),
        Animated.timing(a, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(a, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, a, y]);

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

  if (!isVisible || isMessagesRoute) return null;

  const title = (renderBanner.title || "").trim();
  const msg = (renderBanner.message || "").trim();

  const header =
    title.length > 0 && title.toLowerCase() !== "secure comms"
      ? title.toUpperCase()
      : "OPS";

  const displayMsg = isTyping ? dots : msg;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          transform: [{ translateY: y }],
          opacity: a,
        },
      ]}
    >
      <View style={styles.banner}>
        <Text style={styles.header}>{header}</Text>
        <Text style={styles.text}>{displayMsg}</Text>
      </View>
    </Animated.View>
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
