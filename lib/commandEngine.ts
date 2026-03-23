export type CommandMode = "easy" | "strict";

export type FsFileNode = {
  type: "file";
  content: string[];
};

export type FsDirNode = {
  type: "dir";
  children: Record<string, FsNode>;
};

export type FsNode = FsFileNode | FsDirNode;

export type TerminalHost = {
  id: string;
  name: string;
  user: string;
  home: string;
  fs: FsDirNode;
};

export type TerminalSession = {
  hostId: string;
  cwd: string;
};

export type CommandResult = {
  ok: boolean;
  output: string[];
  nextSession: TerminalSession;
  command: string;
  targetPath?: string;
  readFilePath?: string;
};

let currentMode: CommandMode = "easy";

export function setMode(mode: CommandMode) {
  currentMode = mode;
}

function dir(children: Record<string, FsNode>): FsDirNode {
  return { type: "dir", children };
}

function file(...content: string[]): FsFileNode {
  return { type: "file", content };
}

function normalizeWhitespace(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function normalizeCommand(input: string) {
  return normalizeWhitespace(input).toLowerCase();
}

function splitPath(path: string) {
  return path.split("/").filter(Boolean);
}

function joinPath(parts: string[]) {
  return `/${parts.join("/")}`;
}

function resolvePath(cwd: string, rawTarget: string, home: string) {
  const target = rawTarget.trim();

  if (!target || target === "~") {
    return home;
  }

  let parts: string[];

  if (target.startsWith("/")) {
    parts = splitPath(target);
  } else if (target.startsWith("~/")) {
    parts = [...splitPath(home), ...splitPath(target.slice(2))];
  } else {
    parts = [...splitPath(cwd), ...splitPath(target)];
  }

  const resolved: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") continue;

    if (part === "..") {
      if (resolved.length > 0) resolved.pop();
      continue;
    }

    resolved.push(part);
  }

  return joinPath(resolved);
}

function getNodeAtPath(root: FsDirNode, absPath: string): FsNode | null {
  const parts = splitPath(absPath);

  let current: FsNode = root;

  for (const part of parts) {
    if (current.type !== "dir") return null;

    const next: FsNode | undefined = current.children[part];
    if (!next) return null;

    current = next;
  }

  return current;
}

function listDir(node: FsNode): string[] {
  if (node.type !== "dir") return [];

  return Object.keys(node.children)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const child = node.children[name];
      return child.type === "dir" ? `${name}` : name;
    });
}

function parseInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return { raw: "", command: "", args: [] as string[] };
  }

  const parts = trimmed.split(/\s+/);
  return {
    raw: trimmed,
    command: parts[0].toLowerCase(),
    args: parts.slice(1),
  };
}

export const TERMINAL_HOSTS: Record<string, TerminalHost> = {
  local_jcarter: {
    id: "local_jcarter",
    name: "JCarter Workstation",
    user: "jcarter",
    home: "/home/jcarter",
    fs: dir({
      home: dir({
        jcarter: dir({
          Desktop: dir({
            "todo.txt": file(
              "Desktop reminder",
              "",
              "Ask maintenance about the noisy elevator.",
            ),
          }),
          Documents: dir({
            "shift_report.txt": file(
              "Shift Report",
              "",
              "Nothing unusual on lower floors.",
              "Elevator service window scheduled Monday 04:00.",
            ),
            "building_notes.txt": file(
              "Building Notes",
              "",
              "Freight elevator has been inconsistent this week.",
              "Maintenance says weekly override codes are rotating normally.",
            ),
          }),
          Downloads: dir({
            "camera-driver.bin": file(
              "Binary file — unreadable in this shell.",
            ),
          }),
          Pictures: dir({
            "lobby_reference.txt": file(
              "Image Index",
              "",
              "Lobby north camera still needs recalibration.",
            ),
          }),
          saved_notes: dir({
            "useful_info.txt": file(
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
            ),
            network: dir({
              maintenance: dir({
                info: dir({
                  elevators: dir({
                    weekly_passcodes: dir({
                      "2026_week_09": dir({
                        "elevator_override.txt": file(
                          "Elevator Maintenance Override",
                          "Week 09",
                          "",
                          "Override Code: 1924",
                        ),
                      }),
                      "2026_week_10": dir({
                        "elevator_override.txt": file(
                          "Elevator Maintenance Override",
                          "Week 10",
                          "",
                          "Override Code: 6401",
                        ),
                      }),
                      current_week: dir({
                        "elevator_override.txt": file(
                          "Elevator Maintenance Override",
                          "Week 11",
                          "",
                          "Override Code: 4839",
                          "",
                          "Note:",
                          "Code resets automatically every Monday at 04:00.",
                        ),
                        "rotation_schedule.txt": file(
                          "Rotation Schedule",
                          "",
                          "Week 09 -> 1924",
                          "Week 10 -> 6401",
                          "Week 11 -> 4839",
                        ),
                        "service_notes.txt": file(
                          "Service Notes",
                          "",
                          "Do not share override codes outside maintenance.",
                        ),
                      }),
                      archive: dir({
                        "old_codes.txt": file(
                          "Archive",
                          "",
                          "Older codes retained for audit only.",
                        ),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    }),
  },

  admin_assistant_pc: {
    id: "admin_assistant_pc",
    name: "Admin Assistant Workstation",
    user: "mporter",
    home: "/home/mporter",
    fs: dir({
      home: dir({
        mporter: dir({
          Desktop: dir({
            "welcome.txt": file(
              "Admin workstation",
              "",
              "Temporary desktop items.",
            ),
            "calendar_shortcuts.txt": file(
              "Quick Links",
              "",
              "Executive calendar mirror",
              "Travel coordination board",
              "Office move checklist",
            ),
          }),

          Documents: dir({
            hr_exports: dir({
              intake: dir({
                archive: dir({
                  executive: dir({
                    "personnel_profile.doc": file(
                      "EMPLOYEE RECORD — INTERNAL USE ONLY",
                      "",
                      "Employee ID: 09-44271-HK",
                      "Name: Harker, Elias V.",
                      "Department: Advanced Systems & Data Engineering",
                      "Job Title: Senior Research Scientist",
                      "Employment Status: Full-Time (Exempt)",
                      "Hire Date: 03/14/[REDACTED]",
                      "Work Location: Facility 3B — Lab Wing C",
                      "Manager: [REDACTED]",
                      "Pay Grade: L7 — Senior Specialist Tier",
                      "",
                      "POSITION SUMMARY",
                      "Employee is responsible for internal software development related to data processing and optimization.",
                      "Specific project details are restricted.",
                      "",
                      "CURRENT ASSIGNMENT",
                      "Project Reference: HC-Prime",
                      "Classification: Restricted Internal Development",
                      "Role: Lead Developer / Systems Architect",
                      "Note: Project scope appears to extend beyond initial documentation.",
                      "",
                      "PERFORMANCE SUMMARY",
                      "Strengths:",
                      "- Advanced technical proficiency",
                      "- Independent execution",
                      "- Consistent output delivery",
                      "",
                      "Areas for Improvement:",
                      "- Documentation below standard",
                      "- Limited team collaboration",
                      "- Delayed administrative responses",
                      "",
                      "ATTENDANCE & WORK PATTERNS",
                      "- Frequent after-hours activity",
                      "- Extended work sessions",
                      "- Occasional missed check-ins",
                      "",
                      "SYSTEM USAGE SUMMARY",
                      "System Utilization: Above Average",
                      "Data Output Volume: Elevated",
                      "Archival Activity: Minimal",
                      "Remote Sync Activity: Inconsistent",
                      "Note: Project progress exceeds expected reporting visibility.",
                      "",
                      "COMPLIANCE & TRAINING",
                      "Secure Storage Protocols — Completed",
                      "Data Handling Compliance — Past Due",
                      "Internal Documentation Standards — Incomplete",
                      "",
                      "ACCESS & EQUIPMENT",
                      "Access Level: Tier 3",
                      "Lab Access: 24/7",
                      "Primary Workstation: WS-3B-771",
                      "Asset Tag: ASET-99821",
                      "Environment: Isolated Development",
                      "",
                      "EMPLOYMENT HISTORY",
                      "Prior Assignment: [REDACTED]",
                      "Transfer Type: Internal Reallocation",
                      "",
                      "EMERGENCY CONTACT",
                      "Status: Not Provided",
                      "",
                      "DISCIPLINARY RECORD",
                      "No formal actions on record",
                      "",
                      "RETENTION INDICATOR",
                      "Risk Level: Moderate",
                      "Note: Increasing independence from team processes",
                      "",
                      "HR COMMENTS",
                      "Employee remains a high-value contributor.",
                      "Improved alignment with data handling and reporting standards is recommended.",
                      "",
                      "EMPLOYEE ACKNOWLEDGMENT",
                      "Signature: Not On File",
                      "Last Acknowledgment: [REDACTED]",
                      "",
                      "Last System Login: WS-3B-771",
                    ),
                  }),
                }),
              }),
            }),

            admin: dir({
              "handoff_notes.txt": file(
                "Handoff Notes",
                "",
                "Executive office assignments were updated recently.",
                "Some records were left incomplete during migration.",
              ),
              "visitor_schedule.doc": file(
                "Visitor Schedule",
                "",
                "Placeholder visitor entries.",
                "Nothing directly useful yet.",
              ),
            }),

            personnel: dir({
              archived: dir({
                "assistant_roster.doc": file(
                  "Assistant Roster",
                  "",
                  "Names omitted in exported copy.",
                  "Cross-reference with relocation materials if needed.",
                ),
              }),
            }),
          }),

          Downloads: dir({
            packets: dir({
              "relocation_memo.doc": file(
                "Relocation Memo",
                "",
                "Placeholder clue file.",
                "Office data moved during records transition.",
              ),
              "temp_extract.txt": file(
                "Temporary extract",
                "",
                "Pending sort into archive folders.",
              ),
            }),
          }),

          harvest: dir({
            personnel: dir({
              intake: dir({
                archive: dir({
                  executive: dir({
                    "personnel_profile.doc": file(
                      "EMPLOYEE RECORD — INTERNAL USE ONLY",
                      "",
                      "Employee ID: 09-44271-HK",
                      "Name: Harker, Elias V.",
                      "Department: Advanced Systems & Data Engineering",
                      "Job Title: Senior Research Scientist",
                      "Employment Status: Full-Time (Exempt)",
                      "Hire Date: 03/14/[REDACTED]",
                      "Work Location: Facility 3B — Lab Wing C",
                      "Manager: [REDACTED]",
                      "Pay Grade: L7 — Senior Specialist Tier",
                      "",
                      "POSITION SUMMARY",
                      "Employee is responsible for internal software development related to data processing and optimization.",
                      "Specific project details are restricted.",
                      "",
                      "CURRENT ASSIGNMENT",
                      "Project Reference: HC-Prime",
                      "Classification: Restricted Internal Development",
                      "Role: Lead Developer / Systems Architect",
                      "Note: Project scope appears to extend beyond initial documentation.",
                      "",
                      "PERFORMANCE SUMMARY",
                      "Strengths:",
                      "- Advanced technical proficiency",
                      "- Independent execution",
                      "- Consistent output delivery",
                      "",
                      "Areas for Improvement:",
                      "- Documentation below standard",
                      "- Limited team collaboration",
                      "- Delayed administrative responses",
                      "",
                      "ATTENDANCE & WORK PATTERNS",
                      "- Frequent after-hours activity",
                      "- Extended work sessions",
                      "- Occasional missed check-ins",
                      "",
                      "SYSTEM USAGE SUMMARY",
                      "System Utilization: Above Average",
                      "Data Output Volume: Elevated",
                      "Archival Activity: Minimal",
                      "Remote Sync Activity: Inconsistent",
                      "Note: Project progress exceeds expected reporting visibility.",
                      "",
                      "COMPLIANCE & TRAINING",
                      "Secure Storage Protocols — Completed",
                      "Data Handling Compliance — Past Due",
                      "Internal Documentation Standards — Incomplete",
                      "",
                      "ACCESS & EQUIPMENT",
                      "Access Level: Tier 3",
                      "Lab Access: 24/7",
                      "Primary Workstation: WS-3B-771",
                      "Asset Tag: ASET-99821",
                      "Environment: Isolated Development",
                      "",
                      "EMPLOYMENT HISTORY",
                      "Prior Assignment: [REDACTED]",
                      "Transfer Type: Internal Reallocation",
                      "",
                      "EMERGENCY CONTACT",
                      "Status: Not Provided",
                      "",
                      "DISCIPLINARY RECORD",
                      "No formal actions on record",
                      "",
                      "RETENTION INDICATOR",
                      "Risk Level: Moderate",
                      "Note: Increasing independence from team processes",
                      "",
                      "HR COMMENTS",
                      "Employee remains a high-value contributor.",
                      "Improved alignment with data handling and reporting standards is recommended.",
                      "",
                      "EMPLOYEE ACKNOWLEDGMENT",
                      "Signature: Not On File",
                      "Last Acknowledgment: [REDACTED]",
                      "",
                      "Last System Login: WS-3B-771",
                    ),
                    "assistant_summary.txt": file(
                      "Assistant Summary",
                      "",
                      "Personnel packet assembled from HR and executive support records.",
                    ),
                    "contacts.doc": file(
                      "Executive Contacts",
                      "",
                      "Assistant-facing export copy.",
                      "Several location fields omitted from this view.",
                    ),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    }),
  },

  phone_shell: {
    id: "phone_shell",
    name: "Agent Phone",
    user: "agent",
    home: "/home/agent/phone",
    fs: dir({
      home: dir({
        agent: dir({
          phone: dir({
            "mission_brief.txt": file(
              "MISSION BRIEF",
              "",
              "We need to complete this misson and leave no trail behind",
              "",
              "OBJECTIVES:",
              "- Gain access to internal systems",
              "- Avoid detection",
              "- Follow OPS instructions",
              "",
              "Your phone will auto delete if caught",
            ),

            apps: dir({
              "messages.app": file("Launch Messages"),
              "network.app": file("Launch Network"),
              "cameras.app": file("Launch Cameras"),
              "scanner.app": file("Launch Scanner"),
            }),
            "notes.txt": file(
              "Local device notes",
              "",
              "Use the apps folder to access phone tools.",
              "Use tunnel to connect to remote machines.",
            ),
            "readme.txt": file(
              "Secure phone shell",
              "",
              "This terminal controls your field device.",
              "Remote systems appear after tunnel access.",
            ),
          }),
        }),
      }),
    }),
  },

  remote_ops_box: {
    id: "remote_ops_box",
    name: "Ops Relay",
    user: "agent",
    home: "/home/agent/ops",
    fs: dir({
      home: dir({
        agent: dir({
          ops: dir({
            "intel.txt": file(
              "Ops Intel",
              "",
              "Primary objective: acquire elevator override.",
            ),
            "access.log": file(
              "Access Log",
              "",
              "Recent connections:",
              "- relay-auth ok",
              "- tunnel ok",
            ),
            payload: dir({
              "readme.txt": file(
                "Payload staging area.",
                "Use only when directed.",
              ),
            }),
          }),
        }),
      }),
    }),
  },
};

export function createTerminalSession(hostId: string): TerminalSession {
  const host = TERMINAL_HOSTS[hostId];
  if (!host) {
    throw new Error(`Unknown terminal host: ${hostId}`);
  }

  return {
    hostId,
    cwd: host.home,
  };
}

export function getTerminalHost(hostId: string): TerminalHost | null {
  return TERMINAL_HOSTS[hostId] ?? null;
}

export function runCommandEngine(
  input: string,
  session: TerminalSession,
): CommandResult {
  const parsed = parseInput(input);
  const raw = parsed.raw;
  const command = parsed.command;
  const args = parsed.args;

  if (!raw) {
    return {
      ok: true,
      output: [],
      nextSession: session,
      command,
    };
  }

  const host = TERMINAL_HOSTS[session.hostId];
  if (!host) {
    return {
      ok: false,
      output: [`host not found: ${session.hostId}`],
      nextSession: session,
      command,
    };
  }

  const failStrictSyntax = (expected: string) => ({
    ok: false,
    output: [`Syntax error. Exact command required: ${expected}`],
    nextSession: session,
    command,
  });

  if (command === "help") {
    return {
      ok: true,
      output: [
        "Available commands:",
        "help",
        "pwd",
        "ls",
        "cd <dir>",
        "cd ..",
        "cat <file>",
        "clear",
      ],
      nextSession: session,
      command,
    };
  }

  if (command === "pwd") {
    if (currentMode === "strict" && normalizeWhitespace(raw) !== "pwd") {
      return failStrictSyntax("pwd");
    }

    return {
      ok: true,
      output: [session.cwd],
      nextSession: session,
      command,
      targetPath: session.cwd,
    };
  }

  if (command === "ls") {
    if (currentMode === "strict" && normalizeWhitespace(raw) !== "ls") {
      return failStrictSyntax("ls");
    }

    const node = getNodeAtPath(host.fs, session.cwd);

    if (!node || node.type !== "dir") {
      return {
        ok: false,
        output: [`ls: cannot access '${session.cwd}': No such directory`],
        nextSession: session,
        command,
      };
    }

    return {
      ok: true,
      output: listDir(node),
      nextSession: session,
      command,
      targetPath: session.cwd,
    };
  }

  if (command === "cd") {
    if (args.length === 0) {
      const nextSession = {
        ...session,
        cwd: host.home,
      };

      return {
        ok: true,
        output: [],
        nextSession,
        command,
        targetPath: nextSession.cwd,
      };
    }

    const rawTarget = args.join(" ");
    const nextPath = resolvePath(session.cwd, rawTarget, host.home);
    const node = getNodeAtPath(host.fs, nextPath);

    if (!node || node.type !== "dir") {
      return {
        ok: false,
        output: [`cd: no such file or directory: ${rawTarget}`],
        nextSession: session,
        command,
      };
    }

    return {
      ok: true,
      output: [],
      nextSession: {
        ...session,
        cwd: nextPath,
      },
      command,
      targetPath: nextPath,
    };
  }

  if (command === "cat") {
    if (args.length === 0) {
      return {
        ok: false,
        output: ["cat: missing file operand"],
        nextSession: session,
        command,
      };
    }

    const rawTarget = args.join(" ");
    const nextPath = resolvePath(session.cwd, rawTarget, host.home);
    const node = getNodeAtPath(host.fs, nextPath);

    if (!node) {
      return {
        ok: false,
        output: [`cat: ${rawTarget}: No such file or directory`],
        nextSession: session,
        command,
      };
    }

    if (node.type !== "file") {
      return {
        ok: false,
        output: [`cat: ${rawTarget}: Is a directory`],
        nextSession: session,
        command,
      };
    }

    return {
      ok: true,
      output: node.content,
      nextSession: session,
      command,
      readFilePath: nextPath,
    };
  }

  if (command === "clear") {
    return {
      ok: true,
      output: [],
      nextSession: session,
      command,
    };
  }

  if (currentMode === "strict") {
    return {
      ok: false,
      output: [`Syntax error. Unsupported command: ${raw}`],
      nextSession: session,
      command,
    };
  }

  return {
    ok: false,
    output: [`command not found: ${raw}`],
    nextSession: session,
    command,
  };
}
