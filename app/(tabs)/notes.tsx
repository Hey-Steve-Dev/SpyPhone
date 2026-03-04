import PhoneFrame from "@/components/PhoneFrame";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function SCREENNAME() {
  return (
    <PhoneFrame>
      <View style={styles.center}>
        <Text style={styles.text}>LABEL</Text>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { color: "rgba(255,255,255,0.92)", fontSize: 16 },
});
