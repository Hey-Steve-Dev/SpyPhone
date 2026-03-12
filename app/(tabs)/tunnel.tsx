import PhoneFrame from "@/components/PhoneFrame";
import { useGameStore } from "@/store/useGameStore";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const HOME_BAR_SPACE = 44;

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

  const selectedDevice = useMemo(
    () => nearbyDevices.find((d) => d.id === selectedTunnelDeviceId) ?? null,
    [nearbyDevices, selectedTunnelDeviceId],
  );

  return (
    <PhoneFrame>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>FIELD ACCESS</Text>
          <Text style={styles.title}>Tunnel</Text>
          <Text style={styles.subtitle}>
            Search powered devices and establish a remote route.
          </Text>
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

        <View style={styles.statusCard}>
          <Text style={styles.cardLabel}>STATUS</Text>

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

        <View style={styles.listPanel}>
          <Text style={styles.panelTitle}>Detected Devices</Text>

          {!tunnelScanComplete && !isTunnelScanning ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No scan has been run yet.
              </Text>
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
            {nearbyDevices.map((device) => {
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
                    <Text style={styles.deviceName}>{device.name}</Text>
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

                  <Text style={styles.deviceMeta}>
                    Signal: {device.signalStrength}
                  </Text>
                  <Text style={styles.deviceMeta}>Type: {device.kind}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.detailPanel}>
          <Text style={styles.panelTitle}>Tunnel Control</Text>

          {!selectedDevice ? (
            <View style={styles.emptyDetail}>
              <Text style={styles.emptyStateText}>
                Select a device to inspect tunnel options.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.detailCard}>
                <Text style={styles.detailName}>{selectedDevice.name}</Text>
                <Text style={styles.detailLine}>
                  Power: {selectedDevice.poweredOn ? "ONLINE" : "OFFLINE"}
                </Text>
                <Text style={styles.detailLine}>
                  Signal: {selectedDevice.signalStrength}
                </Text>
                <Text style={styles.detailLine}>
                  Shell Support: {selectedDevice.supportsShell ? "YES" : "NO"}
                </Text>
                <Text style={styles.detailLine}>
                  Aux Access: {selectedDevice.supportsAuxOps ? "YES" : "NO"}
                </Text>
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

              <View style={styles.resultCard}>
                <Text style={styles.cardLabel}>RESULT</Text>
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
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#071018",
  },
  screenContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: HOME_BAR_SPACE + 22,
    gap: 14,
  },
  header: {
    marginBottom: 2,
  },
  eyebrow: {
    color: "#6ea8c7",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  title: {
    color: "#e6f2ff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: "#8ea4b8",
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#5c7cff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  secondaryButton: {
    minWidth: 92,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#294252",
    backgroundColor: "#0d1822",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#b7cad7",
    fontSize: 13,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  statusCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#183041",
    backgroundColor: "#0b1620",
    padding: 14,
  },
  cardLabel: {
    color: "#6ea8c7",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  statusInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  statusText: {
    color: "#d7e6f3",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#112330",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressIdle: {
    width: "18%",
    backgroundColor: "#2b4250",
  },
  progressScanning: {
    width: "72%",
    backgroundColor: "#74b7ff",
  },
  progressComplete: {
    width: "100%",
    backgroundColor: "#6d8cff",
  },
  listPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#183041",
    backgroundColor: "#0b1620",
    padding: 12,
  },
  detailPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#183041",
    backgroundColor: "#0b1620",
    padding: 12,
  },
  panelTitle: {
    color: "#e4f1ff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  deviceListContent: {
    gap: 10,
  },
  deviceCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1d3342",
    backgroundColor: "#0f1d28",
    padding: 12,
  },
  deviceCardSelected: {
    borderColor: "#6d8cff",
    backgroundColor: "#132338",
  },
  deviceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  deviceName: {
    flex: 1,
    color: "#e6f2ff",
    fontSize: 15,
    fontWeight: "700",
  },
  devicePower: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  devicePowerOn: {
    color: "#83e6ad",
  },
  devicePowerOff: {
    color: "#ff8f8f",
  },
  deviceMeta: {
    color: "#91a8ba",
    fontSize: 13,
    marginTop: 2,
  },
  emptyState: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1d3342",
    backgroundColor: "#0e1b25",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  emptyStateText: {
    color: "#8ea4b8",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyDetail: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1d3342",
    backgroundColor: "#0f1d28",
    padding: 12,
    marginBottom: 12,
  },
  detailName: {
    color: "#e6f2ff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },
  detailLine: {
    color: "#b2c4d2",
    fontSize: 14,
    marginBottom: 6,
  },
  resultCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1d3342",
    backgroundColor: "#0f1d28",
    padding: 12,
  },
  resultText: {
    color: "#d7e6f3",
    fontSize: 14,
    lineHeight: 20,
  },
});
