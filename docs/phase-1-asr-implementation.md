# Phase 1 - ASR Implementation Foundation

## Purpose

Phase 1 builds the modular ASR foundation for baseline testing. The prototype records or streams speech, runs the selected ASR engine, captures timing metrics, returns one standardized `TranscriptionResult`, and saves each attempt locally for later comparison.

This phase intentionally does not implement construction vocabulary correction, context extraction, LLM field mapping, or report autofill.

## Thesis alignment

This phase supports:

- RQ2: converting voice input into machine-readable text for later structured form mapping.
- RQ4: measuring latency, accuracy-related feasibility, and mobile deployment constraints.

## Real-time, VAD-segmented, and offline ASR modes

The target flow is:

```text
Microphone PCM stream
-> VAD layer
-> speech segment buffer
-> selected ASR engine
-> partial transcript if supported
-> final transcript after speech segment or recording stop
-> metrics logging
-> local result saving
```

VAD is a separate speech detection layer. It detects speech and silence, buffers speech segments, and ignores silence. VAD does not make an ASR model true streaming.

Streaming modes are recorded as:

- `true-streaming`: the model accepts audio chunks continuously and returns partial text while the user is still speaking.
- `vad-segmented`: VAD buffers a speech segment and sends it to ASR after pause/end-of-speech. This reduces waiting but is not word-by-word live transcription.
- `offline-batch`: the model waits until the whole recording is finished, then transcribes.

Native ASR is the live transcription baseline when the OS provides partial results. Whisper is expected to be offline or VAD-segmented only. Qwen3-ASR is evaluated for true-streaming support, but the current Sherpa-ONNX Qwen path is VAD-segmented/offline because `qwen3_asr` is not exposed through the online streaming recognizer in this wrapper. Parakeet is optional and experimental.

## Active model table

| Engine | Language | Streaming mode | Role |
|---|---|---|---|
| Native ASR | EN/FI | true-streaming if OS supports partials | real-time baseline |
| Whisper | EN/FI | offline-batch or VAD-segmented | multilingual offline baseline |
| Qwen3-ASR | EN/FI | test true-streaming/VAD/offline | advanced on-device candidate |
| Parakeet | EN/FI | optional/test | optional multilingual candidate |

## Implemented engines

| Engine | Status | Language support | Role | Notes |
|---|---|---|---|---|
| Native ASR | Working/platform-limited | EN/FI depending OS | Real-time baseline | Uses `expo-speech-recognition` directly for live partial callbacks where available. |
| Whisper | Working/partial | EN/FI | Offline multilingual baseline | Uses bundled `whisper.rn` model files; `.en` models are English-only. |
| Qwen3-ASR | Safe scaffold/ready when model exists | EN/FI | Advanced on-device candidate | Uses `react-native-sherpa-onnx` offline STT with PCM and VAD-segmented segments. |
| Parakeet TDT | Optional/safe scaffold | EN/FI when model exists | Experimental candidate | Uses Sherpa-ONNX if the Parakeet model files are present; missing files are saved as clean failed runs. |

## Vosk scope decision

Vosk was removed from active testing because the selected Vosk model was English-only and did not fit the Finnish/English thesis requirement.

The old Vosk adapter and download helper may remain in the codebase as harmless documentation/legacy scaffold, but Vosk is not part of the active model selector, active ASR engine registry, or active comparison list.

## Qwen3-ASR notes

Expected Sherpa download model id:

`sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25`

Direct model URL used by the in-app download action:

`https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25.tar.bz2`

Expected project asset directory if bundling manually:

`assets/models/qwen/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25`

Runtime document-directory fallback:

`models/qwen/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25`

Expected files:

- `conv_frontend.onnx`
- `encoder.int8.onnx`
- `decoder.int8.onnx`
- `tokenizer/`

The ASR Test screen has a `Download Qwen3-ASR` button. It first tries Sherpa-ONNX `ensureModelByCategory()` and falls back to the direct GitHub release URL above. After download it extracts the `.tar.bz2` package into the app document directory.

Qwen records through Sherpa-ONNX native PCM capture at 16 kHz mono. The VAD service splits speech from silence and sends completed speech segments to the Qwen offline recognizer. Qwen is not marked as true streaming unless the runtime exposes real partial text while the user is speaking.

If the model is missing or invalid, Qwen returns and saves:

`Qwen3-ASR model files are missing or not configured.`

## Parakeet notes

Optional model id:

`sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8`

Expected project asset directory if bundling manually:

`assets/models/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8`

Runtime document-directory fallback:

`models/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8`

Parakeet is optional for Phase 1. The app detects model files and fails safely when they are missing. It is not allowed to block Native, Whisper, or Qwen testing.

## Saved metrics

Each saved result includes:

- `id`
- `timestamp`
- `modelId`
- `modelName`
- `engineType`
- `language`
- `streamingMode`
- `transcript`
- `partialTranscripts`
- `recordingDurationMs`
- `transcriptionTimeMs`
- `timeToFirstTextMs`
- `speechSegmentCount`
- `averageSegmentProcessingTimeMs`
- `vadMetrics`
- `audioUri`
- `sampleRate`
- `deviceInfo`
- `error`

Optional VAD metrics are saved when available:

- `vadSpeechStartCount`
- `vadSpeechEndCount`
- `totalSpeechDurationMs`
- `totalSilenceDurationMs`
- `segmentCount`

Results are stored locally under the app document directory in `asr-results/results.json` and can be retrieved with `getAsrResults()`.

## How to test manually

1. Run `npm run start`.
2. Open the `ASR Test` tab.
3. Select `Native ASR`, select English or Finnish, record speech, and confirm partial text appears live if the OS supports interim results.
4. Select `Whisper`, choose a model file, record speech, and stop to transcribe. Use `tiny` or `base` for Finnish.
5. Select `Qwen3-ASR` and tap `Download Qwen3-ASR`. After the download/extraction reaches 100%, record speech and confirm VAD status changes through listening, speech detected, silence, and processing segment.
6. If Qwen model download is skipped or fails, record once and confirm the clean missing-model error is shown and saved.
7. Select `Parakeet TDT` and confirm it is optional: missing model files should show a clean saved error instead of crashing.
8. Open `Results` and confirm saved ASR attempts include `streamingMode`, partial transcripts where available, and VAD metrics where available.

## Known limitations

- Native ASR partial behavior depends on the OS speech service and locale support.
- Whisper is not true streaming in this prototype.
- Qwen3-ASR currently runs through Sherpa-ONNX offline recognition over VAD segments; it is not true streaming unless upstream/runtime support exposes partial callbacks.
- Parakeet is optional and depends on local model files.
- WER/CER evaluation comes in Phase 2.
- Context extraction and form autofill come later.

## Phase 1 completion definition

Phase 1 is complete when:

- Vosk is removed from the active model selector and registry.
- Native and Whisper are runnable or preserved.
- Qwen is selectable and fails safely if model files are missing.
- Parakeet is selectable as optional and fails safely if model files are missing.
- The UI shows selected model, language, streaming mode, VAD/microphone status, partial transcript when available, final transcript, timer, time to first text, transcription time, and model limitation message.
- All results use the same `TranscriptionResult` format and are saved locally.
