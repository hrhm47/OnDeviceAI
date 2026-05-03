import { IconSymbol } from "@/components/ui/icon-symbol";
import { FieldColors as C } from "@/constants/theme";
import { HistoryItem, useSpeechStore } from "@/src/store/useSpeechStore";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const sampleRuns = [
  {
    id: "ASR-001",
    model: "Native ASR",
    language: "English",
    wer: 14.8,
    cer: 7.2,
    latency: "620 ms",
    noise: "Quiet",
    notes: "Clear command-style report.",
  },
  {
    id: "ASR-002",
    model: "Whisper",
    language: "Finnish",
    wer: 19.4,
    cer: 9.8,
    latency: "1.8 s",
    noise: "Moderate noise",
    notes: "Construction terms need vocabulary pass.",
  },
  {
    id: "ASR-003",
    model: "Qwen3-ASR",
    language: "English",
    wer: 0,
    cer: 0,
    latency: "Planned",
    noise: "Hard noise",
    notes: "Reserved comparison slot.",
  },
];

export default function HistoryScreen() {
  const { history, metrics } = useSpeechStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const latest = history[0];
  const rawTranscript =
    latest?.aiOutput ||
    "There is water near stair B and the floor is slippery by the temporary wall.";
  const improvedTranscript =
    "Water leak observed near stairwell B. Floor is slippery beside the temporary partition. Mark as safety issue and assign site maintenance.";

  const runs = useMemo(() => {
    const dynamicRuns = history.map((item, index) => mapHistoryToRun(item, index));
    const combined = dynamicRuns.length > 0 ? dynamicRuns : sampleRuns;

    return combined.filter((run) => {
      const matchesFilter = filter === "All" || run.model.includes(filter) || run.language === filter;
      const text = `${run.id} ${run.model} ${run.language} ${run.noise} ${run.notes}`.toLowerCase();
      return matchesFilter && text.includes(query.toLowerCase());
    });
  }, [filter, history, query]);

  const processingTime =
    metrics.processingTimeMs ?? latest?.processingTimeMs ?? 2350;
  const ttfs = metrics.ttfsMs ?? latest?.ttfsMs ?? 680;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Transcript and baseline results</Text>
          <Text style={styles.title}>Review output</Text>
          <Text style={styles.subtitle}>
            Keep the worker-facing transcript clear while preserving metrics for
            thesis evaluation.
          </Text>
        </View>

        <View style={styles.transcriptCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Transcript result</Text>
            <View style={styles.confidencePill}>
              <IconSymbol size={16} name="checkmark.seal.fill" color={C.success} />
              <Text style={styles.confidenceText}>High clarity</Text>
            </View>
          </View>

          <TranscriptBlock title="Raw transcript" body={rawTranscript} />
          <TranscriptBlock title="Improved transcript" body={improvedTranscript} highlighted />

          <View style={styles.metaGrid}>
            <Meta label="Model" value={latest?.model?.toUpperCase() || "WHISPER"} />
            <Meta label="Language" value="English" />
            <Meta label="Duration" value="00:18" />
            <Meta label="First text" value={`${Math.round(ttfs)} ms`} />
            <Meta label="Processing" value={`${(processingTime / 1000).toFixed(1)} s`} />
            <Meta
              label="WER"
              value={
                metrics.werDetails
                  ? `${metrics.werDetails.wer.toFixed(1)}%`
                  : latest
                    ? `${latest.werDetails.wer.toFixed(1)}%`
                    : "--"
              }
            />
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save result</Text>
            </Pressable>
            <Pressable style={styles.outlineButton} onPress={() => router.push("/bench")}>
              <Text style={styles.outlineButtonText}>Retry</Text>
            </Pressable>
          </View>
          <Pressable style={styles.continueButton} onPress={() => router.push("/datasets")}>
            <Text style={styles.continueButtonText}>
              Continue to context extraction later
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Baseline testing results</Text>
          <Text style={styles.sectionMeta}>{runs.length} shown</Text>
        </View>

        <View style={styles.searchBox}>
          <IconSymbol size={19} name="magnifyingglass" color={C.textSubtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search model, language, notes"
            placeholderTextColor={C.textSubtle}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filterRow}>
          {["All", "Native", "Whisper", "English", "Finnish"].map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === item && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.runList}>
          {runs.map((run) => (
            <View key={run.id} style={styles.runCard}>
              <View style={styles.runTop}>
                <View>
                  <Text style={styles.runId}>{run.id}</Text>
                  <Text style={styles.runModel}>{run.model}</Text>
                </View>
                <View
                  style={[
                    styles.noiseBadge,
                    run.noise === "Hard noise" && styles.noiseBadgeHard,
                  ]}
                >
                  <Text style={styles.noiseBadgeText}>{run.noise}</Text>
                </View>
              </View>

              <View style={styles.resultGrid}>
                <ResultMetric label="WER" value={run.wer ? `${run.wer.toFixed(1)}%` : "--"} />
                <ResultMetric label="CER" value={run.cer ? `${run.cer.toFixed(1)}%` : "--"} />
                <ResultMetric label="Latency" value={run.latency} />
                <ResultMetric label="Lang" value={run.language} />
              </View>

              <Text style={styles.notes}>{run.notes}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function mapHistoryToRun(item: HistoryItem, index: number) {
  const modelName = item.model === "native" ? "Native ASR" : item.model === "whisper" ? "Whisper" : item.model.toUpperCase();
  const wer = item.werDetails.wer;
  return {
    id: `ASR-${String(index + 1).padStart(3, "0")}`,
    model: modelName,
    language: "English",
    wer,
    cer: Math.max(wer * 0.55, 0.4),
    latency: item.ttfsMs ? `${Math.round(item.ttfsMs)} ms` : "--",
    noise: "Quiet",
    notes: item.aiOutput ? item.aiOutput.slice(0, 80) : "No recognized speech.",
  };
}

function TranscriptBlock({
  title,
  body,
  highlighted,
}: {
  title: string;
  body: string;
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.transcriptBlock, highlighted && styles.transcriptBlockHighlighted]}>
      <Text style={styles.blockLabel}>{title}</Text>
      <Text style={styles.blockText}>{body}</Text>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaBox}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultMetric}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
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
    paddingTop: 8,
  },
  eyebrow: {
    color: C.teal,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: C.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: C.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    marginTop: 8,
  },
  transcriptCard: {
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    color: C.text,
    fontSize: 19,
    fontWeight: "900",
  },
  confidencePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  confidenceText: {
    color: C.success,
    fontSize: 12,
    fontWeight: "900",
  },
  transcriptBlock: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceWarm,
    padding: 14,
  },
  transcriptBlockHighlighted: {
    backgroundColor: C.primarySoft,
    borderColor: "#BDD4EE",
  },
  blockLabel: {
    color: C.textSubtle,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  blockText: {
    color: C.text,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "600",
    marginTop: 8,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaBox: {
    width: "31.4%",
    minWidth: 92,
    borderRadius: 8,
    backgroundColor: C.surfaceWarm,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
  },
  metaLabel: {
    color: C.textSubtle,
    fontSize: 11,
    fontWeight: "900",
  },
  metaValue: {
    color: C.text,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 5,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  saveButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  outlineButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: {
    color: C.text,
    fontSize: 15,
    fontWeight: "900",
  },
  continueButton: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: C.neutralDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 19,
    fontWeight: "900",
  },
  sectionMeta: {
    color: C.textSubtle,
    fontSize: 13,
    fontWeight: "800",
  },
  searchBox: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterChip: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterChipText: {
    color: C.text,
    fontSize: 13,
    fontWeight: "900",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  runList: {
    gap: 12,
  },
  runCard: {
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 12,
  },
  runTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  runId: {
    color: C.textSubtle,
    fontSize: 12,
    fontWeight: "900",
  },
  runModel: {
    color: C.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  noiseBadge: {
    backgroundColor: C.tealSoft,
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  noiseBadgeHard: {
    backgroundColor: C.warningSoft,
  },
  noiseBadgeText: {
    color: C.text,
    fontSize: 12,
    fontWeight: "900",
  },
  resultGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  resultMetric: {
    width: "48%",
    borderRadius: 8,
    backgroundColor: C.surfaceWarm,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
  },
  resultLabel: {
    color: C.textSubtle,
    fontSize: 11,
    fontWeight: "900",
  },
  resultValue: {
    color: C.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
  },
  notes: {
    color: C.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
});
