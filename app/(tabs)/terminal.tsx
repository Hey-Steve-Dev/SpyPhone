import PhoneFrame from "@/components/PhoneFrame";
import { runCommandEngine, setMode } from "@/lib/commandEngine";
import { missionIntro, runMissionCommand } from "@/lib/missionEngine";
import { useGameStore } from "@/store/useGameStore";
import React, { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const HOME_BAR_SPACE = 44;
const bumpTrace = useGameStore((s) => s.bumpTrace);
type Line = { id: string; kind: "out" | "cmd"; text: string };

export default function TerminalScreen() {
  const mission = useGameStore((s) => s.mission);
  const setMissionStep = useGameStore((s) => s.setMissionStep);
  const [cwd] = useState("~/ops");
  const [mode, setModeState] = useState<"easy" | "strict">("easy");
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { id: "l1", kind: "out", text: "Secure shell — Git Bash (simulated)" },
    { id: "l2", kind: "out", text: "Type `help` to list available commands." },
  ]);
  const [introShown, setIntroShown] = useState(false);
  if (!introShown) {
    setIntroShown(true);
    setTimeout(() => {
      missionIntro(mission).forEach((line) => append("out", line));
    }, 0);
  }

  const scrollRef = useRef<ScrollView>(null);

  // compact prompt like your beta: "~ $"
  const prompt = useMemo(() => `${cwd} $`, [cwd]);

  function append(kind: Line["kind"], text: string) {
    setLines((prev) => [
      ...prev,
      { id: String(Date.now()) + Math.random(), kind, text },
    ]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
  }

  function runCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;

    append("cmd", `${prompt}${cmd}`);
    setInput("");

    // handled locally
    if (cmd.toLowerCase() === "clear") {
      setLines([]);
      return;
    }

    const missionRes = runMissionCommand(cmd, mode, mission);

    if (missionRes) {
      missionRes.output.forEach((line: string) => append("out", line));

      if (missionRes.ok) {
        bumpTrace(-2, "correct command"); // small reward
        if (missionRes.nextState) setMissionStep(missionRes.nextState.step);
      } else {
        bumpTrace(4, "wrong command"); // small penalty
      }

      return;
    }

    const res = runCommandEngine(cmd);
    res.output.forEach((line) => append("out", line));
  }

  return (
    <PhoneFrame>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Terminal</Text>
            <Text style={styles.headerSub}>Git Bash</Text>
          </View>

          <Pressable
            onPress={() => {
              const next = mode === "easy" ? "strict" : "easy";
              setMode(next);
              setModeState(next);
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
                value={input}
                onChangeText={setInput}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                placeholder="type command…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.inputCmd}
                onSubmitEditing={() => runCommand(input)}
                returnKeyType="go"
              />

              <View style={styles.caret} />

              <Pressable onPress={() => runCommand(input)} style={styles.btn}>
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
