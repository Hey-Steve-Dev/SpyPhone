import PhoneFrame from "@/components/PhoneFrame";
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

type Line = { id: string; kind: "out" | "cmd"; text: string };

export default function TerminalScreen() {
  const [cwd] = useState("~/ops");
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { id: "l1", kind: "out", text: "Secure shell — Git Bash (simulated)" },
    { id: "l2", kind: "out", text: "Type `help` to list available commands." },
  ]);

  const scrollRef = useRef<ScrollView>(null);

  const prompt = useMemo(() => `${cwd} $`, [cwd]);
  function append(kind: Line["kind"], text: string) {
    setLines((prev) => [
      ...prev,
      { id: String(Date.now()) + Math.random(), kind, text },
    ]);
    // allow layout then scroll
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
  }

  function runCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;

    append("cmd", `${prompt} ${cmd}`);
    setInput("");

    // TEMP: no real engine yet
    if (cmd === "help") {
      append("out", "Commands: help, clear");
      return;
    }
    if (cmd === "clear") {
      setLines([]);
      return;
    }

    append("out", `command not found: ${cmd}`);
  }

  return (
    <PhoneFrame>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Terminal</Text>
          <Text style={styles.headerSub}>Git Bash</Text>
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
                  l.kind === "cmd" ? styles.cmd : styles.out,
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
                placeholder=" "
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.cmd}
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
  wrap: {
    flex: 1,
    padding: 14,
  },
  header: {
    paddingHorizontal: 4,
    paddingBottom: 10,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.55)",
    overflow: "hidden",
    paddingBlock: 24,
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
    fontFamily: "monospace" as any, // ok for now; we can swap later
  },
  out: { color: "rgba(255,255,255,0.82)" },

  inputRow: {
    flexDirection: "row",
    alignItems: "stretch", // important
    gap: 10,
  },

  inputPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(15,15,15,0.85)",
    minHeight: 42, // fixed height baseline
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255,255,255,0.92)",
    fontFamily: "monospace" as any,
    paddingVertical: 0,
  },
  goBtn: {
    width: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  goTxt: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    fontWeight: "800",
  },
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
    maxWidth: 90, // keeps it from stealing the row
  },

  cmd: {
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
