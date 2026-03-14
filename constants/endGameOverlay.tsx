import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
};

export default function EndGameOverlay({ visible }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const stripeShift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      stripeShift.setValue(0);
      pulse.setValue(0.92);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(stripeShift, {
          toValue: 1,
          duration: 260,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0.94,
            duration: 180,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [visible, opacity, pulse, stripeShift]);

  const stripeTranslate = useMemo(
    () =>
      stripeShift.interpolate({
        inputRange: [0, 1],
        outputRange: [-48, 0],
      }),
    [stripeShift],
  );

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <View style={styles.blackBase} />

      <Animated.View
        style={[
          styles.stripeLayer,
          {
            transform: [{ translateX: stripeTranslate }],
          },
        ]}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <View key={i} style={styles.stripeRow}>
            {Array.from({ length: 12 }).map((__, j) => (
              <View
                key={`${i}-${j}`}
                style={[
                  styles.stripe,
                  (i + j) % 2 === 0 ? styles.yellow : styles.blackStripe,
                ]}
              />
            ))}
          </View>
        ))}
      </Animated.View>

      <View style={styles.scrim} />

      <Animated.View
        style={[styles.centerWrap, { transform: [{ scale: pulse }] }]}
      >
        <Text style={styles.warning}>DEVICE WIPE IN PROGRESS</Text>
        <Text style={styles.subWarning}>SECURE MEMORY PURGE</Text>
        <Text style={styles.meta}>DO NOT INTERRUPT</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  blackBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  stripeLayer: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ rotate: "-24deg" }],
    width: "140%",
    left: "-20%",
    top: "-10%",
  },
  stripeRow: {
    flexDirection: "row",
    height: 32,
  },
  stripe: {
    flex: 1,
  },
  yellow: {
    backgroundColor: "#f2c400",
  },
  blackStripe: {
    backgroundColor: "#0a0a0a",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  centerWrap: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderWidth: 3,
    borderColor: "#f2c400",
    backgroundColor: "rgba(0,0,0,0.86)",
    alignItems: "center",
    minWidth: 280,
  },
  warning: {
    color: "#f2c400",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1.4,
    textAlign: "center",
  },
  subWarning: {
    color: "#fff3a6",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 10,
    textAlign: "center",
  },
  meta: {
    color: "#ffffff",
    opacity: 0.9,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginTop: 8,
    textAlign: "center",
  },
});
