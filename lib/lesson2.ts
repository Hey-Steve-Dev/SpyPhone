import type {
  MissionEffect,
  MissionEvent,
  MissionEventResult,
  MissionState,
  ReplyChip,
} from "@/lib/missionEngine";

const DEFAULT_TERMINAL_CWD = "/home/jcarter";
const DEFAULT_TERMINAL_HOST = "local_jcarter";
const ADMIN_ASSISTANT_TERMINAL_CWD = "/home/mporter";
const ADMIN_ASSISTANT_TERMINAL_HOST = "admin_assistant_pc";

const LESSON_2_DEV_COMMAND = "root el 2";
const LESSON_2_VAULT_ERASE_COMMAND = "run log.erase --secure --depth 5";
const LESSON_2_EXFIL_COMMAND = "run exfil.push --enc aes --chunk 512";
const LESSON_2_ADMIN_ASSISTANT_DEVICE_ID = "admin_assistant_pc";

type Lesson2Phase =
  | "lesson_2_intro"
  | "lesson_2_vault_prompt"
  | "lesson_2_vault_help"
  | "lesson_2_vault_done"
  | "lesson_2_move_prompt"
  | "lesson_2_move_ready"
  | "lesson_2_post_move_confirm"
  | "lesson_2_harvest_prompt"
  | "lesson_2_harvest_help"
  | "lesson_2_harvest_done"
  | "lesson_2_review_prompt"
  | "lesson_2_office_missing"
  | "lesson_2_search_intro"
  | "lesson_2_search_help"
  | "lesson_2_search_active";

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
    case "lesson_2_move_prompt":
      return 4;
    case "lesson_2_move_ready":
      return 5;
    case "lesson_2_post_move_confirm":
      return 6;
    case "lesson_2_harvest_prompt":
      return 7;
    case "lesson_2_harvest_help":
      return 8;
    case "lesson_2_harvest_done":
      return 9;
    case "lesson_2_review_prompt":
      return 10;
    case "lesson_2_office_missing":
      return 11;
    case "lesson_2_search_intro":
      return 12;
    case "lesson_2_search_help":
      return 13;
    case "lesson_2_search_active":
      return 14;
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

function isLesson2Phase(phase: MissionState["phase"]): phase is Lesson2Phase {
  return (
    phase === "lesson_2_intro" ||
    phase === "lesson_2_vault_prompt" ||
    phase === "lesson_2_vault_help" ||
    phase === "lesson_2_vault_done" ||
    phase === "lesson_2_move_prompt" ||
    phase === "lesson_2_move_ready" ||
    phase === "lesson_2_post_move_confirm" ||
    phase === "lesson_2_harvest_prompt" ||
    phase === "lesson_2_harvest_help" ||
    phase === "lesson_2_harvest_done" ||
    phase === "lesson_2_review_prompt" ||
    phase === "lesson_2_office_missing" ||
    phase === "lesson_2_search_intro" ||
    phase === "lesson_2_search_help" ||
    phase === "lesson_2_search_active"
  );
}

function vaultReplyChips(): ReplyChip[] {
  return [
    { id: "lesson2_done", label: "Ok done", action: "lesson2_done" },
    { id: "lesson2_help", label: "I need help", action: "lesson2_help" },
  ];
}

function moveReplyChips(): ReplyChip[] {
  return [{ id: "lesson2_moving", label: "Moving", action: "lesson2_moving" }];
}

function postMoveReplyChips(): ReplyChip[] {
  return [
    {
      id: "lesson2_post_move_in",
      label: "I'm in",
      action: "lesson2_post_move_in",
    },
  ];
}

function harvestReplyChips(): ReplyChip[] {
  return [
    {
      id: "lesson2_harvest_done",
      label: "Ok done",
      action: "lesson2_harvest_done",
    },
    {
      id: "lesson2_harvest_help",
      label: "I need help",
      action: "lesson2_harvest_help",
    },
  ];
}

function missingOfficeReplyChips(): ReplyChip[] {
  return [
    {
      id: "lesson2_office_missing",
      label: "No office number listed",
      action: "lesson2_office_missing",
    },
  ];
}

function searchReplyChips(): ReplyChip[] {
  return [
    {
      id: "lesson2_search_help",
      label: "I need help",
      action: "lesson2_search_help",
    },
  ];
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
    lesson2ExfilComplete: false,
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

    { type: "set_terminal_locked", on: false },

    {
      type: "append_terminal_output",
      lines: [
        "DEV: lesson 2 checkpoint loaded.",
        `DEV: host=${DEFAULT_TERMINAL_HOST}`,
        `DEV: cwd=${DEFAULT_TERMINAL_CWD}`,
        "DEV: tracePercent=0",
        "DEV: camera12Checked=false",
        "DEV: lesson2ExfilComplete=false",
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
      chips: vaultReplyChips(),
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
        "Take the code shown there and type run in front of it.",
        "The full terminal command is `run log.erase --secure --depth 5`.",
      ];

    case "lesson_2_vault_done":
      return ["Stand by."];

    case "lesson_2_move_prompt":
    case "lesson_2_move_ready":
      return [
        "Ok, we need to make a move out the door to your left 4 doors down.",
        "Check camera 12 again before you move.",
      ];

    case "lesson_2_post_move_confirm":
      return ["Signal when you're in."];

    case "lesson_2_harvest_prompt":
      return [
        "Copy. This is an admin assistant machine.",
        "They should have access to personnel files and that is what we need to pull.",
        "This should be easy. Tunnel in and gain access.",
        "When you're in, exfil the data using the Vault tool.",
        "Let me know when you have extracted it.",
      ];

    case "lesson_2_harvest_help":
      return [
        "Open Vault and look for the Exfil tool.",
        "Use the command exactly as shown in Vault.",
        "On this system the command is `run exfil.push --enc aes --chunk 512`.",
      ];

    case "lesson_2_harvest_done":
      return [
        "Good. Open the extracted material and see what is in there.",
        "You are looking for personnel data on the target.",
      ];

    case "lesson_2_review_prompt":
      return [
        "Take a look. We are trying to find the target's office.",
        "The extracted personnel file should be somewhere in the harvested data.",
      ];

    case "lesson_2_office_missing":
      return ["If the office number is missing, report it."];

    case "lesson_2_search_intro":
      return [
        "Let's take a look through this machine and see if we can find a clue to where it is.",
        "You do not need to open every file by hand.",
        "Use `cd ..` to move up a folder.",
        "Use `ls` to see what is in a folder.",
        "Use `cat` to read text files and docs in this sim.",
        "And now use `grep` to search realistically.",
        "If you know the file, use something like `grep office info.doc`.",
        "If you need to search through everything from where you are, use `grep -r office .`.",
      ];

    case "lesson_2_search_help":
      return [
        "Real version this time.",
        "If you know the file, type something like `grep office info.doc`.",
        "If you need to search the whole tree from your current folder, type `grep -r office .`.",
        "You can also search by a name, department, title, assistant, relocation, or anything else that might leave a clue.",
      ];

    case "lesson_2_search_active":
      return [
        "We need to figure out where his office is.",
        "Find it or we are cooked.",
      ];

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
            chips: vaultReplyChips(),
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
            chips: moveReplyChips(),
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
            chips: postMoveReplyChips(),
          },
        ],
      };
    }

    if (
      state.phase === "lesson_2_post_move_confirm" &&
      event.action === "lesson2_post_move_in"
    ) {
      const nextState = withLesson2Phase(
        {
          ...state,
          lesson2ExfilComplete: false,
        },
        "lesson_2_harvest_prompt",
      );

      return {
        nextState,
        effects: [
          { type: "clear_reply_chips" },
          {
            type: "set_tunnel_targets",
            deviceIds: [LESSON_2_ADMIN_ASSISTANT_DEVICE_ID],
          },
          ...(event.label
            ? [{ type: "player_message", text: event.label } as MissionEffect]
            : []),
          {
            type: "handler_sequence",
            items: [
              opsLine(
                "Copy. This is an admin assistant machine, but they should have access to personnel files and that is what we need to pull.",
                1450,
                1000,
              ),
              opsLine(
                "This should be easy, just tunnel in and gain access.",
                1400,
                950,
              ),
              opsLine(
                "When you're in, push the data out. Use exfiltration from the Vault.",
                1450,
                1000,
              ),
              opsLine("Let me know when you have extracted it.", 1300, 900),
            ],
          },
          {
            type: "set_reply_chips",
            chips: harvestReplyChips(),
          },
          { type: "reset_terminal" },
          { type: "set_terminal_host", hostId: DEFAULT_TERMINAL_HOST },
          { type: "set_terminal_cwd", cwd: DEFAULT_TERMINAL_CWD },
          { type: "set_terminal_locked", on: false },
          {
            type: "set_reply_chips",
            chips: harvestReplyChips(),
          },
          { type: "set_terminal_locked", on: false },
        ],
      };
    }

    if (
      (state.phase === "lesson_2_harvest_prompt" ||
        state.phase === "lesson_2_harvest_help" ||
        state.phase === "lesson_2_harvest_done") &&
      event.action === "lesson2_harvest_help"
    ) {
      const nextState = withLesson2Phase(state, "lesson_2_harvest_help");

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
              opsLine("Open Vault and look for the Exfil tool.", 1200, 700),
              opsLine("Use the command exactly as shown in Vault.", 1250, 800),
              opsLine(
                "On this system the command is `run exfil.push --enc aes --chunk 512`.",
                1250,
                800,
              ),
            ],
          },
          {
            type: "set_reply_chips",
            chips: harvestReplyChips(),
          },
        ],
      };
    }

    if (
      (state.phase === "lesson_2_harvest_prompt" ||
        state.phase === "lesson_2_harvest_help" ||
        state.phase === "lesson_2_harvest_done") &&
      event.action === "lesson2_harvest_done"
    ) {
      if (!state.lesson2ExfilComplete) {
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
                  "Negative. You have not exfiltrated the data yet.",
                  1350,
                  900,
                ),
                opsLine(
                  "Tunnel into the admin assistant machine first.",
                  1300,
                  850,
                ),
                opsLine(
                  "Then run `exfil.push --enc aes --chunk 512`.",
                  1350,
                  900,
                ),
              ],
            },
            {
              type: "set_reply_chips",
              chips: harvestReplyChips(),
            },
          ],
        };
      }

      const nextState = withLesson2Phase(state, "lesson_2_review_prompt");

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
                "Take a look. We are trying to find the target's office.",
                1400,
                900,
              ),
              opsLine(
                "The extracted personnel file should be in that harvested data somewhere.",
                1450,
                950,
              ),
              opsLine(
                "It will not be right up front. You are going to have to dig a little.",
                1400,
                900,
              ),
            ],
          },
          {
            type: "set_reply_chips",
            chips: missingOfficeReplyChips(),
          },
        ],
      };
    }

    if (
      (state.phase === "lesson_2_review_prompt" ||
        state.phase === "lesson_2_office_missing") &&
      event.action === "lesson2_office_missing"
    ) {
      const nextState = withLesson2Phase(state, "lesson_2_search_intro");

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
                "Let's take a look through this machine and see if we can find a clue to where it is.",
                1450,
                1000,
              ),
              opsLine(
                "Use `cd ..` to move up a folder, `ls` to see what is there, and `cat` to read files.",
                1450,
                950,
              ),
              opsLine(
                "Now we use real search. If you know the file, type something like `grep office info.doc`.",
                1500,
                1000,
              ),
              opsLine(
                "If you need to search the whole tree from your current folder, use `grep -r office .`.",
                1500,
                1000,
              ),
              opsLine(
                "We need to figure out where his office is. Find it or we are cooked.",
                1450,
                900,
              ),
            ],
          },
          {
            type: "set_reply_chips",
            chips: searchReplyChips(),
          },
        ],
      };
    }

    if (
      (state.phase === "lesson_2_search_intro" ||
        state.phase === "lesson_2_search_help" ||
        state.phase === "lesson_2_search_active") &&
      event.action === "lesson2_search_help"
    ) {
      const nextState = withLesson2Phase(state, "lesson_2_search_help");

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
                "Real version here. `grep office info.doc` searches one file named info.doc for the word office.",
                1500,
                1000,
              ),
              opsLine(
                "If you want to search recursively through folders from where you are, type `grep -r office .`.",
                1500,
                1000,
              ),
              opsLine(
                "Try searching for office, the target name, department, assistant, relocation, or anything else that might leave a clue.",
                1550,
                1000,
              ),
            ],
          },
          {
            type: "set_reply_chips",
            chips: searchReplyChips(),
          },
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

  if (event.type === "TUNNEL_LINKED") {
    if (
      state.phase === "lesson_2_harvest_prompt" &&
      event.deviceId === LESSON_2_ADMIN_ASSISTANT_DEVICE_ID
    ) {
      return {
        nextState: state,
        effects: [
          { type: "set_terminal_host", hostId: ADMIN_ASSISTANT_TERMINAL_HOST },
          { type: "set_terminal_cwd", cwd: ADMIN_ASSISTANT_TERMINAL_CWD },
          { type: "set_terminal_locked", on: false },
          {
            type: "append_terminal_output",
            lines: [
              `Connected to ${ADMIN_ASSISTANT_TERMINAL_HOST}`,
              ADMIN_ASSISTANT_TERMINAL_CWD,
            ],
          },
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

    if (
      state.phase === "lesson_2_harvest_prompt" ||
      state.phase === "lesson_2_harvest_help" ||
      state.phase === "lesson_2_harvest_done"
    ) {
      if (raw === LESSON_2_EXFIL_COMMAND) {
        const nextState = withLesson2Phase(
          {
            ...state,
            lesson2ExfilComplete: true,
          },
          "lesson_2_harvest_done",
        );

        return {
          nextState,
          effects: [
            {
              type: "append_terminal_output",
              lines: [
                "Vault utility started.",
                "Initializing encrypted exfiltration...",
                "Packaging personnel-access artifacts...",
                "Streaming chunks...",
                "Encryption: AES active",
                "Exfil complete.",
                "Remote package ID: PX-4421-AES",
                "Saved: /home/mporter/harvest/personnel/intake/archive/executive/personnel_profile.doc",
              ],
            },
            {
              type: "set_reply_chips",
              chips: harvestReplyChips(),
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
