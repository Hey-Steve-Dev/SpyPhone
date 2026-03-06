import { ResizeMode, Video } from "expo-av";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function VideoTestScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Video Test</Text>

      <Video
        source={require("../assets/cams/hallway1/guard-standing.mp4")}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping
        isMuted
        useNativeControls
        onLoad={() => console.log("VIDEO LOADED")}
        onError={(e) => console.log("VIDEO ERROR", e)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  label: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 20,
  },
  video: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#222",
  },
});
