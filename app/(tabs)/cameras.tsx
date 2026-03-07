import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

const HOME_BAR_SPACE = 44;
const GRID_IDS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

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

function FeaturedCameraView() {
  const cameras = useGameStore((s) => s.cameras);
  const selectedCamId = useGameStore((s) => s.selectedCamId);
  const hallwayOneOccupied = useGameStore((s) => s.hallwayOneOccupied);
  const setHallwayOneOccupied = useGameStore((s) => s.setHallwayOneOccupied);

  const activeCamId = selectedCamId ?? 12;
  const cam = cameras[activeCamId];
  const camLabel = cam?.label ?? `CAM ${activeCamId}`;
  const camState = (cam?.state ?? "offline") as CamState;

  const hallwayState: HallwayState = hallwayOneOccupied ? "occupied" : "empty";

  const [playKey, setPlayKey] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cam12NativeRef = useRef<Video>(null);
  const cam12WebRef = useRef<HTMLVideoElement | null>(null);

  const cam13NativeRef = useRef<Video>(null);
  const cam13WebRef = useRef<HTMLVideoElement | null>(null);
  const cam13DirectionRef = useRef<1 | -1>(1);
  const cam13DurationRef = useRef(0);
  const cam13SwitchingRef = useRef(false);

  const isHallwayCam12 = activeCamId === 12;
  const isStandingLoopCam13 = activeCamId === 13;

  useEffect(() => {
    if (!isHallwayCam12) return;
    if (hallwayState !== "empty") return;

    timeoutRef.current = setTimeout(() => {
      setPlayKey((n) => n + 1);
      setHallwayOneOccupied(true);
    }, randomDelayMs());

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [hallwayState, isHallwayCam12, setHallwayOneOccupied]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isHallwayCam12) return;

    if (Platform.OS === "web") {
      const el = cam12WebRef.current;
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
      const player = cam12NativeRef.current;
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

    void runNative();
  }, [hallwayState, isHallwayCam12, playKey]);

  useEffect(() => {
    if (!isStandingLoopCam13) return;

    cam13DirectionRef.current = 1;
    cam13DurationRef.current = 0;
    cam13SwitchingRef.current = false;

    if (Platform.OS === "web") {
      const el = cam13WebRef.current;
      if (!el) return;

      el.loop = true;
      el.playbackRate = 0.55;

      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }

      return () => {
        el.pause();
        try {
          el.currentTime = 0;
        } catch {}
      };
    }

    const runNative = async () => {
      const player = cam13NativeRef.current;
      if (!player) return;

      try {
        await player.setPositionAsync(0);
        await player.setRateAsync(0.55, true);
        await player.playAsync();
      } catch {}
    };

    void runNative();

    return () => {
      const player = cam13NativeRef.current;
      if (!player) return;

      void (async () => {
        try {
          await player.pauseAsync();
          await player.setPositionAsync(0);
          await player.setRateAsync(0.55, true);
        } catch {}
      })();
    };
  }, [isStandingLoopCam13, playKey]);

  const endOccupiedCycle = () => {
    setHallwayOneOccupied(false);
  };

  const handleCam13StatusUpdate = async (status: AVPlaybackStatus) => {
    if (!isStandingLoopCam13) return;
    if (Platform.OS === "web") return;
    if (!status.isLoaded) return;

    if (status.durationMillis && cam13DurationRef.current === 0) {
      cam13DurationRef.current = status.durationMillis;
    }

    if (cam13SwitchingRef.current) return;

    const player = cam13NativeRef.current;
    if (!player) return;

    if (cam13DirectionRef.current === 1 && status.didJustFinish) {
      cam13SwitchingRef.current = true;

      try {
        cam13DirectionRef.current = -1;
        await player.setPositionAsync(
          Math.max(
            (cam13DurationRef.current || status.positionMillis || 0) - 40,
            0,
          ),
        );
        await player.setRateAsync(-0.55, true);
        await player.playAsync();
      } catch {
      } finally {
        cam13SwitchingRef.current = false;
      }

      return;
    }

    if (cam13DirectionRef.current === -1 && status.positionMillis <= 60) {
      cam13SwitchingRef.current = true;

      try {
        cam13DirectionRef.current = 1;
        await player.setPositionAsync(0);
        await player.setRateAsync(0.55, true);
        await player.playAsync();
      } catch {
      } finally {
        cam13SwitchingRef.current = false;
      }
    }
  };

  return (
    <View style={styles.featuredCard}>
      <View style={styles.featuredHeader}>
        <Text style={styles.featuredTitle}>{camLabel}</Text>
        <Text style={styles.featuredMeta}>
          {isHallwayCam12
            ? `HALLWAY 1 • ${hallwayState.toUpperCase()}`
            : camState.toUpperCase()}
        </Text>
      </View>

      <View style={styles.featuredFrame}>
        {isHallwayCam12 ? (
          Platform.OS === "web" ? (
            <View style={styles.featuredWebWrap}>
              {/* @ts-ignore */}
              <video
                key={`hallway1-web-${playKey}`}
                ref={(node) => {
                  cam12WebRef.current = node;
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
              ref={cam12NativeRef}
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
          )
        ) : isStandingLoopCam13 ? (
          Platform.OS === "web" ? (
            <View style={styles.featuredWebWrap}>
              {/* @ts-ignore */}
              <video
                key={`hallway-standing-web-${playKey}`}
                ref={(node) => {
                  cam13WebRef.current = node;
                }}
                src="/assets/?unstable_path=.%2Fassets%2Fcams%2Fhallway1%2Fguard-standing.mp4"
                muted
                playsInline
                preload="auto"
                loop
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
              key={`hallway-standing-native-${playKey}`}
              ref={cam13NativeRef}
              source={require("../../assets/cams/hallway1/guard-standing.mp4")}
              style={styles.featuredMedia}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
              isMuted
              onPlaybackStatusUpdate={handleCam13StatusUpdate}
            />
          )
        ) : (
          <View style={styles.featuredStaticFeed}>
            <SmallCameraFeed state={camState} />
            <View pointerEvents="none" style={styles.featuredOverlay}>
              <Text style={styles.featuredOverlayText}>{camLabel}</Text>
              <Text style={styles.featuredOverlayTextSmall}>
                {camState.toUpperCase()}
              </Text>
            </View>
          </View>
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
        <FeaturedCameraView />

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

  featuredStaticFeed: {
    width: "100%",
    height: "100%",
    position: "relative",
    backgroundColor: "#000",
  },

  featuredOverlay: {
    position: "absolute",
    left: 10,
    top: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  featuredOverlayText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
  },

  featuredOverlayTextSmall: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    letterSpacing: 0.7,
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
