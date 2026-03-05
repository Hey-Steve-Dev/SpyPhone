import type { MissionState } from "@/lib/missionEngine";
import { create } from "zustand";

type Banner = {
  on: boolean;
  title: string;
  message: string;
};

type ThreadItem = {
  id: string;
  at: number; // Date.now()
  from: "handler" | "system" | "player";
  text: string;
};

type JammerBand = "VHF" | "UHF" | "LTE" | "SAT" | "WIFI";
type JammerSweep = "narrow" | "wide";
type JammerBurst = "low" | "med" | "high";

type JammerConfig = {
  enabled: boolean;
  band: JammerBand;
  strength: number; // 0..100
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

  // optional scan persistence (Network screen uses this)
  scanCache?: any[];
};

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type GameState = {
  // core pressure systems
  trace: number; // 0..100
  secondsLeft: number;
  timerRunning: boolean;

  // startup flow
  booted: boolean;
  bootGame: () => void;

  network: NetworkState;
  setNetwork: (patch: Partial<NetworkState>) => void;
  appendNetworkLog: (item: NetworkLogItem) => void;
  clearNetworkLog: () => void;

  // global tick loop
  heartbeatOn: boolean;
  startHeartbeat: () => void;
  stopHeartbeat: () => void;

  // comms
  commsConnected: boolean;
  commsConnecting: boolean;
  commsJammed: boolean;

  // jammer config
  jammer: JammerConfig;
  setJammer: (patch: Partial<JammerConfig>) => void;

  // navigation lock
  terminalLocked: boolean;

  // banner
  banner: Banner;

  // messages thread
  thread: ThreadItem[];
  pushThread: (from: ThreadItem["from"], text: string) => void;
  clearThread: () => void;

  // mission
  mission: MissionState;
  setMissionStep: (step: number) => void;
  resetMission: () => void;

  // mission deadline
  missionDeadlineAt: number | null;
  setMissionDeadlineMsFromNow: (ms: number) => void;
  clearMissionDeadline: () => void;

  // actions
  setTrace: (next: number, reason?: string) => void;
  bumpTrace: (delta: number, reason?: string) => void;

  setTimerRunning: (on: boolean) => void;
  tick: () => void;

  setTerminalLocked: (on: boolean) => void;

  bannerPush: (title: string, message: string, ms?: number) => void;
  bannerClear: () => void;

  connectComms: () => void;
  setCommsJammed: (on: boolean) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const useGameStore = create<GameState>((set, get) => ({
  trace: 16,
  secondsLeft: 150,
  timerRunning: true,

  booted: false,

  // network defaults
  network: {
    preferredBand: "LTE",
    autoHop: true,
    stealth: true,

    connectedId: null,
    connectedMeta: null,

    logs: [],
    scanCache: [],
  },

  // ---- STARTUP: FIRST OBJECTIVE = "get on a network" ----
  bootGame: () => {
    const s = get();
    if (s.booted) return;

    set({ booted: true });

    // lock terminal until we have a network + comms handshake
    get().setTerminalLocked(true);

    // mission starts at step 0
    get().setMissionStep(0);

    get().pushThread(
      "handler",
      "You’re online. Quick review of your ghost phone?",
    );
    get().pushThread("handler", "First action: get us on a network.");
    get().pushThread("handler", "Open Network → Scan → Link. Keep it quiet.");
  },

  setNetwork: (patch) =>
    set((s) => {
      const prev = s.network;
      const next = { ...s.network, ...patch };

      const connectedNow =
        typeof patch.connectedId === "string" && patch.connectedId.length > 0;

      const justLinked = prev.connectedId == null && connectedNow;

      // Apply patch
      const outState: any = { network: next };

      // If user just linked to a network, kick off the secure shell handshake
      if (justLinked) {
        const meta = (patch.connectedMeta ??
          next.connectedMeta) as NetworkConnectedMeta | null;

        get().pushThread(
          "handler",
          `Good. Linked to ${meta?.ssid ?? "network"}. Establishing secure shell…`,
        );
        get().bannerPush("COMMS", "Securing connection…", 1200);

        // Keep terminal locked until handshake completes
        get().setTerminalLocked(true);

        // Kick off comms handshake (this will flip commsConnected on success)
        get().connectComms();
      }

      return outState;
    }),
  appendNetworkLog: (item) =>
    set((s) => {
      const next = [...s.network.logs, item];
      const trimmed = next.length > 250 ? next.slice(next.length - 250) : next;
      return {
        network: { ...s.network, logs: trimmed },
      };
    }),

  clearNetworkLog: () =>
    set((s) => ({
      network: { ...s.network, logs: [] },
    })),

  // heartbeat defaults
  heartbeatOn: false,

  // jammer defaults
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

  // mission defaults
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
      // optional
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
    if (j?.enabled && s.secondsLeft % 5 === 0) {
      const loud = !j.stealth || j.strength >= 80;
      if (loud) {
        get().bumpTrace(1, "rf signature");
      }
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
      set({
        commsConnected: false,
        commsConnecting: false,
      });
      get().bannerPush("COMMS", "Connection blocked.", 2500);
      return;
    }

    set({ commsConnecting: true, commsConnected: false });
    get().bannerPush("SECURE COMMS", "Securing connection…", 700);

    const band = j?.band ?? "UHF";
    const strength = j?.strength ?? 62;

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
    if (j?.stealth) failProb -= 0.01;

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
        if (jNow?.autoMask && !get().commsJammed) {
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

        // ✅ Continue playthrough
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
}));
