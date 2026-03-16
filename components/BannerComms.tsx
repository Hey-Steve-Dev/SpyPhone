import { useGameStore } from "@/store/useGameStore";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const STATUS_BAR_HEIGHT = 34;
const STATUS_BAR_GAP = 40;
const HANDOFF_GRACE_MS = 500;
const HIDDEN_Y = -80;
const SWIPE_DISMISS_THRESHOLD = -28;

type BannerState = {
  on: boolean;
  title: string;
  message: string;
};

export default function BannerComms() {
  const banner = useGameStore((s) => s.banner);
  const pathname = usePathname();
  const router = useRouter();

  const y = useRef(new Animated.Value(HIDDEN_Y)).current;
  const a = useRef(new Animated.Value(0)).current;
  const swipeY = useRef(new Animated.Value(0)).current;

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAnimatedIn = useRef(false);
  const lastShownKey = useRef<string | null>(null);

  const [renderBanner, setRenderBanner] = useState<BannerState>({
    on: false,
    title: "",
    message: "",
  });
  const [isVisible, setIsVisible] = useState(false);
  const [dots, setDots] = useState("…");

  // dismiss only this exact banner payload, regardless of route
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const isMessagesRoute =
    pathname === "/messages" ||
    pathname.endsWith("/messages") ||
    pathname.includes("(tabs)/messages");

  // IMPORTANT: do not include pathname here
  const bannerKey = useMemo(() => {
    return `${banner.title || ""}__${banner.message || ""}`;
  }, [banner.title, banner.message]);

  const rawMessage = (renderBanner.message || "").trim();
  const isTyping = isVisible && rawMessage === "…";

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const animateOut = (onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(a, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(y, {
        toValue: HIDDEN_Y,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(swipeY, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hasAnimatedIn.current = false;
      onDone?.();
    });
  };

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, []);

  useEffect(() => {
    if (isMessagesRoute) {
      clearHideTimer();
      setIsVisible(false);
      hasAnimatedIn.current = false;
      animateOut();
      return;
    }

    if (banner.on) {
      clearHideTimer();

      if (dismissedKey === bannerKey) return;

      const nextBanner = {
        on: true,
        title: banner.title || "",
        message: banner.message || "",
      };

      setRenderBanner(nextBanner);

      // only re-animate if this is actually a new banner payload
      if (lastShownKey.current !== bannerKey) {
        lastShownKey.current = bannerKey;
        hasAnimatedIn.current = false;
      }

      setIsVisible(true);
      return;
    }

    if (!banner.on && isVisible) {
      clearHideTimer();

      hideTimer.current = setTimeout(() => {
        setIsVisible(false);
        setRenderBanner((prev) => ({ ...prev, on: false }));
      }, HANDOFF_GRACE_MS);
    }
  }, [banner, bannerKey, dismissedKey, isMessagesRoute, isVisible]);

  useEffect(() => {
    if (!isVisible) {
      animateOut();
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
        Animated.timing(swipeY, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // keep it visible without popping back in
      Animated.parallel([
        Animated.timing(a, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(swipeY, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, a, y, swipeY]);

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

  const handleOpenMessages = () => {
    if (!isVisible || isMessagesRoute) return;
    router.push("/messages");
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const mostlyVertical =
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
          const movingUp = gestureState.dy < -6;
          return mostlyVertical && movingUp;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy < 0) {
            swipeY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy <= SWIPE_DISMISS_THRESHOLD) {
            setDismissedKey(bannerKey);

            Animated.parallel([
              Animated.timing(a, {
                toValue: 0,
                duration: 120,
                useNativeDriver: true,
              }),
              Animated.timing(y, {
                toValue: HIDDEN_Y,
                duration: 120,
                useNativeDriver: true,
              }),
              Animated.timing(swipeY, {
                toValue: HIDDEN_Y,
                duration: 120,
                useNativeDriver: true,
              }),
            ]).start(() => {
              setIsVisible(false);
              swipeY.setValue(0);
              hasAnimatedIn.current = false;
            });
          } else {
            Animated.spring(swipeY, {
              toValue: 0,
              damping: 18,
              stiffness: 220,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(swipeY, {
            toValue: 0,
            damping: 18,
            stiffness: 220,
            useNativeDriver: true,
          }).start();
        },
      }),
    [a, y, swipeY, bannerKey],
  );

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
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          transform: [{ translateY: Animated.add(y, swipeY) }],
          opacity: a,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable onPress={handleOpenMessages} style={styles.pressable}>
        <View style={styles.banner}>
          <Text style={styles.header}>{header}</Text>
          <Text style={styles.text}>{displayMsg}</Text>
        </View>
      </Pressable>
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
