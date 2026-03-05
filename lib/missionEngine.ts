export type Mode = "easy" | "strict";

export type MissionState = {
  missionId: "bootcamp_01";
  step: number; // 0..N
};

export type MissionResult = {
  ok: boolean;
  terminalOut: string[]; // ONLY enemy system output (Terminal app)
  handlerOut?: string[]; // ONLY handler instruction (BannerComms + Messages thread)
  nextState?: MissionState; // only set when advancing
};

// --- helpers ---
function norm(s: string) {
  return s.trim().replace(/\s+/g, " ");
}
function normLower(s: string) {
  return norm(s).toLowerCase();
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

function handlerForStep(step: number): string[] {
  // Keep it grounded, short, not “gamey”.
  switch (step) {
    case 0:
      return [
        "Booting you into a hostile shell.",
        "Confirm where you are. Type: `pwd`.",
      ];
    case 1:
      return ["List what's here. Type: `ls`."];
    case 2:
      return ["Go into the payload directory. Type: `cd payload`."];
    case 3:
      return ["Confirm what's inside. Type: `ls`."];
    case 4:
      return ["Read the intel file. Type: `cat intel.txt`."];
    case 5:
      return [
        "Exfil window is open. You have seconds.",
        "Start the transfer. Type: `./drop.sh`.",
      ];
    case 6:
      return ["Transfer initiated. Stay sharp. Stand by."];
    default:
      return ["Stand by."];
  }
}

/**
 * Called when a mission first becomes active / when you want the next handler prompt for current step.
 * IMPORTANT: This is handler-only text. Do NOT print this inside Terminal.
 */
export function missionIntro(state: MissionState): string[] {
  return handlerForStep(state.step);
}

export function runMissionCommand(
  input: string,
  mode: Mode,
  state: MissionState,
): MissionResult | null {
  // return null when the mission doesn't care about this command (let generic engine handle)
  const raw = norm(input);

  // Step 0: pwd
  if (state.step === 0) {
    if (matches(raw, "pwd", mode)) {
      const nextState = { ...state, step: 1 } as MissionState;
      return {
        ok: true,
        terminalOut: ["/home/agent/ops"],
        handlerOut: handlerForStep(nextState.step),
        nextState,
      };
    }
    return {
      ok: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: ["Negative. Confirm position with: `pwd`."],
    };
  }

  // Step 1: ls
  if (state.step === 1) {
    if (matches(raw, "ls", mode, ["ls -la", "ls -l", "ls -a"])) {
      const nextState = { ...state, step: 2 } as MissionState;
      return {
        ok: true,
        terminalOut: ["intel.txt", "access.log", "payload/"],
        handlerOut: handlerForStep(nextState.step),
        nextState,
      };
    }
    return {
      ok: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: ["Don't improvise. Type: `ls`."],
    };
  }

  // Step 2: cd payload
  if (state.step === 2) {
    if (matches(raw, "cd payload", mode, ["cd    payload", "CD payload"])) {
      const nextState = { ...state, step: 3 } as MissionState;
      return {
        ok: true,
        terminalOut: ["~/ops/payload"],
        handlerOut: handlerForStep(nextState.step),
        nextState,
      };
    }
    return {
      ok: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: ["We need the payload directory. Type: `cd payload`."],
    };
  }

  // Step 3: ls again
  if (state.step === 3) {
    if (matches(raw, "ls", mode, ["ls -la", "ls -l", "ls -a"])) {
      const nextState = { ...state, step: 4 } as MissionState;
      return {
        ok: true,
        terminalOut: ["intel.txt", "drop.sh", "README.md"],
        handlerOut: handlerForStep(nextState.step),
        nextState,
      };
    }
    return {
      ok: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: ["Confirm contents. Type: `ls`."],
    };
  }

  // Step 4: cat intel.txt
  if (state.step === 4) {
    if (matches(raw, "cat intel.txt", mode, ["cat ./intel.txt"])) {
      const nextState = { ...state, step: 5 } as MissionState;
      return {
        ok: true,
        terminalOut: [
          "INTEL: server=staging-7",
          "port=443",
          "user=agent",
          "NOTE: exfil window is short.",
        ],
        handlerOut: handlerForStep(nextState.step),
        nextState,
      };
    }
    return {
      ok: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: ["Read the intel. Type: `cat intel.txt`."],
    };
  }

  // Step 5: execute drop script (timed window step; timing enforcement stays in TerminalScreen)
  if (state.step === 5) {
    if (matches(raw, "./drop.sh", mode, ["bash drop.sh", "sh drop.sh"])) {
      const nextState = { ...state, step: 6 } as MissionState;
      return {
        ok: true,
        terminalOut: ["Running drop.sh...", "Transfer started."],
        handlerOut: handlerForStep(nextState.step),
        nextState,
      };
    }
    return {
      ok: false,
      terminalOut: enemyUnknown(raw),
      handlerOut: ["No. Run the drop script: `./drop.sh`."],
    };
  }

  return null;
}
