import { useGameStore } from "@/store/useGameStore";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const HOME_BAR_SPACE = 44;

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function makeId() {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function NotesScreen() {
  const notes = useGameStore((s) => s.notes);
  const addNote = useGameStore((s) => s.addNote);
  const updateNote = useGameStore((s) => s.updateNote);
  const deleteNote = useGameStore((s) => s.deleteNote);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

    if (!q) return sorted;

    return sorted
      .filter((note) => {
        const title = note.title.toLowerCase();
        const body = note.body.toLowerCase();
        return title.includes(q) || body.includes(q);
      })
      .sort((a, b) => {
        const aTitleHit = a.title.toLowerCase().includes(q) ? 1 : 0;
        const bTitleHit = b.title.toLowerCase().includes(q) ? 1 : 0;
        if (aTitleHit !== bTitleHit) return bTitleHit - aTitleHit;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, query]);

  const selectedNote = useMemo(() => {
    if (!selectedId) return null;
    return notes.find((n) => n.id === selectedId) ?? null;
  }, [notes, selectedId]);

  function startNewNote() {
    setSelectedId(null);
    setIsCreating(true);
    setDraftTitle("");
    setDraftBody("");
  }

  function openNote(id: string) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    setSelectedId(id);
    setIsCreating(false);
    setDraftTitle(note.title);
    setDraftBody(note.body);
  }

  function closeEditor() {
    setSelectedId(null);
    setIsCreating(false);
    setDraftTitle("");
    setDraftBody("");
  }

  function handleSave() {
    const title = draftTitle.trim();
    const body = draftBody.trim();

    if (!title && !body) {
      Alert.alert("Empty note", "Add a title or some text before saving.");
      return;
    }

    if (isCreating) {
      const now = Date.now();
      const id = makeId();

      addNote({
        id,
        title: title || "Untitled Note",
        body,
        createdAt: now,
        updatedAt: now,
      });

      setSelectedId(id);
      setIsCreating(false);
      return;
    }

    if (!selectedId) return;

    updateNote(selectedId, {
      title: title || "Untitled Note",
      body,
    });
  }

  function handleDelete() {
    if (isCreating) {
      closeEditor();
      return;
    }

    if (!selectedId || !selectedNote) return;

    Alert.alert("Delete note?", `Delete "${selectedNote.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteNote(selectedId);
          closeEditor();
        },
      },
    ]);
  }

  const showingEditor = isCreating || !!selectedNote;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={10}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notes</Text>
        <Text style={styles.headerSub}>Save clues, names, and commands</Text>
      </View>

      <View style={styles.topBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search notes..."
          placeholderTextColor="#7c8aa5"
          style={styles.searchInput}
        />
        <Pressable style={styles.newBtn} onPress={startNewNote}>
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>

      {showingEditor ? (
        <View style={styles.editorWrap}>
          <ScrollView
            style={styles.editorScroll}
            contentContainerStyle={styles.editorContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.editorTop}>
              <Text style={styles.editorHeading}>
                {isCreating ? "New Note" : "Edit Note"}
              </Text>

              <Pressable onPress={closeEditor} style={styles.backBtn}>
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
            </View>

            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Title"
              placeholderTextColor="#7c8aa5"
              style={styles.titleInput}
              returnKeyType="next"
            />

            <TextInput
              value={draftBody}
              onChangeText={setDraftBody}
              placeholder="Write your note..."
              placeholderTextColor="#7c8aa5"
              multiline
              textAlignVertical="top"
              style={styles.bodyInput}
            />

            <View style={styles.actionRow}>
              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {isCreating ? "Create Note" : "Save Changes"}
                </Text>
              </Pressable>

              <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>
                  {isCreating ? "Cancel" : "Delete"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {filteredNotes.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>
                {notes.length === 0 ? "No notes yet" : "No matching notes"}
              </Text>
              <Text style={styles.emptyText}>
                {notes.length === 0
                  ? "Tap New to create your first note."
                  : "Try a different search term."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredNotes}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => openNote(item.id)}
                  style={styles.noteCard}
                >
                  <Text style={styles.noteTitle} numberOfLines={1}>
                    {item.title || "Untitled Note"}
                  </Text>

                  <Text style={styles.notePreview} numberOfLines={2}>
                    {item.body || "No content"}
                  </Text>

                  <Text style={styles.noteMeta}>
                    Updated {formatTime(item.updatedAt)}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      )}

      <View style={{ height: HOME_BAR_SPACE }} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b1220",
    paddingHorizontal: 14,
    paddingTop: 14,
  },

  header: {
    marginBottom: 12,
  },

  headerTitle: {
    color: "#e8eefc",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  headerSub: {
    color: "#94a3bd",
    fontSize: 12,
    marginTop: 4,
  },

  topBar: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    backgroundColor: "#121b2d",
    borderWidth: 1,
    borderColor: "#22304a",
    borderRadius: 14,
    color: "#e8eefc",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },

  newBtn: {
    minWidth: 84,
    backgroundColor: "#1b3a67",
    borderWidth: 1,
    borderColor: "#33598d",
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  newBtnText: {
    color: "#e8eefc",
    fontSize: 14,
    fontWeight: "700",
  },

  listWrap: {
    flex: 1,
    minHeight: 0,
    backgroundColor: "#10192a",
    borderWidth: 1,
    borderColor: "#1d2a40",
    borderRadius: 18,
    overflow: "hidden",
  },

  list: {
    flex: 1,
    minHeight: 0,
  },

  listContent: {
    padding: 10,
    paddingBottom: 18,
  },

  noteCard: {
    backgroundColor: "#131f33",
    borderWidth: 1,
    borderColor: "#1f2f49",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },

  noteTitle: {
    color: "#edf3ff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },

  notePreview: {
    color: "#9fb0cb",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },

  noteMeta: {
    color: "#6f84a6",
    fontSize: 11,
  },

  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  emptyTitle: {
    color: "#e8eefc",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },

  emptyText: {
    color: "#8fa2c2",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },

  editorWrap: {
    flex: 1,
    minHeight: 0,
    backgroundColor: "#10192a",
    borderWidth: 1,
    borderColor: "#1d2a40",
    borderRadius: 18,
    overflow: "hidden",
  },

  editorScroll: {
    flex: 1,
  },

  editorContent: {
    padding: 12,
    paddingBottom: 24,
  },

  editorTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  editorHeading: {
    color: "#e8eefc",
    fontSize: 16,
    fontWeight: "800",
  },

  backBtn: {
    backgroundColor: "#162235",
    borderWidth: 1,
    borderColor: "#2a3c59",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  backBtnText: {
    color: "#cfe0ff",
    fontSize: 12,
    fontWeight: "700",
  },

  titleInput: {
    backgroundColor: "#121b2d",
    borderWidth: 1,
    borderColor: "#22304a",
    borderRadius: 14,
    color: "#e8eefc",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },

  bodyInput: {
    minHeight: 220,
    backgroundColor: "#121b2d",
    borderWidth: 1,
    borderColor: "#22304a",
    borderRadius: 14,
    color: "#dce6f8",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },

  saveBtn: {
    flex: 1,
    backgroundColor: "#234a7a",
    borderWidth: 1,
    borderColor: "#3b6aa4",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },

  saveBtnText: {
    color: "#eef4ff",
    fontSize: 14,
    fontWeight: "800",
  },

  deleteBtn: {
    minWidth: 100,
    backgroundColor: "#2a1620",
    borderWidth: 1,
    borderColor: "#5a2d3f",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  deleteBtnText: {
    color: "#ffb7c7",
    fontSize: 14,
    fontWeight: "800",
  },
});
