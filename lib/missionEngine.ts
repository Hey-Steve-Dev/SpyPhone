export type Mode = "easy" | "strict";

export type MissionPhase =
  | "boot_intro"
  | "boot_confirm_online"
  | "phone_review_offer"
  | "review_messages"
  | "review_terminal"
  | "review_network"
  | "review_cameras"
  | "review_scanner"
  | "review_audio_scanner"
  | "review_jammer"
  | "review_mask"
  | "review_notes"
  | "review_vault"
  | "review_ops"
  | "review_log"
  | "network_objective"
  | "camera_watch"
  | "move_prompt"
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
  | { type: "CAMERA_VIEWED"; cameraId: number }
  | { type: "MOVE_ATTEMPT" }
  | { type: "SCANNER_CHATTER_HEARD" }
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
    case "review_terminal":
      return 1;
    case "review_network":
      return 2;
    case "review_cameras":
      return 3;
    case "review_scanner":
      return 4;
    case "review_audio_scanner":
      return 5;
    case "review_jammer":
      return 6;
    case "review_mask":
      return 7;
    case "review_notes":
      return 8;
    case "review_vault":
      return 9;
    case "review_ops":
      return 10;
    case "review_log":
      return 11;
    default:
      return 0;
  }
}

function reviewAckChips(phase: MissionPhase): ReplyChip[] {
  const chipSets: Array<[ack1: string, ack2: string, skip: string]> = [
    ["OK", "Got it", "Let's get to the mission"],
    ["OK", "Copy", "I am ready to roll"],
    ["Understood", "Roger", "Skip this, I get it"],
    ["Copy that", "Got it", "Let's move"],
    ["OK", "Understood", "I am good, move on"],
    ["Roger", "Copy", "Skip the tutorial"],
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
    phase === "review_terminal" ||
    phase === "review_network" ||
    phase === "review_cameras" ||
    phase === "review_scanner" ||
    phase === "review_audio_scanner" ||
    phase === "review_jammer" ||
    phase === "review_mask" ||
    phase === "review_notes" ||
    phase === "review_vault" ||
    phase === "review_ops" ||
    phase === "review_log"
  );
}

function nextReviewPhase(phase: MissionPhase): MissionPhase {
  switch (phase) {
    case "review_messages":
      return "review_terminal";
    case "review_terminal":
      return "review_network";
    case "review_network":
      return "review_cameras";
    case "review_cameras":
      return "review_scanner";
    case "review_scanner":
      return "review_audio_scanner";
    case "review_audio_scanner":
      return "review_jammer";
    case "review_jammer":
      return "review_mask";
    case "review_mask":
      return "review_notes";
    case "review_notes":
      return "review_vault";
    case "review_vault":
      return "review_ops";
    case "review_ops":
      return "review_log";
    case "review_log":
      return "network_objective";
    default:
      return "network_objective";
  }
}

function reviewLinesForPhase(phase: MissionPhase): string[] {
  switch (phase) {
    case "review_messages":
      return [
        "Messages is your comms line.",
        "Ops speaks here. Read fast and answer clean.",
      ];
    case "review_terminal":
      return [
        "Terminal is where you'll do most of your work.",
        "You'll use it to inspect systems, move through directories, and run actions on target.",
        "When in doubt, slow down and type clean. This app matters.",
      ];
    case "review_network":
      return ["Network gets you linked.", "No link, no remote access."];
    case "review_cameras":
      return ["Cameras shows live sightlines. Use it before you move."];
    case "review_scanner":
      return [
        "Scanner sweeps the air.",
        "Use it to catch nearby signal activity.",
      ];
    case "review_audio_scanner":
      return ["Audio Scanner pulls chatter and ambient noise."];
    case "review_jammer":
      return ["Jammer buys you time.", "Mask up before noisy actions."];
    case "review_mask":
      return ["Mask shifts your profile. Wrong face, wrong trail."];
    case "review_notes":
      return ["Notes holds field reference when memory gets expensive."];
    case "review_vault":
      return [
        "Vault stores protected material. Codes, fragments, sensitive pulls.",
      ];
    case "review_ops":
      return ["Ops is mission control. Objectives, pressure, status."];
    case "review_log":
      return ["Log tracks what already happened so you can rebuild the run."];
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
            opsLine("Good. That's enough to move.", 1450, 1100),
            opsLine(
              "First action: get us on a network. Open Network and link up.",
              1450,
              1300,
            ),
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
        "Booting you into a hostile shell.",
        "Confirm where you are. Type: `pwd`.",
      ];
    case "terminal_ls_root":
      return ["List what's here. Type: `ls`."];
    case "terminal_cd_payload":
      return ["Go into the payload directory. Type: `cd payload`."];
    case "terminal_ls_payload":
      return ["Confirm what's inside. Type: `ls`."];
    case "terminal_cat_intel":
      return ["Read the intel file. Type: `cat intel.txt`."];
    case "terminal_drop":
      return [
        "Exfil window is open. You have seconds.",
        "Start the transfer. Type: `./drop.sh`.",
      ];
    case "complete":
      return ["Transfer initiated. Stay sharp. Stand by."];
    default:
      return ["Stand by."];
  }
}

export function missionIntro(state: MissionState): string[] {
  if (state.phase.startsWith("terminal_") || state.phase === "complete") {
    return handlerForTerminalPhase(state.phase);
  }

  switch (state.phase) {
    case "boot_intro":
    case "boot_confirm_online":
      return ["Are you online?"];
    case "phone_review_offer":
      return ["Want a quick ghost phone review?"];
    case "review_messages":
    case "review_terminal":
    case "review_network":
    case "review_cameras":
    case "review_scanner":
    case "review_audio_scanner":
    case "review_jammer":
    case "review_mask":
    case "review_notes":
    case "review_vault":
    case "review_ops":
    case "review_log":
      return reviewLinesForPhase(state.phase);
    case "network_objective":
      return ["First action: get us on a network. Open Network and link up."];
    case "camera_watch":
      return [
        "Secure shell is live. Check camera 12 and wait for the guard to pass.",
        "Text when you're moving.",
      ];
    case "move_prompt":
      return ["Text when you're moving."];
    case "terminal_intro":
      return ["Secure shell is live. Open Terminal."];
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
        { type: "set_terminal_locked", on: true },
        { type: "clear_thread" },
        { type: "reset_terminal" },
        {
          type: "handler_sequence",
          items: [opsLine("Are you online?", 1500, 1100)],
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
                opsLine("Good. Want a quick ghost phone review?", 1450, 1200),
              ],
            },
            {
              type: "set_reply_chips",
              chips: [
                {
                  id: "boot_review_yes",
                  label: "Sure",
                  action: "review_phone",
                },
                {
                  id: "boot_review_no",
                  label: "Let's get to the mission",
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
              items: opsSequence(reviewLinesForPhase(nextState.phase)),
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
                  "Good. Stay dark and follow instructions exactly.",
                  1500,
                  1100,
                ),
                opsLine(
                  "First action: get us on a network. Open Network and link up.",
                  1450,
                  1300,
                ),
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
                opsLine("Good. That's enough. Move.", 1400, 1100),
                opsLine(
                  "First action: get us on a network. Open Network and link up.",
                  1450,
                  1300,
                ),
              ],
            },
          ],
        };
      }
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
  }

  if (event.type === "NETWORK_LINKED") {
    const nextState = withPhase(state, "camera_watch");

    return {
      nextState,
      effects: [
        {
          type: "handler_sequence",
          items: [
            opsLine(
              "Secure shell is live. Check camera 12 and wait for the guard to pass.",
              1500,
              1200,
            ),
            opsLine("Text when you're moving.", 1300, 1300),
          ],
        },
        {
          type: "set_reply_chips",
          chips: [
            { id: "move_now", label: "moving now", action: "moving_now" },
          ],
        },
        { type: "set_terminal_locked", on: true },
        { type: "start_camera_objective", targetId: 12 },
        { type: "start_camera_sim" },
        { type: "set_hallway_occupied", on: false },
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
            opsLine(
              "There. You heard that too. East entrance. Move.",
              1550,
              1300,
            ),
          ],
        },
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
            items: [opsLine("Negative. Guard still in the hall.", 1450, 1200)],
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

    const nextState = withPhase(state, "terminal_intro");

    return {
      nextState,
      effects: [
        {
          type: "handler_sequence",
          items: [opsLine("Good. Window is clear. Move.", 1400, 1400)],
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
          type: "handler_sequence",
          items: [opsLine("Secure shell is live. Open Terminal.", 1450, 1200)],
        },
        { type: "set_terminal_locked", on: false },
      ],
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
            "Mask comms before you exfil.",
            "Open Jammer. Set MASK ON.",
            "Then re-run: `cat intel.txt`.",
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
