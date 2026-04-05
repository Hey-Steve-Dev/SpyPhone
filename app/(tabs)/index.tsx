import { useGameStore } from "@/store/useGameStore";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  ImageSourcePropType,
  Platform,
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

const TACTICAL_FONT = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

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
    label: "Comms",
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

const DOCK_KEYS = ["messages", "tunnel", "terminal"];
const TRACE_SEGMENTS = 16;

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function HomePhoneScreen() {
  const router = useRouter();

  const unreadMessages = useGameStore((s) => s.unreadMessages);
  const secondsLeft = useGameStore((s) => s.secondsLeft);
  const trace = useGameStore((s) => s.trace);
  const timerRunning = useGameStore((s) => s.timerRunning);

  const activeTraceSegments = Math.max(
    0,
    Math.min(
      TRACE_SEGMENTS,
      Math.round((Math.max(0, Math.min(100, trace)) / 100) * TRACE_SEGMENTS),
    ),
  );

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

        <Text style={styles.label}>{a.label.toUpperCase()}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <Image
        source={gunmetalBg}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <View style={styles.topPanels}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelLabel}>MISSION TIMER</Text>
            <View
              style={[styles.panelDot, !timerRunning && styles.panelDotPaused]}
            />
          </View>

          <Text style={styles.timerValue}>{formatTime(secondsLeft)}</Text>

          <View style={styles.panelFooter}>
            <Text style={styles.panelFooterText}>
              {timerRunning ? "COUNTDOWN ACTIVE" : "PAUSED"}
            </Text>
            <View style={styles.scanLine} />
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelLabel}>TRACE LOG</Text>
            <Text style={styles.panelMiniValue}>{trace}%</Text>
          </View>

          <View style={styles.traceMeter}>
            {Array.from({ length: TRACE_SEGMENTS }).map((_, i) => (
              <View
                key={`trace-${i}`}
                style={[
                  styles.traceSegment,
                  i < activeTraceSegments && styles.traceSegmentActive,
                  trace >= 80 &&
                    i < activeTraceSegments &&
                    styles.traceSegmentDanger,
                ]}
              />
            ))}
          </View>

          <View style={styles.panelFooter}>
            <Text style={styles.panelFooterText}>
              {trace >= 80
                ? "CRITICAL SIGNATURE"
                : trace >= 50
                  ? "ELEVATED DETECTION"
                  : "LOW SIGNATURE"}
            </Text>
            <View style={styles.scanLine} />
          </View>
        </View>
      </View>

      <View style={styles.mainArea}>
        <View style={styles.grid}>{gridApps.map((a) => renderApp(a))}</View>
      </View>

      <View style={styles.dockWrap}>
        <View style={styles.dock}>
          {dockApps.map((a) => renderApp(a, true))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    backgroundColor: "#11161c",
    overflow: "hidden",
  },

  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "auto",
    height: "auto",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 10, 14, 0.22)",
  },

  topPanels: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  panel: {
    flex: 1,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 7,
    borderRadius: 11,
    backgroundColor: "rgba(13, 14, 16, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(255, 133, 44, 0.22)",
    shadowColor: "#ff8a3d",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  panelLabel: {
    color: "rgba(255, 177, 118, 0.76)",
    fontSize: 8,
    letterSpacing: 1.3,
    fontFamily: TACTICAL_FONT,
    fontWeight: "700",
  },

  panelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ff9f5c",
    shadowColor: "#ff9f5c",
    shadowOpacity: 0.7,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },

  panelDotPaused: {
    backgroundColor: "rgba(255, 159, 92, 0.45)",
    shadowOpacity: 0.2,
  },

  timerValue: {
    color: "#ffb16a",
    fontSize: 18,
    letterSpacing: 2.2,
    fontFamily: TACTICAL_FONT,
    fontWeight: "700",
    textShadowColor: "rgba(255, 140, 60, 0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    marginBottom: 6,
  },

  panelMiniValue: {
    color: "#ffb16a",
    fontSize: 12,
    letterSpacing: 1.4,
    fontFamily: TACTICAL_FONT,
    fontWeight: "700",
    textShadowColor: "rgba(255, 140, 60, 0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },

  traceMeter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 3,
    marginBottom: 7,
  },

  traceSegment: {
    flex: 1,
    height: 8,
    borderRadius: 2,
    backgroundColor: "rgba(255, 150, 70, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 145, 58, 0.08)",
  },

  traceSegmentActive: {
    backgroundColor: "rgba(255, 164, 92, 0.88)",
    borderColor: "rgba(255, 211, 170, 0.16)",
    shadowColor: "#ff9a52",
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },

  traceSegmentDanger: {
    backgroundColor: "rgba(255, 112, 72, 0.95)",
    borderColor: "rgba(255, 190, 170, 0.22)",
    shadowColor: "#ff6f48",
  },

  panelFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  panelFooterText: {
    color: "rgba(255, 177, 118, 0.56)",
    fontSize: 7,
    letterSpacing: 1.1,
    fontFamily: TACTICAL_FONT,
    fontWeight: "700",
  },

  scanLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 139, 58, 0.26)",
  },

  mainArea: {
    flex: 1,
    justifyContent: "flex-start",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
    marginTop: 2,
  },

  tile: {
    width: "33.3333%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },

  dockTile: {
    width: "31%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
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
    width: 68,
    height: 68,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(12,15,20,0.18)",
    position: "relative",
    overflow: "visible",
  },

  iconImage: {
    width: "100%",
    height: "100%",
  },

  label: {
    fontSize: 9,
    textAlign: "center",
    color: "rgba(255,255,255,0.82)",
    fontWeight: "700",
    letterSpacing: 0.8,
    fontFamily: TACTICAL_FONT,
  },

  dockWrap: {
    paddingTop: 10,
    paddingBottom: 10,
  },

  dock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
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
    fontFamily: TACTICAL_FONT,
  },
});
