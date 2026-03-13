import PhoneFrame from "@/components/PhoneFrame";
import { runCommandEngine } from "@/lib/commandEngine";
import { useGameStore } from "@/store/useGameStore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const HOME_BAR_SPACE = 44;
const IS_NATIVE_DEVICE = Platform.OS === "ios" || Platform.OS === "android";

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

type KeyboardMode = "alpha" | "symbols";

type MissionDispatchResult = {
  handled: boolean;
  ok: boolean;
  advanced: boolean;
  gated: boolean;
};

const DEFAULT_MISSION_RESULT: MissionDispatchResult = {
  handled: false,
  ok: false,
  advanced: false,
  gated: false,
};

export default function TerminalScreen() {
  const bumpTrace = useGameStore((s) => s.bumpTrace);
  const mission = useGameStore((s) => s.mission);

  const bannerPush = useGameStore((s) => s.bannerPush);
  const bannerOn = useGameStore((s) => s.banner.on);

  const bootGame = useGameStore((s) => s.bootGame);
  const booted = useGameStore((s) => s.booted);
  const terminalLocked = useGameStore((s) => s.terminalLocked);
  const commsConnected = useGameStore((s) => s.commsConnected);

  const cwd = useGameStore((s) => s.terminal.cwd);
  const lines = useGameStore((s) => s.terminal.lines);
  const appendTerminalLine = useGameStore((s) => s.appendTerminalLine);
  const clearTerminalLines = useGameStore((s) => s.clearTerminalLines);

  const dispatchMissionEvent = useGameStore((s) => s.dispatchMissionEvent);

  const [input, setInput] = useState("");
  const [introFired, setIntroFired] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>("alpha");

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const prompt = useMemo(() => `${cwd} $`, [cwd]);
  const showCustomKeyboard = IS_NATIVE_DEVICE && inputFocused;
  const activeRows =
    keyboardMode === "alpha"
      ? TERMINAL_KEYBOARD_ALPHA_ROWS
      : TERMINAL_KEYBOARD_SYMBOL_ROWS;

  function append(kind: "out" | "cmd", text: string) {
    appendTerminalLine(kind, text);
  }

  function focusInput() {
    setTimeout(() => inputRef.current?.focus(), 10);
  }

  function insertAtCursor(textToInsert: string) {
    const start = selection.start ?? input.length;
    const end = selection.end ?? input.length;

    const nextValue = input.slice(0, start) + textToInsert + input.slice(end);
    const nextCaret = start + textToInsert.length;

    setInput(nextValue);
    setSelection({ start: nextCaret, end: nextCaret });
    focusInput();
  }

  function backspaceAtCursor() {
    const start = selection.start ?? input.length;
    const end = selection.end ?? input.length;

    if (start !== end) {
      const nextValue = input.slice(0, start) + input.slice(end);
      setInput(nextValue);
      setSelection({ start, end: start });
      focusInput();
      return;
    }

    if (start <= 0) return;

    const nextValue = input.slice(0, start - 1) + input.slice(end);
    const nextCaret = start - 1;

    setInput(nextValue);
    setSelection({ start: nextCaret, end: nextCaret });
    focusInput();
  }

  function moveCursor(delta: number) {
    const next = Math.max(
      0,
      Math.min(input.length, (selection.start ?? 0) + delta),
    );
    setSelection({ start: next, end: next });
    focusInput();
  }

  useEffect(() => {
    if (!bannerOn) return;
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [bannerOn]);

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, [lines]);

  useEffect(() => {
    if (booted) return;
    bootGame();
  }, [booted, bootGame]);

  useEffect(() => {
    if (introFired) return;

    const unlocked = terminalLocked === false;
    const ready = unlocked && commsConnected;

    if (!ready) return;

    setIntroFired(true);
    void dispatchMissionEvent({ type: "TERMINAL_READY" });
  }, [terminalLocked, commsConnected, introFired, dispatchMissionEvent]);

  async function runCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;

    if (terminalLocked) {
      append("out", "LOCKED: No secure shell.");
      append("out", "Open Network → Scan → Link to establish comms.");
      bannerPush("LOCK", "Get on a network first.", 1400);
      setInput("");
      setSelection({ start: 0, end: 0 });
      focusInput();
      return;
    }

    append("cmd", `${prompt}${cmd}`);
    setInput("");
    setSelection({ start: 0, end: 0 });
    focusInput();

    if (cmd.toLowerCase() === "clear") {
      clearTerminalLines();
      focusInput();
      return;
    }

    const prevPhase = mission.phase;

    const result: MissionDispatchResult =
      (await dispatchMissionEvent({
        type: "TERMINAL_COMMAND",
        input: cmd,
      })) ?? DEFAULT_MISSION_RESULT;

    const nextMission = useGameStore.getState().mission;
    const nextPhase = nextMission.phase;

    if (result.handled) {
      if (result.ok && result.advanced) {
        bumpTrace(-2, "correct command");
      } else if (result.ok && result.gated) {
        bumpTrace(-1, "gated command");
      } else if (!result.ok) {
        bumpTrace(4, "wrong command");
      }

      if (nextPhase === "complete" && prevPhase !== "complete") {
        bannerPush("OBJECTIVE", "Elevator code acquired.", 1800);
      }

      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    const res = runCommandEngine(cmd);
    res.output.forEach((line) => append("out", line));

    setTimeout(() => inputRef.current?.focus(), 50);
  }

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
        {row.map((keyValue) => (
          <Pressable
            key={`${keyboardMode}-${keyValue}`}
            onPress={() => insertAtCursor(keyValue)}
            style={({ pressed }) => [
              styles.key,
              styles.charKey,
              pressed && styles.keyPressed,
            ]}
          >
            <Text style={styles.keyText}>{keyValue}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <PhoneFrame>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Terminal</Text>
            <Text style={styles.headerSub}>
              {terminalLocked ? "No link" : "Git Bash"}
            </Text>
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
            <Pressable
              onPress={focusInput}
              style={({ pressed }) => [
                styles.termInput,
                pressed && styles.termInputPressed,
              ]}
            >
              <Text style={styles.prompt} numberOfLines={1}>
                {prompt}
              </Text>

              <TextInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
                selection={selection}
                onSelectionChange={(e) => {
                  setSelection(e.nativeEvent.selection);
                }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                contextMenuHidden={false}
                placeholder={
                  terminalLocked
                    ? "locked: connect via Network…"
                    : "type command…"
                }
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.inputCmd}
                onSubmitEditing={() => {
                  void runCommand(input);
                }}
                returnKeyType="go"
                editable
                showSoftInputOnFocus={!IS_NATIVE_DEVICE}
                caretHidden={false}
                selectionColor="#00e0ff"
                cursorColor="#00e0ff"
              />

              <Pressable
                onPress={() => {
                  void runCommand(input);
                }}
                style={({ pressed }) => [
                  styles.inputRunBtn,
                  terminalLocked && styles.inputRunBtnDisabled,
                  pressed && styles.inputRunBtnPressed,
                ]}
              >
                <Text style={styles.inputRunBtnTxt}>↻</Text>
              </Pressable>
            </Pressable>

            {showCustomKeyboard && (
              <View style={styles.keyboardWrap}>
                <View style={styles.keyboardModeRow}>
                  <Pressable
                    onPress={() => setKeyboardMode("alpha")}
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
                    onPress={() => setKeyboardMode("symbols")}
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
    </PhoneFrame>
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
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "rgba(255,255,255,0.92)",
  },

  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255,255,255,0.60)",
  },

  screen: {
    flex: 1,
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.55)",
    overflow: "hidden",
  },

  scroll: { flex: 1 },

  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 6,
  },

  line: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "monospace" as any,
  },

  lineOut: { color: "#7CFF9E" },
  lineCmd: { color: "#00e0ff" },

  inputDock: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8 + HOME_BAR_SPACE,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
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
    marginBottom: 8,
    marginHorizontal: 0,
  },

  termInputPressed: {
    borderColor: "rgba(255,255,255,0.14)",
  },

  prompt: {
    fontSize: 12.5,
    color: "#7CFF9E",
    fontFamily: "monospace" as any,
    marginRight: 8,
    maxWidth: 120,
  },

  inputCmd: {
    flex: 1,
    fontSize: 13,
    color: "#00e0ff",
    fontFamily: "monospace" as any,
    paddingVertical: 0,
    paddingHorizontal: 0,
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
    opacity: 0.55,
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
  },

  keyboardWrap: {
    gap: 6,
  },

  keyboardModeRow: {
    flexDirection: "row",
    gap: 6,
  },

  keyboardRows: {
    gap: 6,
  },

  keyboardRow: {
    flexDirection: "row",
    gap: 4,
  },

  keyboardRowMedium: {
    paddingHorizontal: 10,
  },

  keyboardRowNarrow: {
    paddingHorizontal: 18,
  },

  keyboardBottomRow: {
    flexDirection: "row",
    gap: 6,
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
    height: 54,
  },

  modeKey: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  utilityKey: {
    flex: 0.85,
  },

  modeKeyActive: {
    backgroundColor: "rgba(124,255,178,0.14)",
    borderColor: "rgba(124,255,178,0.45)",
  },

  modeKeyText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    fontFamily: "monospace" as any,
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
    fontFamily: "monospace" as any,
  },

  spaceKey: {
    flex: 1,
    height: 36,
  },

  deleteKey: {
    width: 82,
    height: 36,
  },
});
