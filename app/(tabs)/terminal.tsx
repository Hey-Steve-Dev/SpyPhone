import PhoneFrame from "@/components/PhoneFrame";
import { runCommandEngine } from "@/lib/commandEngine";
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

export default function TerminalScreen() {
  const appendTerminalLine = useGameStore((s) => s.appendTerminalLine);
  const clearTerminalLines = useGameStore((s) => s.clearTerminalLines);

  const session = useGameStore((s) => s.terminal.session);
  const setTerminalSession = useGameStore((s) => s.setTerminalSession);

  const lines = useGameStore((s) => s.terminal.lines);

  const dispatchMissionEvent = useGameStore((s) => s.dispatchMissionEvent);

  const mission = useGameStore((s) => s.mission);

  const terminalLocked = useGameStore((s) => s.terminalLocked);

  const cwd = session.cwd;

  const [input, setInput] = useState("");

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const prompt = useMemo(() => `${cwd} $`, [cwd]);

  function append(kind: "out" | "cmd", text: string) {
    appendTerminalLine(kind, text);
  }

  function focusInput() {
    setTimeout(() => inputRef.current?.focus(), 20);
  }

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, [lines]);

  async function runCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;

    append("cmd", `${prompt}${cmd}`);

    setInput("");
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
  }

  return (
    <PhoneFrame>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Terminal</Text>
          <Text style={styles.headerSub}>
            {terminalLocked ? "No link" : "Secure Shell"}
          </Text>
        </View>

        <View style={styles.screen}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {lines.map((l) => (
              <Text
                key={l.id}
                style={[
                  styles.line,
                  l.kind === "cmd" ? styles.lineCmd : styles.lineOut,
                ]}
              >
                {l.text}
              </Text>
            ))}
          </ScrollView>

          <View style={styles.inputDock}>
            <View style={styles.termInput}>
              <Text style={styles.prompt}>{prompt}</Text>

              <TextInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.inputCmd}
                placeholder="type command…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                onSubmitEditing={() => runCommand(input)}
                returnKeyType="go"
              />

              <Pressable
                onPress={() => runCommand(input)}
                style={styles.runBtn}
              >
                <Text style={styles.runTxt}>↻</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingTop: 10,
  },

  header: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
  },

  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },

  screen: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 12,
    gap: 6,
  },

  line: {
    fontFamily: "monospace",
    fontSize: 13,
  },

  lineCmd: {
    color: "#00e0ff",
  },

  lineOut: {
    color: "#7CFF9E",
  },

  inputDock: {
    padding: 8,
    paddingBottom: 8 + HOME_BAR_SPACE,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  termInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
    backgroundColor: "rgba(0,0,0,0.8)",
  },

  prompt: {
    color: "#7CFF9E",
    fontFamily: "monospace",
    marginRight: 6,
  },

  inputCmd: {
    flex: 1,
    color: "#00e0ff",
    fontFamily: "monospace",
    fontSize: 13,
  },

  runBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,224,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(0,224,255,0.4)",
  },

  runTxt: {
    color: "#00e0ff",
    fontWeight: "bold",
  },
});
