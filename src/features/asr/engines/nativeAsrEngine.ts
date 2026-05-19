import {
  ASREngine,
  ASRLanguage,
  AudioInput,
  StreamingASROptions,
  TranscriptionResult,
} from "../types/asr.types";
import {
  createBaseTranscriptionResult,
  createErrorTranscriptionResult,
  nowMs,
} from "../utils/metricsHelpers";
import {
  addNativeIOSASRListener,
  cancelNativeIOSASRRecognition,
  getNativeIOSASRCapabilities,
  isNativeIOSASRModuleAvailable,
  requestNativeIOSASRPermissions,
  startNativeIOSASRRecognition,
  stopNativeIOSASRRecognition,
} from "../phase3/nativeIOSASRModule";
import {
  DEFAULT_NATIVE_ASR_PHASE3_CONFIG,
  nativeASRLocaleForLanguage,
} from "../phase3/nativeASRPhase3.types";
import { ContinuousTranscriptAccumulator } from "../phase3/continuousTranscriptAccumulator";
import type {
  NativeIOSASRErrorEvent,
  NativeIOSASRFinalEvent,
  NativeIOSASRMetricsEvent,
  NativeIOSASRPartialEvent,
} from "../phase3/nativeASRPhase3.types";

const STOP_FINAL_TIMEOUT_MS = 4500;

export class NativeAsrEngine implements ASREngine {
  id = "native";
  name = "Native iOS ASR";
  engineType = "native" as const;
  mode = "native" as const;
  languageSupport: ASRLanguage[] = ["en", "fi"];
  supportsStreaming = true;
  runtimeMode = "true-streaming" as const;

  private listeners: { remove: () => void }[] = [];
  private streamingOptions: StreamingASROptions | null = null;
  private streamingStartedAt: number | null = null;
  private streamingFirstTextAt: number | null = null;
  private streamingFinalTextAt: number | null = null;
  private streamingFinalTranscript = "";
  private streamingPartialTranscripts: string[] = [];
  private streamingError: string | null = null;
  private latestMetrics: NativeIOSASRMetricsEvent | null = null;
  private transcriptAccumulator = new ContinuousTranscriptAccumulator();
  private stopStreamingResolver: ((result: TranscriptionResult) => void) | null =
    null;
  private stopTimeout: ReturnType<typeof setTimeout> | null = null;

  async isAvailable(): Promise<boolean> {
    if (!isNativeIOSASRModuleAvailable) {
      return false;
    }

    try {
      const capabilities = await getNativeIOSASRCapabilities("en-US");
      return capabilities.recognizerAvailable;
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    const permissions = await requestNativeIOSASRPermissions();
    if (!permissions.canStartRecognition) {
      throw new Error(
        "Speech recognition and microphone permissions are required for Native iOS ASR.",
      );
    }
  }

  async transcribe(input: AudioInput): Promise<TranscriptionResult> {
    const startedAt = nowMs();
    return createErrorTranscriptionResult(
      this,
      input,
      "Native iOS ASR Phase 3 supports live microphone recognition only. Recorded-file transcription is not part of this phase.",
      nowMs() - startedAt,
      "unsupported",
    );
  }

  async startStreaming(options: StreamingASROptions): Promise<void> {
    if (!isNativeIOSASRModuleAvailable) {
      throw new Error(
        "Native iOS ASR requires a custom Expo development build on iOS and is not available in Expo Go or on Android.",
      );
    }

    await this.initialize();

    if (!this.languageSupport.includes(options.language)) {
      throw new Error(`Native iOS ASR does not support ${options.language}.`);
    }

    await this.dispose();

    this.streamingOptions = options;
    this.streamingStartedAt = nowMs();
    this.streamingFirstTextAt = null;
    this.streamingFinalTextAt = null;
    this.streamingFinalTranscript = "";
    this.streamingPartialTranscripts = [];
    this.streamingError = null;
    this.latestMetrics = null;
    this.transcriptAccumulator.reset();

    this.listeners = [
      addNativeIOSASRListener("NativeIOSASR.onPartialResult", (event) =>
        this.handlePartialResult(event, options),
      ),
      addNativeIOSASRListener("NativeIOSASR.onFinalResult", (event) =>
        this.handleFinalResult(event, options),
      ),
      addNativeIOSASRListener("NativeIOSASR.onError", (event) =>
        this.handleError(event, options),
      ),
      addNativeIOSASRListener("NativeIOSASR.onMetrics", (event) => {
        this.latestMetrics = event;
      }),
    ];

    await startNativeIOSASRRecognition({
      ...DEFAULT_NATIVE_ASR_PHASE3_CONFIG,
      configId: "native_ios_phase3_engine_default_v1",
      language: options.language,
      locale: nativeASRLocaleForLanguage(options.language),
      contextualStringsEnabled: false,
      contextualStrings: [],
    });
  }

  async stopStreaming(): Promise<TranscriptionResult> {
    if (!this.streamingOptions || this.streamingStartedAt === null) {
      throw new Error("Native iOS ASR streaming has not been started.");
    }

    return new Promise<TranscriptionResult>((resolve) => {
      this.stopStreamingResolver = resolve;

      this.stopTimeout = setTimeout(() => {
        this.resolveStreamingResult(
          this.streamingError ??
            (!this.streamingFinalTranscript
              ? "No final Native iOS ASR result was returned before timeout."
              : null),
        );
      }, STOP_FINAL_TIMEOUT_MS);

      stopNativeIOSASRRecognition().catch((error) => {
        this.resolveStreamingResult(
          error instanceof Error ? error.message : String(error),
        );
      });
    });
  }

  async dispose(): Promise<void> {
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }

    this.removeListeners();
    this.stopStreamingResolver = null;
    this.streamingOptions = null;
    this.streamingStartedAt = null;
    this.streamingFirstTextAt = null;
    this.streamingFinalTextAt = null;
    this.streamingFinalTranscript = "";
    this.streamingPartialTranscripts = [];
    this.streamingError = null;
    this.transcriptAccumulator.reset();
    await cancelNativeIOSASRRecognition().catch(() => undefined);
  }

  private handlePartialResult(
    event: NativeIOSASRPartialEvent,
    options: StreamingASROptions,
  ) {
    const text = event.text.trim();
    if (!text) {
      return;
    }

    if (this.streamingFirstTextAt === null) {
      this.streamingFirstTextAt = nowMs();
    }

    const accumulatedTranscript = this.transcriptAccumulator.update(text);
    this.streamingPartialTranscripts.push(accumulatedTranscript);
    options.onPartialResult?.(accumulatedTranscript);
    options.onSpeechStart?.();
  }

  private handleFinalResult(
    event: NativeIOSASRFinalEvent,
    options: StreamingASROptions,
  ) {
    const text = event.text.trim();
    this.streamingFinalTranscript = this.transcriptAccumulator.finalize(text);
    this.streamingFinalTextAt = nowMs();
    options.onFinalResult?.(this.streamingFinalTranscript);

    if (this.stopStreamingResolver) {
      this.resolveStreamingResult();
    }
  }

  private handleError(
    event: NativeIOSASRErrorEvent,
    options: StreamingASROptions,
  ) {
    this.streamingError = event.errorMessage;
    options.onError?.(event.errorMessage);

    if (this.stopStreamingResolver) {
      this.resolveStreamingResult(event.errorMessage);
    }
  }

  private resolveStreamingResult(error?: string | null) {
    if (
      !this.streamingOptions ||
      this.streamingStartedAt === null ||
      !this.stopStreamingResolver
    ) {
      return;
    }

    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }

    const stoppedAt = nowMs();
    const recordingDurationMs = stoppedAt - this.streamingStartedAt;
    const finalTextAt = this.streamingFinalTextAt ?? stoppedAt;
    const transcript =
      this.streamingFinalTranscript ||
      this.transcriptAccumulator.current() ||
      this.streamingPartialTranscripts[this.streamingPartialTranscripts.length - 1] ||
      "";

    const result = createBaseTranscriptionResult(
      this,
      {
        language: this.streamingOptions.language,
        sampleRate: this.latestMetrics?.sampleRate ?? 16000,
        recordingDurationMs,
      },
      {
        transcript: transcript.trim(),
        partialTranscripts: this.streamingPartialTranscripts,
        transcriptionTimeMs: Math.max(0, finalTextAt - this.streamingStartedAt),
        timeToFirstTextMs:
          this.streamingFirstTextAt === null
            ? null
            : this.streamingFirstTextAt - this.streamingStartedAt,
        runtimeMode:
          this.streamingPartialTranscripts.length > 0
            ? "true-streaming"
            : "offline-full-recording",
        error: error ?? this.streamingError,
      },
    );

    const resolver = this.stopStreamingResolver;
    this.stopStreamingResolver = null;
    this.streamingOptions = null;
    this.streamingStartedAt = null;
    this.removeListeners();
    resolver(result);
  }

  private removeListeners() {
    this.listeners.forEach((listener) => listener.remove());
    this.listeners = [];
  }
}
