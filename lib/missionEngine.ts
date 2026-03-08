export type Mode = "easy" | "strict";

export type MissionPhase =
  | "boot_intro"
  | "phone_review"
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
      return ["You’re online. Quick review of your ghost phone?"];
    case "phone_review":
      return ["Your call. Review fast or skip it."];
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
    const nextState = withPhase(state, "boot_intro");

    return {
      nextState,
      effects: [
        { type: "set_terminal_locked", on: true },
        { type: "clear_thread" },
        { type: "reset_terminal" },
        {
          type: "handler_sequence",
          items: [
            opsLine(
              "You’re online. Quick review of your ghost phone?",
              1500,
              1100,
            ),
          ],
        },
        {
          type: "set_reply_chips",
          chips: [
            { id: "boot_review_yes", label: "Sure", action: "review_phone" },
            {
              id: "boot_review_no",
              label: "Nah, I'm ready",
              action: "skip_review",
            },
          ],
        },
      ],
    };
  }

  if (event.type === "REPLY_SELECTED") {
    if (state.phase === "boot_intro" || state.phase === "phone_review") {
      if (event.action === "review_phone") {
        const nextState = withPhase(state, "phone_review");

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
                  "Ghost phone review: messages are local-first, terminal is for controlled actions, jammer buys time, network helps you pivot fast.",
                  1700,
                  1200,
                ),
                opsLine(
                  "You only get short burst comms. Read fast, act local, keep moving.",
                  1500,
                  1300,
                ),
              ],
            },
            {
              type: "set_reply_chips",
              chips: [
                { id: "review_ack", label: "Got it", action: "review_ack" },
              ],
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
                  "Good. Stay dark and follow instructions exactly. We only get short burst windows.",
                  1600,
                  1200,
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

      if (event.action === "review_ack") {
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
                  "Good. First action: get us on a network. Open Network and link up.",
                  1450,
                  1200,
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
