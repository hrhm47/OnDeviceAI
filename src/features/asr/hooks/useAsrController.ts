import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createPcmLiveStream,
  type PcmLiveStreamHandle,
} from "react-native-sherpa-onnx/audio";

import type { whisperModels } from "@/constants/types/ModelTypes";

import {
  getASREngineById,
  getAvailableASREngines,
} from "../services/asrEngineRegistry";
import { logAsrResult } from "../services/asrResultLogger";
import { saveAsrResult } from "../services/asrStorage";
import {
  mergeChunks,
  VADService,
  VADSpeechSegment,
  VADStatus,
} from "../services/vadService";
import {
  ASREngine,
  ASREngineMetadata,
  ASRLanguage,
  SegmentTranscript,
  TranscriptionResult,
} from "../types/asr.types";
import {
  ASR_AUDIO_MODE,
  ASR_RECORDING_OPTIONS,
  ASR_SAMPLE_RATE,
} from "../utils/audioHelpers";
import {
  createBaseTranscriptionResult,
  createErrorTranscriptionResult,
  nowMs,
} from "../utils/metricsHelpers";

type AsrControllerStatus =
  | "idle"
  | "recording"
  | "transcribing"
  | "saving"
  | "error";

export type UseAsrControllerOptions = {
  engineId: string;
  language: ASRLanguage;
  whisperModel?: whisperModels;
};

const wait = (durationMs: number) =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

const usesVadSegmentedOfflineEngine = (engineId: string) =>
  engineId === "qwen";

export const useAsrController = ({
  engineId,
  language,
  whisperModel = "base",
}: UseAsrControllerOptions) => {
  const recorder = useAudioRecorder(ASR_RECORDING_OPTIONS);
  const engineRef = useRef<ASREngine | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const pcmStreamRef = useRef<PcmLiveStreamHandle | null>(null);
  const pcmUnsubscribeRef = useRef<(() => void) | null>(null);
  const pcmErrorUnsubscribeRef = useRef<(() => void) | null>(null);
  const vadServiceRef = useRef<VADService | null>(null);
  const speechSegmentsRef = useRef<VADSpeechSegment[]>([]);
  const segmentTranscriptsRef = useRef<SegmentTranscript[]>([]);
  const partialTranscriptsRef = useRef<string[]>([]);
  const segmentProcessingTimesRef = useRef<number[]>([]);
  const segmentErrorRef = useRef<string | null>(null);
  const firstTextAtRef = useRef<number | null>(null);
  const queuedSegmentIdsRef = useRef<Set<string>>(new Set());
  const processedSegmentIdsRef = useRef<Set<string>>(new Set());
  const vadProcessingQueueRef = useRef<Promise<void>>(Promise.resolve());

  const [engines, setEngines] = useState<ASREngineMetadata[]>([]);
  const [status, setStatus] = useState<AsrControllerStatus>("idle");
  const [vadStatus, setVadStatus] = useState<VADStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<TranscriptionResult | null>(
    null,
  );
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [segmentTranscripts, setSegmentTranscripts] = useState<SegmentTranscript[]>([]);
  const [timeToFirstTextMs, setTimeToFirstTextMs] = useState<number | null>(
    null,
  );

  const selectedEngine = useMemo(
    () => engines.find((engine) => engine.engineType === engineId || engine.id === engineId),
    [engineId, engines],
  );

  const refreshEngines = useCallback(async () => {
    try {
      const availableEngines = await getAvailableASREngines({ whisperModel });
      setEngines(availableEngines);
    } catch (registryError) {
      console.warn("Failed to load ASR engine registry", registryError);
    }
  }, [whisperModel]);

  const cleanupPcmRecording = useCallback(async () => {
    pcmUnsubscribeRef.current?.();
    pcmErrorUnsubscribeRef.current?.();
    pcmUnsubscribeRef.current = null;
    pcmErrorUnsubscribeRef.current = null;
    vadServiceRef.current?.stopListening();
    vadServiceRef.current = null;
    await pcmStreamRef.current?.stop();
    pcmStreamRef.current = null;
    setVadStatus("idle");
  }, []);

  const resetRuntimeState = useCallback(() => {
    speechSegmentsRef.current = [];
    segmentTranscriptsRef.current = [];
    partialTranscriptsRef.current = [];
    segmentProcessingTimesRef.current = [];
    segmentErrorRef.current = null;
    firstTextAtRef.current = null;
    queuedSegmentIdsRef.current = new Set();
    processedSegmentIdsRef.current = new Set();
    vadProcessingQueueRef.current = Promise.resolve();
    setPartialTranscript("");
    setLiveTranscript("");
    setSegmentTranscripts([]);
    setTimeToFirstTextMs(null);
    setVadStatus("idle");
  }, []);

  const persistResult = useCallback(async (result: TranscriptionResult) => {
    setStatus("saving");
    await saveAsrResult(result);
    logAsrResult(result);

    setLatestResult(result);
    setRecordingDurationMs(result.recordingDurationMs);
    setError(result.error ?? null);
    setStatus(result.error ? "error" : "idle");
    return result;
  }, []);

  const markFirstText = useCallback(() => {
    if (firstTextAtRef.current !== null || recordingStartedAtRef.current === null) {
      return;
    }

    firstTextAtRef.current = Date.now();
    setTimeToFirstTextMs(firstTextAtRef.current - recordingStartedAtRef.current);
  }, []);

  const processVadSegment = useCallback(
    async (segment: VADSpeechSegment) => {
      setVadStatus("processing-segment");
      const segmentStartedAt = nowMs();

      try {
        const engine =
          engineRef.current ?? getASREngineById(engineId, { whisperModel });
        engineRef.current = engine;

        const result = await engine.transcribe({
          samples: segment.samples,
          language,
          sampleRate: segment.sampleRate,
          recordingDurationMs:
            recordingStartedAtRef.current === null
              ? recordingDurationMs
              : Date.now() - recordingStartedAtRef.current,
          segmentId: segment.id,
        });

        const segmentProcessingTimeMs = nowMs() - segmentStartedAt;
        segmentProcessingTimesRef.current.push(
          result.transcriptionTimeMs || segmentProcessingTimeMs,
        );

        if (result.error) {
          const failedSegment: SegmentTranscript = {
            segmentId: segment.id,
            transcript: "",
            startMs: segment.startedAtMs,
            endMs: segment.endedAtMs,
            durationMs: segment.durationMs,
            processingTimeMs: result.transcriptionTimeMs || segmentProcessingTimeMs,
            error: result.error,
          };
          processedSegmentIdsRef.current.add(segment.id);
          segmentTranscriptsRef.current.push(failedSegment);
          setSegmentTranscripts([...segmentTranscriptsRef.current]);
          segmentErrorRef.current = result.error;
          setError(result.error);
          return;
        }

        const segmentText = result.transcript.trim();
        if (!segmentText) {
          return;
        }

        const completedSegment: SegmentTranscript = {
          segmentId: segment.id,
          transcript: segmentText,
          startMs: segment.startedAtMs,
          endMs: segment.endedAtMs,
          durationMs: segment.durationMs,
          processingTimeMs: result.transcriptionTimeMs || segmentProcessingTimeMs,
          error: null,
        };
        processedSegmentIdsRef.current.add(segment.id);
        segmentTranscriptsRef.current.push(completedSegment);
        setSegmentTranscripts([...segmentTranscriptsRef.current]);
        const combinedTranscript = segmentTranscriptsRef.current
          .map((item) => item.transcript)
          .filter(Boolean)
          .join(" ")
          .trim();
        setLiveTranscript(combinedTranscript);
        markFirstText();
      } catch (segmentError) {
        const message =
          segmentError instanceof Error
            ? segmentError.message
            : String(segmentError);
        processedSegmentIdsRef.current.add(segment.id);
        segmentErrorRef.current = message;
        setError(message);
      } finally {
        setVadStatus("listening");
      }
    },
    [engineId, language, markFirstText, recordingDurationMs, whisperModel],
  );

  const enqueueVadSegment = useCallback(
    (segment: VADSpeechSegment) => {
      if (queuedSegmentIdsRef.current.has(segment.id)) {
        return vadProcessingQueueRef.current;
      }

      queuedSegmentIdsRef.current.add(segment.id);
      const task = vadProcessingQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (processedSegmentIdsRef.current.has(segment.id)) {
            return;
          }

          await processVadSegment(segment);
        });

      vadProcessingQueueRef.current = task.catch(() => undefined);
      return task;
    },
    [processVadSegment],
  );

  const persistUnavailableEngineResult = useCallback(
    async (engine: ASREngine, message: string, recordingDurationMs = 0) => {
      const result = createErrorTranscriptionResult(
        engine,
        {
          language,
          sampleRate: ASR_SAMPLE_RATE,
          recordingDurationMs,
        },
        message,
        0,
        "unsupported",
      );

      return persistResult(result);
    },
    [language, persistResult],
  );

  useEffect(() => {
    refreshEngines().catch(() => undefined);
  }, [refreshEngines]);

  useEffect(() => {
    if (status !== "recording" || recordingStartedAtRef.current === null) {
      return;
    }

    const timer = setInterval(() => {
      setRecordingDurationMs(Date.now() - recordingStartedAtRef.current!);
    }, 250);

    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose().catch(console.error);
      cleanupPcmRecording().catch(console.error);
    };
  }, [cleanupPcmRecording]);

  const ensureRecorderPermission = useCallback(async () => {
    const existingPermission = await getRecordingPermissionsAsync();
    if (existingPermission.granted) {
      return;
    }

    const requestedPermission = await requestRecordingPermissionsAsync();
    if (!requestedPermission.granted) {
      throw new Error("Microphone permission denied.");
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setLatestResult(null);
    resetRuntimeState();

    const prepareAndStart = async () => {
      await setAudioModeAsync(ASR_AUDIO_MODE);
      await recorder.prepareToRecordAsync();
      recorder.record();
    };

    const markRecordingStarted = () => {
      recordingStartedAtRef.current = Date.now();
      setRecordingDurationMs(0);
      setStatus("recording");
    };

    try {
      await ensureRecorderPermission();
      if (engineId === "native") {
        await engineRef.current?.dispose();
        const engine = getASREngineById(engineId, { whisperModel });
        engineRef.current = engine;
        markRecordingStarted();
        setVadStatus("listening");
        await engine.startStreaming?.({
          language,
          sampleRate: ASR_SAMPLE_RATE,
          onPartialResult: (partialText) => {
            console.log("Native ASR partial result:", partialText);
            setPartialTranscript(partialText);
            setLiveTranscript(partialText);
            partialTranscriptsRef.current.push(partialText);
            markFirstText();
          },
          onFinalResult: (finalText) => {
            setLiveTranscript(finalText);
          },
          onError: (message) => {
            setError(message);
          },
          onSpeechStart: () => setVadStatus("speech-detected"),
          onSpeechEnd: () => setVadStatus("silence"),
        });
        return;
      }

      if (usesVadSegmentedOfflineEngine(engineId)) {
        await engineRef.current?.dispose();
        const engine = getASREngineById(engineId, { whisperModel });
        engineRef.current = engine;

        const isAvailable = await engine.isAvailable();
        if (!isAvailable) {
          const message =
            selectedEngine?.readinessMessage ??
            `${engine.name} is not ready on this device.`;
          await persistUnavailableEngineResult(engine, message);
          setVadStatus("unsupported");
          return;
        }

        const vadService = new VADService(
          {
            onSpeechStart: () => setVadStatus("speech-detected"),
            onSegmentReady: (segment) => {
              speechSegmentsRef.current.push(segment);
              enqueueVadSegment(segment).catch((segmentError) => {
                const message =
                  segmentError instanceof Error
                    ? segmentError.message
                    : String(segmentError);
                segmentErrorRef.current = message;
                setError(message);
              });
            },
            onSilence: () => {
              setVadStatus((current) =>
                current === "processing-segment" ? current : "silence",
              );
            },
            onError: (message) => {
              segmentErrorRef.current = message;
              setError(message);
            },
            onStatusChange: setVadStatus,
          },
          { sampleRate: ASR_SAMPLE_RATE },
        );
        vadServiceRef.current = vadService;
        vadService.startListening();

        const pcmStream = createPcmLiveStream({
          sampleRate: ASR_SAMPLE_RATE,
          channelCount: 1,
        });

        pcmStreamRef.current = pcmStream;
        pcmUnsubscribeRef.current = pcmStream.onData((samples) => {
          vadService.acceptAudioChunk(samples, ASR_SAMPLE_RATE);
        });
        pcmErrorUnsubscribeRef.current = pcmStream.onError((streamError) => {
          const message = String(streamError);
          setError(message);
          segmentErrorRef.current = message;
        });

        await setAudioModeAsync(ASR_AUDIO_MODE);
        await pcmStream.start();
        markRecordingStarted();
        return;
      }

      if (recorder.getStatus().isRecording) {
        await recorder.stop().catch(() => undefined);
      }
      await prepareAndStart();
      markRecordingStarted();
    } catch (startError) {
      if (engineId === "native") {
        const message =
          startError instanceof Error ? startError.message : String(startError);
        recordingStartedAtRef.current = null;
        setVadStatus("error");
        setError(message);
        setStatus("error");
        return;
      }

      if (usesVadSegmentedOfflineEngine(engineId)) {
        await cleanupPcmRecording().catch(() => undefined);
        const message =
          startError instanceof Error
            ? startError.message
            : `${selectedEngine?.name ?? engineId} PCM recording could not be started.`;
        const engine =
          engineRef.current ?? getASREngineById(engineId, { whisperModel });
        await persistUnavailableEngineResult(engine, message).catch(() => {
          setError(message);
          setStatus("error");
        });
        setVadStatus("error");
        return;
      }

      try {
        await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
        await wait(180);
        await prepareAndStart();
        markRecordingStarted();
      } catch (retryError) {
        const message =
          retryError instanceof Error ? retryError.message : String(retryError);
        setError(message);
        setStatus("error");
      }
    }
  }, [
    cleanupPcmRecording,
    engineId,
    enqueueVadSegment,
    ensureRecorderPermission,
    language,
    markFirstText,
    persistUnavailableEngineResult,
    recorder,
    resetRuntimeState,
    selectedEngine?.name,
    selectedEngine?.readinessMessage,
    whisperModel,
  ]);

  const stopRecordingAndTranscribe = useCallback(async () => {
    if (status !== "recording") {
      return null;
    }

    setStatus("transcribing");
    setError(null);

    const stoppedAt = Date.now();
    const recordingDuration =
      recordingStartedAtRef.current === null
        ? recordingDurationMs
        : stoppedAt - recordingStartedAtRef.current;

    try {
      if (engineId === "native") {
        const engine = engineRef.current ?? getASREngineById(engineId, { whisperModel });
        engineRef.current = engine;

        if (!engine.stopStreaming) {
          throw new Error("Native ASR streaming stop is unavailable.");
        }

        const result = await engine.stopStreaming();
        console.log("Native ASR stopStreaming result:", result);
        await persistResult(result);
        return result;
      }

      let audioUri: string | undefined;
      let samples: Float32Array | undefined;

      if (usesVadSegmentedOfflineEngine(engineId)) {
        await pcmStreamRef.current?.stop();
        pcmUnsubscribeRef.current?.();
        pcmErrorUnsubscribeRef.current?.();
        pcmUnsubscribeRef.current = null;
        pcmErrorUnsubscribeRef.current = null;
        pcmStreamRef.current = null;
        vadServiceRef.current?.stopListening();
        const speechSegments = [...speechSegmentsRef.current];
        const engine =
          engineRef.current ?? getASREngineById(engineId, { whisperModel });
        engineRef.current = engine;
        const vadMetrics = vadServiceRef.current?.getMetrics();

        for (const segment of speechSegments) {
          enqueueVadSegment(segment);
        }
        await vadProcessingQueueRef.current;

        const segmentTranscripts = [...segmentTranscriptsRef.current];
        const segmentProcessingTimes = [...segmentProcessingTimesRef.current];
        samples = speechSegments.length
          ? mergeChunks(speechSegments.map((segment) => segment.samples))
          : undefined;
        const transcript = segmentTranscripts
          .map((segment) => segment.transcript)
          .filter(Boolean)
          .join(" ")
          .trim();
        const failureMessage =
          segmentErrorRef.current ??
          (!speechSegments.length
            ? "No speech segment was detected by VAD during this recording."
            : null);

        const result = failureMessage && !transcript
          ? createBaseTranscriptionResult(
              engine,
              {
                samples,
                language,
                sampleRate: ASR_SAMPLE_RATE,
                recordingDurationMs: recordingDuration,
              },
              {
                transcript,
                partialTranscripts: partialTranscriptsRef.current,
                segmentTranscripts,
                transcriptionTimeMs: segmentProcessingTimes.reduce(
                  (sum, time) => sum + time,
                  0,
                ),
                timeToFirstTextMs:
                  firstTextAtRef.current === null ||
                  recordingStartedAtRef.current === null
                    ? null
                    : firstTextAtRef.current - recordingStartedAtRef.current,
                runtimeMode: segmentErrorRef.current?.includes("model files are missing")
                  ? "unsupported"
                  : "vad-segmented-offline",
                speechDurationMs: vadMetrics?.speechDurationMs,
                silenceDurationMs: vadMetrics?.silenceDurationMs,
                segmentCount: speechSegments.length,
                error: failureMessage,
              },
            )
          : createBaseTranscriptionResult(
              engine,
              {
                samples,
                language,
                sampleRate: ASR_SAMPLE_RATE,
                recordingDurationMs: recordingDuration,
              },
              {
                transcript,
                partialTranscripts: partialTranscriptsRef.current,
                segmentTranscripts,
                transcriptionTimeMs: segmentProcessingTimes.reduce(
                  (sum, time) => sum + time,
                  0,
                ),
                timeToFirstTextMs:
                  firstTextAtRef.current === null ||
                  recordingStartedAtRef.current === null
                    ? null
                    : firstTextAtRef.current - recordingStartedAtRef.current,
                runtimeMode: "vad-segmented-offline",
                speechDurationMs: vadMetrics?.speechDurationMs,
                silenceDurationMs: vadMetrics?.silenceDurationMs,
                segmentCount: speechSegments.length,
                error: failureMessage,
              },
            );

        await persistResult(result);
        return result;
      } else {
        await recorder.stop();

        const recorderStatus = recorder.getStatus();
        audioUri = recorder.uri ?? recorderStatus.url ?? undefined;

        if (!audioUri) {
          throw new Error("Recording stopped but no audio file URI was returned.");
        }
      }

      await engineRef.current?.dispose();
      const engine = getASREngineById(engineId, { whisperModel });
      engineRef.current = engine;

      const result = await engine.transcribe({
        uri: audioUri,
        samples,
        language,
        sampleRate: ASR_SAMPLE_RATE,
        recordingDurationMs: recordingDuration,
      });

      await persistResult(result);
      return result;
    } catch (stopError) {
      const message =
        stopError instanceof Error ? stopError.message : String(stopError);
      const engine =
        engineRef.current ?? getASREngineById(engineId, { whisperModel });
      const result = createErrorTranscriptionResult(
        engine,
        {
          language,
          sampleRate: ASR_SAMPLE_RATE,
          recordingDurationMs: recordingDuration,
        },
        message,
        0,
        message.includes("model files are missing") ? "unsupported" : undefined,
      );
      await persistResult(result).catch(() => {
        setError(message);
        setStatus("error");
      });
      return null;
    } finally {
      recordingStartedAtRef.current = null;
      if (usesVadSegmentedOfflineEngine(engineId)) {
        await cleanupPcmRecording().catch(() => undefined);
      }
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
  }, [
    cleanupPcmRecording,
    engineId,
    enqueueVadSegment,
    language,
    persistResult,
    recorder,
    recordingDurationMs,
    status,
    whisperModel,
  ]);

  const reset = useCallback(() => {
    setError(null);
    setLatestResult(null);
    setRecordingDurationMs(0);
    resetRuntimeState();
    setStatus("idle");
  }, [resetRuntimeState]);

  return {
    engines,
    selectedEngine,
    status,
    isRecording: status === "recording",
    isTranscribing: status === "transcribing" || status === "saving",
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
  };
};
