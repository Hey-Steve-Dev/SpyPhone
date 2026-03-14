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
  | "complete";

export type MissionState = {
  missionId: "bootcamp_01";
  phase: MissionPhase;
  step: number;
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

const CAMERA_TUNNEL_DEVICE_ID = "camera_access_point";
const LAPTOP_TUNNEL_DEVICE_ID = "security_laptop";

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function normLower(s: string) {
  return norm(s).toLowerCase();
}

function opsLine(text: string, typingMs = 1400, afterMs = 900) {
  return { text, typingMs, afterMs };
}

function opsSequence(lines: string[]) {
  return lines.map((text, index) =>
    opsLine(text, 1300 + index * 150, 950 + Math.min(index, 2) * 150),
  );
}

function matches(
  inputRaw: string,
  exact: string,
  mode: Mode,
  easyAlso: string[] = [],
) {
  const raw = norm(inputRaw);
  if (mode === "strict") return raw === exact;

  const inL = normLower(inputRaw);
  if (normLower(exact) === inL) return true;

  return easyAlso.map(normLower).includes(inL);
}

function enemyUnknown(cmd: string) {
  return cmd ? [`bash: ${cmd}: command not found`] : [];
}

function reviewSetIndexForPhase(phase: MissionPhase): number {
  switch (phase) {
    case "review_messages":
      return 0;
    case "review_network":
      return 1;
    case "review_terminal":
      return 2;
    case "review_ops":
      return 3;
    default:
      return 0;
  }
}

function reviewAckChips(phase: MissionPhase): ReplyChip[] {
  const chipSets: Array<[ack1: string, ack2: string, skip: string]> = [
    ["OK", "Got it", "Pass"],
    ["Copy", "Understood", "Pass"],
    ["Roger", "I got it", "Pass"],
    ["OK", "Move on", "Pass"],
  ];

  const [ack1, ack2, skip] =
    chipSets[reviewSetIndexForPhase(phase) % chipSets.length];

  return [
    { id: `${phase}_ack_1`, label: ack1, action: "review_ack" },
    { id: `${phase}_ack_2`, label: ack2, action: "review_ack" },
    { id: `${phase}_skip`, label: skip, action: "skip_review" },
  ];
}

function isReviewPhase(phase: MissionPhase) {
  return (
    phase === "review_messages" ||
    phase === "review_network" ||
    phase === "review_terminal" ||
    phase === "review_ops"
  );
}

function nextReviewPhase(phase: MissionPhase): MissionPhase {
  switch (phase) {
    case "review_messages":
      return "review_network";
    case "review_network":
      return "review_terminal";
    case "review_terminal":
      return "review_ops";
    case "review_ops":
      return "network_objective";
    default:
      return "network_objective";
  }
}

function reviewLinesForPhase(phase: MissionPhase): string[] {
  switch (phase) {
    case "review_messages":
      return [
        "Comms is burst traffic only. Short, fast, and not always reliable.",
        "Use the response chips when you can.",
        "If you start typing chatter into comms, your trace goes up.",
        "If trace gets too high, we're blown.",
      ];

    case "review_network":
      return [
        "Tunnel gets you into devices when you're close enough.",
        "You will use Tunnel a lot.",
        "Once you're in, Terminal is where you do the real work inside the device.",
      ];

    case "review_terminal":
      return [
        "Terminal is where you'll spend most of this run.",
        "You'll inspect systems, move through files, and act on what you find.",
        "Type clean. Slow is better than wrong.",
      ];

    case "review_ops":
      return [
        "Listen carefully and follow directions in order.",
        "Timing matters on this mission. Move too early or too late and it can break the window.",
        "I am not inside with you.",
        "You are the sole eyes and ears in that building.",
      ];

    default:
      return ["Stand by."];
  }
}

function reviewAdvanceEffects(
  state: MissionState,
  event: Extract<MissionEvent, { type: "REPLY_SELECTED" }>,
): MissionEventResult {
  const nextPhase = nextReviewPhase(state.phase);
  const nextState = withPhase(state, nextPhase);

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
            opsLine("Open Tunnel and access it.", 1400, 900),
            opsLine("We need eyes inside the building.", 1450, 1200),
          ],
        },
      ],
    };
  }

  return {
    nextState,
    effects: [
      { type: "clear_reply_chips" },
      ...(event.label
        ? [{ type: "player_message", text: event.label } as MissionEffect]
        : []),
      {
        type: "handler_sequence",
        items: opsSequence(reviewLinesForPhase(nextState.phase)),
      },
      {
        type: "set_reply_chips",
        chips: reviewAckChips(nextState.phase),
      },
    ],
  };
}

export function makeInitialMissionState(): MissionState {
  return {
    missionId: "bootcamp_01",
    phase: "boot_intro",
    step: 0,
  };
}

function phaseToStep(phase: MissionPhase): number {
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

function withPhase(state: MissionState, phase: MissionPhase): MissionState {
  return {
    ...state,
    phase,
    step: phaseToStep(phase),
  };
}

function terminalPhaseFromStep(step: number): MissionPhase {
  switch (step) {
    case 0:
      return "terminal_brief_pwd";
    case 1:
      return "terminal_brief_search";
    case 2:
      return "complete";
    default:
      return "terminal_brief_pwd";
  }
}

function handlerForTerminalPhase(phase: MissionPhase): string[] {
  switch (phase) {
    case "terminal_brief_pwd":
      return [
        "You should see something like `/home` with a username at the end. Let me know if you see it.",
      ];

    case "terminal_brief_search":
      return [
        "Good. You're going to need to look around in there for an elevator passcode.",
        "Type `ls` to list files and folders.",
        "Type `cat` to read a file.",
        "Type `cd` to move into a folder.",
        "Search through the system and find the code.",
      ];

    case "complete":
      return ["Good work."];

    default:
      return ["Stand by."];
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

export function missionIntro(state: MissionState): string[] {
  if (state.phase.startsWith("terminal_") || state.phase === "complete") {
    return handlerForTerminalPhase(state.phase);
  }

  switch (state.phase) {
    case "boot_intro":
    case "boot_confirm_online":
      return ["Comms check. You online?"];

    case "phone_review_offer":
      return ["Your device has been updated. Do you need a rundown?"];

    case "review_messages":
    case "review_network":
    case "review_terminal":
    case "review_ops":
      return reviewLinesForPhase(state.phase);

    case "network_objective":
      return [
        "We need to find an elevator passcode down here before we can move.",
        "There should be an access point for the cameras in the room next to you.",
        "Open Tunnel and access it.",
        "We need eyes inside the building.",
      ];

    case "camera_access_confirm":
      return ["Signal when you have camera access."];

    case "camera_watch":
      return [
        "OK. Good.",
        "I'm hearing chatter on the band. One of the guards is on patrol.",
        "Go to Camera 12 and wait for him to pass.",
      ];

    case "move_prompt":
      return ["Signal when you're moving."];

    case "post_move_confirm":
      return ["Signal when you're in."];

    case "laptop_objective":
      return [
        "Good. Stay quiet.",
        "We need access to the laptop in that room.",
        "Run a scan and tunnel into it.",
        "Signal when you're connected.",
      ];

    case "laptop_access_confirm":
      return ["Signal when you're connected."];

    case "terminal_intro":
      return ["Good.", "Open Terminal."];

    default:
      return ["Stand by."];
  }
}

export function handleMissionEvent(
  state: MissionState,
  event: MissionEvent,
  ctx?: MissionContext,
): MissionEventResult {
  const safeCtx: MissionContext = {
    jammerEnabled: ctx?.jammerEnabled ?? false,
    hallwayOccupied: ctx?.hallwayOccupied ?? false,
  };

  if (event.type === "BOOT") {
    const nextState = withPhase(state, "boot_confirm_online");

    return {
      nextState,
      effects: [
        { type: "trigger_biometric_scan", durationMs: 600 },
        { type: "set_terminal_locked", on: true },
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

  if (event.type === "REPLY_SELECTED") {
    if (state.phase === "boot_intro" || state.phase === "boot_confirm_online") {
      if (event.action === "confirm_online") {
        const nextState = withPhase(state, "phone_review_offer");

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
                  "OK, we need to get you behind the firewall on the 3rd floor quietly.",
                  1550,
                  1100,
                ),
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
        const nextState = withPhase(state, "review_messages");

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
                  "OK. I will give you the important updates now.",
                  1450,
                  1100,
                ),
                ...opsSequence(reviewLinesForPhase(nextState.phase)),
              ],
            },
            {
              type: "set_reply_chips",
              chips: reviewAckChips(nextState.phase),
            },
          ],
        };
      }

      if (event.action === "skip_review") {
        const nextState = withPhase(state, "network_objective");

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
      if (event.action === "review_ack") {
        return reviewAdvanceEffects(state, event);
      }

      if (event.action === "skip_review") {
        const nextState = withPhase(state, "network_objective");

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
      const nextState = withPhase(state, "camera_watch");

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
          { type: "set_hallway_occupied", on: false },
        ],
      };
    }

    if (state.phase === "camera_watch" && event.action === "moving_now") {
      const result = handleMissionEvent(
        withPhase(state, "move_prompt"),
        { type: "MOVE_ATTEMPT" },
        safeCtx,
      );

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

    if (
      state.phase === "post_move_confirm" &&
      event.action === "post_move_in"
    ) {
      const nextState = withPhase(state, "laptop_objective");

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
              opsLine("Run a scan and tunnel into it.", 1400, 950),
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
      const nextState = withPhase(state, "terminal_brief_pwd");

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
              opsLine("Open Terminal.", 1300, 1100),
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
          { type: "set_terminal_locked", on: false },
        ],
      };
    }

    if (
      state.phase === "terminal_brief_pwd" &&
      event.action === "terminal_pwd_seen"
    ) {
      const nextState = withPhase(state, "terminal_brief_search");

      return {
        nextState,
        effects: [
          { type: "clear_reply_chips" },
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          {
            type: "handler_sequence",
            items: opsSequence(handlerForTerminalPhase(nextState.phase)),
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
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          {
            type: "handler_sequence",
            items: [
              opsLine(
                "Look for anything that sounds personal, saved, or useful. Use `cd` for folders and `cat` for text files.",
                1450,
                1000,
              ),
            ],
          },
        ],
      };
    }

    if (
      state.phase === "terminal_brief_search" &&
      event.action === "terminal_found_code"
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

  if (event.type === "NETWORK_LINKED") {
    const nextState = withPhase(state, "camera_access_confirm");

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
        { type: "set_terminal_locked", on: true },
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

      const nextState = withPhase(state, "camera_access_confirm");

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
          { type: "set_terminal_locked", on: true },
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

      const nextState = withPhase(state, "laptop_access_confirm");

      return {
        nextState,
        effects: [
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

    if (safeCtx.hallwayOccupied) {
      return {
        nextState: state,
        effects: [],
      };
    }

    return {
      nextState: state,
      effects: [
        { type: "set_hallway_occupied", on: true },
        { type: "trigger_camera_target", cameraId: 12 },
        { type: "start_camera_sim" },
        { type: "start_guard_wait_window", timeoutMs: 25000 },
        {
          type: "set_reply_chips",
          chips: [{ id: "move_now", label: "Moving", action: "moving_now" }],
        },
      ],
    };
  }

  if (event.type === "SCANNER_CHATTER_HEARD") {
    const nextState = withPhase(state, "move_prompt");

    return {
      nextState,
      effects: [
        {
          type: "handler_sequence",
          items: [
            opsLine("There it is. East entrance traffic. Move.", 1550, 1300),
          ],
        },
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

    const nextState = withPhase(state, "post_move_confirm");

    return {
      nextState,
      effects: [
        { type: "clear_reply_chips" },
        {
          type: "handler_sequence",
          items: [
            opsLine(
              "OK, he must be past now, move it, we're wasting time.",
              1550,
              900,
            ),
          ],
        },
        { type: "set_hallway_occupied", on: false },
        { type: "clear_camera_target", cameraId: 12 },
        { type: "player_message", text: "Moving" },
        ...makeSuccessfulMoveEffects(),
      ],
    };
  }
  if (event.type === "MOVE_ATTEMPT") {
    if (safeCtx.hallwayOccupied) {
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

    const nextState = withPhase(state, "post_move_confirm");

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
    const inTerminalMission =
      state.phase === "terminal_intro" ||
      state.phase.startsWith("terminal_") ||
      state.phase === "complete";

    if (!inTerminalMission) {
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

    const result = runMissionCommand(
      event.input,
      event.mode ?? "easy",
      state,
      safeCtx.jammerEnabled,
      event.cwd ?? "/home/jcarter",
    );

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

    return {
      nextState: result.nextState,
      effects: [
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
      ],
      commandResult: {
        handled: true,
        ok: result.ok,
        advanced: result.advanced,
        gated: !!result.gated,
      },
    };
  }

  return {
    nextState: state,
    effects: [],
  };
}

function listForCwd(cwd: string): string[] | null {
  switch (cwd) {
    case "/home/jcarter":
      return ["Desktop", "Documents", "Downloads", "Pictures", "saved_notes"];
    case "/home/jcarter/saved_notes":
      return ["useful_info.txt", "network"];
    case "/home/jcarter/saved_notes/network":
      return ["maintenance"];
    case "/home/jcarter/saved_notes/network/maintenance":
      return ["info"];
    case "/home/jcarter/saved_notes/network/maintenance/info":
      return ["elevators"];
    case "/home/jcarter/saved_notes/network/maintenance/info/elevators":
      return ["weekly_passcodes"];
    case "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes":
      return ["2026_week_09", "2026_week_10", "current_week", "archive"];
    case "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/current_week":
      return [
        "elevator_override.txt",
        "service_notes.txt",
        "rotation_schedule.txt",
      ];
    default:
      return null;
  }
}

function canReadFile(cwd: string, fileName: string) {
  if (cwd === "/home/jcarter/saved_notes" && fileName === "useful_info.txt") {
    return [
      "Personal Quick Notes",
      "",
      "Printer PIN: 7712",
      "Locker combo: 2041",
      "",
      "Elevator maintenance override codes are rotated weekly.",
      "Maintenance portal path:",
      "network/maintenance/info/elevators/weekly_passcodes",
      "",
      "Use the current week folder to get the active code.",
    ];
  }

  if (
    cwd ===
      "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/current_week" &&
    fileName === "elevator_override.txt"
  ) {
    return [
      "Elevator Maintenance Override",
      "Week 11",
      "",
      "Override Code: 4839",
      "",
      "Note:",
      "Code resets automatically every Monday at 04:00.",
    ];
  }

  return null;
}

function resolveCd(cwd: string, argRaw: string): string | null {
  const arg = norm(argRaw);

  if (!arg) return cwd;
  if (arg === "~") return "/home/jcarter";
  if (arg === "/home/jcarter") return "/home/jcarter";
  if (arg === "..") {
    if (cwd === "/home/jcarter") return "/home/jcarter";
    return cwd.split("/").slice(0, -1).join("/") || "/home/jcarter";
  }

  if (arg.startsWith("/")) {
    return listForCwd(arg) ? arg : null;
  }

  const next = `${cwd}/${arg}`;
  return listForCwd(next) ? next : null;
}

export function runMissionCommand(
  input: string,
  mode: Mode,
  state: MissionState,
  _jammerEnabled: boolean,
  cwd: string,
): TerminalCommandResult {
  const raw = norm(input);

  const phase =
    state.phase.startsWith("terminal_") || state.phase === "complete"
      ? state.phase
      : terminalPhaseFromStep(state.step);

  if (phase === "terminal_brief_pwd") {
    if (matches(raw, "pwd", mode)) {
      return {
        handled: true,
        ok: true,
        advanced: false,
        terminalOut: [cwd],
        handlerOut: [],
        nextState: state,
      };
    }

    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: [],
      nextState: state,
    };
  }

  if (phase === "terminal_brief_search") {
    if (matches(raw, "pwd", mode)) {
      return {
        handled: true,
        ok: true,
        advanced: false,
        terminalOut: [cwd],
        handlerOut: [],
        nextState: state,
      };
    }

    if (matches(raw, "ls", mode, ["ls -la", "ls -l", "ls -a"])) {
      const listing = listForCwd(cwd);
      return {
        handled: true,
        ok: !!listing,
        advanced: false,
        terminalOut: listing ?? ["ls: cannot access directory"],
        handlerOut: [],
        nextState: state,
      };
    }

    if (
      normLower(raw).startsWith("cd ") ||
      normLower(raw) === "cd" ||
      normLower(raw) === "cd .."
    ) {
      const arg =
        normLower(raw) === "cd" ? "~" : raw.slice(raw.indexOf("cd") + 2).trim();
      const nextCwd = resolveCd(cwd, arg);

      if (!nextCwd) {
        return {
          handled: true,
          ok: false,
          advanced: false,
          terminalOut: [`cd: no such file or directory: ${arg}`],
          handlerOut: [],
          nextState: state,
        };
      }

      return {
        handled: true,
        ok: true,
        advanced: false,
        terminalOut: [],
        handlerOut: [],
        nextState: state,
        effects: [{ type: "set_terminal_cwd", cwd: nextCwd }],
      };
    }

    if (
      matches(raw, "cat useful_info.txt", mode, ["cat ./useful_info.txt"]) ||
      matches(raw, "cat elevator_override.txt", mode, [
        "cat ./elevator_override.txt",
      ])
    ) {
      const fileName = raw.split(" ").slice(1).join(" ").replace("./", "");
      const fileOut = canReadFile(cwd, fileName);

      if (!fileOut) {
        return {
          handled: true,
          ok: false,
          advanced: false,
          terminalOut: [`cat: ${fileName}: No such file or directory`],
          handlerOut: [],
          nextState: state,
        };
      }

      if (fileName === "elevator_override.txt") {
        const nextState = withPhase(state, "complete");
        return {
          handled: true,
          ok: true,
          advanced: true,
          terminalOut: fileOut,
          handlerOut: handlerForTerminalPhase(nextState.phase),
          nextState,
        };
      }

      return {
        handled: true,
        ok: true,
        advanced: false,
        terminalOut: fileOut,
        handlerOut: [],
        nextState: state,
      };
    }

    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: [],
      nextState: state,
    };
  }

  return { handled: false };
}
