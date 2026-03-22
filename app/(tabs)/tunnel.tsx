import { useGameStore } from "@/store/useGameStore";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const HOME_BAR_SPACE = 44;
const TACTICAL_FONT = "monospace";

export default function TunnelScreen() {
  const nearbyDevices = useGameStore((s) => s.nearbyDevices);
  const isTunnelScanning = useGameStore((s) => s.isTunnelScanning);
  const tunnelScanComplete = useGameStore((s) => s.tunnelScanComplete);
  const selectedTunnelDeviceId = useGameStore((s) => s.selectedTunnelDeviceId);
  const isTunnelAttempting = useGameStore((s) => s.isTunnelAttempting);
  const tunnelConnectionState = useGameStore((s) => s.tunnelConnectionState);
  const tunnelStatusMessage = useGameStore((s) => s.tunnelStatusMessage);
  const activeRemoteHostId = useGameStore((s) => s.activeRemoteHostId);

  const runTunnelScan = useGameStore((s) => s.runTunnelScan);
  const selectTunnelDevice = useGameStore((s) => s.selectTunnelDevice);
  const attemptTunnelConnection = useGameStore(
    (s) => s.attemptTunnelConnection,
  );
  const clearTunnelSelection = useGameStore((s) => s.clearTunnelSelection);
  const resetTunnelState = useGameStore((s) => s.resetTunnelState);

  useFocusEffect(
    useCallback(() => {
      resetTunnelState();
    }, [resetTunnelState]),
  );

  const selectedDevice = useMemo(
    () => nearbyDevices.find((d) => d.id === selectedTunnelDeviceId) ?? null,
    [nearbyDevices, selectedTunnelDeviceId],
  );

  const resultToneStyle =
    tunnelConnectionState === "success" &&
    activeRemoteHostId === selectedDevice?.id
      ? styles.resultSuccess
      : tunnelConnectionState === "limited"
        ? styles.resultLimited
        : tunnelConnectionState === "failure"
          ? styles.resultFailure
          : tunnelConnectionState === "attempting"
            ? styles.resultAttempting
            : styles.resultIdle;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <Text style={styles.eyebrow}>TACTICAL ACCESS NODE</Text>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>READY</Text>
          </View>
        </View>

        <Text style={styles.title}>TUNNEL</Text>
        <Text style={styles.subtitle}>
          Search powered devices and establish a remote route.
        </Text>

        <View style={styles.headerDivider} />

        <View style={styles.headerStatsRow}>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatLabel}>SCAN</Text>
            <Text style={styles.headerStatValue}>
              {isTunnelScanning
                ? "ACTIVE"
                : tunnelScanComplete
                  ? "COMPLETE"
                  : "IDLE"}
            </Text>
          </View>

          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatLabel}>DEVICES</Text>
            <Text style={styles.headerStatValue}>
              {tunnelScanComplete ? String(nearbyDevices.length) : "--"}
            </Text>
          </View>

          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatLabel}>ROUTE</Text>
            <Text style={styles.headerStatValue}>
              {tunnelConnectionState === "success"
                ? "SHELL"
                : tunnelConnectionState === "limited"
                  ? "LIMITED"
                  : tunnelConnectionState === "attempting"
                    ? "LINKING"
                    : "NONE"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => void runTunnelScan()}
          disabled={isTunnelScanning || isTunnelAttempting}
          style={[
            styles.primaryButton,
            (isTunnelScanning || isTunnelAttempting) && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {isTunnelScanning ? "SCANNING..." : "SCAN NEARBY DEVICES"}
          </Text>
        </Pressable>

        <Pressable
          onPress={clearTunnelSelection}
          disabled={isTunnelScanning || isTunnelAttempting}
          style={[
            styles.secondaryButton,
            (isTunnelScanning || isTunnelAttempting) && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.secondaryButtonText}>CLEAR</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeaderRow}>
          <Text style={styles.cardLabel}>STATUS</Text>
          <Text style={styles.panelTag}>
            {isTunnelScanning
              ? "SCANNING"
              : tunnelScanComplete
                ? "READY"
                : "STANDBY"}
          </Text>
        </View>

        {isTunnelScanning ? (
          <View style={styles.statusInline}>
            <ActivityIndicator />
            <Text style={styles.statusText}>
              Reading powered systems in local range...
            </Text>
          </View>
        ) : (
          <Text style={styles.statusText}>
            {tunnelStatusMessage || "Scanner idle."}
          </Text>
        )}

        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              isTunnelScanning
                ? styles.progressScanning
                : tunnelScanComplete
                  ? styles.progressComplete
                  : styles.progressIdle,
            ]}
          />
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeaderRow}>
          <Text style={styles.panelTitle}>DETECTED DEVICES</Text>
          <Text style={styles.panelCount}>
            {tunnelScanComplete ? String(nearbyDevices.length) : "0"}
          </Text>
        </View>

        {!tunnelScanComplete && !isTunnelScanning ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No scan has been run yet.</Text>
          </View>
        ) : null}

        {tunnelScanComplete && nearbyDevices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No powered devices detected.
            </Text>
          </View>
        ) : null}

        <View style={styles.deviceListContent}>
          {tunnelScanComplete &&
            nearbyDevices.map((device) => {
              const selected = device.id === selectedTunnelDeviceId;

              return (
                <Pressable
                  key={device.id}
                  onPress={() => selectTunnelDevice(device.id)}
                  disabled={isTunnelScanning || isTunnelAttempting}
                  style={[
                    styles.deviceCard,
                    selected && styles.deviceCardSelected,
                  ]}
                >
                  <View style={styles.deviceTopRow}>
                    <View style={styles.deviceNameBlock}>
                      <Text style={styles.deviceName}>{device.name}</Text>
                      <Text style={styles.deviceId}>NODE::{device.id}</Text>
                    </View>

                    <Text
                      style={[
                        styles.devicePower,
                        device.poweredOn
                          ? styles.devicePowerOn
                          : styles.devicePowerOff,
                      ]}
                    >
                      {device.poweredOn ? "ONLINE" : "OFFLINE"}
                    </Text>
                  </View>

                  <View style={styles.deviceMetaGrid}>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipLabel}>SIGNAL</Text>
                      <Text style={styles.metaChipValue}>
                        {String(device.signalStrength)}
                      </Text>
                    </View>

                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipLabel}>TYPE</Text>
                      <Text style={styles.metaChipValue}>{device.kind}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeaderRow}>
          <Text style={styles.panelTitle}>TUNNEL CONTROL</Text>
          <Text style={styles.panelTag}>
            {selectedDevice ? "TARGET LOCKED" : "NO TARGET"}
          </Text>
        </View>

        {!selectedDevice ? (
          <View style={styles.emptyDetail}>
            <Text style={styles.emptyStateText}>
              Select a device to inspect tunnel options.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.detailCard}>
              <View style={styles.detailHeaderRow}>
                <View style={styles.detailTitleBlock}>
                  <Text style={styles.detailName}>{selectedDevice.name}</Text>
                  <Text style={styles.detailId}>
                    TARGET::{selectedDevice.id}
                  </Text>
                </View>

                <View
                  style={[
                    styles.detailPowerBadge,
                    selectedDevice.poweredOn
                      ? styles.detailPowerBadgeOn
                      : styles.detailPowerBadgeOff,
                  ]}
                >
                  <Text style={styles.detailPowerBadgeText}>
                    {selectedDevice.poweredOn ? "ONLINE" : "OFFLINE"}
                  </Text>
                </View>
              </View>

              <View style={styles.specGrid}>
                <View style={styles.specCell}>
                  <Text style={styles.specLabel}>SIGNAL</Text>
                  <Text style={styles.specValue}>
                    {String(selectedDevice.signalStrength)}
                  </Text>
                </View>

                <View style={styles.specCell}>
                  <Text style={styles.specLabel}>SHELL</Text>
                  <Text style={styles.specValue}>
                    {selectedDevice.supportsShell ? "YES" : "NO"}
                  </Text>
                </View>

                <View style={styles.specCell}>
                  <Text style={styles.specLabel}>AUX OPS</Text>
                  <Text style={styles.specValue}>
                    {selectedDevice.supportsAuxOps ? "YES" : "NO"}
                  </Text>
                </View>

                <View style={styles.specCell}>
                  <Text style={styles.specLabel}>ROUTE</Text>
                  <Text style={styles.specValue}>
                    {selectedDevice.poweredOn ? "AVAILABLE" : "BLOCKED"}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={() => void attemptTunnelConnection()}
              disabled={
                isTunnelScanning ||
                isTunnelAttempting ||
                !selectedDevice.poweredOn
              }
              style={[
                styles.primaryButton,
                styles.connectButton,
                (isTunnelScanning ||
                  isTunnelAttempting ||
                  !selectedDevice.poweredOn) &&
                  styles.buttonDisabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isTunnelAttempting ? "TUNNELING..." : "ATTEMPT TUNNEL"}
              </Text>
            </Pressable>

            <View style={[styles.resultCard, resultToneStyle]}>
              <View style={styles.panelHeaderRow}>
                <Text style={styles.cardLabel}>RESULT</Text>
                <Text style={styles.resultBadge}>
                  {tunnelConnectionState === "success" &&
                  activeRemoteHostId === selectedDevice.id
                    ? "SHELL READY"
                    : tunnelConnectionState === "limited"
                      ? "LIMITED ACCESS"
                      : tunnelConnectionState === "failure"
                        ? "FAILED"
                        : tunnelConnectionState === "attempting"
                          ? "NEGOTIATING"
                          : "NO ATTEMPT"}
                </Text>
              </View>

              <Text style={styles.resultText}>
                {tunnelConnectionState === "success" &&
                activeRemoteHostId === selectedDevice.id
                  ? "Tunnel established. Secure shell is available."
                  : tunnelConnectionState === "limited"
                    ? "Tunnel active. Auxiliary operations only. No shell available."
                    : tunnelConnectionState === "failure"
                      ? "Tunnel failed. Target did not expose a usable route."
                      : tunnelConnectionState === "attempting"
                        ? "Negotiating remote path..."
                        : "No connection attempt made yet."}
              </Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#04080d",
  },
  screenContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: HOME_BAR_SPACE + 24,
    gap: 10,
  },

  headerCard: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#1f3a4a",
    backgroundColor: "#0b1722",
    padding: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  eyebrow: {
    color: "#7fbfff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    fontFamily: TACTICAL_FONT,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#2a5c7a",
    backgroundColor: "#0d2230",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#5cc8ff",
  },
  livePillText: {
    color: "#a8dcff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: TACTICAL_FONT,
  },
  title: {
    color: "#e6f4ff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 6,
    fontFamily: TACTICAL_FONT,
  },
  subtitle: {
    color: "#8aa4b8",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: TACTICAL_FONT,
  },
  headerDivider: {
    height: 1,
    backgroundColor: "#183447",
    marginVertical: 12,
  },
  headerStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  headerStatBox: {
    flex: 1,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#183447",
    backgroundColor: "#0c1a24",
    paddingVertical: 9,
    paddingHorizontal: 9,
  },
  headerStatLabel: {
    color: "#7aa6c2",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 4,
    fontFamily: TACTICAL_FONT,
  },
  headerStatValue: {
    color: "#d9efff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: TACTICAL_FONT,
  },

  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#2f6fa1",
    backgroundColor: "#12324a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#cfeaff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    fontFamily: TACTICAL_FONT,
  },
  secondaryButton: {
    minWidth: 88,
    minHeight: 46,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#2a4a5e",
    backgroundColor: "#0b1419",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: "#a9c4d6",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.9,
    fontFamily: TACTICAL_FONT,
  },
  connectButton: {
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.42,
  },

  panel: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#1c3444",
    backgroundColor: "#08131c",
    padding: 10,
  },
  panelHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  panelTitle: {
    color: "#e1f1ff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.7,
    fontFamily: TACTICAL_FONT,
  },
  cardLabel: {
    color: "#7a9bb0",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    fontFamily: TACTICAL_FONT,
  },
  panelTag: {
    color: "#7fcaff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: TACTICAL_FONT,
  },
  panelCount: {
    minWidth: 28,
    textAlign: "center",
    color: "#cfeaff",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    backgroundColor: "#0f2533",
    borderWidth: 1,
    borderColor: "#1e4255",
    fontFamily: TACTICAL_FONT,
  },

  statusInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  statusText: {
    color: "#cfe4f2",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
    fontFamily: TACTICAL_FONT,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 2,
    backgroundColor: "#0e1f2b",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1e3a4d",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 1,
  },
  progressIdle: {
    width: "16%",
    backgroundColor: "#35515e",
  },
  progressScanning: {
    width: "72%",
    backgroundColor: "#5cc8ff",
  },
  progressComplete: {
    width: "100%",
    backgroundColor: "#4da3ff",
  },

  deviceListContent: {
    gap: 8,
  },
  deviceCard: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#1c3444",
    backgroundColor: "#0c1720",
    padding: 10,
  },
  deviceCardSelected: {
    borderColor: "#4da3ff",
    backgroundColor: "#0f2230",
  },
  deviceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  deviceNameBlock: {
    flex: 1,
  },
  deviceName: {
    color: "#e6f4ff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
    letterSpacing: 0.6,
    fontFamily: TACTICAL_FONT,
  },
  deviceId: {
    color: "#7a97ab",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: TACTICAL_FONT,
  },
  devicePower: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    overflow: "hidden",
    fontFamily: TACTICAL_FONT,
  },
  devicePowerOn: {
    color: "#6ee7ff",
    backgroundColor: "#102a33",
  },
  devicePowerOff: {
    color: "#ff9b9b",
    backgroundColor: "#2a1414",
  },
  deviceMetaGrid: {
    flexDirection: "row",
    gap: 8,
  },
  metaChip: {
    flex: 1,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#1c3444",
    backgroundColor: "#09141b",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  metaChipLabel: {
    color: "#7a9bb0",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginBottom: 4,
    fontFamily: TACTICAL_FONT,
  },
  metaChipValue: {
    color: "#d7ecff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: TACTICAL_FONT,
  },

  emptyState: {
    minHeight: 110,
    borderRadius: 3,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#244153",
    backgroundColor: "#0a131a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  emptyStateText: {
    color: "#87a1b4",
    textAlign: "center",
    lineHeight: 19,
    fontSize: 13,
    fontFamily: TACTICAL_FONT,
  },
  emptyDetail: {
    minHeight: 110,
    borderRadius: 3,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#244153",
    backgroundColor: "#0a131a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  detailCard: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#1c3444",
    backgroundColor: "#0c1720",
    padding: 10,
    marginBottom: 10,
  },
  detailHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  detailTitleBlock: {
    flex: 1,
  },
  detailName: {
    color: "#e6f4ff",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 3,
    letterSpacing: 0.7,
    fontFamily: TACTICAL_FONT,
  },
  detailId: {
    color: "#7a97ab",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: TACTICAL_FONT,
  },
  detailPowerBadge: {
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  detailPowerBadgeOn: {
    backgroundColor: "#102a33",
    borderColor: "#2e596f",
  },
  detailPowerBadgeOff: {
    backgroundColor: "#2a1616",
    borderColor: "#6b2c2c",
  },
  detailPowerBadgeText: {
    color: "#dff4ff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: TACTICAL_FONT,
  },
  specGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  specCell: {
    width: "48%",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#1c3444",
    backgroundColor: "#09141b",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  specLabel: {
    color: "#7a9bb0",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: TACTICAL_FONT,
  },
  specValue: {
    color: "#d7ecff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: TACTICAL_FONT,
  },

  resultCard: {
    marginTop: 10,
    borderRadius: 3,
    borderWidth: 1,
    padding: 10,
  },
  resultIdle: {
    borderColor: "#1f3442",
    backgroundColor: "#0b151c",
  },
  resultAttempting: {
    borderColor: "#2b5f83",
    backgroundColor: "#0c1b26",
  },
  resultSuccess: {
    borderColor: "#3b7ca5",
    backgroundColor: "#0d1f2a",
  },
  resultLimited: {
    borderColor: "#7a6a2f",
    backgroundColor: "#1a160c",
  },
  resultFailure: {
    borderColor: "#6b2c2c",
    backgroundColor: "#1a0e0e",
  },
  resultBadge: {
    color: "#d7ecff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: TACTICAL_FONT,
  },
  resultText: {
    color: "#cfe4f2",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: TACTICAL_FONT,
  },
});
