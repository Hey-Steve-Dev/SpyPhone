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

type GoDarkState = {
  active: boolean;
  message: string;
};

export type GlobalLogKind =
  | "system"
  | "mission"
  | "thread"
  | "banner"
  | "network"
  | "jammer"
  | "scanner"
  | "camera"
  | "notes"
  | "mask"
  | "trace"
  | "timer"
  | "terminal"
  | "godark";

export type GlobalLogItem = {
  id: string;
  at: number;
  kind: GlobalLogKind;
  text: string;
};

export type GameLogKind = GlobalLogKind;
export type GameLogItem = GlobalLogItem;

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

  log: GlobalLogItem[];
  pushLog: (kind: GlobalLogKind, text: string) => void;
  clearLog: () => void;

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

  goDark: GoDarkState;
  goDarkTimer: ReturnType<typeof setTimeout> | null;
  triggerGoDark: (durationMs?: number, message?: string) => void;
  clearGoDark: () => void;

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
  setHallwayOneOccupied: (occupied) => {
    set({ hallwayOneOccupied: occupied });
    get().pushLog(
      "camera",
      `Hallway occupancy manually set to ${occupied ? "occupied" : "clear"}.`,
    );
  },

  booted: false,

  log: [
    {
      id: makeId(),
      at: Date.now(),
      kind: "system",
      text: "Ghost phone system initialized.",
    },
  ],

  pushLog: (kind, text) =>
    set((s) => ({
      log: [...s.log, { id: makeId(), at: Date.now(), kind, text }].slice(-500),
    })),

  clearLog: () => set({ log: [] }),

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
    get().pushLog("system", "Boot sequence started.");
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
    get().pushLog(
      "mission",
      `Player attempted movement while hall was ${occupied ? "occupied" : "clear"}.`,
    );

    if (occupied) {
      await get().pushHandlerSequence([
        { text: "Negative. Guard still in the hall." },
      ]);

      get().bannerPush("ALERT", "Compromised.", 1800);
      get().pushLog("mission", "Movement denied. Player compromised.");

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

    await get().pushHandlerSequence([{ text: "Good. Window is clear. Move." }]);

    get().stopCameraSim();
    get().triggerGoDark(3200, "STANDBY");

    await wait(900);

    await get().pushHandlerSequence([
      { text: "Secure shell is live. Open Terminal." },
    ]);

    get().setTerminalLocked(false);
    get().pushLog(
      "mission",
      "Movement approved. Go dark triggered. Terminal access restored.",
    );
  },

  setNetwork: (patch) =>
    set((s) => {
      const prev = s.network;
      const next = { ...s.network, ...patch };

      const connectedNow =
        typeof patch.connectedId === "string" && patch.connectedId.length > 0;

      const justLinked = prev.connectedId == null && connectedNow;
      const outState: { network: NetworkState } = { network: next };

      if ("preferredBand" in patch && patch.preferredBand) {
        get().pushLog(
          "network",
          `Preferred band set to ${patch.preferredBand}.`,
        );
      }
      if ("autoHop" in patch && typeof patch.autoHop === "boolean") {
        get().pushLog(
          "network",
          `Auto-hop ${patch.autoHop ? "enabled" : "disabled"}.`,
        );
      }
      if ("stealth" in patch && typeof patch.stealth === "boolean") {
        get().pushLog(
          "network",
          `Network stealth ${patch.stealth ? "enabled" : "disabled"}.`,
        );
      }

      if (justLinked) {
        const meta = (patch.connectedMeta ??
          next.connectedMeta) as NetworkConnectedMeta | null;

        get().pushLog(
          "network",
          `Linked to ${meta?.ssid ?? "network"} on ${meta?.band ?? "unknown band"}.`,
        );
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
      get().pushLog("network", `[${item.level}] ${item.text}`);
      return { network: { ...s.network, logs: trimmed } };
    }),

  clearNetworkLog: () =>
    set((s) => {
      get().pushLog("network", "Network log cleared.");
      return {
        network: { ...s.network, logs: [] },
      };
    }),

  heartbeatOn: false,

  startHeartbeat: () => {
    const s = get();
    if (s.heartbeatOn) return;

    set({ heartbeatOn: true });
    get().pushLog("timer", "Heartbeat started.");

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
    get().pushLog("timer", "Heartbeat stopped.");
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
    set((s) => {
      const next = { ...s.jammer, ...patch };
      const changed = Object.entries(patch).map(
        ([k, v]) => `${k}=${String(v)}`,
      );
      if (changed.length) {
        get().pushLog("jammer", `Jammer updated: ${changed.join(" | ")}`);
      }
      return {
        jammer: next,
      };
    }),

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

    const nextTrace = clamp(state.trace + profile.traceModifier, 0, 100);

    set({
      mask: id,
      trace: nextTrace,
    });

    get().pushLog(
      "mask",
      `Mask switched to ${profile.label}. Trace adjusted to ${nextTrace}%.`,
    );
    get().bannerPush(
      "MASK SWITCHED",
      `Identity changed to ${profile.label}`,
      1800,
    );
  },

  audioScannerOn: false,
  setAudioScannerOn: (on) => {
    set({ audioScannerOn: on });
    get().pushLog("scanner", `Audio scanner ${on ? "enabled" : "disabled"}.`);
  },
  toggleAudioScanner: () =>
    set((state) => {
      const next = !state.audioScannerOn;
      get().pushLog(
        "scanner",
        `Audio scanner ${next ? "enabled" : "disabled"}.`,
      );
      return { audioScannerOn: next };
    }),

  scanner: {
    poweredOn: false,
    hold: false,
    activeFreq: null,
    logs: [],
    scriptedChatterPlayed: false,
  },

  setScannerPower: (on) =>
    set((s) => {
      get().pushLog("scanner", `Scanner power ${on ? "on" : "off"}.`);
      return {
        scanner: {
          ...s.scanner,
          poweredOn: on,
        },
      };
    }),

  toggleScannerPower: () =>
    set((s) => {
      const next = !s.scanner.poweredOn;
      get().pushLog("scanner", `Scanner power ${next ? "on" : "off"}.`);
      return {
        scanner: {
          ...s.scanner,
          poweredOn: next,
        },
      };
    }),

  setScannerHold: (on) =>
    set((s) => {
      get().pushLog("scanner", `Scanner hold ${on ? "enabled" : "released"}.`);
      return {
        scanner: {
          ...s.scanner,
          hold: on,
        },
      };
    }),

  setScannerActiveFreq: (freq) =>
    set((s) => {
      get().pushLog("scanner", `Active frequency set to ${freq ?? "none"}.`);
      return {
        scanner: {
          ...s.scanner,
          activeFreq: freq,
        },
      };
    }),

  appendScannerLog: (item) =>
    set((s) => {
      const next = [...s.scanner.logs, item];
      const trimmed = next.length > 150 ? next.slice(next.length - 150) : next;

      get().pushLog("scanner", `${item.label} ${item.freq}: ${item.text}`);

      return {
        scanner: {
          ...s.scanner,
          logs: trimmed,
        },
      };
    }),

  clearScannerLog: () =>
    set((s) => {
      get().pushLog("scanner", "Scanner log cleared.");
      return {
        scanner: {
          ...s.scanner,
          logs: [],
        },
      };
    }),

  setScannerScriptedChatterPlayed: (on) =>
    set((s) => ({
      scanner: {
        ...s.scanner,
        scriptedChatterPlayed: on,
      },
    })),

  resetScanner: () =>
    set((s) => {
      get().pushLog("scanner", "Scanner reset to defaults.");
      return {
        scanner: {
          ...s.scanner,
          poweredOn: false,
          hold: false,
          activeFreq: null,
          logs: [],
          scriptedChatterPlayed: false,
        },
      };
    }),

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

    get().pushLog("mission", "Scanner chatter advanced the mission.");
    get().setMissionStep(4);
  },

  terminalLocked: false,

  banner: { on: false, title: "SECURE COMMS", message: "…" },
  setBanner: (banner) => {
    set({ banner });
    get().pushLog(
      "banner",
      `${banner.on ? "SHOW" : "SET"} ${banner.title}: ${banner.message}`,
    );
  },

  thread: [],
  pushThread: (from, text) => {
    const item: ThreadItem = { id: makeId(), at: Date.now(), from, text };
    set((s) => ({ thread: [...s.thread, item] }));
    get().pushLog("thread", `${from.toUpperCase()}: ${text}`);
  },
  addThreadItem: (item) =>
    set((s) => {
      get().pushLog("thread", `${item.from.toUpperCase()}: ${item.text}`);
      return {
        thread: [...s.thread, item],
      };
    }),
  clearThread: () => {
    set({ thread: [] });
    get().pushLog("thread", "Thread cleared.");
  },

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
        get().pushLog("thread", `Player selected reply action: ${action}`);

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
  setMissionStep: (step) =>
    set((s) => {
      get().pushLog("mission", `Mission step set to ${step}.`);
      return { mission: { ...s.mission, step } };
    }),
  resetMission: () => {
    set({ mission: { missionId: "bootcamp_01", step: 0 } });
    get().pushLog("mission", "Mission reset to bootcamp_01 step 0.");
  },

  missionDeadlineAt: null,
  setMissionDeadlineMsFromNow: (ms) => {
    set({ missionDeadlineAt: Date.now() + ms });
    get().pushLog("mission", `Mission deadline set ${ms}ms from now.`);
  },
  clearMissionDeadline: () => {
    set({ missionDeadlineAt: null });
    get().pushLog("mission", "Mission deadline cleared.");
  },

  setTrace: (next, reason) => {
    const v = clamp(next, 0, 100);
    set({ trace: v });
    get().pushLog(
      "trace",
      `Trace set to ${v}%${reason ? ` (${reason})` : ""}.`,
    );

    if (v >= 100) {
      set({
        timerRunning: false,
        banner: {
          on: true,
          title: "ALERT",
          message: "Trace hit 100%. You're compromised.",
        },
      });
      get().pushLog("trace", "Trace hit 100%. Mission compromised.");
    }
  },

  bumpTrace: (delta, reason) => {
    const { trace, setTrace } = get();
    setTrace(trace + delta, reason);
  },

  setTimerRunning: (on) => {
    set({ timerRunning: on });
    get().pushLog("timer", `Mission timer ${on ? "started" : "paused"}.`);
  },

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
      get().pushLog("timer", "Timer expired. Mission failed.");
      get().bumpTrace(10, "timeout");
      return;
    }

    set({ secondsLeft: s.secondsLeft - 1 });

    const nextSeconds = s.secondsLeft - 1;
    if (nextSeconds > 0 && nextSeconds % 30 === 0) {
      get().pushLog("timer", `${nextSeconds}s remaining.`);
    }

    const j = get().jammer;
    if (j.enabled && s.secondsLeft % 5 === 0) {
      const loud = !j.stealth || j.strength >= 80;
      if (loud) get().bumpTrace(1, "rf signature");
    }
  },

  setTerminalLocked: (on) => {
    set({ terminalLocked: on });
    get().pushLog("terminal", `Terminal ${on ? "locked" : "unlocked"}.`);
    if (on) get().bannerPush("LOCK", "Stay on task. Terminal only.", 1800);
  },

  bannerPush: (title, message, ms = 4200) => {
    set({ banner: { on: true, title, message } });
    get().pushLog("banner", `${title}: ${message}`);

    if (ms > 0) {
      setTimeout(() => {
        const b = get().banner;
        if (b.title === title && b.message === message) {
          set({ banner: { ...b, on: false } });
          get().pushLog("banner", `${title} cleared.`);
        }
      }, ms);
    }
  },

  bannerClear: () =>
    set((s) => {
      get().pushLog("banner", `${s.banner.title} manually cleared.`);
      return { banner: { ...s.banner, on: false } };
    }),

  connectComms: () => {
    const s = get();
    const j = s.jammer;

    if (s.commsJammed) {
      set({ commsConnected: false, commsConnecting: false });
      get().pushLog("network", "Secure connection blocked by jammer.");
      get().bannerPush("COMMS", "Connection blocked.", 2500);
      return;
    }

    set({ commsConnecting: true, commsConnected: false });
    get().pushLog(
      "network",
      `Secure handshake started on ${j.band} at ${j.strength}% power.`,
    );
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
        get().pushLog(
          "network",
          "Handshake aborted because jammer became active.",
        );
        return;
      }

      const fail = Math.random() < failProb;

      if (fail) {
        set({ commsConnecting: false, commsConnected: false });
        get().pushLog("network", "Handshake failed.");
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
        get().pushLog("network", "Secure link established.");
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
    get().pushLog("jammer", `Comms jam ${on ? "enabled" : "disabled"}.`);

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
    get().pushLog("camera", `Selected ${cam?.label ?? `CAM ${id}`}.`);

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
    set((s) => {
      const prev = s.cameras[id];
      if (prev && prev.state !== state) {
        get().pushLog(
          "camera",
          `${prev.label} changed from ${prev.state} to ${state}.`,
        );
      }

      return {
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
      };
    }),

  triggerCameraTarget: (id) =>
    set((s) => {
      get().pushLog(
        "camera",
        `${s.cameras[id]?.label ?? `CAM ${id}`} target detected.`,
      );
      return {
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
      };
    }),

  clearCameraTarget: (id) =>
    set((s) => {
      get().pushLog(
        "camera",
        `${s.cameras[id]?.label ?? `CAM ${id}`} target cleared.`,
      );
      return {
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
      };
    }),

  startCameraObjective: (targetId = 12) => {
    get().resetCameras();

    set({
      cameraObjectiveActive: true,
      cameraObjectiveResolved: false,
      targetCameraId: targetId,
    });

    get().pushLog("mission", `Camera objective started on CAM ${targetId}.`);
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

    get().pushLog("mission", "Camera objective resolved. Hall is clear.");
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

    get().pushLog("camera", "Camera simulation started.");

    const timer = setInterval(() => {
      const st = get();
      if (st.standbyMode || st.goDark.active) return;

      if (st.cameraObjectiveActive && st.targetCameraId === 12) {
        const cam12 = st.cameras[12];
        const age = cam12?.lastSeenAt ? Date.now() - cam12.lastSeenAt : 0;

        if (cam12?.state === "occupied" && age > 4500) {
          get().pushLog("camera", "CAM 12 auto-cleared after inactivity.");
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

        if (current.state !== nextState) {
          get().pushLog(
            "camera",
            `${current.label} simulated state ${nextState}.`,
          );
        }

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
    get().pushLog("camera", "Camera simulation stopped.");
  },

  goDark: {
    active: false,
    message: "STANDBY",
  },
  goDarkTimer: null,

  triggerGoDark: (durationMs = 3200, message = "STANDBY") => {
    const existingTimer = get().goDarkTimer;
    if (existingTimer) clearTimeout(existingTimer);

    set({
      goDark: {
        active: true,
        message,
      },
      goDarkTimer: null,
      messagesTyping: false,
    });

    get().pushLog(
      "godark",
      `Go dark triggered for ${durationMs}ms${message ? ` with message "${message}".` : "."}`,
    );

    const timer = setTimeout(() => {
      set({
        goDark: {
          active: false,
          message,
        },
        goDarkTimer: null,
      });
      get().pushLog("godark", "Go dark cleared.");
    }, durationMs);

    set({ goDarkTimer: timer });
  },

  clearGoDark: () => {
    const timer = get().goDarkTimer;
    if (timer) clearTimeout(timer);

    set({
      goDark: {
        active: false,
        message: "STANDBY",
      },
      goDarkTimer: null,
    });

    get().pushLog("godark", "Go dark manually cleared.");
  },

  notes: [],

  addNote: (note) =>
    set((s) => {
      get().pushLog("notes", `Note added: ${note.title || "Untitled"}.`);
      return {
        notes: [note, ...s.notes],
      };
    }),

  updateNote: (id, patch) =>
    set((s) => {
      const target = s.notes.find((note) => note.id === id);
      get().pushLog(
        "notes",
        `Note updated: ${patch.title ?? target?.title ?? id}.`,
      );
      return {
        notes: s.notes.map((note) =>
          note.id === id
            ? {
                ...note,
                ...patch,
                updatedAt: Date.now(),
              }
            : note,
        ),
      };
    }),

  deleteNote: (id) =>
    set((s) => {
      const target = s.notes.find((note) => note.id === id);
      get().pushLog("notes", `Note deleted: ${target?.title ?? id}.`);
      return {
        notes: s.notes.filter((note) => note.id !== id),
      };
    }),
}));
