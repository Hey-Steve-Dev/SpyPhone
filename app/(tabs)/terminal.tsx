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

// Slight comms latency so OPS doesn’t feel omniscient
const OPS_BASE_LAG_MS = 650;
const OPS_JITTER_MS = 550;

type Line = { id: string; kind: "out" | "cmd"; text: string };

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

  // ✅ NEW: boot + gating flags
  const bootGame = useGameStore((s) => s.bootGame);
  const booted = useGameStore((s) => s.booted);
  const terminalLocked = useGameStore((s) => s.terminalLocked);
  const commsConnected = useGameStore((s) => s.commsConnected);

  const [cwd] = useState("~/ops");
  const [mode, setModeState] = useState<"easy" | "strict">("easy");
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { id: "l1", kind: "out", text: "Secure shell — Git Bash (simulated)" },
    { id: "l2", kind: "out", text: "Type `help` to list available commands." },
  ]);

  // ✅ NEW: intro should only fire once, AFTER network handshake unlocks terminal
  const [introFired, setIntroFired] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const prompt = useMemo(() => `${cwd} $`, [cwd]);

  function append(kind: Line["kind"], text: string) {
    setLines((prev) => [
      ...prev,
      { id: String(Date.now()) + Math.random(), kind, text },
    ]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
  }

  function jitter() {
    return OPS_BASE_LAG_MS + Math.floor(Math.random() * OPS_JITTER_MS);
  }

  function typingMsFor(text: string) {
    const base = 850;
    const perChar = 38;
    return clamp(base + text.length * perChar, 1200, 2600);
  }

  // Keep input focused whenever a banner pops in (store update can blur RN TextInput)
  useEffect(() => {
    if (!bannerOn) return;
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [bannerOn]);

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

  // ✅ STEP 0: ensure bootGame runs once when Terminal mounts
  useEffect(() => {
    if (booted) return;
    bootGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  // ✅ STEP 1: run the mission intro ONLY after:
  // - terminal is unlocked (handshake succeeded)
  // - commsConnected is true (extra safety)
  useEffect(() => {
    if (introFired) return;

    const unlocked = terminalLocked === false;
    const ready = unlocked && commsConnected;

    if (!ready) return;

    setIntroFired(true);

    // This is the “connecting to shell / intro” beat
    const handlerLines = missionIntro(mission);
    if (handlerLines?.length) {
      opsBurstDelayed(handlerLines, 3500, 250);
      opsThreadDelayed(handlerLines);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalLocked, commsConnected, introFired]);

  function runCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;

    // ✅ Hard gate: terminal is locked until network + handshake
    if (terminalLocked) {
      append("out", "LOCKED: No secure shell.");
      append("out", "Open Network → Scan → Link to establish comms.");
      bannerPush("LOCK", "Get on a network first.", 1400);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 10);
      return;
    }

    // deadline enforcement (only while a deadline is active)
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
      setLines([]);
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
              setModeState(next);
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
                placeholder={
                  terminalLocked
                    ? "locked: connect via Network…"
                    : "type command…"
                }
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.inputCmd}
                onSubmitEditing={() => runCommand(input)}
                returnKeyType="go"
                editable={!terminalLocked}
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
  lineOut: { color: "rgba(255,255,255,0.82)" },
  lineCmd: { color: "rgba(255,255,255,0.95)" },

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
    color: "rgba(255,255,255,0.78)",
    fontFamily: "monospace" as any,
    marginRight: 8,
    maxWidth: 90,
  },

  inputCmd: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255,255,255,0.92)",
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
