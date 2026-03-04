export type CommandResult = {
  ok: boolean;
  output: string[];
};

type Mode = "easy" | "strict";

let currentMode: Mode = "easy";

export function setMode(mode: Mode) {
  currentMode = mode;
}

function normalize(input: string) {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

export function runCommandEngine(input: string): CommandResult {
  const raw = input.trim();
  if (!raw) {
    return { ok: true, output: [] };
  }

  const cmd = normalize(raw);

  // HELP
  if (cmd === "help") {
    return {
      ok: true,
      output: ["Available commands:", "help", "ls", "pwd", "clear"],
    };
  }

  // PWD
  if (cmd === "pwd") {
    return {
      ok: true,
      output: ["/home/agent/ops"],
    };
  }

  // LS (flexible on easy mode)
  if (cmd === "ls" || (currentMode === "easy" && cmd.startsWith("ls "))) {
    return {
      ok: true,
      output: ["intel.txt", "access.log", "payload/"],
    };
  }

  // STRICT example
  if (currentMode === "strict" && raw !== "ls") {
    return {
      ok: false,
      output: ["Syntax error. Exact command required."],
    };
  }

  return {
    ok: false,
    output: [`command not found: ${raw}`],
  };
}
