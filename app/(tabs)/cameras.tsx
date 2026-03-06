import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import { ResizeMode, Video } from "expo-av";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

const HOME_BAR_SPACE = 44;
const GRID_IDS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

type CamState = "occupied" | "empty" | "jammed" | "offline" | string;
type HallwayState = "empty" | "occupied";

function randomDelayMs() {
  return 7000 + Math.floor(Math.random() * 9000);
}

function SmallCameraFeed({ state }: { state: CamState }) {
  const isNoSignal = state === "offline";
  const isJammed = state === "jammed";
  const isOccupied = state === "occupied";

  return (
    <View style={styles.feed}>
      <View style={styles.feedBase} />

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

function FeaturedHallwayOne() {
  const hallwayOneOccupied = useGameStore((s) => s.hallwayOneOccupied);
  const setHallwayOneOccupied = useGameStore((s) => s.setHallwayOneOccupied);

  const hallwayState: HallwayState = hallwayOneOccupied ? "occupied" : "empty";

  const [playKey, setPlayKey] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeVideoRef = useRef<Video>(null);
  const webVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (hallwayState !== "empty") return;

    timeoutRef.current = setTimeout(() => {
      setPlayKey((n) => n + 1);
      setHallwayOneOccupied(true);
    }, randomDelayMs());

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [hallwayState, setHallwayOneOccupied]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      const el = webVideoRef.current;
      if (!el) return;

      el.playbackRate = 0.65;

      if (hallwayState === "occupied") {
        const playPromise = el.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      } else {
        el.pause();
        try {
          el.currentTime = 0;
        } catch {}
      }

      return;
    }

    const runNative = async () => {
      const player = nativeVideoRef.current;
      if (!player) return;

      try {
        await player.setRateAsync(0.65, true);

        if (hallwayState === "occupied") {
          await player.playAsync();
        } else {
          await player.pauseAsync();
          await player.setPositionAsync(0);
        }
      } catch {}
    };

    runNative();
  }, [hallwayState, playKey]);

  const endOccupiedCycle = () => {
    setHallwayOneOccupied(false);
  };

  return (
    <View style={styles.featuredCard}>
      <View style={styles.featuredHeader}>
        <Text style={styles.featuredTitle}>CAM 12</Text>
        <Text style={styles.featuredMeta}>
          HALLWAY 1 • {hallwayState.toUpperCase()}
        </Text>
      </View>

      <View style={styles.featuredFrame}>
        {Platform.OS === "web" ? (
          <View style={styles.featuredWebWrap}>
            {/* @ts-ignore */}
            <video
              key={`hallway1-web-${playKey}`}
              ref={(node) => {
                webVideoRef.current = node;
              }}
              src="/assets/?unstable_path=.%2Fassets%2Fcams%2Fhallway1%2Fguard-left-to-right.mp4"
              muted
              playsInline
              preload="auto"
              onEnded={endOccupiedCycle}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                backgroundColor: "#000",
              }}
            />
          </View>
        ) : (
          <Video
            key={`hallway1-native-${playKey}`}
            ref={nativeVideoRef}
            source={require("../../assets/cams/hallway1/guard-left-to-right.mp4")}
            style={styles.featuredMedia}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
            isLooping={false}
            isMuted
            onPlaybackStatusUpdate={(status) => {
              if (!status.isLoaded) return;
              if (status.didJustFinish) {
                endOccupiedCycle();
              }
            }}
          />
        )}
      </View>
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
  const hallwayOneOccupied = useGameStore((s) => s.hallwayOneOccupied);
  const setCameraState = useGameStore((s) => s.setCameraState);

  const tiles = useMemo(() => GRID_IDS, []);

  useEffect(() => {
    startCameraSim();
    return () => stopCameraSim();
  }, [startCameraSim, stopCameraSim]);

  useEffect(() => {
    setCameraState(12, hallwayOneOccupied ? "occupied" : "empty");
  }, [hallwayOneOccupied, setCameraState]);

  return (
    <PhoneFrame>
      <View style={styles.wrap}>
        <FeaturedHallwayOne />

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
                <SmallCameraFeed state={state} />

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
  wrap: {
    flex: 1,
    padding: 10,
    gap: 10,
  },

  featuredCard: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  featuredHeader: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  featuredTitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
  },

  featuredMeta: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 10,
    letterSpacing: 0.7,
  },

  featuredFrame: {
    height: 210,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  featuredWebWrap: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },

  featuredMedia: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },

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

  feed: {
    ...StyleSheet.absoluteFillObject,
  },

  feedBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
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

  noSignal: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
  },

  noSignalText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    letterSpacing: 1,
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
