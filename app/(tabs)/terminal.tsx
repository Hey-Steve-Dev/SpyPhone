import PhoneFrame from "@/components/PhoneFrame";
import { runCommandEngine, setMode } from "@/lib/commandEngine";
import { missionIntro, runMissionCommand } from "@/lib/missionEngine";
import { useGameStore } from "@/store/useGameStore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const HOME_BAR_SPACE = 44;
const OPS_BASE_LAG_MS = 650;
const OPS_JITTER_MS = 550;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function TerminalScreen() {
  const bumpTrace = useGameStore((s) => s.bumpTrace);

  const mission = useGameStore((s) => s.mission);
  const setMissionStep = useGameStore((s) => s.setMissionStep);
  const jammerEnabled = useGameStore((s) => s.jammer.enabled);

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

  const [input, setInput] = useState("");
  const [introFired, setIntroFired] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const prompt = useMemo(() => `${cwd} $`, [cwd]);

  function append(kind: "out" | "cmd", text: string) {
    appendTerminalLine(kind, text);
  }

  function jitter() {
    return OPS_BASE_LAG_MS + Math.floor(Math.random() * OPS_JITTER_MS);
  }

  function typingMsFor(text: string) {
    const base = 850;
    const perChar = 38;
    return clamp(base + text.length * perChar, 1200, 2600);
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

  function opsBurstDelayed(msgs: string[], msgMsEach = 3500, gap = 250) {
    const startDelay = jitter();
    let t = startDelay;

    msgs.forEach((text) => {
      const typingMs = typingMsFor(text);

      setTimeout(() => {
        bannerPush("OPS", "…", typingMs);
        setTimeout(() => inputRef.current?.focus(), 50);
      }, t);

      setTimeout(() => {
        bannerPush("OPS", text, msgMsEach);
        setTimeout(() => inputRef.current?.focus(), 50);
      }, t + typingMs);

      t += typingMs + msgMsEach + gap;
    });
  }

  function opsThreadDelayed(msgs: string[]) {
    const startDelay = jitter();
    let t = startDelay;

    msgs.forEach((text) => {
      const typingMs = typingMsFor(text);
      setTimeout(() => {
        pushThread("handler", text);
      }, t + typingMs);

      t += typingMs + 120;
    });
  }

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

    const handlerLines = missionIntro(mission);
    if (handlerLines?.length) {
      opsBurstDelayed(handlerLines, 3500, 250);
      opsThreadDelayed(handlerLines);
    }
  }, [terminalLocked, commsConnected, introFired, mission]);

  function runCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;

    if (terminalLocked) {
      append("out", "LOCKED: No secure shell.");
      append("out", "Open Network → Scan → Link to establish comms.");
      bannerPush("LOCK", "Get on a network first.", 1400);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 10);
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
    setTimeout(() => inputRef.current?.focus(), 10);

    if (cmd.toLowerCase() === "clear") {
      clearTerminalLines();
      setTimeout(() => inputRef.current?.focus(), 10);
      return;
    }

    const missionRes = runMissionCommand(cmd, mode, mission, jammerEnabled);
    if (missionRes) {
      missionRes.terminalOut.forEach((line: string) => append("out", line));

      if (missionRes.nextState) {
        const nextStep = missionRes.nextState.step;
        const opsLines = missionRes.handlerOut?.length
          ? missionRes.handlerOut
          : [];

        if (opsLines.length) {
          opsBurstDelayed(opsLines, 3500, 250);
          opsThreadDelayed(opsLines);
        }

        if (missionRes.ok) bumpTrace(-2, "correct command");
        else bumpTrace(4, "wrong command");

        setMissionStep(nextStep);

        if (nextStep === 5) {
          setMissionDeadlineMsFromNow(12_000);
          bannerPush("WINDOW", "Exfil window: 12s.", 1400);
          pushThread("handler", "Exfil window is open. You have ~12 seconds.");
        } else {
          clearMissionDeadline();
        }

        setTimeout(() => inputRef.current?.focus(), 50);
        return;
      }

      if (missionRes.ok) bumpTrace(-2, "correct command");
      else bumpTrace(4, "wrong command");

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
            <View style={styles.termInput}>
              <Text style={styles.prompt} numberOfLines={1}>
                {prompt}
              </Text>

              <TextInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
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
                onSubmitEditing={() => runCommand(input)}
                returnKeyType="go"
                editable
              />

              <View style={styles.caret} />

              <Pressable
                onPress={() => runCommand(input)}
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
