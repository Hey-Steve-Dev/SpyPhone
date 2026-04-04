import { useGameStore } from "@/store/useGameStore";
import { useIsFocused } from "@react-navigation/native";
import { ResizeMode, Video } from "expo-av";
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
const CAM12_PLAYBACK_RATE = 0.65;

const CCTV_FONT = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDateStamp(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatTimeStamp(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(
    date.getSeconds(),
  )}`;
}

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

function CameraOverlay({
  camLabel,
  live = true,
  compact = false,
}: {
  camLabel: string;
  live?: boolean;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (compact) {
    return (
      <View pointerEvents="none" style={styles.overlay}>
        <Text style={styles.overlayText}>{camLabel}</Text>
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.featuredOverlayWrap}>
      <View style={styles.featuredOverlayTopRow}>
        <Text style={styles.featuredOverlayLedText}>{camLabel}</Text>
        <Text style={styles.featuredOverlayLedText}>
          {live ? "REC ● LIVE" : "REC"}
        </Text>
      </View>

      <View style={styles.featuredOverlayBottomRow}>
        <Text style={styles.featuredOverlayLedText}>
          {formatDateStamp(now)}
        </Text>
        <Text style={styles.featuredOverlayLedText}>
          {formatTimeStamp(now)}
        </Text>
      </View>
    </View>
  );
}

function FeaturedCameraView({ width }: { width: number }) {
  const cameraNetworkOnline = useGameStore((s) => s.cameraNetworkOnline);
  const cameras = useGameStore((s) => s.cameras);
  const selectedCamId = useGameStore((s) => s.selectedCamId);

  const camera12Sequence = useGameStore((s) => s.camera12Sequence);
  const completeCamera12Sequence = useGameStore(
    (s) => s.completeCamera12Sequence,
  );

  const activeCamId = selectedCamId ?? 12;
  const cam = cameras[activeCamId];
  const camLabel = cam?.label ?? `CAM ${activeCamId}`;
  const isCamOffline = !cameraNetworkOnline || !cam || cam.state === "offline";

  const cam12NativeRef = useRef<Video>(null);
  const cam12WebRef = useRef<HTMLVideoElement | null>(null);
  const cam12DurationMsRef = useRef(0);
  const cam12SyncingRef = useRef(false);
  const [cam12NativeLoaded, setCam12NativeLoaded] = useState(false);

  const isCam12Selected = activeCamId === 12 && !isCamOffline;
  const isCam12Playing = isCam12Selected && camera12Sequence.mode === "playing";

  const getCam12ElapsedMs = () => {
    if (!camera12Sequence.startedAt) return 0;
    return Date.now() - camera12Sequence.startedAt;
  };

  const getCam12EffectiveDurationMs = () => {
    const raw = cam12DurationMsRef.current;
    if (!raw) return 0;
    return raw / CAM12_PLAYBACK_RATE;
  };

  const getCam12SourcePositionMs = () => {
    const raw = cam12DurationMsRef.current;
    if (!raw) return 0;

    const elapsed = getCam12ElapsedMs();
    return Math.max(0, Math.min(elapsed * CAM12_PLAYBACK_RATE, raw - 40));
  };

  const resetCam12ToFirstFrame = async () => {
    if (Platform.OS === "web") {
      const el = cam12WebRef.current;
      if (!el) return;

      try {
        el.pause();
        el.currentTime = 0;
        el.playbackRate = CAM12_PLAYBACK_RATE;
      } catch {}

      return;
    }

    const player = cam12NativeRef.current;
    if (!player || !cam12NativeLoaded) return;

    try {
      await player.setPositionAsync(0);
      await player.pauseAsync();
      await player.setRateAsync(CAM12_PLAYBACK_RATE, true);
    } catch {}
  };

  const pauseCam12 = async () => {
    if (Platform.OS === "web") {
      const el = cam12WebRef.current;
      if (!el) return;
      try {
        el.pause();
      } catch {}
      return;
    }

    const player = cam12NativeRef.current;
    if (!player) return;

    try {
      await player.pauseAsync();
    } catch {}
  };

  const endCam12Playback = () => {
    void pauseCam12();
    completeCamera12Sequence();
  };

  const syncCam12Playback = async () => {
    if (!isCam12Playing) return;
    if (!camera12Sequence.startedAt) return;
    if (cam12SyncingRef.current) return;

    const effectiveDuration = getCam12EffectiveDurationMs();
    if (effectiveDuration > 0 && getCam12ElapsedMs() >= effectiveDuration) {
      endCam12Playback();
      return;
    }

    const sourcePositionMs = getCam12SourcePositionMs();

    cam12SyncingRef.current = true;

    if (Platform.OS === "web") {
      const el = cam12WebRef.current;
      if (!el) {
        cam12SyncingRef.current = false;
        return;
      }

      try {
        el.currentTime = sourcePositionMs / 1000;
        el.playbackRate = CAM12_PLAYBACK_RATE;
        await el.play();
      } catch {
      } finally {
        cam12SyncingRef.current = false;
      }

      return;
    }

    const player = cam12NativeRef.current;
    if (!player || !cam12NativeLoaded) {
      cam12SyncingRef.current = false;
      return;
    }

    try {
      await player.setPositionAsync(sourcePositionMs);
      await player.playAsync();
      await player.setRateAsync(CAM12_PLAYBACK_RATE, true);
    } catch {
    } finally {
      cam12SyncingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isCam12Selected) {
      void pauseCam12();
      return;
    }

    if (camera12Sequence.mode === "playing") {
      void syncCam12Playback();
      return;
    }

    void resetCam12ToFirstFrame();
  }, [
    isCam12Selected,
    camera12Sequence.mode,
    camera12Sequence.startedAt,
    cam12NativeLoaded,
  ]);

  useEffect(() => {
    if (camera12Sequence.mode !== "playing") return;

    const timer = setInterval(() => {
      const effectiveDuration = getCam12EffectiveDurationMs();
      if (!effectiveDuration) return;

      if (getCam12ElapsedMs() >= effectiveDuration) {
        endCam12Playback();
      }
    }, 150);

    return () => clearInterval(timer);
  }, [camera12Sequence.mode, camera12Sequence.startedAt]);

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
        {activeCamId === 12 && !isCamOffline ? (
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
                autoPlay={false}
                onLoadedData={() => {
                  const el = cam12WebRef.current;
                  if (!el) return;

                  const durationMs = Number.isFinite(el.duration)
                    ? el.duration * 1000
                    : 0;

                  if (durationMs > 0) {
                    cam12DurationMsRef.current = durationMs;
                  }

                  if (camera12Sequence.mode !== "playing") {
                    try {
                      el.currentTime = 0;
                      el.pause();
                      el.playbackRate = CAM12_PLAYBACK_RATE;
                    } catch {}
                    return;
                  }

                  void syncCam12Playback();
                }}
                onEnded={() => {
                  endCam12Playback();
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  backgroundColor: "#000",
                }}
              />
              <CameraOverlay camLabel={camLabel} live />
            </View>
          ) : (
            <View style={styles.featuredMediaWrap}>
              <Video
                ref={cam12NativeRef}
                source={require("../../assets/cams/hallway1/guard-left-to-right.mp4")}
                style={styles.featuredMedia}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isLooping={false}
                isMuted
                onLoad={(status) => {
                  setCam12NativeLoaded(true);

                  if (status.isLoaded && status.durationMillis) {
                    cam12DurationMsRef.current = status.durationMillis;
                  }

                  if (camera12Sequence.mode !== "playing") {
                    const player = cam12NativeRef.current;
                    if (!player) return;

                    void (async () => {
                      try {
                        await player.setPositionAsync(0);
                        await player.pauseAsync();
                        await player.setRateAsync(CAM12_PLAYBACK_RATE, true);
                      } catch {}
                    })();

                    return;
                  }

                  void syncCam12Playback();
                }}
                onPlaybackStatusUpdate={(status) => {
                  if (!status.isLoaded) return;
                  if (status.didJustFinish) {
                    endCam12Playback();
                  }
                }}
              />
              <CameraOverlay camLabel={camLabel} live />
            </View>
          )
        ) : (
          <View style={styles.featuredStaticFeed}>
            <SmallCameraFeed />
            <CameraOverlay camLabel={camLabel} live />
          </View>
        )}
      </View>
    </View>
  );
}

export default function CamerasScreen() {
  const isFocused = useIsFocused();

  const cameraNetworkOnline = useGameStore((s) => s.cameraNetworkOnline);
  const cameras = useGameStore((s) => s.cameras);
  const selectedCamId = useGameStore((s) => s.selectedCamId);
  const setSelectedCam = useGameStore((s) => s.setSelectedCam);
  const sendMissionEvent = useGameStore((s) => s.sendMissionEvent);
  const standbyMode = useGameStore((s) => s.standbyMode);
  const standbyMessage = useGameStore((s) => s.standbyMessage);
  const startCameraSim = useGameStore((s) => s.startCameraSim);
  const stopCameraSim = useGameStore((s) => s.stopCameraSim);
  const missionPhase = useGameStore((s) => s.mission.phase);
  const cameraObjectiveActive = useGameStore((s) => s.cameraObjectiveActive);
  const targetCameraId = useGameStore((s) => s.targetCameraId);

  const tiles = useMemo(() => GRID_IDS, []);
  const [innerWidth, setInnerWidth] = useState(0);
  const retriggeredCameraWatchRef = useRef(false);
  const lesson2Cam12ViewedRef = useRef(false);

  useEffect(() => {
    if (!cameraNetworkOnline || !isFocused) {
      stopCameraSim();
      return;
    }

    startCameraSim();
    return () => stopCameraSim();
  }, [cameraNetworkOnline, isFocused, startCameraSim, stopCameraSim]);

  useEffect(() => {
    if (!isFocused) return;
    if (!cameraNetworkOnline) return;

    const activeId = selectedCamId ?? 12;
    setSelectedCam(activeId);
  }, [isFocused, cameraNetworkOnline, selectedCamId, setSelectedCam]);

  useEffect(() => {
    const activeId = selectedCamId ?? 12;
    const shouldAutoCountCam12View =
      isFocused &&
      cameraNetworkOnline &&
      (missionPhase === "lesson_2_move_prompt" ||
        missionPhase === "lesson_2_move_ready") &&
      activeId === 12;

    if (!shouldAutoCountCam12View) {
      lesson2Cam12ViewedRef.current = false;
      return;
    }

    if (lesson2Cam12ViewedRef.current) return;
    lesson2Cam12ViewedRef.current = true;

    sendMissionEvent({ type: "CAMERA_VIEWED", cameraId: 12 });
  }, [
    isFocused,
    cameraNetworkOnline,
    missionPhase,
    selectedCamId,
    sendMissionEvent,
  ]);

  useEffect(() => {
    const shouldRetriggerCam12 =
      isFocused &&
      cameraNetworkOnline &&
      missionPhase === "camera_watch" &&
      cameraObjectiveActive &&
      targetCameraId === 12 &&
      (selectedCamId ?? 12) === 12;

    if (!shouldRetriggerCam12) {
      retriggeredCameraWatchRef.current = false;
      return;
    }

    if (retriggeredCameraWatchRef.current) return;
    retriggeredCameraWatchRef.current = true;

    setSelectedCam(12);
  }, [
    isFocused,
    cameraNetworkOnline,
    missionPhase,
    cameraObjectiveActive,
    targetCameraId,
    selectedCamId,
    setSelectedCam,
  ]);

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
                  onPress={() => {
                    setSelectedCam(id);
                    sendMissionEvent({ type: "CAMERA_VIEWED", cameraId: id });

                    if (id === 12) {
                      lesson2Cam12ViewedRef.current = true;
                    } else {
                      lesson2Cam12ViewedRef.current = false;
                    }
                  }}
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

                  <CameraOverlay
                    camLabel={cam?.label ?? `CAM ${id}`}
                    compact
                    live
                  />
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
    position: "relative",
  },

  featuredMediaWrap: {
    width: "100%",
    height: "100%",
    position: "relative",
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

  featuredOverlayWrap: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 8,
    bottom: 8,
    justifyContent: "space-between",
  },

  featuredOverlayTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  featuredOverlayBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  featuredOverlayLedText: {
    color: "#6cff6c",
    fontSize: 12,
    fontFamily: CCTV_FONT,
    fontWeight: "700",
    letterSpacing: 0.8,
    textShadowColor: "rgba(108,255,108,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    backgroundColor: "rgba(0,0,0,0.18)",
    paddingHorizontal: 4,
    paddingVertical: 1,
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
    color: "#6cff6c",
    fontSize: 10,
    fontFamily: CCTV_FONT,
    fontWeight: "700",
    letterSpacing: 0.7,
    textShadowColor: "rgba(108,255,108,0.32)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
    backgroundColor: "rgba(0,0,0,0.18)",
    paddingHorizontal: 3,
    paddingVertical: 1,
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
