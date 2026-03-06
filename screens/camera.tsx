import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

const HOME_BAR_SPACE = 44;
const GRID_IDS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

type CamState = "occupied" | "empty" | "jammed" | "offline" | string;

function CameraFeed({ state }: { state: CamState }) {
  const flicker = useRef(new Animated.Value(0.12)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, {
          toValue: 0.22,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(flicker, {
          toValue: 0.1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(flicker, {
          toValue: 0.18,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(flicker, {
          toValue: 0.12,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [flicker]);

  const isNoSignal = state === "offline";
  const isJammed = state === "jammed";
  const isOccupied = state === "occupied";

  return (
    <View style={styles.feed}>
      <View style={styles.feedBase} />
      <View pointerEvents="none" style={styles.vignette} />
      <Animated.View
        pointerEvents="none"
        style={[styles.noise, { opacity: flicker }]}
      />
      <View pointerEvents="none" style={styles.scanlines} />

      {isOccupied && (
        <View pointerEvents="none" style={styles.figureWrap}>
          <View style={styles.figureHead} />
          <View style={styles.figureBody} />
        </View>
      )}

      {(isNoSignal || isJammed) && (
        <View pointerEvents="none" style={styles.noSignal}>
          <Text style={styles.noSignalText}>
            {isJammed ? "JAMMED" : "NO SIGNAL"}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function CamerasScreen() {
  const cameras = useGameStore((s) => s.cameras);
  const selectedCamId = useGameStore((s) => s.selectedCamId);
  const setSelectedCam = useGameStore((s) => s.setSelectedCam);
  const standbyMode = useGameStore((s) => s.standbyMode);
  const standbyMessage = useGameStore((s) => s.standbyMessage);
  const startCameraSim = useGameStore((s) => s.startCameraSim);
  const stopCameraSim = useGameStore((s) => s.stopCameraSim);

  const tiles = useMemo(() => GRID_IDS, []);

  useEffect(() => {
    startCameraSim();
    return () => stopCameraSim();
  }, [startCameraSim, stopCameraSim]);

  return (
    <PhoneFrame>
      <View style={styles.wrap}>
        <View style={styles.grid}>
          {tiles.map((id) => {
            const cam = cameras[id];
            const isSelected = selectedCamId === id;
            const state = (cam?.state ?? "offline") as CamState;

            return (
              <Pressable
                key={id}
                onPress={() => setSelectedCam(id)}
                style={[styles.tile, isSelected && styles.tileSelected]}
              >
                <CameraFeed state={state} />

                <View pointerEvents="none" style={styles.overlay}>
                  <Text style={styles.overlayText}>
                    {cam?.label ?? `CAM ${id}`}
                  </Text>
                  <Text style={styles.overlayTextSmall}>
                    {(cam?.state ?? "—").toUpperCase()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {standbyMode && (
          <View style={styles.standby}>
            <Text style={styles.standbyText}>{standbyMessage}</Text>
          </View>
        )}

        <View style={{ height: HOME_BAR_SPACE }} />
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 10, gap: 10 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  tile: {
    width: "23.2%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  tileSelected: {
    borderColor: "rgba(255,255,255,0.55)",
  },

  overlay: {
    position: "absolute",
    left: 6,
    top: 6,
    right: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  overlayText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    letterSpacing: 0.6,
  },

  overlayTextSmall: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 9,
    letterSpacing: 0.6,
  },

  standby: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.92)",
    paddingTop: 18,
    paddingHorizontal: 12,
    alignItems: "flex-start",
  },

  standbyText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    letterSpacing: 1.2,
  },

  feed: { ...StyleSheet.absoluteFillObject },

  feedBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },

  noise: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  scanlines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    transform: [{ scaleY: 1.02 }],
  },

  noSignal: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  noSignalText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    letterSpacing: 1,
  },

  figureWrap: {
    position: "absolute",
    left: "62%",
    top: "48%",
    width: "18%",
    height: "32%",
    opacity: 0.28,
  },

  figureHead: {
    width: "45%",
    height: "22%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.65)",
    alignSelf: "center",
    marginBottom: "10%",
  },

  figureBody: {
    width: "70%",
    height: "68%",
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignSelf: "center",
  },
});
