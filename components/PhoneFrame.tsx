import BannerComms from "@/components/BannerComms";
import HomeGestureBar from "@/components/HomeGestureBar";
import StatusBarFake from "@/components/StatusBarFake";
import GoDarkOverlay from "@/constants/goDarkOverlay";
import { useGameStore } from "@/store/useGameStore";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  showGestureBar?: boolean;
};

export default function PhoneFrame({
  children,
  overlay,
  showGestureBar = true,
}: Props) {
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

      <View style={styles.content}>
        <View style={styles.body}>{children}</View>

        {overlay ? <View style={styles.overlay}>{overlay}</View> : null}

        {isWeb && showGestureBar ? (
          <View style={styles.gestureDock}>
            <HomeGestureBar />
          </View>
        ) : null}
      </View>
    </>
  );

  if (!isWeb) {
    return (
      <SafeAreaView style={styles.nativeScreen} edges={["bottom"]}>
        <View style={styles.nativeFrame}>
          {Inner}
          <GoDarkOverlay />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.stageWeb}>
        <View style={styles.frameOuter}>
          <View style={styles.frameMetal}>
            <View style={styles.screenHousing}>
              <View style={styles.topBezel} />
              <View style={styles.screenWeb}>
                {Inner}
                <GoDarkOverlay />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  nativeScreen: {
    flex: 1,
    backgroundColor: "#070b18",
  },

  nativeFrame: {
    flex: 1,
    position: "relative",
  },

  content: {
    flex: 1,
    position: "relative",
  },

  body: {
    flex: 1,
  },

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
