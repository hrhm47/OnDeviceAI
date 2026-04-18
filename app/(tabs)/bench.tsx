import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSpeechStore } from "@/src/store/useSpeechStore";
import React, { useMemo } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export default function BenchScreen() {
  const { history, activeModel } = useSpeechStore();

  const averages = useMemo(() => {
    const modelHistory = history.filter((item) => item.model === activeModel);

    if (modelHistory.length === 0) return { wer: 0, ttfsMs: 0, count: 0 };

    const werSum = modelHistory.reduce(
      (acc, curr) => acc + curr.werDetails.wer,
      0,
    );
    const ttfsSum = modelHistory.reduce(
      (acc, curr) => acc + (curr.ttfsMs || 0),
      0,
    );

    return {
      wer: werSum / modelHistory.length,
      ttfsMs: ttfsSum / modelHistory.length,
      count: modelHistory.length,
    };
  }, [history, activeModel]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>TELEMETRY LIVE</Text>
          <Text style={styles.title}>Performance Matrix</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.activeModelTag}>{activeModel.toUpperCase()}</Text>
          <View style={styles.fakeToggle}>
            <View style={styles.fakeKnob}></View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.main}>
        {/* WER Card */}
        <View style={styles.cardWrapper}>
          <View
            style={[
              styles.glowBackground,
              { backgroundColor: "rgba(19, 236, 128, 0.15)" },
            ]}
          />
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={[styles.kpiTitle, { color: "#13ec80" }]}>
                  WORD ERROR RATE
                </Text>
                <View style={styles.kpiValueRow}>
                  <Text style={styles.kpiValueBig}>
                    {averages.wer.toFixed(1)}
                  </Text>
                  <Text style={[styles.kpiUnit, { color: "#13ec80" }]}>%</Text>
                </View>
              </View>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: "rgba(19, 236, 128, 0.1)",
                    borderColor: "rgba(19, 236, 128, 0.2)",
                  },
                ]}
              >
                <IconSymbol size={20} name="checkmark" color="#13ec80" />
              </View>
            </View>
            <View style={styles.cardBottom}>
              <View
                style={[styles.statusBadge, { backgroundColor: "#13ec80" }]}
              >
                <Text style={styles.statusBadgeTextBlack}>NOMINAL</Text>
              </View>
              <Text style={styles.statusDesc}>
                Average over {averages.count} runs
              </Text>
            </View>
          </View>
        </View>

        {/* TTFS Card */}
        <View style={styles.cardWrapper}>
          <View
            style={[
              styles.glowBackground,
              { backgroundColor: "rgba(255, 77, 77, 0.15)" },
            ]}
          />
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={[styles.kpiTitle, { color: "#ff4d4d" }]}>
                  TIME TO FIRST SYMBOL
                </Text>
                <View style={styles.kpiValueRow}>
                  <Text style={styles.kpiValueBig}>
                    {Math.round(averages.ttfsMs)}
                  </Text>
                  <Text style={[styles.kpiUnit, { color: "#ff4d4d" }]}>ms</Text>
                </View>
              </View>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: "rgba(255, 77, 77, 0.1)",
                    borderColor: "rgba(255, 77, 77, 0.2)",
                  },
                ]}
              >
                <IconSymbol size={20} name="timer" color="#ff4d4d" />
              </View>
            </View>
            <View style={styles.cardBottom}>
              <View
                style={[styles.statusBadge, { backgroundColor: "#ff4d4d" }]}
              >
                <Text style={styles.statusBadgeTextWhite}>TRACKING</Text>
              </View>
              <Text style={styles.statusDesc}>Average latency per stream</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#10B981",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
    fontStyle: "italic",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  activeModelTag: {
    fontSize: 10,
    fontFamily: "Courier",
    color: "#6B7280",
    marginBottom: 8,
    letterSpacing: 1,
  },
  fakeToggle: {
    width: 60,
    height: 24,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  fakeKnob: {
    width: 32,
    height: 18,
    backgroundColor: "#9CA3AF",
    borderRadius: 9,
    alignSelf: "flex-end",
  },
  main: {
    padding: 24,
    gap: 20,
  },
  cardWrapper: {
    position: "relative",
  },
  glowBackground: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    opacity: 0.1,
  },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  kpiValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  kpiValueBig: {
    fontSize: 64,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -2,
  },
  kpiUnit: {
    fontSize: 24,
    fontWeight: "bold",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeTextBlack: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  statusBadgeTextWhite: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  statusDesc: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
});
