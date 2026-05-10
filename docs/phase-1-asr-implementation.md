# Phase 1 - ASR Implementation Foundation

## Purpose

Phase 1 builds the modular ASR foundation for low-latency transcription experiments under quiet and noisy conditions. The prototype records or streams speech, runs the selected ASR engine, captures timing metrics, returns one standardized `TranscriptionResult`, and saves each attempt locally for later comparison.

This phase intentionally does not implement construction vocabulary correction, context extraction, LLM field mapping, or report autofill.

## VAD and ASR separation

VAD means Voice Activity Detection. It detects when speech starts, when speech is active, when speech ends, and when the microphone input is silence or non-speech.

ASR means Automatic Speech Recognition. It converts speech audio into text.

VAD is placed before ASR as an audio segmentation layer:

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

VAD does not make an offline ASR model true streaming. A model is only true streaming when partial text appears while the user is still speaking.

## Runtime modes

- `true-streaming`: the ASR engine receives microphone chunks continuously and returns partial text while the user is still speaking.
- `vad-segmented-offline`: VAD detects speech start/end, buffers short speech segments, and sends each segment to an offline ASR model after a pause. This matches Sherpa-ONNX simulated streaming for non-streaming ASR models.
- `offline-full-recording`: the ASR engine waits until the full recording is stopped, then transcribes the whole audio.
- `unsupported`: the model is missing, not configured, unavailable, or unsupported on the current platform.

## Model runtime behavior

| Engine | Language | Expected runtime mode | Role |
|---|---|---|---|
| Native ASR | EN/FI | true-streaming if partial callbacks work | real-time baseline |
| Whisper | EN/FI | vad-segmented-offline or offline-full-recording | multilingual offline baseline |
| Qwen3-ASR | EN/FI | vad-segmented-offline | advanced on-device candidate |
| Parakeet | EN/FI | vad-segmented-offline | NVIDIA Parakeet NeMo transducer candidate |

## Implemented engines

| Engine | Status | Runtime mode in this implementation | Notes |
|---|---|---|---|
| Native ASR | Working/platform-limited | `true-streaming` when interim callbacks produce partials | Uses `expo-speech-recognition` as the live baseline. |
| Whisper | Working | `offline-full-recording` | Uses bundled `whisper.rn`; `.en` models are English-only. |
| Qwen3-ASR | Ready when model files exist | `vad-segmented-offline`; `unsupported` when missing | Uses `react-native-sherpa-onnx` offline STT over VAD speech segments. |
| Parakeet TDT | Ready when model files exist | `vad-segmented-offline`; `unsupported` when missing | Uses the Sherpa-ONNX NVIDIA Parakeet TDT 0.6B v3 INT8 NeMo transducer model over VAD speech segments. |

## Vosk removal

Vosk was removed from active testing because the selected Vosk model was English-only and does not fit the Finnish/English thesis requirement.

Vosk is not part of the active model selector, active ASR engine registry, or active model download service. It may be mentioned only as a rejected English-only baseline in thesis documentation.

## VAD implementation

The installed `react-native-sherpa-onnx/vad` module is currently a placeholder, so Phase 1 uses a lightweight energy-based VAD fallback at runtime. The app can download the shared Sherpa-ONNX `silero_vad.onnx` file for parity with the official simulated-streaming examples, but using it from JavaScript requires a React Native VAD bridge or a package version that exposes native VAD.

The VAD service lives at `src/features/asr/services/vadService.ts` and supports:

- PCM chunk input
- RMS/amplitude thresholding
- configurable sample rate and frame duration
- minimum speech duration to reject short noise spikes
- silence timeout to close speech segments
- pre-speech padding
- maximum segment duration
- VAD status updates for the UI
- segment buffering for VAD-segmented offline ASR

Default config:

- `sampleRate`: 16000
- `frameDurationMs`: 30
- `speechThreshold`: 0.012
- `minSpeechDurationMs`: 200
- `silenceTimeoutMs`: 700
- `preSpeechPaddingMs`: 200
- `maxSegmentDurationMs`: 12000

Silero VAD can be added later through Sherpa-ONNX native support if needed. The expected local path can be `models/vad/silero_vad.onnx`.

Shared VAD model:

- model id: `silero_vad`
- file: `silero_vad.onnx`
- download URL: `https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx`
- used by Sherpa's simulated-streaming examples for both Parakeet and other non-streaming ASR models

## Qwen3-ASR notes

Expected model id:

`sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25`

Direct model URL used by the in-app download action:

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

The Qwen adapter checks model paths safely and returns a saved `unsupported` result when files are missing. In this implementation Qwen is not marked true streaming, because the selected Qwen path uses Sherpa-ONNX offline STT rather than an online recognizer with partial callbacks.

Qwen PCM recording feeds the VAD layer while the user is recording. Completed speech segments are queued and transcribed sequentially as soon as VAD closes each segment, then appended to the transcript. This is simulated streaming: text appears after utterance boundaries, not as partial words during the utterance.

## Parakeet notes

Engine id:

`parakeet-tdt-0.6b-v3-int8`

Sherpa-ONNX model id:

`sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8`

Direct model URL used by the in-app download action:

`https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2`

Archive type:

`tar.bz2`

Expected project asset directory:

`assets/models/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8`

Runtime document-directory fallback:

`models/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8`

Required files after extraction:

- `encoder.int8.onnx`
- `decoder.int8.onnx`
- `joiner.int8.onnx`
- `tokens.txt`

The model is the 25-European-language Parakeet TDT package. The thesis app exposes only English and Finnish, matching the current experiment language scope.

The Sherpa-ONNX model type is `nemo_transducer`, with `preferInt8: true`, two CPU threads, and CPU provider. The adapter calls `detectSttModel()` with `modelType: "nemo_transducer"` before creating the recognizer.

Parakeet is not marked true online streaming. Sherpa's simulated-streaming APKs use VAD to send completed speech segments into non-streaming/offline ASR, so this implementation uses `runtimeMode: "vad-segmented-offline"` and does not show live partial words. Missing files return a saved `unsupported` result with `Parakeet model files are missing or not configured.` rather than crashing the app.

## VAD metrics

Each run saves the same `TranscriptionResult` shape. Metrics include:

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

VAD-specific measurements:

- segment count
- speech duration
- silence duration
- time to first text
- segment processing time

Results are stored locally under the app document directory in `asr-results/results.json` and can be retrieved with `getAsrResults()`.

## Manual testing checklist

- [ ] App opens
- [ ] Vosk removed from active model selector
- [ ] Native ASR still works
- [ ] Native ASR shows partial transcript live if platform supports it
- [ ] Whisper still works
- [ ] Whisper is not falsely shown as true streaming
- [ ] Whisper can run full-recording mode
- [ ] Whisper can run VAD-segmented mode if segment transcription is implemented
- [ ] Qwen selectable
- [ ] Qwen model file check works
- [ ] Qwen fails safely if model files missing
- [ ] Qwen runtime mode is detected honestly
- [ ] Parakeet selectable when registered
- [ ] Parakeet model file check works
- [ ] Parakeet fails safely if model files are missing
- [ ] Parakeet is shown as VAD-segmented offline, not true streaming
- [ ] VAD service exists
- [ ] VAD detects speech start
- [ ] VAD detects speech end
- [ ] VAD segments are queued for ASR while recording
- [ ] VAD status appears in UI
- [ ] VAD segment count is logged
- [ ] timeToFirstTextMs is logged
- [ ] runtimeMode is saved
- [ ] segmentTranscripts are saved when using VAD
- [ ] final transcript is saved
- [ ] failed attempts save error instead of crashing
- [ ] docs updated

## Known limitations

- Native ASR partial behavior depends on the OS speech service and locale support.
- Whisper is not true streaming in this prototype.
- Qwen3-ASR currently runs through Sherpa-ONNX offline recognition over VAD segments.
- Parakeet currently runs through Sherpa-ONNX offline NeMo transducer recognition over VAD segments.
- WER/CER evaluation comes in Phase 2.
- Context extraction and form autofill come later.
