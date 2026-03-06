import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import { useRouter } from "expo-router";
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
    label: "Messages",
    icon: "✉",
    route: "/messages",
    color: "#ff9a7a",
  },
  {
    key: "sat",
    label: "SAT/Relay",
    icon: "⟲",
    route: "/sat",
    color: "#00d6c7",
  },

  {
    key: "network",
    label: "Network",
    icon: "⌁",
    route: "/network",
    color: "#00bcd4",
  },
  {
    key: "jammer",
    label: "Jammer",
    icon: "〰",
    route: "/jammer",
    color: "#ff5a83",
  },
  {
    key: "notes",
    label: "Notes",
    icon: "🗒",
    route: "/notes",
    color: "#cfd8dc",
  },

  { key: "mask", label: "Mask", icon: "◉", route: "/mask", color: "#9575cd" },
  {
    key: "vault",
    label: "Vault",
    icon: "▣",
    route: "/vault",
    color: "#4db6ac",
  },
  { key: "ops", label: "Ops HUD", icon: "◷", route: "/ops", color: "#ff7043" },
];

export default function HomePhoneScreen() {
  const router = useRouter();

  const terminalLocked = useGameStore((s) => s.terminalLocked);
  const bannerPush = useGameStore((s) => s.bannerPush);

  return (
    <PhoneFrame>
      <View style={styles.screen}>
        <View style={styles.idleCard}>
          <Text style={styles.idleTitle}>—</Text>
          <Text style={styles.idleSub}>No active sessions.</Text>
          <Text style={[styles.idleSub, styles.muted]}>
            Awaiting secure comms…
          </Text>
        </View>

        <View style={styles.grid}>
          {APPS.map((a) => (
            <Pressable
              key={a.key}
              onPress={() => {
                if (a.key === "messages") {
                  router.push("/messages" as any);
                  return;
                }
                router.push(a.route as any);
              }}
              style={({ pressed }) => [
                styles.tile,
                pressed && styles.tilePressed,
              ]}
            >
              <View style={[styles.icon, { backgroundColor: a.color + "22" }]}>
                <Text style={styles.iconText}>{a.icon}</Text>
              </View>
              <Text style={styles.label}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Prototype</Text>
          <Text style={styles.noteBody}>
            Handler-driven missions. Some beats force quick app actions (SAT,
            jammer, network), then lock you into Terminal under a short access
            window.
          </Text>
        </View>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 18,
    paddingHorizontal: 16,
  },

  idleCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 14,
    alignItems: "center",
  },
  idleTitle: {
    fontSize: 22,
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.86)",
    marginBottom: 6,
  },
  idleSub: {
    fontSize: 12.6,
    color: "rgba(255,255,255,0.70)",
  },
  muted: {
    color: "rgba(255,255,255,0.62)",
    marginTop: 2,
  },

  grid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  tile: {
    width: "33.3333%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tilePressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },

  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  iconText: {
    fontSize: 20,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "700",
  },

  label: {
    fontSize: 11,
    textAlign: "center",
    color: "rgba(255,255,255,0.68)",
  },

  noteCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(255,255,255,0.92)",
    marginBottom: 6,
  },
  noteBody: {
    fontSize: 12.4,
    lineHeight: 17,
    color: "rgba(255,255,255,0.68)",
  },
});
