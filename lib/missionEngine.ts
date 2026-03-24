import {
  handleLesson1Event,
  makeInitialLesson1State,
  missionIntroLesson1,
} from "@/lib/lesson1";
import {
  handleLesson2Event,
  isLesson2DevJump,
  makeLesson2CheckpointEffects,
  makeLesson2CheckpointState,
  missionIntroLesson2,
} from "@/lib/lesson2";

export { runMissionCommand } from "@/lib/terminalFs";

export type Mode = "easy" | "strict";

export type MissionPhase =
  | "boot_intro"
  | "boot_confirm_online"
  | "phone_review_offer"
  | "review_messages"
  | "review_network"
  | "review_terminal"
  | "review_ops"
  | "network_objective"
  | "camera_access_confirm"
  | "camera_watch"
  | "go_dark"
  | "move_prompt"
  | "post_move_confirm"
  | "laptop_objective"
  | "laptop_access_confirm"
  | "terminal_intro"
  | "terminal_brief_pwd"
  | "terminal_brief_search"
  | "complete"
  | "lesson_2_intro"
  | "lesson_2_vault_prompt"
  | "lesson_2_vault_help"
  | "lesson_2_vault_done"
  | "lesson_2_move_prompt"
  | "lesson_2_move_ready"
  | "lesson_2_post_move_confirm"
  | "lesson_2_ready_prompt"
  | "lesson_2_harvest_prompt"
  | "lesson_2_harvest_help"
  | "lesson_2_harvest_done"
  | "lesson_2_review_prompt"
  | "lesson_2_office_missing"
  | "lesson_2_search_intro"
  | "lesson_2_search_help"
  | "lesson_2_search_active";

export type MissionState = {
  missionId: "bootcamp_01";
  phase: MissionPhase;
  step: number;
  elevatorCode: string;
  tracePercent: number;
  camera12Checked: boolean;
  lesson2ExfilComplete?: boolean;
};

export type ReplyChip = {
  id: string;
  label: string;
  action: string;
};

export type MissionContext = {
  jammerEnabled: boolean;
  hallwayOccupied: boolean;
};

export type MissionEffect =
  | {
      type: "handler_message";
      text: string;
      typingMs?: number;
      afterMs?: number;
    }
  | {
      type: "trigger_camera_target";
      cameraId: number;
    }
  | {
      type: "clear_camera_target";
      cameraId: number;
    }
  | {
      type: "handler_sequence";
      items: Array<{
        text: string;
        typingMs?: number;
        afterMs?: number;
      }>;
    }
  | {
      type: "player_message";
      text: string;
    }
  | {
      type: "set_reply_chips";
      chips: ReplyChip[];
    }
  | {
      type: "clear_reply_chips";
    }
  | {
      type: "set_terminal_locked";
      on: boolean;
    }
  | {
      type: "set_terminal_cwd";
      cwd: string;
    }
  | {
      type: "set_terminal_host";
      hostId: string;
    }
  | {
      type: "reset_terminal";
    }
  | {
      type: "clear_thread";
    }
  | {
      type: "banner";
      title: string;
      message: string;
      ms?: number;
    }
  | {
      type: "start_camera_objective";
      targetId: number;
    }
  | {
      type: "resolve_camera_objective";
    }
  | {
      type: "start_camera_sim";
    }
  | {
      type: "stop_camera_sim";
    }
  | {
      type: "set_hallway_occupied";
      on: boolean;
    }
  | {
      type: "set_camera_network_online";
      on: boolean;
    }
  | {
      type: "trigger_go_dark";
      durationMs?: number;
      message?: string;
    }
  | {
      type: "trigger_biometric_scan";
      durationMs?: number;
    }
  | {
      type: "trigger_end_game_wipe";
      durationMs?: number;
    }
  | {
      type: "start_guard_wait_window";
      timeoutMs?: number;
    }
  | {
      type: "set_mission_state";
      state: MissionState;
    }
  | {
      type: "set_mission_phase";
      phase: MissionPhase;
    }
  | {
      type: "append_terminal_output";
      lines: string[];
    }
  | {
      type: "set_tunnel_targets";
      deviceIds: string[];
    }
  | {
      type: "clear_tunnel_targets";
    }
  | {
      type: "mission_failed";
      reason: string;
      bannerTitle?: string;
      bannerMessage?: string;
    };

export type TerminalCommandResult =
  | {
      handled: false;
    }
  | {
      handled: true;
      ok: boolean;
      advanced: boolean;
      gated?: boolean;
      terminalOut: string[];
      handlerOut?: string[];
      nextState: MissionState;
      effects?: MissionEffect[];
    };

export type MissionEvent =
  | { type: "BOOT" }
  | { type: "REPLY_SELECTED"; action: string; label?: string }
  | { type: "NETWORK_LINKED"; ssid?: string }
  | { type: "TUNNEL_LINKED"; deviceId?: string; deviceName?: string }
  | { type: "CAMERA_VIEWED"; cameraId: number }
  | { type: "MOVE_ATTEMPT" }
  | { type: "SCANNER_CHATTER_HEARD" }
  | { type: "GUARD_WAIT_EXPIRED" }
  | { type: "TERMINAL_READY" }
  | { type: "TERMINAL_COMMAND"; input: string; mode?: Mode; cwd?: string };

export type MissionEventResult = {
  nextState: MissionState;
  effects: MissionEffect[];
  commandResult?: {
    handled: boolean;
    ok: boolean;
    advanced: boolean;
    gated: boolean;
  };
};

export function makeInitialMissionState(): MissionState {
  return makeInitialLesson1State();
}

export function missionIntro(state: MissionState): string[] {
  const lesson2Intro = missionIntroLesson2(state);
  if (lesson2Intro) return lesson2Intro;

  return missionIntroLesson1(state) ?? ["Stand by."];
}

export function handleMissionEvent(
  state: MissionState,
  event: MissionEvent,
  ctx?: MissionContext,
): MissionEventResult {
  if (event.type === "TERMINAL_COMMAND" && isLesson2DevJump(event.input)) {
    const nextState = makeLesson2CheckpointState(state);

    return {
      nextState,
      effects: makeLesson2CheckpointEffects(nextState),
      commandResult: {
        handled: true,
        ok: true,
        advanced: true,
        gated: false,
      },
    };
  }

  const lesson2Result = handleLesson2Event(state, event);
  if (lesson2Result) {
    return lesson2Result;
  }

  const lesson1Result = handleLesson1Event(state, event, ctx);
  if (lesson1Result) {
    return lesson1Result;
  }

  return {
    nextState: state,
    effects: [],
  };
}
