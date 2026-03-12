import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const HOME_BAR_SPACE = 44;
const GRID_IDS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

function SmallCameraFeed({
  offline = false,
  label = "OFFLINE",
}: {
  offline?: boolean;
  label?: string;
}) {
  return (
    <View style={styles.feed}>
      {offline ? (
        <View style={styles.feedOfflineMini}>
          <Text style={styles.feedOfflineMiniText}>{label}</Text>
        </View>
      ) : (
        <View style={styles.feedBase} />
      )}
    </View>
  );
}

function FeaturedCameraView({ width }: { width: number }) {
  const cameraNetworkOnline = useGameStore((s) => s.cameraNetworkOnline);
  const cameras = useGameStore((s) => s.cameras);
  const selectedCamId = useGameStore((s) => s.selectedCamId);
  const hallwayOneOccupied = useGameStore((s) => s.hallwayOneOccupied);
  const setHallwayOneOccupied = useGameStore((s) => s.setHallwayOneOccupied);

  const activeCamId = selectedCamId ?? 12;
  const cam = cameras[activeCamId];
  const camLabel = cam?.label ?? `CAM ${activeCamId}`;
  const isCamOffline = !cameraNetworkOnline || !cam || cam.state === "offline";

  const cam12NativeRef = useRef<Video>(null);
  const cam12WebRef = useRef<HTMLVideoElement | null>(null);

  const cam13NativeRef = useRef<Video>(null);
  const cam13WebRef = useRef<HTMLVideoElement | null>(null);
  const cam13DirectionRef = useRef<1 | -1>(1);
  const cam13DurationRef = useRef(0);
  const cam13SwitchingRef = useRef(false);

  const cam12HasPlayedRef = useRef(false);
  const cam12HasStartedRef = useRef(false);
  const [cam12NativeLoaded, setCam12NativeLoaded] = useState(false);

  const isHallwayCam12 = activeCamId === 12 && !isCamOffline;
  const isStandingLoopCam13 = activeCamId === 13 && !isCamOffline;

  useEffect(() => {
    if (!isHallwayCam12) {
      setCam12NativeLoaded(false);
      return;
    }

    if (Platform.OS === "web") {
      const el = cam12WebRef.current;
      if (!el) return;

      const prep = () => {
        try {
          el.pause();
          if (!cam12HasPlayedRef.current) {
            el.currentTime = 0;
          }
        } catch {}
      };

      if (el.readyState >= 1) {
        prep();
      } else {
        const onLoadedMetadata = () => prep();
        el.addEventListener("loadedmetadata", onLoadedMetadata);
        return () => {
          el.removeEventListener("loadedmetadata", onLoadedMetadata);
        };
      }

      return;
    }

    const prepNative = async () => {
      const player = cam12NativeRef.current;
      if (!player) return;

      try {
        await player.pauseAsync();
        if (!cam12HasPlayedRef.current) {
          await player.setPositionAsync(0);
        }
      } catch {}
    };

    void prepNative();
  }, [isHallwayCam12]);

  useEffect(() => {
    if (!isHallwayCam12) return;
    if (!hallwayOneOccupied) return;
    if (cam12HasPlayedRef.current) return;
    if (cam12HasStartedRef.current) return;

    if (Platform.OS === "web") {
      cam12HasStartedRef.current = true;

      const el = cam12WebRef.current;
      if (!el) {
        cam12HasStartedRef.current = false;
        return;
      }

      el.playbackRate = 0.65;

      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          cam12HasStartedRef.current = false;
        });
      }

      return;
    }

    if (!cam12NativeLoaded) return;

    cam12HasStartedRef.current = true;

    const runNative = async () => {
      const player = cam12NativeRef.current;
      if (!player) {
        cam12HasStartedRef.current = false;
        return;
      }

      try {
        await player.setPositionAsync(0);
        await player.playAsync();
        await player.setRateAsync(0.65, true);
      } catch {
        cam12HasStartedRef.current = false;
      }
    };

    void runNative();
  }, [hallwayOneOccupied, isHallwayCam12, cam12NativeLoaded]);

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
  }, [isStandingLoopCam13]);

  const endCam12Playback = () => {
    cam12HasPlayedRef.current = true;
    cam12HasStartedRef.current = false;
    setHallwayOneOccupied(false);

    if (Platform.OS === "web") {
      const el = cam12WebRef.current;
      if (!el) return;
      try {
        el.pause();
      } catch {}
      return;
    }

    const stopNative = async () => {
      const player = cam12NativeRef.current;
      if (!player) return;

      try {
        await player.pauseAsync();
      } catch {}
    };

    void stopNative();
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

  if (isCamOffline) {
    return (
      <View style={[styles.featuredCard, { width }]}>
        <View style={styles.featuredHeader}>
          <Text style={styles.featuredTitle}>{camLabel}</Text>
          <Text style={styles.featuredMeta}>NO FEED</Text>
        </View>

        <View style={styles.featuredFrame}>
          <View style={styles.feedOffline}>
            <Text style={styles.feedOfflineTitle}>NO FEED</Text>
            <Text style={styles.feedOfflineText}>
              Camera network unavailable
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.featuredCard, { width }]}>
      <View style={styles.featuredHeader}>
        <Text style={styles.featuredTitle}>{camLabel}</Text>
        <Text style={styles.featuredMeta}>LIVE FEED</Text>
      </View>

      <View style={styles.featuredFrame}>
        {isHallwayCam12 ? (
          Platform.OS === "web" ? (
            <View style={styles.featuredWebWrap}>
              {/* @ts-ignore */}
              <video
                ref={(node) => {
                  cam12WebRef.current = node;
                }}
                src="/assets/?unstable_path=.%2Fassets%2Fcams%2Fhallway1%2Fguard-left-to-right.mp4"
                muted
                playsInline
                preload="auto"
                onEnded={endCam12Playback}
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
              ref={cam12NativeRef}
              source={require("../../assets/cams/hallway1/guard-left-to-right.mp4")}
              style={styles.featuredMedia}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
              isLooping={false}
              isMuted
              onLoad={() => {
                setCam12NativeLoaded(true);

                const prepNative = async () => {
                  const player = cam12NativeRef.current;
                  if (!player) return;

                  try {
                    await player.pauseAsync();

                    if (!cam12HasPlayedRef.current) {
                      await player.setPositionAsync(0);
                    }

                    if (
                      hallwayOneOccupied &&
                      !cam12HasPlayedRef.current &&
                      !cam12HasStartedRef.current
                    ) {
                      cam12HasStartedRef.current = true;
                      await player.setPositionAsync(0);
                      await player.playAsync();
                      await player.setRateAsync(0.65, true);
                    }
                  } catch {
                    cam12HasStartedRef.current = false;
                  }
                };

                void prepNative();
              }}
              onPlaybackStatusUpdate={(status) => {
                if (!status.isLoaded) return;
                if (status.didJustFinish) {
                  endCam12Playback();
                }
              }}
            />
          )
        ) : isStandingLoopCam13 ? (
          Platform.OS === "web" ? (
            <View style={styles.featuredWebWrap}>
              {/* @ts-ignore */}
              <video
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
            <SmallCameraFeed />
            <View pointerEvents="none" style={styles.featuredOverlay}>
              <Text style={styles.featuredOverlayText}>{camLabel}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

export default function CamerasScreen() {
  const cameraNetworkOnline = useGameStore((s) => s.cameraNetworkOnline);
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
  const [innerWidth, setInnerWidth] = useState(0);

  useEffect(() => {
    if (!cameraNetworkOnline) {
      stopCameraSim();
      return;
    }

    startCameraSim();
    return () => stopCameraSim();
  }, [cameraNetworkOnline, startCameraSim, stopCameraSim]);

  useEffect(() => {
    if (!cameraNetworkOnline) return;
    setCameraState(12, hallwayOneOccupied ? "occupied" : "empty");
  }, [cameraNetworkOnline, hallwayOneOccupied, setCameraState]);

  const handleWrapLayout = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.width;
    if (measured > 0 && Math.abs(measured - innerWidth) > 1) {
      setInnerWidth(measured);
    }
  };

  const usableWidth = Math.max(innerWidth, 1);
  const tileGap = 8;
  const columns = usableWidth >= 560 ? 6 : 4;
  const contentWidth = usableWidth;
  const tileSize = Math.floor(
    (contentWidth - tileGap * (columns - 1)) / columns,
  );

  return (
    <PhoneFrame>
      <View style={styles.wrap} onLayout={handleWrapLayout}>
        {innerWidth > 0 && (
          <>
            <FeaturedCameraView width={contentWidth} />

            <View style={[styles.grid, { width: contentWidth }]}>
              {tiles.map((id, index) => {
                const cam = cameras[id];
                const isSelected = selectedCamId === id;
                const isEndOfRow = (index + 1) % columns === 0;
                const isOffline =
                  !cameraNetworkOnline || !cam || cam.state === "offline";

                return (
                  <Pressable
                    key={id}
                    onPress={() => setSelectedCam(id)}
                    style={[
                      styles.tile,
                      {
                        width: tileSize,
                        height: tileSize,
                        marginRight: isEndOfRow ? 0 : tileGap,
                      },
                      isSelected && styles.tileSelected,
                    ]}
                  >
                    <SmallCameraFeed offline={isOffline} />

                    <View pointerEvents="none" style={styles.overlay}>
                      <Text style={styles.overlayText}>
                        {cam?.label ?? `CAM ${id}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

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
    alignItems: "stretch",
  },

  featuredCard: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(0,0,0,0.4)",
    marginBottom: 10,
    alignSelf: "center",
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

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignSelf: "center",
  },

  tile: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.35)",
    position: "relative",
    marginBottom: 8,
  },

  tileSelected: {
    borderColor: "rgba(255,255,255,0.55)",
  },

  feed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  feedBase: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  feedOffline: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },

  feedOfflineTitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 6,
  },

  feedOfflineText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    letterSpacing: 0.5,
  },

  feedOfflineMini: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },

  feedOfflineMiniText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
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

  standby: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
});
