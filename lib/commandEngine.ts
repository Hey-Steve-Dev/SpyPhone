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

type EmployeeRecord = {
  employeeId: string;
  filename: string;
  name: string;
  department: string;
  jobTitle: string;
  employmentStatus: string;
  workLocation: string;
  manager: string;
  payGrade: string;
  office: string;
  strengths: string[];
  improvement: string[];
  notes?: string[];
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

  const items = Object.keys(node.children).sort((a, b) => a.localeCompare(b));
  return items.length ? items : ["EMPTY"];
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

function isExeFilename(name: string) {
  return name.toLowerCase().endsWith(".exe");
}

function buildEmployeeDoc(record: EmployeeRecord): string[] {
  return [
    "EMPLOYEE RECORD — INTERNAL USE ONLY",
    "",
    `Employee ID: ${record.employeeId}`,
    `Name: ${record.name}`,
    `Department: ${record.department}`,
    `Job Title: ${record.jobTitle}`,
    `Employment Status: ${record.employmentStatus}`,
    "Hire Date: [REDACTED]",
    `Work Location: ${record.workLocation}`,
    `Manager: ${record.manager}`,
    `Pay Grade: ${record.payGrade}`,
    "",
    "POSITION SUMMARY",
    `Employee currently serves as ${record.jobTitle} within ${record.department}.`,
    "Role details in this exported copy are limited to standard HR fields.",
    "",
    "PERFORMANCE SUMMARY",
    "Strengths:",
    ...record.strengths.map((s) => `- ${s}`),
    "",
    "Areas for Improvement:",
    ...record.improvement.map((s) => `- ${s}`),
    "",
    "WORK LOCATION DETAILS",
    `Office: ${record.office}`,
    "",
    "HR COMMENTS",
    ...(record.notes ?? ["No additional comments in exported copy."]),
    "",
    "EMPLOYEE ACKNOWLEDGMENT",
    "Signature: Not On File",
    "Last Acknowledgment: [REDACTED]",
  ];
}

const EMPLOYEE_RECORDS: EmployeeRecord[] = [
  {
    employeeId: "11-10324-AP",
    filename: "pike_aaron.doc",
    name: "Pike, Aaron",
    department: "Facilities Support",
    jobTitle: "Mailroom Clerk",
    employmentStatus: "Full-Time (Non-Exempt)",
    workLocation: "Facility 1A — Service Corridor",
    manager: "Olivia Marsh",
    payGrade: "L1",
    office: "1A-118",
    strengths: ["Reliable task completion", "Good route accuracy"],
    improvement: ["Needs faster turnaround on intake sorting"],
  },
  {
    employeeId: "11-10488-TB",
    filename: "boone_tessa.doc",
    name: "Boone, Tessa",
    department: "Front Office Administration",
    jobTitle: "Reception Coordinator",
    employmentStatus: "Full-Time (Non-Exempt)",
    workLocation: "Facility 1A — Lobby Desk",
    manager: "Rebecca Lin",
    payGrade: "L1",
    office: "1A-102",
    strengths: ["Strong desk coverage", "Professional communication"],
    improvement: ["Occasional delays in logging visitor updates"],
  },
  {
    employeeId: "11-10591-MS",
    filename: "santos_miguel.doc",
    name: "Santos, Miguel",
    department: "Logistics",
    jobTitle: "Shipping Associate",
    employmentStatus: "Full-Time (Non-Exempt)",
    workLocation: "Facility 2B — Receiving",
    manager: "Isaac Monroe",
    payGrade: "L1",
    office: "2B-041",
    strengths: ["Good inventory handling", "Strong attendance"],
    improvement: ["Documentation consistency below standard"],
  },
  {
    employeeId: "11-10702-DK",
    filename: "kerr_dana.doc",
    name: "Kerr, Dana",
    department: "Records Administration",
    jobTitle: "Records Clerk",
    employmentStatus: "Full-Time (Non-Exempt)",
    workLocation: "Facility 2A — Records Room",
    manager: "Jenna Ortiz",
    payGrade: "L1",
    office: "2A-215",
    strengths: ["Accurate filing", "Steady throughput"],
    improvement: ["Needs better archive tagging discipline"],
  },
  {
    employeeId: "12-11144-OM",
    filename: "marsh_olivia.doc",
    name: "Marsh, Olivia",
    department: "Facilities",
    jobTitle: "Facilities Coordinator",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 3A — Facilities Desk",
    manager: "Peter Lang",
    payGrade: "L2",
    office: "3A-126",
    strengths: ["Strong vendor coordination", "Good scheduling oversight"],
    improvement: ["Pending backlog cleanup"],
  },
  {
    employeeId: "12-11402-KR",
    filename: "rudd_kevin.doc",
    name: "Rudd, Kevin",
    department: "IT Support",
    jobTitle: "IT Support Technician",
    employmentStatus: "Full-Time (Non-Exempt)",
    workLocation: "Facility 2C — Help Desk",
    manager: "Maya Chen",
    payGrade: "L2",
    office: "2C-233",
    strengths: ["Fast issue triage", "Positive user support"],
    improvement: ["Ticket notes sometimes too brief"],
  },
  {
    employeeId: "12-11489-PN",
    filename: "nair_priya.doc",
    name: "Nair, Priya",
    department: "Procurement",
    jobTitle: "Procurement Analyst",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 1B — Procurement",
    manager: "Owen Bishop",
    payGrade: "L2",
    office: "1B-208",
    strengths: ["Cost tracking", "Vendor comparisons"],
    improvement: ["Needs quicker approval routing"],
  },
  {
    employeeId: "12-11610-BH",
    filename: "holloway_ben.doc",
    name: "Holloway, Ben",
    department: "Security",
    jobTitle: "Junior Security Analyst",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 1A — Security Desk",
    manager: "Elise Foster",
    payGrade: "L2",
    office: "1A-121",
    strengths: ["Incident follow-up", "Good policy adherence"],
    improvement: ["Escalation timing varies by shift"],
  },
  {
    employeeId: "12-11691-NE",
    filename: "ellis_nora.doc",
    name: "Ellis, Nora",
    department: "Executive Support",
    jobTitle: "Admin Assistant II",
    employmentStatus: "Full-Time (Non-Exempt)",
    workLocation: "Facility 3B — Support Bay",
    manager: "Rebecca Lin",
    payGrade: "L2",
    office: "3B-755",
    strengths: ["Strong calendar coordination", "Reliable support coverage"],
    improvement: ["Legacy export cleanup still pending"],
  },
  {
    employeeId: "12-11805-JM",
    filename: "mercer_jacob.doc",
    name: "Mercer, Jacob",
    department: "Finance",
    jobTitle: "Payroll Specialist",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 2A — Finance Wing",
    manager: "Vivian Brooks",
    payGrade: "L2",
    office: "2A-284",
    strengths: ["Accurate payroll handling", "Strong process compliance"],
    improvement: ["Needs more timely documentation handoff"],
  },
  {
    employeeId: "13-12011-HC",
    filename: "cole_hannah.doc",
    name: "Cole, Hannah",
    department: "Scheduling Operations",
    jobTitle: "Scheduling Coordinator",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 3A — Scheduling",
    manager: "Caroline Shaw",
    payGrade: "L3",
    office: "3A-203",
    strengths: ["Calendar conflict management", "Strong follow-through"],
    improvement: ["Needs cleaner archive naming"],
  },
  {
    employeeId: "13-12140-LB",
    filename: "becker_liam.doc",
    name: "Becker, Liam",
    department: "Infrastructure",
    jobTitle: "Network Technician",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 2C — Network Operations",
    manager: "Maya Chen",
    payGrade: "L3",
    office: "2C-247",
    strengths: ["Fast hardware swaps", "Stable maintenance execution"],
    improvement: ["Change logs occasionally incomplete"],
  },
  {
    employeeId: "13-12207-SP",
    filename: "patel_sofia.doc",
    name: "Patel, Sofia",
    department: "Research",
    jobTitle: "Research Assistant",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 3B — Lab Wing C",
    manager: "Daniel Yates",
    payGrade: "L3",
    office: "3B-734",
    strengths: ["Strong experiment support", "Careful note taking"],
    improvement: ["Needs broader cross-team participation"],
  },
  {
    employeeId: "13-12290-EC",
    filename: "cross_ethan.doc",
    name: "Cross, Ethan",
    department: "Research",
    jobTitle: "Lab Technician",
    employmentStatus: "Full-Time (Non-Exempt)",
    workLocation: "Facility 3B — Lab Wing C",
    manager: "Daniel Yates",
    payGrade: "L3",
    office: "3B-739",
    strengths: ["Reliable lab upkeep", "Good shift coverage"],
    improvement: ["Inventory notes lag during busy weeks"],
  },
  {
    employeeId: "13-12355-CW",
    filename: "winters_claire.doc",
    name: "Winters, Claire",
    department: "Documentation Services",
    jobTitle: "Documentation Specialist",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 2A — Documentation",
    manager: "Colin Reeves",
    payGrade: "L3",
    office: "2A-262",
    strengths: ["Clear writeups", "Good process capture"],
    improvement: ["Needs faster revision turnaround"],
  },
  {
    employeeId: "13-12481-MW",
    filename: "webb_marcus.doc",
    name: "Webb, Marcus",
    department: "Analytics",
    jobTitle: "Data Analyst",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 2B — Analytics",
    manager: "Trevor Hale",
    payGrade: "L3",
    office: "2B-198",
    strengths: ["Strong reporting accuracy", "Good dashboard upkeep"],
    improvement: ["Needs clearer stakeholder notes"],
  },
  {
    employeeId: "14-13012-JO",
    filename: "ortiz_jenna.doc",
    name: "Ortiz, Jenna",
    department: "Human Resources",
    jobTitle: "HR Generalist",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 1B — HR",
    manager: "Vivian Brooks",
    payGrade: "L4",
    office: "1B-304",
    strengths: ["Good employee support", "Strong records handling"],
    improvement: ["Migration cleanup still ongoing"],
  },
  {
    employeeId: "14-13110-CR",
    filename: "reeves_colin.doc",
    name: "Reeves, Colin",
    department: "Compliance",
    jobTitle: "Compliance Analyst",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 2A — Compliance",
    manager: "Owen Bishop",
    payGrade: "L4",
    office: "2A-311",
    strengths: ["Policy review", "Audit readiness"],
    improvement: ["Needs broader coordination with documentation"],
  },
  {
    employeeId: "14-13204-RL",
    filename: "lin_rebecca.doc",
    name: "Lin, Rebecca",
    department: "Executive Support",
    jobTitle: "Executive Support Lead",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 3B — Support Bay",
    manager: "Caroline Shaw",
    payGrade: "L4",
    office: "3B-751",
    strengths: ["Strong coordination across teams", "High schedule accuracy"],
    improvement: ["Backlog from relocation still being resolved"],
  },
  {
    employeeId: "14-13361-IM",
    filename: "monroe_isaac.doc",
    name: "Monroe, Isaac",
    department: "Facilities",
    jobTitle: "Senior Facilities Planner",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 3A — Facilities Planning",
    manager: "Peter Lang",
    payGrade: "L4",
    office: "3A-211",
    strengths: ["Strong move planning", "Vendor coordination"],
    improvement: ["Archive cleanup remains open"],
  },
  {
    employeeId: "15-14006-MC",
    filename: "chen_maya.doc",
    name: "Chen, Maya",
    department: "Infrastructure",
    jobTitle: "Systems Engineer",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 2C — Core Systems",
    manager: "Owen Bishop",
    payGrade: "L5",
    office: "2C-318",
    strengths: ["Strong systems ownership", "Reliable deployments"],
    improvement: ["Needs stronger delegation on routine work"],
  },
  {
    employeeId: "15-14152-TH",
    filename: "hale_trevor.doc",
    name: "Hale, Trevor",
    department: "Analytics",
    jobTitle: "Project Manager",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 2B — Program Office",
    manager: "Owen Bishop",
    payGrade: "L5",
    office: "2B-301",
    strengths: ["Good planning discipline", "Steady team management"],
    improvement: ["Status reporting cadence inconsistent"],
  },
  {
    employeeId: "15-14220-EF",
    filename: "foster_elise.doc",
    name: "Foster, Elise",
    department: "Security",
    jobTitle: "Senior Security Manager",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 1A — Security Operations",
    manager: "Samuel Dorsey",
    payGrade: "L5",
    office: "1A-214",
    strengths: ["Strong escalation handling", "Policy enforcement"],
    improvement: ["Needs faster archival turnover"],
  },
  {
    employeeId: "16-15018-OB",
    filename: "bishop_owen.doc",
    name: "Bishop, Owen",
    department: "Operations",
    jobTitle: "Director of Operations",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 2A — Operations",
    manager: "Samuel Dorsey",
    payGrade: "L6",
    office: "2A-402",
    strengths: ["Cross-team oversight", "Operational planning"],
    improvement: ["Documentation backlog from Q1 still open"],
  },
  {
    employeeId: "16-15103-VB",
    filename: "brooks_vivian.doc",
    name: "Brooks, Vivian",
    department: "Human Resources",
    jobTitle: "HR Director",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 1B — HR Leadership",
    manager: "Lila Grant",
    payGrade: "L6",
    office: "1B-407",
    strengths: ["Strong personnel oversight", "Policy alignment"],
    improvement: ["Export parity issues under review"],
  },
  {
    employeeId: "16-15188-DY",
    filename: "yates_daniel.doc",
    name: "Yates, Daniel",
    department: "Research",
    jobTitle: "Senior Research Scientist",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 3B — Lab Wing C",
    manager: "Lila Grant",
    payGrade: "L6",
    office: "3B-764",
    strengths: ["Technical leadership", "Independent execution"],
    improvement: ["Team documentation lagging"],
  },
  {
    employeeId: "16-15276-CS",
    filename: "shaw_caroline.doc",
    name: "Shaw, Caroline",
    department: "Executive Operations",
    jobTitle: "Executive Operations Manager",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 3B — Executive Support",
    manager: "Lila Grant",
    payGrade: "L6",
    office: "3B-748",
    strengths: ["High coordination accuracy", "Strong support oversight"],
    improvement: ["Legacy move docs still being reconciled"],
  },
  {
    employeeId: "17-16012-PL",
    filename: "lang_peter.doc",
    name: "Lang, Peter",
    department: "Facilities",
    jobTitle: "Facilities Director",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 3A — Facilities Leadership",
    manager: "Samuel Dorsey",
    payGrade: "L7",
    office: "3A-412",
    strengths: ["Strategic planning", "Vendor management"],
    improvement: ["Needs closer signoff tracking during moves"],
  },
  {
    employeeId: "17-16105-LG",
    filename: "grant_lila.doc",
    name: "Grant, Lila",
    department: "Internal Programs",
    jobTitle: "VP, Internal Programs",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 1B — Leadership Suite",
    manager: "Samuel Dorsey",
    payGrade: "L8",
    office: "1B-501",
    strengths: ["Executive oversight", "Program direction"],
    improvement: ["Minimal direct documentation in shared systems"],
  },
  {
    employeeId: "18-17001-SD",
    filename: "dorsey_samuel.doc",
    name: "Dorsey, Samuel",
    department: "Administration",
    jobTitle: "Chief Administrative Officer",
    employmentStatus: "Full-Time (Exempt)",
    workLocation: "Facility 1B — Executive Suite",
    manager: "[REDACTED]",
    payGrade: "L9",
    office: "1B-601",
    strengths: ["High-level organizational oversight", "Decision authority"],
    improvement: ["Shared-system visibility limited by role scope"],
  },
];

const EMPLOYEE_INDEX_LINES = [
  "STAFF DIRECTORY INDEX",
  "",
  ...EMPLOYEE_RECORDS.map(
    (record) => `${record.filename} — ${record.name} — ${record.jobTitle}`,
  ),
];

function buildEmployeeDirectoryNode(): FsDirNode {
  const children: Record<string, FsNode> = {
    "index.txt": file(...EMPLOYEE_INDEX_LINES),
  };

  for (const record of EMPLOYEE_RECORDS) {
    children[record.filename] = file(...buildEmployeeDoc(record));
  }

  return dir(children);
}

function buildEmployeeExportsNode(): FsDirNode {
  return dir({
    profiles: buildEmployeeDirectoryNode(),
    "staff_index.txt": file(...EMPLOYEE_INDEX_LINES),
    "executive_support_export.txt": file(
      "Executive Support Export",
      "",
      "Some office fields intentionally omitted from shared export.",
    ),
    "role_summary_export.txt": file(
      "Role Summary Export",
      "",
      "High-level position summaries only.",
    ),
  });
}

function buildSharedNetworkNode(): FsDirNode {
  return dir({
    shared: dir({
      public: dir({
        "company_holidays.txt": file(
          "Company Holidays",
          "",
          "- New Year's Day",
          "- Memorial Day",
          "- Independence Day",
          "- Labor Day",
          "- Thanksgiving",
          "- Winter Break",
        ),
        "expense_template.doc": file(
          "Expense Template",
          "",
          "Use current reimbursement codes only.",
        ),
        "office_map_reference.txt": file(
          "Office Map Reference",
          "",
          "For detailed room changes refer to Facilities relocation records.",
        ),
        "badge_request_form.doc": file(
          "Badge Request Form",
          "",
          "Submit completed forms to Security and HR.",
        ),
        "viewer.exe": file("Executable placeholder."),
      }),
      forms: dir({
        "visitor_request.doc": file(
          "Visitor Request",
          "",
          "Requires escort and desk approval.",
        ),
        "supply_restock_form.doc": file(
          "Supply Restock Form",
          "",
          "Use cabinet ID if known.",
        ),
        "move_request.doc": file(
          "Move Request",
          "",
          "Facilities approval required for office relocation.",
        ),
        "conference_room_request.doc": file(
          "Conference Room Request",
          "",
          "Recurring reservations must be approved weekly.",
        ),
      }),
      templates: dir({
        "memo_template.doc": file(
          "Memo Template",
          "",
          "Standard internal memo format.",
        ),
        "handoff_template.txt": file(
          "Handoff Template",
          "",
          "Owner:",
          "Status:",
          "Next action:",
          "Known blockers:",
        ),
        "project_stub.txt": file(
          "Project Stub",
          "",
          "Name:",
          "Scope:",
          "Owner:",
          "Dependencies:",
        ),
      }),
      printers: dir({
        "driver_readme.txt": file(
          "Printer Driver Notes",
          "",
          "Badge printer drivers are managed separately.",
        ),
        "badge_printer.exe": file("Executable placeholder."),
        "floor3_queue_status.txt": file(
          "Queue Status",
          "",
          "Floor 3 copier queue stable.",
          "Badge printer queue intermittent.",
        ),
      }),
      "readme.txt": file(
        "Shared Folder Notes",
        "",
        "General files available to most internal users.",
      ),
      "mount_status.txt": file(
        "Mount Status",
        "",
        "shared      OK",
        "departments OK",
        "hr          OK",
        "facilities  OK",
        "archives    OK",
        "temp        OK",
      ),
    }),

    departments: dir({
      admin: dir({
        "handoff_notes.txt": file(
          "Admin Handoff Notes",
          "",
          "Executive support files were split during migration.",
          "Location fields may be blank in copied exports.",
          "Facilities retained final office assignments.",
        ),
        "office_move_list.txt": file(
          "Office Move List",
          "",
          "Most Q1 changes completed.",
          "A few specialist assignments were routed through Facilities.",
        ),
        "desk_assignments_legacy.doc": file(
          "Legacy Desk Assignments",
          "",
          "Outdated after floor reorg.",
          "Do not use for current room lookups.",
        ),
        "admin_tool.exe": file("Executable placeholder."),
        exports: dir({
          "assistant_contacts.txt": file(
            "Assistant Contacts",
            "",
            "Support desk A",
            "Support desk B",
            "Travel desk",
            "Scheduling desk",
          ),
          "room_labels_q1.txt": file(
            "Room Labels Q1",
            "",
            "Multiple label requests completed for Lab Wing C.",
          ),
          "support_copy.doc": file(
            "Support Copy",
            "",
            "Omitted sensitive fields from exported copy.",
          ),
          "staff_directory.txt": file(...EMPLOYEE_INDEX_LINES),
        }),
        archive_old: dir({
          "2025_move_notes.txt": file(
            "2025 Move Notes",
            "",
            "Old transition notes retained for reference.",
          ),
          "2025_support_roster.txt": file(
            "2025 Support Roster",
            "",
            "Legacy support assignments.",
          ),
        }),
      }),

      executive: dir({
        support: dir({
          "assistant_matrix.txt": file(
            "Assistant Matrix",
            "",
            "Specialized staff support rotated last quarter.",
            "Final room placements were confirmed after relocation wrap-up.",
          ),
          "relocation_summary.txt": file(
            "Relocation Summary",
            "",
            "Executive support references were updated after Facilities signoff.",
            "Some exported personnel packets still show blank office fields.",
            "See /network/facilities/relocation/office_changes_q1.txt for final assignments.",
          ),
          "visitor_pref.doc": file(
            "Visitor Preferences",
            "",
            "Front desk copy only.",
          ),
        }),
        travel: dir({
          "travel_policy.txt": file(
            "Travel Policy",
            "",
            "Use current booking codes.",
          ),
          "pending_itineraries.txt": file(
            "Pending Itineraries",
            "",
            "Nothing finalized.",
          ),
        }),
        scheduling: dir({
          "calendar_export.txt": file(
            "Calendar Export",
            "",
            "Room bookings mirrored nightly.",
          ),
          "room_priorities.txt": file(
            "Room Priorities",
            "",
            "Priority conference spaces reserved in advance.",
          ),
        }),
        "readme.txt": file(
          "Executive Department Share",
          "",
          "Contains support-side working documents.",
        ),
      }),

      research: dir({
        "staffing_overview.txt": file(
          "Research Staffing Overview",
          "",
          "Several researchers remain assigned to Lab Wing C.",
        ),
        "project_assignments.doc": file(
          "Project Assignments",
          "",
          "Project and room mappings partially redacted in shared copy.",
        ),
        "lab_access_notes.txt": file(
          "Lab Access Notes",
          "",
          "After-hours work remains common among senior staff.",
        ),
        restricted: dir({
          "EMPTY_PLACEHOLDER.txt": file(
            "Restricted",
            "",
            "No accessible files in this view.",
          ),
        }),
        old: dir({
          "lab_reorg_2025.txt": file(
            "Lab Reorg 2025",
            "",
            "Pre-dates current room assignments.",
          ),
          "legacy_workstation_map.txt": file(
            "Legacy Workstation Map",
            "",
            "Several IDs no longer current.",
          ),
        }),
      }),

      engineering: dir({
        "deploy_notes.txt": file(
          "Deploy Notes",
          "",
          "Nothing relevant to room assignments.",
        ),
        "asset_registry.txt": file(
          "Asset Registry",
          "",
          "Diagnostic workstations updated weekly.",
        ),
        tools: dir({
          "diag.exe": file("Executable placeholder."),
          "packet_viewer.exe": file("Executable placeholder."),
          "readme.txt": file(
            "Tools Readme",
            "",
            "Engineering binaries cannot be run from this shell.",
          ),
        }),
      }),

      security: dir({
        "badge_audit.txt": file(
          "Badge Audit",
          "",
          "Badge holders must keep current room information in approved systems only.",
        ),
        "escort_policy.txt": file(
          "Escort Policy",
          "",
          "Visitors beyond lobby require escort.",
        ),
        "incident_rollup.txt": file(
          "Incident Rollup",
          "",
          "No major security incidents listed.",
        ),
      }),

      facilities: dir({
        moves: dir({
          "floor3_reassignments.txt": file(
            "Floor 3 Reassignments",
            "",
            "Multiple room swaps completed after wing consolidation.",
            "Check office_changes_q1.txt for finalized current office assignments.",
          ),
          "office_changes_q1.txt": file(
            "Office Changes Q1",
            "",
            "Lab Wing C updates:",
            "- Admin overflow moved to 3B-742",
            "- Shared support room moved to 3B-755",
            "- Dr. Elias V. Harker reassigned to office 3B-771",
          ),
          "staging_notes.txt": file(
            "Staging Notes",
            "",
            "Temporary labels were removed after final room signoff.",
          ),
        }),
        maintenance: dir({
          "door_service_log.txt": file(
            "Door Service Log",
            "",
            "Routine service only.",
          ),
          "elevator_service_windows.txt": file(
            "Elevator Service Windows",
            "",
            "Monday 04:00 reserved for maintenance resets.",
          ),
          "room_signage_replacements.txt": file(
            "Room Signage Replacements",
            "",
            "Several Lab Wing C signs reprinted after Q1 relocation.",
          ),
        }),
        maps: dir({
          "wing_directory.txt": file(
            "Wing Directory",
            "",
            "3B-700 series rooms occupy Lab Wing C.",
          ),
          "lab_wing_c_notes.txt": file(
            "Lab Wing C Notes",
            "",
            "Updated room list maintained by Facilities.",
          ),
        }),
        vendors: dir({
          "vendor_list.txt": file(
            "Vendor List",
            "",
            "Move support and signage vendors listed here.",
          ),
          "move_support_contacts.txt": file(
            "Move Support Contacts",
            "",
            "Facilities handles final room notices.",
          ),
        }),
      }),
    }),

    ops: dir({
      "readme.txt": file(
        "Ops Share",
        "",
        "Operational support materials only.",
      ),
      handoff: dir({
        "night_shift_summary.txt": file(
          "Night Shift Summary",
          "",
          "No unusual network activity.",
        ),
        "pending_followups.txt": file(
          "Pending Followups",
          "",
          "Facilities share remains mounted.",
        ),
      }),
      relay: dir({
        "mounts.txt": file(
          "Mounted Shares",
          "",
          "/network/shared",
          "/network/departments",
          "/network/hr",
          "/network/facilities",
          "/network/archives",
        ),
        "service_hosts.txt": file(
          "Service Hosts",
          "",
          "ops-relay-1",
          "ops-relay-2",
          "fileshare-core",
        ),
      }),
      watchfloor: dir({
        "camera_status.txt": file(
          "Camera Status",
          "",
          "Most cameras operational.",
        ),
        "door_status.txt": file(
          "Door Status",
          "",
          "Service corridor reader intermittent.",
        ),
      }),
    }),

    hr: dir({
      onboarding: dir({
        "new_hire_packet.txt": file(
          "New Hire Packet",
          "",
          "Standard onboarding references.",
        ),
        "badge_issue_notes.txt": file(
          "Badge Issue Notes",
          "",
          "Badge issuance handled jointly with Security.",
        ),
      }),
      policies: dir({
        "attendance_policy.txt": file(
          "Attendance Policy",
          "",
          "Standard attendance requirements apply.",
        ),
        "storage_policy.txt": file(
          "Storage Policy",
          "",
          "Local-only storage is prohibited for official records.",
        ),
        "documentation_guidelines.txt": file(
          "Documentation Guidelines",
          "",
          "Project documentation should be current and complete.",
        ),
      }),
      exports: buildEmployeeExportsNode(),
      benefits: dir({
        "medical_overview.txt": file(
          "Medical Overview",
          "",
          "Standard benefits reference.",
        ),
        "pto_reference.txt": file(
          "PTO Reference",
          "",
          "See current handbook for accrual details.",
        ),
      }),
      archived: dir({
        "migration_notes_2025.txt": file(
          "Migration Notes 2025",
          "",
          "Some records were copied without full field parity.",
        ),
        "legacy_roster_index.txt": file(
          "Legacy Roster Index",
          "",
          "Historic record index only.",
        ),
      }),
    }),

    facilities: dir({
      maps: dir({
        "building_map.txt": file(
          "Building Map",
          "",
          "Floor 3 contains east offices, service hall, and Lab Wing C.",
        ),
        "floor3_rooms.txt": file(
          "Floor 3 Rooms",
          "",
          "700 series offices grouped under 3B wing layout.",
        ),
        "lab_wing_c_map.txt": file(
          "Lab Wing C Map",
          "",
          "Updated after room reassignments.",
          "3B-771 marked occupied.",
        ),
      }),
      maintenance: dir({
        "current_tasks.txt": file(
          "Current Tasks",
          "",
          "Replace signage in Lab Wing C.",
          "Confirm room label alignment after final move cycle.",
        ),
        "service_windows.txt": file(
          "Service Windows",
          "",
          "Monday 04:00 reserved maintenance period.",
        ),
        "cabinet_inventory.txt": file(
          "Cabinet Inventory",
          "",
          "Maintenance stock only.",
        ),
      }),
      relocation: dir({
        "floor3_reassignments.txt": file(
          "Floor 3 Reassignments",
          "",
          "Post-consolidation moves completed.",
          "Support copies may still show blanks.",
        ),
        "office_changes_q1.txt": file(
          "Office Changes Q1",
          "",
          "Finalized assignments:",
          "- 3B-742 reassigned to admin overflow",
          "- 3B-755 reassigned to shared executive support",
          "- 3B-771 assigned to Dr. Elias V. Harker",
        ),
        "move_request_backlog.txt": file(
          "Move Request Backlog",
          "",
          "Most pending moves closed.",
        ),
        archive: dir({
          "q4_2025_reassignments.txt": file(
            "Q4 2025 Reassignments",
            "",
            "Older move cycle. Superseded by Q1 updates.",
          ),
          "temp_move_sheet.doc": file(
            "Temp Move Sheet",
            "",
            "Working copy retained for archive only.",
          ),
        }),
      }),
      access_logs: dir({
        "badge_issues.txt": file(
          "Badge Issues",
          "",
          "A few room labels were corrected after move cycle.",
        ),
        "reader_replacements.txt": file(
          "Reader Replacements",
          "",
          "Nothing directly relevant to office locations.",
        ),
      }),
      vendor_docs: dir({
        "vendor_contacts.txt": file(
          "Vendor Contacts",
          "",
          "Move and signage vendors on file.",
        ),
        "move_support_contract.txt": file(
          "Move Support Contract",
          "",
          "Facilities only.",
        ),
      }),
      "readme.txt": file(
        "Facilities Share",
        "",
        "Maps, relocation notes, maintenance schedules, and vendor references.",
      ),
    }),

    archives: dir({
      "2024": dir({
        "EMPTY_PLACEHOLDER.txt": file(
          "Archive Placeholder",
          "",
          "No accessible files in this snapshot.",
        ),
      }),
      "2025": dir({
        "facility_moves_2025.txt": file(
          "Facility Moves 2025",
          "",
          "Historic move notes retained.",
        ),
        "admin_handoff_q3.txt": file(
          "Admin Handoff Q3",
          "",
          "Older support-side notes only.",
        ),
      }),
      "2026": dir({
        "q1_transition_notes.txt": file(
          "Q1 Transition Notes",
          "",
          "Room changes finalized by Facilities and reflected in relocation records.",
        ),
        "executive_support_refresh.txt": file(
          "Executive Support Refresh",
          "",
          "Shared export copies may omit room numbers.",
        ),
      }),
      "legacy_exports.txt": file(
        "Legacy Exports",
        "",
        "Historical snapshots may not reflect current office assignments.",
      ),
    }),

    temp: dir({}),

    "readme.txt": file(
      "Network Share",
      "",
      "Mounted shared volume for internal departments.",
      "Some folders are read-only snapshots.",
    ),

    "login_banner.txt": file(
      "NOTICE",
      "Access to this network share is monitored.",
      "Do not store local-only materials in public folders.",
    ),
  });
}

function buildAdminAssistantDocumentsNode(): FsDirNode {
  return dir({
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
          staff: buildEmployeeDirectoryNode(),
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
  });
}

function buildAdminAssistantHarvestNode(): FsDirNode {
  return dir({
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
          staff: buildEmployeeDirectoryNode(),
        }),
      }),
    }),
  });
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
      network: buildSharedNetworkNode(),
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
          Documents: buildAdminAssistantDocumentsNode(),
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
          harvest: buildAdminAssistantHarvestNode(),
        }),
      }),
      network: buildSharedNetworkNode(),
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
      network: buildSharedNetworkNode(),
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

    if (isExeFilename(rawTarget)) {
      return {
        ok: false,
        output: [`${rawTarget.split("/").pop()}: CANNOT RUN FROM SHELL`],
        nextSession: session,
        command,
        readFilePath: nextPath,
      };
    }

    const output = node.content.length ? node.content : ["EMPTY"];

    return {
      ok: true,
      output,
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

  const directPath = resolvePath(session.cwd, raw, host.home);
  const directNode = getNodeAtPath(host.fs, directPath);

  if (
    directNode?.type === "file" &&
    isExeFilename(directPath.split("/").pop() ?? "")
  ) {
    return {
      ok: false,
      output: [`${raw}: CANNOT RUN FROM SHELL`],
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
    output: [
      `Unknown command: ${raw}`,
      "Type 'help' to list available commands.",
    ],
    nextSession: session,
    command,
  };
}
