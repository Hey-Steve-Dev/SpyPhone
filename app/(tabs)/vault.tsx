import PhoneFrame from "@/components/PhoneFrame";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type VaultItem = {
  id: string;
  title: string;
  desc: string;
  code: string;
  run: string;
};

const VAULT: VaultItem[] = [
  {
    id: "scan-net",
    title: "Network Discovery",
    desc: "Scan for nearby unsecured access points.",
    code: "net.scan --range local --silent",
    run: "run net.scan --range local",
  },
  {
    id: "port-probe",
    title: "Port Probe",
    desc: "Probe common service ports.",
    code: "probe --target $HOST --ports 22,80,443",
    run: "run probe --target staging-7",
  },
  {
    id: "ghost-route",
    title: "Ghost Route",
    desc: "Create temporary relay route.",
    code: "ghost.route --relay auto --ttl 90",
    run: "run ghost.route --relay auto",
  },
  {
    id: "mask-id",
    title: "Identity Mask",
    desc: "Obfuscate device fingerprint.",
    code: "mask.identity --regen --cloak",
    run: "run mask.identity",
  },
  {
    id: "trace-null",
    title: "Trace Nullifier",
    desc: "Reduce trace signal temporarily.",
    code: "trace.null --burst low --cycle 3",
    run: "run trace.null",
  },
  {
    id: "sat-ping",
    title: "Satellite Ping",
    desc: "Check uplink via satellite relay.",
    code: "sat.ping --relay sat-3 --timeout 4",
    run: "run sat.ping sat-3",
  },
  {
    id: "cred-harvest",
    title: "Credential Harvest",
    desc: "Collect cached credentials from host.",
    code: "cred.harvest --target local --depth 2",
    run: "run cred.harvest",
  },
  {
    id: "packet-sniff",
    title: "Packet Sniffer",
    desc: "Monitor unencrypted traffic.",
    code: "sniff --band wifi --filter auth",
    run: "run sniff wifi",
  },
  {
    id: "backdoor-seed",
    title: "Backdoor Seeder",
    desc: "Plant persistent access hook.",
    code: "seed.backdoor --stealth --delay 20",
    run: "run seed.backdoor",
  },
  {
    id: "signal-jam",
    title: "Signal Jammer",
    desc: "Short burst RF disruption.",
    code: "jam.signal --band LTE --burst med",
    run: "run jam.signal LTE",
  },
  {
    id: "node-hop",
    title: "Node Hop",
    desc: "Rotate through anonymous nodes.",
    code: "node.hop --pool darkgrid --count 4",
    run: "run node.hop",
  },
  {
    id: "sys-mirror",
    title: "System Mirror",
    desc: "Clone remote directory.",
    code: "mirror.sys --target /var/cache",
    run: "run mirror.sys",
  },
  {
    id: "log-erase",
    title: "Log Eraser",
    desc: "Remove forensic traces.",
    code: "log.erase --secure --depth 5",
    run: "run log.erase",
  },
  {
    id: "priv-esc",
    title: "Privilege Escalation",
    desc: "Attempt root escalation.",
    code: "priv.esc --vector sudo-cache",
    run: "run priv.esc",
  },
  {
    id: "freq-scan",
    title: "Frequency Scanner",
    desc: "Scan RF spectrum for signals.",
    code: "rf.scan --range vhf-uhf",
    run: "run rf.scan",
  },
  {
    id: "ghost-shell",
    title: "Ghost Shell",
    desc: "Spawn hidden remote shell.",
    code: "shell.spawn --hidden --ttl 60",
    run: "run shell.spawn",
  },
  {
    id: "data-exfil",
    title: "Data Exfil",
    desc: "Transmit encrypted payload.",
    code: "exfil.push --enc aes --chunk 512",
    run: "run exfil.push",
  },
  {
    id: "watchdog",
    title: "Watchdog Listener",
    desc: "Alert if trace exceeds threshold.",
    code: "watchdog --trace-limit 70",
    run: "run watchdog",
  },
];

export default function VaultScreen() {
  return (
    <PhoneFrame>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>VAULT</Text>
        <Text style={styles.sub}>
          Stored tools and command snippets. Use in Terminal when needed.
        </Text>

        {VAULT.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>

            <View style={styles.codeBlock}>
              <Text style={styles.code}>{item.code}</Text>
            </View>

            <View style={styles.runBlock}>
              <Text style={styles.runLabel}>RUN:</Text>
              <Text style={styles.run}>{item.run}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 80,
  },

  header: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },

  sub: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#121212",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },

  title: {
    color: "#fff",
    fontWeight: "600",
    marginBottom: 4,
  },

  desc: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 10,
  },

  codeBlock: {
    backgroundColor: "#000",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },

  code: {
    color: "#7CFF9E",
    fontFamily: "monospace",
    fontSize: 12,
  },

  runBlock: {
    flexDirection: "row",
  },

  runLabel: {
    color: "#888",
    marginRight: 6,
    fontSize: 12,
  },

  run: {
    color: "#00e0ff",
    fontFamily: "monospace",
    fontSize: 12,
  },
});
