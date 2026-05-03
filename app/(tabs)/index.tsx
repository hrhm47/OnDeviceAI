import { IconSymbol } from "@/components/ui/icon-symbol";
import { FieldColors as C } from "@/constants/theme";
import { useSpeechStore } from "@/src/store/useSpeechStore";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const workflowSteps = [
  { label: "Record voice", status: "Ready" },
  { label: "On-device ASR", status: "Testing" },
  { label: "Improve transcript", status: "Next" },
  { label: "Autofill report", status: "Preview" },
];

const recentDraft = {
  title: "Water leak near stairwell B",
  site: "Helsinki site 04 / Level 2",
  updated: "Today 14:20",
  status: "Draft",
};

export default function HomeScreen() {
  const { history, activeModel, metrics } = useSpeechStore();
  const latest = history[0];

  const handleNavigate = (path: "/bench" | "/history" | "/datasets") => {
    router.push(path);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>On-device AI reporting</Text>
            <Text style={styles.title}>Construction voice reports</Text>
          </View>
          <View style={styles.deviceBadge}>
            <IconSymbol size={17} name="shield.fill" color={C.success} />
            <Text style={styles.deviceBadgeText}>Private</Text>
          </View>
        </View>

        <View style={styles.workflowCard}>
          <Text style={styles.cardTitle}>Current workflow</Text>
          <Text style={styles.cardCopy}>
            Record a field note, transcribe it on-device, improve construction
            terms, then review the autofilled report before confirming.
          </Text>
          <View style={styles.stepList}>
            {workflowSteps.map((step, index) => (
              <View key={step.label} style={styles.stepRow}>
                <View style={styles.stepIndex}>
                  <Text style={styles.stepIndexText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepLabel}>{step.label}</Text>
                <Text
                  style={[
                    styles.stepStatus,
                    step.status === "Ready" && styles.stepStatusReady,
                  ]}
                >
                  {step.status}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.primaryActions}>
          <Pressable
            style={({ pressed }) => [
              styles.startButton,
              pressed && styles.pressedPrimary,
            ]}
            onPress={() => handleNavigate("/bench")}
          >
            <IconSymbol size={26} name="mic.fill" color="#FFFFFF" />
            <View style={styles.actionTextBlock}>
              <Text style={styles.startButtonText}>Start new voice report</Text>
              <Text style={styles.startButtonSub}>ASR setup and recording</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressedSecondary,
            ]}
            onPress={() => handleNavigate("/datasets")}
          >
            <IconSymbol size={22} name="folder.fill" color={C.primary} />
            <View style={styles.actionTextBlock}>
              <Text style={styles.secondaryButtonText}>Continue draft</Text>
              <Text style={styles.secondaryButtonSub}>
                {recentDraft.title}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.grid}>
          <Pressable style={styles.navCard} onPress={() => handleNavigate("/bench")}>
            <IconSymbol size={24} name="waveform" color={C.teal} />
            <Text style={styles.navTitle}>ASR testing</Text>
            <Text style={styles.navCopy}>
              Compare models, language, noise level, and recording mode.
            </Text>
          </Pressable>
          <Pressable style={styles.navCard} onPress={() => handleNavigate("/history")}>
            <IconSymbol size={24} name="chart.bar.fill" color={C.warning} />
            <Text style={styles.navTitle}>Saved results</Text>
            <Text style={styles.navCopy}>
              Review WER, CER, latency, transcripts, and notes.
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest activity</Text>
          <Text style={styles.sectionMeta}>{history.length} test runs</Text>
        </View>
        <View style={styles.activityCard}>
          <View style={styles.activityTop}>
            <View>
              <Text style={styles.activityLabel}>Active model</Text>
              <Text style={styles.activityValue}>{activeModel.toUpperCase()}</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={styles.readyDot} />
              <Text style={styles.statusPillText}>Ready</Text>
            </View>
          </View>
          <View style={styles.metricRow}>
            <Metric
              label="WER"
              value={
                metrics.werDetails
                  ? `${metrics.werDetails.wer.toFixed(1)}%`
                  : latest
                    ? `${latest.werDetails.wer.toFixed(1)}%`
                    : "--"
              }
            />
            <Metric
              label="TTFT"
              value={
                metrics.ttfsMs
                  ? `${Math.round(metrics.ttfsMs)} ms`
                  : latest?.ttfsMs
                    ? `${Math.round(latest.ttfsMs)} ms`
                    : "--"
              }
            />
            <Metric
              label="Drafts"
              value="3"
            />
          </View>
        </View>

        <View style={styles.projectCard}>
          <View style={styles.projectHeader}>
            <IconSymbol size={22} name="info.circle.fill" color={C.primary} />
            <Text style={styles.cardTitle}>Project status</Text>
          </View>
          <View style={styles.projectRow}>
            <Text style={styles.projectLabel}>Worker-facing flow</Text>
            <Text style={styles.projectValue}>Prototype UI ready</Text>
          </View>
          <View style={styles.projectRow}>
            <Text style={styles.projectLabel}>Research/testing flow</Text>
            <Text style={styles.projectValue}>Baseline collection</Text>
          </View>
          <View style={styles.projectRow}>
            <Text style={styles.projectLabel}>Languages</Text>
            <Text style={styles.projectValue}>English / Finnish</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    padding: 20,
    paddingBottom: 104,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    paddingTop: 8,
  },
  eyebrow: {
    color: C.teal,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: C.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    marginTop: 4,
  },
  deviceBadge: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: C.successSoft,
    borderWidth: 1,
    borderColor: "#B8DDC7",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  deviceBadgeText: {
    color: C.success,
    fontWeight: "800",
    fontSize: 13,
  },
  workflowCard: {
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  cardTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "800",
  },
  cardCopy: {
    color: C.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  stepList: {
    marginTop: 14,
    gap: 10,
  },
  stepRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BDD4EE",
  },
  stepIndexText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  stepLabel: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
  },
  stepStatus: {
    color: C.textSubtle,
    backgroundColor: C.surfaceAlt,
    overflow: "hidden",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  stepStatusReady: {
    color: C.success,
    backgroundColor: C.successSoft,
  },
  primaryActions: {
    gap: 12,
  },
  startButton: {
    minHeight: 64,
    borderRadius: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  startButtonSub: {
    color: "#DCEBFA",
    fontSize: 13,
    marginTop: 2,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 60,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderStrong,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  secondaryButtonText: {
    color: C.text,
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButtonSub: {
    color: C.textSubtle,
    fontSize: 13,
    marginTop: 2,
    fontWeight: "600",
  },
  actionTextBlock: {
    flex: 1,
  },
  pressedPrimary: {
    backgroundColor: C.primaryPressed,
  },
  pressedSecondary: {
    backgroundColor: C.surfaceAlt,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
  },
  navCard: {
    flex: 1,
    minHeight: 150,
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    justifyContent: "space-between",
  },
  navTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
  },
  navCopy: {
    color: C.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionMeta: {
    color: C.textSubtle,
    fontSize: 13,
    fontWeight: "800",
  },
  activityCard: {
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 14,
  },
  activityTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityLabel: {
    color: C.textSubtle,
    fontSize: 13,
    fontWeight: "700",
  },
  activityValue: {
    color: C.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  readyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.success,
  },
  statusPillText: {
    color: C.success,
    fontSize: 12,
    fontWeight: "900",
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: C.surfaceWarm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  metricLabel: {
    color: C.textSubtle,
    fontSize: 12,
    fontWeight: "800",
  },
  metricValue: {
    color: C.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4,
  },
  projectCard: {
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 12,
  },
  projectHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  projectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: C.neutral,
    paddingTop: 12,
  },
  projectLabel: {
    flex: 1,
    color: C.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  projectValue: {
    flex: 1,
    color: C.text,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "900",
  },
});
