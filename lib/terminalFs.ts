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
  return s
    .trim()
    .replace(/^[>$#\s]*/, "")
    .replace(/\s+/g, " ");
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
  return cmd
    ? [`Unknown command: ${cmd}`, "Type 'help' to list available commands."]
    : [];
}

function getSessionHome(cwd: string) {
  if (cwd.startsWith("/home/mporter")) return "/home/mporter";
  if (cwd.startsWith("/home/jcarter")) return "/home/jcarter";
  if (cwd.startsWith("/network")) return "/network";
  return DEFAULT_TERMINAL_CWD;
}

const DIRECTORY_INDEX: FsDirectoryMap = {
  "/home": ["jcarter", "mporter"],

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

  "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/2026_week_09":
    ["elevator_override.txt"],

  "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/2026_week_10":
    ["elevator_override.txt"],

  "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/current_week":
    [
      "elevator_override.txt",
      "service_notes.txt",
      "rotation_schedule.txt",
      "technician_reminder.txt",
    ],

  "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/archive":
    ["2025_week_52", "2025_week_51", "2025_week_50"],

  "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/archive/2025_week_52":
    ["elevator_override.txt"],

  "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/archive/2025_week_51":
    ["elevator_override.txt"],

  "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/archive/2025_week_50":
    ["elevator_override.txt"],

  "/home/mporter": ["Desktop", "Documents", "Downloads", "harvest"],

  "/home/mporter/Desktop": ["welcome.txt", "calendar.txt", "admin_tool.exe"],

  "/home/mporter/Documents": [
    "notes.txt",
    "handoff.txt",
    "hr_exports",
    "admin",
    "personnel",
  ],

  "/home/mporter/Documents/hr_exports": ["intake"],
  "/home/mporter/Documents/hr_exports/intake": ["archive"],
  "/home/mporter/Documents/hr_exports/intake/archive": ["executive"],
  "/home/mporter/Documents/hr_exports/intake/archive/executive": [
    "personnel_profile.doc",
  ],

  "/home/mporter/Documents/admin": [
    "handoff_notes.txt",
    "visitor_schedule.doc",
    "temp_maintenance.txt",
  ],

  "/home/mporter/Documents/personnel": ["archived"],
  "/home/mporter/Documents/personnel/archived": ["assistant_roster.doc"],

  "/home/mporter/Downloads": ["temp", "readme.txt"],
  "/home/mporter/Downloads/temp": [],

  "/home/mporter/harvest": ["personnel"],
  "/home/mporter/harvest/personnel": ["intake"],
  "/home/mporter/harvest/personnel/intake": ["archive"],
  "/home/mporter/harvest/personnel/intake/archive": ["executive"],
  "/home/mporter/harvest/personnel/intake/archive/executive": [
    "personnel_profile.doc",
    "assistant_summary.txt",
    "contacts.doc",
  ],

  "/network": [
    "shared",
    "departments",
    "ops",
    "hr",
    "facilities",
    "archives",
    "temp",
    "readme.txt",
    "login_banner.txt",
  ],

  "/network/shared": [
    "public",
    "forms",
    "templates",
    "printers",
    "readme.txt",
    "mount_status.txt",
  ],

  "/network/shared/public": [
    "company_holidays.txt",
    "expense_template.doc",
    "office_map_reference.txt",
    "badge_request_form.doc",
    "viewer.exe",
  ],

  "/network/shared/forms": [
    "visitor_request.doc",
    "supply_restock_form.doc",
    "move_request.doc",
    "conference_room_request.doc",
  ],

  "/network/shared/templates": [
    "memo_template.doc",
    "handoff_template.txt",
    "project_stub.txt",
  ],

  "/network/shared/printers": [
    "driver_readme.txt",
    "badge_printer.exe",
    "floor3_queue_status.txt",
  ],

  "/network/departments": [
    "admin",
    "executive",
    "research",
    "engineering",
    "security",
    "facilities",
  ],

  "/network/departments/admin": [
    "handoff_notes.txt",
    "office_move_list.txt",
    "desk_assignments_legacy.doc",
    "admin_tool.exe",
    "exports",
    "archive_old",
  ],

  "/network/departments/admin/exports": [
    "assistant_contacts.txt",
    "room_labels_q1.txt",
    "support_copy.doc",
  ],

  "/network/departments/admin/archive_old": [
    "2025_move_notes.txt",
    "2025_support_roster.txt",
  ],

  "/network/departments/executive": [
    "support",
    "travel",
    "scheduling",
    "readme.txt",
  ],

  "/network/departments/executive/support": [
    "assistant_matrix.txt",
    "relocation_summary.txt",
    "visitor_pref.doc",
  ],

  "/network/departments/executive/travel": [
    "travel_policy.txt",
    "pending_itineraries.txt",
  ],

  "/network/departments/executive/scheduling": [
    "calendar_export.txt",
    "room_priorities.txt",
  ],

  "/network/departments/research": [
    "staffing_overview.txt",
    "project_assignments.doc",
    "lab_access_notes.txt",
    "restricted",
    "old",
  ],

  "/network/departments/research/restricted": ["EMPTY_PLACEHOLDER.txt"],

  "/network/departments/research/old": [
    "lab_reorg_2025.txt",
    "legacy_workstation_map.txt",
  ],

  "/network/departments/engineering": [
    "deploy_notes.txt",
    "asset_registry.txt",
    "tools",
  ],

  "/network/departments/engineering/tools": [
    "diag.exe",
    "packet_viewer.exe",
    "readme.txt",
  ],

  "/network/departments/security": [
    "badge_audit.txt",
    "escort_policy.txt",
    "incident_rollup.txt",
  ],

  "/network/departments/facilities": [
    "moves",
    "maintenance",
    "maps",
    "vendors",
  ],

  "/network/departments/facilities/moves": [
    "floor3_reassignments.txt",
    "office_changes_q1.txt",
    "staging_notes.txt",
  ],

  "/network/departments/facilities/maintenance": [
    "door_service_log.txt",
    "elevator_service_windows.txt",
    "room_signage_replacements.txt",
  ],

  "/network/departments/facilities/maps": [
    "wing_directory.txt",
    "lab_wing_c_notes.txt",
  ],

  "/network/departments/facilities/vendors": [
    "vendor_list.txt",
    "move_support_contacts.txt",
  ],

  "/network/ops": ["readme.txt", "handoff", "relay", "watchfloor"],

  "/network/ops/handoff": ["night_shift_summary.txt", "pending_followups.txt"],

  "/network/ops/relay": ["mounts.txt", "service_hosts.txt"],

  "/network/ops/watchfloor": ["camera_status.txt", "door_status.txt"],

  "/network/hr": ["onboarding", "policies", "exports", "benefits", "archived"],

  "/network/hr/onboarding": ["new_hire_packet.txt", "badge_issue_notes.txt"],

  "/network/hr/policies": [
    "attendance_policy.txt",
    "storage_policy.txt",
    "documentation_guidelines.txt",
  ],

  "/network/hr/exports": [
    "executive_support_export.txt",
    "role_summary_export.txt",
  ],

  "/network/hr/benefits": ["medical_overview.txt", "pto_reference.txt"],

  "/network/hr/archived": [
    "migration_notes_2025.txt",
    "legacy_roster_index.txt",
  ],

  "/network/facilities": [
    "maps",
    "maintenance",
    "relocation",
    "access_logs",
    "vendor_docs",
    "readme.txt",
  ],

  "/network/facilities/maps": [
    "building_map.txt",
    "floor3_rooms.txt",
    "lab_wing_c_map.txt",
  ],

  "/network/facilities/maintenance": [
    "current_tasks.txt",
    "service_windows.txt",
    "cabinet_inventory.txt",
  ],

  "/network/facilities/relocation": [
    "floor3_reassignments.txt",
    "office_changes_q1.txt",
    "move_request_backlog.txt",
    "archive",
  ],

  "/network/facilities/relocation/archive": [
    "q4_2025_reassignments.txt",
    "temp_move_sheet.doc",
  ],

  "/network/facilities/access_logs": [
    "badge_issues.txt",
    "reader_replacements.txt",
  ],

  "/network/facilities/vendor_docs": [
    "vendor_contacts.txt",
    "move_support_contract.txt",
  ],

  "/network/archives": ["2024", "2025", "2026", "legacy_exports.txt"],

  "/network/archives/2024": ["EMPTY_PLACEHOLDER.txt"],

  "/network/archives/2025": ["facility_moves_2025.txt", "admin_handoff_q3.txt"],

  "/network/archives/2026": [
    "q1_transition_notes.txt",
    "executive_support_refresh.txt",
  ],

  "/network/temp": [],
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

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/2026_week_09/elevator_override.txt":
      ["Elevator Maintenance Override", "Week 09", "", "Override Code: 1924"],

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/2026_week_10/elevator_override.txt":
      ["Elevator Maintenance Override", "Week 10", "", "Override Code: 6401"],

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

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/archive/2025_week_52/elevator_override.txt":
      ["Elevator Maintenance Override", "Week 52", "", "Override Code: 7718"],

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/archive/2025_week_51/elevator_override.txt":
      ["Elevator Maintenance Override", "Week 51", "", "Override Code: 1142"],

    "/home/jcarter/saved_notes/network/maintenance/info/elevators/weekly_passcodes/archive/2025_week_50/elevator_override.txt":
      ["Elevator Maintenance Override", "Week 50", "", "Override Code: 9055"],

    "/home/mporter/Desktop/welcome.txt": [
      "Admin Workstation",
      "",
      "Temporary files only.",
    ],

    "/home/mporter/Desktop/calendar.txt": [
      "Calendar Notes",
      "",
      "Executive schedule handled externally.",
    ],

    "/home/mporter/Desktop/admin_tool.exe": null,

    "/home/mporter/Documents/notes.txt": [
      "Notes",
      "",
      "Some records were moved during system migration.",
    ],

    "/home/mporter/Documents/handoff.txt": [
      "Handoff",
      "",
      "HR exports may be incomplete.",
    ],

    "/home/mporter/Documents/admin/handoff_notes.txt": [
      "Handoff Notes",
      "",
      "Executive office assignments were updated recently.",
      "Some records were left incomplete during migration.",
    ],

    "/home/mporter/Documents/admin/visitor_schedule.doc": [
      "Visitor Schedule",
      "",
      "Placeholder visitor entries.",
      "Nothing directly useful yet.",
    ],

    "/home/mporter/Documents/admin/temp_maintenance.txt": [
      "Temp Maintenance Notes",
      "",
      "Had to override elevator during relocation work.",
      "Facilities gave me the current rotation code.",
      "",
      `Override Code: ${state.elevatorCode}`,
      "",
      "Need to delete this after everything settles.",
    ],

    "/home/mporter/Documents/personnel/archived/assistant_roster.doc": [
      "Assistant Roster",
      "",
      "Names omitted in exported copy.",
      "Cross-reference with relocation materials if needed.",
    ],

    "/home/mporter/Documents/hr_exports/intake/archive/executive/personnel_profile.doc":
      [
        "Personnel Profile",
        "Target Name: [REDACTED]",
        "Department: Executive Operations",
        "Office Number: _____",
        "Assistant Notes:",
        "Profile incomplete. See archived support docs.",
      ],

    "/home/mporter/Downloads/readme.txt": [
      "Downloads Folder",
      "",
      "Clean weekly.",
    ],

    "/home/mporter/harvest/personnel/intake/archive/executive/personnel_profile.doc":
      [
        "Personnel Profile",
        "Target Name: [REDACTED]",
        "Department: Executive Operations",
        "Office Number: _____",
        "Assistant Notes:",
        "Profile incomplete. See archived support docs.",
      ],

    "/home/mporter/harvest/personnel/intake/archive/executive/assistant_summary.txt":
      [
        "Assistant Summary",
        "",
        "Personnel packet assembled from HR and executive support records.",
      ],

    "/home/mporter/harvest/personnel/intake/archive/executive/contacts.doc": [
      "Executive Contacts",
      "",
      "Assistant-facing export copy.",
      "Several location fields omitted from this view.",
    ],

    "/network/readme.txt": [
      "Network Share",
      "",
      "Mounted shared volume for internal departments.",
      "Some folders are read-only snapshots.",
    ],

    "/network/login_banner.txt": [
      "NOTICE",
      "Access to this network share is monitored.",
      "Do not store local-only materials in public folders.",
    ],

    "/network/shared/readme.txt": [
      "Shared Folder Notes",
      "",
      "General files available to most internal users.",
    ],

    "/network/shared/mount_status.txt": [
      "Mount Status",
      "",
      "shared      OK",
      "departments OK",
      "hr          OK",
      "facilities  OK",
      "archives    OK",
      "temp        OK",
    ],

    "/network/shared/public/company_holidays.txt": [
      "Company Holidays",
      "",
      "- New Year's Day",
      "- Memorial Day",
      "- Independence Day",
      "- Labor Day",
      "- Thanksgiving",
      "- Winter Break",
    ],

    "/network/shared/public/expense_template.doc": [
      "Expense Template",
      "",
      "Use current reimbursement codes only.",
    ],

    "/network/shared/public/office_map_reference.txt": [
      "Office Map Reference",
      "",
      "For detailed room changes refer to Facilities relocation records.",
    ],

    "/network/shared/public/badge_request_form.doc": [
      "Badge Request Form",
      "",
      "Submit completed forms to Security and HR.",
    ],

    "/network/shared/public/viewer.exe": null,

    "/network/shared/forms/visitor_request.doc": [
      "Visitor Request",
      "",
      "Requires escort and desk approval.",
    ],

    "/network/shared/forms/supply_restock_form.doc": [
      "Supply Restock Form",
      "",
      "Use cabinet ID if known.",
    ],

    "/network/shared/forms/move_request.doc": [
      "Move Request",
      "",
      "Facilities approval required for office relocation.",
    ],

    "/network/shared/forms/conference_room_request.doc": [
      "Conference Room Request",
      "",
      "Recurring reservations must be approved weekly.",
    ],

    "/network/shared/templates/memo_template.doc": [
      "Memo Template",
      "",
      "Standard internal memo format.",
    ],

    "/network/shared/templates/handoff_template.txt": [
      "Handoff Template",
      "",
      "Owner:",
      "Status:",
      "Next action:",
      "Known blockers:",
    ],

    "/network/shared/templates/project_stub.txt": [
      "Project Stub",
      "",
      "Name:",
      "Scope:",
      "Owner:",
      "Dependencies:",
    ],

    "/network/shared/printers/driver_readme.txt": [
      "Printer Driver Notes",
      "",
      "Badge printer drivers are managed separately.",
    ],

    "/network/shared/printers/badge_printer.exe": null,

    "/network/shared/printers/floor3_queue_status.txt": [
      "Queue Status",
      "",
      "Floor 3 copier queue stable.",
      "Badge printer queue intermittent.",
    ],

    "/network/departments/admin/handoff_notes.txt": [
      "Admin Handoff Notes",
      "",
      "Executive support files were split during migration.",
      "Location fields may be blank in copied exports.",
      "Facilities retained final office assignments.",
    ],

    "/network/departments/admin/office_move_list.txt": [
      "Office Move List",
      "",
      "Most Q1 changes completed.",
      "A few specialist assignments were routed through Facilities.",
    ],

    "/network/departments/admin/desk_assignments_legacy.doc": [
      "Legacy Desk Assignments",
      "",
      "Outdated after floor reorg.",
      "Do not use for current room lookups.",
    ],

    "/network/departments/admin/admin_tool.exe": null,

    "/network/departments/admin/exports/assistant_contacts.txt": [
      "Assistant Contacts",
      "",
      "Support desk A",
      "Support desk B",
      "Travel desk",
      "Scheduling desk",
    ],

    "/network/departments/admin/exports/room_labels_q1.txt": [
      "Room Labels Q1",
      "",
      "Multiple label requests completed for Lab Wing C.",
    ],

    "/network/departments/admin/exports/support_copy.doc": [
      "Support Copy",
      "",
      "Omitted sensitive fields from exported copy.",
    ],

    "/network/departments/admin/archive_old/2025_move_notes.txt": [
      "2025 Move Notes",
      "",
      "Old transition notes retained for reference.",
    ],

    "/network/departments/admin/archive_old/2025_support_roster.txt": [
      "2025 Support Roster",
      "",
      "Legacy support assignments.",
    ],

    "/network/departments/executive/readme.txt": [
      "Executive Department Share",
      "",
      "Contains support-side working documents.",
    ],

    "/network/departments/executive/support/assistant_matrix.txt": [
      "Assistant Matrix",
      "",
      "Specialized staff support rotated last quarter.",
      "Final room placements were confirmed after relocation wrap-up.",
    ],

    "/network/departments/executive/support/relocation_summary.txt": [
      "Relocation Summary",
      "",
      "Executive support references were updated after Facilities signoff.",
      "Some exported personnel packets still show blank office fields.",
      "See /network/facilities/relocation/office_changes_q1.txt for final assignments.",
    ],

    "/network/departments/executive/support/visitor_pref.doc": [
      "Visitor Preferences",
      "",
      "Front desk copy only.",
    ],

    "/network/departments/executive/travel/travel_policy.txt": [
      "Travel Policy",
      "",
      "Use current booking codes.",
    ],

    "/network/departments/executive/travel/pending_itineraries.txt": [
      "Pending Itineraries",
      "",
      "Nothing finalized.",
    ],

    "/network/departments/executive/scheduling/calendar_export.txt": [
      "Calendar Export",
      "",
      "Room bookings mirrored nightly.",
    ],

    "/network/departments/executive/scheduling/room_priorities.txt": [
      "Room Priorities",
      "",
      "Priority conference spaces reserved in advance.",
    ],

    "/network/departments/research/staffing_overview.txt": [
      "Research Staffing Overview",
      "",
      "Several researchers remain assigned to Lab Wing C.",
    ],

    "/network/departments/research/project_assignments.doc": [
      "Project Assignments",
      "",
      "Project and room mappings partially redacted in shared copy.",
    ],

    "/network/departments/research/lab_access_notes.txt": [
      "Lab Access Notes",
      "",
      "After-hours work remains common among senior staff.",
    ],

    "/network/departments/research/restricted/EMPTY_PLACEHOLDER.txt": [
      "Restricted",
      "",
      "No accessible files in this view.",
    ],

    "/network/departments/research/old/lab_reorg_2025.txt": [
      "Lab Reorg 2025",
      "",
      "Pre-dates current room assignments.",
    ],

    "/network/departments/research/old/legacy_workstation_map.txt": [
      "Legacy Workstation Map",
      "",
      "Several IDs no longer current.",
    ],

    "/network/departments/engineering/deploy_notes.txt": [
      "Deploy Notes",
      "",
      "Nothing relevant to room assignments.",
    ],

    "/network/departments/engineering/asset_registry.txt": [
      "Asset Registry",
      "",
      "Diagnostic workstations updated weekly.",
    ],

    "/network/departments/engineering/tools/diag.exe": null,
    "/network/departments/engineering/tools/packet_viewer.exe": null,

    "/network/departments/engineering/tools/readme.txt": [
      "Tools Readme",
      "",
      "Engineering binaries cannot be run from this shell.",
    ],

    "/network/departments/security/badge_audit.txt": [
      "Badge Audit",
      "",
      "Badge holders must keep current room information in approved systems only.",
    ],

    "/network/departments/security/escort_policy.txt": [
      "Escort Policy",
      "",
      "Visitors beyond lobby require escort.",
    ],

    "/network/departments/security/incident_rollup.txt": [
      "Incident Rollup",
      "",
      "No major security incidents listed.",
    ],

    "/network/departments/facilities/moves/floor3_reassignments.txt": [
      "Floor 3 Reassignments",
      "",
      "Multiple room swaps completed after wing consolidation.",
      "Check office_changes_q1.txt for finalized current office assignments.",
    ],

    "/network/departments/facilities/moves/office_changes_q1.txt": [
      "Office Changes Q1",
      "",
      "Lab Wing C updates:",
      "- Admin overflow moved to 3B-742",
      "- Shared support room moved to 3B-755",
      "- Dr. Elias V. Harker reassigned to office 3B-771",
    ],

    "/network/departments/facilities/moves/staging_notes.txt": [
      "Staging Notes",
      "",
      "Temporary labels were removed after final room signoff.",
    ],

    "/network/departments/facilities/maintenance/door_service_log.txt": [
      "Door Service Log",
      "",
      "Routine service only.",
    ],

    "/network/departments/facilities/maintenance/elevator_service_windows.txt":
      [
        "Elevator Service Windows",
        "",
        "Monday 04:00 reserved for maintenance resets.",
      ],

    "/network/departments/facilities/maintenance/room_signage_replacements.txt":
      [
        "Room Signage Replacements",
        "",
        "Several Lab Wing C signs reprinted after Q1 relocation.",
      ],

    "/network/departments/facilities/maps/wing_directory.txt": [
      "Wing Directory",
      "",
      "3B-700 series rooms occupy Lab Wing C.",
    ],

    "/network/departments/facilities/maps/lab_wing_c_notes.txt": [
      "Lab Wing C Notes",
      "",
      "Updated room list maintained by Facilities.",
    ],

    "/network/departments/facilities/vendors/vendor_list.txt": [
      "Vendor List",
      "",
      "Move support and signage vendors listed here.",
    ],

    "/network/departments/facilities/vendors/move_support_contacts.txt": [
      "Move Support Contacts",
      "",
      "Facilities handles final room notices.",
    ],

    "/network/ops/readme.txt": [
      "Ops Share",
      "",
      "Operational support materials only.",
    ],

    "/network/ops/handoff/night_shift_summary.txt": [
      "Night Shift Summary",
      "",
      "No unusual network activity.",
    ],

    "/network/ops/handoff/pending_followups.txt": [
      "Pending Followups",
      "",
      "Facilities share remains mounted.",
    ],

    "/network/ops/relay/mounts.txt": [
      "Mounted Shares",
      "",
      "/network/shared",
      "/network/departments",
      "/network/hr",
      "/network/facilities",
      "/network/archives",
    ],

    "/network/ops/relay/service_hosts.txt": [
      "Service Hosts",
      "",
      "ops-relay-1",
      "ops-relay-2",
      "fileshare-core",
    ],

    "/network/ops/watchfloor/camera_status.txt": [
      "Camera Status",
      "",
      "Most cameras operational.",
    ],

    "/network/ops/watchfloor/door_status.txt": [
      "Door Status",
      "",
      "Service corridor reader intermittent.",
    ],

    "/network/hr/onboarding/new_hire_packet.txt": [
      "New Hire Packet",
      "",
      "Standard onboarding references.",
    ],

    "/network/hr/onboarding/badge_issue_notes.txt": [
      "Badge Issue Notes",
      "",
      "Badge issuance handled jointly with Security.",
    ],

    "/network/hr/policies/attendance_policy.txt": [
      "Attendance Policy",
      "",
      "Standard attendance requirements apply.",
    ],

    "/network/hr/policies/storage_policy.txt": [
      "Storage Policy",
      "",
      "Local-only storage is prohibited for official records.",
    ],

    "/network/hr/policies/documentation_guidelines.txt": [
      "Documentation Guidelines",
      "",
      "Project documentation should be current and complete.",
    ],

    "/network/hr/exports/executive_support_export.txt": [
      "Executive Support Export",
      "",
      "Some office fields intentionally omitted from shared export.",
    ],

    "/network/hr/exports/role_summary_export.txt": [
      "Role Summary Export",
      "",
      "High-level position summaries only.",
    ],

    "/network/hr/benefits/medical_overview.txt": [
      "Medical Overview",
      "",
      "Standard benefits reference.",
    ],

    "/network/hr/benefits/pto_reference.txt": [
      "PTO Reference",
      "",
      "See current handbook for accrual details.",
    ],

    "/network/hr/archived/migration_notes_2025.txt": [
      "Migration Notes 2025",
      "",
      "Some records were copied without full field parity.",
    ],

    "/network/hr/archived/legacy_roster_index.txt": [
      "Legacy Roster Index",
      "",
      "Historic record index only.",
    ],

    "/network/facilities/readme.txt": [
      "Facilities Share",
      "",
      "Maps, relocation notes, maintenance schedules, and vendor references.",
    ],

    "/network/facilities/maps/building_map.txt": [
      "Building Map",
      "",
      "Floor 3 contains east offices, service hall, and Lab Wing C.",
    ],

    "/network/facilities/maps/floor3_rooms.txt": [
      "Floor 3 Rooms",
      "",
      "700 series offices grouped under 3B wing layout.",
    ],

    "/network/facilities/maps/lab_wing_c_map.txt": [
      "Lab Wing C Map",
      "",
      "Updated after room reassignments.",
      "3B-771 marked occupied.",
    ],

    "/network/facilities/maintenance/current_tasks.txt": [
      "Current Tasks",
      "",
      "Replace signage in Lab Wing C.",
      "Confirm room label alignment after final move cycle.",
    ],

    "/network/facilities/maintenance/service_windows.txt": [
      "Service Windows",
      "",
      "Monday 04:00 reserved maintenance period.",
    ],

    "/network/facilities/maintenance/cabinet_inventory.txt": [
      "Cabinet Inventory",
      "",
      "Maintenance stock only.",
    ],

    "/network/facilities/relocation/floor3_reassignments.txt": [
      "Floor 3 Reassignments",
      "",
      "Post-consolidation moves completed.",
      "Support copies may still show blanks.",
    ],

    "/network/facilities/relocation/office_changes_q1.txt": [
      "Office Changes Q1",
      "",
      "Finalized assignments:",
      "- 3B-742 reassigned to admin overflow",
      "- 3B-755 reassigned to shared executive support",
      "- 3B-771 assigned to Dr. Elias V. Harker",
    ],

    "/network/facilities/relocation/move_request_backlog.txt": [
      "Move Request Backlog",
      "",
      "Most pending moves closed.",
    ],

    "/network/facilities/relocation/archive/q4_2025_reassignments.txt": [
      "Q4 2025 Reassignments",
      "",
      "Older move cycle. Superseded by Q1 updates.",
    ],

    "/network/facilities/relocation/archive/temp_move_sheet.doc": [
      "Temp Move Sheet",
      "",
      "Working copy retained for archive only.",
    ],

    "/network/facilities/access_logs/badge_issues.txt": [
      "Badge Issues",
      "",
      "A few room labels were corrected after move cycle.",
    ],

    "/network/facilities/access_logs/reader_replacements.txt": [
      "Reader Replacements",
      "",
      "Nothing directly relevant to office locations.",
    ],

    "/network/facilities/vendor_docs/vendor_contacts.txt": [
      "Vendor Contacts",
      "",
      "Move and signage vendors on file.",
    ],

    "/network/facilities/vendor_docs/move_support_contract.txt": [
      "Move Support Contract",
      "",
      "Facilities only.",
    ],

    "/network/archives/legacy_exports.txt": [
      "Legacy Exports",
      "",
      "Historical snapshots may not reflect current office assignments.",
    ],

    "/network/archives/2024/EMPTY_PLACEHOLDER.txt": [
      "Archive Placeholder",
      "",
      "No accessible files in this snapshot.",
    ],

    "/network/archives/2025/facility_moves_2025.txt": [
      "Facility Moves 2025",
      "",
      "Historic move notes retained.",
    ],

    "/network/archives/2025/admin_handoff_q3.txt": [
      "Admin Handoff Q3",
      "",
      "Older support-side notes only.",
    ],

    "/network/archives/2026/q1_transition_notes.txt": [
      "Q1 Transition Notes",
      "",
      "Room changes finalized by Facilities and reflected in relocation records.",
    ],

    "/network/archives/2026/executive_support_refresh.txt": [
      "Executive Support Refresh",
      "",
      "Shared export copies may omit room numbers.",
    ],
  };
}

function rawDirectoryListing(path: string): string[] | null {
  return DIRECTORY_INDEX[path] ?? null;
}

function listForCwd(cwd: string, state?: MissionState): string[] | null {
  const explicit = rawDirectoryListing(cwd);
  if (explicit) return explicit.length ? explicit : ["EMPTY"];

  if (!state) return null;
  if (isDirectory(cwd, state)) return ["EMPTY"];

  return null;
}

function joinPath(base: string, name: string): string {
  return `${base}/${name}`.replace(/\/+/g, "/");
}

function normalizeAbsolutePath(path: string) {
  const parts = path.split("/").filter(Boolean);
  const stack: string[] = [];

  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }

  return `/${stack.join("/")}`;
}

function parentPath(path: string, cwd: string): string | null {
  const sessionHome = getSessionHome(cwd);
  const normalizedPath = normalizeAbsolutePath(path);

  if (normalizedPath === sessionHome) return null;
  if (normalizedPath === "/network") return null;

  const parts = normalizedPath.split("/").filter(Boolean);
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

  const parent = parentPath(path, path);
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
  const sessionHome = getSessionHome(cwd);

  if (!target) return cwd;
  if (target === "~") return sessionHome;

  if (target.startsWith("/")) {
    const absolute = normalizeAbsolutePath(target);
    return pathExists(absolute, state) ? absolute : null;
  }

  if (target === ".") return cwd;

  if (target === "..") {
    if (cwd === sessionHome || cwd === "/network") return cwd;
    const parent = normalizeAbsolutePath(`${cwd}/..`);
    return pathExists(parent, state) ? parent : null;
  }

  const combined = normalizeAbsolutePath(`${cwd}/${target}`);
  return pathExists(combined, state) ? combined : null;
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

function grepSingleFile(
  term: string,
  filePath: string,
  state: MissionState,
): string[] {
  const contents = getFileContents(filePath, state);
  if (!contents || contents.length === 0) return [];

  return contents.filter((line) =>
    line.toLowerCase().includes(term.toLowerCase()),
  );
}

function collectFilesRecursive(path: string, state: MissionState): string[] {
  if (isFile(path, state)) return [path];
  if (!isDirectory(path, state)) return [];

  const listing = listForCwd(path, state);
  if (!listing || listing[0] === "EMPTY") return [];

  const out: string[] = [];

  for (const item of listing) {
    const next = joinPath(path, item);
    if (isFile(next, state)) {
      out.push(next);
    } else if (isDirectory(next, state)) {
      out.push(...collectFilesRecursive(next, state));
    }
  }

  return out;
}

function runGrep(
  raw: string,
  state: MissionState,
  cwd: string,
): TerminalCommandResult | null {
  const trimmed = norm(raw);
  const parts = trimmed.split(" ").filter(Boolean);

  if (parts[0]?.toLowerCase() !== "grep") return null;

  const isRecursive = parts[1] === "-r";

  if (isRecursive) {
    if (parts.length < 3) {
      return {
        handled: true,
        ok: false,
        advanced: false,
        terminalOut: ["grep: missing search term"],
        handlerOut: [],
        nextState: state,
      };
    }

    const searchTerm = parts[2].replace(/^["']|["']$/g, "");
    const targetRaw = parts.slice(3).join(" ").trim() || ".";
    const resolvedTarget = resolvePathFromCwd(cwd, targetRaw, state);

    if (!resolvedTarget) {
      return {
        handled: true,
        ok: false,
        advanced: false,
        terminalOut: [`grep: ${targetRaw}: No such file or directory`],
        handlerOut: [],
        nextState: state,
      };
    }

    const files = collectFilesRecursive(resolvedTarget, state);
    const matchesOut: string[] = [];

    for (const filePath of files) {
      const matches = grepSingleFile(searchTerm, filePath, state);
      for (const line of matches) {
        matchesOut.push(`${filePath}:${line}`);
      }
    }

    return {
      handled: true,
      ok: matchesOut.length > 0,
      advanced: false,
      terminalOut: matchesOut.length
        ? matchesOut
        : [`grep: no matches for ${searchTerm}`],
      handlerOut: [],
      nextState: state,
    };
  }

  if (parts.length < 3) {
    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: ["grep: invalid syntax"],
      handlerOut: [],
      nextState: state,
    };
  }

  const searchTerm = parts[1].replace(/^["']|["']$/g, "");
  const targetRaw = parts.slice(2).join(" ").trim();
  const filePath = resolveFilePath(cwd, targetRaw, state);

  if (!filePath) {
    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: [`grep: ${targetRaw}: No such file or directory`],
      handlerOut: [],
      nextState: state,
    };
  }

  const matchesOut = grepSingleFile(searchTerm, filePath, state);

  return {
    handled: true,
    ok: matchesOut.length > 0,
    advanced: false,
    terminalOut: matchesOut.length
      ? matchesOut
      : [`grep: no matches for ${searchTerm}`],
    handlerOut: [],
    nextState: state,
  };
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

  if (matches(raw, "help", mode)) {
    return {
      handled: true,
      ok: true,
      advanced: false,
      terminalOut: [
        "Available commands:",
        "help",
        "pwd",
        "ls",
        "cd <dir>",
        "cd ..",
        "cat <file>",
        "grep <term> <file>",
        "grep -r <term> .",
        "run <file>",
        "clear",
      ],
      handlerOut: [],
      nextState: state,
    };
  }

  if (matches(raw, "clear", mode)) {
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

  const grepResult = runGrep(raw, state, cwd);
  if (grepResult) {
    return grepResult;
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
      terminalOut: listForCwd(resolved, state) ?? ["EMPTY"],
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
        terminalOut: [`${fileNameFromPath(filePath)}: CANNOT RUN FROM SHELL`],
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
        terminalOut: ["EMPTY"],
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

  if (normLower(raw).startsWith("run ")) {
    const arg = raw.slice(raw.indexOf("run") + 3).trim();
    const filePath = resolveFilePath(cwd, arg, state);

    if (!filePath) {
      return {
        handled: true,
        ok: false,
        advanced: false,
        terminalOut: [`run: ${arg}: No such file`],
        handlerOut: [],
        nextState: state,
      };
    }

    if (isExeFile(filePath)) {
      return {
        handled: true,
        ok: false,
        advanced: false,
        terminalOut: [`${fileNameFromPath(filePath)}: CANNOT RUN FROM SHELL`],
        handlerOut: [],
        nextState: state,
      };
    }

    return {
      handled: true,
      ok: false,
      advanced: false,
      terminalOut: [`${fileNameFromPath(filePath)}: cannot execute`],
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
        terminalOut: [`${fileNameFromPath(maybePath)}: CANNOT RUN FROM SHELL`],
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
        terminalOut: [`./${raw.slice(2)}: No such file or directory`],
        handlerOut: [],
        nextState: state,
      };
    }

    if (isExeFile(filePath)) {
      return {
        handled: true,
        ok: false,
        advanced: false,
        terminalOut: [`${fileNameFromPath(filePath)}: CANNOT RUN FROM SHELL`],
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
  return runSearchShell(norm(input), mode, state, cwd || DEFAULT_TERMINAL_CWD);
}
