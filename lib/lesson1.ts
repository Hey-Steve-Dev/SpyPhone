import {
  makeLesson2CheckpointEffects,
  makeLesson2CheckpointState,
} from "@/lib/lesson2";
import type {
  MissionContext,
  MissionEffect,
  MissionEvent,
  MissionEventResult,
  MissionPhase,
  MissionState,
  Mode,
  ReplyChip,
  TerminalCommandResult,
} from "@/lib/missionEngine";
import { runMissionCommand } from "@/lib/terminalFs";

const CAMERA_TUNNEL_DEVICE_ID = "camera_access_point";
const LAPTOP_TUNNEL_DEVICE_ID = "security_laptop";
const DEFAULT_TERMINAL_CWD = "/home/jcarter";
const DEFAULT_TERMINAL_HOST = "local_jcarter";

type Lesson1Phase =
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
  | "complete";

type Lesson1ReviewPhase =
  | "review_messages"
  | "review_network"
  | "review_terminal"
  | "review_ops";

type Lesson1TerminalNarrationPhase =
  | "terminal_brief_pwd"
  | "terminal_brief_search"
  | "complete";

function generateElevatorCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function opsLine(text: string, typingMs = 1400, afterMs = 900) {
  return { text, typingMs, afterMs };
}

function opsSequence(lines: string[]) {
  return lines.map((text, index) =>
    opsLine(text, 1300 + index * 150, 950 + Math.min(index, 2) * 150),
  );
}

function lesson1PhaseToStep(phase: Lesson1Phase): number {
  switch (phase) {
    case "terminal_brief_pwd":
      return 0;
    case "terminal_brief_search":
      return 1;
    case "complete":
      return 2;
    default:
      return 0;
  }
}

function withLesson1Phase(
  state: MissionState,
  phase: Lesson1Phase,
): MissionState {
  return {
    ...state,
    phase,
    step: lesson1PhaseToStep(phase),
  };
}

function reviewSetIndexForPhase(phase: Lesson1ReviewPhase): number {
  switch (phase) {
    case "review_messages":
      return 0;
    case "review_network":
      return 1;
    case "review_terminal":
      return 2;
    case "review_ops":
      return 3;
  }
}

function reviewAckChips(phase: Lesson1ReviewPhase): ReplyChip[] {
  const chipSets: Array<[ack1: string, ack2: string, skip: string]> = [
    ["OK", "Got it", "Let's get to it"],
    ["Copy", "Understood", "I am ready"],
    ["Roger", "OK", "Let's move on"],
    ["OK", "Copy", "Understood"],
  ];

  const [ack1, ack2, skip] =
    chipSets[reviewSetIndexForPhase(phase) % chipSets.length];

  return [
    { id: `${phase}_ack_1`, label: ack1, action: "review_ack" },
    { id: `${phase}_ack_2`, label: ack2, action: "review_ack" },
    { id: `${phase}_skip`, label: skip, action: "skip_review" },
  ];
}

function isReviewPhase(phase: MissionPhase): phase is Lesson1ReviewPhase {
  return (
    phase === "review_messages" ||
    phase === "review_network" ||
    phase === "review_terminal" ||
    phase === "review_ops"
  );
}

function nextReviewPhase(phase: Lesson1ReviewPhase): Lesson1Phase {
  switch (phase) {
    case "review_messages":
      return "review_network";
    case "review_network":
      return "review_terminal";
    case "review_terminal":
      return "review_ops";
    case "review_ops":
      return "network_objective";
  }
}

function reviewLinesForPhase(phase: Lesson1ReviewPhase): string[] {
  switch (phase) {
    case "review_messages":
      return [
        "Comms is limited burst traffic.",
        "Use the response chips when you can.",
        "Keep chatter to a minimum.",
      ];

    case "review_network":
      return [
        "Tunnel gets you into devices when you're close enough.",
        "It grants you Terminal access on the device.",
      ];

    case "review_terminal":
      return [
        "Terminal is where you'll spend most of this run.",
        "You'll inspect systems, move through files, and act on what you find.",
      ];

    case "review_ops":
      return [
        "Listen carefully and follow directions in order.",
        "Timing matters on this mission. Move too early or too late and it can break the window.",
        "I am not inside with you. You are the sole eyes and ears in that building.",
      ];
  }
}

function handlerForTerminalPhase(
  phase: Lesson1TerminalNarrationPhase,
): string[] {
  switch (phase) {
    case "terminal_brief_pwd":
      return [
        "You should see something like `/home` with a username at the end. Let me know if you see it.",
      ];

    case "terminal_brief_search":
      return [
        "Good. You're going to need to look around in there for an elevator passcode.",
        "Type `ls ` to list files and folders.",
        "Type `cat ` + file name, to read a file.",
        "Type `cd ` + folder name to move into a folder.",
        "Search through the system and find the code.",
      ];

    case "complete":
      return [];
  }
}

function makeSuccessfulMoveEffects(): MissionEffect[] {
  return [
    {
      type: "handler_sequence",
      items: [opsLine("go go go", 1200, 1400)],
    },
    { type: "stop_camera_sim" },
    { type: "resolve_camera_objective" },
    { type: "set_hallway_occupied", on: false },
    { type: "clear_camera_target", cameraId: 12 },
    {
      type: "trigger_go_dark",
      durationMs: 3200,
      message: "STANDBY",
    },
    {
      type: "set_reply_chips",
      chips: [{ id: "post_move_in", label: "I'm in", action: "post_move_in" }],
    },
  ];
}

function reviewAdvanceEffects(
  state: MissionState & { phase: Lesson1ReviewPhase },
  event: Extract<MissionEvent, { type: "REPLY_SELECTED" }>,
): MissionEventResult {
  const nextPhase = nextReviewPhase(state.phase);
  const nextState = withLesson1Phase(state, nextPhase);

  if (nextPhase === "network_objective") {
    return {
      nextState,
      effects: [
        { type: "clear_reply_chips" },
        { type: "set_tunnel_targets", deviceIds: [CAMERA_TUNNEL_DEVICE_ID] },
        ...(event.label
          ? [{ type: "player_message", text: event.label } as MissionEffect]
          : []),
        {
          type: "handler_sequence",
          items: [
            opsLine(
              "We need to find an elevator passcode down here before we can move.",
              1500,
              1000,
            ),
            opsLine(
              "There should be an access point for the cameras in the room next to you.",
              1500,
              1000,
            ),
            opsLine("Open your Tunnel app, scan and access it.", 1400, 900),
            opsLine("We need eyes inside the building.", 1450, 1200),
          ],
        },
      ],
    };
  }

  if (nextState.phase === "review_messages") {
    return {
      nextState,
      effects: [
        { type: "clear_reply_chips" },
        ...(event.label
          ? [{ type: "player_message", text: event.label } as MissionEffect]
          : []),
        {
          type: "handler_sequence",
          items: opsSequence(reviewLinesForPhase("review_messages")),
        },
        {
          type: "set_reply_chips",
          chips: reviewAckChips("review_messages"),
        },
      ],
    };
  }

  if (nextState.phase === "review_network") {
    return {
      nextState,
      effects: [
        { type: "clear_reply_chips" },
        ...(event.label
          ? [{ type: "player_message", text: event.label } as MissionEffect]
          : []),
        {
          type: "handler_sequence",
          items: opsSequence(reviewLinesForPhase("review_network")),
        },
        {
          type: "set_reply_chips",
          chips: reviewAckChips("review_network"),
        },
      ],
    };
  }

  if (nextState.phase === "review_terminal") {
    return {
      nextState,
      effects: [
        { type: "clear_reply_chips" },
        ...(event.label
          ? [{ type: "player_message", text: event.label } as MissionEffect]
          : []),
        {
          type: "handler_sequence",
          items: opsSequence(reviewLinesForPhase("review_terminal")),
        },
        {
          type: "set_reply_chips",
          chips: reviewAckChips("review_terminal"),
        },
      ],
    };
  }

  if (nextState.phase === "review_ops") {
    return {
      nextState,
      effects: [
        { type: "clear_reply_chips" },
        ...(event.label
          ? [{ type: "player_message", text: event.label } as MissionEffect]
          : []),
        {
          type: "handler_sequence",
          items: opsSequence(reviewLinesForPhase("review_ops")),
        },
        {
          type: "set_reply_chips",
          chips: reviewAckChips("review_ops"),
        },
      ],
    };
  }

  return {
    nextState,
    effects: [{ type: "clear_reply_chips" }],
  };
}

function makeTerminalEffects(
  result: Extract<TerminalCommandResult, { handled: true }>,
): MissionEffect[] {
  return [
    ...(result.effects ?? []),
    ...(result.terminalOut.length
      ? [
          {
            type: "append_terminal_output",
            lines: result.terminalOut,
          } as MissionEffect,
        ]
      : []),
    ...(result.handlerOut?.length
      ? [
          {
            type: "handler_sequence",
            items: opsSequence(result.handlerOut),
          } as MissionEffect,
        ]
      : []),
  ];
}

function terminalShowsPwdResult(
  result: Extract<TerminalCommandResult, { handled: true }>,
  cwd: string,
) {
  return result.ok && result.terminalOut.includes(cwd);
}

function terminalShowsElevatorCode(
  result: Extract<TerminalCommandResult, { handled: true }>,
  state: MissionState,
) {
  return (
    result.ok &&
    result.terminalOut.some((line) => line.includes(state.elevatorCode))
  );
}

export function handleLesson1TerminalCommand(
  state: MissionState,
  input: string,
  mode: Mode,
  cwd: string,
): MissionEventResult {
  const result = runMissionCommand(input, mode, state, cwd);

  if (!result.handled) {
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

  if (state.phase === "terminal_brief_pwd") {
    const advanced = terminalShowsPwdResult(result, cwd);

    return {
      nextState: state,
      effects: makeTerminalEffects(result),
      commandResult: {
        handled: true,
        ok: result.ok,
        advanced,
        gated: !!result.gated,
      },
    };
  }

  if (state.phase === "terminal_brief_search") {
    const advanced = terminalShowsElevatorCode(result, state);

    return {
      nextState: state,
      effects: makeTerminalEffects(result),
      commandResult: {
        handled: true,
        ok: result.ok,
        advanced,
        gated: !!result.gated,
      },
    };
  }

  return {
    nextState: result.nextState,
    effects: makeTerminalEffects(result),
    commandResult: {
      handled: true,
      ok: result.ok,
      advanced: result.advanced,
      gated: !!result.gated,
    },
  };
}

export function makeInitialLesson1State(): MissionState {
  return {
    missionId: "bootcamp_01",
    phase: "boot_intro",
    step: 0,
    elevatorCode: generateElevatorCode(),
    tracePercent: 0,
    camera12Checked: false,
  };
}

export function isLesson1Phase(phase: MissionPhase): phase is Lesson1Phase {
  return !String(phase).startsWith("lesson_2_");
}

export function isLesson1TerminalPhase(phase: MissionPhase) {
  return (
    phase === "laptop_access_confirm" ||
    phase === "terminal_intro" ||
    phase === "terminal_brief_pwd" ||
    phase === "terminal_brief_search" ||
    phase === "complete"
  );
}

export function missionIntroLesson1(state: MissionState): string[] | null {
  if (!isLesson1Phase(state.phase)) {
    return null;
  }

  if (state.phase === "terminal_intro") {
    return ["Good.", "Open Terminal."];
  }

  if (state.phase === "terminal_brief_pwd") {
    return handlerForTerminalPhase("terminal_brief_pwd");
  }

  if (state.phase === "terminal_brief_search") {
    return handlerForTerminalPhase("terminal_brief_search");
  }

  if (state.phase === "complete") {
    return handlerForTerminalPhase("complete");
  }

  if (state.phase === "review_messages") {
    return reviewLinesForPhase("review_messages");
  }

  if (state.phase === "review_network") {
    return reviewLinesForPhase("review_network");
  }

  if (state.phase === "review_terminal") {
    return reviewLinesForPhase("review_terminal");
  }

  if (state.phase === "review_ops") {
    return reviewLinesForPhase("review_ops");
  }

  switch (state.phase) {
    case "boot_intro":
    case "boot_confirm_online":
      return ["Comms check. You online?"];

    case "phone_review_offer":
      return ["Your device has been updated. Do you need a rundown?"];

    case "network_objective":
      return [
        "We need to find an elevator passcode down here before we can move.",
        "There should be an access point for the cameras in the room next to you.",
        "Open your Tunnel app do a scan, you should be able to access it from there.",
        "We need eyes inside the building.",
      ];

    case "camera_access_confirm":
      return ["Signal when you have camera access."];

    case "camera_watch":
      return [
        "Copy that.",
        "I'm hearing chatter on the band. One of the guards is on patrol.",
        "Go to Camera 12 and wait for him to pass.",
      ];

    case "move_prompt":
      return ["Signal when you're moving."];

    case "post_move_confirm":
      return ["Signal when you're in."];

    case "laptop_objective":
      return [
        "Copy. Stay quiet.",
        "There should be a laptop in there.",
        "Open your Tunnel app and scan for the laptop.",
        "Signal when you're connected.",
      ];

    case "laptop_access_confirm":
      return ["Ok, you're in the shell now.", "Open Terminal and type `pwd`."];

    case "go_dark":
      return ["Stand by."];

    default:
      return ["Stand by."];
  }
}

export function handleLesson1Event(
  state: MissionState,
  event: MissionEvent,
  ctx?: MissionContext,
): MissionEventResult | null {
  const safeCtx: MissionContext = {
    jammerEnabled: ctx?.jammerEnabled ?? false,
    hallwayOccupied: ctx?.hallwayOccupied ?? false,
  };

  if (event.type === "BOOT") {
    const nextState = withLesson1Phase(
      makeInitialLesson1State(),
      "boot_confirm_online",
    );

    return {
      nextState,
      effects: [
        { type: "trigger_biometric_scan", durationMs: 600 },
        { type: "set_terminal_locked", on: false },
        { type: "clear_thread" },
        { type: "reset_terminal" },
        { type: "clear_tunnel_targets" },
        {
          type: "handler_sequence",
          items: [opsLine("Comms check. You online?", 1500, 1100)],
        },
        {
          type: "set_reply_chips",
          chips: [
            {
              id: "boot_online",
              label: "Online",
              action: "confirm_online",
            },
          ],
        },
      ],
    };
  }

  if (!isLesson1Phase(state.phase)) {
    return null;
  }

  if (event.type === "REPLY_SELECTED") {
    if (state.phase === "boot_intro" || state.phase === "boot_confirm_online") {
      if (event.action === "confirm_online") {
        const nextState = withLesson1Phase(state, "phone_review_offer");

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
                opsLine("We need to move.", 1550, 1100),
                opsLine(
                  "Your device has been updated. Do you need a rundown?",
                  1500,
                  1200,
                ),
              ],
            },
            {
              type: "set_reply_chips",
              chips: [
                {
                  id: "boot_review_yes",
                  label: "Yes",
                  action: "review_phone",
                },
                {
                  id: "boot_review_no",
                  label: "Pass",
                  action: "skip_review",
                },
              ],
            },
          ],
        };
      }
    }

    if (state.phase === "phone_review_offer") {
      if (event.action === "review_phone") {
        const nextState = withLesson1Phase(state, "review_messages");

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
                opsLine("Ok, here's the rundown.", 1450, 1100),
                ...opsSequence(reviewLinesForPhase("review_messages")),
              ],
            },
            {
              type: "set_reply_chips",
              chips: reviewAckChips("review_messages"),
            },
          ],
        };
      }

      if (event.action === "skip_review") {
        const nextState = withLesson1Phase(state, "network_objective");

        return {
          nextState,
          effects: [
            { type: "clear_reply_chips" },
            {
              type: "set_tunnel_targets",
              deviceIds: [CAMERA_TUNNEL_DEVICE_ID],
            },
            ...(event.label
              ? [{ type: "player_message", text: event.label } as MissionEffect]
              : []),
            {
              type: "handler_sequence",
              items: [
                opsLine(
                  "We need to find an elevator passcode down here before we can move.",
                  1500,
                  1000,
                ),
                opsLine(
                  "There should be an access point for the cameras in the room next to you.",
                  1500,
                  1000,
                ),
                opsLine("Open Tunnel and access it.", 1400, 900),
                opsLine("We need eyes inside the building.", 1450, 1200),
              ],
            },
          ],
        };
      }
    }

    if (isReviewPhase(state.phase)) {
      const reviewState = state as MissionState & { phase: Lesson1ReviewPhase };

      if (event.action === "review_ack") {
        return reviewAdvanceEffects(reviewState, event);
      }

      if (event.action === "skip_review") {
        const nextState = withLesson1Phase(state, "network_objective");

        return {
          nextState,
          effects: [
            { type: "clear_reply_chips" },
            {
              type: "set_tunnel_targets",
              deviceIds: [CAMERA_TUNNEL_DEVICE_ID],
            },
            ...(event.label
              ? [{ type: "player_message", text: event.label } as MissionEffect]
              : []),
            {
              type: "handler_sequence",
              items: [
                opsLine(
                  "We need to find an elevator passcode down here before we can move.",
                  1500,
                  1000,
                ),
                opsLine(
                  "There should be an access point for the cameras in the room next to you.",
                  1500,
                  1000,
                ),
                opsLine("Open Tunnel and access it.", 1400, 900),
                opsLine("We need eyes inside the building.", 1450, 1200),
              ],
            },
          ],
        };
      }
    }

    if (
      state.phase === "camera_access_confirm" &&
      event.action === "camera_access_confirm"
    ) {
      const nextState = withLesson1Phase(state, "camera_watch");

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
              opsLine("OK. Good.", 1350, 900),
              opsLine(
                "I'm hearing chatter on the band. One of the guards is on patrol.",
                1550,
                1000,
              ),
              opsLine("Go to Camera 12 and wait for him to pass.", 1500, 1000),
            ],
          },
          { type: "start_camera_objective", targetId: 12 },
          { type: "trigger_camera_target", cameraId: 12 },
          { type: "set_hallway_occupied", on: true },
          {
            type: "set_reply_chips",
            chips: [{ id: "move_now", label: "Moving", action: "moving_now" }],
          },
        ],
      };
    }

    if (event.action === "moving_now") {
      if (state.phase === "camera_watch" || state.phase === "move_prompt") {
        const result = handleLesson1Event(
          state,
          { type: "MOVE_ATTEMPT" },
          safeCtx,
        );

        if (!result) {
          return {
            nextState: state,
            effects: [],
          };
        }

        return {
          nextState: result.nextState,
          effects: [
            { type: "clear_reply_chips" },
            ...(event.label
              ? [{ type: "player_message", text: event.label } as MissionEffect]
              : []),
            ...result.effects,
          ],
        };
      }
    }

    if (
      state.phase === "post_move_confirm" &&
      event.action === "post_move_in"
    ) {
      const nextState = withLesson1Phase(state, "laptop_objective");

      return {
        nextState,
        effects: [
          { type: "clear_reply_chips" },
          { type: "set_tunnel_targets", deviceIds: [LAPTOP_TUNNEL_DEVICE_ID] },
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          {
            type: "handler_sequence",
            items: [
              opsLine("Good. Stay quiet.", 1350, 900),
              opsLine("We need access to the laptop in that room.", 1450, 950),
              opsLine("Run open your Tunnel app and scan for it.", 1400, 950),
              opsLine("Signal when you're connected.", 1400, 1100),
            ],
          },
        ],
      };
    }

    if (
      state.phase === "laptop_access_confirm" &&
      event.action === "laptop_access_confirm"
    ) {
      const nextState = withLesson1Phase(state, "terminal_brief_pwd");

      return {
        nextState,
        effects: [
          { type: "clear_reply_chips" },
          { type: "clear_tunnel_targets" },
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          {
            type: "handler_sequence",
            items: [
              opsLine("Good.", 1200, 800),
              opsLine(
                "Open Terminal. Our intel says this is a new employee, the laptop should be fairly clean.",
                1300,
                1100,
              ),
              opsLine("Type `pwd` to see where you are.", 1350, 900),
              opsLine(
                "You should see something like `/home` with a username at the end. Let me know if you see it.",
                1450,
                1000,
              ),
            ],
          },
          {
            type: "set_reply_chips",
            chips: [
              {
                id: "terminal_pwd_seen",
                label: "I see it",
                action: "terminal_pwd_seen",
              },
            ],
          },
          { type: "set_terminal_host", hostId: DEFAULT_TERMINAL_HOST },
          { type: "set_terminal_cwd", cwd: DEFAULT_TERMINAL_CWD },
          { type: "set_terminal_locked", on: false },
        ],
      };
    }

    if (
      state.phase === "terminal_brief_pwd" &&
      event.action === "terminal_pwd_seen"
    ) {
      const nextState = withLesson1Phase(state, "terminal_brief_search");

      return {
        nextState,
        effects: [
          { type: "clear_reply_chips" },
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          {
            type: "handler_sequence",
            items: opsSequence(
              handlerForTerminalPhase("terminal_brief_search"),
            ),
          },
          {
            type: "set_reply_chips",
            chips: [
              {
                id: "terminal_found_code",
                label: "I found the code",
                action: "terminal_found_code",
              },
              {
                id: "terminal_need_help",
                label: "I need help",
                action: "terminal_need_help",
              },
            ],
          },
        ],
      };
    }

    if (
      state.phase === "terminal_brief_search" &&
      event.action === "terminal_need_help"
    ) {
      return {
        nextState: state,
        effects: [
          { type: "clear_reply_chips" },
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          {
            type: "handler_sequence",
            items: [
              opsLine(
                "Use `cat` to read files like info.txt or anything with a . extension. Use `cd` to move into folders. You might find more folders or files inside.",
                1450,
                900,
              ),
              opsLine("Look for anything personal or useful.", 1400, 1000),
            ],
          },
          {
            type: "set_reply_chips",
            chips: [
              {
                id: "terminal_found_code_after_hint_1",
                label: "I found the code",
                action: "terminal_found_code",
              },
              {
                id: "terminal_need_help_again",
                label: "Still not finding it",
                action: "terminal_need_help_again",
              },
            ],
          },
        ],
      };
    }

    if (
      state.phase === "terminal_brief_search" &&
      event.action === "terminal_need_help_again"
    ) {
      return {
        nextState: state,
        effects: [
          { type: "clear_reply_chips" },
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          {
            type: "handler_sequence",
            items: [
              opsLine(
                "Folders look like this `my_notes`. Files looke like this. file.txt.",
                1450,
                900,
              ),
              opsLine(
                "Make sure your using cd on Folders, and cat on files.",
                1500,
                950,
              ),
              opsLine(
                "Remember when you open a file, you have to type ls to see what's inside.",
                1400,
                1000,
              ),
            ],
          },
          {
            type: "set_reply_chips",
            chips: [
              {
                id: "terminal_found_code_after_hint_2",
                label: "I found the code",
                action: "terminal_found_code",
              },
              {
                id: "terminal_not_here_2",
                label: "It must not be here",
                action: "terminal_not_here",
              },
            ],
          },
        ],
      };
    }

    if (
      state.phase === "terminal_brief_search" &&
      event.action === "terminal_not_here"
    ) {
      const nextState = makeLesson2CheckpointState(state);

      return {
        nextState,
        effects: [
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          {
            type: "handler_sequence",
            items: [
              opsLine("Ok.", 1200, 600),
              opsLine(
                "We can search another machine. Let's move on.",
                1400,
                900,
              ),
            ],
          },
          ...makeLesson2CheckpointEffects(nextState),
        ],
      };
    }

    if (
      state.phase === "terminal_brief_search" &&
      event.action === "terminal_found_code"
    ) {
      const nextState = makeLesson2CheckpointState(state);

      return {
        nextState,
        effects: [
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          ...makeLesson2CheckpointEffects(nextState),
        ],
      };
    }
  }

  if (event.type === "NETWORK_LINKED") {
    const nextState = withLesson1Phase(state, "camera_access_confirm");

    return {
      nextState,
      effects: [
        {
          type: "handler_sequence",
          items: [opsLine("Signal when you have camera access.", 1450, 1100)],
        },
        {
          type: "set_reply_chips",
          chips: [
            {
              id: "camera_access_confirm",
              label: "I have camera access",
              action: "camera_access_confirm",
            },
          ],
        },
        { type: "set_terminal_locked", on: false },
      ],
    };
  }

  if (event.type === "TUNNEL_LINKED") {
    if (
      state.phase === "network_objective" ||
      state.phase === "camera_access_confirm"
    ) {
      if (event.deviceId !== CAMERA_TUNNEL_DEVICE_ID) {
        return {
          nextState: state,
          effects: [],
        };
      }

      const nextState = withLesson1Phase(state, "camera_access_confirm");

      return {
        nextState,
        effects: [
          {
            type: "handler_sequence",
            items: [opsLine("Signal when you have camera access.", 1450, 1100)],
          },
          {
            type: "set_reply_chips",
            chips: [
              {
                id: "camera_access_confirm",
                label: "I have camera access",
                action: "camera_access_confirm",
              },
            ],
          },
          { type: "set_terminal_locked", on: false },
        ],
      };
    }

    if (state.phase === "laptop_objective") {
      if (event.deviceId !== LAPTOP_TUNNEL_DEVICE_ID) {
        return {
          nextState: state,
          effects: [],
        };
      }

      const nextState = withLesson1Phase(state, "laptop_access_confirm");

      return {
        nextState,
        effects: [
          { type: "clear_tunnel_targets" },
          { type: "set_terminal_host", hostId: DEFAULT_TERMINAL_HOST },
          { type: "set_terminal_cwd", cwd: DEFAULT_TERMINAL_CWD },
          { type: "set_terminal_locked", on: false },
          {
            type: "append_terminal_output",
            lines: [
              `Connected to ${DEFAULT_TERMINAL_HOST}`,
              DEFAULT_TERMINAL_CWD,
            ],
          },
          {
            type: "set_reply_chips",
            chips: [
              {
                id: "laptop_access_confirm",
                label: "I'm connected",
                action: "laptop_access_confirm",
              },
            ],
          },
        ],
      };
    }

    return {
      nextState: state,
      effects: [],
    };
  }

  if (event.type === "CAMERA_VIEWED") {
    if (state.phase !== "camera_watch") {
      return {
        nextState: state,
        effects: [],
      };
    }

    if (event.cameraId !== 12) {
      return {
        nextState: state,
        effects: [],
      };
    }

    return {
      nextState: state,
      effects: [
        { type: "trigger_camera_target", cameraId: 12 },
        { type: "start_camera_sim" },
        { type: "start_guard_wait_window", timeoutMs: 25000 },
      ],
    };
  }

  if (event.type === "SCANNER_CHATTER_HEARD") {
    if (state.phase !== "camera_watch") {
      return {
        nextState: state,
        effects: [],
      };
    }

    const nextState = withLesson1Phase(state, "move_prompt");

    return {
      nextState,
      effects: [
        { type: "set_hallway_occupied", on: false },
        { type: "stop_camera_sim" },
        { type: "clear_camera_target", cameraId: 12 },
      ],
    };
  }

  if (event.type === "GUARD_WAIT_EXPIRED") {
    if (state.phase !== "camera_watch") {
      return {
        nextState: state,
        effects: [],
      };
    }

    const nextState = withLesson1Phase(state, "move_prompt");

    return {
      nextState,
      effects: [
        { type: "set_hallway_occupied", on: false },
        { type: "stop_camera_sim" },
        { type: "clear_camera_target", cameraId: 12 },
        {
          type: "handler_sequence",
          items: [opsLine("OK, he must be past now. Move.", 1550, 900)],
        },
      ],
    };
  }

  if (event.type === "MOVE_ATTEMPT") {
    if (state.phase !== "camera_watch" && state.phase !== "move_prompt") {
      return {
        nextState: state,
        effects: [],
      };
    }

    const unsafeMove =
      state.phase === "camera_watch" && safeCtx.hallwayOccupied;

    if (unsafeMove) {
      return {
        nextState: state,
        effects: [
          { type: "clear_reply_chips" },
          { type: "stop_camera_sim" },
          { type: "set_hallway_occupied", on: false },
          { type: "clear_camera_target", cameraId: 12 },
          {
            type: "trigger_end_game_wipe",
            durationMs: 1000,
          },
        ],
      };
    }

    const nextState = withLesson1Phase(state, "post_move_confirm");

    return {
      nextState,
      effects: makeSuccessfulMoveEffects(),
    };
  }

  if (event.type === "TERMINAL_READY") {
    return {
      nextState: state,
      effects: [],
    };
  }

  if (event.type === "TERMINAL_COMMAND") {
    if (!isLesson1TerminalPhase(state.phase)) {
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

    return handleLesson1TerminalCommand(
      state,
      event.input,
      event.mode ?? "easy",
      event.cwd ?? DEFAULT_TERMINAL_CWD,
    );
  }

  return {
    nextState: state,
    effects: [],
  };
}
