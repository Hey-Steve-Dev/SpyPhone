import { create } from "zustand";

type Banner = {
  on: boolean;
  title: string;
  message: string;
};

type GameState = {
  // core pressure systems
  trace: number; // 0..100
  secondsLeft: number;
  timerRunning: boolean;

  // comms
  commsConnected: boolean;
  commsConnecting: boolean;
  commsJammed: boolean;

  // navigation lock (terminal-only beats)
  terminalLocked: boolean;

  // banner
  banner: Banner;

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

  commsConnected: false,
  commsConnecting: false,
  commsJammed: false,

  terminalLocked: false,

  banner: { on: false, title: "SECURE COMMS", message: "…" },

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
      // optional: could log later
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
        // only clear if unchanged-ish
        if (b.title === title && b.message === message)
          set({ banner: { ...b, on: false } });
      }, ms);
    }
  },

  bannerClear: () => set((s) => ({ banner: { ...s.banner, on: false } })),

  connectComms: () => {
    const s = get();
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

    const delay = 450 + Math.floor(Math.random() * 300);
    setTimeout(() => {
      const fail = Math.random() < 0.08;
      if (get().commsJammed) {
        set({ commsConnecting: false, commsConnected: false });
        return;
      }
      if (fail) {
        set({ commsConnecting: false, commsConnected: false });
        get().bannerPush("COMMS", "Handshake failed.", 2600);
      } else {
        set({ commsConnecting: false, commsConnected: true });
        get().bannerPush("COMMS", "Secure link established.", 1800);
      }
    }, delay);
  },

  setCommsJammed: (on) => {
    set({ commsJammed: on });
    if (on) {
      set({ commsConnected: false, commsConnecting: false });
      get().bannerPush("ALERT", "Signal jam detected. Messages blocked.", 4200);
    } else {
      get().bannerPush("STATUS", "Jam cleared. Reconnect available.", 2200);
    }
  },
}));
