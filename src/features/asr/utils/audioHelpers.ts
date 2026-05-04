import { RecordingPresets } from "expo-audio";
import type { AudioMode, RecordingOptions } from "expo-audio";

import { ASRLanguage } from "../types/asr.types";

export const ASR_SAMPLE_RATE = 16000;

export const ASR_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

export const ASR_AUDIO_MODE: Partial<AudioMode> = {
  allowsRecording: true,
  playsInSilentMode: true,
};

export const getNativeLocaleForLanguage = (language: ASRLanguage) => {
  switch (language) {
    case "fi":
      return "fi-FI";
    case "en":
    default:
      return "en-US";
  }
};

export const getWhisperLanguage = (language: ASRLanguage) => language;

export const stripFileProtocol = (uri: string) => uri.replace(/^file:\/\//, "");
