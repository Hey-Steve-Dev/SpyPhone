import type {
  MissionEffect,
  MissionEvent,
  MissionEventResult,
  MissionState,
  ReplyChip,
} from "@/lib/missionEngine";

const DEFAULT_TERMINAL_CWD = "/home/jcarter";
const DEFAULT_TERMINAL_HOST = "local_jcarter";
const LESSON_2_DEV_COMMAND = "root el 2";
const LESSON_2_VAULT_ERASE_COMMAND = "run log.erase --secure --depth 5";

type Lesson2Phase =
  | "lesson_2_intro"
  | "lesson_2_vault_prompt"
  | "lesson_2_vault_help"
  | "lesson_2_vault_done"
  | "lesson_2_ready_prompt"
  | "lesson_2_move_prompt"
  | "lesson_2_move_ready"
  | "lesson_2_post_move_confirm";

function normalize(input: string) {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

function opsLine(text: string, typingMs = 1400, afterMs = 900) {
  return { text, typingMs, afterMs };
}

function lesson2PhaseToStep(phase: Lesson2Phase): number {
  switch (phase) {
    case "lesson_2_intro":
      return 0;
    case "lesson_2_vault_prompt":
      return 1;
    case "lesson_2_vault_help":
      return 2;
    case "lesson_2_vault_done":
      return 3;
    case "lesson_2_ready_prompt":
      return 4;
    case "lesson_2_move_prompt":
      return 5;
    case "lesson_2_move_ready":
      return 6;
    case "lesson_2_post_move_confirm":
      return 7;
    default:
      return 0;
  }
}

function withLesson2Phase(
  state: MissionState,
  phase: Lesson2Phase,
): MissionState {
  return {
    ...state,
    phase,
    step: lesson2PhaseToStep(phase),
  };
}

function lesson2ReplyChipsForVault(): ReplyChip[] {
  return [
    { id: "lesson2_done", label: "Ok done", action: "lesson2_done" },
    { id: "lesson2_help", label: "I need help", action: "lesson2_help" },
  ];
}

function lesson2MoveChip(): ReplyChip[] {
  return [{ id: "lesson2_moving", label: "Moving", action: "lesson2_moving" }];
}

function lesson2PostMoveChip(): ReplyChip[] {
  return [
    {
      id: "lesson2_post_move_in",
      label: "I'm in",
      action: "lesson2_post_move_in",
    },
  ];
}

function isLesson2Phase(phase: MissionState["phase"]): phase is Lesson2Phase {
  return (
    phase === "lesson_2_intro" ||
    phase === "lesson_2_vault_prompt" ||
    phase === "lesson_2_vault_help" ||
    phase === "lesson_2_vault_done" ||
    phase === "lesson_2_ready_prompt" ||
    phase === "lesson_2_move_prompt" ||
    phase === "lesson_2_move_ready" ||
    phase === "lesson_2_post_move_confirm"
  );
}

export function isLesson2DevJump(input: string) {
  return normalize(input) === LESSON_2_DEV_COMMAND;
}

export function makeLesson2CheckpointState(state: MissionState): MissionState {
  return {
    ...state,
    phase: "lesson_2_vault_prompt",
    step: lesson2PhaseToStep("lesson_2_vault_prompt"),
    tracePercent: 0,
    camera12Checked: false,
  };
}

export function makeLesson2CheckpointEffects(
  nextState: MissionState,
): MissionEffect[] {
  return [
    { type: "set_mission_state", state: nextState },
    { type: "clear_reply_chips" },
    { type: "clear_tunnel_targets" },

    { type: "set_camera_network_online", on: true },
    { type: "stop_camera_sim" },
    { type: "resolve_camera_objective" },
    { type: "set_hallway_occupied", on: false },
    { type: "clear_camera_target", cameraId: 12 },

    { type: "reset_terminal" },
    { type: "set_terminal_host", hostId: DEFAULT_TERMINAL_HOST },
    { type: "set_terminal_cwd", cwd: DEFAULT_TERMINAL_CWD },
    { type: "set_terminal_locked", on: false },

    {
      type: "append_terminal_output",
      lines: [
        "DEV: lesson 2 checkpoint loaded.",
        `DEV: host=${DEFAULT_TERMINAL_HOST}`,
        `DEV: cwd=${DEFAULT_TERMINAL_CWD}`,
        "DEV: tracePercent=0",
        "DEV: camera12Checked=false",
      ],
    },
    {
      type: "banner",
      title: "DEV CHECKPOINT",
      message: "Lesson 2 loaded.",
      ms: 1800,
    },
    {
      type: "handler_sequence",
      items: [
        opsLine("Copy that, good work.", 1200, 700),
        opsLine("Now we need to clean our tracks.", 1250, 800),
        opsLine(
          "Go to your Vault app and find the command for log erase.",
          1350,
          900,
        ),
        opsLine("Then type in run and paste that code.", 1250, 850),
        opsLine(
          "Remember, we will need to do this before we leave any system.",
          1300,
          850,
        ),
        opsLine(
          "If we leave traces behind the mission will be pointless.",
          1350,
          900,
        ),
      ],
    },
    {
      type: "set_reply_chips",
      chips: lesson2ReplyChipsForVault(),
    },
  ];
}

export function missionIntroLesson2(state: MissionState): string[] | null {
  if (!isLesson2Phase(state.phase)) {
    return null;
  }

  switch (state.phase) {
    case "lesson_2_intro":
      return [
        "Copy that, good work.",
        "Now we need to clean our tracks.",
        "Go to your Vault app and find the command for log erase.",
        "Then type in run and paste that code.",
        "Remember, we will need to do this before we leave any system.",
        "If we leave traces behind the mission will be pointless.",
      ];

    case "lesson_2_vault_prompt":
      return [
        "Open Vault and find the log erase code.",
        "Then type run plus that code into Terminal.",
        "Signal when it's done.",
      ];

    case "lesson_2_vault_help":
      return [
        "Open the Vault app.",
        "Find the Log Eraser entry.",
        "Copy the code shown there after the word run.",
        "Then type the full command into Terminal.",
      ];

    case "lesson_2_vault_done":
      return ["Stand by for the next step."];

    case "lesson_2_ready_prompt":
      return ["Stand by for the next step."];

    case "lesson_2_move_prompt":
    case "lesson_2_move_ready":
      return [
        "Ok, we need to make a move out the door to your left 4 doors down.",
        "Check camera 12 again before you move.",
      ];

    case "lesson_2_post_move_confirm":
      return ["Signal when you're in."];

    default:
      return ["Stand by."];
  }
}

export function handleLesson2Event(
  state: MissionState,
  event: MissionEvent,
): MissionEventResult | null {
  if (!isLesson2Phase(state.phase)) {
    return null;
  }

  if (event.type === "REPLY_SELECTED") {
    if (
      (state.phase === "lesson_2_vault_prompt" ||
        state.phase === "lesson_2_vault_help") &&
      event.action === "lesson2_help"
    ) {
      const nextState = withLesson2Phase(state, "lesson_2_vault_help");

      return {
        nextState,
        effects: [
          { type: "clear_reply_chips" },
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          {
            type: "handler_sequence",
            items: [
              opsLine("Open the Vault app.", 1200, 700),
              opsLine("Find the Log Eraser entry.", 1200, 750),
              opsLine(
                "Take the code shown there and type run in front of it.",
                1250,
                800,
              ),
              opsLine(
                "The full terminal command is `run log.erase --secure --depth 5`.",
                1300,
                850,
              ),
              opsLine(
                "After it finishes, use the confirmation chip to report back.",
                1300,
                850,
              ),
            ],
          },
          {
            type: "set_reply_chips",
            chips: lesson2ReplyChipsForVault(),
          },
        ],
      };
    }

    if (
      (state.phase === "lesson_2_vault_prompt" ||
        state.phase === "lesson_2_vault_help" ||
        state.phase === "lesson_2_vault_done") &&
      event.action === "lesson2_done"
    ) {
      const cleaned = state.tracePercent === 0;
      const nextState = withLesson2Phase(
        {
          ...state,
          tracePercent: cleaned ? state.tracePercent : 10,
          camera12Checked: false,
        },
        "lesson_2_move_prompt",
      );

      return {
        nextState,
        effects: [
          { type: "clear_reply_chips" },
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          {
            type: "handler_sequence",
            items: [
              opsLine(
                "Ok, we need to make a move out the door to your left 4 doors down.",
                1400,
                900,
              ),
              opsLine("Check camera 12 again before you move.", 1300, 850),
            ],
          },
          {
            type: "set_reply_chips",
            chips: lesson2MoveChip(),
          },
          { type: "clear_camera_target", cameraId: 12 },
        ],
      };
    }

    if (
      (state.phase === "lesson_2_move_prompt" ||
        state.phase === "lesson_2_move_ready") &&
      event.action === "lesson2_moving"
    ) {
      const checked =
        state.phase === "lesson_2_move_ready" || state.camera12Checked;

      if (!checked) {
        return {
          nextState: state,
          effects: [
            { type: "clear_reply_chips" },
            ...(event.label
              ? [{ type: "player_message", text: event.label } as MissionEffect]
              : []),
            {
              type: "trigger_end_game_wipe",
              durationMs: 1000,
            },
          ],
        };
      }

      const nextState = withLesson2Phase(
        {
          ...state,
          camera12Checked: false,
        },
        "lesson_2_post_move_confirm",
      );

      return {
        nextState,
        effects: [
          { type: "clear_reply_chips" },
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          { type: "stop_camera_sim" },
          { type: "resolve_camera_objective" },
          { type: "set_hallway_occupied", on: false },
          { type: "clear_camera_target", cameraId: 12 },
          {
            type: "trigger_go_dark",
            durationMs: 8000,
            message: "STANDBY",
          },
          {
            type: "set_reply_chips",
            chips: lesson2PostMoveChip(),
          },
        ],
      };
    }

    if (
      state.phase === "lesson_2_post_move_confirm" &&
      event.action === "lesson2_post_move_in"
    ) {
      return {
        nextState: state,
        effects: [
          { type: "clear_reply_chips" },
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
        ],
      };
    }
  }

  if (event.type === "CAMERA_VIEWED") {
    if (
      (state.phase === "lesson_2_move_prompt" ||
        state.phase === "lesson_2_move_ready") &&
      event.cameraId === 12
    ) {
      return {
        nextState: withLesson2Phase(
          {
            ...state,
            camera12Checked: true,
          },
          "lesson_2_move_ready",
        ),
        effects: [
          { type: "trigger_camera_target", cameraId: 12 },
          { type: "stop_camera_sim" },
        ],
      };
    }
  }

  if (event.type === "TERMINAL_COMMAND") {
    const raw = normalize(event.input);

    if (
      state.phase === "lesson_2_intro" ||
      state.phase === "lesson_2_vault_prompt" ||
      state.phase === "lesson_2_vault_help"
    ) {
      if (raw === LESSON_2_VAULT_ERASE_COMMAND) {
        const nextState = withLesson2Phase(
          {
            ...state,
            tracePercent: 0,
          },
          "lesson_2_vault_done",
        );

        return {
          nextState,
          effects: [
            {
              type: "append_terminal_output",
              lines: [
                "Vault utility started.",
                "Erasing trace logs...",
                "Trace cleanup complete.",
                "trace remains 0%",
              ],
            },
          ],
          commandResult: {
            handled: true,
            ok: true,
            advanced: true,
            gated: false,
          },
        };
      }

      return {
        nextState: state,
        effects: [],
        commandResult: {
          handled: false,
          ok: false,
          advanced: false,
          gated: false,
        },
      };
    }
  }

  return {
    nextState: state,
    effects: [],
  };
}