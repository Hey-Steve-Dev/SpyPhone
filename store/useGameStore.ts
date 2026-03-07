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

type MaskId = "ghost" | "corp" | "admin" | "burner";

type MaskProfile = {
  id: MaskId;
  label: string;
  traceModifier: number;
  description: string;
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

type NoteItem = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

type ScannerLogItem = {
  id: string;
  at: number;
  freq: string;
  label: string;
  text: string;
};

type ScannerState = {
  poweredOn: boolean;
  hold: boolean;
  activeFreq: string | null;
  logs: ScannerLogItem[];
  scriptedChatterPlayed: boolean;
};

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

  attemptMoveNow: () => Promise<void>;

  jammer: JammerConfig;
  setJammer: (patch: Partial<JammerConfig>) => void;

  mask: MaskId;
  masks: MaskProfile[];
  switchMask: (id: MaskId) => void;

  audioScannerOn: boolean;
  setAudioScannerOn: (on: boolean) => void;
  toggleAudioScanner: () => void;

  scanner: ScannerState;
  setScannerPower: (on: boolean) => void;
  toggleScannerPower: () => void;
  setScannerHold: (on: boolean) => void;
  setScannerActiveFreq: (freq: string | null) => void;
  appendScannerLog: (item: ScannerLogItem) => void;
  clearScannerLog: () => void;
  setScannerScriptedChatterPlayed: (on: boolean) => void;
  resetScanner: () => void;
  triggerScannerMissionChatter: () => Promise<void>;

  terminalLocked: boolean;

  banner: Banner;
  setBanner: (banner: Banner) => void;

  thread: ThreadItem[];
  pushThread: (from: ThreadItem["from"], text: string) => void;
  addThreadItem: (item: ThreadItem) => void;
  clearThread: () => void;

  replyChips: ReplyChip[];
  setReplyChips: (chips: ReplyChip[]) => void;
  clearReplyChips: () => void;

  messagesInputEnabled: boolean;
  messagesSendEnabled: boolean;
  setMessagesInputEnabled: (enabled: boolean) => void;
  setMessagesSendEnabled: (enabled: boolean) => void;

  messagesTyping: boolean;
  setMessagesTyping: (on: boolean) => void;

  pushHandlerMessageDelayed: (
    text: string,
    typingMs?: number,
    afterMs?: number,
  ) => Promise<void>;

  pushHandlerSequence: (
    items: Array<{
      text: string;
      typingMs?: number;
      afterMs?: number;
    }>,
  ) => Promise<void>;

  handleMessageReplyAction: (action: string, label: string) => Promise<void>;
  submitMessageText: (text: string) => void;

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

  notes: NoteItem[];
  addNote: (note: NoteItem) => void;
  updateNote: (
    id: string,
    patch: Partial<Pick<NoteItem, "title" | "body">>,
  ) => void;
  deleteNote: (id: string) => void;
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

    void (async () => {
      await get().pushHandlerSequence([
        {
          text: "You’re online. Quick review of your ghost phone?",
        },
      ]);

      get().setReplyChips([
        { id: "boot_review_yes", label: "Sure", action: "review_phone" },
        {
          id: "boot_review_no",
          label: "Nah, I'm ready",
          action: "skip_review",
        },
      ]);
    })();
  },

  attemptMoveNow: async () => {
    const s = get();
    const cam12 = s.cameras[12];
    const occupied = cam12?.state === "occupied" || cam12?.state === "motion";

    get().clearReplyChips();
    get().pushThread("player", "moving now");

    if (occupied) {
      await get().pushHandlerSequence([
        { text: "Negative. Guard still in the hall." },
      ]);

      get().bannerPush("ALERT", "Compromised.", 1800);

      setTimeout(() => {
        if (
          typeof location !== "undefined" &&
          typeof location.reload === "function"
        ) {
          location.reload();
        }
      }, 900);

      return;
    }

    await get().pushHandlerSequence([
      { text: "Good. Window is clear. Move." },
      { text: "Secure shell is live. Open Terminal." },
    ]);

    get().bannerPush("MOVE", "Proceed.", 1600);
    get().stopCameraSim();
    get().setTerminalLocked(false);
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

        get().clearReplyChips();
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

  mask: "ghost",

  masks: [
    {
      id: "ghost",
      label: "Ghost",
      traceModifier: -2,
      description: "Minimal network footprint. Harder to detect.",
    },
    {
      id: "corp",
      label: "Corporate Device",
      traceModifier: 0,
      description: "Spoofs a corporate laptop fingerprint.",
    },
    {
      id: "admin",
      label: "Admin Terminal",
      traceModifier: 2,
      description: "Elevated permissions but higher trace risk.",
    },
    {
      id: "burner",
      label: "Burner Device",
      traceModifier: -4,
      description: "Disposable identity. Clears tracking fingerprints.",
    },
  ],

  switchMask: (id) => {
    const state = get();
    if (state.mask === id) return;

    const profile = state.masks.find((m) => m.id === id);
    if (!profile) return;

    set({
      mask: id,
      trace: clamp(state.trace + profile.traceModifier, 0, 100),
    });

    get().bannerPush(
      "MASK SWITCHED",
      `Identity changed to ${profile.label}`,
      1800,
    );
  },

  audioScannerOn: false,
  setAudioScannerOn: (on) => set({ audioScannerOn: on }),
  toggleAudioScanner: () =>
    set((state) => ({ audioScannerOn: !state.audioScannerOn })),

  scanner: {
    poweredOn: false,
    hold: false,
    activeFreq: null,
    logs: [],
    scriptedChatterPlayed: false,
  },

  setScannerPower: (on) =>
    set((s) => ({
      scanner: {
        ...s.scanner,
        poweredOn: on,
      },
    })),

  toggleScannerPower: () =>
    set((s) => ({
      scanner: {
        ...s.scanner,
        poweredOn: !s.scanner.poweredOn,
      },
    })),

  setScannerHold: (on) =>
    set((s) => ({
      scanner: {
        ...s.scanner,
        hold: on,
      },
    })),

  setScannerActiveFreq: (freq) =>
    set((s) => ({
      scanner: {
        ...s.scanner,
        activeFreq: freq,
      },
    })),

  appendScannerLog: (item) =>
    set((s) => {
      const next = [...s.scanner.logs, item];
      const trimmed = next.length > 150 ? next.slice(next.length - 150) : next;

      return {
        scanner: {
          ...s.scanner,
          logs: trimmed,
        },
      };
    }),

  clearScannerLog: () =>
    set((s) => ({
      scanner: {
        ...s.scanner,
        logs: [],
      },
    })),

  setScannerScriptedChatterPlayed: (on) =>
    set((s) => ({
      scanner: {
        ...s.scanner,
        scriptedChatterPlayed: on,
      },
    })),

  resetScanner: () =>
    set((s) => ({
      scanner: {
        ...s.scanner,
        poweredOn: false,
        hold: false,
        activeFreq: null,
        logs: [],
        scriptedChatterPlayed: false,
      },
    })),

  triggerScannerMissionChatter: async () => {
    const s = get();
    if (!s.scanner.poweredOn) return;
    if (s.scanner.scriptedChatterPlayed) return;

    await wait(1800 + rand(400, 1200));

    const latest = get();
    if (!latest.scanner.poweredOn) return;
    if (latest.scanner.scriptedChatterPlayed) return;

    const hit: ScannerLogItem = {
      id: makeId(),
      at: Date.now(),
      freq: "460.225",
      label: "Metro Patrol",
      text: "Unit 4, possible movement near the lower service corridor. Check the east entrance.",
    };

    get().appendScannerLog(hit);
    get().setScannerActiveFreq(hit.freq);
    get().setScannerHold(true);
    get().setScannerScriptedChatterPlayed(true);

    await get().pushHandlerSequence([
      {
        text: "There. You heard that too. East entrance. Move.",
      },
    ]);

    get().setMissionStep(4);
  },

  terminalLocked: false,

  banner: { on: false, title: "SECURE COMMS", message: "…" },
  setBanner: (banner) => set({ banner }),

  thread: [],
  pushThread: (from, text) => {
    const item: ThreadItem = { id: makeId(), at: Date.now(), from, text };
    set((s) => ({ thread: [...s.thread, item] }));
  },
  addThreadItem: (item) =>
    set((s) => ({
      thread: [...s.thread, item],
    })),
  clearThread: () => set({ thread: [] }),

  replyChips: [],
  setReplyChips: (chips) => set({ replyChips: chips }),
  clearReplyChips: () => set({ replyChips: [] }),

  messagesInputEnabled: true,
  messagesSendEnabled: true,
  setMessagesInputEnabled: (enabled) => set({ messagesInputEnabled: enabled }),
  setMessagesSendEnabled: (enabled) => set({ messagesSendEnabled: enabled }),

  messagesTyping: false,
  setMessagesTyping: (on) => set({ messagesTyping: on }),

  pushHandlerMessageDelayed: async (text, typingMs, afterMs = 650) => {
    const reactionDelay = 1000 + rand(0, 1000);
    const autoTypingDelay =
      900 + Math.min(text.length * 18, 1100) + rand(120, 320);

    const typingDelay = typingMs ?? autoTypingDelay;

    await wait(reactionDelay);

    set({ messagesTyping: true });

    await wait(typingDelay);

    set({ messagesTyping: false });

    get().pushThread("handler", text);

    if (afterMs > 0) {
      await wait(afterMs);
    }
  },

  pushHandlerSequence: async (items) => {
    for (const item of items) {
      await get().pushHandlerMessageDelayed(
        item.text,
        item.typingMs,
        item.afterMs,
      );
    }
  },

  handleMessageReplyAction: async (action, label) => {
    const s = get();
    if (s.messagesTyping) return;

    switch (action) {
      case "moving_now": {
        await get().attemptMoveNow();
        return;
      }

      default: {
        get().pushThread("player", label);
        get().clearReplyChips();

        switch (action) {
          case "review_phone": {
            await get().pushHandlerSequence([
              {
                text: "Ghost phone review: messages are local-first, terminal is for controlled actions, jammer buys time, network helps you pivot fast.",
              },
              {
                text: "You only get short burst comms. Read fast, act local, keep moving.",
              },
            ]);

            get().setReplyChips([
              { id: "review_ack", label: "Got it", action: "review_ack" },
            ]);
            return;
          }

          case "skip_review": {
            await get().pushHandlerSequence([
              {
                text: "Good. Stay dark and follow instructions exactly. We only get short burst windows.",
              },
              {
                text: "First action: get us on a network. Open Network and link up.",
              },
            ]);
            return;
          }

          case "review_ack": {
            await get().pushHandlerSequence([
              {
                text: "Good. First action: get us on a network. Open Network and link up.",
              },
            ]);
            return;
          }

          default:
            return;
        }
      }
    }
  },

  submitMessageText: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const s = get();
    if (!s.messagesInputEnabled || !s.messagesSendEnabled) return;

    get().pushThread("player", trimmed);
  },

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

        void get().pushHandlerSequence([
          { text: "Handshake failed. Try a different network or band." },
        ]);

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

        void (async () => {
          await get().pushHandlerSequence([
            {
              text: "Secure shell is live. Check camera 12 and wait for the guard to pass.",
            },
            {
              text: "Text when you're moving.",
            },
          ]);

          get().setReplyChips([
            { id: "move_now", label: "moving now", action: "moving_now" },
          ]);
        })();

        get().setTerminalLocked(true);
        get().startCameraObjective(12);
        get().startCameraSim();
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

    if (id === 12) {
      const occupied = cam?.state === "occupied" || cam?.state === "motion";
      set({ hallwayOneOccupied: occupied });
    }

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
      hallwayOneOccupied:
        id === 12
          ? state === "occupied" || state === "motion"
          : s.hallwayOneOccupied,
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
      hallwayOneOccupied: id === 12 ? true : s.hallwayOneOccupied,
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
      hallwayOneOccupied: id === 12 ? false : s.hallwayOneOccupied,
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

  startCameraObjective: (targetId = 12) => {
    get().resetCameras();

    set({
      cameraObjectiveActive: true,
      cameraObjectiveResolved: false,
      targetCameraId: targetId,
    });

    get().setCameraState(12, "occupied");
    get().bannerPush("CAMERAS", "Watch camera 12.", 1800);
  },

  resolveCameraObjective: () => {
    const s = get();
    if (s.cameraObjectiveResolved) return;

    set({
      cameraObjectiveResolved: true,
      cameraObjectiveActive: false,
    });

    get().bannerPush("OBJECTIVE", "Hall is clear.", 1800);
  },

  resetCameras: () =>
    set({
      cameras: makeInitialCameras(),
      selectedCamId: 12,
      targetCameraId: null,
      cameraObjectiveActive: false,
      cameraObjectiveResolved: false,
      hallwayOneOccupied: false,
    }),

  startCameraSim: () => {
    const s = get();
    if (s.cameraSimTimer) return;

    const timer = setInterval(() => {
      const st = get();
      if (st.standbyMode) return;

      if (st.cameraObjectiveActive && st.targetCameraId === 12) {
        const cam12 = st.cameras[12];
        const age = cam12?.lastSeenAt ? Date.now() - cam12.lastSeenAt : 0;

        if (cam12?.state === "occupied" && age > 4500) {
          set((prev) => ({
            hallwayOneOccupied: false,
            cameras: {
              ...prev.cameras,
              12: {
                ...prev.cameras[12],
                state: "empty",
                alert: false,
                hasTarget: false,
                lastSeenAt: prev.cameras[12].lastSeenAt,
              },
            },
          }));
        }
      }

      const simIds = CAMERA_IDS.filter((id) => id !== 12);
      const pickedId = simIds[Math.floor(Math.random() * simIds.length)];

      const roll = Math.random();
      let nextState: CameraState = "empty";

      if (roll < 0.05) nextState = "motion";
      else if (roll < 0.08) nextState = "occupied";
      else if (roll < 0.11) nextState = "jammed";
      else if (roll < 0.13) nextState = "offline";

      set((prev) => {
        const current = prev.cameras[pickedId];
        if (!current) return prev;

        return {
          cameras: {
            ...prev.cameras,
            [pickedId]: {
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

  notes: [],

  addNote: (note) =>
    set((s) => ({
      notes: [note, ...s.notes],
    })),

  updateNote: (id, patch) =>
    set((s) => ({
      notes: s.notes.map((note) =>
        note.id === id
          ? {
              ...note,
              ...patch,
              updatedAt: Date.now(),
            }
          : note,
      ),
    })),

  deleteNote: (id) =>
    set((s) => ({
      notes: s.notes.filter((note) => note.id !== id),
    })),
}));
