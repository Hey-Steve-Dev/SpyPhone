import { runCommandEngine } from "@/lib/commandEngine";
import { useGameStore } from "@/store/useGameStore";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

const HOME_BAR_SPACE = 44;
const IS_NATIVE_DEVICE = Platform.OS === "ios" || Platform.OS === "android";
const PROMPT = "$";
const SCREEN_WIDTH = Dimensions.get("window").width;
const CHIP_GAP = 6;
const CHIP_WIDTH = Math.floor((SCREEN_WIDTH - 16 - CHIP_GAP * 3) / 4);

const TACTICAL_FONT = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

const TERMINAL_KEYBOARD_ALPHA_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["-", "z", "x", "c", "v", "b", "n", "m", ".", "/"],
];

const TERMINAL_KEYBOARD_SYMBOL_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["~", "\\", "|", "_", "=", "$", "*", ":"],
  ["(", ")", "[", "]", "{", "}", "&", ";"],
  ["'", '"', "!", "?", "+", "@", "#"],
];

const BASE_CHIPS = ["ls", "pwd", "grep", "cd .."];

const REAL_COMMANDS = [
  "ls",
  "pwd",
  "cd",
  "cd ..",
  "cat",
  "grep",
  "grep -r",
  "find",
  "sort",
  "uniq",
  "cp",
  "mv",
  "rm",
  "head",
  "tail",
  "less",
  "more",
  "touch",
  "mkdir",
  "rmdir",
  "echo",
  "clear",
  "whoami",
  "hostname",
  "history",
  "wc",
  "cut",
  "sed",
  "awk",
  "tr",
  "xargs",
  "ssh",
  "scp",
  "ping",
  "curl",
  "wget",
  "ps",
  "top",
  "kill",
  "chmod",
  "chown",
  "man",
  "which",
  "whereis",
  "locate",
  "du",
  "df",
  "env",
  "printenv",
  "uname",
  "file",
  "tree",
  "tar",
  "zip",
  "unzip",
];

const READABLE_FILE_EXTENSIONS = [".txt", ".doc"];

type KeyboardMode = "alpha" | "symbols";
type TerminalDifficultyMode = "INTELLIGENT" | "STRICT";
type ChipExpansion = "none" | "cat" | "cd" | "grep";

type ListedEntry = {
  name: string;
  kind: "file" | "dir";
};

type PendingLsCapture = {
  cwd: string;
  startIndex: number;
};

function isReadableFile(name: string) {
  const lower = name.toLowerCase();
  return READABLE_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function inferEntryKind(name: string): "file" | "dir" {
  const trimmed = name.trim();
  if (!trimmed) return "file";
  if (isReadableFile(trimmed)) return "file";

  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot > 0 && lastDot < trimmed.length - 1) {
    return "file";
  }

  return "dir";
}

function parseLsOutput(outputLines: string[]): ListedEntry[] {
  return outputLines
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("Unknown command"))
    .filter((line) => !line.startsWith("Type 'help'"))
    .filter((line) => !line.startsWith("Connected to "))
    .filter((line) => !line.startsWith("/"))
    .map((name) => ({
      name,
      kind: inferEntryKind(name),
    }));
}

function dedupeEntries(entries: ListedEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.kind}:${entry.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function TerminalScreen() {
  const appendTerminalLine = useGameStore((s) => s.appendTerminalLine);
  const clearTerminalLines = useGameStore((s) => s.clearTerminalLines);

  const session = useGameStore((s) => s.terminal.session);
  const setTerminalSession = useGameStore((s) => s.setTerminalSession);

  const lines = useGameStore((s) => s.terminal.lines);
  const dispatchMissionEvent = useGameStore((s) => s.dispatchMissionEvent);

  const terminalLocked = useGameStore((s) => s.terminalLocked);
  const terminalPendingInsert = useGameStore((s) => s.terminalPendingInsert);
  const setTerminalPendingInsert = useGameStore(
    (s) => s.setTerminalPendingInsert,
  );

  const cwd = session.cwd;

  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>("alpha");
  const [shift, setShift] = useState(false);
  const [difficultyMode, setDifficultyMode] =
    useState<TerminalDifficultyMode>("INTELLIGENT");
  const [chipExpansion, setChipExpansion] = useState<ChipExpansion>("none");
  const [inputWasTyped, setInputWasTyped] = useState(false);
  const [listedEntriesByPath, setListedEntriesByPath] = useState<
    Record<string, ListedEntry[]>
  >({});
  const [lastListedCwd, setLastListedCwd] = useState<string | null>(null);
  const inputValueRef = useRef("");
  const selectionRef = useRef({ start: 0, end: 0 });

  const scrollRef = useRef<ScrollView>(null);
  const chipScrollRef = useRef<ScrollView>(null);
  const chipDragStateRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    momentumFrame: 0 as number | null,
  });
  const inputRef = useRef<TextInput>(null);

  const pendingLsCaptureRef = useRef<PendingLsCapture | null>(null);

  const moveRepeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const moveRepeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const deleteRepeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const deleteRepeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const showCustomKeyboard =
    IS_NATIVE_DEVICE && inputFocused && !terminalLocked;

  const activeRows =
    keyboardMode === "alpha"
      ? TERMINAL_KEYBOARD_ALPHA_ROWS
      : TERMINAL_KEYBOARD_SYMBOL_ROWS;

  useEffect(() => {
    inputValueRef.current = input;
  }, [input]);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    setChipExpansion("none");
    setInputWasTyped(false);
    setLastListedCwd(null);
    chipScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [cwd]);

  useEffect(() => {
    const pending = pendingLsCaptureRef.current;
    if (!pending) return;
    if (lines.length <= pending.startIndex) return;

    const newLines = lines.slice(pending.startIndex);
    if (newLines.length === 0) return;

    const capturedOutput: string[] = [];
    let sawLsCommand = false;
    let sawAnythingAfterLs = false;
    let sawOutputAfterLs = false;

    for (const line of newLines) {
      if (line.kind === "cmd") {
        if (!sawLsCommand) {
          if (line.text.trim() === `${PROMPT}ls`) {
            sawLsCommand = true;
          }
          continue;
        }

        // a new command means ls output is finished
        break;
      }

      if (sawLsCommand) {
        sawAnythingAfterLs = true;

        if (line.kind === "out") {
          sawOutputAfterLs = true;
          capturedOutput.push(line.text);
        }
      }
    }

    if (!sawLsCommand) return;

    // do not clear pending yet if only the $ls command has appeared
    // and no output has been rendered yet
    if (!sawAnythingAfterLs) return;

    const parsed = dedupeEntries(parseLsOutput(capturedOutput));

    pendingLsCaptureRef.current = null;

    setListedEntriesByPath((prev) => ({
      ...prev,
      [pending.cwd]: parsed,
    }));
    setLastListedCwd(pending.cwd);
  }, [lines]);

  const currentListedEntries = listedEntriesByPath[cwd] ?? [];
  const hasListedCurrentDir = lastListedCwd === cwd;

  const currentDirectories = useMemo(
    () => currentListedEntries.filter((entry) => entry.kind === "dir"),
    [currentListedEntries],
  );

  const currentReadableFiles = useMemo(
    () => currentListedEntries.filter((entry) => entry.kind === "file"),
    [currentListedEntries],
  );

  function append(kind: "out" | "cmd", text: string) {
    appendTerminalLine(kind, text);
  }

  function focusInput() {
    setTimeout(() => inputRef.current?.focus(), 10);
  }

  function getShiftedAlphaValue(keyValue: string) {
    if (/^[a-z]$/.test(keyValue)) {
      return keyValue.toUpperCase();
    }

    if (keyValue === "-") return "_";
    if (keyValue === ".") return "~";
    if (keyValue === "/") return ":";

    return keyValue;
  }

  function getDisplayValue(keyValue: string) {
    if (keyboardMode === "alpha" && shift) {
      return getShiftedAlphaValue(keyValue);
    }

    return keyValue;
  }

  function insertAtCursor(textToInsert: string) {
    if (terminalLocked) return;

    const start = selection.start ?? input.length;
    const end = selection.end ?? input.length;

    const nextValue = input.slice(0, start) + textToInsert + input.slice(end);
    const nextCaret = start + textToInsert.length;

    setInput(nextValue);
    setSelection({ start: nextCaret, end: nextCaret });
    inputValueRef.current = nextValue;
    selectionRef.current = { start: nextCaret, end: nextCaret };

    if (shift && keyboardMode === "alpha") {
      setShift(false);
    }

    focusInput();
  }

  function setInputAndCaret(nextValue: string) {
    setInput(nextValue);
    setSelection({ start: nextValue.length, end: nextValue.length });
    inputValueRef.current = nextValue;
    selectionRef.current = { start: nextValue.length, end: nextValue.length };
    focusInput();
  }

  function backspaceAtCursor() {
    if (terminalLocked) return;

    const currentInput = inputValueRef.current;
    const currentSelection = selectionRef.current;

    const start = currentSelection.start ?? currentInput.length;
    const end = currentSelection.end ?? currentInput.length;

    if (start !== end) {
      const nextValue = currentInput.slice(0, start) + currentInput.slice(end);
      setInput(nextValue);
      setSelection({ start, end: start });
      inputValueRef.current = nextValue;
      selectionRef.current = { start, end: start };
      focusInput();
      return;
    }

    if (start <= 0) return;

    const nextValue =
      currentInput.slice(0, start - 1) + currentInput.slice(end);
    const nextCaret = start - 1;

    setInput(nextValue);
    setSelection({ start: nextCaret, end: nextCaret });
    inputValueRef.current = nextValue;
    selectionRef.current = { start: nextCaret, end: nextCaret };
    focusInput();
  }

  const moveCursor = useCallback(
    (delta: number) => {
      if (terminalLocked) return;

      setSelection((prev) => {
        const current = prev.start ?? 0;
        const next = Math.max(0, Math.min(input.length, current + delta));
        const nextSelection = { start: next, end: next };
        selectionRef.current = nextSelection;
        return nextSelection;
      });

      focusInput();
    },
    [input.length, terminalLocked],
  );

  function stopMoveRepeat() {
    if (moveRepeatTimeoutRef.current) {
      clearTimeout(moveRepeatTimeoutRef.current);
      moveRepeatTimeoutRef.current = null;
    }

    if (moveRepeatIntervalRef.current) {
      clearInterval(moveRepeatIntervalRef.current);
      moveRepeatIntervalRef.current = null;
    }
  }

  function startMoveRepeat(delta: number) {
    if (terminalLocked) return;

    moveCursor(delta);
    stopMoveRepeat();

    moveRepeatTimeoutRef.current = setTimeout(() => {
      moveRepeatIntervalRef.current = setInterval(() => {
        moveCursor(delta);
      }, 50);
    }, 300);
  }

  function stopDeleteRepeat() {
    if (deleteRepeatTimeoutRef.current) {
      clearTimeout(deleteRepeatTimeoutRef.current);
      deleteRepeatTimeoutRef.current = null;
    }

    if (deleteRepeatIntervalRef.current) {
      clearInterval(deleteRepeatIntervalRef.current);
      deleteRepeatIntervalRef.current = null;
    }
  }

  function startDeleteRepeat() {
    if (terminalLocked) return;

    backspaceAtCursor();
    stopDeleteRepeat();

    deleteRepeatTimeoutRef.current = setTimeout(() => {
      deleteRepeatIntervalRef.current = setInterval(() => {
        backspaceAtCursor();
      }, 50);
    }, 300);
  }

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 0);

    return () => {
      clearTimeout(id);
      stopMoveRepeat();
      stopDeleteRepeat();
    };
  }, [lines]);

  useEffect(() => {
    if (!terminalPendingInsert) return;
    if (terminalLocked) return;

    setInput(terminalPendingInsert);
    setSelection({
      start: terminalPendingInsert.length,
      end: terminalPendingInsert.length,
    });
    inputValueRef.current = terminalPendingInsert;
    selectionRef.current = {
      start: terminalPendingInsert.length,
      end: terminalPendingInsert.length,
    };
    setShift(false);
    focusInput();
    setTerminalPendingInsert(null);
  }, [terminalPendingInsert, terminalLocked, setTerminalPendingInsert]);

  const primaryChips = useMemo(() => {
    if (difficultyMode === "STRICT") return [];

    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    if (inputWasTyped && lower) {
      if (lower === "g") {
        return ["grep -r", "grep"].slice(0, 6);
      }

      const exactMatches = REAL_COMMANDS.filter((cmd) => cmd === lower);
      const startsWithMatches = REAL_COMMANDS.filter(
        (cmd) => cmd.startsWith(lower) && cmd !== lower,
      );
      const includesMatches = REAL_COMMANDS.filter(
        (cmd) =>
          !exactMatches.includes(cmd) &&
          !startsWithMatches.includes(cmd) &&
          cmd.includes(lower),
      );

      const ordered = [
        ...exactMatches,
        ...startsWithMatches,
        ...includesMatches,
      ].slice(0, 6);

      if (ordered.length > 0) {
        return ordered;
      }
    }

    if (!hasListedCurrentDir) {
      return BASE_CHIPS;
    }

    const contextual: string[] = [];

    if (currentDirectories.length > 0) {
      contextual.push("cd");
    }

    if (currentReadableFiles.length > 0) {
      contextual.push("cat");
    }

    contextual.push("grep");
    contextual.push("cd ..");

    return Array.from(new Set(contextual)).slice(0, 4);
  }, [
    difficultyMode,
    input,
    inputWasTyped,
    hasListedCurrentDir,
    currentDirectories,
    currentReadableFiles,
  ]);

  const secondaryChips = useMemo(() => {
    if (difficultyMode === "STRICT") return [];

    if (chipExpansion === "cat") {
      return currentReadableFiles.map((file) => file.name);
    }

    if (chipExpansion === "cd") {
      return currentDirectories.map((dir) => dir.name);
    }

    if (chipExpansion === "grep") {
      return [".", "|", ">", ">>"];
    }

    return [];
  }, [difficultyMode, chipExpansion, currentReadableFiles, currentDirectories]);
  const visibleChips =
    secondaryChips.length > 0 ? secondaryChips : primaryChips;
  function formatChipInsertion(chip: string) {
    if (
      chip === "pwd" ||
      chip === "ls" ||
      chip === "clear" ||
      chip === "whoami" ||
      chip === "hostname" ||
      chip === "history" ||
      chip === "env" ||
      chip === "printenv" ||
      chip === "uname" ||
      chip === "tree" ||
      chip === "top" ||
      chip === "ps"
    ) {
      return chip;
    }

    if (chip === "grep" || chip === "grep -r") {
      return "grep -r ";
    }

    return `${chip} `;
  }

  function applyChip(chip: string) {
    if (terminalLocked) return;

    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    const isReadableFileChip = currentReadableFiles.some(
      (file) => file.name === chip,
    );
    const isDirectoryChip = currentDirectories.some((dir) => dir.name === chip);

    if (isReadableFileChip) {
      setInputAndCaret(`cat ${chip}`);
      setInputWasTyped(false);
      return;
    }

    if (isDirectoryChip) {
      setInputAndCaret(`cd ${chip}`);
      setInputWasTyped(false);
      return;
    }

    if (chip === "." && lower.startsWith("grep")) {
      const spacer = trimmed.endsWith(" ") ? "" : " ";
      setInputAndCaret(`${trimmed}${spacer}.`);
      setInputWasTyped(false);
      return;
    }

    if (
      (chip === "|" || chip === ">" || chip === ">>") &&
      lower.startsWith("grep")
    ) {
      const spacer = trimmed.endsWith(" ") ? "" : " ";
      setInputAndCaret(`${trimmed}${spacer}${chip} `);
      setInputWasTyped(false);
      return;
    }

    if (chip === "cat") {
      setInputAndCaret("cat ");
      setChipExpansion("cat");
      setInputWasTyped(false);
      return;
    }

    if (chip === "cd") {
      setInputAndCaret("cd ");
      setChipExpansion("cd");
      setInputWasTyped(false);
      return;
    }

    if (chip === "grep" || chip === "grep -r") {
      setInputAndCaret("grep -r ");
      setChipExpansion("grep");
      setInputWasTyped(false);
      return;
    }

    if (chip === "cd ..") {
      setInputAndCaret("cd ..");
      setChipExpansion("none");
      setInputWasTyped(false);
      return;
    }

    if (chip === "ls") {
      setInputAndCaret("ls");
      setChipExpansion("none");
      setInputWasTyped(false);
      return;
    }

    if (chip === "pwd") {
      setInputAndCaret("pwd");
      setChipExpansion("none");
      setInputWasTyped(false);
      return;
    }

    setInputAndCaret(formatChipInsertion(chip));
    setChipExpansion("none");
    setInputWasTyped(false);
  }
  function getWebChipDragHandlers() {
    if (Platform.OS !== "web") return {};

    function stopMomentum() {
      const state = chipDragStateRef.current;
      if (state.momentumFrame != null) {
        cancelAnimationFrame(state.momentumFrame);
        state.momentumFrame = null;
      }
    }

    function startMomentum(node: any) {
      stopMomentum();

      const step = () => {
        const state = chipDragStateRef.current;

        if (Math.abs(state.velocity) < 0.1) {
          state.momentumFrame = null;
          return;
        }

        node.scrollLeft -= state.velocity;
        state.velocity *= 0.95;
        state.momentumFrame = requestAnimationFrame(step);
      };

      chipDragStateRef.current.momentumFrame = requestAnimationFrame(step);
    }

    return {
      onMouseDown: (e: any) => {
        const target = chipScrollRef.current as any;
        if (!target?.getScrollableNode) return;

        const node = target.getScrollableNode();
        stopMomentum();

        chipDragStateRef.current = {
          ...chipDragStateRef.current,
          isDown: true,
          startX: e.clientX,
          scrollLeft: node.scrollLeft,
          lastX: e.clientX,
          lastTime: performance.now(),
          velocity: 0,
        };
      },

      onMouseMove: (e: any) => {
        const target = chipScrollRef.current as any;
        if (!target?.getScrollableNode) return;

        const state = chipDragStateRef.current;
        if (!state.isDown) return;

        const node = target.getScrollableNode();
        const dx = e.clientX - state.startX;
        node.scrollLeft = state.scrollLeft - dx;

        const now = performance.now();
        const dt = now - state.lastTime;
        if (dt > 0) {
          state.velocity = ((e.clientX - state.lastX) / dt) * 16;
        }

        state.lastX = e.clientX;
        state.lastTime = now;
      },

      onMouseUp: () => {
        const target = chipScrollRef.current as any;
        if (!target?.getScrollableNode) return;

        const node = target.getScrollableNode();
        const state = chipDragStateRef.current;
        state.isDown = false;
        startMomentum(node);
      },

      onMouseLeave: () => {
        const target = chipScrollRef.current as any;
        if (!target?.getScrollableNode) return;

        const state = chipDragStateRef.current;
        if (!state.isDown) return;

        const node = target.getScrollableNode();
        state.isDown = false;
        startMomentum(node);
      },
    };
  }
  async function runCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd || terminalLocked) return;

    if (cmd.toLowerCase() === "ls") {
      pendingLsCaptureRef.current = {
        cwd,
        startIndex: lines.length,
      };
    } else {
      pendingLsCaptureRef.current = null;
    }

    append("cmd", `${PROMPT}${cmd}`);

    setInput("");
    setInputWasTyped(false);
    setChipExpansion("none");
    setSelection({ start: 0, end: 0 });
    inputValueRef.current = "";
    selectionRef.current = { start: 0, end: 0 };
    setShift(false);
    chipScrollRef.current?.scrollTo({ x: 0, animated: false });
    focusInput();

    if (cmd.toLowerCase() === "clear") {
      clearTerminalLines();
      return;
    }

    const missionResult = (await dispatchMissionEvent({
      type: "TERMINAL_COMMAND",
      input: cmd,
      cwd,
    })) ?? { handled: false };

    if (!missionResult.handled) {
      const res = runCommandEngine(cmd, session);

      setTerminalSession(res.nextSession);
      res.output.forEach((line) => append("out", line));

      if (res.launchApp) {
        const store = useGameStore.getState() as typeof useGameStore extends {
          getState: () => infer T;
        }
          ? T
          : never;

        if (
          "setActiveApp" in store &&
          typeof store.setActiveApp === "function"
        ) {
          const appMap: Record<string, string> = {
            messages: "messages",
            terminal: "terminal",
            tunnel: "tunnel",
            notes: "notes",
            mask: "mask",
            cameras: "cameras",
            network: "network",
            echoscan: "echoScan",
            jammer: "jammer",
            log: "log",
            vault: "vault",
            rfscanner: "rfScanner",
          };

          const normalized = res.launchApp.replace(/[\s_-]/g, "").toLowerCase();
          const targetApp = appMap[normalized];

          if (targetApp) {
            store.setActiveApp(targetApp);
          }
        }
      }
    }
  }
  const webChipDragHandlers = getWebChipDragHandlers();
  function renderKeyboardRow(row: string[], rowIndex: number) {
    return (
      <View
        key={`${keyboardMode}-row-${rowIndex}`}
        style={[
          styles.keyboardRow,
          row.length <= 8 && styles.keyboardRowNarrow,
          row.length === 9 && styles.keyboardRowMedium,
        ]}
      >
        {row.map((keyValue) => {
          const displayValue = getDisplayValue(keyValue);

          return (
            <Pressable
              key={`${keyboardMode}-${keyValue}`}
              onPress={() => insertAtCursor(displayValue)}
              style={({ pressed }) => [
                styles.key,
                styles.charKey,
                pressed && styles.keyPressed,
              ]}
            >
              <Text style={styles.keyText}>{displayValue}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>TERMINAL</Text>
          <Text style={styles.headerSub}>LOCAL SHELL</Text>
        </View>

        <View style={styles.modeToggleWrap}>
          <Text style={styles.modeToggleLabel}>
            {difficultyMode === "INTELLIGENT" ? "INTELLIGENT" : "STRICT"}
          </Text>

          <Switch
            value={difficultyMode === "INTELLIGENT"}
            onValueChange={(value) => {
              setDifficultyMode(value ? "INTELLIGENT" : "STRICT");
            }}
            disabled={terminalLocked}
            trackColor={{
              false: "rgba(255,255,255,0.18)",
              true: "rgba(124,255,158,0.35)",
            }}
            thumbColor={
              difficultyMode === "INTELLIGENT" ? "#7CFF9E" : "#d4d4d4"
            }
          />
        </View>
      </View>

      <View style={styles.screen}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {lines.map((l) => (
            <Text
              key={l.id}
              style={[
                styles.line,
                l.kind === "cmd" ? styles.lineCmd : styles.lineOut,
              ]}
              selectable
            >
              {l.text}
            </Text>
          ))}
        </ScrollView>

        <View style={styles.inputDock}>
          {difficultyMode === "INTELLIGENT" && (
            <View style={styles.chipRail}>
              <ScrollView
                ref={chipScrollRef}
                horizontal
                style={styles.chipScroll}
                contentContainerStyle={styles.chipScrollContent}
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                {...webChipDragHandlers}
              >
                {visibleChips.map((chip, index) => {
                  const showingExpanded = secondaryChips.length > 0;

                  return (
                    <Pressable
                      key={`${showingExpanded ? "secondary" : "primary"}-${chip}-${index}`}
                      onPress={() => applyChip(chip)}
                      style={({ pressed }) => [
                        styles.chip,
                        styles.chipQuarter,
                        pressed && styles.chipPressed,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={styles.chipText}
                      >
                        {chip}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <Pressable
            onPress={focusInput}
            style={({ pressed }) => [
              styles.termInput,
              pressed && styles.termInputPressed,
              terminalLocked && styles.termInputDisabled,
            ]}
          >
            <Text style={styles.prompt}>{PROMPT}</Text>

            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={(value) => {
                setInput(value);
                setInputWasTyped(true);

                const lower = value.trim().toLowerCase();

                if (lower === "cat" || lower.startsWith("cat ")) {
                  setChipExpansion("cat");
                  return;
                }

                if (lower === "cd" || lower.startsWith("cd ")) {
                  setChipExpansion("cd");
                  return;
                }

                if (
                  lower === "grep" ||
                  lower === "g" ||
                  lower.startsWith("grep ")
                ) {
                  setChipExpansion("grep");
                  return;
                }

                setChipExpansion("none");
              }}
              selection={selection}
              onSelectionChange={(e) => {
                const nextSelection = e.nativeEvent.selection;
                setSelection(nextSelection);
                selectionRef.current = nextSelection;
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              contextMenuHidden={false}
              placeholder="type command..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.inputCmd}
              onSubmitEditing={() => {
                void runCommand(input);
              }}
              returnKeyType="go"
              editable={!terminalLocked}
              showSoftInputOnFocus={!IS_NATIVE_DEVICE}
              caretHidden={false}
              selectionColor="#00e0ff"
              cursorColor="#00e0ff"
              blurOnSubmit={false}
            />

            <Pressable
              focusable={false}
              onPress={() => {
                void runCommand(input);
              }}
              style={({ pressed }) => [
                styles.inputRunBtn,
                terminalLocked && styles.inputRunBtnDisabled,
                pressed && styles.inputRunBtnPressed,
              ]}
              disabled={terminalLocked}
            >
              <Text style={styles.inputRunBtnTxt}>↻</Text>
            </Pressable>
          </Pressable>

          {showCustomKeyboard && (
            <View style={styles.keyboardWrap}>
              <View style={styles.keyboardModeRow}>
                <Pressable
                  onPress={() => {
                    setKeyboardMode("alpha");
                    setShift(false);
                  }}
                  style={({ pressed }) => [
                    styles.modeKey,
                    keyboardMode === "alpha" && styles.modeKeyActive,
                    pressed && styles.keyPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeKeyText,
                      keyboardMode === "alpha" && styles.modeKeyTextActive,
                    ]}
                  >
                    ABC
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setKeyboardMode("symbols");
                    setShift(false);
                  }}
                  style={({ pressed }) => [
                    styles.modeKey,
                    keyboardMode === "symbols" && styles.modeKeyActive,
                    pressed && styles.keyPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeKeyText,
                      keyboardMode === "symbols" && styles.modeKeyTextActive,
                    ]}
                  >
                    #+=
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => moveCursor(-1)}
                  onPressIn={() => startMoveRepeat(-1)}
                  onPressOut={stopMoveRepeat}
                  onLongPress={() => {}}
                  delayLongPress={300}
                  style={({ pressed }) => [
                    styles.modeKey,
                    styles.utilityKey,
                    pressed && styles.keyPressed,
                  ]}
                >
                  <Text style={styles.modeKeyText}>◀</Text>
                </Pressable>

                <Pressable
                  onPress={() => moveCursor(1)}
                  onPressIn={() => startMoveRepeat(1)}
                  onPressOut={stopMoveRepeat}
                  onLongPress={() => {}}
                  delayLongPress={300}
                  style={({ pressed }) => [
                    styles.modeKey,
                    styles.utilityKey,
                    pressed && styles.keyPressed,
                  ]}
                >
                  <Text style={styles.modeKeyText}>▶</Text>
                </Pressable>
              </View>

              <View style={styles.keyboardRows}>
                {activeRows.map((row, rowIndex) =>
                  renderKeyboardRow(row, rowIndex),
                )}
              </View>

              <View style={styles.keyboardBottomRow}>
                <Pressable
                  onPress={() => {
                    if (keyboardMode === "alpha") {
                      setShift((prev) => !prev);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.key,
                    styles.shiftKey,
                    shift && keyboardMode === "alpha" && styles.shiftActive,
                    pressed && styles.keyPressed,
                  ]}
                >
                  <Text style={styles.keyText}>⇧</Text>
                </Pressable>

                <Pressable
                  onPress={() => insertAtCursor(" ")}
                  style={({ pressed }) => [
                    styles.key,
                    styles.spaceKey,
                    pressed && styles.keyPressed,
                  ]}
                >
                  <Text style={styles.keyText}>space</Text>
                </Pressable>

                <Pressable
                  onPress={backspaceAtCursor}
                  onPressIn={startDeleteRepeat}
                  onPressOut={stopDeleteRepeat}
                  onLongPress={() => {}}
                  delayLongPress={300}
                  style={({ pressed }) => [
                    styles.key,
                    styles.deleteKey,
                    pressed && styles.keyPressed,
                  ]}
                >
                  <Text style={styles.keyText}>⌫</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 0,
  },

  header: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "rgba(255,255,255,0.92)",
    fontFamily: TACTICAL_FONT,
    letterSpacing: 1.2,
  },

  headerSub: {
    marginTop: 2,
    fontSize: 11,
    color: "rgba(255,255,255,0.60)",
    fontFamily: TACTICAL_FONT,
    letterSpacing: 1,
  },

  modeToggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },

  modeToggleLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.86)",
    fontFamily: TACTICAL_FONT,
    letterSpacing: 0.8,
  },

  screen: {
    flex: 1,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.55)",
    overflow: "hidden",
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 6,
  },

  line: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: TACTICAL_FONT,
    letterSpacing: 0.4,
  },

  lineOut: {
    color: "#7CFF9E",
  },

  lineCmd: {
    color: "#00e0ff",
  },

  inputDock: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 8 + HOME_BAR_SPACE,
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 6,
  },

  chipRail: {
    width: "100%",
    gap: 6,
  },

  chipScroll: {
    width: "100%",
    ...(Platform.OS === "web"
      ? ({
          cursor: "grab",
        } as any)
      : null),
  },

  chipScrollContent: {
    flexDirection: "row",
    minWidth: "100%",
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },

  chip: {
    height: 34,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  chipPrimary: {
    borderColor: "rgba(124,255,158,0.42)",
    backgroundColor: "rgba(124,255,158,0.14)",
  },

  chipPressed: {
    opacity: 0.82,
  },

  chipText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: TACTICAL_FONT,
    letterSpacing: 0.3,
  },

  chipPrimaryText: {
    color: "#7CFF9E",
  },

  termInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(15,15,15,0.85)",
    paddingLeft: 10,
    paddingRight: 8,
    height: 42,
  },

  termInputPressed: {
    borderColor: "rgba(255,255,255,0.14)",
  },

  termInputDisabled: {
    opacity: 0.7,
  },

  prompt: {
    fontSize: 16,
    color: "#7CFF9E",
    fontFamily: TACTICAL_FONT,
    marginRight: 8,
    fontWeight: "700",
  },

  inputCmd: {
    flex: 1,
    fontSize: 13,
    color: "#00e0ff",
    fontFamily: TACTICAL_FONT,
    paddingVertical: 0,
    paddingHorizontal: 0,
    letterSpacing: 0.3,
  },

  inputRunBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(0,224,255,0.30)",
    backgroundColor: "rgba(0,224,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  inputRunBtnDisabled: {
    opacity: 0.45,
  },

  inputRunBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },

  inputRunBtnTxt: {
    color: "#00e0ff",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 16,
    fontFamily: TACTICAL_FONT,
  },

  keyboardWrap: {
    gap: 4,
    paddingHorizontal: 2,
  },

  keyboardModeRow: {
    flexDirection: "row",
    gap: 4,
  },

  keyboardRows: {
    gap: 4,
  },

  keyboardRow: {
    flexDirection: "row",
    gap: 3,
  },

  keyboardRowMedium: {
    paddingHorizontal: 4,
  },

  keyboardRowNarrow: {
    paddingHorizontal: 8,
  },

  keyboardBottomRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 1,
  },

  key: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  charKey: {
    flex: 1,
    height: 58,
  },

  modeKey: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  utilityKey: {
    flex: 0.82,
  },

  modeKeyActive: {
    backgroundColor: "rgba(124,255,158,0.14)",
    borderColor: "rgba(124,255,158,0.45)",
  },

  modeKeyText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontFamily: TACTICAL_FONT,
  },

  modeKeyTextActive: {
    color: "#7CFF9E",
  },

  keyPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  keyText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: TACTICAL_FONT,
    textTransform: "none",
    letterSpacing: 0.3,
  },

  shiftKey: {
    width: 72,
    height: 40,
  },

  shiftActive: {
    backgroundColor: "rgba(124,255,158,0.18)",
    borderColor: "rgba(124,255,158,0.55)",
  },

  spaceKey: {
    flex: 1,
    height: 40,
  },

  deleteKey: {
    width: 72,
    height: 40,
  },
  chipQuarter: {
    width: 92,
  },
});
