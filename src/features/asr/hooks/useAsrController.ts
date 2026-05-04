import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { whisperModels } from "@/constants/types/ModelTypes";

import {
  getASREngineById,
  getAvailableASREngines,
} from "../services/asrEngineRegistry";
import { logAsrResult } from "../services/asrResultLogger";
import { saveAsrResult } from "../services/asrStorage";
import {
  ASRLanguage,
  ASREngine,
  ASREngineMetadata,
  TranscriptionResult,
} from "../types/asr.types";
import {
  ASR_AUDIO_MODE,
  ASR_RECORDING_OPTIONS,
  ASR_SAMPLE_RATE,
} from "../utils/audioHelpers";

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

export const useAsrController = ({
  engineId,
  language,
  whisperModel = "tiny.en",
}: UseAsrControllerOptions) => {
  const recorder = useAudioRecorder(ASR_RECORDING_OPTIONS);
  const engineRef = useRef<ASREngine | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  const [engines, setEngines] = useState<ASREngineMetadata[]>([]);
  const [status, setStatus] = useState<AsrControllerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<TranscriptionResult | null>(
    null,
  );
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);

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
    };
  }, []);

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
      if (recorder.getStatus().isRecording) {
        await recorder.stop().catch(() => undefined);
      }
      await prepareAndStart();
      markRecordingStarted();
    } catch {
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
  }, [ensureRecorderPermission, recorder]);

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
      await recorder.stop();

      const recorderStatus = recorder.getStatus();
      const audioUri = recorder.uri ?? recorderStatus.url;

      if (!audioUri) {
        throw new Error("Recording stopped but no audio file URI was returned.");
      }

      await engineRef.current?.dispose();
      const engine = getASREngineById(engineId, { whisperModel });
      engineRef.current = engine;

      const result = await engine.transcribe({
        uri: audioUri,
        language,
        sampleRate: ASR_SAMPLE_RATE,
        recordingDurationMs: recordingDuration,
      });

      setStatus("saving");
      await saveAsrResult(result);
      logAsrResult(result);

      setLatestResult(result);
      setRecordingDurationMs(recordingDuration);
      setError(result.error ?? null);
      setStatus(result.error ? "error" : "idle");
      return result;
    } catch (stopError) {
      const message =
        stopError instanceof Error ? stopError.message : String(stopError);
      setError(message);
      setStatus("error");
      return null;
    } finally {
      recordingStartedAtRef.current = null;
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
  }, [
    engineId,
    language,
    recorder,
    recordingDurationMs,
    status,
    whisperModel,
  ]);

  const reset = useCallback(() => {
    setError(null);
    setLatestResult(null);
    setRecordingDurationMs(0);
    setStatus("idle");
  }, []);

  return {
    engines,
    selectedEngine,
    status,
    isRecording: status === "recording",
    isTranscribing: status === "transcribing" || status === "saving",
    recordingDurationMs,
    latestResult,
    error,
    refreshEngines,
    startRecording,
    stopRecordingAndTranscribe,
    reset,
  };
};
