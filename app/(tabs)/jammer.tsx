import { useGameStore } from "@/store/useGameStore";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type BandKey = "CB" | "VHF" | "LTE" | "SAT" | "WIFI" | "5G";

type BandCfg = {
  key: BandKey;
  label: string;
  desc: string;
};

const TACTICAL_FONT = "monospace";

const BANDS: BandCfg[] = [
  {
    key: "CB",
    label: "CB",
    desc: "Citizen band / short-range civilian radio traffic",
  },
  { key: "VHF", label: "VHF", desc: "Short-range analog / legacy repeaters" },
  { key: "LTE", label: "LTE", desc: "Cellular towers / consumer backhaul" },
  { key: "5G", label: "5G", desc: "Modern mobile data / dense urban coverage" },
  { key: "SAT", label: "SAT", desc: "Burst uplinks / high visibility" },
  { key: "WIFI", label: "Wi-Fi", desc: "Local APs / opportunistic" },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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

  const pushThread = useGameStore((s) => s.pushThread);

  const jammer = useGameStore((s) => s.jammer);
  const setJammer = useGameStore((s) => s.setJammer);

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

  function setJam(on: boolean) {
    if (on === commsJammed) return;
    setCommsJammed(on);
  }

  function reconnect() {
    if (commsJammed || commsConnecting) return;
    pushThread("system", "Attempting to re-establish secure link…");
    connectComms();
  }

  function cycleStrength() {
    const next =
      jammer.strength >= 100 ? 0 : Math.min(100, jammer.strength + 10);
    setJammer({ strength: next });
  }

  function toggleSweep() {
    const next = jammer.sweep === "narrow" ? "wide" : "narrow";
    setJammer({ sweep: next });
  }

  function cycleBurst() {
    const next =
      jammer.burst === "low" ? "med" : jammer.burst === "med" ? "high" : "low";
    setJammer({ burst: next });
  }

  function toggleStealth() {
    const next = !jammer.stealth;
    setJammer({ stealth: next });
  }

  function toggleAutoMask() {
    const next = !jammer.autoMask;
    setJammer({ autoMask: next });
  }

  function selectBand(band: BandKey) {
    if (band === jammer.band) return;
    setJammer({ band });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>RF INTERFERENCE NODE</Text>
          <Text style={styles.title}>JAMMER</Text>
          <Text style={styles.sub}>
            STATUS: <Text style={styles.subStrong}>{statusText}</Text>
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            commsJammed ? styles.statusBadgeOn : styles.statusBadgeOff,
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {commsJammed ? "ACTIVE" : "IDLE"}
          </Text>
        </View>
      </View>

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
            style={[styles.pill, commsJammed ? styles.pillOn : styles.pillOff]}
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
        <ScrollView
          style={styles.settingsScroll}
          contentContainerStyle={styles.settings}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>BAND PROFILE</Text>
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

          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>POWER</Text>
              <Text style={styles.settingDesc}>
                Higher power reduces dropouts but increases signature.
              </Text>
            </View>
            <Pressable onPress={cycleStrength} style={styles.actionBtn}>
              <Text style={styles.actionTxt}>+10%</Text>
            </Pressable>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>SWEEP</Text>
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
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>BURST RATE</Text>
              <Text style={styles.settingDesc}>
                Controls pulse cadence. High is loud.
              </Text>
            </View>
            <Pressable onPress={cycleBurst} style={styles.actionBtn}>
              <Text style={styles.actionTxt}>{jammer.burst.toUpperCase()}</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>STEALTH SHAPING</Text>
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
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>AUTO-MASK</Text>
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

          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>SECURE LINK</Text>
              <Text style={styles.settingDesc}>
                Reconnect encrypted channel when mask is off.
              </Text>
            </View>

            <Pressable
              onPress={reconnect}
              style={[
                styles.actionBtn,
                (commsJammed || commsConnecting) && styles.actionBtnDisabled,
              ]}
              disabled={commsJammed || commsConnecting}
            >
              <Text style={styles.actionTxt}>
                {commsJammed
                  ? "BLOCKED"
                  : commsConnecting
                    ? "WORKING"
                    : "RECONNECT"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.note}>
            Settings change RF posture only. Mission logic can use these as task
            conditions.
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 12,
    backgroundColor: "#050607",
  },

  header: {
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  headerLeft: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.6,
    fontFamily: TACTICAL_FONT,
    color: "#a78663",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    letterSpacing: 1.2,
    fontFamily: TACTICAL_FONT,
    color: "#ffd3a1",
    marginBottom: 4,
  },
  sub: {
    fontSize: 11,
    fontFamily: TACTICAL_FONT,
    color: "#a78663",
  },
  subStrong: {
    color: "#ff9d3d",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
    borderWidth: 1,
    minWidth: 72,
    alignItems: "center",
  },
  statusBadgeOn: {
    backgroundColor: "#271306",
    borderColor: "#ff8c2b",
  },
  statusBadgeOff: {
    backgroundColor: "#0c0a08",
    borderColor: "#3a2a1a",
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: TACTICAL_FONT,
    color: "#ffd3a1",
    letterSpacing: 1,
  },

  telemetry: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#3a2a1a",
    backgroundColor: "#0b0907",
    padding: 10,
    marginBottom: 8,
  },
  teleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  teleCol: {
    flex: 1,
    gap: 2,
  },
  teleLabel: {
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: TACTICAL_FONT,
    color: "#a78663",
  },
  teleValue: {
    fontSize: 13,
    fontFamily: TACTICAL_FONT,
    color: "#ffd3a1",
  },
  barTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: "#120d08",
    borderWidth: 1,
    borderColor: "#3a2a1a",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#ff8c2b",
  },
  teleHint: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: TACTICAL_FONT,
    color: "#a78663",
    lineHeight: 15,
  },

  panel: {
    flex: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#3a2a1a",
    backgroundColor: "#0a0806",
    padding: 10,
    minHeight: 0,
  },
  settingsScroll: {
    flex: 1,
  },
  settings: {
    gap: 14,
    paddingBottom: 28,
  },

  sectionTitle: {
    fontSize: 13,
    letterSpacing: 1,
    fontFamily: TACTICAL_FONT,
    color: "#ffb86b",
  },
  sectionDesc: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: TACTICAL_FONT,
    color: "#a78663",
    marginTop: -6,
  },

  bandRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  bandBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#3a2a1a",
    backgroundColor: "#0c0a08",
  },
  bandBtnActive: {
    borderColor: "#ff8c2b",
    backgroundColor: "#1a0f06",
  },
  bandTxt: {
    fontSize: 11,
    fontFamily: TACTICAL_FONT,
    color: "#a78663",
  },
  bandTxtActive: {
    color: "#ffd3a1",
  },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingTextCol: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 12,
    fontFamily: TACTICAL_FONT,
    color: "#ffd3a1",
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: TACTICAL_FONT,
    color: "#a78663",
  },

  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#5a3a1f",
    backgroundColor: "#1a0f06",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 88,
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  actionTxt: {
    fontSize: 11,
    fontFamily: TACTICAL_FONT,
    color: "#ffd3a1",
    letterSpacing: 0.6,
  },

  pill: {
    minWidth: 78,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pillOn: {
    backgroundColor: "#2a1406",
    borderColor: "#ff8c2b",
  },
  pillOnSoft: {
    backgroundColor: "#1a0f06",
    borderColor: "#5a3a1f",
  },
  pillOff: {
    backgroundColor: "#0c0a08",
    borderColor: "#3a2a1a",
  },
  pillTxt: {
    fontSize: 11,
    fontFamily: TACTICAL_FONT,
    color: "#ffd3a1",
    letterSpacing: 0.6,
  },

  divider: {
    height: 1,
    backgroundColor: "#2a1c12",
  },

  note: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: TACTICAL_FONT,
    color: "#a78663",
  },
});
