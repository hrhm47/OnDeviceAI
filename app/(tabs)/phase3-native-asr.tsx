import { IconSymbol } from "@/components/ui/icon-symbol";
import { FieldColors as C } from "@/constants/theme";
import {
  getManualTestCases,
  getTestSessions,
} from "@/src/features/asr/asrTesting/services/manualAsrTestingStorage";
import type {
  ManualASRTestCase,
  TestSession,
} from "@/src/features/asr/asrTesting/types/manualAsrTesting.types";
import { buildContextualStrings } from "@/src/features/asr/phase3/contextualStringsBuilder";
import { ContinuousTranscriptAccumulator } from "@/src/features/asr/phase3/continuousTranscriptAccumulator";
import {
  cancelNativeIOSASRRecognition,
  getNativeIOSASRCapabilities,
  isNativeIOSASRModuleAvailable,
  requestNativeIOSASRPermissions,
  startNativeIOSASRRecognition,
  stopNativeIOSASRRecognition,
  addNativeIOSASRListener,
} from "@/src/features/asr/phase3/nativeIOSASRModule";
import {
  DEFAULT_NATIVE_ASR_PHASE3_CONFIG,
  nativeASRLocaleForLanguage,
} from "@/src/features/asr/phase3/nativeASRPhase3.types";
import type {
  NativeASRLanguage,
  NativeASROnDevicePolicy,
  NativeASRPhase3Config,
  NativeIOSASRCapabilities,
  NativeIOSASRMetricsEvent,
  NativeIOSASRStateEvent,
  Phase3NativeASRResult,
} from "@/src/features/asr/phase3/nativeASRPhase3.types";
import { createPhase3NativeASRResult } from "@/src/features/asr/phase3/phase3NativeASRResultBuilder";
import {
  exportPhase3NativeASRResultsCsv,
  getPhase3NativeASRResults,
  savePhase3NativeASRResult,
} from "@/src/features/asr/phase3/phase3NativeASRStorage";
import { phase3ConstructionSpeechContext } from "@/src/features/asr/phase3/projectSpeechContext";
import { preparePhase3Transcript } from "@/src/features/asr/phase3/transcriptPreparation";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const languages = [
  { id: "en", label: "English" },
  { id: "fi", label: "Finnish" },
] as const;

const onDevicePolicies: NativeASROnDevicePolicy[] = [
  "prefer",
  "require",
  "allowNetwork",
];

export default function Phase3NativeASRScreen() {
  const [language, setLanguage] = useState<NativeASRLanguage>("en");
  const locale = nativeASRLocaleForLanguage(language);
  const [onDevicePolicy, setOnDevicePolicy] =
    useState<NativeASROnDevicePolicy>("prefer");
  const [contextualStringsEnabled, setContextualStringsEnabled] =
    useState(false);
  const [addsPunctuation, setAddsPunctuation] = useState(false);
  const [testCases] = useState<ManualASRTestCase[]>(() => getManualTestCases());
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(
    "S00_QUIET_UNDER_50DBA",
  );
  const [capabilities, setCapabilities] =
    useState<NativeIOSASRCapabilities | null>(null);
  const [metrics, setMetrics] = useState<NativeIOSASRMetricsEvent | null>(null);
  const [nativeState, setNativeState] =
    useState<NativeIOSASRStateEvent["state"]>("idle");
  const [livePartialTranscript, setLivePartialTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phase3Result, setPhase3Result] =
    useState<Phase3NativeASRResult | null>(null);
  const [resultSaved, setResultSaved] = useState(false);
  const [resultsCount, setResultsCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [csvPath, setCsvPath] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const recordingStartTimeRef = useRef<number | null>(null);
  const firstPartialTimeRef = useRef<number | null>(null);
  const finalResultTimeRef = useRef<number | null>(null);
  const recognitionStopTimeRef = useRef<number | null>(null);
  const partialTranscriptsRef = useRef<string[]>([]);
  const transcriptAccumulatorRef = useRef(new ContinuousTranscriptAccumulator());
  const activeConfigRef = useRef<NativeASRPhase3Config>(
    DEFAULT_NATIVE_ASR_PHASE3_CONFIG,
  );

  const contextualStrings = useMemo(
    () =>
      contextualStringsEnabled
        ? buildContextualStrings(phase3ConstructionSpeechContext, {
            includeEnglish: language === "en",
            includeFinnish: language === "fi",
          })
        : [],
    [contextualStringsEnabled, language],
  );

  const selectedTestCases = useMemo(
    () => testCases.filter((testCase) => testCase.language === language),
    [language, testCases],
  );

  const selectedTestCase = useMemo(
    () =>
      selectedTestCases.find(
        (testCase) => testCase.testCaseId === selectedTestCaseId,
      ) ?? selectedTestCases[0],
    [selectedTestCaseId, selectedTestCases],
  );

  const selectedSession = useMemo(
    () =>
      testSessions.find((session) => session.sessionId === selectedSessionId) ??
      testSessions[0],
    [selectedSessionId, testSessions],
  );

  const normalizedTranscript = useMemo(
    () =>
      preparePhase3Transcript(finalTranscript, activeConfigRef.current)
        .normalizedTranscript,
    [finalTranscript],
  );

  const isRecording =
    nativeState === "recording" || nativeState === "recognizing";

  const currentConfig = useMemo<NativeASRPhase3Config>(
    () => ({
      ...DEFAULT_NATIVE_ASR_PHASE3_CONFIG,
      configId: `native_ios_phase3_${locale}_${onDevicePolicy}_v1`,
      language,
      locale,
      onDevicePolicy,
      contextualStringsEnabled,
      contextualStrings,
      addsPunctuation,
    }),
    [
      addsPunctuation,
      contextualStrings,
      contextualStringsEnabled,
      language,
      locale,
      onDevicePolicy,
    ],
  );

  const buildResult = useCallback(
    (options: { success: boolean; rawTranscript?: string; error?: string | null }) => {
      const recordingStart = recordingStartTimeRef.current;
      const firstPartial = firstPartialTimeRef.current;
      const finalTime = finalResultTimeRef.current ?? Date.now();
      const stoppedAt = recognitionStopTimeRef.current ?? finalTime;
      const recordingDurationMs =
        recordingStart === null ? null : Math.max(0, stoppedAt - recordingStart);
      const finalLatencyMs =
        recordingStart === null ? null : Math.max(0, finalTime - recordingStart);

      return createPhase3NativeASRResult({
        config: activeConfigRef.current,
        capabilities,
        metrics,
        testCase: selectedTestCase,
        session: selectedSession,
        rawTranscript: options.rawTranscript ?? "",
        partialTranscripts: [...partialTranscriptsRef.current],
        recordingDurationMs,
        ttfsMs:
          recordingStart === null || firstPartial === null
            ? null
            : Math.max(0, firstPartial - recordingStart),
        finalLatencyMs,
        transcriptionTimeMs: finalLatencyMs,
        success: options.success,
        errorMessage: options.error ?? null,
        notes,
      });
    },
    [capabilities, metrics, notes, selectedSession, selectedTestCase],
  );

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
      .catch((error) =>
        setActionMessage(
          `Could not load Phase 2 sessions: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );

    getPhase3NativeASRResults()
      .then((results) => {
        if (isActive) {
          setResultsCount(results.length);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedTestCaseId && selectedTestCases[0]) {
      setSelectedTestCaseId(selectedTestCases[0].testCaseId);
      return;
    }

    if (
      selectedTestCaseId &&
      !selectedTestCases.some(
        (testCase) => testCase.testCaseId === selectedTestCaseId,
      ) &&
      selectedTestCases[0]
    ) {
      setSelectedTestCaseId(selectedTestCases[0].testCaseId);
    }
  }, [selectedTestCaseId, selectedTestCases]);

  useEffect(() => {
    let isActive = true;

    getNativeIOSASRCapabilities(locale)
      .then((nextCapabilities) => {
        if (isActive) {
          setCapabilities(nextCapabilities);
        }
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : String(error),
          );
        }
      });

    return () => {
      isActive = false;
    };
  }, [locale]);

  useEffect(() => {
    const subscriptions = [
      addNativeIOSASRListener("NativeIOSASR.onState", (event) => {
        setNativeState(event.state);
      }),
      addNativeIOSASRListener("NativeIOSASR.onMetrics", (event) => {
        setMetrics(event);
      }),
      addNativeIOSASRListener("NativeIOSASR.onPartialResult", (event) => {
        const text = event.text.trim();
        if (!text) {
          return;
        }
        if (firstPartialTimeRef.current === null) {
          firstPartialTimeRef.current = Date.now();
        }
        const accumulatedTranscript =
          transcriptAccumulatorRef.current.update(text);
        partialTranscriptsRef.current.push(accumulatedTranscript);
        setLivePartialTranscript(accumulatedTranscript);
      }),
      addNativeIOSASRListener("NativeIOSASR.onFinalResult", (event) => {
        const text = event.text.trim();
        const accumulatedTranscript =
          transcriptAccumulatorRef.current.finalize(text);
        finalResultTimeRef.current = Date.now();
        recognitionStopTimeRef.current = recognitionStopTimeRef.current ?? Date.now();
        setLivePartialTranscript(accumulatedTranscript);
        setFinalTranscript(accumulatedTranscript);
        setPhase3Result(
          buildResult({ success: true, rawTranscript: accumulatedTranscript }),
        );
        setResultSaved(false);
      }),
      addNativeIOSASRListener("NativeIOSASR.onError", (event) => {
        const message = event.errorMessage;
        finalResultTimeRef.current = Date.now();
        recognitionStopTimeRef.current = recognitionStopTimeRef.current ?? Date.now();
        setErrorMessage(message);
        setPhase3Result(
          buildResult({ success: false, rawTranscript: "", error: message }),
        );
        setResultSaved(false);
      }),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [buildResult]);

  const handleStart = async () => {
    setActionMessage(null);
    setErrorMessage(null);
    setFinalTranscript("");
    setLivePartialTranscript("");
    setPhase3Result(null);
    setResultSaved(false);
    setMetrics(null);
    partialTranscriptsRef.current = [];
    transcriptAccumulatorRef.current.reset();
    firstPartialTimeRef.current = null;
    finalResultTimeRef.current = null;
    recognitionStopTimeRef.current = null;
    recordingStartTimeRef.current = Date.now();
    activeConfigRef.current = currentConfig;

    try {
      const permissions = await requestNativeIOSASRPermissions();
      if (!permissions.canStartRecognition) {
        throw new Error(
          "Microphone and speech recognition permissions are required.",
        );
      }

      const nextCapabilities = await getNativeIOSASRCapabilities(locale);
      setCapabilities(nextCapabilities);
      await startNativeIOSASRRecognition(currentConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
      finalResultTimeRef.current = Date.now();
      recognitionStopTimeRef.current = Date.now();
      setPhase3Result(
        buildResult({ success: false, rawTranscript: "", error: message }),
      );
      setNativeState("error");
    }
  };

  const handleStop = async () => {
    recognitionStopTimeRef.current = Date.now();
    await stopNativeIOSASRRecognition().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
      setPhase3Result(
        buildResult({ success: false, rawTranscript: "", error: message }),
      );
    });
  };

  const handleCancel = async () => {
    recognitionStopTimeRef.current = Date.now();
    await cancelNativeIOSASRRecognition();
    setNativeState("cancelled");
  };

  const handleSaveResult = async () => {
    if (!phase3Result) {
      return;
    }

    try {
      await savePhase3NativeASRResult({ ...phase3Result, notes });
      const results = await getPhase3NativeASRResults();
      setResultsCount(results.length);
      setResultSaved(true);
      setActionMessage("Phase 3 Native ASR result saved locally.");
    } catch (error) {
      setActionMessage(
        `Phase 3 result save failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

  const handleExportCsv = async () => {
    try {
      const path = await exportPhase3NativeASRResultsCsv();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: "text/csv",
          dialogTitle: "Share Phase 3 Native ASR CSV",
        });
      }
      setCsvPath(path);
      setActionMessage("Phase 3 CSV export created.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setActionMessage(`Phase 3 CSV export failed: ${message}`);
      Alert.alert("CSV export failed", message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Phase 3</Text>
          <Text style={styles.title}>Native iOS ASR</Text>
          <Text style={styles.subtitle}>
            Configurable Apple Speech testing for contextual strings,
            punctuation, privacy mode, and thesis metrics.
          </Text>
        </View>

        <Section
          title="Native module"
          meta={isNativeIOSASRModuleAvailable ? "available" : "unavailable"}
        >
          <Metric
            label="Selected model"
            value="Native iOS ASR"
          />
          <Metric
            label="Recognizer"
            value={capabilities?.recognizerAvailable ? "available" : "unavailable"}
          />
          <Metric
            label="On-device"
            value={
              capabilities?.supportsOnDeviceRecognition ? "supported" : "not supported"
            }
          />
          <Metric
            label="Audio session"
            value={`${capabilities?.currentAudioSessionCategory ?? "--"} / ${
              capabilities?.currentAudioSessionMode ?? "--"
            }`}
          />
        </Section>

        <Section title="Language" meta={locale}>
          <View style={styles.segmentRow}>
            {languages.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setLanguage(item.id)}
                style={[
                  styles.segment,
                  language === item.id && styles.segmentSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    language === item.id && styles.segmentTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Native ASR config" meta={currentConfig.configId}>
          <Text style={styles.metricLabel}>On-device policy</Text>
          <View style={styles.chipRow}>
            {onDevicePolicies.map((policy) => (
              <Pressable
                key={policy}
                onPress={() => setOnDevicePolicy(policy)}
                style={[
                  styles.chip,
                  onDevicePolicy === policy && styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    onDevicePolicy === policy && styles.chipTextSelected,
                  ]}
                >
                  {policy}
                </Text>
              </Pressable>
            ))}
          </View>
          <ToggleRow
            label="Contextual strings"
            value={contextualStringsEnabled}
            onPress={() => setContextualStringsEnabled((current) => !current)}
            meta={`${contextualStrings.length} strings`}
          />
          <ToggleRow
            label="Adds punctuation"
            value={addsPunctuation}
            onPress={() => setAddsPunctuation((current) => !current)}
            meta={
              metrics?.addsPunctuationApplied === undefined
                ? "pending"
                : metrics.addsPunctuationApplied
                  ? "applied"
                  : "not applied"
            }
          />
          <Metric label="Partial results" value="enabled" />
          <Metric label="Task hint" value="dictation" />
        </Section>

        <Section
          title="Phase 2 test case"
          meta={`${selectedTestCases.length} ${language.toUpperCase()} cases`}
        >
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.testCaseScroll}
            contentContainerStyle={styles.testCaseList}
          >
            {selectedTestCases.map((testCase) => (
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

        <Section
          title="Phase 2 session"
          meta={selectedSession ? formatNoiseCondition(selectedSession.noiseCondition) : "loading"}
        >
          <View style={styles.chipRow}>
            {testSessions.map((session) => (
              <Pressable
                key={session.sessionId}
                onPress={() => setSelectedSessionId(session.sessionId)}
                style={[
                  styles.chip,
                  selectedSessionId === session.sessionId && styles.chipSelected,
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
        </Section>

        <View style={styles.recordPanel}>
          <View style={styles.recordTop}>
            <View>
              <Text style={styles.recordLabel}>Recognition state</Text>
              <Text style={styles.recordModel}>{nativeState}</Text>
            </View>
            <View
              style={[
                styles.liveBadge,
                isRecording && styles.liveBadgeActive,
                errorMessage && styles.liveBadgeError,
              ]}
            >
              <Text
                style={[
                  styles.liveBadgeText,
                  isRecording && styles.liveBadgeTextActive,
                  errorMessage && styles.liveBadgeTextError,
                ]}
              >
                {isRecording ? "Live" : errorMessage ? "Error" : "Idle"}
              </Text>
            </View>
          </View>

          <Pressable
            disabled={nativeState === "stopping"}
            onPress={isRecording ? handleStop : handleStart}
            style={[
              styles.micButton,
              isRecording && styles.micButtonStop,
              nativeState === "stopping" && styles.disabled,
            ]}
          >
            <IconSymbol
              size={50}
              name={isRecording ? "stop.fill" : "mic.fill"}
              color="#FFFFFF"
            />
          </Pressable>

          <View style={styles.recordActions}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.startTestButton}
              onPress={isRecording ? handleStop : handleStart}
            >
              <Text style={styles.startTestText}>
                {isRecording ? "Stop recognition" : "Start recognition"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.transcriptPreview}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Transcript and metrics</Text>
            {phase3Result ? (
              <Text style={styles.savedText}>
                {resultSaved ? "Phase 3 saved" : "Not saved"}
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
          <Text style={styles.metricLabel}>Live partial transcript</Text>
          <Text style={styles.previewText}>
            {livePartialTranscript || "Partial Native iOS ASR text appears here."}
          </Text>
          <Text style={styles.metricLabel}>Final raw transcript</Text>
          <Text style={styles.previewText}>
            {finalTranscript || "Final raw transcript appears after stop."}
          </Text>
          <Text style={styles.metricLabel}>Normalized transcript</Text>
          <Text style={styles.previewText}>
            {normalizedTranscript || "--"}
          </Text>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.metricsGrid}>
            <Metric
              label="WER"
              value={formatRate(phase3Result?.rawWER)}
            />
            <Metric
              label="CER"
              value={formatRate(phase3Result?.rawCER)}
            />
            <Metric
              label="TTFS"
              value={formatNullableMs(phase3Result?.ttfsMs)}
            />
            <Metric
              label="Final latency"
              value={formatNullableMs(phase3Result?.finalLatencyMs)}
            />
            <Metric
              label="Transcription"
              value={formatNullableMs(phase3Result?.transcriptionTimeMs)}
            />
            <Metric
              label="Partials"
              value={String(partialTranscriptsRef.current.length)}
            />
            <Metric
              label="Privacy mode"
              value={metrics?.recognitionPrivacyMode ?? "--"}
            />
            <Metric
              label="Requires on-device"
              value={metrics?.requestedRequiresOnDeviceRecognition ? "true" : "false"}
            />
          </View>

          <View style={styles.resultActions}>
            <EditableValue
              label="Result notes"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            <Pressable
              disabled={!phase3Result || resultSaved}
              onPress={handleSaveResult}
              style={[
                styles.startTestButton,
                (!phase3Result || resultSaved) && styles.disabled,
              ]}
            >
              <Text style={styles.startTestText}>
                {resultSaved ? "Phase 3 result saved" : "Save Phase 3 result"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.exportPanel}>
            <View>
              <Text style={styles.previewTitle}>CSV export</Text>
              <Text style={styles.optionDetail}>
                {resultsCount} Phase 3 results stored
              </Text>
            </View>
            <Pressable style={styles.setupOutlineButton} onPress={handleExportCsv}>
              <Text style={styles.setupOutlineButtonText}>Export CSV</Text>
            </Pressable>
          </View>
          {actionMessage ? (
            <Text style={styles.setupStatusText}>{actionMessage}</Text>
          ) : null}
          {csvPath ? <Text style={styles.setupLinkText}>{csvPath}</Text> : null}
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

function ToggleRow({
  label,
  value,
  meta,
  onPress,
}: {
  label: string;
  value: boolean;
  meta?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={onPress}>
      <View>
        <Text style={styles.optionTitle}>{label}</Text>
        {meta ? <Text style={styles.optionDetail}>{meta}</Text> : null}
      </View>
      <View style={[styles.toggle, value && styles.toggleActive]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </View>
    </Pressable>
  );
}

function EditableValue({
  label,
  value,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.editableField}>
      <Text style={styles.metricLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
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

function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function formatNullableMs(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }
  return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
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
  toggleRow: {
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceWarm,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.borderStrong,
    padding: 3,
  },
  toggleActive: {
    backgroundColor: C.primary,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
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
  optionDetail: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  testCaseScroll: {
    maxHeight: 360,
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
  referenceText: {
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
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
  micButton: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#BBD5F1",
    marginTop: 18,
  },
  micButtonStop: {
    backgroundColor: C.danger,
    borderColor: "#F2BCB8",
  },
  disabled: {
    opacity: 0.55,
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
    paddingHorizontal: 14,
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
    marginBottom: 12,
    marginTop: 6,
  },
  referenceBlock: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceAlt,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    gap: 6,
  },
  errorText: {
    color: C.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 4,
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
  resultActions: {
    gap: 12,
    marginTop: 16,
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
  setupStatusText: {
    color: C.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 12,
  },
  setupLinkText: {
    color: C.textSubtle,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 8,
  },
});
