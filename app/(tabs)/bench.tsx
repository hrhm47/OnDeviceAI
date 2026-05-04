import { IconSymbol } from "@/components/ui/icon-symbol";
import { whisperAvailableModels } from "@/constants/constant";
import { FieldColors as C } from "@/constants/theme";
import type { whisperModels } from "@/constants/types/ModelTypes";
import { useAsrController } from "@/src/features/asr/hooks/useAsrController";
import {
  downloadQwen3AsrModel,
  QWEN3_ASR_DOWNLOAD_URL,
} from "@/src/features/asr/services/asrModelDownloadService";
import type {
  ASRLanguage,
  ASREngineType,
  ASRStreamingMode,
} from "@/src/features/asr/types/asr.types";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const fallbackModels = [
  { id: "native", label: "Native ASR", status: "Ready", detail: "Device speech recognition service", streamingMode: "true-streaming" },
  { id: "whisper", label: "Whisper", status: "Ready", detail: "Bundled local whisper.rn model", streamingMode: "offline-batch" },
  { id: "qwen", label: "Qwen3-ASR", status: "Model files missing", detail: "Sherpa-ONNX adapter, requires model files", streamingMode: "vad-segmented" },
  { id: "parakeet", label: "Parakeet TDT", status: "Model files missing", detail: "Optional experimental Sherpa-ONNX candidate", streamingMode: "vad-segmented" },
] as const;

const languages = [
  { id: "en", label: "English" },
  { id: "fi", label: "Finnish" },
] as const;

const testModes = ["Manual recording", "Predefined test case"] as const;
const noiseLevels = ["Quiet", "Moderate noise", "Hard noise"] as const;

export default function BenchScreen() {
  const [selectedModel, setSelectedModel] = useState<ASREngineType>("native");
  const [selectedLanguage, setSelectedLanguage] = useState<ASRLanguage>("en");
  const [whisperModel, setWhisperModel] = useState<whisperModels>("tiny.en");
  const [selectedMode, setSelectedMode] =
    useState<(typeof testModes)[number]>("Manual recording");
  const [noise, setNoise] = useState<(typeof noiseLevels)[number]>("Quiet");
  const [modelSetupMessage, setModelSetupMessage] = useState<string | null>(null);
  const [modelDownloadProgress, setModelDownloadProgress] = useState<number | null>(null);
  const [isDownloadingModel, setDownloadingModel] = useState(false);

  const {
    engines,
    status,
    isRecording,
    isTranscribing,
    recordingDurationMs,
    latestResult,
    error,
    vadStatus,
    partialTranscript,
    liveTranscript,
    timeToFirstTextMs,
    refreshEngines,
    startRecording,
    stopRecordingAndTranscribe,
    reset,
  } = useAsrController({
    engineId: selectedModel,
    language: selectedLanguage,
    whisperModel,
  });

  const models = useMemo(() => {
    if (!engines.length) {
      return fallbackModels;
    }

    return engines.map((engine) => ({
      id: engine.engineType,
      label: engine.name,
      status: engine.languageSupport.includes(selectedLanguage)
        ? toStatusLabel(engine.status)
        : "Unsupported language",
      detail: engine.detail,
      streamingMode: engine.streamingMode,
    }));
  }, [engines, selectedLanguage]);

  const selectedModelInfo = useMemo(
    () => models.find((model) => model.id === selectedModel) ?? models[0],
    [models, selectedModel],
  );
  const selectedEngineMetadata = useMemo(
    () =>
      engines.find(
        (engine) => engine.engineType === selectedModel || engine.id === selectedModel,
      ),
    [engines, selectedModel],
  );
  const selectedModelNeedsDownload =
    selectedEngineMetadata?.status === "model-files-missing" ||
    selectedModelInfo.status === "Model files missing";
  const selectedStreamingMode =
    latestResult?.streamingMode ??
    selectedEngineMetadata?.streamingMode ??
    selectedModelInfo.streamingMode;
  const limitationMessage = getModelLimitationMessage(
    selectedModel,
    selectedStreamingMode,
  );

  useEffect(() => {
    setModelSetupMessage(null);
    setModelDownloadProgress(null);
  }, [selectedModel]);

  const transcript =
    latestResult?.transcript ||
    liveTranscript ||
    partialTranscript ||
    (isRecording
      ? selectedStreamingMode === "true-streaming"
        ? "Listening for live speech."
        : "Recording audio. Transcript appears after each speech segment or when you stop."
      : "Transcript will appear here after transcription.");

  const statusLabel = isRecording
    ? "Recording"
    : isTranscribing
      ? status === "saving"
        ? "Saving"
        : "Transcribing"
      : error
        ? "Error"
        : "Waiting";

  const handleRecordPress = async () => {
    if (isRecording) {
      await stopRecordingAndTranscribe();
      return;
    }

    await startRecording();
  };

  const handleCancel = () => {
    reset();
  };

  const handleQwenDownload = async () => {
    setDownloadingModel(true);
    setModelSetupMessage("Starting Qwen3-ASR model download.");
    setModelDownloadProgress(0);

    try {
      const localPath = await downloadQwen3AsrModel({
        onProgress: (progress) => {
          setModelDownloadProgress(progress.percent);
          setModelSetupMessage(progress.message);
        },
      });
      setModelSetupMessage(`Qwen3-ASR model ready at ${localPath}`);
      await refreshEngines();
    } catch (downloadError) {
      setModelSetupMessage(
        `Qwen3-ASR download failed. Manual URL: ${QWEN3_ASR_DOWNLOAD_URL}. ${
          downloadError instanceof Error ? downloadError.message : String(downloadError)
        }`,
      );
    } finally {
      setDownloadingModel(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ASR experiment setup</Text>
          <Text style={styles.title}>Configure and record</Text>
          <Text style={styles.subtitle}>
            Baseline ASR testing with a shared recording flow and standardized
            transcription results.
          </Text>
        </View>

        <Section title="ASR model" meta={selectedModelInfo.status}>
          <View style={styles.optionGrid}>
            {models.map((model) => (
              <Pressable
                key={model.id}
                onPress={() => setSelectedModel(model.id)}
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
          <Section title="Whisper model file" meta={whisperModel}>
            <View style={styles.chipRow}>
              {whisperAvailableModels.map((model) => (
                <Pressable
                  key={model.id}
                  onPress={() => setWhisperModel(model.title)}
                  style={[
                    styles.chip,
                    whisperModel === model.title && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      whisperModel === model.title && styles.chipTextSelected,
                    ]}
                  >
                    {model.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>
        )}

        {selectedModel === "qwen" && selectedModelNeedsDownload && (
          <Section title="Qwen3-ASR model setup" meta={selectedModelInfo.status}>
            <Text style={styles.setupText}>
              Download the Sherpa-ONNX Qwen3-ASR 0.6B int8 package for English
              and Finnish baseline testing.
            </Text>
            <Pressable
              disabled={isDownloadingModel}
              onPress={handleQwenDownload}
              style={[
                styles.setupButton,
                isDownloadingModel && styles.setupButtonDisabled,
              ]}
            >
              <Text style={styles.setupButtonText}>
                {isDownloadingModel ? "Downloading model" : "Download Qwen3-ASR"}
              </Text>
            </Pressable>
            <Text style={styles.setupLinkText}>{QWEN3_ASR_DOWNLOAD_URL}</Text>
            {modelDownloadProgress !== null ? (
              <Text style={styles.setupProgressText}>
                {Math.round(modelDownloadProgress)}%
              </Text>
            ) : null}
            {modelSetupMessage ? (
              <Text style={styles.setupStatusText}>{modelSetupMessage}</Text>
            ) : null}
          </Section>
        )}

        {selectedModel === "parakeet" && selectedModelNeedsDownload && (
          <Section title="Parakeet model setup" meta={selectedModelInfo.status}>
            <Text style={styles.setupText}>
              Parakeet is optional in Phase 1. The app will use it only when the
              Sherpa-ONNX model files are already available; missing files are
              saved as a clean failed run.
            </Text>
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
            <View style={styles.recordTitleBlock}>
              <Text style={styles.recordLabel}>Recording screen</Text>
              <Text style={styles.recordModel}>
                {selectedModelInfo.label} / {selectedLanguage.toUpperCase()}
              </Text>
            </View>
            <View
              style={[
                styles.liveBadge,
                isRecording && styles.liveBadgeActive,
                isTranscribing && styles.liveBadgeProcessing,
                error && styles.liveBadgeError,
              ]}
            >
              <Text
                style={[
                  styles.liveBadgeText,
                  isRecording && styles.liveBadgeTextActive,
                  error && styles.liveBadgeTextError,
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.runtimeGrid}>
            <RuntimePill label="Mode" value={selectedStreamingMode} />
            <RuntimePill label="Mic/VAD" value={formatVadStatus(vadStatus)} />
            <RuntimePill
              label="First text"
              value={timeToFirstTextMs === null ? "--" : formatMs(timeToFirstTextMs)}
            />
          </View>
          <Text style={styles.limitationText}>{limitationMessage}</Text>

          <Text style={styles.timerText}>{formatDuration(recordingDurationMs)}</Text>

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
            disabled={isTranscribing}
            onPress={handleRecordPress}
            style={({ pressed }) => [
              styles.micButton,
              isRecording && styles.micButtonStop,
              isTranscribing && styles.micButtonDisabled,
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
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Reset</Text>
            </Pressable>
            <Pressable
              disabled={isTranscribing}
              style={[
                styles.startTestButton,
                isTranscribing && styles.startTestButtonDisabled,
              ]}
              onPress={handleRecordPress}
            >
              <Text style={styles.startTestText}>
                {isRecording ? "Stop and transcribe" : "Start recording"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.transcriptPreview}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Transcript</Text>
            {latestResult ? <Text style={styles.savedText}>Saved locally</Text> : null}
          </View>
          <Text style={styles.previewText}>{transcript}</Text>
          {partialTranscript && !latestResult ? (
            <Text style={styles.partialText}>Partial: {partialTranscript}</Text>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {latestResult ? (
            <View style={styles.metricsGrid}>
              <Metric label="Model" value={latestResult.modelName} />
              <Metric label="Language" value={latestResult.language.toUpperCase()} />
              <Metric label="Mode" value={latestResult.streamingMode} />
              <Metric
                label="Duration"
                value={formatDuration(latestResult.recordingDurationMs)}
              />
              <Metric
                label="Transcription"
                value={formatMs(latestResult.transcriptionTimeMs)}
              />
              <Metric
                label="First text"
                value={
                  latestResult.timeToFirstTextMs === null ||
                  latestResult.timeToFirstTextMs === undefined
                    ? "--"
                    : formatMs(latestResult.timeToFirstTextMs)
                }
              />
              <Metric
                label="Segments"
                value={String(latestResult.speechSegmentCount ?? 0)}
              />
              <Metric
                label="Avg segment"
                value={
                  latestResult.averageSegmentProcessingTimeMs === null ||
                  latestResult.averageSegmentProcessingTimeMs === undefined
                    ? "--"
                    : formatMs(latestResult.averageSegmentProcessingTimeMs)
                }
              />
              <Metric label="Result ID" value={latestResult.id} />
            </View>
          ) : null}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function RuntimePill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.runtimePill}>
      <Text style={styles.runtimeLabel}>{label}</Text>
      <Text style={styles.runtimeValue}>{value}</Text>
    </View>
  );
}

function toStatusLabel(status: string) {
  if (status === "ready") {
    return "Ready";
  }

  if (status === "model-files-missing") {
    return "Model files missing";
  }

  if (status === "unsupported-language") {
    return "Unsupported language";
  }

  if (status === "initialization-failed") {
    return "Initialization failed";
  }

  return "Not ready";
}

function getModelLimitationMessage(
  model: ASREngineType,
  streamingMode: ASRStreamingMode,
) {
  if (model === "native") {
    return streamingMode === "true-streaming"
      ? "Live transcription active"
      : "Native partial results are platform-limited in this run.";
  }

  if (model === "whisper") {
    return "Whisper will return text after recording or after speech segment.";
  }

  if (model === "qwen") {
    return `Qwen streaming mode: ${streamingMode}`;
  }

  return "Experimental model. Streaming support depends on runtime.";
}

function formatVadStatus(status: string) {
  if (status === "speech-detected") {
    return "speech detected";
  }

  if (status === "processing-segment") {
    return "processing segment";
  }

  return status;
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatMs(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} s`;
  }

  return `${Math.round(value)} ms`;
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
  setupText: {
    color: C.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  setupButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  setupButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  setupButtonDisabled: {
    opacity: 0.6,
  },
  setupButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  setupOutlineButton: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  setupOutlineButtonText: {
    color: C.text,
    fontSize: 14,
    fontWeight: "900",
  },
  setupLinkText: {
    color: C.textSubtle,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  setupProgressText: {
    color: C.primaryPressed,
    fontSize: 14,
    fontWeight: "900",
  },
  setupStatusText: {
    color: C.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
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
  recordTitleBlock: {
    flex: 1,
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
  liveBadgeError: {
    backgroundColor: C.dangerSoft,
  },
  liveBadgeText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  liveBadgeTextActive: {
    color: C.danger,
  },
  liveBadgeTextError: {
    color: C.danger,
  },
  runtimeGrid: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  runtimePill: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  runtimeLabel: {
    color: C.textSubtle,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  runtimeValue: {
    color: C.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },
  limitationText: {
    width: "100%",
    color: C.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 10,
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
  micButtonDisabled: {
    opacity: 0.55,
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
  startTestButtonDisabled: {
    opacity: 0.6,
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
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  previewTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "900",
  },
  savedText: {
    color: C.success,
    fontSize: 13,
    fontWeight: "900",
  },
  previewText: {
    color: C.textMuted,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "600",
    marginTop: 10,
  },
  partialText: {
    color: C.primaryPressed,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 8,
  },
  errorText: {
    color: C.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 10,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  metricBox: {
    width: "48%",
    minHeight: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceWarm,
    padding: 10,
    justifyContent: "center",
  },
  metricLabel: {
    color: C.textSubtle,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  metricValue: {
    color: C.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    marginTop: 4,
  },
});
