import PhoneFrame from "@/components/PhoneFrame";
import { runCommandEngine, setMode } from "@/lib/commandEngine";
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

const TERMINAL_SYMBOL_ROWS = [
  ["~", "/", "\\", "|", "-", "_"],
  [".", ">", "<", "$", "*", ":"],
];

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

  const missionDeadlineAt = useGameStore((s) => s.missionDeadlineAt);
  const setMissionDeadlineMsFromNow = useGameStore(
    (s) => s.setMissionDeadlineMsFromNow,
  );
  const clearMissionDeadline = useGameStore((s) => s.clearMissionDeadline);

  const bannerPush = useGameStore((s) => s.bannerPush);
  const bannerOn = useGameStore((s) => s.banner.on);

  const pushThread = useGameStore((s) => s.pushThread);

  const bootGame = useGameStore((s) => s.bootGame);
  const booted = useGameStore((s) => s.booted);
  const terminalLocked = useGameStore((s) => s.terminalLocked);
  const commsConnected = useGameStore((s) => s.commsConnected);

  const cwd = useGameStore((s) => s.terminal.cwd);
  const mode = useGameStore((s) => s.terminal.mode);
  const lines = useGameStore((s) => s.terminal.lines);
  const appendTerminalLine = useGameStore((s) => s.appendTerminalLine);
  const clearTerminalLines = useGameStore((s) => s.clearTerminalLines);
  const setTerminalMode = useGameStore((s) => s.setTerminalMode);

  const dispatchMissionEvent = useGameStore((s) => s.dispatchMissionEvent);

  const [input, setInput] = useState("");
  const [introFired, setIntroFired] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const prompt = useMemo(() => `${cwd} $`, [cwd]);
  const showSymbolBar = IS_NATIVE_DEVICE && inputFocused;

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

    if (missionDeadlineAt && Date.now() > missionDeadlineAt) {
      append("out", "WINDOW MISSED: link dropped.");
      append("out", "Trace spike.");

      bannerPush("ALERT", "Exfil window missed.", 2200);
      pushThread("handler", "We missed the exfil window. Keep moving.");

      bumpTrace(12, "missed window");
      clearMissionDeadline();
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
        mode,
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

      if (nextPhase === "terminal_drop" && prevPhase !== "terminal_drop") {
        setMissionDeadlineMsFromNow(12_000);
        bannerPush("WINDOW", "Exfil window: 12s.", 1400);
        pushThread("handler", "Exfil window is open. You have ~12 seconds.");
      } else if (nextPhase !== "terminal_drop") {
        clearMissionDeadline();
      }

      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    const res = runCommandEngine(cmd);
    res.output.forEach((line) => append("out", line));

    setTimeout(() => inputRef.current?.focus(), 50);
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

          <Pressable
            onPress={() => {
              const next = mode === "easy" ? "strict" : "easy";
              setMode(next);
              setTerminalMode(next);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            style={styles.modeBtn}
          >
            <Text style={styles.modeTxt}>
              {mode === "easy" ? "Easy" : "Hard"}
            </Text>
          </Pressable>
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
            {showSymbolBar && (
              <View style={styles.symbolBar}>
                {TERMINAL_SYMBOL_ROWS.map((row, rowIndex) => (
                  <View key={`row-${rowIndex}`} style={styles.symbolRow}>
                    {row.map((symbol) => (
                      <Pressable
                        key={symbol}
                        onPress={() => insertAtCursor(symbol)}
                        style={({ pressed }) => [
                          styles.symbolKey,
                          pressed && styles.symbolKeyPressed,
                        ]}
                      >
                        <Text style={styles.symbolKeyTxt}>{symbol}</Text>
                      </Pressable>
                    ))}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.termInput}>
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
              />

              <View style={styles.caret} />

              <Pressable
                onPress={() => {
                  void runCommand(input);
                }}
                style={[styles.btn, terminalLocked && { opacity: 0.55 }]}
              >
                <Text style={styles.btnTxt}>Run</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 14 },

  header: {
    paddingHorizontal: 4,
    paddingBottom: 10,
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

  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  modeTxt: {
    color: "rgba(255,255,255,0.88)",
    fontWeight: "800",
    fontSize: 12,
  },

  screen: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.55)",
    overflow: "hidden",
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: 14,
    paddingBottom: 20,
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
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12 + HOME_BAR_SPACE,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  symbolBar: {
    marginBottom: 10,
    gap: 8,
  },

  symbolRow: {
    flexDirection: "row",
    gap: 8,
  },

  symbolKey: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  symbolKeyPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  symbolKeyTxt: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "monospace" as any,
  },

  termInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(15,15,15,0.85)",
    paddingLeft: 10,
    paddingRight: 8,
    height: 44,
  },

  prompt: {
    fontSize: 12.5,
    color: "#7CFF9E",
    fontFamily: "monospace" as any,
    marginRight: 8,
    maxWidth: 90,
  },

  inputCmd: {
    flex: 1,
    fontSize: 13,
    color: "#00e0ff",
    fontFamily: "monospace" as any,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },

  caret: {
    width: 1,
    height: 18,
    marginHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.28)",
  },

  btn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "800",
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
});
