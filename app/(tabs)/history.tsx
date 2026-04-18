import { IconSymbol } from "@/components/ui/icon-symbol";
import { HistoryItem, useSpeechStore } from "@/src/store/useSpeechStore";
import React, { useState } from "react";
import {
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function HistoryScreen() {
  const { history } = useSpeechStore();
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const formatPercent = (val: number) => {
    // val is WER %, so accuracy = 100 - wer
    const acc = Math.max(0, 100 - val);
    return acc.toFixed(1) + "%";
  };

  const getFormatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const renderDiffText = (item: HistoryItem) => {
    // Simple mock diff logic renderer
    // In a full implementation, you'd use a diff library to split the exact words.
    // Here we will just render the final AI output and highlight it conceptually.
    return (
      <View style={styles.diffBox}>
        <Text style={styles.diffGTTitle}>GROUND TRUTH</Text>
        <Text style={styles.diffGTCore}>{item.groundTruth}</Text>
        <View style={styles.divider} />
        <Text style={styles.diffAITitle}>
          AI OUTPUT (WER: {item.werDetails.wer.toFixed(1)}%)
        </Text>
        <Text style={styles.diffAICore}>
          {item.aiOutput || "[No speech recognized]"}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>
            {history.length} total transcriptions
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              size={48}
              name="clock.arrow.circlepath"
              color="#D1D5DB"
            />
            <Text style={styles.emptyText}>No benchmarks executed yet</Text>
          </View>
        ) : (
          history.map((item) => (
            <Pressable
              key={item.id}
              style={styles.card}
              onPress={() => setSelectedItem(item)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.modelPill}>
                  <Text style={styles.modelText}>
                    {item.model.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.timeText}>
                  {getFormatDate(item.timestamp)}
                </Text>
              </View>

              <Text style={styles.transcriptPreview} numberOfLines={2}>
                {`"${item.aiOutput || "[Silence]"}"`}
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.statPill}>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          item.werDetails.wer < 15
                            ? "#13ec80"
                            : item.werDetails.wer < 40
                              ? "#f59e0b"
                              : "#ef4444",
                      },
                    ]}
                  />
                  <Text style={styles.statText}>
                    Accuracy: {formatPercent(item.werDetails.wer)}
                  </Text>
                </View>
                <View style={styles.statPill}>
                  <IconSymbol size={12} name="stopwatch" color="#9CA3AF" />
                  <Text style={styles.statText}>
                    {(item.ttfsMs ? item.ttfsMs / 1000 : 0).toFixed(2)}s
                  </Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedItem} transparent animationType="slide">
        {selectedItem && (
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detail View</Text>
                <Pressable
                  onPress={() => setSelectedItem(null)}
                  style={styles.closeBtn}
                >
                  <IconSymbol size={20} name="xmark" color="#374151" />
                </Pressable>
              </View>

              <View style={styles.modalMetricsRow}>
                <View style={styles.modalMetric}>
                  <Text style={styles.modalMetricLabel}>ACCURACY</Text>
                  <Text
                    style={[
                      styles.modalMetricValue,
                      {
                        color:
                          selectedItem.werDetails.wer < 15
                            ? "#10B981"
                            : selectedItem.werDetails.wer < 40
                              ? "#F59E0B"
                              : "#EF4444",
                      },
                    ]}
                  >
                    {formatPercent(selectedItem.werDetails.wer)}
                  </Text>
                </View>
                <View style={styles.modalMetric}>
                  <Text style={styles.modalMetricLabel}>MODEL</Text>
                  <Text style={styles.modalMetricValue}>
                    {selectedItem.model.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.modalMetric}>
                  <Text style={styles.modalMetricLabel}>LATENCY</Text>
                  <Text style={styles.modalMetricValue}>
                    {(selectedItem.ttfsMs
                      ? selectedItem.ttfsMs / 1000
                      : 0
                    ).toFixed(2)}
                    s
                  </Text>
                </View>
              </View>

              <ScrollView style={styles.diffContainer}>
                {renderDiffText(selectedItem)}

                <View style={styles.statsGrid}>
                  <View
                    style={[
                      styles.statBox,
                      { borderColor: "rgba(34,197,94,0.3)" },
                    ]}
                  >
                    <Text style={[styles.boxLabel, { color: "#13ec80" }]}>
                      SUBSTITUTIONS
                    </Text>
                    <Text style={styles.boxVal}>
                      {selectedItem.werDetails.substitutions}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statBox,
                      { borderColor: "rgba(239,68,68,0.3)" },
                    ]}
                  >
                    <Text style={[styles.boxLabel, { color: "#ef4444" }]}>
                      DELETIONS
                    </Text>
                    <Text style={styles.boxVal}>
                      {selectedItem.werDetails.deletions}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statBox,
                      { borderColor: "rgba(56,189,248,0.3)" },
                    ]}
                  >
                    <Text style={[styles.boxLabel, { color: "#38bdf8" }]}>
                      INSERTIONS
                    </Text>
                    <Text style={styles.boxVal}>
                      {selectedItem.werDetails.insertions}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
    gap: 16,
  },
  emptyText: {
    color: "#9CA3AF",
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modelPill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  modelText: {
    color: "#374151",
    fontSize: 10,
    fontWeight: "bold",
  },
  timeText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontFamily: "Courier",
  },
  transcriptPreview: {
    color: "#111827",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 12,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: "85%",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  modalMetricsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  modalMetric: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  modalMetricLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "bold",
    marginBottom: 4,
  },
  modalMetricValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "bold",
    fontFamily: "Courier",
  },
  diffContainer: {
    flex: 1,
  },
  diffBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    marginBottom: 24,
  },
  diffGTTitle: {
    fontSize: 10,
    color: "#10B981",
    fontWeight: "bold",
    marginBottom: 8,
  },
  diffGTCore: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: 16,
  },
  diffAITitle: {
    fontSize: 10,
    color: "#EF4444",
    fontWeight: "bold",
    marginBottom: 8,
  },
  diffAICore: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 24,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 40,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  boxLabel: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 8,
  },
  boxVal: {
    fontSize: 24,
    color: "#111827",
    fontWeight: "bold",
  },
});
