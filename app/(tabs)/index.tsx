import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type AppTile = {
  key: string;
  label: string;
  icon: string;
  route: string;
  color: string;
};

const APPS: AppTile[] = [
  {
    key: "terminal",
    label: "Terminal",
    icon: "⌘",
    route: "/terminal",
    color: "#6f7bff",
  },
  {
    key: "cameras",
    label: "Cameras",
    icon: "◫",
    route: "/cameras",
    color: "#9fa8da",
  },
  {
    key: "messages",
    label: "Coms",
    icon: "≋",
    route: "/messages",
    color: "#ff9a7a",
  },
  {
    key: "network",
    label: "Network",
    icon: "⌁",
    route: "/network",
    color: "#00bcd4",
  },
  {
    key: "echoscan",
    label: "EchoScan",
    icon: "◍",
    route: "/audio-scanner",
    color: "#5da8ff",
  },
  {
    key: "scanner",
    label: "RF Scanner",
    icon: "⌯",
    route: "/scanner",
    color: "#6df3ac",
  },
  {
    key: "jammer",
    label: "Jammer",
    icon: "≈",
    route: "/jammer",
    color: "#ff5a83",
  },
  {
    key: "notes",
    label: "Notes",
    icon: "✎",
    route: "/notes",
    color: "#cfd8dc",
  },
  {
    key: "mask",
    label: "Mask",
    icon: "◉",
    route: "/mask",
    color: "#9575cd",
  },
  {
    key: "vault",
    label: "Vault",
    icon: "▣",
    route: "/vault",
    color: "#4db6ac",
  },
  {
    key: "ops",
    label: "Ops HUD",
    icon: "◷",
    route: "/ops",
    color: "#ff7043",
  },
  {
    key: "log",
    label: "Log",
    icon: "≡",
    route: "/log",
    color: "#8fa3ff",
  },
];

const DOCK_KEYS = ["messages", "terminal"];

export default function HomePhoneScreen() {
  const router = useRouter();
  const unreadMessages = useGameStore((s) => s.unreadMessages);

  const dockApps = APPS.filter((app) => DOCK_KEYS.includes(app.key)).sort(
    (a, b) => DOCK_KEYS.indexOf(a.key) - DOCK_KEYS.indexOf(b.key),
  );

  const gridApps = APPS.filter((app) => !DOCK_KEYS.includes(app.key));

  const renderApp = (a: AppTile, inDock = false) => (
    <Pressable
      key={a.key}
      onPress={() => {
        router.push(a.route as any);
      }}
      style={({ pressed }) => [
        inDock ? styles.dockTile : styles.tile,
        pressed && styles.tilePressed,
      ]}
    >
      <View style={styles.tileInner}>
        <View
          style={[
            styles.icon,
            {
              backgroundColor: a.color + "2E",
              borderColor: a.color + "66",
            },
          ]}
        >
          <Text style={[styles.iconText, { color: a.color }]}>{a.icon}</Text>

          {a.key === "messages" && unreadMessages > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.label}>{a.label}</Text>
      </View>
    </Pressable>
  );

  return (
    <PhoneFrame showGestureBar={false}>
      <View style={styles.screen}>
        <View style={styles.mainArea}>
          <View style={styles.grid}>{gridApps.map((a) => renderApp(a))}</View>
        </View>

        <View style={styles.dockWrap}>
          <View style={styles.dock}>
            {dockApps.map((a) => renderApp(a, true))}
          </View>
        </View>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },

  mainArea: {
    flex: 1,
    justifyContent: "flex-start",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
    marginTop: 4,
  },

  tile: {
    width: "33.3333%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },

  dockTile: {
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },

  tileInner: {
    alignItems: "center",
    justifyContent: "center",
  },

  tilePressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },

  icon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
  },

  iconText: {
    fontSize: 22,
    fontWeight: "800",
    includeFontPadding: false,
    textAlign: "center",
  },

  label: {
    fontSize: 11,
    textAlign: "center",
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },

  dockWrap: {
    paddingTop: 12,
    paddingBottom: 10,
  },

  dock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff3b30",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.4)",
  },

  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});
