import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";

type LogItem = {
  id: string;
  at: number;
  text: string;
};

type BandKey = "VHF" | "UHF" | "LTE" | "SAT" | "WIFI";

type BandCfg = {
  key: BandKey;
  label: string;
  desc: string;
};

const BANDS: BandCfg[] = [
  { key: "VHF", label: "VHF", desc: "Short-range analog / legacy repeaters" },
  { key: "UHF", label: "UHF", desc: "Urban penetration / tactical radios" },
  { key: "LTE", label: "LTE", desc: "Cellular towers / consumer backhaul" },
  { key: "SAT", label: "SAT", desc: "Burst uplinks / high visibility" },
  { key: "WIFI", label: "Wi-Fi", desc: "Local APs / opportunistic" },
];

function ts(at: number) {
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// A small, deterministic-ish “sensor” model for the UI (no external libs)
function computeThreatLevel(commsJammed: boolean, strength: number) {
  const base = commsJammed ? 22 : 58;
  const swing = commsJammed ? (100 - strength) * 0.25 : strength * 0.25;
  return clamp(Math.round(base + swing), 8, 92);
}

export default function JammerScreen() {
  const commsConnected = useGameStore((s) => s.commsConnected);
  const commsConnecting = useGameStore((s) => s.commsConnecting);
  const commsJammed = useGameStore((s) => s.commsJammed);

  const connectComms = useGameStore((s) => s.connectComms);
  const setCommsJammed = useGameStore((s) => s.setCommsJammed);

  const bannerPush = useGameStore((s) => s.bannerPush);
  const pushThread = useGameStore((s) => s.pushThread);

  // ✅ store-backed jammer config
  const jammer = useGameStore((s) => s.jammer);
  const setJammer = useGameStore((s) => s.setJammer);

  const [tab, setTab] = useState<"log" | "settings">("log");

  const [log, setLog] = useState<LogItem[]>([
    { id: makeId(), at: Date.now(), text: "Jammer console online." },
    { id: makeId(), at: Date.now(), text: "RF front-end warmed." },
  ]);

  // Log list ref for autoscroll
  const logRef = useRef<FlatList<LogItem>>(null);

  const statusText = useMemo(() => {
    if (commsJammed) return "MASK ACTIVE";
    if (commsConnecting) return "LINK NEGOTIATING";
    if (commsConnected) return "LINK UP";
    return "OFFLINE";
  }, [commsConnected, commsConnecting, commsJammed]);

  const threat = useMemo(
    () => computeThreatLevel(commsJammed, jammer.strength),
    [commsJammed, jammer.strength],
  );

  const bandDesc = useMemo(
    () => BANDS.find((b) => b.key === jammer.band)?.desc ?? "",
    [jammer.band],
  );

  function pushLog(text: string) {
    setLog((prev) => [...prev, { id: makeId(), at: Date.now(), text }]);
  }

  useEffect(() => {
    pushLog(commsJammed ? "RF mask engaged." : "RF mask idle.");
    pushLog(`Band profile loaded: ${jammer.band}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoscroll when new log lines arrive (while on Log tab)
  useEffect(() => {
    if (tab !== "log") return;
    if (log.length === 0) return;

    requestAnimationFrame(() => {
      logRef.current?.scrollToEnd({ animated: true });
    });
  }, [log.length, tab]);

  function setJam(on: boolean) {
    if (on === commsJammed) return;

    // This also syncs jammer.enabled via your store Step 1D
    setCommsJammed(on);

    if (on) {
      pushLog("Mask: ENABLED — denying outbound comms.");
      pushLog(
        `Emitter: ${jammer.band} | sweep=${jammer.sweep} | burst=${jammer.burst}`,
      );
      pushLog(
        `Power: ${jammer.strength}% | stealth=${jammer.stealth ? "on" : "off"}`,
      );
      pushThread("system", "Jammer enabled. Secure comms blocked.");
      bannerPush("OPS", "Jammer engaged.", 2000);
    } else {
      pushLog("Mask: DISABLED — restoring outbound comms.");
      pushLog("Spectrum scan: returning to baseline.");
      pushThread("system", "Jammer disabled. Reconnect available.");
      bannerPush("OPS", "Jammer released.", 2000);
    }
  }

  function reconnect() {
    pushLog("Attempting handshake…");
    pushThread("system", "Attempting to re-establish secure link…");
    connectComms();
  }

  function cycleStrength() {
    const next =
      jammer.strength >= 100 ? 0 : Math.min(100, jammer.strength + 10);
    setJammer({ strength: next });
    pushLog(`Power set: ${next}%`);
    if (commsJammed) pushLog("Mask update applied.");
  }

  function toggleSweep() {
    const next = jammer.sweep === "narrow" ? "wide" : "narrow";
    setJammer({ sweep: next });
    pushLog(`Sweep mode: ${next.toUpperCase()}`);
  }

  function cycleBurst() {
    const next =
      jammer.burst === "low" ? "med" : jammer.burst === "med" ? "high" : "low";
    setJammer({ burst: next });
    pushLog(`Burst rate: ${next.toUpperCase()}`);
  }

  function toggleStealth() {
    const next = !jammer.stealth;
    setJammer({ stealth: next });
    pushLog(`Stealth shaping: ${next ? "ON" : "OFF"}`);
    if (!next) pushLog("Warning: signature increase possible.");
  }

  function toggleAutoMask() {
    const next = !jammer.autoMask;
    setJammer({ autoMask: next });
    pushLog(`Auto-mask: ${next ? "ARMED" : "DISABLED"}`);
    if (next) pushLog("Rule: engage mask on suspicious link activity.");
  }

  function selectBand(band: BandKey) {
    if (band === jammer.band) return;
    setJammer({ band });
    pushLog(`Band selected: ${band}`);
    if (commsJammed) pushLog("Mask retuned to new band.");
  }

  const renderLogItem: ListRenderItem<LogItem> = ({ item: l }) => (
    <Text style={styles.logLine} selectable>
      <Text style={styles.logTs}>{ts(l.at)} </Text>
      {l.text}
    </Text>
  );

  return (
    <PhoneFrame>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Jammer</Text>
            <Text style={styles.sub}>
              Status: <Text style={styles.subStrong}>{statusText}</Text>
            </Text>
          </View>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => setTab("log")}
              style={[styles.tabBtn, tab === "log" && styles.tabBtnActive]}
            >
              <Text
                style={[styles.tabTxt, tab === "log" && styles.tabTxtActive]}
              >
                Log
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("settings")}
              style={[styles.tabBtn, tab === "settings" && styles.tabBtnActive]}
            >
              <Text
                style={[
                  styles.tabTxt,
                  tab === "settings" && styles.tabTxtActive,
                ]}
              >
                Settings
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Visual bar / telemetry */}
        <View style={styles.telemetry}>
          <View style={styles.teleRow}>
            <View style={styles.teleCol}>
              <Text style={styles.teleLabel}>THREAT</Text>
              <Text style={styles.teleValue}>{threat}%</Text>
            </View>

            <View style={styles.teleCol}>
              <Text style={styles.teleLabel}>BAND</Text>
              <Text style={styles.teleValue}>{jammer.band}</Text>
            </View>

            <View style={styles.teleCol}>
              <Text style={styles.teleLabel}>PWR</Text>
              <Text style={styles.teleValue}>{jammer.strength}%</Text>
            </View>

            <Pressable
              onPress={() => setJam(!commsJammed)}
              style={[
                styles.pill,
                commsJammed ? styles.pillOn : styles.pillOff,
              ]}
            >
              <Text style={styles.pillTxt}>
                {commsJammed ? "MASK ON" : "MASK OFF"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${threat}%` }]} />
          </View>

          <Text style={styles.teleHint}>
            Lower is better. Mask reduces visibility but blocks outbound comms.
          </Text>
        </View>

        <View style={styles.panel}>
          {tab === "log" ? (
            <FlatList
              ref={logRef}
              data={log.slice(-200)}
              keyExtractor={(l) => l.id}
              renderItem={renderLogItem}
              style={styles.logList}
              contentContainerStyle={styles.logContent}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => {
                if (tab === "log")
                  logRef.current?.scrollToEnd({ animated: false });
              }}
            />
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[styles.settings, { paddingBottom: 40 }]}
              showsVerticalScrollIndicator={false}
            >
              {/* Band selection */}
              <Text style={styles.sectionTitle}>Band Profile</Text>
              <Text style={styles.sectionDesc}>{bandDesc}</Text>

              <View style={styles.bandRow}>
                {BANDS.map((b) => {
                  const active = b.key === jammer.band;
                  return (
                    <Pressable
                      key={b.key}
                      onPress={() => selectBand(b.key)}
                      style={[styles.bandBtn, active && styles.bandBtnActive]}
                    >
                      <Text
                        style={[styles.bandTxt, active && styles.bandTxtActive]}
                      >
                        {b.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.divider} />

              {/* Power / sweep / burst controls */}
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Power</Text>
                  <Text style={styles.settingDesc}>
                    Higher power reduces dropouts but increases signature.
                  </Text>
                </View>
                <Pressable onPress={cycleStrength} style={styles.actionBtn}>
                  <Text style={styles.actionTxt}>+10%</Text>
                </Pressable>
              </View>

              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Sweep</Text>
                  <Text style={styles.settingDesc}>
                    Narrow is subtle. Wide is brute force.
                  </Text>
                </View>
                <Pressable onPress={toggleSweep} style={styles.actionBtn}>
                  <Text style={styles.actionTxt}>
                    {jammer.sweep === "narrow" ? "NARROW" : "WIDE"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Burst Rate</Text>
                  <Text style={styles.settingDesc}>
                    Controls pulse cadence. High is loud.
                  </Text>
                </View>
                <Pressable onPress={cycleBurst} style={styles.actionBtn}>
                  <Text style={styles.actionTxt}>
                    {jammer.burst.toUpperCase()}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.divider} />

              {/* Behavior toggles */}
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Stealth Shaping</Text>
                  <Text style={styles.settingDesc}>
                    Smooths emissions to avoid detection spikes.
                  </Text>
                </View>
                <Pressable
                  onPress={toggleStealth}
                  style={[
                    styles.pill,
                    jammer.stealth ? styles.pillOnSoft : styles.pillOff,
                  ]}
                >
                  <Text style={styles.pillTxt}>
                    {jammer.stealth ? "ON" : "OFF"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Auto-mask</Text>
                  <Text style={styles.settingDesc}>
                    Engage mask if link activity looks suspicious.
                  </Text>
                </View>
                <Pressable
                  onPress={toggleAutoMask}
                  style={[
                    styles.pill,
                    jammer.autoMask ? styles.pillOnSoft : styles.pillOff,
                  ]}
                >
                  <Text style={styles.pillTxt}>
                    {jammer.autoMask ? "ARMED" : "OFF"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.divider} />

              {/* Link control */}
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Secure Link</Text>
                  <Text style={styles.settingDesc}>
                    Reconnect encrypted channel when mask is off.
                  </Text>
                </View>

                <Pressable
                  onPress={reconnect}
                  style={[
                    styles.actionBtn,
                    commsJammed && styles.actionBtnDisabled,
                  ]}
                  disabled={commsJammed}
                >
                  <Text style={styles.actionTxt}>
                    {commsJammed ? "BLOCKED" : "RECONNECT"}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.note}>
                Note: Settings don’t confirm outcomes — they change your RF
                posture. Mission engine will treat these as task conditions.
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 14 },

  header: {
    paddingHorizontal: 4,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "rgba(255,255,255,0.92)",
  },
  sub: {
    marginTop: 3,
    fontSize: 12,
    color: "rgba(255,255,255,0.62)",
  },
  subStrong: { color: "rgba(255,255,255,0.86)", fontWeight: "800" },

  tabs: { flexDirection: "row", gap: 8 },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  tabBtnActive: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.18)",
  },
  tabTxt: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.72)",
  },
  tabTxtActive: { color: "rgba(255,255,255,0.92)" },

  telemetry: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.32)",
    padding: 12,
    marginBottom: 10,
  },
  teleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  teleCol: { gap: 2 },
  teleLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.55)",
  },
  teleValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(255,255,255,0.92)",
  },
  barTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  barFill: {
    height: "100%",
    backgroundColor: "rgba(255,90,131,0.35)",
  },
  teleHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 15,
    color: "rgba(255,255,255,0.62)",
  },

  panel: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.40)",
    overflow: "hidden",
    padding: 14,
    minHeight: 0,
  },

  // ✅ Log tab now scrolls like Messages (drag-to-scroll, no indicator, pinned bottom)
  logList: {
    flex: 1,
    minHeight: 0,
  },
  logContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingBottom: 10,
  },

  logLine: {
    fontSize: 12.5,
    lineHeight: 17,
    color: "rgba(255,255,255,0.84)",
    fontFamily: "monospace" as any,
  },
  logTs: { color: "rgba(255,255,255,0.55)" },

  settings: { gap: 14 },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(255,255,255,0.92)",
  },
  sectionDesc: {
    marginTop: -6,
    fontSize: 12.5,
    lineHeight: 16,
    color: "rgba(255,255,255,0.62)",
  },

  bandRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  bandBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  bandBtnActive: {
    backgroundColor: "rgba(111,123,255,0.14)",
    borderColor: "rgba(111,123,255,0.26)",
  },
  bandTxt: { color: "rgba(255,255,255,0.78)", fontWeight: "900", fontSize: 12 },
  bandTxtActive: { color: "rgba(255,255,255,0.92)" },

  settingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(255,255,255,0.92)",
  },
  settingDesc: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 16,
    color: "rgba(255,255,255,0.62)",
  },

  pill: {
    minWidth: 78,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pillOn: {
    backgroundColor: "rgba(255,90,131,0.16)",
    borderColor: "rgba(255,90,131,0.28)",
  },
  pillOnSoft: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.16)",
  },
  pillOff: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillTxt: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(255,255,255,0.90)",
    letterSpacing: 0.6,
  },

  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionTxt: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(255,255,255,0.88)",
  },

  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.10)" },

  note: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 16,
    color: "rgba(255,255,255,0.60)",
  },
});
