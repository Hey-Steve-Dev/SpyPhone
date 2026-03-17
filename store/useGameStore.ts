import {
  createTerminalSession,
  setMode as setCommandEngineMode,
  type TerminalSession,
} from "@/lib/commandEngine";
import {
  initGameAudio,
  playIncomingMessageFx,
  setGameSoundEnabled,
} from "@/lib/gameAudio";
import {
  handleMissionEvent,
  makeInitialMissionState,
  type MissionEffect,
  type MissionEvent,
  type MissionState,
} from "@/lib/missionEngine";
import { Asset } from "expo-asset";
import { create } from "zustand";

type Banner = {
  on: boolean;
  title: string;
  message: string;
};

type TunnelSignalStrength = "WEAK" | "MED" | "STRONG";
type TunnelConnectionState =
  | "idle"
  | "scanning"
  | "attempting"
  | "success"
  | "limited"
  | "failure";

export type NearbyDevice = {
  id: string;
  name: string;
  kind: string;
  poweredOn: boolean;
  signalStrength: TunnelSignalStrength;
  supportsShell: boolean;
  supportsAuxOps: boolean;
  tunnelOutcome: "success" | "limited" | "failure";
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

type Camera12SequenceMode = "idle" | "armed" | "playing" | "complete";

type Camera12SequenceState = {
  mode: Camera12SequenceMode;
  startedAt: number | null;
  completedAt: number | null;
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

type BiometricOverlayState = {
  active: boolean;
};

type EndGameWipeState = {
  active: boolean;
};

type TerminalLine = {
  id: string;
  kind: "out" | "cmd";
  text: string;
};

type TerminalState = {
  session: TerminalSession;
  mode: "easy" | "strict";
  lines: TerminalLine[];
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
  | "godark"
  | "biometric"
  | "tunnel"
  | "endgame";

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

function missionStepForPhase(phase: MissionState["phase"]): number {
  switch (phase) {
    case "terminal_brief_pwd":
      return 0;
    case "terminal_brief_search":
      return 1;
    case "complete":
    case "lesson_2_intro":
      return 2;
    default:
      return 0;
  }
}

function withMissionPhase(
  mission: MissionState,
  phase: MissionState["phase"],
): MissionState {
  return {
    ...mission,
    phase,
    step: missionStepForPhase(phase),
  };
}

const CAMERA_IDS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

function makeInitialBanner(): Banner {
  return { on: false, title: "SECURE COMMS", message: "…" };
}

function makeInitialNetworkState(): NetworkState {
  return {
    preferredBand: "LTE",
    autoHop: true,
    stealth: true,
    connectedId: null,
    connectedMeta: null,
    logs: [],
    scanCache: [],
  };
}

function makeInitialScannerState(): ScannerState {
  return {
    poweredOn: false,
    hold: false,
    activeFreq: null,
    logs: [],
    scriptedChatterPlayed: false,
  };
}

function makeInitialGoDarkState(): GoDarkState {
  return {
    active: false,
    message: "STANDBY",
  };
}

function makeInitialBiometricOverlayState(): BiometricOverlayState {
  return {
    active: true,
  };
}

function makeInitialEndGameWipeState(): EndGameWipeState {
  return {
    active: false,
  };
}

function makeInitialTerminal(): TerminalState {
  return {
    session: createTerminalSession("phone_shell"),
    mode: "easy",
    lines: [
      { id: "l1", kind: "out", text: "Secure shell — Git Bash (simulated)" },
      {
        id: "l2",
        kind: "out",
        text: "Type `help` to list available commands.",
      },
    ],
  };
}

function makeInitialCamera12Sequence(): Camera12SequenceState {
  return {
    mode: "idle",
    startedAt: null,
    completedAt: null,
  };
}

function makeInitialCameras(online = false): Record<number, CameraFeed> {
  const defaultState: CameraState = online ? "empty" : "offline";

  return {
    12: {
      id: 12,
      label: "CAM 12",
      zone: "Lobby North",
      state: defaultState,
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    13: {
      id: 13,
      label: "CAM 13",
      zone: "Hall A",
      state: defaultState,
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    14: {
      id: 14,
      label: "CAM 14",
      zone: "Hall B",
      state: defaultState,
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    15: {
      id: 15,
      label: "CAM 15",
      zone: "Service Door",
      state: defaultState,
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    16: {
      id: 16,
      label: "CAM 16",
      zone: "Freight Hall",
      state: defaultState,
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    17: {
      id: 17,
      label: "CAM 17",
      zone: "Stairwell",
      state: defaultState,
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    18: {
      id: 18,
      label: "CAM 18",
      zone: "Loading Bay",
      state: defaultState,
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    19: {
      id: 19,
      label: "CAM 19",
      zone: "Records Hall",
      state: defaultState,
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    20: {
      id: 20,
      label: "CAM 20",
      zone: "East Corridor",
      state: defaultState,
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    21: {
      id: 21,
      label: "CAM 21",
      zone: "Boiler Access",
      state: defaultState,
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    22: {
      id: 22,
      label: "CAM 22",
      zone: "Archive Entry",
      state: defaultState,
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
    23: {
      id: 23,
      label: "CAM 23",
      zone: "West Hall",
      state: defaultState,
      alert: false,
      hasTarget: false,
      lastSeenAt: null,
    },
  };
}

function makeTunnelDeviceCatalog(): NearbyDevice[] {
  return [
    {
      id: "camera_access_point",
      name: "SEC-CAM-BRIDGE",
      kind: "camera relay",
      poweredOn: true,
      signalStrength: "STRONG",
      supportsShell: true,
      supportsAuxOps: false,
      tunnelOutcome: "success",
    },
    {
      id: "security_laptop",
      name: "OFFICE-LAPTOP",
      kind: "workstation",
      poweredOn: true,
      signalStrength: "STRONG",
      supportsShell: true,
      supportsAuxOps: true,
      tunnelOutcome: "success",
    },
    {
      id: "printer_01",
      name: "PRN-OFFICE-03",
      kind: "network printer",
      poweredOn: true,
      signalStrength: "MED",
      supportsShell: false,
      supportsAuxOps: true,
      tunnelOutcome: "limited",
    },
    {
      id: "desk_phone_02",
      name: "VOIP-DESK-02",
      kind: "desk phone",
      poweredOn: true,
      signalStrength: "WEAK",
      supportsShell: false,
      supportsAuxOps: false,
      tunnelOutcome: "failure",
    },
  ];
}

const ALL_TUNNEL_DEVICES = makeTunnelDeviceCatalog();

const UI_ASSET_MODULES = [
  require("@/assets/images/gunmetal-bg.png"),

  require("@/assets/icons/icon-terminal.png"),
  require("@/assets/icons/icon-cameras.png"),
  require("@/assets/icons/icon-coms.png"),
  require("@/assets/icons/icon-network.png"),
  require("@/assets/icons/icon-echoscan.png"),
  require("@/assets/icons/icon-rf-scanner.png"),
  require("@/assets/icons/icon-jammer.png"),
  require("@/assets/icons/icon-notes.png"),
  require("@/assets/icons/icon-mask.png"),
  require("@/assets/icons/icon-vault.png"),
  require("@/assets/icons/icon-log.png"),
  require("@/assets/icons/icon-tunnel.png"),
];

let uiAssetsPreloadPromise: Promise<void> | null = null;

function preloadUiAssets() {
  if (!uiAssetsPreloadPromise) {
    uiAssetsPreloadPromise = Asset.loadAsync(UI_ASSET_MODULES).then(() => {});
  }

  return uiAssetsPreloadPromise;
}

type GameState = {
  trace: number;
  secondsLeft: number;
  timerRunning: boolean;

  batteryLevel: number;
  isCharging: boolean;
  setBatteryLevel: (level: number) => void;
  setIsCharging: (isCharging: boolean) => void;

  hallwayOneOccupied: boolean;
  setHallwayOneOccupied: (occupied: boolean) => void;

  camera12Sequence: Camera12SequenceState;
  armCamera12Sequence: () => void;
  startCamera12Sequence: () => void;
  completeCamera12Sequence: () => void;
  resetCamera12Sequence: () => void;

  booted: boolean;
  bootGame: () => void;
  resetGameLoop: () => Promise<void>;

  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => Promise<void>;
  toggleSoundEnabled: () => Promise<void>;

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

  terminal: TerminalState;
  appendTerminalLine: (kind: TerminalLine["kind"], text: string) => void;
  clearTerminalLines: () => void;
  resetTerminalSession: () => void;
  setTerminalMode: (mode: "easy" | "strict") => void;
  setTerminalSession: (session: TerminalSession) => void;
  setTerminalCwd: (cwd: string) => void;
  setTerminalHost: (hostId: string) => void;

  banner: Banner;
  setBanner: (banner: Banner) => void;

  unreadMessages: number;
  setUnreadMessages: (count: number) => void;
  clearUnreadMessages: () => void;

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

  applyMissionEffects: (effects: MissionEffect[]) => Promise<void>;
  dispatchMissionEvent: (event: MissionEvent) => Promise<{
    handled: boolean;
    ok: boolean;
    advanced: boolean;
    gated: boolean;
  }>;

  handleMessageReplyAction: (action: string, label: string) => Promise<void>;
  submitMessageText: (text: string) => void;

  mission: MissionState;
  setMissionStep: (phase: MissionState["phase"]) => void;
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

  cameraNetworkOnline: boolean;
  setCameraNetworkOnline: (on: boolean) => void;

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

  guardWaitTimer: ReturnType<typeof setTimeout> | null;
  startGuardWaitTimer: (ms?: number) => void;
  clearGuardWaitTimer: () => void;

  goDark: GoDarkState;
  goDarkTimer: ReturnType<typeof setTimeout> | null;
  triggerGoDark: (durationMs?: number, message?: string) => void;
  clearGoDark: () => void;

  biometricOverlay: BiometricOverlayState;
  showBiometricOverlay: () => void;
  hideBiometricOverlay: () => void;
  triggerBiometricOverlay: (durationMs?: number) => Promise<void>;

  endGameWipe: EndGameWipeState;
  endGameWipeTimer: ReturnType<typeof setTimeout> | null;
  triggerEndGameWipe: (durationMs?: number) => void;
  clearEndGameWipe: () => void;

  notes: NoteItem[];
  addNote: (note: NoteItem) => void;
  updateNote: (
    id: string,
    patch: Partial<Pick<NoteItem, "title" | "body">>,
  ) => void;
  deleteNote: (id: string) => void;

  nearbyDevices: NearbyDevice[];
  allowedTunnelDeviceIds: string[];
  isTunnelScanning: boolean;
  tunnelScanComplete: boolean;
  selectedTunnelDeviceId: string | null;
  isTunnelAttempting: boolean;
  tunnelConnectionState: TunnelConnectionState;
  tunnelStatusMessage: string;
  activeRemoteHostId: string | null;
  shellReadyFromTunnel: boolean;

  setNearbyDevices: (devices: NearbyDevice[]) => void;
  setTunnelTargets: (deviceIds: string[]) => void;
  clearTunnelTargets: () => void;
  runTunnelScan: () => Promise<void>;
  selectTunnelDevice: (deviceId: string) => void;
  clearTunnelSelection: () => void;
  attemptTunnelConnection: () => Promise<void>;
  resetTunnelState: () => void;
};

export const useGameStore = create<GameState>((set, get) => ({
  trace: 16,
  secondsLeft: 1500,
  timerRunning: true,

  batteryLevel: 1,
  isCharging: false,
  setBatteryLevel: (level) => set({ batteryLevel: clamp(level, 0, 1) }),
  setIsCharging: (isCharging) => set({ isCharging }),

  hallwayOneOccupied: false,
  setHallwayOneOccupied: (occupied) => {
    set({ hallwayOneOccupied: occupied });

    get().pushLog(
      "camera",
      `Hallway occupancy set to ${occupied ? "occupied" : "clear"}.`,
    );
  },

  armCamera12Sequence: () =>
    set((s) => {
      if (s.camera12Sequence.mode === "armed") return s;
      if (s.camera12Sequence.mode === "playing") return s;

      get().pushLog("camera", "CAM 12 sequence armed.");

      return {
        camera12Sequence: {
          mode: "armed",
          startedAt: null,
          completedAt: null,
        },
      };
    }),

  startCamera12Sequence: () =>
    set((s) => {
      if (s.camera12Sequence.mode === "playing") return s;
      if (s.camera12Sequence.mode === "complete") return s;

      const startedAt = Date.now();
      get().pushLog("camera", "CAM 12 sequence started.");

      return {
        camera12Sequence: {
          mode: "playing",
          startedAt,
          completedAt: null,
        },
      };
    }),

  completeCamera12Sequence: () => {
    const s = get();
    if (s.camera12Sequence.mode === "complete") return;

    const completedAt = Date.now();

    set({
      camera12Sequence: {
        mode: "complete",
        startedAt: s.camera12Sequence.startedAt,
        completedAt,
      },
    });

    get().pushLog("camera", "CAM 12 sequence completed.");

    if (s.mission.phase === "camera_watch") {
      get().clearGuardWaitTimer();

      setTimeout(() => {
        const latest = get();
        if (latest.mission.phase !== "camera_watch") return;
        if (latest.camera12Sequence.mode !== "complete") return;

        void latest.dispatchMissionEvent({ type: "SCANNER_CHATTER_HEARD" });
      }, 850);
    }
  },

  resetCamera12Sequence: () =>
    set(() => {
      get().pushLog("camera", "CAM 12 sequence reset.");
      return {
        camera12Sequence: makeInitialCamera12Sequence(),
      };
    }),

  booted: false,

  bootGame: () => {
    const s = get();
    if (s.booted) return;

    void initGameAudio();
    void preloadUiAssets();

    set({
      booted: true,
      cameraNetworkOnline: false,
      cameras: makeInitialCameras(false),
      camera12Sequence: makeInitialCamera12Sequence(),
      nearbyDevices: [],
      allowedTunnelDeviceIds: [],
      tunnelScanComplete: false,
      selectedTunnelDeviceId: null,
      tunnelConnectionState: "idle",
      tunnelStatusMessage: "Scanner idle.",
      activeRemoteHostId: null,
      shellReadyFromTunnel: false,
      endGameWipe: makeInitialEndGameWipeState(),
      endGameWipeTimer: null,
    });

    get().clearGuardWaitTimer();
    get().pushLog("system", "Boot sequence started.");
    get().pushLog("camera", "Camera network is offline.");
    get().pushLog("tunnel", "Tunnel target list cleared.");

    void get().dispatchMissionEvent({ type: "BOOT" });
  },

  resetGameLoop: async () => {
    const state = get();

    const heartbeatWasOn = state.heartbeatOn;
    const soundEnabled = state.soundEnabled;
    const masks = state.masks;
    const batteryLevel = state.batteryLevel;
    const isCharging = state.isCharging;

    get().stopCameraSim();
    get().clearGuardWaitTimer();
    get().clearGoDark();
    get().clearEndGameWipe();

    const heartbeatFn = get().startHeartbeat as any;
    const heartbeatId = heartbeatFn?._id;
    if (heartbeatId) {
      clearInterval(heartbeatId);
      delete heartbeatFn._id;
    }

    const nextTerminal = makeInitialTerminal();

    setCommandEngineMode(nextTerminal.mode);

    set({
      trace: 16,
      secondsLeft: 150,
      timerRunning: true,

      batteryLevel,
      isCharging,

      hallwayOneOccupied: false,

      booted: true,

      soundEnabled,

      network: makeInitialNetworkState(),

      heartbeatOn: heartbeatWasOn,

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

      mask: "ghost",
      masks,

      audioScannerOn: false,

      scanner: makeInitialScannerState(),

      terminalLocked: true,
      terminal: nextTerminal,

      banner: makeInitialBanner(),

      unreadMessages: 0,
      thread: [],
      replyChips: [],

      messagesInputEnabled: true,
      messagesSendEnabled: true,
      messagesTyping: false,

      mission: makeInitialMissionState(),

      missionDeadlineAt: null,

      cameraNetworkOnline: false,
      cameras: makeInitialCameras(false),
      camera12Sequence: makeInitialCamera12Sequence(),
      selectedCamId: 12,
      cameraSimTimer: null,
      standbyMode: false,
      standbyMessage: "STANDBY…",
      cameraObjectiveActive: false,
      cameraObjectiveResolved: false,
      targetCameraId: null,

      guardWaitTimer: null,

      goDark: makeInitialGoDarkState(),
      goDarkTimer: null,

      biometricOverlay: makeInitialBiometricOverlayState(),

      endGameWipe: makeInitialEndGameWipeState(),
      endGameWipeTimer: null,

      notes: [],

      nearbyDevices: [],
      allowedTunnelDeviceIds: [],
      isTunnelScanning: false,
      tunnelScanComplete: false,
      selectedTunnelDeviceId: null,
      isTunnelAttempting: false,
      tunnelConnectionState: "idle",
      tunnelStatusMessage: "Scanner idle.",
      activeRemoteHostId: null,
      shellReadyFromTunnel: false,

      log: [
        {
          id: makeId(),
          at: Date.now(),
          kind: "system",
          text: "Ghost phone system initialized.",
        },
        {
          id: makeId(),
          at: Date.now(),
          kind: "endgame",
          text: "Device wipe complete. Restarting simulation.",
        },
      ],
    });

    get().pushLog("system", "Game loop reset.");
    get().pushLog("camera", "Camera network is offline.");
    get().pushLog("tunnel", "Tunnel target list cleared.");

    await wait(40);
    await get().dispatchMissionEvent({ type: "BOOT" });
  },

  soundEnabled: false,

  setSoundEnabled: async (enabled) => {
    if (enabled) {
      await initGameAudio();
    }

    setGameSoundEnabled(enabled);
    set({ soundEnabled: enabled });
    get().pushLog("system", `Game sound ${enabled ? "enabled" : "disabled"}.`);
  },

  toggleSoundEnabled: async () => {
    const next = !get().soundEnabled;
    await get().setSoundEnabled(next);
  },

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

  network: makeInitialNetworkState(),

  attemptMoveNow: async () => {
    await get().dispatchMissionEvent({ type: "MOVE_ATTEMPT" });
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

  scanner: makeInitialScannerState(),

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
    if (!latest.scanner.scriptedChatterPlayed) {
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

      await get().dispatchMissionEvent({ type: "SCANNER_CHATTER_HEARD" });
    }
  },

  terminalLocked: false,

  terminal: makeInitialTerminal(),

  appendTerminalLine: (kind, text) =>
    set((s) => ({
      terminal: {
        ...s.terminal,
        lines: [
          ...s.terminal.lines,
          {
            id: makeId(),
            kind,
            text,
          },
        ],
      },
    })),

  clearTerminalLines: () =>
    set((s) => {
      get().pushLog("terminal", "Terminal lines cleared.");
      return {
        terminal: {
          ...s.terminal,
          lines: [],
        },
      };
    }),

  resetTerminalSession: () => {
    const next = makeInitialTerminal();
    set({
      terminal: next,
    });
    setCommandEngineMode(next.mode);
    get().pushLog("terminal", "Terminal session reset.");
  },

  setTerminalMode: (mode) =>
    set((s) => {
      setCommandEngineMode(mode);
      get().pushLog("terminal", `Terminal mode set to ${mode}.`);
      return {
        terminal: {
          ...s.terminal,
          mode,
        },
      };
    }),

  setTerminalSession: (session) =>
    set((s) => {
      get().pushLog(
        "terminal",
        `Terminal session updated: ${session.hostId} @ ${session.cwd}.`,
      );
      return {
        terminal: {
          ...s.terminal,
          session,
        },
      };
    }),

  setTerminalCwd: (cwd) =>
    set((s) => {
      get().pushLog("terminal", `Terminal cwd set to ${cwd}.`);
      return {
        terminal: {
          ...s.terminal,
          session: {
            ...s.terminal.session,
            cwd,
          },
        },
      };
    }),

  setTerminalHost: (hostId) =>
    set((s) => {
      const nextSession = createTerminalSession(hostId);
      get().pushLog("terminal", `Terminal host set to ${hostId}.`);
      return {
        terminal: {
          ...s.terminal,
          session: nextSession,
        },
      };
    }),

  banner: makeInitialBanner(),
  setBanner: (banner) => {
    set({ banner });
    get().pushLog(
      "banner",
      `${banner.on ? "SHOW" : "SET"} ${banner.title}: ${banner.message}`,
    );
  },

  unreadMessages: 0,

  setUnreadMessages: (count) => {
    const next = Math.max(0, count);
    set({ unreadMessages: next });
    get().pushLog("thread", `Unread messages set to ${next}.`);
  },

  clearUnreadMessages: () => {
    set({ unreadMessages: 0 });
    get().pushLog("thread", "Unread messages cleared.");
  },

  thread: [],
  pushThread: (from, text) => {
    const item: ThreadItem = { id: makeId(), at: Date.now(), from, text };

    set((s) => ({
      thread: [...s.thread, item],
      unreadMessages:
        from === "handler" || from === "system"
          ? s.unreadMessages + 1
          : s.unreadMessages,
    }));

    get().pushLog("thread", `${from.toUpperCase()}: ${text}`);

    if (from === "handler" || from === "system") {
      void playIncomingMessageFx();
    }
  },

  addThreadItem: (item) =>
    set((s) => {
      get().pushLog("thread", `${item.from.toUpperCase()}: ${item.text}`);
      return {
        thread: [...s.thread, item],
        unreadMessages:
          item.from === "handler" || item.from === "system"
            ? s.unreadMessages + 1
            : s.unreadMessages,
      };
    }),

  clearThread: () => {
    set({ thread: [], unreadMessages: 0 });
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

  pushHandlerMessageDelayed: async (text, typingMs, afterMs = 1200) => {
    const reactionDelay = 1000 + rand(0, 1000);
    const autoTypingDelay =
      900 + Math.min(text.length * 18, 1100) + rand(120, 320);

    const finalTypingMs = typingMs ?? autoTypingDelay;

    await wait(reactionDelay);

    set({ messagesTyping: true });
    get().bannerPush("OPS", "…", finalTypingMs);

    await wait(finalTypingMs);

    set({ messagesTyping: false });
    get().bannerPush("OPS", text, 3500);
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

  applyMissionEffects: async (effects) => {
    function typingMsFor(text: string) {
      const base = 850;
      const perChar = 38;
      return clamp(base + text.length * perChar, 1200, 2600);
    }

    for (const effect of effects) {
      switch (effect.type) {
        case "set_terminal_host": {
          get().setTerminalHost(effect.hostId);
          break;
        }

        case "set_camera_network_online": {
          get().setCameraNetworkOnline(effect.on);
          break;
        }
        case "handler_message": {
          await get().pushHandlerMessageDelayed(
            effect.text,
            effect.typingMs ?? typingMsFor(effect.text),
            effect.afterMs ?? 250,
          );

          break;
        }

        case "handler_sequence": {
          for (const item of effect.items) {
            await get().pushHandlerMessageDelayed(
              item.text,
              item.typingMs ?? typingMsFor(item.text),
              item.afterMs ?? 250,
            );
          }
          break;
        }

        case "trigger_camera_target": {
          get().triggerCameraTarget(effect.cameraId);
          break;
        }

        case "clear_camera_target": {
          get().clearCameraTarget(effect.cameraId);
          break;
        }

        case "player_message": {
          get().pushThread("player", effect.text);
          break;
        }

        case "set_reply_chips": {
          get().setReplyChips(effect.chips);
          break;
        }

        case "clear_reply_chips": {
          get().clearReplyChips();
          break;
        }

        case "set_terminal_locked": {
          get().setTerminalLocked(effect.on);
          break;
        }

        case "set_terminal_cwd": {
          get().setTerminalCwd(effect.cwd);
          break;
        }

        case "reset_terminal": {
          get().resetTerminalSession();
          break;
        }

        case "clear_thread": {
          get().clearThread();
          break;
        }

        case "append_terminal_output": {
          for (const line of effect.lines) {
            get().appendTerminalLine("out", line);
          }
          break;
        }

        case "banner": {
          get().bannerPush(effect.title, effect.message, effect.ms ?? 2200);
          break;
        }

        case "start_camera_objective": {
          get().startCameraObjective(effect.targetId);
          break;
        }

        case "resolve_camera_objective": {
          get().resolveCameraObjective();
          break;
        }

        case "start_camera_sim": {
          get().startCameraSim();
          break;
        }

        case "stop_camera_sim": {
          get().stopCameraSim();
          break;
        }

        case "set_hallway_occupied": {
          get().setHallwayOneOccupied(effect.on);
          break;
        }

        case "trigger_go_dark": {
          get().triggerGoDark(effect.durationMs, effect.message);
          break;
        }

        case "trigger_biometric_scan": {
          await get().triggerBiometricOverlay(effect.durationMs);
          break;
        }

        case "trigger_end_game_wipe": {
          get().triggerEndGameWipe(effect.durationMs);
          break;
        }

        case "start_guard_wait_window": {
          get().startGuardWaitTimer(effect.timeoutMs);
          break;
        }

        case "set_mission_state": {
          set({ mission: effect.state });
          get().pushLog(
            "mission",
            `Mission state loaded: ${effect.state.phase} (step ${effect.state.step}).`,
          );
          break;
        }

        case "set_mission_phase": {
          get().setMissionStep(effect.phase);
          break;
        }

        case "set_tunnel_targets": {
          get().setTunnelTargets(effect.deviceIds);
          break;
        }

        case "clear_tunnel_targets": {
          get().clearTunnelTargets();
          break;
        }

        case "mission_failed": {
          get().pushLog("mission", `Mission failed: ${effect.reason}`);
          get().setTimerRunning(false);
          if (effect.bannerTitle || effect.bannerMessage) {
            get().bannerPush(
              effect.bannerTitle ?? "ALERT",
              effect.bannerMessage ?? "Mission failed.",
              3200,
            );
          }
          break;
        }

        default:
          break;
      }
    }
  },

  dispatchMissionEvent: async (event) => {
    const state = get();
    const prevPhase = state.mission.phase;
    const result = handleMissionEvent(state.mission, event, {
      jammerEnabled: state.jammer.enabled,
      hallwayOccupied: state.hallwayOneOccupied,
    });

    set({ mission: result.nextState });
    get().pushLog(
      "mission",
      `Mission event ${event.type} -> ${result.nextState.phase}.`,
    );

    await get().applyMissionEffects(result.effects);

    return {
      handled: result.commandResult?.handled ?? true,
      ok: result.commandResult?.ok ?? true,
      advanced:
        result.commandResult?.advanced ?? result.nextState.phase !== prevPhase,
      gated: result.commandResult?.gated ?? false,
    };
  },

  handleMessageReplyAction: async (action, label) => {
    const s = get();
    if (s.messagesTyping) return;

    get().pushLog("thread", `Player selected reply action: ${action}`);

    await get().dispatchMissionEvent({
      type: "REPLY_SELECTED",
      action,
      label,
    });
  },

  submitMessageText: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const s = get();
    if (!s.messagesInputEnabled || !s.messagesSendEnabled) return;

    get().pushThread("player", trimmed);
  },

  mission: makeInitialMissionState(),
  setMissionStep: (phase) =>
    set((s) => {
      const nextMission = withMissionPhase(s.mission, phase);
      get().pushLog(
        "mission",
        `Mission phase set to ${phase} (step ${nextMission.step}).`,
      );
      return {
        mission: nextMission,
      };
    }),

  resetMission: () => {
    get().clearGuardWaitTimer();
    set({
      mission: makeInitialMissionState(),
      camera12Sequence: makeInitialCamera12Sequence(),
    });
    get().pushLog("mission", "Mission reset to initial state.");
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

    const delayMs = 450 + Math.floor(Math.random() * 300) + bandDelayMs;

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
      }
    }, delayMs);
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

  cameraNetworkOnline: false,

  setCameraNetworkOnline: (on) =>
    set((s) => {
      const nextCameras: Record<number, CameraFeed> = Object.fromEntries(
        Object.entries(s.cameras).map(([key, cam]) => {
          const id = Number(key);
          return [
            id,
            {
              ...cam,
              state: on
                ? cam.state === "offline"
                  ? "empty"
                  : cam.state
                : "offline",
              alert: on ? cam.alert : false,
              hasTarget: on ? cam.hasTarget : false,
              lastSeenAt: on ? cam.lastSeenAt : null,
            },
          ];
        }),
      ) as Record<number, CameraFeed>;

      get().pushLog("camera", `Camera network ${on ? "online" : "offline"}.`);

      return {
        cameraNetworkOnline: on,
        cameras: nextCameras,
        hallwayOneOccupied: on ? s.hallwayOneOccupied : false,
        camera12Sequence: on
          ? s.camera12Sequence
          : makeInitialCamera12Sequence(),
        targetCameraId: on ? s.targetCameraId : null,
        cameraObjectiveActive: on ? s.cameraObjectiveActive : false,
        cameraObjectiveResolved: on ? s.cameraObjectiveResolved : false,
      };
    }),

  cameras: makeInitialCameras(false),
  camera12Sequence: makeInitialCamera12Sequence(),
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

    if (
      s.cameraObjectiveActive &&
      !s.cameraObjectiveResolved &&
      s.targetCameraId === id &&
      cam?.hasTarget
    ) {
      get().pushLog("camera", `Viewing objective camera ${id}.`);
      void get().dispatchMissionEvent({ type: "CAMERA_VIEWED", cameraId: id });

      if (
        id === 12 &&
        s.mission.phase === "camera_watch" &&
        s.camera12Sequence.mode !== "playing" &&
        s.camera12Sequence.mode !== "complete"
      ) {
        if (s.camera12Sequence.mode === "idle") {
          get().armCamera12Sequence();
        }
        get().startCamera12Sequence();
      }
    }
  },

  setStandbyMode: (on, message) =>
    set({
      standbyMode: on,
      standbyMessage: message ?? "STANDBY…",
    }),

  setCameraState: (id, state) =>
    set((s) => {
      if (!s.cameraNetworkOnline) {
        get().pushLog(
          "camera",
          `Ignored camera state change for CAM ${id}. Network is offline.`,
        );
        return s;
      }

      const prev = s.cameras[id];
      if (prev && prev.state !== state) {
        get().pushLog(
          "camera",
          `${prev.label} changed from ${prev.state} to ${state}.`,
        );
      }

      return {
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
      if (!s.cameraNetworkOnline) {
        get().pushLog(
          "camera",
          `Ignored camera target trigger for CAM ${id}. Network is offline.`,
        );
        return s;
      }

      get().pushLog(
        "camera",
        `${s.cameras[id]?.label ?? `CAM ${id}`} targeted.`,
      );

      return {
        cameras: {
          ...s.cameras,
          [id]: {
            ...s.cameras[id],
            state:
              id === 12 && s.hallwayOneOccupied
                ? "occupied"
                : s.cameras[id].state === "offline"
                  ? "empty"
                  : s.cameras[id].state,
            alert: id === 12 ? s.hallwayOneOccupied : s.cameras[id].alert,
            hasTarget: true,
            lastSeenAt: s.cameras[id].lastSeenAt,
          },
        },
        targetCameraId: id,
        selectedCamId: id,
      };
    }),

  clearCameraTarget: (id) =>
    set((s) => {
      if (!s.cameraNetworkOnline) return s;

      get().pushLog(
        "camera",
        `${s.cameras[id]?.label ?? `CAM ${id}`} target cleared.`,
      );

      const nextSequence =
        id === 12 ? makeInitialCamera12Sequence() : s.camera12Sequence;

      return {
        camera12Sequence: nextSequence,
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
    if (!get().cameraNetworkOnline) {
      get().pushLog(
        "mission",
        "Camera objective requested while camera network is offline.",
      );
      return;
    }

    get().resetCameras();

    set({
      cameraObjectiveActive: true,
      cameraObjectiveResolved: false,
      targetCameraId: targetId,
      hallwayOneOccupied: false,
      camera12Sequence:
        targetId === 12
          ? {
              mode: "armed",
              startedAt: null,
              completedAt: null,
            }
          : makeInitialCamera12Sequence(),
    });

    get().pushLog("mission", `Camera objective started on CAM ${targetId}.`);
  },

  resolveCameraObjective: () => {
    const s = get();
    if (s.cameraObjectiveResolved) return;

    set({
      cameraObjectiveResolved: true,
      cameraObjectiveActive: false,
    });

    get().pushLog("mission", "Camera objective resolved. Hall is clear.");
  },

  resetCameras: () =>
    set((s) => ({
      cameras: makeInitialCameras(s.cameraNetworkOnline),
      camera12Sequence: s.cameraNetworkOnline
        ? s.camera12Sequence
        : makeInitialCamera12Sequence(),
      selectedCamId: 12,
      targetCameraId: null,
      cameraObjectiveActive: false,
      cameraObjectiveResolved: false,
      hallwayOneOccupied: false,
    })),

  startCameraSim: () => {
    const s = get();
    if (s.cameraSimTimer) return;
    if (!s.cameraNetworkOnline) {
      get().pushLog("camera", "Camera simulation blocked. Network is offline.");
      return;
    }

    get().pushLog("camera", "Camera simulation started.");

    const timer = setInterval(() => {
      const st = get();
      if (!st.cameraNetworkOnline) return;
      if (st.standbyMode || st.goDark.active || st.endGameWipe.active) return;

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

  guardWaitTimer: null,

  startGuardWaitTimer: (ms = 25000) => {
    get().clearGuardWaitTimer();
    get().pushLog("mission", `Guard wait timer started for ${ms}ms.`);

    const timer = setTimeout(() => {
      set({ guardWaitTimer: null });
      get().pushLog("mission", "Guard wait timer expired.");
      void get().dispatchMissionEvent({ type: "GUARD_WAIT_EXPIRED" });
    }, ms);

    set({ guardWaitTimer: timer });
  },

  clearGuardWaitTimer: () => {
    const timer = get().guardWaitTimer;
    if (timer) {
      clearTimeout(timer);
      get().pushLog("mission", "Guard wait timer cleared.");
    }
    set({ guardWaitTimer: null });
  },

  goDark: makeInitialGoDarkState(),
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

    const timer = setTimeout(async () => {
      set({
        goDark: {
          active: false,
          message,
        },
        goDarkTimer: null,
      });

      get().pushLog("godark", "Go dark cleared.");

      await get().triggerBiometricOverlay(900);
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

  biometricOverlay: makeInitialBiometricOverlayState(),

  showBiometricOverlay: () => {
    set({
      biometricOverlay: {
        active: true,
      },
    });
    get().pushLog("biometric", "Biometric overlay shown.");
  },

  hideBiometricOverlay: () => {
    set({
      biometricOverlay: {
        active: false,
      },
    });
    get().pushLog("biometric", "Biometric overlay hidden.");
  },

  triggerBiometricOverlay: async (durationMs = 500) => {
    set({
      biometricOverlay: {
        active: true,
      },
    });
    get().pushLog(
      "biometric",
      `Biometric overlay triggered for ${durationMs}ms.`,
    );

    await wait(durationMs);

    set({
      biometricOverlay: {
        active: false,
      },
    });
    get().pushLog("biometric", "Biometric overlay cleared.");
  },

  endGameWipe: makeInitialEndGameWipeState(),
  endGameWipeTimer: null,

  triggerEndGameWipe: (durationMs = 300000) => {
    const existingTimer = get().endGameWipeTimer;
    if (existingTimer) clearTimeout(existingTimer);

    get().stopCameraSim();
    get().clearGuardWaitTimer();

    set({
      endGameWipe: {
        active: true,
      },
      endGameWipeTimer: null,
      messagesTyping: false,
      standbyMode: false,
      goDark: {
        active: false,
        message: "STANDBY",
      },
      goDarkTimer: null,
      biometricOverlay: {
        active: false,
      },
      banner: {
        on: false,
        title: "SECURE COMMS",
        message: "…",
      },
    });

    get().pushLog("endgame", `End-game wipe triggered for ${durationMs}ms.`);

    const timer = setTimeout(() => {
      set({ endGameWipeTimer: null });
      void get().resetGameLoop();
    }, durationMs);

    set({ endGameWipeTimer: timer });
  },

  clearEndGameWipe: () => {
    const timer = get().endGameWipeTimer;
    if (timer) clearTimeout(timer);

    set({
      endGameWipe: {
        active: false,
      },
      endGameWipeTimer: null,
    });

    get().pushLog("endgame", "End-game wipe cleared.");
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

  nearbyDevices: [],
  allowedTunnelDeviceIds: [],
  isTunnelScanning: false,
  tunnelScanComplete: false,
  selectedTunnelDeviceId: null,
  isTunnelAttempting: false,
  tunnelConnectionState: "idle",
  tunnelStatusMessage: "Scanner idle.",
  activeRemoteHostId: null,
  shellReadyFromTunnel: false,

  setNearbyDevices: (devices) =>
    set(() => {
      get().pushLog(
        "tunnel",
        `Device table loaded with ${devices.length} target(s).`,
      );
      return {
        nearbyDevices: devices,
        tunnelScanComplete: false,
        selectedTunnelDeviceId: null,
        isTunnelAttempting: false,
        tunnelConnectionState: "idle",
        tunnelStatusMessage: "Device table updated.",
        activeRemoteHostId: null,
        shellReadyFromTunnel: false,
      };
    }),

  setTunnelTargets: (deviceIds) =>
    set(() => {
      get().pushLog(
        "tunnel",
        deviceIds.length > 0
          ? `Tunnel targets set: ${deviceIds.join(", ")}.`
          : "Tunnel targets cleared.",
      );

      return {
        allowedTunnelDeviceIds: [...deviceIds],
        nearbyDevices: [],
        tunnelScanComplete: false,
        selectedTunnelDeviceId: null,
        isTunnelAttempting: false,
        tunnelConnectionState: "idle",
        tunnelStatusMessage: "Scanner idle.",
        activeRemoteHostId: null,
        shellReadyFromTunnel: false,
      };
    }),

  clearTunnelTargets: () =>
    set(() => {
      get().pushLog("tunnel", "Tunnel targets cleared.");
      return {
        allowedTunnelDeviceIds: [],
        nearbyDevices: [],
        tunnelScanComplete: false,
        selectedTunnelDeviceId: null,
        isTunnelAttempting: false,
        tunnelConnectionState: "idle",
        tunnelStatusMessage: "Scanner idle.",
        activeRemoteHostId: null,
        shellReadyFromTunnel: false,
      };
    }),

  runTunnelScan: async () => {
    const {
      allowedTunnelDeviceIds,
      isTunnelScanning,
      isTunnelAttempting,
      endGameWipe,
    } = get();

    if (isTunnelScanning || isTunnelAttempting || endGameWipe.active) return;

    set({
      isTunnelScanning: true,
      tunnelScanComplete: false,
      nearbyDevices: [],
      selectedTunnelDeviceId: null,
      tunnelConnectionState: "scanning",
      tunnelStatusMessage: "Reading powered systems in local range...",
      activeRemoteHostId: null,
      shellReadyFromTunnel: false,
    });

    get().pushLog("tunnel", "Tunnel scan started.");

    await wait(2200);

    if (get().endGameWipe.active) return;

    const devices = ALL_TUNNEL_DEVICES.filter(
      (device) =>
        device.poweredOn && allowedTunnelDeviceIds.includes(device.id),
    );

    set({
      nearbyDevices: devices,
      isTunnelScanning: false,
      tunnelScanComplete: true,
      tunnelConnectionState: "idle",
      tunnelStatusMessage:
        devices.length > 0
          ? `${devices.length} device${devices.length === 1 ? "" : "s"} detected.`
          : "No powered devices detected.",
    });

    get().pushLog(
      "tunnel",
      devices.length > 0
        ? `Tunnel scan complete. ${devices.length} device(s) detected.`
        : "Tunnel scan complete. No powered devices detected.",
    );
  },

  selectTunnelDevice: (deviceId) =>
    set((s) => {
      const device =
        s.nearbyDevices.find((entry) => entry.id === deviceId) ?? null;

      if (!device) {
        get().pushLog(
          "tunnel",
          `Ignored tunnel selection for unavailable target ${deviceId}.`,
        );
        return {};
      }

      get().pushLog("tunnel", `Selected tunnel target ${device.name}.`);

      return {
        selectedTunnelDeviceId: deviceId,
        tunnelConnectionState: "idle",
        tunnelStatusMessage: "Target selected. Ready to attempt tunnel.",
        activeRemoteHostId: null,
        shellReadyFromTunnel: false,
      };
    }),

  clearTunnelSelection: () =>
    set((s) => {
      if (s.selectedTunnelDeviceId) {
        const device =
          s.nearbyDevices.find(
            (entry) => entry.id === s.selectedTunnelDeviceId,
          ) ?? null;
        get().pushLog(
          "tunnel",
          `Tunnel selection cleared${device ? ` for ${device.name}` : ""}.`,
        );
      }

      return {
        selectedTunnelDeviceId: null,
        isTunnelAttempting: false,
        tunnelConnectionState: "idle",
        tunnelStatusMessage: "Selection cleared.",
        activeRemoteHostId: null,
        shellReadyFromTunnel: false,
      };
    }),

  attemptTunnelConnection: async () => {
    const {
      selectedTunnelDeviceId,
      nearbyDevices,
      mission,
      isTunnelAttempting,
      isTunnelScanning,
      endGameWipe,
    } = get();

    if (isTunnelScanning || isTunnelAttempting || endGameWipe.active) return;

    if (!selectedTunnelDeviceId) {
      set({
        tunnelConnectionState: "failure",
        tunnelStatusMessage: "No target selected.",
        activeRemoteHostId: null,
        shellReadyFromTunnel: false,
      });
      get().pushLog("tunnel", "Tunnel attempt failed. No target selected.");
      return;
    }

    const device =
      nearbyDevices.find((entry) => entry.id === selectedTunnelDeviceId) ??
      null;

    if (!device) {
      set({
        tunnelConnectionState: "failure",
        tunnelStatusMessage: "Selected target is not available.",
        activeRemoteHostId: null,
        shellReadyFromTunnel: false,
      });
      get().pushLog(
        "tunnel",
        "Tunnel attempt failed. Selected target is not in current scan results.",
      );
      return;
    }

    if (!device.poweredOn) {
      set({
        tunnelConnectionState: "failure",
        tunnelStatusMessage: "Target is offline.",
        activeRemoteHostId: null,
        shellReadyFromTunnel: false,
      });
      get().pushLog(
        "tunnel",
        `Tunnel attempt failed. ${device.name} is offline.`,
      );
      return;
    }

    set({
      isTunnelAttempting: true,
      tunnelConnectionState: "attempting",
      tunnelStatusMessage: `Negotiating route to ${device.name}...`,
      activeRemoteHostId: null,
      shellReadyFromTunnel: false,
    });

    get().pushLog("tunnel", `Tunnel attempt started for ${device.name}.`);

    await wait(2400);

    if (get().endGameWipe.active) return;

    if (device.tunnelOutcome === "success") {
      set({
        isTunnelAttempting: false,
        tunnelConnectionState: "success",
        tunnelStatusMessage: `Tunnel established to ${device.name}. Secure shell available.`,
        activeRemoteHostId: device.id,
        shellReadyFromTunnel: true,
      });
      get().pushLog(
        "tunnel",
        `Tunnel established to ${device.name}. Secure shell enabled.`,
      );

      const isCameraBridge = device.id === "camera_access_point";
      if (isCameraBridge) {
        get().setCameraNetworkOnline(true);
        get().bannerPush("CAMERAS", "Camera feeds online.", 1800);

        if (
          mission.phase === "network_objective" ||
          mission.phase === "camera_access_confirm"
        ) {
          await get().dispatchMissionEvent({
            type: "TUNNEL_LINKED",
            deviceId: device.id,
            deviceName: device.name,
          });
        }

        return;
      }

      const isLaptopTarget = device.id === "security_laptop";
      if (isLaptopTarget) {
        get().setTerminalHost("local_jcarter");
      }

      if (isLaptopTarget && mission.phase === "laptop_objective") {
        await get().dispatchMissionEvent({
          type: "TUNNEL_LINKED",
          deviceId: device.id,
          deviceName: device.name,
        });
      }

      return;
    }

    if (device.tunnelOutcome === "limited") {
      set({
        isTunnelAttempting: false,
        tunnelConnectionState: "limited",
        tunnelStatusMessage: `Connected to ${device.name}, but no shell is exposed.`,
        activeRemoteHostId: device.id,
        shellReadyFromTunnel: false,
      });
      get().pushLog(
        "tunnel",
        `Tunnel established to ${device.name} with limited access only.`,
      );
      return;
    }

    set({
      isTunnelAttempting: false,
      tunnelConnectionState: "failure",
      tunnelStatusMessage: `Connection failed. ${device.name} did not expose a usable route.`,
      activeRemoteHostId: null,
      shellReadyFromTunnel: false,
    });
    get().pushLog("tunnel", `Tunnel attempt failed for ${device.name}.`);
  },

  resetTunnelState: () =>
    set((s) => {
      get().pushLog("tunnel", "Tunnel state reset.");
      return {
        nearbyDevices: [],
        isTunnelScanning: false,
        tunnelScanComplete: false,
        selectedTunnelDeviceId: null,
        isTunnelAttempting: false,
        tunnelConnectionState: "idle",
        tunnelStatusMessage: "Scanner idle.",
        activeRemoteHostId: null,
        shellReadyFromTunnel: false,
        allowedTunnelDeviceIds: s.allowedTunnelDeviceIds,
      };
    }),
}));
