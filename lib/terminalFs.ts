import type {
  MissionEffect,
  MissionState,
  Mode,
  TerminalCommandResult,
} from "@/lib/missionEngine";

const DEFAULT_TERMINAL_CWD = "/home/jcarter";

type FsDirectoryMap = Record<string, string[]>;
type FsFileMap = Record<string, string[] | null>;

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

const DIRECTORY_INDEX: FsDirectoryMap = {
  "/home/jcarter": [
    "Desktop",
    "Documents",
    "Downloads",
    "Pictures",
    "Music",
    "Videos",
    "Projects",
    "saved_notes",
  ],

  "/home/jcarter/Desktop": [
    "todo.txt",
    "meeting_notes.txt",
    "vpn_config.ovpn",
    "building_map.txt",
    "reminders.txt",
    "temp_codes.txt",
    "launcher.exe",
    "inventory.exe",
    "viewer.exe",
  ],

  "/home/jcarter/Documents": [
    "resume.docx",
    "budget.xlsx",
    "notes.txt",
    "onboarding_checklist.txt",
    "benefits_summary.txt",
    "parking_info.txt",
    "equipment_return.txt",
  ],

  "/home/jcarter/Downloads": [
    "installer.pkg",
    "random.zip",
    "music.mp3",
    "printer_driver.pkg",
    "badge_form.pdf",
    "network_patch_notes.txt",
    "vacation_request.docx",
  ],

  "/home/jcarter/Pictures": [
    "vacation.jpg",
    "family.png",
    "dog.png",
    "office_party.jpg",
    "whiteboard.png",
    "parking_lot.jpg",
  ],

  "/home/jcarter/Music": [
    "playlist.txt",
    "demo_track.mp3",
    "meeting_hold_music.mp3",
  ],

  "/home/jcarter/Videos": [
    "training_clip.mp4",
    "security_walkthrough.mp4",
    "funny_cat.mp4",
  ],

  "/home/jcarter/Projects": ["printer_refresh", "floor3_cleanup", "ideas.txt"],

  "/home/jcarter/Projects/printer_refresh": [
    "status.txt",
    "vendors.txt",
    "quotes.xlsx",
  ],

  "/home/jcarter/Projects/floor3_cleanup": [
    "checklist.txt",
    "supplies.txt",
    "photos",
  ],

  "/home/jcarter/Projects/floor3_cleanup/photos": [
    "hallway_before.jpg",
    "closet_before.jpg",
  ],

  "/home/jcarter/saved_notes": [
    "useful_info.txt",
    "old_notes.txt",
    "personal_reminders.txt",
    "weekend_plans.txt",
    "network",
    "work_thoughts.txt",
  ],

  "/home/jcarter/saved_notes/network": [
    "maintenance",
    "logs",
    "configs",
    "contacts.txt",
    "readme.txt",
  ],

  "/home/jcarter/saved_notes/network/logs": [
    "jan.log",
    "feb.log",
    "mar.log",
    "errors.log",
    "camera_latency.log",
    "door_reader.log",
  ],

  "/home/jcarter/saved_notes/network/configs": [
    "router.conf",
    "switch.conf",
    "wireless_ap.conf",
    "camera_vlan.conf",
  ],

  "/home/jcarter/saved_notes/network/maintenance": [
    "info",
    "checklist.txt",
    "supply_order.txt",
    "weekly_tasks.txt",
    "open_items.txt",
  ],

  "/home/jcarter/saved_notes/network/maintenance/info": [
    "elevators",
    "security",
    "doors",
    "cameras",
  ],

  "/home/jcarter/saved_notes/network/maintenance/info/security": [
    "badge_policy.txt",
    "incident_notes.txt",
    "visitor_rules.txt",
  ],

  "/home/jcarter/saved_notes/network/maintenance/info/doors": [
    "door_schedule.txt",
    "reader_map.txt",
  ],

  "/home/jcarter/saved_notes/network/maintenance/info/cameras": [
    "camera_inventory.txt",
    "camera_notes.txt",
    "firmware_rollout.txt",
  ],

  "/home/jcarter/saved_notes/network/maintenance/info/elevators": [
    "weekly_passcodes",
    "repair_logs.txt",
    "inspection_notes.txt",
    "vendor_contact.txt",
    "old_passcodes.txt",
  ],

  "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes":
    ["2026_week_09", "2026_week_10", "current_week", "archive", "README.txt"],

  "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/current_week":
    [
      "elevator_override.txt",
      "service_notes.txt",
      "rotation_schedule.txt",
      "technician_reminder.txt",
    ],

  "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/archive":
    ["2025_week_52", "2025_week_51", "2025_week_50"],
};

function buildFileMap(state: MissionState): FsFileMap {
  return {
    "/home/jcarter/Desktop/todo.txt": [
      "TODO",
      "- Submit maintenance logs",
      "- Call IT about slow network",
      "- Update elevator schedule",
      "- Ask Sam if badge printer is fixed",
    ],

    "/home/jcarter/Desktop/meeting_notes.txt": [
      "Weekly Sync",
      "- Elevator issues on floor 3",
      "- Badge access delays",
      "- Cameras need firmware update",
      "- Check if service vendor confirmed Thursday slot",
    ],

    "/home/jcarter/Desktop/vpn_config.ovpn": [
      "# OpenVPN Config",
      "client",
      "dev tun",
      "proto udp",
      "remote vpn.internal.local 1194",
      "# ...truncated...",
    ],

    "/home/jcarter/Desktop/building_map.txt": [
      "Building Notes",
      "- Lobby",
      "- Security desk",
      "- Elevator bank east side",
      "- Maintenance closet near service hall",
    ],

    "/home/jcarter/Desktop/reminders.txt": [
      "Reminders",
      "- Mom birthday Friday",
      "- Bring lunch Thursday",
      "- Don't forget parking pass renewal",
    ],

    "/home/jcarter/Desktop/temp_codes.txt": [
      "Temporary Codes",
      "Storage cage: 1188",
      "Supply locker: 4421",
      "",
      "None of these are elevator-related.",
    ],

    "/home/jcarter/Desktop/launcher.exe": null,
    "/home/jcarter/Desktop/inventory.exe": null,
    "/home/jcarter/Desktop/viewer.exe": null,

    "/home/jcarter/Documents/notes.txt": [
      "Random Notes",
      "- Coffee machine broken again",
      "- HR meeting Thursday",
      "- Need to clear out old downloads",
    ],

    "/home/jcarter/Documents/onboarding_checklist.txt": [
      "New Hire Checklist",
      "- ID badge issued",
      "- Email account activated",
      "- Laptop assigned",
      "- Security awareness training pending",
    ],

    "/home/jcarter/Documents/benefits_summary.txt": [
      "Benefits Summary",
      "- Medical starts 1st of next month",
      "- Dental included",
      "- Vision optional",
    ],

    "/home/jcarter/Documents/parking_info.txt": [
      "Parking Info",
      "Employee parking in north lot.",
      "Overflow available on lower deck after 8 AM.",
    ],

    "/home/jcarter/Documents/equipment_return.txt": [
      "Equipment Return Notes",
      "- 2 keyboards from storage",
      "- 1 dock unassigned",
      "- old monitor still in closet",
    ],

    "/home/jcarter/Downloads/network_patch_notes.txt": [
      "Patch Notes",
      "- AP reboot stability improved",
      "- Fixed intermittent camera auth issue",
      "- Minor UI changes to admin panel",
    ],

    "/home/jcarter/Music/playlist.txt": [
      "Playlist",
      "- Night Drive",
      "- Static Bloom",
      "- Metro Lights",
    ],

    "/home/jcarter/Projects/ideas.txt": [
      "Ideas",
      "- color-code printer supply shelves",
      "- make better floor labels",
      "- ask about replacing old break room fridge",
    ],

    "/home/jcarter/Projects/printer_refresh/status.txt": [
      "Printer Refresh",
      "Status: delayed",
      "Waiting on two toner kits and one pickup tray.",
    ],

    "/home/jcarter/Projects/printer_refresh/vendors.txt": [
      "Approved Vendors",
      "- Metro Office Supply",
      "- PrintCore Solutions",
      "- Office Axis",
    ],

    "/home/jcarter/Projects/floor3_cleanup/checklist.txt": [
      "Floor 3 Cleanup",
      "- empty old cabinets",
      "- replace broken labels",
      "- move leftover chairs",
      "- take before/after photos",
    ],

    "/home/jcarter/Projects/floor3_cleanup/supplies.txt": [
      "Supplies",
      "- trash bags",
      "- label tape",
      "- wipes",
      "- gloves",
    ],

    "/home/jcarter/saved_notes/old_notes.txt": [
      "Old Notes",
      "Need to stop leaving sticky notes everywhere.",
      "Ask if service stair light was ever fixed.",
      "Find better way to track weekly tasks.",
    ],

    "/home/jcarter/saved_notes/personal_reminders.txt": [
      "Personal Reminders",
      "- dentist on Tuesday",
      "- call landlord",
      "- pick up dry cleaning",
    ],

    "/home/jcarter/saved_notes/weekend_plans.txt": [
      "Weekend",
      "- groceries",
      "- maybe hiking if weather is good",
      "- fix squeaky cabinet hinge",
    ],

    "/home/jcarter/saved_notes/work_thoughts.txt": [
      "Work Thoughts",
      "Need a cleaner structure for maintenance docs.",
      "Everything is buried too deep.",
      "Should probably archive half these files.",
    ],

    "/home/jcarter/saved_notes/useful_info.txt": [
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
    ],

    "/home/jcarter/saved_notes/network/contacts.txt": [
      "Contacts",
      "Facilities: ext 221",
      "Security desk: ext 203",
      "Elevator vendor: ext 118",
    ],

    "/home/jcarter/saved_notes/network/readme.txt": [
      "Network Notes",
      "This folder has a mix of configs, logs, and maintenance references.",
      "Most of it is outdated except maintenance info.",
    ],

    "/home/jcarter/saved_notes/network/logs/jan.log": [
      "[INFO] Monthly maintenance completed",
      "[INFO] Badge reader sync OK",
      "[WARN] Camera 08 dropped once",
    ],

    "/home/jcarter/saved_notes/network/logs/feb.log": [
      "[INFO] AP firmware updated",
      "[WARN] Printer VLAN congestion",
      "[INFO] Elevator panel diagnostic passed",
    ],

    "/home/jcarter/saved_notes/network/logs/mar.log": [
      "[INFO] Scheduled vendor visit",
      "[WARN] Camera auth delay on floor 3",
      "[INFO] Door controller rebooted",
    ],

    "/home/jcarter/saved_notes/network/logs/errors.log": [
      "[ERROR] Camera 12 latency spike",
      "[WARN] Unauthorized badge attempt",
      "[ERROR] Door controller timeout on east hall",
    ],

    "/home/jcarter/saved_notes/network/logs/camera_latency.log": [
      "camera_04  22ms",
      "camera_08  41ms",
      "camera_12  118ms",
      "camera_15  36ms",
    ],

    "/home/jcarter/saved_notes/network/logs/door_reader.log": [
      "east_reader_1 OK",
      "west_reader_2 OK",
      "service_hall_reader WARN intermittent response",
    ],

    "/home/jcarter/saved_notes/network/configs/router.conf": [
      "hostname core-router-2",
      "interface vlan10",
      " ip address 10.10.10.1/24",
      "# ...truncated...",
    ],

    "/home/jcarter/saved_notes/network/configs/switch.conf": [
      "hostname floor3-sw1",
      "spanning-tree enabled",
      "uplink port-channel 1",
      "# ...truncated...",
    ],

    "/home/jcarter/saved_notes/network/configs/wireless_ap.conf": [
      "ssid employee-secure",
      "band steering enabled",
      "power auto",
    ],

    "/home/jcarter/saved_notes/network/configs/camera_vlan.conf": [
      "vlan 44",
      "name CAMERAS",
      "qos profile video-priority",
    ],

    "/home/jcarter/saved_notes/network/maintenance/checklist.txt": [
      "Maintenance Checklist",
      "- verify controller status",
      "- verify elevator comms",
      "- review current week docs",
      "- confirm vendor notes",
    ],

    "/home/jcarter/saved_notes/network/maintenance/supply_order.txt": [
      "Supply Order",
      "- label cartridges",
      "- printer paper",
      "- cabinet keys",
    ],

    "/home/jcarter/saved_notes/network/maintenance/weekly_tasks.txt": [
      "Weekly Tasks",
      "- inspect access readers",
      "- review service logs",
      "- rotate maintenance notes",
    ],

    "/home/jcarter/saved_notes/network/maintenance/open_items.txt": [
      "Open Items",
      "- west hallway speaker buzz",
      "- elevator call button scratch plate loose",
      "- replace broken label in supply closet",
    ],

    "/home/jcarter/saved_notes/network/maintenance/info/security/badge_policy.txt":
      [
        "Badge Policy",
        "All employees must wear visible ID badges.",
        "Unauthorized access will be reported.",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/security/incident_notes.txt":
      [
        "Incident Notes",
        "- visitor escorted from rear hall",
        "- one lost badge deactivated",
        "- no confirmed intrusion events",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/security/visitor_rules.txt":
      [
        "Visitor Rules",
        "Visitors must remain escorted beyond lobby.",
        "Temporary badges expire daily.",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/doors/door_schedule.txt":
      [
        "Door Schedule",
        "Main entrance unlock 07:00",
        "Service corridor restricted after 18:00",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/doors/reader_map.txt": [
      "Reader Map",
      "- Lobby reader",
      "- Service hall reader",
      "- East stair reader",
    ],

    "/home/jcarter/saved_notes/network/maintenance/info/cameras/camera_inventory.txt":
      [
        "Camera Inventory",
        "12 hallway cams active",
        "4 exterior cams active",
        "2 loading dock cams active",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/cameras/camera_notes.txt":
      [
        "Camera Notes",
        "Cam 12 occasionally lags under load.",
        "Cam 03 night mode too aggressive.",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/cameras/firmware_rollout.txt":
      [
        "Firmware Rollout",
        "Phase 1 complete",
        "Phase 2 pending vendor approval",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/repair_logs.txt":
      [
        "Elevator Repair Logs",
        "- Door motor replaced (Feb)",
        "- Panel reset (Jan)",
        "- Sensor recalibration completed",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/inspection_notes.txt":
      [
        "Inspection Notes",
        "No major issues.",
        "South bank doors closing slightly slow.",
        "Recommend follow-up next month.",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/vendor_contact.txt":
      [
        "Vendor Contact",
        "Metro Lift Services",
        "Dispatch ext 118",
        "After hours line on file",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/old_passcodes.txt":
      [
        "Old Elevator Override Notes",
        "Week 08: 5521",
        "Week 09: 1844",
        "Week 10: 9037",
        "",
        "Do not use old codes after weekly reset.",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/README.txt":
      [
        "Weekly Passcodes",
        "Folders are organized by week.",
        "Use current_week for the active override.",
        "Archive retained for reference only.",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/current_week/service_notes.txt":
      [
        "Service Notes",
        "- Verify override works before Monday reset",
        "- Confirm technician signoff",
        "- Remove temporary stickers from panel",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/current_week/rotation_schedule.txt":
      [
        "Rotation Schedule",
        "Codes rotate every Monday at 04:00.",
        "Archive previous week after validation.",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/current_week/technician_reminder.txt":
      [
        "Reminder",
        "Do not leave printed override sheet near panel.",
        "Destroy old notes after update.",
      ],

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/current_week/elevator_override.txt":
      [
        "Elevator Maintenance Override",
        "Week 11",
        "",
        `Override Code: ${state.elevatorCode}`,
        "",
        "Note:",
        "Code resets automatically every Monday at 04:00.",
      ],
  };
}

function rawDirectoryListing(path: string): string[] | null {
  return DIRECTORY_INDEX[path] ?? null;
}

function listForCwd(cwd: string, state?: MissionState): string[] | null {
  const explicit = rawDirectoryListing(cwd);
  if (explicit) return explicit;

  if (!state) return null;
  if (isDirectory(cwd, state)) return [];

  return null;
}

function joinPath(base: string, name: string): string {
  return `${base}/${name}`.replace(/\/+/g, "/");
}

function parentPath(path: string): string | null {
  if (path === DEFAULT_TERMINAL_CWD) return null;
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return null;
  return `/${parts.slice(0, -1).join("/")}`;
}

function baseName(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function isFile(path: string, state: MissionState): boolean {
  const files = buildFileMap(state);
  return Object.prototype.hasOwnProperty.call(files, path);
}

function isDirectory(path: string, state: MissionState): boolean {
  if (Object.prototype.hasOwnProperty.call(DIRECTORY_INDEX, path)) return true;
  if (isFile(path, state)) return false;

  const parent = parentPath(path);
  if (!parent) return false;

  const parentListing = listForCwd(parent, state);
  if (!parentListing) return false;

  return parentListing.includes(baseName(path));
}

function pathExists(path: string, state: MissionState): boolean {
  return isDirectory(path, state) || isFile(path, state);
}

function getFileContents(
  path: string,
  state: MissionState,
): string[] | null | undefined {
  const files = buildFileMap(state);
  return files[path];
}

function resolvePathFromCwd(
  cwd: string,
  targetRaw: string,
  state: MissionState,
): string | null {
  const target = norm(targetRaw);

  if (!target) return cwd;
  if (target === "~") return DEFAULT_TERMINAL_CWD;
  if (target === "/") return null;

  if (target.startsWith("/")) {
    return pathExists(target, state) ? target : null;
  }

  if (target === ".") return cwd;

  if (target === "..") {
    if (cwd === DEFAULT_TERMINAL_CWD) return DEFAULT_TERMINAL_CWD;
    return cwd.split("/").slice(0, -1).join("/") || DEFAULT_TERMINAL_CWD;
  }

  const parts = target.split("/").filter(Boolean);
  let current = cwd;

  for (const part of parts) {
    if (part === ".") continue;

    if (part === "..") {
      current =
        current === DEFAULT_TERMINAL_CWD
          ? DEFAULT_TERMINAL_CWD
          : current.split("/").slice(0, -1).join("/") || DEFAULT_TERMINAL_CWD;
      continue;
    }

    const next = joinPath(current, part);
    if (!pathExists(next, state)) return null;
    current = next;
  }

  return current;
}

function resolveCd(
  cwd: string,
  argRaw: string,
  state: MissionState,
): string | null {
  const resolved = resolvePathFromCwd(cwd, argRaw || "~", state);
  if (!resolved) return null;
  return isDirectory(resolved, state) ? resolved : null;
}

function resolveFilePath(
  cwd: string,
  argRaw: string,
  state: MissionState,
): string | null {
  const resolved = resolvePathFromCwd(cwd, argRaw, state);
  if (!resolved) return null;
  return isFile(resolved, state) ? resolved : null;
}

function fileNameFromPath(path: string): string {
  return path.split("/").pop() || path;
}

function isExeFile(path: string): boolean {
  return path.toLowerCase().endsWith(".exe");
}

function isTerminalMissionPhase(phase: MissionState["phase"]) {
  return (
    phase === "laptop_access_confirm" ||
    phase === "terminal_intro" ||
    phase === "terminal_brief_pwd" ||
    phase === "terminal_brief_search" ||
    phase === "complete" ||
    phase === "lesson_2_intro"
  );
}

function runSearchShell(
  raw: string,
  mode: Mode,
  state: MissionState,
  cwd: string,
): TerminalCommandResult {
  if (!raw) {
    return {
      handled: true,
      ok: true,
      advanced: false,
      terminalOut: [],
      handlerOut: [],
      nextState: state,
    };
  }

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

  if (
    matches(raw, "ls", mode, ["ls -la", "ls -l", "ls -a"]) ||
    matches(raw, "ls .", mode)
  ) {
    const listing = listForCwd(cwd, state);
    return {
      handled: true,
      ok: !!listing,
      advanced: false,
      terminalOut: listing ?? ["ls: cannot access directory"],
      handlerOut: [],
      nextState: state,
    };
  }

  if (normLower(raw).startsWith("ls ")) {
    const arg = raw.slice(raw.indexOf("ls") + 2).trim();
    const resolved = resolvePathFromCwd(cwd, arg, state);

    if (!resolved) {
      return {
        handled: true,
        ok: false,
        advanced: false,
        terminalOut: [`ls: cannot access '${arg}': No such file or directory`],
        handlerOut: [],
        nextState: state,
      };
    }

    if (!isDirectory(resolved, state)) {
      return {
        handled: true,
        ok: true,
        advanced: false,
        terminalOut: [fileNameFromPath(resolved)],
        handlerOut: [],
        nextState: state,
      };
    }

    return {
      handled: true,
      ok: true,
      advanced: false,
      terminalOut: listForCwd(resolved, state) ?? [],
      handlerOut: [],
      nextState: state,
    };
  }

  if (
    normLower(raw).startsWith("cd ") ||
    normLower(raw) === "cd" ||
    normLower(raw) === "cd .." ||
    normLower(raw) === "cd ." ||
    normLower(raw) === "cd ~"
  ) {
    const arg =
      normLower(raw) === "cd" ? "~" : raw.slice(raw.indexOf("cd") + 2).trim();

    const nextCwd = resolveCd(cwd, arg, state);

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
      effects: [{ type: "set_terminal_cwd", cwd: nextCwd } as MissionEffect],
    };
  }

  if (normLower(raw).startsWith("cat ")) {
    const arg = raw.slice(raw.indexOf("cat") + 3).trim();
    const filePath = resolveFilePath(cwd, arg, state);

    if (!filePath) {
      return {
        handled: true,
        ok: false,
        advanced: false,
        terminalOut: [`cat: ${arg}: No such file or directory`],
        handlerOut: [],
        nextState: state,
      };
    }

    if (isExeFile(filePath)) {
      return {
        handled: true,
        ok: false,
        advanced: false,
        terminalOut: [`cat: ${fileNameFromPath(filePath)}: binary file`],
        handlerOut: [],
        nextState: state,
      };
    }

    const contents = getFileContents(filePath, state);

    if (!contents || contents.length === 0) {
      return {
        handled: true,
        ok: true,
        advanced: false,
        terminalOut: [],
        handlerOut: [],
        nextState: state,
      };
    }

    return {
      handled: true,
      ok: true,
      advanced: false,
      terminalOut: contents,
      handlerOut: [],
      nextState: state,
    };
  }

  const maybePath = resolvePathFromCwd(cwd, raw, state);
  if (maybePath && isFile(maybePath, state)) {
    if (isExeFile(maybePath)) {
      return {
        handled: true,
        ok: false,
        advanced: false,
        terminalOut: [
          `${fileNameFromPath(maybePath)}: cannot be run from shell`,
        ],
        handlerOut: [],
        nextState: state,
      };
    }

    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: [`${fileNameFromPath(maybePath)}: not executable`],
      handlerOut: [],
      nextState: state,
    };
  }

  if (normLower(raw).startsWith("./")) {
    const filePath = resolveFilePath(cwd, raw.slice(2), state);

    if (!filePath) {
      return {
        handled: true,
        ok: false,
        advanced: false,
        terminalOut: [`bash: ${raw}: No such file or directory`],
        handlerOut: [],
        nextState: state,
      };
    }

    if (isExeFile(filePath)) {
      return {
        handled: true,
        ok: false,
        advanced: false,
        terminalOut: [
          `${fileNameFromPath(filePath)}: cannot be run from shell`,
        ],
        handlerOut: [],
        nextState: state,
      };
    }

    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: [`${fileNameFromPath(filePath)}: not executable`],
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

export function runMissionCommand(
  input: string,
  mode: Mode,
  state: MissionState,
  cwd: string,
): TerminalCommandResult {
  if (!isTerminalMissionPhase(state.phase)) {
    return { handled: false };
  }

  return runSearchShell(norm(input), mode, state, cwd || DEFAULT_TERMINAL_CWD);
}
