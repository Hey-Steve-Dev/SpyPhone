export type Mode = "easy" | "strict";

export type MissionState = {
  missionId: "bootcamp_01";
  step: number; // 0..N
};

export type MissionResult = {
  ok: boolean;
  output: string[];
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

// --- mission definition ---
// Bootcamp 01: basic navigation in a “Git Bash” vibe
export function missionIntro(state: MissionState): string[] {
  if (state.step === 0) {
    return [
      "MISSION: BOOTCAMP-01",
      "Objective: verify position.",
      "Task: run `pwd`.",
    ];
  }
  if (state.step === 1) {
    return ["Good.", "Task: list files. Run `ls`."];
  }
  if (state.step === 2) {
    return ["Task: enter payload directory. Run `cd payload`."];
  }
  if (state.step === 3) {
    return ["Task: confirm contents. Run `ls`."];
  }
  if (state.step === 4) {
    return ["Task: read intel. Run `cat intel.txt`."];
  }
  return ["Objective complete. Stand by."];
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
      return {
        ok: true,
        output: ["/home/agent/ops", ...missionIntro({ ...state, step: 1 })],
        nextState: { ...state, step: 1 },
      };
    }
    return {
      ok: false,
      output: ["Expected: pwd", "Tip: prints your current directory."],
    };
  }

  // Step 1: ls (easy allows ls -la, ls -l, etc.)
  if (state.step === 1) {
    if (matches(raw, "ls", mode, ["ls -la", "ls -l", "ls -a"])) {
      return {
        ok: true,
        output: [
          "intel.txt",
          "access.log",
          "payload/",
          ...missionIntro({ ...state, step: 2 }),
        ],
        nextState: { ...state, step: 2 },
      };
    }
    return { ok: false, output: ["Expected: ls"] };
  }

  // Step 2: cd payload (easy allows extra spaces/case)
  if (state.step === 2) {
    if (matches(raw, "cd payload", mode, ["cd    payload", "CD payload"])) {
      return {
        ok: true,
        output: ["~/ops/payload", ...missionIntro({ ...state, step: 3 })],
        nextState: { ...state, step: 3 },
      };
    }
    return { ok: false, output: ["Expected: cd payload"] };
  }

  // Step 3: ls again (same tolerance as step 1)
  if (state.step === 3) {
    if (matches(raw, "ls", mode, ["ls -la", "ls -l", "ls -a"])) {
      return {
        ok: true,
        output: [
          "intel.txt",
          "drop.sh",
          "README.md",
          ...missionIntro({ ...state, step: 4 }),
        ],
        nextState: { ...state, step: 4 },
      };
    }
    return { ok: false, output: ["Expected: ls"] };
  }

  // Step 4: cat intel.txt (easy allows `cat ./intel.txt`)
  if (state.step === 4) {
    if (matches(raw, "cat intel.txt", mode, ["cat ./intel.txt"])) {
      return {
        ok: true,
        output: [
          "INTEL: server=staging-7",
          "port=443",
          "user=agent",
          "NOTE: exfil window is short.",
          ...missionIntro({ ...state, step: 5 }),
        ],
        nextState: { ...state, step: 5 },
      };
    }
    return { ok: false, output: ["Expected: cat intel.txt"] };
  }

  return null;
}
