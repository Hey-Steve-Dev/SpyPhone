import { useGameStore } from "@/store/useGameStore";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";

const STATUS_BAR_HEIGHT = 34;
const STATUS_BAR_GAP = 40;
const HANDOFF_GRACE_MS = 350;
const SWIPE_DISMISS_THRESHOLD = 36;
const TAP_MOVE_TOLERANCE = 8;
const DISMISS_TO_Y = -180;

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
  const [visibleBanner, setVisibleBanner] = useState<BannerState>({
    on: false,
    title: "",
    message: "",
  });

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const isDismissing = useRef(false);
  const gestureHandled = useRef(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

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
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    if (isDragging.current || isDismissing.current) return;

    if (banner.on) {
      translateY.setValue(0);
      opacity.setValue(1);

      setVisibleBanner({
        on: true,
        title: banner.title || "",
        message: banner.message || "",
      });
      return;
    }

    hideTimer.current = setTimeout(() => {
      if (isDragging.current || isDismissing.current) return;

      setVisibleBanner((prev) => ({
        ...prev,
        on: false,
      }));
      translateY.setValue(0);
      opacity.setValue(1);
    }, HANDOFF_GRACE_MS);
  }, [banner.on, banner.title, banner.message, opacity, translateY]);

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

  const animateBackToRest = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isDragging.current = false;
      gestureHandled.current = false;
    });
  };

  const animateDismiss = () => {
    if (isDismissing.current) return;

    isDragging.current = false;
    isDismissing.current = true;
    gestureHandled.current = true;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: DISMISS_TO_Y,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;

      setDismissedKey(visibleBannerKey);
      setVisibleBanner((prev) => ({
        ...prev,
        on: false,
      }));

      translateY.setValue(0);
      opacity.setValue(1);
      isDismissing.current = false;
      gestureHandled.current = false;
    });
  };

  const handleTapOpen = () => {
    if (isDragging.current || isDismissing.current || gestureHandled.current) {
      return;
    }
    router.push("/messages");
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 4 || Math.abs(gestureState.dx) > 4;
      },
      onPanResponderGrant: () => {
        if (hideTimer.current) {
          clearTimeout(hideTimer.current);
          hideTimer.current = null;
        }

        gestureHandled.current = false;

        translateY.stopAnimation();
        opacity.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isDismissing.current) return;

        const movedEnough =
          Math.abs(gestureState.dy) > 2 || Math.abs(gestureState.dx) > 2;

        if (movedEnough) {
          isDragging.current = true;
        }

        const nextY = Math.min(0, gestureState.dy);
        translateY.setValue(nextY);

        const nextOpacity = Math.max(0.2, 1 - Math.abs(nextY) / 180);
        opacity.setValue(nextOpacity);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isDismissing.current) return;

        const absDx = Math.abs(gestureState.dx);
        const absDy = Math.abs(gestureState.dy);
        const isTap = absDx < TAP_MOVE_TOLERANCE && absDy < TAP_MOVE_TOLERANCE;
        const dismissByDistance = gestureState.dy <= -SWIPE_DISMISS_THRESHOLD;
        const dismissByVelocity = gestureState.vy <= -0.75;

        if (isTap) {
          translateY.setValue(0);
          opacity.setValue(1);
          isDragging.current = false;
          handleTapOpen();
          return;
        }

        if (dismissByDistance || dismissByVelocity) {
          animateDismiss();
          return;
        }

        animateBackToRest();
      },
      onPanResponderTerminate: () => {
        if (isDismissing.current) return;
        animateBackToRest();
      },
    }),
  ).current;

  if (
    (!visibleBanner.on && !isDismissing.current) ||
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
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.banner,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <Text style={styles.header}>{header}</Text>
        <Text style={styles.text}>{displayMsg}</Text>
      </Animated.View>
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
    marginTop: -40,
  },

  banner: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#1a1f2b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 12,
    paddingHorizontal: 14,
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
