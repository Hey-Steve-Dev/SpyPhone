import type { MissionState } from "@/lib/missionEngine";
import { create } from "zustand";

type Banner = {
  on: boolean;
  title: string;
  message: string;
};

type ThreadItem = {
  id: string;
  at: number;
  from: "handler" | "system" | "player";
  text: string;
};

type ReplyChip = {
  id: string;
  label: string;
  action: string;
};

type JammerBand = "VHF" | "UHF" | "LTE" | "SAT" | "WIFI";
type JammerSweep = "narrow" | "wide";
type JammerBurst = "low" | "med" | "high";

type JammerConfig = {
  enabled: boolean;
  band: JammerBand;
  strength: number;
  sweep: JammerSweep;
  burst: JammerBurst;
  stealth: boolean;
  autoMask: boolean;
};

type NetworkBand = "VHF" | "UHF" | "LTE" | "SAT" | "WIFI" | "5G";

type NetworkConnectedMeta = {
  ssid: string;
  band: NetworkBand;
  security: string;
  bssid: string;
  channel: number;
};

type NetworkLogItem = {
  id: string;
  at: number;
  level: "SYS" | "SCAN" | "LINK" | "HACK" | "WARN";
  text: string;
};

type NetworkState = {
  preferredBand: NetworkBand;
  autoHop: boolean;
  stealth: boolean;
  connectedId: string | null;
  connectedMeta: NetworkConnectedMeta | null;
  logs: NetworkLogItem[];
  scanCache?: any[];
};

type CameraState = "empty" | "motion" | "occupied" | "jammed" | "offline";

type CameraFeed = {
  id: number;
  label: string;
  zone: string;
  state: CameraState;
  alert: boolean;
  hasTarget: boolean;
  lastSeenAt: number | null;
};

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const CAMERA_IDS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

function makeInitialCameras(): Record<number, CameraFeed> {
  return {
    12: {
      id: 12,
      label: "CAM 12",
      zone: "Lobby North",
      state: "empty",
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    13: {
      id: 13,
      label: "CAM 13",
      zone: "Hall A",
      state: "empty",
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    14: {
      id: 14,
      label: "CAM 14",
      zone: "Hall B",
      state: "empty",
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    15: {
      id: 15,
      label: "CAM 15",
      zone: "Service Door",
      state: "empty",
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    16: {
      id: 16,
      label: "CAM 16",
      zone: "Freight Hall",
      state: "empty",
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    17: {
      id: 17,
      label: "CAM 17",
      zone: "Stairwell",
      state: "empty",
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    18: {
      id: 18,
      label: "CAM 18",
      zone: "Loading Bay",
      state: "empty",
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    19: {
      id: 19,
      label: "CAM 19",
      zone: "Records Hall",
      state: "empty",
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    20: {
      id: 20,
      label: "CAM 20",
      zone: "East Corridor",
      state: "empty",
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    21: {
      id: 21,
      label: "CAM 21",
      zone: "Boiler Access",
      state: "empty",
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    22: {
      id: 22,
      label: "CAM 22",
      zone: "Archive Entry",
      state: "empty",
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    23: {
      id: 23,
      label: "CAM 23",
      zone: "West Hall",
      state: "empty",
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
  };
}

type GameState = {
  trace: number;
  secondsLeft: number;
  timerRunning: boolean;
  hallwayOneOccupied: boolean;
  setHallwayOneOccupied: (occupied: boolean) => void;

  booted: boolean;
  bootGame: () => void;

  network: NetworkState;
  setNetwork: (patch: Partial<NetworkState>) => void;
  appendNetworkLog: (item: NetworkLogItem) => void;
  clearNetworkLog: () => void;

  heartbeatOn: boolean;
  startHeartbeat: () => void;
  stopHeartbeat: () => void;

  commsConnected: boolean;
  commsConnecting: boolean;
  commsJammed: boolean;

  jammer: JammerConfig;
  setJammer: (patch: Partial<JammerConfig>) => void;

  terminalLocked: boolean;

  banner: Banner;

  thread: ThreadItem[];
  pushThread: (from: ThreadItem["from"], text: string) => void;
  clearThread: () => void;

  replyChips: ReplyChip[];
  setReplyChips: (chips: ReplyChip[]) => void;
  clearReplyChips: () => void;

  mission: MissionState;
  setMissionStep: (step: number) => void;
  resetMission: () => void;

  missionDeadlineAt: number | null;
  setMissionDeadlineMsFromNow: (ms: number) => void;
  clearMissionDeadline: () => void;

  setTrace: (next: number, reason?: string) => void;
  bumpTrace: (delta: number, reason?: string) => void;

  setTimerRunning: (on: boolean) => void;
  tick: () => void;

  setTerminalLocked: (on: boolean) => void;

  bannerPush: (title: string, message: string, ms?: number) => void;
  bannerClear: () => void;

  connectComms: () => void;
  setCommsJammed: (on: boolean) => void;

  cameras: Record<number, CameraFeed>;
  selectedCamId: number | null;
  cameraSimTimer: ReturnType<typeof setInterval> | null;
  standbyMode: boolean;
  standbyMessage: string;
  cameraObjectiveActive: boolean;
  cameraObjectiveResolved: boolean;
  targetCameraId: number | null;

  setSelectedCam: (id: number) => void;
  setStandbyMode: (on: boolean, message?: string) => void;
  setCameraState: (id: number, state: CameraState) => void;
  triggerCameraTarget: (id: number) => void;
  clearCameraTarget: (id: number) => void;
  startCameraObjective: (targetId?: number) => void;
  resolveCameraObjective: () => void;
  resetCameras: () => void;
  startCameraSim: () => void;
  stopCameraSim: () => void;
};

export const useGameStore = create<GameState>((set, get) => ({
  trace: 16,
  secondsLeft: 150,
  timerRunning: true,
  hallwayOneOccupied: false,
  setHallwayOneOccupied: (occupied) => set({ hallwayOneOccupied: occupied }),

  booted: false,

  network: {
    preferredBand: "LTE",
    autoHop: true,
    stealth: true,
    connectedId: null,
    connectedMeta: null,
    logs: [],
    scanCache: [],
  },

  bootGame: () => {
    const s = get();
    if (s.booted) return;

    set({ booted: true });
    get().setTerminalLocked(true);
    get().setMissionStep(0);
    get().clearThread();
    get().clearReplyChips();
  },

  setNetwork: (patch) =>
    set((s) => {
      const prev = s.network;
      const next = { ...s.network, ...patch };

      const connectedNow =
        typeof patch.connectedId === "string" && patch.connectedId.length > 0;

      const justLinked = prev.connectedId == null && connectedNow;
      const outState: { network: NetworkState } = { network: next };

      if (justLinked) {
        const meta = (patch.connectedMeta ??
          next.connectedMeta) as NetworkConnectedMeta | null;

        get().pushThread(
          "handler",
          `Good. Linked to ${meta?.ssid ?? "network"}. Establishing secure shell…`,
        );
        get().bannerPush("COMMS", "Securing connection…", 1200);
        get().setTerminalLocked(true);
        get().connectComms();
      }

      return outState;
    }),

  appendNetworkLog: (item) =>
    set((s) => {
      const next = [...s.network.logs, item];
      const trimmed = next.length > 250 ? next.slice(next.length - 250) : next;
      return { network: { ...s.network, logs: trimmed } };
    }),

  clearNetworkLog: () =>
    set((s) => ({
      network: { ...s.network, logs: [] },
    })),

  heartbeatOn: false,

  jammer: {
    enabled: false,
    band: "UHF",
    strength: 62,
    sweep: "narrow",
    burst: "med",
    stealth: true,
    autoMask: false,
  },

  setJammer: (patch) =>
    set((s) => ({
      jammer: { ...s.jammer, ...patch },
    })),

  startHeartbeat: () => {
    const s = get();
    if (s.heartbeatOn) return;

    set({ heartbeatOn: true });

    const id = setInterval(() => {
      const st = get();
      if (!st.heartbeatOn) return;
      st.tick();
    }, 1000);

    (get().startHeartbeat as any)._id = id;
  },

  stopHeartbeat: () => {
    const fn = get().startHeartbeat as any;
    const id = fn?._id;
    if (id) clearInterval(id);
    set({ heartbeatOn: false });
  },

  commsConnected: false,
  commsConnecting: false,
  commsJammed: false,

  terminalLocked: false,

  banner: { on: false, title: "SECURE COMMS", message: "…" },

  thread: [],
  pushThread: (from, text) => {
    const item: ThreadItem = { id: makeId(), at: Date.now(), from, text };
    set((s) => ({ thread: [...s.thread, item] }));
  },
  clearThread: () => set({ thread: [] }),

  replyChips: [],
  setReplyChips: (chips) => set({ replyChips: chips }),
  clearReplyChips: () => set({ replyChips: [] }),

  mission: { missionId: "bootcamp_01", step: 0 },
  setMissionStep: (step) => set((s) => ({ mission: { ...s.mission, step } })),
  resetMission: () => set({ mission: { missionId: "bootcamp_01", step: 0 } }),

  missionDeadlineAt: null,
  setMissionDeadlineMsFromNow: (ms) =>
    set({ missionDeadlineAt: Date.now() + ms }),
  clearMissionDeadline: () => set({ missionDeadlineAt: null }),

  setTrace: (next, reason) => {
    const v = clamp(next, 0, 100);
    set({ trace: v });

    if (v >= 100) {
      set({
        timerRunning: false,
        banner: {
          on: true,
          title: "ALERT",
          message: "Trace hit 100%. You're compromised.",
        },
      });
    } else if (reason) {
      // no-op
    }
  },

  bumpTrace: (delta, reason) => {
    const { trace, setTrace } = get();
    setTrace(trace + delta, reason);
  },

  setTimerRunning: (on) => set({ timerRunning: on }),

  tick: () => {
    const s = get();
    if (!s.timerRunning) return;

    if (s.secondsLeft <= 0) {
      set({
        timerRunning: false,
        banner: {
          on: true,
          title: "ALERT",
          message: "Time expired. Mission failed.",
        },
      });
      get().bumpTrace(10, "timeout");
      return;
    }

    set({ secondsLeft: s.secondsLeft - 1 });

    const j = get().jammer;
    if (j.enabled && s.secondsLeft % 5 === 0) {
      const loud = !j.stealth || j.strength >= 80;
      if (loud) get().bumpTrace(1, "rf signature");
    }
  },

  setTerminalLocked: (on) => {
    set({ terminalLocked: on });
    if (on) get().bannerPush("LOCK", "Stay on task. Terminal only.", 1800);
  },

  bannerPush: (title, message, ms = 4200) => {
    set({ banner: { on: true, title, message } });
    if (ms > 0) {
      setTimeout(() => {
        const b = get().banner;
        if (b.title === title && b.message === message) {
          set({ banner: { ...b, on: false } });
        }
      }, ms);
    }
  },

  bannerClear: () => set((s) => ({ banner: { ...s.banner, on: false } })),

  connectComms: () => {
    const s = get();
    const j = s.jammer;

    if (s.commsJammed) {
      set({ commsConnected: false, commsConnecting: false });
      get().bannerPush("COMMS", "Connection blocked.", 2500);
      return;
    }

    set({ commsConnecting: true, commsConnected: false });
    get().bannerPush("SECURE COMMS", "Securing connection…", 700);

    const band = j.band ?? "UHF";
    const strength = j.strength ?? 62;

    const bandDelayMs =
      band === "SAT" ? 450 : band === "LTE" || band === "WIFI" ? -80 : 0;

    const delay = 450 + Math.floor(Math.random() * 300) + bandDelayMs;

    let failProb = 0.08;
    if (band === "SAT") failProb += 0.06;
    if (band === "LTE") failProb -= 0.02;
    if (band === "WIFI") failProb -= 0.01;
    if (band === "VHF") failProb += 0.02;
    if (band === "UHF") failProb += 0.01;
    if (strength >= 85) failProb += 0.03;
    if (strength <= 35) failProb += 0.02;
    if (j.stealth) failProb -= 0.01;
    failProb = Math.max(0.03, Math.min(0.22, failProb));

    setTimeout(() => {
      const st = get();

      if (st.commsJammed) {
        set({ commsConnecting: false, commsConnected: false });
        return;
      }

      const fail = Math.random() < failProb;

      if (fail) {
        set({ commsConnecting: false, commsConnected: false });
        get().bannerPush("COMMS", "Handshake failed.", 2600);
        get().pushThread(
          "handler",
          "Handshake failed. Try a different network or band.",
        );

        const jNow = get().jammer;
        if (jNow.autoMask && !get().commsJammed) {
          get().setJammer({ autoMask: false });
          get().setCommsJammed(true);
          get().pushThread(
            "system",
            "Auto-mask engaged after handshake failure.",
          );
          get().bannerPush("OPS", "Auto-mask engaged.", 2000);
        }
      } else {
        set({ commsConnecting: false, commsConnected: true });
        get().bannerPush("COMMS", "Secure link established.", 1800);
        get().pushThread("handler", "Secure shell is live. Open Terminal.");
        get().setTerminalLocked(false);
      }
    }, delay);
  },

  setCommsJammed: (on) => {
    set({ commsJammed: on });
    set((s) => ({ jammer: { ...s.jammer, enabled: on } }));

    if (on) {
      set({ commsConnected: false, commsConnecting: false });
      get().bannerPush("ALERT", "Signal jam detected. Messages blocked.", 4200);
    } else {
      get().bannerPush("STATUS", "Jam cleared. Reconnect available.", 2200);
    }
  },

  cameras: makeInitialCameras(),
  selectedCamId: 12,
  cameraSimTimer: null,
  standbyMode: false,
  standbyMessage: "STANDBY…",
  cameraObjectiveActive: false,
  cameraObjectiveResolved: false,
  targetCameraId: null,

  setSelectedCam: (id) => {
    const s = get();
    const cam = s.cameras[id];

    set({ selectedCamId: id });

    if (
      s.cameraObjectiveActive &&
      !s.cameraObjectiveResolved &&
      s.targetCameraId === id &&
      cam?.hasTarget
    ) {
      get().resolveCameraObjective();
    }
  },

  setStandbyMode: (on, message) =>
    set({
      standbyMode: on,
      standbyMessage: message ?? "STANDBY…",
    }),

  setCameraState: (id, state) =>
    set((s) => ({
      cameras: {
        ...s.cameras,
        [id]: {
          ...s.cameras[id],
          state,
          alert: state === "motion" || state === "occupied",
          hasTarget: state === "occupied" ? s.cameras[id].hasTarget : false,
          lastSeenAt:
            state === "motion" || state === "occupied"
              ? Date.now()
              : s.cameras[id].lastSeenAt,
        },
      },
    })),

  triggerCameraTarget: (id) =>
    set((s) => ({
      cameras: {
        ...s.cameras,
        [id]: {
          ...s.cameras[id],
          state: "occupied",
          alert: true,
          hasTarget: true,
          lastSeenAt: Date.now(),
        },
      },
      targetCameraId: id,
    })),

  clearCameraTarget: (id) =>
    set((s) => ({
      cameras: {
        ...s.cameras,
        [id]: {
          ...s.cameras[id],
          state: "empty",
          alert: false,
          hasTarget: false,
        },
      },
      targetCameraId: s.targetCameraId === id ? null : s.targetCameraId,
    })),

  startCameraObjective: (targetId = 19) => {
    get().resetCameras();
    get().triggerCameraTarget(targetId);
    set({
      cameraObjectiveActive: true,
      cameraObjectiveResolved: false,
      targetCameraId: targetId,
    });

    get().pushThread(
      "handler",
      "Check Cameras. We may have movement in the building.",
    );
    get().pushThread(
      "handler",
      "Find the live feed with the contact before they disappear.",
    );
    get().bannerPush("CAMERAS", "Possible movement detected.", 2000);
  },

  resolveCameraObjective: () => {
    const s = get();
    if (s.cameraObjectiveResolved) return;

    set({
      cameraObjectiveResolved: true,
      cameraObjectiveActive: false,
    });

    get().pushThread(
      "handler",
      `Confirmed. Visual on ${s.cameras[s.targetCameraId ?? 0]?.zone ?? "target zone"}.`,
    );
    get().pushThread("handler", "Good catch. Hold that location in memory.");
    get().bannerPush("OBJECTIVE", "Target feed confirmed.", 2200);
  },

  resetCameras: () =>
    set({
      cameras: makeInitialCameras(),
      selectedCamId: 12,
      targetCameraId: null,
      cameraObjectiveActive: false,
      cameraObjectiveResolved: false,
    }),

  startCameraSim: () => {
    const s = get();
    if (s.cameraSimTimer) return;

    const timer = setInterval(() => {
      const st = get();
      const ids = CAMERA_IDS;
      const simIds = ids.filter((id) => id !== 12);
      const pick = simIds[Math.floor(Math.random() * simIds.length)];

      if (st.standbyMode) return;

      if (
        st.cameraObjectiveActive &&
        st.targetCameraId != null &&
        st.cameras[st.targetCameraId]
      ) {
        set((prev) => ({
          cameras: {
            ...prev.cameras,
            [st.targetCameraId!]: {
              ...prev.cameras[st.targetCameraId!],
              state: prev.cameras[st.targetCameraId!].hasTarget
                ? "occupied"
                : "motion",
              alert: true,
              lastSeenAt: Date.now(),
            },
          },
        }));
      }

      const roll = Math.random();
      let nextState: CameraState = "empty";

      if (roll < 0.05) nextState = "motion";
      else if (roll < 0.08) nextState = "occupied";
      else if (roll < 0.11) nextState = "jammed";
      else if (roll < 0.13) nextState = "offline";

      set((prev) => {
        const current = prev.cameras[pick];
        if (!current) return prev;

        if (prev.targetCameraId === pick && current.hasTarget) {
          return prev;
        }

        return {
          cameras: {
            ...prev.cameras,
            [pick]: {
              ...current,
              state: nextState,
              alert: nextState === "motion" || nextState === "occupied",
              hasTarget: false,
              lastSeenAt:
                nextState === "motion" || nextState === "occupied"
                  ? Date.now()
                  : current.lastSeenAt,
            },
          },
        };
      });
    }, 1200);

    set({ cameraSimTimer: timer });
  },

  stopCameraSim: () => {
    const s = get();
    if (s.cameraSimTimer) clearInterval(s.cameraSimTimer);
    set({ cameraSimTimer: null });
  },
}));
