import BannerComms from "@/components/BannerComms";
import HomeGestureBar from "@/components/HomeGestureBar";
import StatusBarFake from "@/components/StatusBarFake";
import GoDarkOverlay from "@/constants/goDarkOverlay";
import { useGameStore } from "@/store/useGameStore";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";

type Props = {
  children: React.ReactNode;
  overlay?: React.ReactNode;
};

export default function PhoneFrame({ children, overlay }: Props) {
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const pathname = usePathname();
  const terminalLocked = false;
  const bannerPush = useGameStore((s) => s.bannerPush);
  const ENFORCE_TERMINAL_LOCK = false;
  const startHeartbeat = useGameStore((s) => s.startHeartbeat);
  useEffect(() => {
    if (!ENFORCE_TERMINAL_LOCK) return;
    if (!terminalLocked) return;

    const onTerminal = pathname?.includes("/terminal");
    if (!onTerminal) {
      bannerPush("LOCK", "Terminal only. Do not break cover.", 1600);
      router.replace("/(tabs)/terminal");
    }
  }, [terminalLocked, pathname, router, bannerPush]);
  useEffect(() => {
    startHeartbeat();
  }, [startHeartbeat]);
  const Inner = (
    <>
      <StatusBarFake />
      <BannerComms />

      {/* Screen area */}
      <View style={styles.content}>
        <View style={styles.body}>{children}</View>

        {/* Overlays that should sit above screen content */}
        {overlay ? <View style={styles.overlay}>{overlay}</View> : null}

        {/* System gesture always bottom-most */}
        <View style={styles.gestureDock}>
          <HomeGestureBar />
        </View>
      </View>
    </>
  );

  if (!isWeb) {
    return <View style={styles.nativeScreen}>{Inner}</View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stageWeb}>
        <View style={styles.frameOuter}>
          <View style={styles.frameMetal}>
            <View style={styles.screenHousing}>
              <View style={styles.topBezel} />
              <View style={styles.screenWeb}>{Inner}</View>
              <GoDarkOverlay />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeScreen: {
    flex: 1,
    backgroundColor: "#070b18",
  },

  // The screen content area under the header/banner
  content: {
    flex: 1,
    position: "relative",
  },
  body: {
    flex: 1,
  },

  // Overlay layer (full screen area)
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  gestureDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 6,
  },

  // WEB FRAME
  stageWeb: {
    flex: 1,
    minHeight: "100vh" as any,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#060814",
  },
  frameOuter: {
    borderRadius: 42,
    padding: 6,
    backgroundColor: "#000",
  },
  frameMetal: {
    borderRadius: 36,
    padding: 4,
    backgroundColor: "rgba(210, 215, 225, 0.75)",
  },
  screenHousing: {
    position: "relative",
    borderRadius: 30,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  topBezel: {
    height: 26,
    backgroundColor: "#000",
  },
  screenWeb: {
    width: 392,
    height: 756,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
    backgroundColor: "#070b18",
  },
});
