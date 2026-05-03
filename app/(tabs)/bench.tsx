import { IconSymbol } from "@/components/ui/icon-symbol";
import { FieldColors as C } from "@/constants/theme";
import { whisperAvailableModels } from "@/constants/constant";
import { useWhisperEngine } from "@/hooks/useWhisperEngine";
import { NativeEngine } from "@/src/engine/NativeEngine";
import { ASREngine, ASRResult } from "@/src/engine/types";
import {
  setTranscriptionDataFunc,
  useSpeechStore,
} from "@/src/store/useSpeechStore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const models = [
  { id: "native", label: "Native ASR", status: "Ready", detail: "Device speech service" },
  { id: "whisper", label: "Whisper", status: "Ready", detail: "Local whisper.rn model" },
  { id: "qwen", label: "Qwen3-ASR", status: "Planned", detail: "Future thesis comparison" },
  { id: "vosk", label: "Vosk", status: "Optional", detail: "Offline baseline" },
] as const;

const languages = [
  { id: "en", label: "English" },
  { id: "fi", label: "Finnish" },
] as const;

const testModes = ["Manual recording", "Predefined test case"] as const;
const noiseLevels = ["Quiet", "Moderate noise", "Hard noise"] as const;

export default function BenchScreen() {
  const {
    activeModel,
    setActiveModel,
    whisperActiveModel,
    setwhisperActiveModel,
    isRecording,
    setRecording,
    liveTranscript,
    startBenchmarkingTimer,
    registerFirstSymbol,
    setLiveTranscript,
    setFinalTranscript,
    finalizeMetrics,
  } = useSpeechStore();

  const {
    init: whisperInitialize,
    start: whisperStart,
    stop: whisperStop,
  } = useWhisperEngine();

  const activeEngine = useRef<ASREngine | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(activeModel);
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "fi">("en");
  const [selectedMode, setSelectedMode] =
    useState<(typeof testModes)[number]>("Manual recording");
  const [noise, setNoise] = useState<(typeof noiseLevels)[number]>("Quiet");
  const [status, setStatus] = useState("Waiting");
  const [elapsed, setElapsed] = useState(0);
  const [isEngineLoading, setEngineLoading] = useState(false);

  const selectedModelInfo = useMemo(
    () => models.find((model) => model.id === selectedModel) ?? models[0],
    [selectedModel],
  );

  useEffect(() => {
    if (!isRecording) {
      setElapsed(0);
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      activeEngine.current?.destroy().catch(console.error);
    };
  }, []);

  const selectModel = (modelId: string) => {
    setSelectedModel(modelId);
    if (modelId === "native" || modelId === "whisper" || modelId === "vosk") {
      setActiveModel(modelId);
    }
  };

  const prepareEngine = async () => {
    setEngineLoading(true);
    setStatus("Preparing");

    try {
      if (selectedModel === "native") {
        const engine = new NativeEngine();
        await engine.init();
        activeEngine.current = engine;
        return;
      }

      if (selectedModel === "whisper") {
        await whisperInitialize(whisperActiveModel);
        return;
      }

      throw new Error(`${selectedModelInfo.label} is shown for planning but is not wired to recording yet.`);
    } finally {
      setEngineLoading(false);
    }
  };

  const handleResult = (result: ASRResult) => {
    registerFirstSymbol();
    setTranscriptionDataFunc(result.text);
    setLiveTranscript(result.text);
    if (result.isFinal) {
      setFinalTranscript((prev: string) => `${prev} ${result.text}`.trim());
    }
  };

  const handleRecordPress = async () => {
    if (isRecording) {
      setStatus("Processing");
      if (selectedModel === "whisper") {
        await whisperStop();
      } else {
        await activeEngine.current?.stop();
      }
      setRecording(false);
      setTimeout(() => {
        finalizeMetrics();
        setStatus("Waiting");
      }, 250);
      return;
    }

    if (selectedModel !== "native" && selectedModel !== "whisper") {
      Alert.alert(
        "Model not connected",
        `${selectedModelInfo.label} is included in the UI plan, but recording is currently enabled for Native ASR and Whisper.`,
      );
      return;
    }

    try {
      startBenchmarkingTimer();
      await prepareEngine();
      setRecording(true);
      setStatus("Recording");

      if (selectedModel === "whisper") {
        await whisperStart(handleResult, (err: Error) => {
          Alert.alert("ASR Error", err.message);
          setStatus("Waiting");
          setRecording(false);
        });
      } else {
        await activeEngine.current?.start(handleResult, (err: Error) => {
          Alert.alert("ASR Error", err.message);
          setStatus("Waiting");
          setRecording(false);
        });
      }
    } catch (err) {
      Alert.alert("Engine not ready", (err as Error).message);
      setStatus("Waiting");
      setRecording(false);
    }
  };

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ASR experiment setup</Text>
          <Text style={styles.title}>Configure and record</Text>
          <Text style={styles.subtitle}>
            Designed for quick field testing while still capturing research
            conditions.
          </Text>
        </View>

        <Section title="ASR model" meta={selectedModelInfo.status}>
          <View style={styles.optionGrid}>
            {models.map((model) => (
              <Pressable
                key={model.id}
                onPress={() => selectModel(model.id)}
                style={[
                  styles.optionCard,
                  selectedModel === model.id && styles.optionCardSelected,
                ]}
              >
                <View style={styles.optionTop}>
                  <Text
                    style={[
                      styles.optionTitle,
                      selectedModel === model.id && styles.optionTitleSelected,
                    ]}
                  >
                    {model.label}
                  </Text>
                  <View
                    style={[
                      styles.statusTag,
                      model.status !== "Ready" && styles.statusTagMuted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTagText,
                        model.status !== "Ready" && styles.statusTagTextMuted,
                      ]}
                    >
                      {model.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.optionDetail}>{model.detail}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        {selectedModel === "whisper" && (
          <Section title="Whisper model file" meta={whisperActiveModel}>
            <View style={styles.chipRow}>
              {whisperAvailableModels.map((model) => (
                <Pressable
                  key={model.id}
                  onPress={() => setwhisperActiveModel(model.title)}
                  style={[
                    styles.chip,
                    whisperActiveModel === model.title && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      whisperActiveModel === model.title && styles.chipTextSelected,
                    ]}
                  >
                    {model.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>
        )}

        <Section title="Language" meta={selectedLanguage === "en" ? "English" : "Finnish"}>
          <View style={styles.segmentRow}>
            {languages.map((language) => (
              <Pressable
                key={language.id}
                onPress={() => setSelectedLanguage(language.id)}
                style={[
                  styles.segment,
                  selectedLanguage === language.id && styles.segmentSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    selectedLanguage === language.id && styles.segmentTextSelected,
                  ]}
                >
                  {language.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Test mode" meta={selectedMode}>
          <View style={styles.segmentColumn}>
            {testModes.map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setSelectedMode(mode)}
                style={[
                  styles.largeOption,
                  selectedMode === mode && styles.largeOptionSelected,
                ]}
              >
                <IconSymbol
                  size={21}
                  name={mode === "Manual recording" ? "mic.fill" : "doc.text.fill"}
                  color={selectedMode === mode ? C.primary : C.textSubtle}
                />
                <Text
                  style={[
                    styles.largeOptionText,
                    selectedMode === mode && styles.largeOptionTextSelected,
                  ]}
                >
                  {mode}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Noise condition" meta={noise}>
          <View style={styles.chipRow}>
            {noiseLevels.map((level) => (
              <Pressable
                key={level}
                onPress={() => setNoise(level)}
                style={[styles.chip, noise === level && styles.chipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    noise === level && styles.chipTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <View style={styles.recordPanel}>
          <View style={styles.recordTop}>
            <View>
              <Text style={styles.recordLabel}>Recording screen</Text>
              <Text style={styles.recordModel}>
                {selectedModelInfo.label} / {selectedLanguage.toUpperCase()}
              </Text>
            </View>
            <View
              style={[
                styles.liveBadge,
                isRecording && styles.liveBadgeActive,
                status === "Processing" && styles.liveBadgeProcessing,
              ]}
            >
              <Text
                style={[
                  styles.liveBadgeText,
                  isRecording && styles.liveBadgeTextActive,
                ]}
              >
                {isEngineLoading ? "Preparing" : status}
              </Text>
            </View>
          </View>

          <Text style={styles.timerText}>{minutes}:{seconds}</Text>

          <View style={styles.waveform}>
            {[18, 34, 24, 46, 30, 56, 22, 38, 28, 50, 20].map((height, index) => (
              <View
                key={index}
                style={[
                  styles.waveBar,
                  { height },
                  isRecording && styles.waveBarActive,
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={handleRecordPress}
            style={({ pressed }) => [
              styles.micButton,
              isRecording && styles.micButtonStop,
              pressed && styles.micButtonPressed,
            ]}
          >
            <IconSymbol
              size={54}
              name={isRecording ? "stop.fill" : "mic.fill"}
              color="#FFFFFF"
            />
          </Pressable>

          <View style={styles.recordActions}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setRecording(false);
                setStatus("Waiting");
                setLiveTranscript("");
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.startTestButton} onPress={handleRecordPress}>
              <Text style={styles.startTestText}>
                {isRecording ? "Stop recording" : "Start recording"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.transcriptPreview}>
          <Text style={styles.previewTitle}>Live transcript</Text>
          <Text style={styles.previewText}>
            {liveTranscript || "Transcript will appear here during recording."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
      </View>
      {children}
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
  section: {
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
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
  optionGrid: {
    gap: 10,
  },
  optionCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceWarm,
    padding: 12,
    minHeight: 76,
  },
  optionCardSelected: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  optionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionTitle: {
    flex: 1,
    color: C.text,
    fontSize: 16,
    fontWeight: "900",
  },
  optionTitleSelected: {
    color: C.primaryPressed,
  },
  optionDetail: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  statusTag: {
    backgroundColor: C.successSoft,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusTagMuted: {
    backgroundColor: C.warningSoft,
  },
  statusTagText: {
    color: C.success,
    fontSize: 12,
    fontWeight: "900",
  },
  statusTagTextMuted: {
    color: C.warning,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  chipText: {
    color: C.text,
    fontSize: 14,
    fontWeight: "800",
  },
  chipTextSelected: {
    color: C.primaryPressed,
  },
  segmentRow: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderStrong,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  segmentSelected: {
    backgroundColor: C.primary,
  },
  segmentText: {
    color: C.text,
    fontSize: 15,
    fontWeight: "900",
  },
  segmentTextSelected: {
    color: "#FFFFFF",
  },
  segmentColumn: {
    gap: 10,
  },
  largeOption: {
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceWarm,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
  },
  largeOptionSelected: {
    backgroundColor: C.primarySoft,
    borderColor: C.primary,
  },
  largeOptionText: {
    color: C.text,
    fontSize: 15,
    fontWeight: "900",
  },
  largeOptionTextSelected: {
    color: C.primaryPressed,
  },
  recordPanel: {
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.borderStrong,
    padding: 16,
    alignItems: "center",
  },
  recordTop: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  recordLabel: {
    color: C.textSubtle,
    fontSize: 13,
    fontWeight: "800",
  },
  recordModel: {
    color: C.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },
  liveBadge: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveBadgeActive: {
    backgroundColor: C.dangerSoft,
  },
  liveBadgeProcessing: {
    backgroundColor: C.warningSoft,
  },
  liveBadgeText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  liveBadgeTextActive: {
    color: C.danger,
  },
  timerText: {
    color: C.text,
    fontSize: 52,
    lineHeight: 62,
    fontWeight: "900",
    marginTop: 18,
  },
  waveform: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 6,
    marginBottom: 18,
  },
  waveBar: {
    width: 8,
    borderRadius: 4,
    backgroundColor: C.borderStrong,
  },
  waveBarActive: {
    backgroundColor: C.primary,
  },
  micButton: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#BBD5F1",
  },
  micButtonStop: {
    backgroundColor: C.danger,
    borderColor: "#F2BCB8",
  },
  micButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  recordActions: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  cancelButtonText: {
    color: C.text,
    fontSize: 15,
    fontWeight: "900",
  },
  startTestButton: {
    flex: 1.5,
    minHeight: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.neutralDark,
  },
  startTestText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  transcriptPreview: {
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  previewTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "900",
  },
  previewText: {
    color: C.textMuted,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "600",
    marginTop: 10,
  },
});
