import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

import type {
  NativeASRLocale,
  NativeASRPhase3Config,
  NativeIOSASRCapabilities,
  NativeIOSASRErrorEvent,
  NativeIOSASRFinalEvent,
  NativeIOSASRMetricsEvent,
  NativeIOSASRPartialEvent,
  NativeIOSASRPermissionStatus,
  NativeIOSASRStateEvent,
} from "./nativeASRPhase3.types";

type EventMap = {
  "NativeIOSASR.onState": NativeIOSASRStateEvent;
  "NativeIOSASR.onPartialResult": NativeIOSASRPartialEvent;
  "NativeIOSASR.onFinalResult": NativeIOSASRFinalEvent;
  "NativeIOSASR.onError": NativeIOSASRErrorEvent;
  "NativeIOSASR.onMetrics": NativeIOSASRMetricsEvent;
};

type NativeIOSASRModuleType = {
  requestPermissions(): Promise<NativeIOSASRPermissionStatus>;
  getCapabilities(locale: NativeASRLocale): Promise<NativeIOSASRCapabilities>;
  startRecognition(config: NativeASRPhase3Config): Promise<void>;
  stopRecognition(): Promise<void>;
  cancelRecognition(): Promise<void>;
  addListener<TEventName extends keyof EventMap>(
    eventName: TEventName,
    listener: (event: EventMap[TEventName]) => void,
  ): { remove: () => void };
};

const nativeModule =
  requireOptionalNativeModule<NativeIOSASRModuleType>("NativeIOSASR");

export const isNativeIOSASRModuleAvailable =
  Platform.OS === "ios" && Boolean(nativeModule);

const unsupportedPermissionStatus: NativeIOSASRPermissionStatus = {
  microphonePermission: "unknown",
  speechRecognitionPermission: "unknown",
  canStartRecognition: false,
};

export const requestNativeIOSASRPermissions = async () => {
  if (!isNativeIOSASRModuleAvailable || !nativeModule) {
    return unsupportedPermissionStatus;
  }

  return nativeModule.requestPermissions();
};

export const getNativeIOSASRCapabilities = async (
  locale: NativeASRLocale,
): Promise<NativeIOSASRCapabilities> => {
  if (!isNativeIOSASRModuleAvailable || !nativeModule) {
    return {
      platform: "ios",
      requestedLocale: locale,
      recognizerAvailable: false,
      supportsOnDeviceRecognition: false,
      osVersion: null,
      deviceModel: null,
      currentAudioSessionCategory: null,
      currentAudioSessionMode: null,
      sampleRate: null,
      supportsPartialResultsByConfig: true,
    };
  }

  return nativeModule.getCapabilities(locale);
};

export const startNativeIOSASRRecognition = async (
  config: NativeASRPhase3Config,
) => {
  if (!isNativeIOSASRModuleAvailable || !nativeModule) {
    throw new Error(
      "Native iOS ASR requires the custom Expo development build on iOS. It is not available in Expo Go or on Android.",
    );
  }

  await nativeModule.startRecognition(config);
};

export const stopNativeIOSASRRecognition = async () => {
  if (!isNativeIOSASRModuleAvailable || !nativeModule) {
    return;
  }

  await nativeModule.stopRecognition();
};

export const cancelNativeIOSASRRecognition = async () => {
  if (!isNativeIOSASRModuleAvailable || !nativeModule) {
    return;
  }

  await nativeModule.cancelRecognition();
};

export const addNativeIOSASRListener = <TEventName extends keyof EventMap>(
  eventName: TEventName,
  listener: (event: EventMap[TEventName]) => void,
) => {
  if (!isNativeIOSASRModuleAvailable || !nativeModule) {
    return { remove: () => undefined };
  }

  return nativeModule.addListener(eventName, listener);
};
