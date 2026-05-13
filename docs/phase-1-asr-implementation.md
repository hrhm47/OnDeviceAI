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

| Engine       | Language | Expected runtime mode                    | Role                          |
| ------------ | -------- | ---------------------------------------- | ----------------------------- |
| Native ASR   | EN/FI    | true-streaming if partial callbacks work | real-time baseline            |
| Whisper base | EN/FI    | offline-full-recording                   | multilingual offline baseline |
| Qwen3-ASR    | EN/FI    | vad-segmented-offline                    | advanced on-device candidate  |

## Implemented engines

| Engine       | Status                       | Runtime mode in this implementation                      | Notes                                                                                                                                                                       |
| ------------ | ---------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native ASR   | Working/platform-limited     | `true-streaming` when interim callbacks produce partials | Uses `expo-speech-recognition` as the live baseline.                                                                                                                        |
| Whisper base | Working                      | `offline-full-recording`                                 | Uses bundled multilingual `whisper.rn` base model. On iOS the recorder is configured for mono 16 kHz linear PCM WAV to avoid passing compressed recorder output to Whisper. |
| Qwen3-ASR    | Ready when model files exist | `vad-segmented-offline`; `unsupported` when missing      | Uses `react-native-sherpa-onnx` offline STT over VAD speech segments.                                                                                                       |

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
- used by Sherpa's simulated-streaming examples for non-streaming Sherpa ASR models

## Whisper notes

Active model:

`ggml-base.bin`

Whisper base is multilingual and is the only active Whisper model for the thesis app. The app supports English and Finnish through this model.

Whisper has a 30-second processing window internally, but that does not make the current app path true live partial-token streaming. Whisper is kept on the safer full-recording path: the app records once, stops, then calls `whisper.rn` once. The previous VAD-segment experiment was removed because running native PCM streaming and Whisper transcription together was unstable on iOS.

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
- [ ] Whisper base still works
- [ ] Whisper is not falsely shown as true streaming
- [ ] Whisper can run full-recording mode
- [ ] Whisper can run full-recording mode without crashing
- [ ] Qwen selectable
- [ ] Qwen model file check works
- [ ] Qwen fails safely if model files missing
- [ ] Qwen runtime mode is detected honestly
- [ ] Parakeet is not shown in the active selector
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
- Whisper is not true partial-token streaming in this prototype; it transcribes after recording stops.
- Qwen3-ASR currently runs through Sherpa-ONNX offline recognition over VAD segments.
- WER/CER evaluation comes in Phase 2.
- Context extraction and form autofill come later.
