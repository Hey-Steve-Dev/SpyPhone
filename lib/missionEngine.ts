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
  | "move_prompt"
  | "post_move_confirm"
  | "laptop_objective"
  | "laptop_access_confirm"
  | "terminal_intro"
  | "terminal_pwd"
  | "terminal_ls_root"
  | "terminal_cd_payload"
  | "terminal_ls_payload"
  | "terminal_cat_intel"
  | "terminal_drop"
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
  | { type: "TERMINAL_COMMAND"; input: string; mode: Mode };

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

// --- helpers ---
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
    case "terminal_pwd":
      return 0;
    case "terminal_ls_root":
      return 1;
    case "terminal_cd_payload":
      return 2;
    case "terminal_ls_payload":
      return 3;
    case "terminal_cat_intel":
      return 4;
    case "terminal_drop":
      return 5;
    case "complete":
      return 6;
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
      return "terminal_pwd";
    case 1:
      return "terminal_ls_root";
    case 2:
      return "terminal_cd_payload";
    case 3:
      return "terminal_ls_payload";
    case 4:
      return "terminal_cat_intel";
    case 5:
      return "terminal_drop";
    case 6:
      return "complete";
    default:
      return "terminal_pwd";
  }
}

function handlerForTerminalPhase(phase: MissionPhase): string[] {
  switch (phase) {
    case "terminal_pwd":
      return [
        "You're in the shell now.",
        "Confirm where you landed. Type: `pwd`.",
      ];
    case "terminal_ls_root":
      return ["Good. Now list what you've got. Type: `ls`."];
    case "terminal_cd_payload":
      return ["Move into the payload directory. Type: `cd payload`."];
    case "terminal_ls_payload":
      return ["Check the contents. Type: `ls`."];
    case "terminal_cat_intel":
      return ["Read the intel file. Type: `cat intel.txt`."];
    case "terminal_drop":
      return [
        "Exfil window is open.",
        "Run the transfer now. Type: `./drop.sh`.",
      ];
    case "complete":
      return ["Transfer is running. Stay sharp."];
    default:
      return ["Stand by."];
  }
}

function makeSuccessfulMoveEffects(): MissionEffect[] {
  return [
    {
      type: "handler_sequence",
      items: [opsLine("Go. Go. Go.", 1200, 800)],
    },
    { type: "stop_camera_sim" },
    { type: "resolve_camera_objective" },
    { type: "set_hallway_occupied", on: false },
    {
      type: "trigger_go_dark",
      durationMs: 3200,
      message: "STANDBY",
    },
    {
      type: "trigger_biometric_scan",
      durationMs: 900,
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
        "Signal when you're moving.",
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
      return ["Good.", "Let's see what they left open.", "Open Terminal."];

    default:
      return ["Stand by."];
  }
}

export function handleMissionEvent(
  state: MissionState,
  event: MissionEvent,
  ctx: MissionContext,
): MissionEventResult {
  if (event.type === "BOOT") {
    const nextState = withPhase(state, "boot_confirm_online");

    return {
      nextState,
      effects: [
        { type: "trigger_biometric_scan", durationMs: 600 },
        { type: "set_terminal_locked", on: true },
        { type: "clear_thread" },
        { type: "reset_terminal" },
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
              opsLine("Signal when you're moving.", 1300, 1200),
            ],
          },
          {
            type: "set_reply_chips",
            chips: [{ id: "move_now", label: "Moving", action: "moving_now" }],
          },
          { type: "start_camera_objective", targetId: 12 },
          { type: "start_camera_sim" },
          { type: "set_hallway_occupied", on: false },
          { type: "start_guard_wait_window", timeoutMs: 25000 },
        ],
      };
    }

    if (state.phase === "camera_watch" && event.action === "moving_now") {
      const result = handleMissionEvent(
        withPhase(state, "move_prompt"),
        { type: "MOVE_ATTEMPT" },
        ctx,
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
      const nextState = withPhase(state, "terminal_intro");

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
              opsLine("Good.", 1200, 800),
              opsLine("Let's see what they left open.", 1450, 900),
              opsLine("Open Terminal.", 1300, 1100),
            ],
          },
          { type: "set_terminal_locked", on: false },
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
    if (state.phase !== "laptop_objective") {
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
          type: "handler_sequence",
          items: [opsLine("Signal when you're connected.", 1400, 1000)],
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

    if (ctx.hallwayOccupied) {
      return {
        nextState: state,
        effects: [],
      };
    }

    return {
      nextState: state,
      effects: [{ type: "set_hallway_occupied", on: true }],
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
        { type: "player_message", text: "Moving" },
        ...makeSuccessfulMoveEffects(),
      ],
    };
  }

  if (event.type === "MOVE_ATTEMPT") {
    if (ctx.hallwayOccupied) {
      return {
        nextState: withPhase(state, "camera_watch"),
        effects: [
          {
            type: "handler_sequence",
            items: [
              opsLine("Negative. Guard is still in the hall.", 1450, 1200),
            ],
          },
          {
            type: "mission_failed",
            reason: "movement_while_hall_occupied",
            bannerTitle: "ALERT",
            bannerMessage: "Compromised.",
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
    const nextState = withPhase(state, "terminal_pwd");

    return {
      nextState,
      effects: [
        {
          type: "handler_sequence",
          items: opsSequence(missionIntro(nextState)),
        },
      ],
    };
  }

  if (event.type === "TERMINAL_COMMAND") {
    const result = runMissionCommand(
      event.input,
      event.mode,
      state,
      ctx.jammerEnabled,
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
        ...(result.nextState.phase === "complete"
          ? [
              {
                type: "banner",
                title: "COMPLETE",
                message: "Transfer complete.",
                ms: 2200,
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

export function runMissionCommand(
  input: string,
  mode: Mode,
  state: MissionState,
  jammerEnabled: boolean,
): TerminalCommandResult {
  const raw = norm(input);

  const phase =
    state.phase.startsWith("terminal_") || state.phase === "complete"
      ? state.phase
      : terminalPhaseFromStep(state.step);

  if (phase === "terminal_pwd") {
    if (matches(raw, "pwd", mode)) {
      const nextState = withPhase(state, "terminal_ls_root");
      return {
        handled: true,
        ok: true,
        advanced: true,
        terminalOut: ["/home/agent/ops"],
        handlerOut: handlerForTerminalPhase(nextState.phase),
        nextState,
      };
    }
    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: ["Negative. Confirm position with: `pwd`."],
      nextState: state,
    };
  }

  if (phase === "terminal_ls_root") {
    if (matches(raw, "ls", mode, ["ls -la", "ls -l", "ls -a"])) {
      const nextState = withPhase(state, "terminal_cd_payload");
      return {
        handled: true,
        ok: true,
        advanced: true,
        terminalOut: ["intel.txt", "access.log", "payload/"],
        handlerOut: handlerForTerminalPhase(nextState.phase),
        nextState,
      };
    }
    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: ["Don't improvise. Type: `ls`."],
      nextState: state,
    };
  }

  if (phase === "terminal_cd_payload") {
    if (matches(raw, "cd payload", mode, ["cd    payload", "CD payload"])) {
      const nextState = withPhase(state, "terminal_ls_payload");
      return {
        handled: true,
        ok: true,
        advanced: true,
        terminalOut: ["~/ops/payload"],
        handlerOut: handlerForTerminalPhase(nextState.phase),
        nextState,
      };
    }
    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: ["We need the payload directory. Type: `cd payload`."],
      nextState: state,
    };
  }

  if (phase === "terminal_ls_payload") {
    if (matches(raw, "ls", mode, ["ls -la", "ls -l", "ls -a"])) {
      const nextState = withPhase(state, "terminal_cat_intel");
      return {
        handled: true,
        ok: true,
        advanced: true,
        terminalOut: ["intel.txt", "drop.sh", "README.md"],
        handlerOut: handlerForTerminalPhase(nextState.phase),
        nextState,
      };
    }
    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: ["Confirm contents. Type: `ls`."],
      nextState: state,
    };
  }

  if (phase === "terminal_cat_intel") {
    if (matches(raw, "cat intel.txt", mode, ["cat ./intel.txt"])) {
      const intelLines = [
        "INTEL: server=staging-7",
        "port=443",
        "user=agent",
        "NOTE: exfil window is short.",
      ];

      if (!jammerEnabled) {
        const holdState = withPhase(state, "terminal_cat_intel");

        return {
          handled: true,
          ok: true,
          advanced: false,
          gated: true,
          terminalOut: intelLines,
          handlerOut: [
            "Mask comms before exfil.",
            "Open Jammer. Set MASK ON.",
            "Then run: `cat intel.txt` again.",
          ],
          nextState: holdState,
        };
      }

      const nextState = withPhase(state, "terminal_drop");
      return {
        handled: true,
        ok: true,
        advanced: true,
        terminalOut: intelLines,
        handlerOut: handlerForTerminalPhase(nextState.phase),
        nextState,
      };
    }
    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: ["Read the intel. Type: `cat intel.txt`."],
      nextState: state,
    };
  }

  if (phase === "terminal_drop") {
    if (matches(raw, "./drop.sh", mode, ["bash drop.sh", "sh drop.sh"])) {
      const nextState = withPhase(state, "complete");
      return {
        handled: true,
        ok: true,
        advanced: true,
        terminalOut: ["Running drop.sh...", "Transfer started."],
        handlerOut: handlerForTerminalPhase(nextState.phase),
        nextState,
      };
    }
    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: ["No. Run the drop script: `./drop.sh`."],
      nextState: state,
    };
  }

  return { handled: false };
}
