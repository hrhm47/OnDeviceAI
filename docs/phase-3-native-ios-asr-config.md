# Phase 3 Native iOS ASR Configuration

## 1. Purpose of Phase 3

Phase 3 makes the selected Native iOS ASR path configurable, observable, and measurable for the thesis prototype. The goal is not to build the full construction-report autofill flow yet. This phase focuses only on live Apple Speech recognition configuration, raw transcript preservation, timing metrics, and CSV-ready result logging.

Phase 3 does not fine-tune Apple's ASR model.

Phase 3 improves how the app configures and evaluates Native iOS ASR.

## 2. Why Native iOS ASR Was Selected

The Phase 2 manual ASR pilot on iPhone 11 Pro showed that Native iOS ASR gives the best current fit for the iOS reporting workflow because it supports live transcription, fast feedback, and a low-friction mobile interaction pattern. Whisper, Qwen, and Parakeet remain useful comparison paths, but Phase 3 advances the selected Native iOS path first.

## 3. Why a Custom Expo Native Module Is Used

The prototype uses a custom iOS Expo native module because React Native alone cannot configure `SFSpeechAudioBufferRecognitionRequest`.

Plain Expo Go cannot run this Phase 3 native module. The app must be run with a custom Expo development build, `expo run:ios`, or Xcode after native module autolinking and CocoaPods installation.

## 4. Native iOS Configuration

The local Expo module is `NativeIOSASR`. It uses:

```text
AVAudioSession
-> AVAudioEngine
-> SFSpeechAudioBufferRecognitionRequest
-> SFSpeechRecognizer
```

The native side configures:

- `SFSpeechRecognizer(locale: Locale(identifier: config.locale))`
- `request.shouldReportPartialResults = true`
- `request.taskHint = .dictation`
- safe on-device recognition policy
- optional `request.contextualStrings`
- optional `request.addsPunctuation` when supported by the iOS version

The prototype relies on the native iOS Speech/audio stack and does not implement a custom noise-removal algorithm.

## 5. React Native Responsibilities

React Native owns the Phase 3 config object, UI controls, contextual-string scaffold, partial/final transcript display, WER/CER calculation, result object creation, local storage, and CSV export.

The app preserves the raw Native ASR transcript. `finalTranscript` and `improvedTranscript` currently equal the raw transcript unless future correction rules are explicitly enabled.

## 6. On-Device Recognition Policy

Phase 3 supports:

- `prefer`: require on-device recognition only when `supportsOnDeviceRecognition` is true; otherwise allow fallback.
- `require`: fail safely before recognition when on-device recognition is unsupported.
- `allowNetwork`: do not set `requiresOnDeviceRecognition`.

Offline behavior is only claimed when on-device recognition is supported and explicitly required.

Each result logs `onDevicePolicy`, `supportsOnDeviceRecognition`, `requestedRequiresOnDeviceRecognition`, and `recognitionPrivacyMode`.

## 7. Contextual Strings Scaffold

Contextual strings and punctuation are implemented as configurable features, but the actual vocabulary will be tuned after the first implementation.

The current scaffold is disabled by default and uses a small demo project context only, including terms such as `A302`, `A303`, `Building A`, `bathroom`, `staircase`, `water leak`, `plumbing contractor`, `electrical contractor`, `urgent`, `vesivuoto`, `kylpyhuone`, and `turvakaide`.

The UI shows only the contextual string count.

## 8. Punctuation Scaffold

`addsPunctuation` is disabled by default. When enabled, the native module applies it only behind an iOS availability check and logs `addsPunctuationApplied`.

## 9. Audio Session Handling

Phase 3 uses a stable minimal live speech capture setup. The native module sets the iOS audio session category to `.record` with `.default` mode and logs the actual audio session category, mode, and sample rate.

Phase 3 does not introduce audio-session experiments, voice chat modes, AGC toggles, echo-cancellation experiments, custom preprocessing, or custom noise suppression.

## 10. Phase 3 Result Schema

Phase 3 results are stored separately from Phase 2 and include:

- test case/session identifiers
- model identity: `native_ios`, `Native iOS ASR`, `native`
- locale/language/config ID
- raw, final, normalized, and improved transcript fields
- WER/CER when reference text exists
- partial transcript count and optional partial transcript list
- contextual string and punctuation metadata
- on-device privacy metadata
- recognizer/capability metadata
- timing metrics: TTFS, final latency, transcription time, real-time factor
- audio session metadata
- success/error fields and notes

## 11. Running Phase 3 Tests

1. Build and run a custom iOS dev client with the native module included.
2. Open the `Phase 3` tab.
3. Select English or Finnish.
4. Select the Phase 2 test case and session.
5. Choose `prefer`, `require`, or `allowNetwork`.
6. Optionally enable contextual strings or punctuation.
7. Start recognition and speak the reference report.
8. Stop recognition.
9. Review raw transcript, normalized transcript, WER/CER, TTFS, latency, and privacy metadata.
10. Save the Phase 3 result.

## 12. CSV Export

The Phase 3 tab exports CSV to:

```text
<documentDirectory>/phase3-native-ios-asr/native-asr-results-export.csv
```

CSV fields follow the Phase 3 schema order used by `PHASE3_NATIVE_ASR_CSV_FIELDS`.

## 13. Known Limitations

- iOS is implemented first; Android is intentionally unsupported for Phase 3 Native iOS ASR.
- The module requires a custom Expo development build and does not work in plain Expo Go.
- Apple Speech availability, on-device support, and punctuation behavior vary by device, locale, and iOS version.
- Contextual strings are a scaffold, not a tuned construction vocabulary.
- The app does not claim fully offline recognition unless on-device recognition is supported and `requiresOnDeviceRecognition` was actually set.
- Failed attempts can be saved with config and capability metadata where available.

## 14. Next Step

The next step is to tune contextual strings and run punctuation on/off tests for English and Finnish construction-reporting phrases.
