import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const gunmetalBg = require("@/assets/images/gunmetal-bg.png");

const terminalIcon = require("@/assets/icons/icon-terminal.png");
const camerasIcon = require("@/assets/icons/icon-cameras.png");
const comsIcon = require("@/assets/icons/icon-coms.png");
const networkIcon = require("@/assets/icons/icon-network.png");
const echoscanIcon = require("@/assets/icons/icon-echoscan.png");
const rfScannerIcon = require("@/assets/icons/icon-rf-scanner.png");
const jammerIcon = require("@/assets/icons/icon-jammer.png");
const notesIcon = require("@/assets/icons/icon-notes.png");
const maskIcon = require("@/assets/icons/icon-mask.png");
const vaultIcon = require("@/assets/icons/icon-vault.png");
const logIcon = require("@/assets/icons/icon-log.png");
const tunnelIcon = require("@/assets/icons/icon-tunnel.png");

type AppTile = {
  key: string;
  label: string;
  icon: ImageSourcePropType;
  route: string;
};

const APPS: AppTile[] = [
  {
    key: "terminal",
    label: "Terminal",
    icon: terminalIcon,
    route: "/terminal",
  },
  {
    key: "cameras",
    label: "Cameras",
    icon: camerasIcon,
    route: "/cameras",
  },
  {
    key: "messages",
    label: "Coms",
    icon: comsIcon,
    route: "/messages",
  },
  {
    key: "network",
    label: "Network",
    icon: networkIcon,
    route: "/network",
  },
  {
    key: "echoscan",
    label: "EchoScan",
    icon: echoscanIcon,
    route: "/audio-scanner",
  },
  {
    key: "scanner",
    label: "RF Scanner",
    icon: rfScannerIcon,
    route: "/scanner",
  },
  {
    key: "jammer",
    label: "Jammer",
    icon: jammerIcon,
    route: "/jammer",
  },
  {
    key: "notes",
    label: "Notes",
    icon: notesIcon,
    route: "/notes",
  },
  {
    key: "mask",
    label: "Mask",
    icon: maskIcon,
    route: "/mask",
  },
  {
    key: "vault",
    label: "Vault",
    icon: vaultIcon,
    route: "/vault",
  },
  {
    key: "log",
    label: "Log",
    icon: logIcon,
    route: "/log",
  },
  {
    key: "tunnel",
    label: "Tunnel",
    icon: tunnelIcon,
    route: "/tunnel",
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
      onPress={() => router.push(a.route as any)}
      style={({ pressed }) => [
        inDock ? styles.dockTile : styles.tile,
        pressed && styles.tilePressed,
      ]}
    >
      <View style={styles.tileInner}>
        <View style={styles.icon}>
          <Image
            source={a.icon}
            style={styles.iconImage}
            resizeMode="contain"
          />

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
        <Image
          source={gunmetalBg}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />

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
    backgroundColor: "#11161c",
    overflow: "hidden",
  },

  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 10, 14, 0.22)",
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
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",

    position: "relative",
  },

  iconImage: {
    width: "100%",
    height: "100%",
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
    backgroundColor: "rgba(20,24,30,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#b23a32",
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
