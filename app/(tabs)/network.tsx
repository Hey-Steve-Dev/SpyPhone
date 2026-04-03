import { useGameStore } from "@/store/useGameStore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type TabKey = "scan" | "hop" | "hack" | "log";

type Band = "LTE" | "5G" | "WIFI" | "SAT";
type Sec = "OPEN" | "WEP" | "WPA2" | "WPA3" | "EAP" | "UNKNOWN";

type Net = {
  id: string;
  ssid: string;
  band: Band;
  rssi: number;
  security: Sec;
  bssid: string;
  channel: number;
  lastSeen: number;
  tags: string[];
};

type LogItem = {
  id: string;
  at: number;
  level: "SYS" | "SCAN" | "LINK" | "HACK" | "WARN";
  text: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function rssiToBars(rssi: number) {
  const t = clamp((rssi + 95) / 65, 0, 1);
  return Math.round(t * 4);
}

function rssiLabel(rssi: number) {
  if (rssi > -55) return "excellent";
  if (rssi > -65) return "good";
  if (rssi > -75) return "fair";
  return "weak";
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fakeBssid() {
  const b = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0"),
  );
  return b.join(":").toUpperCase();
}

function fakeSsid() {
  const a = [
    "CITYNET",
    "HELIO",
    "COFFEEBAR",
    "NEXUS",
    "SKYLINE",
    "VAULT",
    "OMNI",
    "GUEST",
    "SECURE",
    "NODE",
    "TERMINAL",
    "WAREHOUSE",
  ];
  const b = ["-5G", "-LTE", "_WIFI", "_OPS", "_GUEST", "_BACKHAUL", "_MESH"];
  const n = Math.random() < 0.35 ? `-${Math.floor(Math.random() * 99)}` : "";
  return `${pick(a)}${pick(b)}${n}`;
}

function fakeTags(band: Band, sec: Sec) {
  const base = ["beacon", "handoff", "roam", "relay", "burst", "covert"];
  const bandTags: Record<Band, string[]> = {
    LTE: ["macro", "cell", "epc"],
    "5G": ["nr", "slice", "core"],
    WIFI: ["ap", "mesh", "wpa"],
    SAT: ["uplink", "beam", "latency"],
  };
  const secTags: Record<Sec, string[]> = {
    OPEN: ["open"],
    WEP: ["legacy"],
    WPA2: ["psk"],
    WPA3: ["sae"],
    EAP: ["enterprise"],
    UNKNOWN: ["unknown-sec"],
  };

  const tags = new Set<string>();
  tags.add(pick(base));
  tags.add(pick(base));
  tags.add(pick(bandTags[band]));
  tags.add(pick(secTags[sec]));
  if (Math.random() < 0.25) tags.add("high-traffic");
  if (Math.random() < 0.18) tags.add("blacklist?");
  return Array.from(tags).slice(0, 4);
}

function genNetworks(seedCount: number): Net[] {
  const bands: Band[] = ["5G", "LTE", "WIFI", "SAT"];
  const secs: Sec[] = ["OPEN", "WEP", "WPA2", "WPA3", "EAP", "UNKNOWN"];

  const now = Date.now();
  return Array.from({ length: seedCount }, () => {
    const band = pick(bands);
    const security =
      band === "SAT" ? pick(["UNKNOWN", "EAP", "WPA2"] as Sec[]) : pick(secs);
    const rssi = Math.floor(-90 + Math.random() * 55);
    const channel =
      band === "WIFI"
        ? pick([1, 6, 11, 36, 40, 44, 149, 157])
        : pick([3, 7, 12, 18, 20, 28, 66, 71]);

    return {
      id: uid("net"),
      ssid: fakeSsid(),
      band,
      rssi,
      security,
      bssid: fakeBssid(),
      channel,
      lastSeen: now - Math.floor(Math.random() * 1000 * 60 * 15),
      tags: fakeTags(band, security),
    };
  }).sort((a, b) => b.rssi - a.rssi);
}

function summarizeNet(n: Net) {
  return `${n.ssid} • ${n.band} • ${n.security} • RSSI ${n.rssi} (${rssiLabel(
    n.rssi,
  )})`;
}

export default function NetworkScreen() {
  const engineNetwork = useGameStore((s) => s.network);
  const engineSetNetwork = useGameStore((s) => s.setNetwork);
  const engineAddLog = useGameStore((s) => s.appendNetworkLog);
  const engineClearLog = useGameStore((s) => s.clearNetworkLog);
  const engineTrace = useGameStore((s) => s.trace);
  const engineBumpTrace = useGameStore((s) => s.bumpTrace);

  const [tab, setTab] = useState<TabKey>("scan");

  const [preferredBand, setPreferredBand] = useState<Band>(
    engineNetwork.preferredBand as Band,
  );
  const [autoHop, setAutoHop] = useState<boolean>(engineNetwork.autoHop);
  const [stealth, setStealth] = useState<boolean>(engineNetwork.stealth);

  const [scanning, setScanning] = useState(false);
  const [scanGen, setScanGen] = useState(0);

  const [scanResults, setScanResults] = useState<Net[]>([]);
  const didHydrateScanRef = useRef(false);

  const [connectedId, setConnectedId] = useState<string | null>(
    engineNetwork.connectedId,
  );

  const [targetId, setTargetId] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [hackBusy, setHackBusy] = useState(false);

  const [logItems, setLogItems] = useState<LogItem[]>(() => {
    const existing = engineNetwork.logs as LogItem[];
    if (existing.length) return existing;

    return [
      { id: uid("log"), at: Date.now(), level: "SYS", text: "NET: ready" },
      {
        id: uid("log"),
        at: Date.now(),
        level: "SYS",
        text: "HINT: scan, select, link, hop, probe.",
      },
    ];
  });

  const logListRef = useRef<FlatList<LogItem>>(null);

  useEffect(() => {
    if (didHydrateScanRef.current) return;
    didHydrateScanRef.current = true;

    const cached = (engineNetwork.scanCache as Net[] | undefined) ?? [];
    if (cached.length) {
      setScanResults(cached);
      return;
    }

    const seed = genNetworks(11);
    setScanResults(seed);
    engineSetNetwork({ scanCache: seed });
  }, [engineNetwork.scanCache, engineSetNetwork]);

  useEffect(() => {
    if (engineNetwork.connectedId !== connectedId) {
      setConnectedId(engineNetwork.connectedId);
    }
  }, [engineNetwork.connectedId, connectedId]);

  useEffect(() => {
    setPreferredBand(engineNetwork.preferredBand as Band);
  }, [engineNetwork.preferredBand]);

  useEffect(() => {
    setAutoHop(engineNetwork.autoHop);
  }, [engineNetwork.autoHop]);

  useEffect(() => {
    setStealth(engineNetwork.stealth);
  }, [engineNetwork.stealth]);

  useEffect(() => {
    if (!engineNetwork.logs.length) return;
    setLogItems(engineNetwork.logs as LogItem[]);
  }, [engineNetwork.logs]);

  const connected = useMemo(() => {
    const fromLocal = scanResults.find((n) => n.id === connectedId);
    if (fromLocal) return fromLocal;

    if (engineNetwork.connectedId) {
      return (
        scanResults.find((n) => n.id === engineNetwork.connectedId) ?? null
      );
    }

    return null;
  }, [connectedId, engineNetwork.connectedId, scanResults]);

  const target = useMemo(
    () => scanResults.find((n) => n.id === targetId) ?? null,
    [scanResults, targetId],
  );

  function pushLog(level: LogItem["level"], text: string) {
    const item: LogItem = { id: uid("log"), at: Date.now(), level, text };

    setLogItems((prev) => {
      const next = [...prev, item];
      return next.length > 250 ? next.slice(next.length - 250) : next;
    });

    engineAddLog(item);

    requestAnimationFrame(() => {
      logListRef.current?.scrollToEnd({ animated: true });
    });
  }

  useEffect(() => {
    engineSetNetwork({
      preferredBand,
      autoHop,
      stealth,
    });
  }, [preferredBand, autoHop, stealth, engineSetNetwork]);

  useEffect(() => {
    if (!scanning) return;
    const t = setInterval(() => setScanGen((g) => g + 1), 450);
    return () => clearInterval(t);
  }, [scanning]);

  useEffect(() => {
    if (!autoHop) return;

    const t = setInterval(() => {
      const chance = stealth ? 0.08 : 0.14;
      if (Math.random() < chance) {
        const options: Band[] = ["LTE", "5G", "WIFI", "SAT"];
        const next = pick(options.filter((b) => b !== preferredBand));
        setPreferredBand(next);
        pushLog("LINK", `Band-hop: preferred=${next}`);
      }
    }, 1600);

    return () => clearInterval(t);
  }, [autoHop, stealth, preferredBand]);

  function beginScan() {
    if (scanning) return;

    setScanning(true);
    pushLog("SCAN", "Scan: start (passive beacons + active probes)");

    const base = genNetworks(7 + Math.floor(Math.random() * 6));

    setScanResults((prev) => {
      const keep = prev.filter(() => Math.random() < 0.35).slice(0, 4);
      const merged = [...keep, ...base]
        .map((n) => ({
          ...n,
          rssi: clamp(n.rssi + Math.floor(-6 + Math.random() * 13), -95, -30),
          lastSeen: Date.now() - Math.floor(Math.random() * 1000 * 18),
        }))
        .sort((a, b) => b.rssi - a.rssi);

      const seen = new Set<string>();
      const out: Net[] = [];

      for (const n of merged) {
        const k = `${n.ssid}-${n.bssid}`;
        if (!seen.has(k)) {
          seen.add(k);
          out.push(n);
        }
      }

      const nextList = out.slice(0, 18);
      engineSetNetwork({ scanCache: nextList });
      return nextList;
    });

    setTimeout(
      () => {
        setScanning(false);
        pushLog("SCAN", "Scan: complete");
      },
      stealth ? 1300 : 900,
    );
  }

  function clearScan() {
    setScanResults([]);
    setConnectedId(null);
    setTargetId(null);

    engineSetNetwork({
      scanCache: [],
      connectedId: null,
      connectedMeta: null,
    });

    pushLog("SYS", "Scan cache cleared");
  }

  function selectNet(n: Net) {
    setTargetId(n.id);
    pushLog("SCAN", `Selected: ${summarizeNet(n)}`);
  }

  function connectNet(n: Net) {
    setConnectedId(n.id);
    pushLog("LINK", `Link: attaching → ${summarizeNet(n)}`);

    engineBumpTrace(stealth ? 1 : 2);

    engineSetNetwork({
      connectedId: n.id,
      connectedMeta: {
        ssid: n.ssid,
        band: n.band,
        security: n.security,
        bssid: n.bssid,
        channel: n.channel,
      },
    });
  }

  function disconnect() {
    if (!connected) return;
    pushLog("LINK", `Link: detach ← ${connected.ssid}`);
    setConnectedId(null);

    engineSetNetwork({ connectedId: null, connectedMeta: null });
  }

  async function runProbe() {
    const n = target ?? connected;
    if (!n) {
      pushLog("WARN", "Probe: no target");
      return;
    }

    pushLog("HACK", `Probe: fingerprinting ${n.ssid} (${n.security})`);
    setHackBusy(true);

    const phases = stealth
      ? ["listen", "handshake-snoop", "timing", "capabilities"]
      : ["deauth", "handshake", "pmkid", "capabilities"];

    for (const p of phases) {
      await new Promise((r) => setTimeout(r, stealth ? 380 : 260));
      pushLog("HACK", `Probe: ${p}…`);
    }

    const finding =
      n.security === "OPEN"
        ? "OPEN network: no key exchange"
        : n.security === "WEP"
          ? "Legacy WEP detected: weak IV patterns"
          : n.security === "WPA2"
            ? "WPA2-PSK likely: capture handshake"
            : n.security === "WPA3"
              ? "WPA3 SAE: brute-force impractical (try social / downgrade?)"
              : n.security === "EAP"
                ? "802.1X/EAP: look for misconfig + captive portal"
                : "Security unknown: inconsistent beacons";

    pushLog("HACK", `Probe: result → ${finding}`);
    setHackBusy(false);
    setTab("log");
  }

  async function runHack() {
    const n = target ?? connected;
    if (!n) {
      pushLog("WARN", "Hack: no target");
      return;
    }
    if (hackBusy) return;

    setHackBusy(true);

    const loud = !stealth;
    const rssiFactor = clamp((n.rssi + 95) / 65, 0, 1);
    const secPenalty =
      n.security === "OPEN"
        ? 0.15
        : n.security === "WEP"
          ? 0.05
          : n.security === "WPA2"
            ? 0.18
            : n.security === "WPA3"
              ? 0.35
              : n.security === "EAP"
                ? 0.28
                : 0.22;

    const passFactor =
      passphrase.trim().length === 0
        ? 0.0
        : clamp(passphrase.trim().length / 14, 0.15, 0.45);

    const baseChance = 0.22 + rssiFactor * 0.28 + passFactor - secPenalty;
    const chance = clamp(loud ? baseChance + 0.08 : baseChance, 0.03, 0.78);

    pushLog(
      "HACK",
      `Hack: stage (target=${n.ssid} band=${n.band} sec=${n.security})`,
    );
    pushLog("HACK", `Hack: parameters (stealth=${stealth ? "on" : "off"})`);

    const steps = loud
      ? ["inject", "capture", "replay", "key-derivation", "auth-bypass"]
      : ["observe", "capture", "derive", "negotiate"];

    for (const s of steps) {
      await new Promise((r) => setTimeout(r, loud ? 280 : 360));
      pushLog("HACK", `Hack: ${s}…`);
    }

    const ok = Math.random() < chance;

    if (ok) {
      pushLog("HACK", "Hack: SUCCESS → access token minted");
      pushLog("LINK", `Link: switching route → ${n.ssid}`);
      connectNet(n);
    } else {
      pushLog("WARN", "Hack: FAILED → countermeasures suspected");
      engineBumpTrace(loud ? 4 : 2);
    }

    setHackBusy(false);
    setTab("log");
  }

  function hopNow() {
    const options: Band[] = ["LTE", "5G", "WIFI", "SAT"];
    const next = pick(options.filter((b) => b !== preferredBand));
    setPreferredBand(next);
    pushLog("LINK", `Band-hop: manual → ${next}`);
    beginScan();
  }

  function toggleAutoHop() {
    const next = !autoHop;
    setAutoHop(next);
    pushLog("SYS", `Auto-hop: ${next ? "enabled" : "disabled"}`);
  }

  function toggleStealth() {
    const next = !stealth;
    setStealth(next);
    pushLog("SYS", `Stealth: ${next ? "enabled" : "disabled"}`);
  }

  const filteredResults = useMemo(() => {
    const inBand = scanResults.filter((n) => n.band === preferredBand);
    const outBand = scanResults.filter((n) => n.band !== preferredBand);
    const spill = outBand.slice(0, Math.min(3, outBand.length));
    return [...inBand, ...spill].sort((a, b) => b.rssi - a.rssi);
  }, [scanResults, preferredBand]);

  const headerStatus = useMemo(() => {
    const t = engineTrace ?? 0;
    const traceLabel =
      t >= 80 ? "HIGH" : t >= 55 ? "ELEV" : t >= 30 ? "MED" : "LOW";
    const dots = scanning ? ".".repeat((scanGen % 3) + 1) : "";
    const link = connected ? connected.ssid : "none";

    return {
      trace: `${traceLabel} ${t}`,
      link,
      scan: scanning ? `scanning${dots}` : "idle",
    };
  }, [engineTrace, connected, scanning, scanGen]);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.title}>Network</Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            LINK: <Text style={styles.metaStrong}>{headerStatus.link}</Text>
          </Text>
          <Text style={styles.meta}>
            BAND: <Text style={styles.metaStrong}>{preferredBand}</Text>
          </Text>
          <Text style={styles.meta}>
            TRACE: <Text style={styles.metaStrong}>{headerStatus.trace}</Text>
          </Text>
        </View>

        <View style={styles.tabs}>
          <TabButton
            label="Scan"
            active={tab === "scan"}
            onPress={() => setTab("scan")}
          />
          <TabButton
            label="Hop"
            active={tab === "hop"}
            onPress={() => setTab("hop")}
          />
          <TabButton
            label="Hack"
            active={tab === "hack"}
            onPress={() => setTab("hack")}
          />
          <TabButton
            label="Log"
            active={tab === "log"}
            onPress={() => setTab("log")}
          />
        </View>
      </View>

      <View style={styles.content}>
        {tab === "scan" && (
          <FlatList
            data={filteredResults}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPad}
            ListHeaderComponent={
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>
                  Scan results{" "}
                  <Text style={styles.sectionSub}>
                    ({filteredResults.length})
                  </Text>
                </Text>
                <Text style={styles.sectionHint}>
                  {scanning ? "active probe running" : "tap a network"}
                </Text>

                <View style={styles.actionPanel}>
                  <ActionBtn
                    label={scanning ? "Scanning…" : "Scan"}
                    onPress={beginScan}
                    disabled={scanning}
                  />
                  <ActionBtn
                    label="Select band"
                    onPress={() => setTab("hop")}
                  />
                  <ActionBtn label="Clear" onPress={clearScan} />
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <NetRow
                net={item}
                selected={targetId === item.id}
                connected={connected?.id === item.id}
                onSelect={() => selectNet(item)}
                onConnect={() => connectNet(item)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No networks cached.</Text>
                <Text style={styles.emptyTextMuted}>
                  Use Scan to populate nearby networks.
                </Text>
              </View>
            }
          />
        )}

        {tab === "hop" && (
          <FlatList
            data={["LTE", "5G", "WIFI", "SAT"] as Band[]}
            keyExtractor={(b) => b}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPad}
            ListHeaderComponent={
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Band hopping</Text>
                <Text style={styles.sectionHint}>
                  preference guides scan + route selection
                </Text>

                <View style={styles.pillsRow}>
                  <Pill
                    label={`Auto-hop: ${autoHop ? "ON" : "OFF"}`}
                    onPress={toggleAutoHop}
                    active={autoHop}
                  />
                  <Pill
                    label={`Stealth: ${stealth ? "ON" : "OFF"}`}
                    onPress={toggleStealth}
                    active={stealth}
                  />
                </View>

                <View style={styles.actionPanel}>
                  <ActionBtn label="Hop now" onPress={hopNow} />
                  <ActionBtn
                    label={`Auto: ${autoHop ? "ON" : "OFF"}`}
                    onPress={toggleAutoHop}
                  />
                  <ActionBtn
                    label={`Stealth: ${stealth ? "ON" : "OFF"}`}
                    onPress={toggleStealth}
                  />
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <BandRow
                band={item}
                active={preferredBand === item}
                onPress={() => {
                  setPreferredBand(item);
                  pushLog("LINK", `Band: preferred=${item}`);
                }}
              />
            )}
            ListFooterComponent={
              <View style={styles.footerNote}>
                <Text style={styles.footerText}>
                  Notes: stealth reduces probe aggressiveness and hop rate.
                </Text>
                <Text style={styles.footerText}>
                  Auto-hop picks bands with better “RF quiet” heuristics.
                </Text>
              </View>
            }
          />
        )}

        {tab === "hack" && (
          <FlatList
            data={filteredResults}
            keyExtractor={(n) => n.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPad}
            ListHeaderComponent={
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Hack console</Text>
                <Text style={styles.sectionHint}>
                  pick a target, probe, then attempt access
                </Text>

                <View style={styles.hackCard}>
                  <Text style={styles.hackLabel}>Target</Text>
                  <Text style={styles.hackValue}>
                    {target
                      ? summarizeNet(target)
                      : connected
                        ? summarizeNet(connected)
                        : "none"}
                  </Text>

                  <Text style={[styles.hackLabel, { marginTop: 10 }]}>
                    Passphrase hint
                  </Text>
                  <TextInput
                    value={passphrase}
                    onChangeText={setPassphrase}
                    placeholder="optional: leaked phrase / operator note"
                    placeholderTextColor={"rgba(255,255,255,0.35)"}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <View style={styles.hackButtons}>
                    <MiniBtn
                      label={hackBusy ? "Probing…" : "Probe"}
                      onPress={() => {
                        void runProbe();
                      }}
                      disabled={hackBusy}
                    />
                    <MiniBtn
                      label={hackBusy ? "Working…" : "Hack"}
                      onPress={() => {
                        void runHack();
                      }}
                      disabled={hackBusy}
                    />
                    <MiniBtn
                      label={connected ? "Detach" : "Link"}
                      onPress={() => {
                        if (connected) disconnect();
                        else if (target) connectNet(target);
                        else pushLog("WARN", "Link: select a target first");
                      }}
                    />
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
                  Nearby targets
                </Text>
                <Text style={styles.sectionHint}>
                  (tap to set as hack target)
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <NetRow
                net={item}
                selected={targetId === item.id}
                connected={connected?.id === item.id}
                onSelect={() => {
                  setTargetId(item.id);
                  pushLog("SCAN", `Target set → ${summarizeNet(item)}`);
                }}
                onConnect={() => connectNet(item)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No targets.</Text>
                <Text style={styles.emptyTextMuted}>
                  Scan to populate nearby networks.
                </Text>
              </View>
            }
          />
        )}

        {tab === "log" && (
          <FlatList
            ref={logListRef}
            data={logItems}
            keyExtractor={(i) => i.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.consoleContainer}
            ListHeaderComponent={
              <View style={[styles.sectionHead, { marginBottom: 8 }]}>
                <View style={styles.actionPanel}>
                  <ActionBtn
                    label="Mark"
                    onPress={() => pushLog("SYS", "Marker: ---")}
                  />
                  <ActionBtn
                    label="Purge"
                    onPress={() => {
                      const cleared = [
                        {
                          id: uid("log"),
                          at: Date.now(),
                          level: "SYS" as const,
                          text: "NET: log cleared",
                        },
                      ];
                      setLogItems(cleared);
                      engineClearLog();
                      engineSetNetwork({ logs: cleared });
                    }}
                  />
                  <ActionBtn label="Scan" onPress={() => setTab("scan")} />
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.logRow}>
                <Text style={styles.logTime}>{fmtTime(item.at)}</Text>
                <Text style={styles.logLevel}>{item.level}</Text>
                <Text style={styles.logText}>{item.text}</Text>
              </View>
            )}
            onContentSizeChange={() => {
              logListRef.current?.scrollToEnd({ animated: false });
            }}
          />
        )}
      </View>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActionBtn({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.actionBtn, disabled && styles.actionBtnDisabled]}
    >
      <Text
        style={[styles.actionBtnText, disabled && styles.actionBtnTextDisabled]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MiniBtn({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.miniBtn, disabled && styles.miniBtnDisabled]}
    >
      <Text
        style={[styles.miniBtnText, disabled && styles.miniBtnTextDisabled]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BandRow({
  band,
  active,
  onPress,
}: {
  band: Band;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.bandRow, active && styles.rowOn]}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowTitle}>{band}</Text>
        <Text style={styles.rowSub}>
          {band === "WIFI"
            ? "short-range • high bandwidth"
            : band === "SAT"
              ? "high latency • hard to trace"
              : band === "5G"
                ? "fast • noisy • slicing"
                : "stable • common • broad coverage"}
        </Text>
      </View>

      <Text style={[styles.rowBadge, active && styles.rowBadgeOn]}>
        {active ? "preferred" : "select"}
      </Text>
    </Pressable>
  );
}

function NetRow({
  net,
  selected,
  connected,
  onSelect,
  onConnect,
}: {
  net: Net;
  selected: boolean;
  connected: boolean;
  onSelect: () => void;
  onConnect: () => void;
}) {
  const bars = rssiToBars(net.rssi);

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.netRow,
        selected && styles.rowOn,
        connected && styles.rowConnected,
      ]}
    >
      <View style={styles.rowLeft}>
        <View style={styles.netTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {net.ssid}
          </Text>

          <View style={styles.sig}>
            <View style={[styles.bar, bars >= 1 && styles.barOn]} />
            <View style={[styles.bar, bars >= 2 && styles.barOn]} />
            <View style={[styles.bar, bars >= 3 && styles.barOn]} />
            <View style={[styles.bar, bars >= 4 && styles.barOn]} />
          </View>
        </View>

        <Text style={styles.rowSub} numberOfLines={1}>
          {net.band} • {net.security} • ch {net.channel} • RSSI {net.rssi} (
          {rssiLabel(net.rssi)}) • last{" "}
          {Math.max(0, Math.round((Date.now() - net.lastSeen) / 1000))}s
        </Text>

        <View style={styles.tagRow}>
          {net.tags.map((t) => (
            <View key={`${net.id}-${t}`} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onConnect();
        }}
        style={[styles.rowAction, connected && styles.rowActionOn]}
      >
        <Text
          style={[styles.rowActionText, connected && styles.rowActionTextOn]}
        >
          {connected ? "linked" : "link"}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  title: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  meta: { color: "rgba(255,255,255,0.62)", fontSize: 12 },
  metaStrong: { color: "rgba(255,255,255,0.88)", fontWeight: "700" },

  tabs: { marginTop: 10, flexDirection: "row", gap: 8 },
  tabBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  tabBtnActive: {
    backgroundColor: "rgba(255,255,255,0.11)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  tabText: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: { color: "rgba(255,255,255,0.92)" },

  content: { flex: 1 },

  listPad: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 18,
  },

  sectionHead: { marginBottom: 10 },
  sectionTitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  sectionSub: { color: "rgba(255,255,255,0.55)", fontWeight: "700" },
  sectionHint: { marginTop: 4, color: "rgba(255,255,255,0.55)", fontSize: 12 },

  actionPanel: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  actionBtnDisabled: { opacity: 0.55 },
  actionBtnText: {
    color: "rgba(255,255,255,0.90)",
    fontWeight: "900",
    fontSize: 12,
  },
  actionBtnTextDisabled: { color: "rgba(255,255,255,0.70)" },

  netRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 10,
  },
  rowOn: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  rowConnected: { borderColor: "rgba(120, 255, 200, 0.30)" },
  rowLeft: { flex: 1 },
  rowTitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontWeight: "800",
  },
  rowSub: { marginTop: 3, color: "rgba(255,255,255,0.58)", fontSize: 12 },

  netTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  sig: { flexDirection: "row", gap: 3, alignItems: "flex-end" },
  bar: {
    width: 4,
    height: 6,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  barOn: { backgroundColor: "rgba(255,255,255,0.78)" },

  tagRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  tagText: { color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: "700" },

  rowAction: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  rowActionOn: {
    backgroundColor: "rgba(120, 255, 200, 0.10)",
    borderColor: "rgba(120, 255, 200, 0.28)",
  },
  rowActionText: {
    color: "rgba(255,255,255,0.78)",
    fontWeight: "800",
    fontSize: 12,
  },
  rowActionTextOn: { color: "rgba(210,255,235,0.92)" },

  bandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 10,
  },
  rowBadge: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 12,
    fontWeight: "800",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  rowBadgeOn: {
    color: "rgba(255,255,255,0.92)",
    borderColor: "rgba(255,255,255,0.22)",
  },

  pillsRow: { marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillActive: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  pillText: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
    fontWeight: "800",
  },
  pillTextActive: { color: "rgba(255,255,255,0.92)" },

  footerNote: {
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
  },
  footerText: { color: "rgba(255,255,255,0.58)", fontSize: 12, lineHeight: 17 },

  hackCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  hackLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "800",
  },
  hackValue: {
    marginTop: 4,
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    lineHeight: 16,
  },
  input: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    color: "rgba(255,255,255,0.92)",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    fontSize: 13,
  },
  hackButtons: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  miniBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  miniBtnDisabled: { opacity: 0.55 },
  miniBtnText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    fontWeight: "900",
  },
  miniBtnTextDisabled: { color: "rgba(255,255,255,0.70)" },

  empty: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginTop: 10,
  },
  emptyText: { color: "rgba(255,255,255,0.88)", fontWeight: "800" },
  emptyTextMuted: { marginTop: 6, color: "rgba(255,255,255,0.58)" },

  consoleContainer: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 18,
  },
  logRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
    alignItems: "flex-start",
  },
  logTime: {
    width: 62,
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "700",
  },
  logLevel: {
    width: 44,
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
    fontWeight: "900",
  },
  logText: {
    flex: 1,
    color: "rgba(255,255,255,0.86)",
    fontSize: 12,
    lineHeight: 16,
  },
});
