import PhoneFrame from "@/components/PhoneFrame";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const HOME_BAR_SPACE = 44;

const FAKE_BARS = 34;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function randomBars(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const base =
      0.15 + Math.abs(Math.sin(i * 0.45)) * 0.32 + Math.random() * 0.35;
    return clamp(base, 0.08, 1);
  });
}

export default function AudioScannerScreen() {
  const [listening, setListening] = useState(true);
  const [sensitivity, setSensitivity] = useState<"LOW" | "MED" | "HIGH">(
    "HIGH",
  );
  const [bars, setBars] = useState<number[]>(() => randomBars(FAKE_BARS));
  const [dbLevel, setDbLevel] = useState(-62);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => {
      const next = randomBars(FAKE_BARS).map((v) => {
        const scale =
          sensitivity === "LOW" ? 0.65 : sensitivity === "MED" ? 0.85 : 1;
        return clamp(v * scale, 0.06, 1);
      });

      setBars(next);

      const peak = Math.max(...next);
      const nextDb =
        sensitivity === "LOW"
          ? Math.round(-78 + peak * 18)
          : sensitivity === "MED"
            ? Math.round(-72 + peak * 22)
            : Math.round(-66 + peak * 28);

      setDbLevel(nextDb);
    }, 220);

    return () => clearInterval(id);
  }, [sensitivity]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.9],
  });

  const meterFill = useMemo((): `${number}%` => {
    const normalized = clamp((dbLevel + 80) / 40, 0, 1);
    return `${normalized * 100}%`;
  }, [dbLevel]);

  return (
    <PhoneFrame>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>ECHOSCAN</Text>
            <Text style={styles.headerSub}>Passive Acoustic Monitor</Text>
          </View>

          <View
            style={[
              styles.statusPill,
              listening ? styles.statusPillLive : styles.statusPillIdle,
            ]}
          >
            <Animated.View
              style={[
                styles.statusDot,
                listening && {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            <Text style={styles.statusText}>
              {listening ? "LISTENING" : "IDLE"}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.screenCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>LIVE INPUT</Text>
              <Text style={styles.cardMeta}>NOISE FLOOR {dbLevel} dB</Text>
            </View>

            <View style={styles.wavePanel}>
              <View style={styles.waveGrid} />

              <View style={styles.barsRow}>
                {bars.map((v, i) => (
                  <View key={i} style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(8, v * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.waveFooter}>
                <Text style={styles.axisText}>0s</Text>
                <Text style={styles.axisText}>+2s</Text>
                <Text style={styles.axisText}>+4s</Text>
              </View>
            </View>
          </View>

          <View style={styles.dualRow}>
            <View style={[styles.infoCard, styles.infoCardLeft]}>
              <Text style={styles.infoLabel}>GAIN</Text>
              <Text style={styles.infoValue}>{sensitivity}</Text>

              <View style={styles.segmentRow}>
                {(["LOW", "MED", "HIGH"] as const).map((level) => {
                  const active = sensitivity === level;
                  return (
                    <Pressable
                      key={level}
                      onPress={() => setSensitivity(level)}
                      style={[
                        styles.segmentBtn,
                        active && styles.segmentBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          active && styles.segmentTextActive,
                        ]}
                      >
                        {level}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.infoCard, styles.infoCardRight]}>
              <Text style={styles.infoLabel}>SIGNAL</Text>
              <Text style={styles.infoValue}>{dbLevel} dB</Text>

              <View style={styles.meterTrack}>
                <View style={[styles.meterFill, { width: meterFill }]} />
              </View>

              <View style={styles.meterLabels}>
                <Text style={styles.meterText}>LOW</Text>
                <Text style={styles.meterText}>MID</Text>
                <Text style={styles.meterText}>HOT</Text>
              </View>
            </View>
          </View>

          <View style={styles.lockCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>SOURCE LOCK</Text>
              <Text style={styles.cardMeta}>PASSIVE MODE</Text>
            </View>

            <View style={styles.lockGrid}>
              <View style={styles.lockCell}>
                <Text style={styles.lockKey}>Direction</Text>
                <Text style={styles.lockVal}>UNRESOLVED</Text>
              </View>
              <View style={styles.lockCell}>
                <Text style={styles.lockKey}>Range</Text>
                <Text style={styles.lockVal}>~ 12 m</Text>
              </View>
              <View style={styles.lockCell}>
                <Text style={styles.lockKey}>Pattern</Text>
                <Text style={styles.lockVal}>INTERMITTENT</Text>
              </View>
              <View style={styles.lockCell}>
                <Text style={styles.lockKey}>Type</Text>
                <Text style={styles.lockVal}>MOVEMENT</Text>
              </View>
            </View>
          </View>

          <View style={styles.hintCard}>
            <Text style={styles.hintText}>
              Increase gain to detect faint movement through walls. High gain
              may amplify ambient interference.
            </Text>
          </View>

          <View style={{ height: HOME_BAR_SPACE + 12 }} />
        </ScrollView>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 14,
  },

  header: {
    paddingHorizontal: 4,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "rgba(255,255,255,0.94)",
    letterSpacing: 0.8,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255,255,255,0.60)",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillLive: {
    backgroundColor: "rgba(46, 204, 113, 0.10)",
    borderColor: "rgba(46, 204, 113, 0.35)",
  },
  statusPillIdle: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#41d98a",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "rgba(255,255,255,0.88)",
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },

  screenCard: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.82)",
    letterSpacing: 0.8,
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.50)",
  },

  wavePanel: {
    height: 210,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(7, 12, 18, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(90, 170, 255, 0.18)",
    overflow: "hidden",
    justifyContent: "space-between",
  },
  waveGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    borderRadius: 18,
  },
  barsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  barTrack: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    minHeight: 8,
    borderRadius: 999,
    backgroundColor: "#5da8ff",
    shadowColor: "#5da8ff",
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  waveFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  axisText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.38)",
    fontWeight: "700",
  },

  dualRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  infoCardLeft: {},
  infoCardRight: {},

  infoLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.54)",
    letterSpacing: 0.8,
  },
  infoValue: {
    marginTop: 6,
    marginBottom: 12,
    fontSize: 22,
    fontWeight: "900",
    color: "rgba(255,255,255,0.95)",
  },

  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  segmentBtnActive: {
    backgroundColor: "rgba(93,168,255,0.18)",
    borderColor: "rgba(93,168,255,0.42)",
  },
  segmentText: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.70)",
    letterSpacing: 0.6,
  },
  segmentTextActive: {
    color: "#9bc8ff",
  },

  meterTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  meterFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#41d98a",
  },
  meterLabels: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meterText: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.45)",
  },

  lockCard: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  lockGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  lockCell: {
    width: "47%",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  lockKey: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.50)",
    marginBottom: 6,
  },
  lockVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "rgba(255,255,255,0.90)",
  },

  hintCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(93,168,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(93,168,255,0.16)",
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
    color: "rgba(255,255,255,0.72)",
  },
});
