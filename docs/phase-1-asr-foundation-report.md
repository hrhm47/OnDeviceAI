# Phase 1 - ASR Implementation Foundation Report

## 1. Purpose of Phase 1

Phase 1 is the speech recognition foundation of the thesis prototype. It prepares the React Native / Expo app for model comparison, latency testing, VAD testing, and later construction report autofill.

The long-term thesis prototype flow is:

```text
voice input
-> on-device ASR
-> transcript improvement
-> context extraction
-> autofilled construction report preview
-> user edits/confirms
-> saved structured report
```

The current completed stage is narrower:

```text
voice input
-> ASR engine selection
-> audio recording or streaming
-> transcription
-> standardized metrics
-> local result storage
```

Phase 1 builds the modular ASR foundation for low-latency transcription experiments under quiet and noisy conditions. The prototype records or streams speech, runs the selected ASR engine, captures timing metrics, returns one standardized `TranscriptionResult`, and saves each attempt locally for later comparison.

Phase 1 intentionally does not implement construction vocabulary correction, context extraction, LLM field mapping, report autofill, final Congrid integration, user study execution, or cognitive load testing. Those are later stages.

## 2. Thesis Alignment

Phase 1 supports the thesis by implementing the first technical step in a privacy-first on-device AI reporting workflow: converting spoken site observations into text on a mobile device.

It contributes most directly to:

- RQ2, functional capability: ASR is the first step from voice input to structured reporting. Without a working ASR layer, the later transcript improvement, context extraction, and report autofill stages cannot be evaluated.
- RQ4, technical feasibility: Phase 1 captures latency, runtime mode, model readiness, VAD behavior, and mobile deployment limitations. These are feasibility signals for running AI-assisted reporting workflows on-device.

Phase 1 also prepares for later RQ1 and RQ3 evaluation by creating the measurement infrastructure needed to study workflow friction and cognitive load. It does not answer those questions yet, because no final report workflow or user evaluation is implemented in this phase.

## 3. Phase 1 Scope

### Included in Phase 1

- Modular ASR engine architecture.
- Shared `ASREngine` interface.
- Active model selector in the benchmark UI.
- Language selector for English and Finnish.
- Microphone recording and audio mode handling.
- VAD layer for models using VAD-segmented offline recognition.
- Native ASR engine.
- Whisper base engine.
- Qwen3-ASR through Sherpa-ONNX.
- Parakeet engine code and download support, currently deactivated from the active selector.
- Standardized `TranscriptionResult`.
- Timing metrics.
- VAD metrics for the VAD-segmented path.
- Local result saving.
- Safe unsupported/error result handling for missing model files.

### Excluded from Phase 1

- Construction vocabulary correction.
- Context extraction.
- Field mapping.
- LLM processing.
- Form autofill.
- Report preview as a completed AI output.
- Final user evaluation.
- Cognitive load testing.
- Production Congrid integration.

The app contains some UI screens with report preview or dataset language, but those are not the completed Phase 1 deliverable. They should be treated as scaffolding for later phases.

## 4. High-Level Phase 1 Architecture

The Phase 1 ASR architecture is organized around a common engine interface and a controller hook that coordinates recording, runtime mode behavior, result creation, and local persistence.

```text
React Native UI
-> Audio Input Controller
-> VAD Layer
-> ASR Engine Interface
-> Selected ASR Engine
-> Standardized TranscriptionResult
-> Metrics Logger
-> Local Storage
```

Detailed view:

```text
React Native UI
|
+-- Model selector
+-- Language selector
+-- Recording controls
+-- VAD status
+-- Transcript display
+-- Result history

Audio Input Controller
|
+-- microphone / audio chunks / recording URI

VAD Layer
|
+-- speech start detection
+-- speech end detection
+-- silence detection
+-- segment buffering

ASR Engine Interface
|
+-- Native ASR
+-- Whisper
+-- Qwen3-ASR
+-- Parakeet optional/deactivated

Result Normalization
|
+-- TranscriptionResult

Metrics + Storage
|
+-- latency
+-- time to first text
+-- segment count
+-- transcription time
+-- local saved results
```

The main coordinator is `src/features/asr/hooks/useAsrController.ts`. It selects an engine from `src/features/asr/services/asrEngineRegistry.ts`, controls microphone flow, updates UI state, creates final results, logs metrics, and saves results through `src/features/asr/services/asrStorage.ts`.

## 5. VAD and ASR Separation

VAD means Voice Activity Detection. It detects when speech starts, when speech is active, when speech ends, and when microphone input is silence or non-speech.

ASR means Automatic Speech Recognition. It converts speech audio into text.

VAD does not transcribe speech. ASR does not necessarily detect speech boundaries by itself.

The Phase 1 VAD/ASR pipeline is:

```text
Microphone audio stream
-> VAD layer
-> speech segment buffer
-> selected ASR engine
-> partial transcript if true streaming is supported
-> segment transcript if VAD-segmented mode is used
-> final transcript
-> metrics logger
-> local storage
```

This distinction is important for the thesis evaluation. VAD does not make an offline ASR model true streaming. A model is only true streaming when partial text appears while the user is still speaking.

In the current implementation, Qwen3-ASR uses the VAD-segmented path. Native ASR can be true streaming if the platform speech service produces interim results. Whisper is currently kept on the safer full-recording path.

## 6. Runtime Modes

### true-streaming

The ASR engine receives microphone chunks continuously and returns partial text while the user is still speaking.

This is the intended role of Native ASR when platform callbacks work. The app records partial transcripts and measures time to first text.

### vad-segmented-offline

VAD detects speech start/end, buffers short speech segments, and sends each segment to an offline ASR model after a pause.

This mode can reduce perceived waiting time compared with waiting for a full recording, but it is not true partial-token streaming. Text appears only after VAD closes a speech segment.

### offline-full-recording

The ASR engine waits until the full recording is stopped, then transcribes the whole audio.

This is the current Whisper path. It is simpler and safer on iOS than running native PCM streaming and Whisper transcription together.

### unsupported

The model is missing, not configured, unavailable, or unsupported on the current platform.

The unsupported mode is saved as a normal result with an error message where possible. This prevents missing model files from crashing the app and keeps failed attempts visible in evaluation records.

Runtime modes matter because they affect user waiting time, `timeToFirstTextMs`, and fair model comparison. They also prevent the thesis from falsely calling offline models "real-time".

## 7. Implemented ASR Engines

| Engine | Status | Languages | Runtime mode | Role | Notes |
|---|---|---|---|---|---|
| Native ASR | Working / platform-limited | EN/FI depending OS speech service | `true-streaming` if partial callbacks work; may fall back to offline-like behavior | Real-time baseline | Uses `expo-speech-recognition`. Partial behavior depends on OS and locale support. |
| Whisper | Working / recently stabilized | EN/FI using multilingual base | `offline-full-recording` | Local offline baseline | Active Whisper selection is only `base`. Removed tiny, tiny.en, and base.en from the active model list. Not true streaming. |
| Qwen3-ASR | Ready when files exist / unsupported when missing | EN/FI | `vad-segmented-offline` when ready; `unsupported` when missing | Advanced on-device candidate | Uses `react-native-sherpa-onnx/stt` with Qwen3-ASR model files. |
| Parakeet | Implemented in code but deactivated from active selector | EN/FI scope in code | `vad-segmented-offline` in engine; not active in selector | Optional multilingual candidate | NeMo transducer support exists, but it was deactivated after iOS instability during recognition. |
| Vosk | Removed | Selected model was English-only | Not active | Rejected baseline | Removed from active selector/registry because it did not meet the Finnish/English thesis requirement. |

## 8. Native ASR Implementation

File path:

`src/features/asr/engines/nativeAsrEngine.ts`

Package used:

`expo-speech-recognition`

Native ASR implements the shared `ASREngine` interface. It supports both recorded-file transcription through `transcribe()` and live recognition through `startStreaming()` / `stopStreaming()`.

For live recognition, `NativeAsrEngine` calls `ExpoSpeechRecognitionModule.start()` with:

- `interimResults: true`
- `continuous: true`
- language set by `getNativeLocaleForLanguage()`
- persistent recording enabled

The controller passes callbacks for partial result, final result, error, speech start, and speech end. When the platform emits non-final results, the app stores those as `partialTranscripts` and updates the visible live transcript.

`timeToFirstTextMs` is captured from the first partial or final text callback relative to the start of streaming.

Language support is mapped as:

- English: `en-US`
- Finnish: `fi-FI`

Known limitations:

- Availability depends on the OS speech service.
- Finnish support depends on the platform recognizer and installed speech services.
- Interim/partial result behavior is platform-dependent.
- The current code sets `requiresOnDeviceRecognition: false`, so the platform may use a system recognizer that is not strictly local-only depending on OS behavior.

Native ASR is currently the strongest live transcription baseline if partial callbacks work, because it can show text while the user is still speaking.

## 9. Whisper Implementation

File path:

`src/features/asr/engines/whisperAsrEngine.ts`

Package used:

`whisper.rn`

Active model:

`base`

Active asset:

`assets/whisper/ggml-base.bin`

Current TypeScript model type:

```ts
type whisperModels = 'base';
```

The active Whisper implementation now uses only the multilingual base model. Tiny, tiny.en, and base.en have been removed from the active selector and active engine mapping. Historical `.en` Whisper models are English-only, but they are no longer part of the active Phase 1 model list.

Runtime mode:

`offline-full-recording`

Current behavior:

1. The app records audio through Expo audio.
2. The recording is stopped.
3. The recording URI is passed to `whisper.rn`.
4. Whisper returns one final transcript.
5. The result is saved as a `TranscriptionResult`.

Whisper does not currently use VAD segments in the active controller. A previous attempt to use Whisper through the PCM/VAD segment loop was removed because running native PCM streaming and Whisper transcription together was unstable on iOS.

Whisper should not be marked as true streaming unless the implementation actually produces partial text while the user is speaking.

Known limitations:

- No true partial-token streaming in the current prototype.
- Full-recording transcription means the user waits until recording stops.
- Runtime behavior should be verified on target iOS and Android devices.
- The active model is larger than tiny models but more usable for quality.

## 10. Qwen3-ASR Implementation

File path:

`src/features/asr/engines/qwenAsrEngine.ts`

Runtime/package used:

- `react-native-sherpa-onnx/stt`
- `react-native-sherpa-onnx/download`
- `react-native-sherpa-onnx/audio`
- `react-native-sherpa-onnx/extraction` through the download service

Model id:

`sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25`

Download URL:

`https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25.tar.bz2`

Expected project asset directory:

`assets/models/qwen/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25`

Runtime document-directory fallback:

`models/qwen/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25`

Required files:

- `conv_frontend.onnx`
- `encoder.int8.onnx`
- `decoder.int8.onnx`
- `tokenizer/`

Sherpa-ONNX configuration:

```ts
createSTT({
  modelPath,
  modelType: "qwen3_asr",
  preferInt8: true,
  numThreads: 2,
  provider: "cpu",
  modelOptions: {
    qwen3Asr: {
      maxTotalLen: 512,
      maxNewTokens: 128,
      temperature: 0.000001,
      topP: 0.8,
    },
  },
});
```

Before accepting a path, the engine validates files and calls `detectSttModel()` with `modelType: "qwen3_asr"` and `preferInt8: true`.

Runtime mode:

`vad-segmented-offline`

In the current implementation, Qwen is not marked true streaming. It uses the Sherpa-ONNX offline STT recognizer over VAD speech segments. The controller opens a PCM live stream, feeds chunks into the energy-based VAD service, sends completed speech segments to Qwen, and appends recognized segment text.

Missing model handling:

If files are missing, Qwen returns a saved unsupported result with:

`Qwen3-ASR model files are missing or not configured.`

This is surfaced in the model selector as missing/not ready instead of crashing the app.

## 11. Parakeet Implementation

File path:

`src/features/asr/engines/parakeetAsrEngine.ts`

Current status:

Parakeet is implemented in code but deactivated from the active engine registry and active benchmark selector. It remains available through `getASREngineById("parakeet")`, but `getAvailableASREngines()` does not include it, so the normal UI does not present it as an active choice.

Package/runtime used:

- `react-native-sherpa-onnx/stt`
- `react-native-sherpa-onnx/download`
- `react-native-sherpa-onnx/audio`

Model id:

`sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8`

Download URL:

`https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2`

Model type:

`nemo_transducer`

Expected project asset directory:

`assets/models/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8`

Runtime document-directory fallback:

`models/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8`

Required files:

- `encoder.int8.onnx`
- `decoder.int8.onnx`
- `joiner.int8.onnx`
- `tokens.txt`

Sherpa-ONNX configuration:

```ts
createSTT({
  modelPath,
  modelType: "nemo_transducer",
  preferInt8: true,
  numThreads: 2,
  provider: "cpu",
});
```

Before accepting a path, the engine validates required files and calls `detectSttModel()` with `modelType: "nemo_transducer"` and `preferInt8: true`.

Runtime mode in the engine:

`vad-segmented-offline`

Parakeet is an offline transducer model in this implementation. It should be used as `vad-segmented-offline`, not true streaming, unless true partial results are proven later.

Known limitations:

- It is deactivated from the active selector after iOS instability during recognition.
- It requires large local model files.
- It has not been validated as a stable Phase 1 evaluation target.

## 12. Vosk Removal

Vosk was removed from active testing because the selected Vosk model was English-only and did not fit the Finnish/English thesis requirement.

Current status:

- Not in the active model selector.
- Not in the active engine registry.
- Not in the active model download service.
- May be mentioned only as a rejected English-only baseline in thesis documentation.

## 13. VAD Implementation Details

File path:

`src/features/asr/services/vadService.ts`

The current VAD implementation is an energy-based fallback implemented in TypeScript. The installed Sherpa VAD model can be downloaded, but the active VAD processing path uses the local `VADService` rather than a native Silero VAD bridge.

The VAD service processes PCM chunks as `Float32Array` values. It calculates RMS energy for each chunk and compares it with a speech threshold. It tracks pending speech, active speech, trailing silence, pre-speech padding, and maximum segment length.

Default config:

```ts
sampleRate: 16000
frameDurationMs: 30
speechThreshold: 0.012
minSpeechDurationMs: 200
silenceTimeoutMs: 700
preSpeechPaddingMs: 200
maxSegmentDurationMs: 12000
```

Implemented behavior:

- PCM chunk input.
- RMS/amplitude thresholding.
- Speech start detection.
- Speech end detection.
- Silence detection.
- Silence timeout to close a segment.
- Pre-speech padding.
- Maximum segment duration.
- Segment buffering.
- UI status updates through `VADStatus`.
- VAD metrics through `getMetrics()`.

Captured VAD metrics:

- `speechStartCount`
- `speechEndCount`
- `speechDurationMs`
- `silenceDurationMs`
- `segmentCount`

Silero VAD can be added later through Sherpa-ONNX native support if needed.

Expected local path for the downloaded Silero file:

`models/vad/silero_vad.onnx`

The direct downloader currently stores it under:

`sherpa-onnx/models/vad/silero_vad/silero_vad.onnx`

This difference should be verified before Phase 2 if native Silero VAD support is added.

## 14. Standard TranscriptionResult Schema

The actual Phase 1 result type is defined in:

`src/features/asr/types/asr.types.ts`

```ts
export type TranscriptionResult = {
  id: string;
  timestamp: string;

  modelId: string;
  modelName: string;
  engineType: ASREngineType;

  language: ASRLanguage;

  transcript: string;
  partialTranscripts?: string[];
  segmentTranscripts?: SegmentTranscript[];

  recordingDurationMs: number;
  speechDurationMs?: number;
  silenceDurationMs?: number;

  transcriptionTimeMs: number;
  timeToFirstTextMs?: number | null;

  runtimeMode: ASRRuntimeMode;

  segmentCount?: number;
  sampleRate?: number;
  audioUri?: string;

  error?: string | null;
};
```

This matters because every model returns the same structure. Phase 2 can compare models fairly only if Native ASR, Whisper, Qwen, and any optional model save equivalent fields.

## 15. Metrics Saved in Phase 1

Phase 1 saves or logs the following fields:

- `modelId`
- `modelName`
- `engineType`
- `language`
- `runtimeMode`
- `recordingDurationMs`
- `speechDurationMs`
- `silenceDurationMs`
- `transcriptionTimeMs`
- `timeToFirstTextMs`
- `partialTranscripts`
- `segmentTranscripts`
- `transcript`
- `segmentCount`
- `sampleRate`
- `audioUri`
- `error`
- `timestamp`

Important metric meanings:

- `recordingDurationMs`: total duration of the recording or streaming session.
- `transcriptionTimeMs`: ASR processing time or streaming session time depending on runtime mode.
- `timeToFirstTextMs`: responsiveness metric; first visible text relative to recording start.
- `speechDurationMs`: amount of audio classified as speech by VAD.
- `silenceDurationMs`: amount of audio classified as silence/non-speech by VAD.
- `segmentCount`: number of VAD speech segments created.
- `runtimeMode`: distinguishes true streaming from VAD-segmented offline and full-recording offline modes.
- `error`: records missing models, unsupported paths, or runtime failures without losing the attempt.

Results are also logged to the console through:

`src/features/asr/services/asrResultLogger.ts`

## 16. Local Storage and Export Readiness

Storage service file:

`src/features/asr/services/asrStorage.ts`

Storage directory:

`asr-results/`

Storage file:

`asr-results/results.json`

The file is stored under Expo's `FileSystem.documentDirectory`.

Implemented storage functions:

- `getAsrResults()`: reads saved ASR results and returns an array.
- `saveAsrResult()`: prepends a new result and writes the JSON file.
- `clearAsrResults()`: replaces the saved file with an empty array.

The save path is guarded by an internal queue so concurrent saves are serialized.

Export readiness:

- Local JSON storage exists.
- History UI can read and display saved ASR results.
- Dedicated CSV/JSON export for thesis evaluation is not implemented yet.

Phase 2 still needs:

- CSV export.
- JSON export with test metadata.
- `testCaseId`.
- `referenceText`.
- `noiseCondition`.
- WER/CER fields.
- Batch evaluation output.

## 17. UI Behavior in Phase 1

Main Phase 1 UI screen:

`app/(tabs)/bench.tsx`

Implemented UI behavior:

- Model selector for active engines.
- Language selector for English and Finnish.
- Whisper model chip, currently only `base`.
- Qwen model download setup when files are missing.
- Shared Silero VAD download button for the Qwen path.
- Recording controls.
- VAD status display.
- Runtime mode display.
- Time-to-first-text display.
- Transcript display.
- Partial transcript display only when runtime mode is `true-streaming`.
- Segment transcript list while VAD-segmented recognition is running.
- Final metrics display after a result is saved.
- Error display.
- Saved-locally indicator after result persistence.

History/result UI:

`app/(tabs)/history.tsx`

The history screen reads saved ASR results with `getAsrResults()` and maps them into a baseline testing results list. Some sample placeholder runs still exist as fallback data when no saved results are available.

Settings UI:

`app/(tabs)/settings.tsx`

Settings lists available ASR model information at a high level.

Dataset/report preview UI:

`app/(tabs)/datasets.tsx`

This screen contains scaffolded report preview UI. It is not the completed Phase 1 deliverable and should not be described as implemented AI autofill.

The UI must not falsely show offline models as real-time. In the current active selector, Whisper is full-recording offline, Qwen is VAD-segmented offline when ready, and Native ASR is the only active true-streaming candidate.

## 18. Manual Testing Checklist

- [ ] App opens
- [ ] ASR test screen opens
- [x] Vosk removed from active model selector
- [x] Native ASR selectable
- [x] Whisper selectable
- [x] Qwen selectable
- [x] Parakeet selectable or clearly optional
- [x] English selectable
- [x] Finnish selectable
- [ ] Native ASR returns transcript
- [ ] Native ASR shows partial transcript live if platform supports it
- [ ] Whisper returns transcript
- [x] Whisper is not falsely shown as true streaming
- [x] Qwen model file check works in code
- [x] Qwen fails safely if model files are missing
- [x] Qwen runtime mode is labeled honestly
- [x] Parakeet model file check works if implemented
- [x] Parakeet fails safely if model files are missing
- [x] VAD service exists
- [ ] VAD detects speech start on target device
- [ ] VAD detects speech end on target device
- [x] VAD status appears in UI
- [x] VAD segment count is logged
- [x] timeToFirstTextMs is logged
- [x] runtimeMode is saved
- [x] segmentTranscripts are saved when using VAD
- [x] final transcript is saved
- [x] failed attempts save error instead of crashing
- [x] local result storage works in code
- [x] docs updated

Items left unchecked require manual device verification. Code presence alone is not enough to claim the behavior works reliably on iOS/Android hardware.

## 19. Known Limitations

- Native ASR partial behavior depends on OS, locale, and speech service.
- Native ASR currently uses platform speech recognition and may not be strictly on-device in every OS configuration.
- Whisper is not true streaming in this prototype.
- Whisper `.en` models are English-only, but `.en` models are no longer active in the current selector.
- Qwen requires large model files.
- Qwen currently uses the offline/VAD-segmented path unless true streaming is proven later.
- Parakeet is optional/deactivated and depends on local model files.
- Parakeet had iOS stability problems during informal implementation testing.
- VAD is an energy-based fallback, not production-level speech detection.
- Downloaded Silero VAD support exists as a file download path, but active VAD processing is still the TypeScript energy-based service.
- WER/CER evaluation is not Phase 1; it belongs to Phase 2.
- Context extraction and form autofill are later phases.
- History and dataset screens still contain placeholder/sample content.

## 20. Lessons Learned from Phase 1

Initial informal testing suggested that Native ASR is the strongest early candidate for live interaction when partial callbacks work, because it can display text while the user is still speaking.

Whisper tiny-level models were not retained as active thesis baselines. Whisper base is more usable, but the current implementation is offline full-recording rather than live streaming.

Qwen and Parakeet require large model files and careful runtime validation. Their availability cannot be assumed from code alone; readiness checks and missing-model results are necessary.

VAD helps create a fair low-latency testing setup for offline models, but it does not make those models true streaming. This distinction is important for both UI honesty and thesis evaluation.

Standardized output is necessary for Phase 2. Without a common result schema, WER, CER, latency, runtime mode, and reliability comparisons would be inconsistent.

Further Phase 2 evaluation is required before selecting the final ASR model for the thesis prototype.

## 21. Transition to Phase 2

Phase 2 is:

Phase 2 - Baseline ASR Testing and Dataset Construction

Phase 2 should add:

- Manual construction test dataset.
- English/Finnish `referenceText`.
- `testCaseId`.
- `noiseCondition`.
- WER calculation.
- CER calculation.
- Real-time factor.
- FLEURS automated testing if still appropriate for the thesis.
- CSV/JSON export.
- Model comparison tables.
- Model selection decision.

Phase 2 should not improve the models yet. It should first measure baseline behavior. Model improvement, prompt-based correction, vocabulary correction, or report autofill should come after baseline measurement.

## 22. Files Added or Modified

| Area | File path | Purpose |
|---|---|---|
| ASR types | `src/features/asr/types/asr.types.ts` | Defines languages, runtime modes, engine interface, VAD metrics, segment transcripts, and standardized `TranscriptionResult`. |
| Native engine | `src/features/asr/engines/nativeAsrEngine.ts` | Implements platform speech recognition through `expo-speech-recognition`; supports streaming callbacks when available. |
| Whisper engine | `src/features/asr/engines/whisperAsrEngine.ts` | Implements active Whisper base full-recording transcription through `whisper.rn`. |
| Qwen engine | `src/features/asr/engines/qwenAsrEngine.ts` | Implements Sherpa-ONNX Qwen3-ASR recognition and readiness checks. |
| Parakeet engine | `src/features/asr/engines/parakeetAsrEngine.ts` | Implements optional/deactivated Sherpa-ONNX Parakeet NeMo transducer support. |
| VAD service | `src/features/asr/services/vadService.ts` | Implements energy-based VAD fallback, segment buffering, and VAD metrics. |
| ASR controller | `src/features/asr/hooks/useAsrController.ts` | Coordinates engine selection, recording, VAD-segmented processing, result creation, and saving. |
| Engine registry | `src/features/asr/services/asrEngineRegistry.ts` | Builds active engine metadata and readiness state for the selector. |
| Storage | `src/features/asr/services/asrStorage.ts` | Saves, reads, and clears local ASR results in `asr-results/results.json`. |
| Result logger | `src/features/asr/services/asrResultLogger.ts` | Logs standardized ASR metrics to the console. |
| Model download config | `src/features/asr/services/asrModelDownloadService.ts` | Downloads Qwen, Parakeet, and shared Silero VAD model files. |
| Audio helpers | `src/features/asr/utils/audioHelpers.ts` | Defines sample rate, recording options, language mapping, and file URI cleanup. |
| Metrics helpers | `src/features/asr/utils/metricsHelpers.ts` | Creates standardized success and error `TranscriptionResult` objects. |
| ASR test UI | `app/(tabs)/bench.tsx` | Main Phase 1 model/language selection, recording, transcript, metrics, and readiness screen. |
| Result history UI | `app/(tabs)/history.tsx` | Displays saved ASR results and placeholder baseline rows. |
| Settings UI | `app/(tabs)/settings.tsx` | Lists ASR model status information. |
| Dataset/report scaffold | `app/(tabs)/datasets.tsx` | Contains later-phase report preview scaffolding, not completed Phase 1 AI autofill. |
| Whisper legacy helper | `hooks/useWhisperEngine.ts` | Older Whisper hook retained in the project; active Phase 1 path uses `src/features/asr/engines/whisperAsrEngine.ts`. |
| Legacy Whisper engine | `src/engine/WhisperEngine.ts` | Older engine module retained in the project; active Phase 1 path uses `src/features/asr/engines/whisperAsrEngine.ts`. |
| Model type constants | `constants/types/ModelTypes.ts` | Defines active model type strings such as Whisper `base`. |
| Model constants | `constants/constant.ts` | Defines active Whisper model selector entries. |
| Existing Phase 1 docs | `docs/phase-1-asr-implementation.md` | Earlier implementation notes. |
| This report | `docs/phase-1-asr-foundation-report.md` | Thesis-oriented Phase 1 architecture and implementation report. |

