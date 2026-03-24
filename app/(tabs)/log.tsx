import { useGameStore, type GameLogItem } from "@/store/useGameStore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";

const TACTICAL_FONT = "monospace";

function ts(at: number) {
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

type FilterKey =
  | "all"
  | "system"
  | "mission"
  | "terminal"
  | "messages"
  | "network"
  | "jammer"
  | "banner"
  | "thread";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "terminal", label: "Terminal" },
  { key: "messages", label: "Messages" },
  { key: "network", label: "Network" },
  { key: "jammer", label: "Jammer" },
  { key: "thread", label: "Thread" },
];

export default function LogScreen() {
  const log = useGameStore((s) => s.log);
  const clearLog = useGameStore((s) => s.clearLog);

  const [filter, setFilter] = useState<FilterKey>("all");

  const listRef = useRef<FlatList<GameLogItem>>(null);

  const filtered = useMemo(() => {
    const src = log.filter((item) => item.kind !== "mission").slice(-500);

    if (filter === "all") return src;

    return src.filter((item) => item.kind === filter);
  }, [log, filter]);

  useEffect(() => {
    if (!filtered.length) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [filtered.length]);

  const renderItem: ListRenderItem<GameLogItem> = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.line} selectable>
        <Text style={styles.ts}>{ts(item.at)} </Text>
        <Text style={styles.kind}>[{item.kind.toUpperCase()}] </Text>
        {item.text}
      </Text>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Activity Log</Text>
          <Text style={styles.sub}>
            Unified event history from the game store
          </Text>
        </View>

        <Pressable onPress={clearLog} style={styles.clearBtn}>
          <Text style={styles.clearTxt}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterBtn, active && styles.filterBtnActive]}
            >
              <Text
                style={[styles.filterTxt, active && styles.filterTxtActive]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.panel}>
        <FlatList
          ref={listRef}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          style={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd({ animated: false });
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No log activity yet.</Text>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 14,
    backgroundColor: "#05090e",
  },

  header: {
    paddingHorizontal: 4,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#e6f4ff",
    fontFamily: TACTICAL_FONT,
    letterSpacing: 0.8,
  },
  sub: {
    marginTop: 3,
    fontSize: 12,
    color: "#7d9bb2",
    fontFamily: TACTICAL_FONT,
  },

  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#29485d",
    backgroundColor: "#0a141d",
  },
  clearTxt: {
    fontSize: 12,
    fontWeight: "900",
    color: "#d8efff",
    fontFamily: TACTICAL_FONT,
    letterSpacing: 0.6,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#29485d",
    backgroundColor: "#09131b",
  },
  filterBtnActive: {
    backgroundColor: "#12324a",
    borderColor: "#4da3ff",
  },
  filterTxt: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#8fb0c8",
    fontFamily: TACTICAL_FONT,
    letterSpacing: 0.5,
  },
  filterTxtActive: {
    color: "#d8efff",
  },

  panel: {
    flex: 1,
    minHeight: 0,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#214156",
    backgroundColor: "#0b141d",
    overflow: "hidden",
    padding: 14,
  },

  list: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingBottom: 10,
  },

  row: {},

  line: {
    fontSize: 12.5,
    lineHeight: 17,
    color: "#d8efff",
    fontFamily: TACTICAL_FONT,
  },
  ts: {
    color: "#6f8da4",
  },
  kind: {
    color: "#5cc8ff",
    fontWeight: "900",
    fontFamily: TACTICAL_FONT,
  },

  empty: {
    fontSize: 12.5,
    color: "#7d9bb2",
    fontFamily: TACTICAL_FONT,
  },
});
