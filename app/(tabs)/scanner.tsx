import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const HOME_BAR_SPACE = 44;
const TACTICAL_FONT = "monospace";

type BandKey = "VHF" | "UHF" | "AIR" | "CIV";

type Channel = {
  id: string;
  band: BandKey;
  freq: string;
  label: string;
  traffic: string[];
  strength: number;
};

type LogItem = {
  id: string;
  at: number;
  freq: string;
  label: string;
  text: string;
};

const CHANNELS: Channel[] = [
  {
    id: "vhf-1",
    band: "VHF",
    freq: "154.310",
    label: "County Dispatch",
    traffic: [
      "Unit 12 copy disturbance call near the bridge.",
      "Dispatch to all units, be advised suspect vehicle last seen northbound.",
      "Unit 7 requesting backup at the east lot entrance.",
      "Signal check complete. Resume normal traffic.",
    ],
    strength: 82,
  },
  {
    id: "vhf-2",
    band: "VHF",
    freq: "155.670",
    label: "Sheriff Ops",
    traffic: [
      "Sheriff unit reporting perimeter established.",
      "Advise team two to hold until visual confirmation.",
      "Radio check, channel clear.",
      "Movement reported near service road gate.",
    ],
    strength: 71,
  },
  {
    id: "uhf-1",
    band: "UHF",
    freq: "460.225",
    label: "Metro Patrol",
    traffic: [
      "Patrol copy, subject moved through lower parking deck.",
      "Can I get another unit to camera blind spot sector C?",
      "Stand by, switching to secondary.",
      "Vehicle stop in progress, requesting plate verification.",
    ],
    strength: 67,
  },
  {
    id: "uhf-2",
    band: "UHF",
    freq: "453.900",
    label: "Transit Security",
    traffic: [
      "Security team responding to platform call.",
      "Station control reports no further visual.",
      "Sweep complete on south corridor.",
      "Crowd control requested at lower exit.",
    ],
    strength: 55,
  },
  {
    id: "air-1",
    band: "AIR",
    freq: "121.900",
    label: "Local Air Traffic",
    traffic: [
      "Ground, taxi to runway one-six via alpha.",
      "Hold short runway one-six.",
      "Cleared for departure, wind calm.",
      "Contact tower on one-one-eight point five.",
    ],
    strength: 44,
  },
  {
    id: "civ-1",
    band: "CIV",
    freq: "27.185",
    label: "Open Civilian Band",
    traffic: [
      "Anyone copy on this side of town?",
      "Signal fading in and out, say again.",
      "Passing through with a weak carrier.",
      "Channel noisy tonight, lots of interference.",
    ],
    strength: 38,
  },
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]) {
  return arr[rand(0, arr.length - 1)];
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function ScannerScreen() {
  const [lastTrafficAt, setLastTrafficAt] = useState(0);
  const [band, setBand] = useState<BandKey | "ALL">("ALL");
  const [isScanning, setIsScanning] = useState(true);
  const [isHold, setIsHold] = useState(false);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(
    CHANNELS[0],
  );
  const [signal, setSignal] = useState(0);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [noiseText, setNoiseText] = useState("Scanning spectrum...");
  const sweep = useRef(new Animated.Value(0)).current;
  const logScrollRef = useRef<ScrollView | null>(null);

  const visibleChannels = useMemo(() => {
    if (band === "ALL") return CHANNELS;
    return CHANNELS.filter((c) => c.band === band);
  }, [band]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  useEffect(() => {
    if (!activeChannel) return;
    setSignal(activeChannel.strength);
  }, [activeChannel]);

  useEffect(() => {
    if (!isScanning || isHold || visibleChannels.length === 0) return;

    const interval = setInterval(() => {
      const next = pick(visibleChannels);
      setActiveChannel(next);

      const now = Date.now();
      const trafficCooldownMs = 9000;
      const canFireTraffic = now - lastTrafficAt >= trafficCooldownMs;
      const hasTraffic = canFireTraffic && Math.random() > 0.82;

      if (hasTraffic) {
        const nextText = pick(next.traffic);
        const nextSignal = Math.max(
          18,
          Math.min(100, next.strength + rand(-12, 10)),
        );

        setSignal(nextSignal);
        setNoiseText("Carrier lock detected");
        setLastTrafficAt(now);

        setLogs((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            at: Date.now(),
            freq: next.freq,
            label: next.label,
            text: nextText,
          },
        ]);
      } else {
        setSignal(rand(8, 22));
        setNoiseText("Static / weak modulation");
      }
    }, 5200);

    return () => clearInterval(interval);
  }, [isScanning, isHold, visibleChannels, lastTrafficAt]);
  useEffect(() => {
    if (!isHold || !activeChannel) return;

    const interval = setInterval(() => {
      const chance = Math.random();
      if (chance > 2.62) {
        const msg = pick(activeChannel.traffic);
        setSignal(
          Math.max(20, Math.min(100, activeChannel.strength + rand(-10, 8))),
        );
        setNoiseText("Locked to active channel");

        setLogs((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            at: Date.now(),
            freq: activeChannel.freq,
            label: activeChannel.label,
            text: msg,
          },
        ]);
      } else {
        setSignal(rand(12, 28));
        setNoiseText("Monitoring...");
      }
    }, 4200);

    return () => clearInterval(interval);
  }, [isHold, activeChannel]);

  useEffect(() => {
    if (!logs.length) return;
    const t = setTimeout(() => {
      logScrollRef.current?.scrollToEnd({ animated: true });
    }, 40);
    return () => clearTimeout(t);
  }, [logs]);

  const sweepTranslate = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-260, 260],
  });

  function handleScanToggle() {
    setIsScanning((prev) => {
      const next = !prev;
      if (next) {
        setIsHold(false);
        setNoiseText("Scanning spectrum...");
      } else {
        setNoiseText("Scanner paused");
      }
      return next;
    });
  }

  function handleHoldToggle() {
    if (!activeChannel) return;
    setIsHold((prev) => {
      const next = !prev;
      if (next) {
        setIsScanning(true);
        setNoiseText("Locked to active channel");
      } else {
        setNoiseText("Scanning spectrum...");
      }
      return next;
    });
  }

  function handleStepChannel(dir: 1 | -1) {
    if (!visibleChannels.length) return;
    const currentIndex = activeChannel
      ? visibleChannels.findIndex((c) => c.id === activeChannel.id)
      : 0;
    const baseIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex =
      (baseIndex + dir + visibleChannels.length) % visibleChannels.length;
    const next = visibleChannels[nextIndex];
    setActiveChannel(next);
    setSignal(next.strength);
    setNoiseText("Manual tune");
    setIsHold(true);
    setIsScanning(true);
  }

  function clearLog() {
    setLogs([]);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Scanner</Text>
          <Text style={styles.headerSub}>RF sweep / intercept monitor</Text>
        </View>

        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              isScanning ? styles.dotOn : styles.dotOff,
            ]}
          />
          <Text style={styles.statusText}>
            {isHold ? "HOLD" : isScanning ? "SCAN" : "PAUSE"}
          </Text>
        </View>
      </View>

      <View style={styles.screenCard}>
        <View style={styles.screenTop}>
          <Text style={styles.bandText}>
            {activeChannel?.band ?? "---"} BAND
          </Text>
          <Text style={styles.freqText}>{activeChannel?.freq ?? "---.--"}</Text>
          <Text style={styles.labelText}>
            {activeChannel?.label ?? "No signal selected"}
          </Text>
        </View>

        <View style={styles.scopeWrap}>
          <View style={styles.scopeGrid}>
            <Animated.View
              style={[
                styles.sweepLine,
                { transform: [{ translateX: sweepTranslate }] },
              ]}
            />
          </View>
          <Text style={styles.scopeStatus}>{noiseText}</Text>
        </View>

        <View style={styles.meterRow}>
          <Text style={styles.meterLabel}>SIG</Text>
          <View style={styles.meterTrack}>
            <View style={[styles.meterFill, { width: `${signal}%` }]} />
          </View>
          <Text style={styles.meterValue}>{signal}%</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bandRow}
      >
        {(["ALL", "VHF", "UHF", "AIR", "CIV"] as const).map((item) => {
          const active = band === item;
          return (
            <Pressable
              key={item}
              onPress={() => setBand(item)}
              style={[styles.bandBtn, active && styles.bandBtnActive]}
            >
              <Text
                style={[styles.bandBtnText, active && styles.bandBtnTextActive]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.controlsRow}>
        <Pressable
          style={styles.controlBtn}
          onPress={() => handleStepChannel(-1)}
        >
          <Text style={styles.controlBtnText}>◀ PREV</Text>
        </Pressable>

        <Pressable
          style={[styles.controlBtn, styles.primaryBtn]}
          onPress={handleScanToggle}
        >
          <Text style={[styles.controlBtnText, styles.primaryBtnText]}>
            {isScanning ? "PAUSE" : "SCAN"}
          </Text>
        </Pressable>

        <Pressable style={styles.controlBtn} onPress={handleHoldToggle}>
          <Text style={styles.controlBtnText}>
            {isHold ? "RELEASE" : "HOLD"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.controlBtn}
          onPress={() => handleStepChannel(1)}
        >
          <Text style={styles.controlBtnText}>NEXT ▶</Text>
        </Pressable>
      </View>

      <View style={styles.logHeader}>
        <Text style={styles.logTitle}>Traffic Log</Text>
        <Pressable onPress={clearLog}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={logScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.logContent}
        style={styles.logCard}
      >
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>
            No intercepted traffic yet. Start scanning to populate the feed.
          </Text>
        ) : (
          logs.map((item) => (
            <View key={item.id} style={styles.logItem}>
              <View style={styles.logTop}>
                <Text style={styles.logFreq}>{item.freq}</Text>
                <Text style={styles.logTime}>{fmtTime(item.at)}</Text>
              </View>
              <Text style={styles.logLabel}>{item.label}</Text>
              <Text style={styles.logText}>{item.text}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 14,
    paddingBottom: HOME_BAR_SPACE + 18,
    backgroundColor: "#06100c",
  },

  header: {
    paddingHorizontal: 4,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#e6fff1",
    fontFamily: TACTICAL_FONT,
    letterSpacing: 0.8,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#88b8a1",
    fontFamily: TACTICAL_FONT,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#2f694f",
    backgroundColor: "#0d1b15",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  dotOn: {
    backgroundColor: "#67f0a8",
  },
  dotOff: {
    backgroundColor: "#4f6b5d",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#c7ffe2",
    fontFamily: TACTICAL_FONT,
  },

  screenCard: {
    borderRadius: 3,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2a5f47",
    backgroundColor: "#0a1511",
    marginBottom: 12,
    shadowColor: "#67f0a8",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  screenTop: {
    marginBottom: 12,
  },
  bandText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#8df5bb",
    marginBottom: 4,
    fontFamily: TACTICAL_FONT,
  },
  freqText: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#effff7",
    fontFamily: TACTICAL_FONT,
  },
  labelText: {
    marginTop: 4,
    fontSize: 13,
    color: "#9ec4b1",
    fontFamily: TACTICAL_FONT,
  },

  scopeWrap: {
    marginTop: 4,
    marginBottom: 12,
  },
  scopeGrid: {
    height: 84,
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2f694f",
    backgroundColor: "#06100c",
    position: "relative",
  },
  sweepLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(116,255,197,0.75)",
    shadowColor: "#7effc3",
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  scopeStatus: {
    marginTop: 8,
    fontSize: 12,
    color: "#88b8a1",
    fontFamily: TACTICAL_FONT,
  },

  meterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  meterLabel: {
    width: 26,
    fontSize: 11,
    fontWeight: "800",
    color: "#88b8a1",
    fontFamily: TACTICAL_FONT,
  },
  meterTrack: {
    flex: 1,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#0b1712",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2a5f47",
  },
  meterFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#6df3ac",
  },
  meterValue: {
    width: 42,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "700",
    color: "#b8e6cb",
    fontFamily: TACTICAL_FONT,
  },

  bandRow: {
    paddingBottom: 10,
    gap: 6,
  },
  bandBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#2a5f47",
    backgroundColor: "#0a1511",
    minHeight: 0,
  },
  bandBtnActive: {
    borderColor: "#67f0a8",
    backgroundColor: "#123124",
  },
  bandBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9ec4b1",
    fontFamily: TACTICAL_FONT,
  },
  bandBtnTextActive: {
    color: "#d9ffee",
  },

  controlsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  controlBtn: {
    flexGrow: 1,
    minWidth: "22%",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a5f47",
    backgroundColor: "#0a1511",
  },
  primaryBtn: {
    borderColor: "#67f0a8",
    backgroundColor: "#123124",
  },
  controlBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#c7ffe2",
    fontFamily: TACTICAL_FONT,
  },
  primaryBtnText: {
    color: "#e9fff3",
  },

  logHeader: {
    paddingHorizontal: 4,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#e6fff1",
    fontFamily: TACTICAL_FONT,
  },
  clearText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8df5bb",
    fontFamily: TACTICAL_FONT,
  },

  logCard: {
    flex: 1,
    minHeight: 320,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#2a5f47",
    backgroundColor: "#0a1511",
  },
  logContent: {
    padding: 12,
    paddingBottom: 18,
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#7eaa94",
    fontFamily: TACTICAL_FONT,
  },
  logItem: {
    borderRadius: 3,
    padding: 10,
    borderWidth: 1,
    borderColor: "#214b39",
    backgroundColor: "#08110d",
  },
  logTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  logFreq: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9ef8c8",
    fontFamily: TACTICAL_FONT,
  },
  logTime: {
    fontSize: 11,
    color: "#7eaa94",
    fontFamily: TACTICAL_FONT,
  },
  logLabel: {
    marginBottom: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#b4d9c4",
    fontFamily: TACTICAL_FONT,
  },
  logText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#e8fff1",
    fontFamily: TACTICAL_FONT,
  },
});
