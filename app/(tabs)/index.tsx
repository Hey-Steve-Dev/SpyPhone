import PhoneFrame from "@/components/PhoneFrame";
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
    key: "network",
    label: "Network",
    icon: "⌁",
    route: "/network",
    color: "#00bcd4",
  },
  {
    key: "echoscan",
    label: "EchoScan",
    icon: "◉",
    route: "/audio-scanner",
    color: "#5da8ff",
  },
  {
    key: "scanner",
    label: "Scanner",
    icon: "⌯",
    route: "/scanner",
    color: "#6df3ac",
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

export default function HomePhoneScreen() {
  const router = useRouter();

  return (
    <PhoneFrame>
      <View style={styles.screen}>
        <View style={styles.grid}>
          {APPS.map((a) => (
            <Pressable
              key={a.key}
              onPress={() => {
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
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 18,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
    marginTop: 4,
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
});
