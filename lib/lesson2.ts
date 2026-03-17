import type { MissionEffect, MissionState } from "@/lib/missionEngine";

const DEFAULT_TERMINAL_CWD = "/home/jcarter";
const DEFAULT_TERMINAL_HOST = "local_jcarter";
const LESSON_2_DEV_COMMAND = "root el 2";

export function isLesson2DevJump(input: string) {
  return (
    input.trim().replace(/\s+/g, " ").toLowerCase() === LESSON_2_DEV_COMMAND
  );
}

function phaseToStep(phase: MissionState["phase"]): number {
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

export function makeLesson2CheckpointState(state: MissionState): MissionState {
  return {
    ...state,
    phase: "lesson_2_intro",
    step: phaseToStep("lesson_2_intro"),
  };
}

function opsLine(text: string, typingMs = 1400, afterMs = 900) {
  return { text, typingMs, afterMs };
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
        opsLine("Checkpoint accepted.", 900, 500),
        opsLine("Lesson 2 environment loaded.", 900, 600),
      ],
    },
  ];
}
