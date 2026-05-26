import { IconSymbol } from "@/components/ui/icon-symbol";
import { whisperAvailableModels } from "@/constants/constant";
import { FieldColors as C } from "@/constants/theme";
import type { whisperModels } from "@/constants/types/ModelTypes";
import {
  exportManualASRResultsCsv,
  getManualASRTestResults,
  getManualTestCases,
  getTestSessions,
  saveManualASRTestResult,
  saveTestSession,
} from "@/src/features/asr/asrTesting/services/manualAsrTestingStorage";
import type {
  ManualASRTestCase,
  ManualASRTestResult,
  TestSession,
} from "@/src/features/asr/asrTesting/types/manualAsrTesting.types";
import { createManualASRTestResult } from "@/src/features/asr/asrTesting/utils/manualAsrResultBuilder";
import { useAsrController } from "@/src/features/asr/hooks/useAsrController";
import {
  downloadQwen3AsrModel,
  downloadSharedSileroVadModel,
  QWEN3_ASR_DOWNLOAD_URL,
  SILERO_VAD_DOWNLOAD_URL,
} from "@/src/features/asr/services/asrModelDownloadService";
import type {
  ASREngineType,
  ASRLanguage,
  ASRRuntimeMode,
} from "@/src/features/asr/types/asr.types";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const fallbackModels = [
  {
    id: "native",
    label: "Native ASR",
    status: "Ready",
    detail: "Device speech recognition service",
    runtimeMode: "true-streaming",
  },
  {
    id: "whisper",
    label: "Whisper base multilingual",
    status: "Ready",
    detail: "Bundled local whisper.rn model for full recordings",
    runtimeMode: "offline-full-recording",
  },
  {
    id: "qwen",
    label: "Qwen3-ASR",
    status: "Model files missing",
    detail: "Sherpa-ONNX adapter, requires model files",
    runtimeMode: "unsupported",
  },
  // {
  //   id: "parakeet",
  //   label: "Parakeet",
  //   status: "Model files missing",
  //   detail: "NVIDIA Parakeet via Sherpa-ONNX, if installed",
  //   runtimeMode: "unsupported",
  // },
] as const;

const languages = [
  { id: "en", label: "English" },
  { id: "fi", label: "Finnish" },
] as const;

const testModes = ["Manual mobile test"] as const;

export default function BenchScreen() {
  const [selectedModel, setSelectedModel] = useState<ASREngineType>("native");
  const [selectedLanguage, setSelectedLanguage] = useState<ASRLanguage>("en");
  const [whisperModel, setWhisperModel] = useState<whisperModels>("base");
  const [selectedMode, setSelectedMode] =
    useState<(typeof testModes)[number]>("Manual mobile test");
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState(
    "S00_QUIET_UNDER_50DBA",
  );
  const [testCases] = useState<ManualASRTestCase[]>(() => getManualTestCases());
  const [selectedTestCaseId, setSelectedTestCaseId] = useState("");
  const [sessionSaveMessage, setSessionSaveMessage] = useState<string | null>(
    null,
  );
  const [manualResult, setManualResult] = useState<ManualASRTestResult | null>(
    null,
  );
  const [manualResultSaved, setManualResultSaved] = useState(false);
  const [manualResultNotes, setManualResultNotes] = useState("");
  const [manualResultsCount, setManualResultsCount] = useState(0);
  const [csvExportPath, setCsvExportPath] = useState<string | null>(null);
  const [phase2ActionMessage, setPhase2ActionMessage] = useState<string | null>(
    null,
  );
  const [modelSetupMessage, setModelSetupMessage] = useState<string | null>(
    null,
  );
  const [modelDownloadProgress, setModelDownloadProgress] = useState<
    number | null
  >(null);
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
    segmentTranscripts,
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

  const visibleTestCases = useMemo(
    () =>
      testCases.filter((testCase) => testCase.language === selectedLanguage),
    [selectedLanguage, testCases],
  );

  const selectedTestCase = useMemo(
    () =>
      visibleTestCases.find(
        (testCase) => testCase.testCaseId === selectedTestCaseId,
      ) ?? visibleTestCases[0],
    [selectedTestCaseId, visibleTestCases],
  );

  const selectedSession = useMemo(
    () =>
      testSessions.find((session) => session.sessionId === selectedSessionId) ??
      testSessions[0],
    [selectedSessionId, testSessions],
  );

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
      runtimeMode: engine.runtimeMode,
    }));
  }, [engines, selectedLanguage]);

  const selectedModelInfo = useMemo(
    () => models.find((model) => model.id === selectedModel) ?? models[0],
    [models, selectedModel],
  );
  const selectedEngineMetadata = useMemo(
    () =>
      engines.find(
        (engine) =>
          engine.engineType === selectedModel || engine.id === selectedModel,
      ),
    [engines, selectedModel],
  );
  const selectedModelNeedsDownload =
    selectedEngineMetadata?.status === "model-files-missing" ||
    selectedModelInfo.status === "Model files missing";
  const selectedRuntimeMode =
    latestResult?.runtimeMode ??
    selectedEngineMetadata?.runtimeMode ??
    selectedModelInfo.runtimeMode;
  const limitationMessage = getModelLimitationMessage(
    selectedModel,
    selectedRuntimeMode,
  );

  useEffect(() => {
    setModelSetupMessage(null);
    setModelDownloadProgress(null);
  }, [selectedModel]);

  useEffect(() => {
    let isActive = true;

    getTestSessions()
      .then((sessions) => {
        if (!isActive) {
          return;
        }
        setTestSessions(sessions);
        setSelectedSessionId((current) =>
          sessions.some((session) => session.sessionId === current)
            ? current
            : (sessions[0]?.sessionId ?? current),
        );
      })
      .catch((loadError) => {
        setPhase2ActionMessage(
          `Could not load Phase 2 sessions: ${
            loadError instanceof Error ? loadError.message : String(loadError)
          }`,
        );
      });

    getManualASRTestResults()
      .then((results) => {
        if (isActive) {
          setManualResultsCount(results.length);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedTestCaseId && visibleTestCases[0]) {
      setSelectedTestCaseId(visibleTestCases[0].testCaseId);
      return;
    }

    const selectedStillVisible = visibleTestCases.some(
      (testCase) => testCase.testCaseId === selectedTestCaseId,
    );
    if (!selectedStillVisible && visibleTestCases[0]) {
      setSelectedTestCaseId(visibleTestCases[0].testCaseId);
    }
  }, [selectedTestCaseId, visibleTestCases]);

  useEffect(() => {
    if (!selectedTestCase || selectedTestCase.language === selectedLanguage) {
      return;
    }

    setSelectedLanguage(selectedTestCase.language);
  }, [selectedLanguage, selectedTestCase]);

  useEffect(() => {
    if (!latestResult || !selectedTestCase || !selectedSession) {
      setManualResult(null);
      setManualResultSaved(false);
      return;
    }

    setManualResult(
      createManualASRTestResult(
        latestResult,
        selectedTestCase,
        selectedSession,
        manualResultNotes,
      ),
    );
    setManualResultSaved(false);
  }, [latestResult, manualResultNotes, selectedSession, selectedTestCase]);

  const transcript =
    latestResult?.transcript ||
    liveTranscript ||
    partialTranscript ||
    (isRecording
      ? selectedRuntimeMode === "true-streaming"
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
          downloadError instanceof Error
            ? downloadError.message
            : String(downloadError)
        }`,
      );
    } finally {
      setDownloadingModel(false);
    }
  };

  const handleSharedVadDownload = async () => {
    setDownloadingModel(true);
    setModelSetupMessage("Starting shared Silero VAD download.");
    setModelDownloadProgress(0);

    try {
      const localPath = await downloadSharedSileroVadModel({
        onProgress: (progress) => {
          setModelDownloadProgress(progress.percent);
          setModelSetupMessage(progress.message);
        },
      });
      setModelSetupMessage(`Shared Silero VAD model ready at ${localPath}`);
    } catch (downloadError) {
      setModelSetupMessage(
        `Silero VAD download failed. Manual URL: ${SILERO_VAD_DOWNLOAD_URL}. ${
          downloadError instanceof Error
            ? downloadError.message
            : String(downloadError)
        }`,
      );
    } finally {
      setDownloadingModel(false);
    }
  };

  const updateSelectedSession = (
    updater: (session: TestSession) => TestSession,
  ) => {
    if (!selectedSession) {
      return;
    }

    setSessionSaveMessage(null);
    setTestSessions((current) =>
      current.map((session) =>
        session.sessionId === selectedSession.sessionId
          ? updater(session)
          : session,
      ),
    );
  };

  const handleSaveSession = async () => {
    if (!selectedSession) {
      return;
    }

    try {
      await saveTestSession(selectedSession);
      setSessionSaveMessage("Session metadata saved locally.");
    } catch (saveError) {
      setSessionSaveMessage(
        `Session save failed: ${
          saveError instanceof Error ? saveError.message : String(saveError)
        }`,
      );
    }
  };

  const handleSaveManualResult = async () => {
    if (!manualResult) {
      return;
    }

    try {
      await saveManualASRTestResult({
        ...manualResult,
        notes: manualResultNotes,
      });
      const results = await getManualASRTestResults();
      setManualResultsCount(results.length);
      setManualResultSaved(true);
      setPhase2ActionMessage("Phase 2 result saved locally.");
    } catch (saveError) {
      setPhase2ActionMessage(
        `Result save failed: ${
          saveError instanceof Error ? saveError.message : String(saveError)
        }`,
      );
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvPath = await exportManualASRResultsCsv();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(csvPath, {
          mimeType: "text/csv",
          dialogTitle: "Share ASR Test Results CSV",
        });
      }
      setCsvExportPath(csvPath);
      setPhase2ActionMessage("CSV export created.");
      console.log("CSV export created at:", csvPath);
      // Alert.alert("CSV export created", csvPath);
    } catch (exportError) {
      const message =
        exportError instanceof Error
          ? exportError.message
          : String(exportError);
      setPhase2ActionMessage(`CSV export failed: ${message}`);
      Alert.alert("CSV export failed", message);
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
          <Section
            title="Qwen3-ASR model setup"
            meta={selectedModelInfo.status}
          >
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
                {isDownloadingModel
                  ? "Downloading model"
                  : "Download Qwen3-ASR"}
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

        {selectedModel === "qwen" && (
          <Section title="Shared VAD model" meta="Silero">
            <Text style={styles.setupText}>
              Sherpa simulated streaming uses Silero VAD to close speech
              segments before sending them to offline ASR.
            </Text>
            <Pressable
              disabled={isDownloadingModel}
              onPress={handleSharedVadDownload}
              style={[
                styles.setupButton,
                isDownloadingModel && styles.setupButtonDisabled,
              ]}
            >
              <Text style={styles.setupButtonText}>
                {isDownloadingModel
                  ? "Downloading model"
                  : "Download Silero VAD"}
              </Text>
            </Pressable>
            <Text style={styles.setupLinkText}>{SILERO_VAD_DOWNLOAD_URL}</Text>
          </Section>
        )}

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
                  name="mic.fill"
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

        <Section
          title="Test session"
          meta={
            selectedSession
              ? formatNoiseCondition(selectedSession.noiseCondition)
              : "Loading"
          }
        >
          <View style={styles.chipRow}>
            {testSessions.map((session) => (
              <Pressable
                key={session.sessionId}
                onPress={() => setSelectedSessionId(session.sessionId)}
                style={[
                  styles.chip,
                  selectedSessionId === session.sessionId &&
                    styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedSessionId === session.sessionId &&
                      styles.chipTextSelected,
                  ]}
                >
                  {formatNoiseCondition(session.noiseCondition)}
                </Text>
              </Pressable>
            ))}
          </View>
          {selectedSession ? (
            <View style={styles.sessionSummary}>
              <Text style={styles.optionTitle}>
                {selectedSession.sessionName}
              </Text>
              <Text style={styles.optionDetail}>
                Target {selectedSession.noiseProfile.targetRangeDba.min}-
                {selectedSession.noiseProfile.targetRangeDba.max} dBA /{" "}
                {selectedSession.noiseSource.sourceName}
              </Text>
            </View>
          ) : null}
        </Section>

        {selectedSession ? (
          <Section title="Session measurement" meta="editable">
            <View style={styles.inputGrid}>
              <EditableValue
                label="Measured LAeq dBA"
                keyboardType="decimal-pad"
                value={formatNullableInput(
                  selectedSession.noiseProfile.measuredLaeqDba,
                )}
                onChangeText={(value) =>
                  updateSelectedSession((session) => ({
                    ...session,
                    noiseProfile: {
                      ...session.noiseProfile,
                      measuredLaeqDba: parseNullableNumber(value),
                    },
                  }))
                }
              />
              <EditableValue
                label="Measured max dBA"
                keyboardType="decimal-pad"
                value={formatNullableInput(
                  selectedSession.noiseProfile.measuredMaxDba,
                )}
                onChangeText={(value) =>
                  updateSelectedSession((session) => ({
                    ...session,
                    noiseProfile: {
                      ...session.noiseProfile,
                      measuredMaxDba: parseNullableNumber(value),
                    },
                  }))
                }
              />
              <EditableValue
                label="Measurement notes"
                value={selectedSession.noiseProfile.measurementNotes}
                onChangeText={(value) =>
                  updateSelectedSession((session) => ({
                    ...session,
                    noiseProfile: {
                      ...session.noiseProfile,
                      measurementNotes: value,
                    },
                  }))
                }
                multiline
              />
              <EditableValue
                label="Noise source URL/title"
                value={selectedSession.noiseSource.sourceUrlOrNote}
                onChangeText={(value) =>
                  updateSelectedSession((session) => ({
                    ...session,
                    noiseSource: {
                      ...session.noiseSource,
                      sourceUrlOrNote: value,
                    },
                  }))
                }
                multiline
              />
              <EditableValue
                label="Noise volume percent"
                keyboardType="number-pad"
                value={formatNullableInput(
                  selectedSession.noiseSource.volumePercent,
                )}
                onChangeText={(value) =>
                  updateSelectedSession((session) => ({
                    ...session,
                    noiseSource: {
                      ...session.noiseSource,
                      volumePercent: parseNullableNumber(value),
                    },
                  }))
                }
              />
            </View>
            <Pressable
              style={styles.setupOutlineButton}
              onPress={handleSaveSession}
            >
              <Text style={styles.setupOutlineButtonText}>
                Save session metadata
              </Text>
            </Pressable>
            {sessionSaveMessage ? (
              <Text style={styles.setupStatusText}>{sessionSaveMessage}</Text>
            ) : null}
          </Section>
        ) : null}

        <Section
          title="Language"
          meta={selectedLanguage === "en" ? "English" : "Finnish"}
        >
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
                    selectedLanguage === language.id &&
                      styles.segmentTextSelected,
                  ]}
                >
                  {language.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section
          title="Test case"
          meta={`${visibleTestCases.length} ${selectedLanguage.toUpperCase()} cases`}
        >
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            style={styles.testCaseScroll}
            contentContainerStyle={styles.testCaseList}
          >
            {visibleTestCases.map((testCase) => (
              <Pressable
                key={testCase.testCaseId}
                onPress={() => setSelectedTestCaseId(testCase.testCaseId)}
                style={[
                  styles.testCaseCard,
                  selectedTestCase?.testCaseId === testCase.testCaseId &&
                    styles.testCaseCardSelected,
                ]}
              >
                <View style={styles.optionTop}>
                  <Text style={styles.optionTitle}>{testCase.testCaseId}</Text>
                  <Text style={styles.sectionMeta}>
                    {testCase.category} / {testCase.difficulty}
                  </Text>
                </View>
                <Text style={styles.referenceText}>
                  {testCase.referenceText}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
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
            <RuntimePill label="Mode" value={selectedRuntimeMode} />
            <RuntimePill label="Mic/VAD" value={formatVadStatus(vadStatus)} />
            <RuntimePill
              label="First text"
              value={
                timeToFirstTextMs === null ? "--" : formatMs(timeToFirstTextMs)
              }
            />
          </View>
          <Text style={styles.limitationText}>{limitationMessage}</Text>

          <Text style={styles.timerText}>
            {formatDuration(recordingDurationMs)}
          </Text>

          <View style={styles.waveform}>
            {[18, 34, 24, 46, 30, 56, 22, 38, 28, 50, 20].map(
              (height, index) => (
                <View
                  key={index}
                  style={[
                    styles.waveBar,
                    { height },
                    isRecording && styles.waveBarActive,
                  ]}
                />
              ),
            )}
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
            {latestResult ? (
              <Text style={styles.savedText}>
                {manualResultSaved ? "Phase 2 saved" : "Phase 1 saved"}
              </Text>
            ) : null}
          </View>
          {selectedTestCase ? (
            <View style={styles.referenceBlock}>
              <Text style={styles.metricLabel}>Reference text</Text>
              <Text style={styles.referenceText}>
                {selectedTestCase.referenceText}
              </Text>
            </View>
          ) : null}
          <Text style={styles.previewText}>{transcript}</Text>
          {partialTranscript &&
          !latestResult &&
          selectedRuntimeMode === "true-streaming" ? (
            <Text style={styles.partialText}>Partial: {partialTranscript}</Text>
          ) : null}
          {segmentTranscripts.length > 0 && !latestResult ? (
            <View style={styles.segmentTranscriptList}>
              {segmentTranscripts.map((segment, index) => (
                <Text
                  key={segment.segmentId}
                  style={styles.segmentTranscriptText}
                >
                  {index + 1}. {segment.error || segment.transcript}
                </Text>
              ))}
            </View>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {latestResult ? (
            <View style={styles.metricsGrid}>
              <Metric label="Model" value={latestResult.modelName} />
              <Metric
                label="Language"
                value={latestResult.language.toUpperCase()}
              />
              <Metric label="Mode" value={latestResult.runtimeMode} />
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
                label="WER"
                value={
                  manualResult?.wer === null
                    ? "--"
                    : formatRate(manualResult?.wer)
                }
              />
              <Metric
                label="CER"
                value={
                  manualResult?.cer === null
                    ? "--"
                    : formatRate(manualResult?.cer)
                }
              />
              <Metric
                label="RTF"
                value={
                  manualResult?.realTimeFactor === null ||
                  manualResult?.realTimeFactor === undefined
                    ? "--"
                    : manualResult.realTimeFactor.toFixed(2)
                }
              />
              <Metric
                label="Success"
                value={manualResult?.success === false ? "false" : "true"}
              />
              <Metric
                label="Segments"
                value={String(latestResult.segmentCount ?? 0)}
              />
              <Metric
                label="Speech"
                value={
                  latestResult.speechDurationMs === null ||
                  latestResult.speechDurationMs === undefined
                    ? "--"
                    : formatMs(latestResult.speechDurationMs)
                }
              />
              <Metric label="Result ID" value={latestResult.id} />
            </View>
          ) : null}

          {manualResult ? (
            <View style={styles.resultActions}>
              <EditableValue
                label="Result notes"
                value={manualResultNotes}
                onChangeText={setManualResultNotes}
                multiline
              />
              <Pressable
                style={[
                  styles.startTestButton,
                  manualResultSaved && styles.startTestButtonDisabled,
                ]}
                disabled={manualResultSaved}
                onPress={handleSaveManualResult}
              >
                <Text style={styles.startTestText}>
                  {manualResultSaved
                    ? "Phase 2 result saved"
                    : "Save Phase 2 result"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.exportPanel}>
            <View>
              <Text style={styles.previewTitle}>CSV export</Text>
              <Text style={styles.optionDetail}>
                {manualResultsCount} Phase 2 results stored
              </Text>
            </View>
            <Pressable
              style={styles.setupOutlineButton}
              onPress={handleExportCsv}
            >
              <Text style={styles.setupOutlineButtonText}>Export CSV</Text>
            </Pressable>
          </View>
          {phase2ActionMessage ? (
            <Text style={styles.setupStatusText}>{phase2ActionMessage}</Text>
          ) : null}
          {csvExportPath ? (
            <Text style={styles.setupLinkText}>{csvExportPath}</Text>
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

function EditableValue({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  multiline?: boolean;
}) {
  return (
    <View style={styles.editableField}>
      <Text style={styles.metricLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholder="Leave empty if unavailable"
        placeholderTextColor={C.textSubtle}
        style={[
          styles.editableInput,
          multiline && styles.editableInputMultiline,
        ]}
      />
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
  runtimeMode: ASRRuntimeMode,
) {
  if (model === "native") {
    return runtimeMode === "true-streaming"
      ? "Live transcription active."
      : "Native partial results are platform-limited in this run.";
  }

  if (model === "whisper") {
    return "Whisper transcribes after the recording stops; no live partial words are shown.";
  }

  if (model === "qwen") {
    return runtimeMode === "unsupported"
      ? "Model files missing or model not ready."
      : "Qwen uses VAD segments with offline Sherpa-ONNX recognition.";
  }

  return runtimeMode === "unsupported"
    ? "Model disabled or not ready."
    : "This model is not active in the current benchmark selector.";
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

function formatNoiseCondition(condition: string) {
  if (condition === "quiet") {
    return "Quiet";
  }

  if (condition === "moderate_noise") {
    return "Moderate noise";
  }

  if (condition === "hard_noise") {
    return "Hard noise";
  }

  return condition;
}

function parseNullableNumber(value: string) {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNullableInput(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
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
  segmentTranscriptList: {
    marginTop: 10,
    gap: 6,
  },
  segmentTranscriptText: {
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
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
  sessionSummary: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceWarm,
    padding: 12,
  },
  inputGrid: {
    gap: 12,
  },
  editableField: {
    gap: 6,
  },
  editableInput: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surfaceWarm,
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editableInputMultiline: {
    minHeight: 82,
    textAlignVertical: "top",
  },
  testCaseScroll: {
    maxHeight: 430,
    overflow: "hidden",
  },
  testCaseList: {
    gap: 10,
    paddingBottom: 2,
  },
  testCaseCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceWarm,
    padding: 12,
    gap: 8,
  },
  testCaseCardSelected: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  referenceBlock: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceAlt,
    padding: 12,
    marginTop: 12,
    gap: 6,
  },
  referenceText: {
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  resultActions: {
    gap: 12,
    marginTop: 16,
  },
  exportPanel: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 16,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
