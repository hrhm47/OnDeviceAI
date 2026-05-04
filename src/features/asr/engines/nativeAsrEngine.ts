import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

import {
  ASREngine,
  ASRLanguage,
  AudioInput,
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

  private listeners: { remove: () => void }[] = [];

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

  async dispose(): Promise<void> {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // No active session.
    }
    this.removeListeners();
  }

  private removeListeners() {
    this.listeners.forEach((listener) => listener.remove());
    this.listeners = [];
  }
}
