import { runCommandEngine } from "@/lib/commandEngine";
import { useGameStore } from "@/store/useGameStore";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
const PROMPT = "$";

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

type KeyboardMode = "alpha" | "symbols";

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

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const moveRepeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const moveRepeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const showCustomKeyboard =
    IS_NATIVE_DEVICE && inputFocused && !terminalLocked;

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

    if (shift && keyboardMode === "alpha") {
      setShift(false);
    }

    focusInput();
  }

  function backspaceAtCursor() {
    if (terminalLocked) return;

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

  const moveCursor = useCallback(
    (delta: number) => {
      if (terminalLocked) return;

      setSelection((prev) => {
        const current = prev.start ?? 0;
        const next = Math.max(0, Math.min(input.length, current + delta));
        return { start: next, end: next };
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

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 0);

    return () => {
      clearTimeout(id);
      stopMoveRepeat();
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
    setShift(false);
    focusInput();
    setTerminalPendingInsert(null);
  }, [terminalPendingInsert, terminalLocked, setTerminalPendingInsert]);

  async function runCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd || terminalLocked) return;

    append("cmd", `${PROMPT}${cmd}`);

    setInput("");
    setSelection({ start: 0, end: 0 });
    setShift(false);
    focusInput();

    if (cmd.toLowerCase() === "clear") {
      clearTerminalLines();
      return;
    }

    const result = (await dispatchMissionEvent({
      type: "TERMINAL_COMMAND",
      input: cmd,
      cwd,
    })) ?? { handled: false };

    if (result.handled) {
      return;
    }

    const res = runCommandEngine(cmd, session);

    setTerminalSession(res.nextSession);
    res.output.forEach((line) => append("out", line));

    if (res.launchApp) {
      const store = useGameStore.getState() as typeof useGameStore extends {
        getState: () => infer T;
      }
        ? T
        : never;

      if ("setActiveApp" in store && typeof store.setActiveApp === "function") {
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
              terminalLocked && styles.termInputDisabled,
            ]}
          >
            <Text style={styles.prompt}>{PROMPT}</Text>

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
});
