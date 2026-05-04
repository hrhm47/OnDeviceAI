import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

import {
  ASREngine,
  ASRLanguage,
  AudioInput,
  StreamingASROptions,
  TranscriptionResult,
} from "../types/asr.types";
import { getNativeLocaleForLanguage } from "../utils/audioHelpers";
import {
  createBaseTranscriptionResult,
  createErrorTranscriptionResult,
  nowMs,
} from "../utils/metricsHelpers";

const NATIVE_TRANSCRIPTION_TIMEOUT_MS = 120000;

export class NativeAsrEngine implements ASREngine {
  id = "native";
  name = "Native ASR";
  engineType = "native" as const;
  mode = "native" as const;
  languageSupport: ASRLanguage[] = ["en", "fi"];
  supportsStreaming = true;
  streamingMode = "true-streaming" as const;

  private listeners: { remove: () => void }[] = [];
  private streamingOptions: StreamingASROptions | null = null;
  private streamingStartedAt: number | null = null;
  private streamingFirstTextAt: number | null = null;
  private streamingFinalTranscript = "";
  private streamingPartialTranscripts: string[] = [];
  private streamingAudioUri: string | undefined;
  private stopStreamingResolver: ((result: TranscriptionResult) => void) | null =
    null;

  async isAvailable(): Promise<boolean> {
    try {
      return ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    const { status } =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (status !== "granted") {
      throw new Error(
        "Speech recognition and microphone permissions are required for Native ASR.",
      );
    }
  }

  async transcribe(input: AudioInput): Promise<TranscriptionResult> {
    const startedAt = nowMs();
    const partialTranscripts: string[] = [];
    let firstTextAt: number | null = null;
    let finalTranscript = "";

    try {
      await this.initialize();

      if (!this.languageSupport.includes(input.language)) {
        throw new Error(`Native ASR does not support ${input.language}.`);
      }

      if (!input.uri) {
        throw new Error("Native ASR requires a recorded audio URI.");
      }

      const result = await new Promise<TranscriptionResult>((resolve) => {
        const finish = (error?: string | null) => {
          const transcriptionTimeMs = nowMs() - startedAt;
          this.removeListeners();
          try {
            ExpoSpeechRecognitionModule.stop();
          } catch {
            // The recognizer may already have ended after file transcription.
          }

          resolve(
            createBaseTranscriptionResult(this, input, {
              transcript: finalTranscript.trim(),
              partialTranscripts,
              transcriptionTimeMs,
              timeToFirstTextMs:
                firstTextAt === null ? null : firstTextAt - startedAt,
              streamingMode:
                partialTranscripts.length > 0 ? "true-streaming" : "offline-batch",
              error: error ?? null,
            }),
          );
        };

        const timeout = setTimeout(() => {
          finish("Native ASR timed out while transcribing the recorded audio.");
        }, NATIVE_TRANSCRIPTION_TIMEOUT_MS);

        const finishWithCleanup = (error?: string | null) => {
          clearTimeout(timeout);
          finish(error);
        };

        this.listeners = [
          ExpoSpeechRecognitionModule.addListener("result", (event: any) => {
            const text = event?.results?.[0]?.transcript ?? "";
            if (!text) {
              return;
            }

            if (firstTextAt === null) {
              firstTextAt = nowMs();
            }

            if (event.isFinal) {
              finalTranscript = `${finalTranscript} ${text}`.trim();
            } else {
              partialTranscripts.push(text);
              finalTranscript = text;
            }
          }),
          ExpoSpeechRecognitionModule.addListener("end", () => {
            finishWithCleanup();
          }),
          ExpoSpeechRecognitionModule.addListener("error", (event: any) => {
            finishWithCleanup(
              event?.message ?? event?.error ?? "Native ASR transcription failed.",
            );
          }),
        ];

        ExpoSpeechRecognitionModule.start({
          lang: getNativeLocaleForLanguage(input.language),
          interimResults: true,
          continuous: false,
          requiresOnDeviceRecognition: false,
          audioSource: { uri: input.uri },
          recordingOptions: {
            persist: false,
            outputSampleRate: input.sampleRate ?? 16000,
          },
          androidIntentOptions: {
            EXTRA_LANGUAGE_MODEL: "web_search",
            EXTRA_ENABLE_FORMATTING: "latency",
            EXTRA_PREFER_OFFLINE: true,
          },
        } as any);
      });

      return result;
    } catch (error) {
      return createErrorTranscriptionResult(
        this,
        input,
        error,
        nowMs() - startedAt,
      );
    }
  }

  async startStreaming(options: StreamingASROptions): Promise<void> {
    await this.initialize();

    if (!this.languageSupport.includes(options.language)) {
      throw new Error(`Native ASR does not support ${options.language}.`);
    }

    this.removeListeners();
    this.streamingOptions = options;
    this.streamingStartedAt = nowMs();
    this.streamingFirstTextAt = null;
    this.streamingFinalTranscript = "";
    this.streamingPartialTranscripts = [];
    this.streamingAudioUri = undefined;

    this.listeners = [
      ExpoSpeechRecognitionModule.addListener("audiostart", (event: any) => {
        this.streamingAudioUri = event?.uri ?? undefined;
      }),
      ExpoSpeechRecognitionModule.addListener("speechstart", () => {
        options.onSpeechStart?.();
      }),
      ExpoSpeechRecognitionModule.addListener("speechend", () => {
        options.onSpeechEnd?.();
      }),
      ExpoSpeechRecognitionModule.addListener("result", (event: any) => {
        const text = event?.results?.[0]?.transcript ?? "";
        if (!text) {
          return;
        }

        if (this.streamingFirstTextAt === null) {
          this.streamingFirstTextAt = nowMs();
        }

        if (event.isFinal) {
          this.streamingFinalTranscript = `${this.streamingFinalTranscript} ${text}`.trim();
          options.onFinalResult?.(this.streamingFinalTranscript);
        } else {
          this.streamingPartialTranscripts.push(text);
          options.onPartialResult?.(text);
        }
      }),
      ExpoSpeechRecognitionModule.addListener("end", () => {
        this.resolveStreamingResult();
      }),
      ExpoSpeechRecognitionModule.addListener("error", (event: any) => {
        const message =
          event?.message ?? event?.error ?? "Native ASR streaming failed.";
        options.onError?.(message);
        this.resolveStreamingResult(message);
      }),
    ];

    ExpoSpeechRecognitionModule.start({
      lang: getNativeLocaleForLanguage(options.language),
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: false,
      recordingOptions: {
        persist: true,
        outputSampleRate: options.sampleRate ?? 16000,
      },
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: "free_form",
        EXTRA_ENABLE_FORMATTING: "latency",
        EXTRA_PREFER_OFFLINE: true,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
      },
    } as any);
  }

  async stopStreaming(): Promise<TranscriptionResult> {
    if (!this.streamingOptions || this.streamingStartedAt === null) {
      throw new Error("Native ASR streaming has not been started.");
    }

    return new Promise<TranscriptionResult>((resolve) => {
      this.stopStreamingResolver = resolve;

      setTimeout(() => {
        this.resolveStreamingResult();
      }, 4500);

      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        this.resolveStreamingResult();
      }
    });
  }

  async dispose(): Promise<void> {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // No active session.
    }
    this.removeListeners();
  }

  private resolveStreamingResult(error?: string | null) {
    if (
      !this.streamingOptions ||
      this.streamingStartedAt === null ||
      !this.stopStreamingResolver
    ) {
      return;
    }

    const stoppedAt = nowMs();
    const recordingDurationMs = stoppedAt - this.streamingStartedAt;
    const transcript =
      this.streamingFinalTranscript ||
      this.streamingPartialTranscripts[this.streamingPartialTranscripts.length - 1] ||
      "";
    const result = createBaseTranscriptionResult(
      this,
      {
        language: this.streamingOptions.language,
        sampleRate: this.streamingOptions.sampleRate ?? 16000,
        uri: this.streamingAudioUri,
        recordingDurationMs,
      },
      {
        transcript: transcript.trim(),
        partialTranscripts: this.streamingPartialTranscripts,
        transcriptionTimeMs: Math.max(0, stoppedAt - this.streamingStartedAt),
        timeToFirstTextMs:
          this.streamingFirstTextAt === null
            ? null
            : this.streamingFirstTextAt - this.streamingStartedAt,
        streamingMode:
          this.streamingPartialTranscripts.length > 0
            ? "true-streaming"
            : "offline-batch",
        error: error ?? null,
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
