# Phase 1 — ASR Implementation Foundation

## Purpose

Phase 1 builds the modular ASR foundation for baseline testing. The prototype records speech, runs the selected ASR engine, captures timing metrics, returns one standardized `TranscriptionResult`, and saves each attempt locally for later comparison.

This phase intentionally does not implement construction vocabulary correction, context extraction, LLM field mapping, or report autofill.

## Thesis alignment

This phase supports:

- RQ2: converting voice input into machine-readable text for later structured form mapping.
- RQ4: measuring latency, accuracy-related feasibility, and mobile deployment constraints.

## Implemented engines

| Engine | Status | Language support | Role | Notes |
|---|---|---|---|---|
| Native ASR | Working/Partial | EN/FI depending OS | System baseline | Uses `expo-speech-recognition`; OS speech service decides actual locale availability. |
| Whisper | Working/Partial | EN/FI | Offline/multilingual baseline | Uses bundled `whisper.rn` model files; `.en` models are English-only. |
| Qwen3-ASR | Partial/Not ready until model files exist | EN/FI | Advanced multilingual candidate | Uses `react-native-sherpa-onnx` offline STT with `qwen3_asr` model detection. |
| Vosk | Partial/Not ready until binding and model files exist | EN only | Lightweight offline baseline | Configured for `vosk-model-small-en-us-0.15`; Finnish is intentionally unsupported. |

## Qwen3-ASR notes

Expected Sherpa download model id:

`sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25`

Direct model URL used by the in-app download action:

`https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25.tar.bz2`

The ASR Test screen has a `Download Qwen3-ASR` button. It first tries Sherpa-ONNX `ensureModelByCategory()` and falls back to the direct GitHub release URL above. After download it extracts the `.tar.bz2` package into the app document directory.

The Qwen adapter checks both the Sherpa-ONNX managed install directory and nested archive layouts such as `<model-id>/<model-id>`. This keeps the app compatible with the Sherpa downloader while avoiding hardcoded absolute device paths.

Expected project asset directory if bundling manually:

`assets/models/qwen/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25`

Runtime document-directory fallback:

`models/qwen/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25`

Required files are detected by Sherpa-ONNX. For Qwen3-ASR this means ONNX files whose names include `conv_frontend`, `encoder`, and `decoder`, plus a tokenizer directory containing `tokenizer_config.json`, `vocab.json`, and `merges.txt`.

The official package contains:

- `conv_frontend.onnx`
- `encoder.int8.onnx`
- `decoder.int8.onnx`
- `tokenizer/`

Optional VAD model for future microphone/VAD streaming:

`https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx`

Audio URI conversion is currently implemented through `react-native-sherpa-onnx/audio` with `convertAudioToWav16k`. The adapter converts Expo `.m4a` recordings to 16 kHz WAV before calling `transcribeFile`.

If the model is missing or invalid, Qwen returns:

`Qwen3-ASR model files are missing or not configured.`

To make Qwen ready, download the model with the Sherpa-ONNX download manager or bundle the extracted model directory at the path above.

## Vosk model decision

Selected model:

`vosk-model-small-en-us-0.15`

Direct download URL exposed in the app:

`https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip`

Official model list:

`https://alphacephei.com/vosk/models`

- Language: English
- Size: 40 MB
- License: Apache 2.0
- Role: lightweight offline ASR baseline
- Limitation: not used for Finnish
- Official WER values: 9.85 on LibriSpeech test-clean and 10.38 on TED-LIUM

Expected project asset directory:

`assets/models/vosk/vosk-model-small-en-us-0.15`

Runtime document-directory fallback:

`models/vosk/vosk-model-small-en-us-0.15`

Expected extracted folder shape:

```text
models/vosk/vosk-model-small-en-us-0.15/
  am/
  conf/
  graph/
  ivector/
```

Required files checked by the adapter:

- `am/final.mdl`
- `conf/model.conf`
- `conf/mfcc.conf`
- `graph/HCLr.fst`
- `graph/Gr.fst`

The ASR Test screen has a `Download Vosk model` button. It downloads the official ZIP inside the app and extracts it to the document-directory model folder when `react-native-zip-archive` is available in the native build. If the JavaScript package was installed after the current dev app was built, rebuild the native app so `RNZipArchive` is present at runtime.

Vosk also needs a React Native native binding such as `react-native-vosk` before it can transcribe audio. If ZIP extraction support or the Vosk binding is missing, the app reports a setup error instead of crashing.

Optional later model:

`vosk-model-en-us-0.22-lgraph` (128 MB), for a better English baseline.

Avoid now:

`vosk-model-en-us-0.22` (1.8 GB), because it is too heavy for mobile Phase 1.

If Finnish is selected with Vosk, it returns:

`Vosk Finnish is not supported in this prototype. Vosk is configured as an English-only baseline.`

If model files are missing, it returns:

`Vosk model files are missing or not configured.`

## Saved metrics

Each saved result includes:

- `id`
- `timestamp`
- `modelId`
- `modelName`
- `engineType`
- `language`
- `transcript`
- `partialTranscripts`
- `recordingDurationMs`
- `transcriptionTimeMs`
- `timeToFirstTextMs`
- `audioUri`
- `sampleRate`
- `deviceInfo`
- `error`

Results are stored locally under the app document directory in `asr-results/results.json` and can be retrieved with `getAsrResults()`.

## How to test manually

1. Run `npm run start`.
2. Open the `ASR Test` tab.
3. Select `Native ASR`, select English or Finnish, record speech, and stop to transcribe.
4. Select `Whisper`, choose a model file, record speech, and stop to transcribe. Use `tiny` or `base` for Finnish.
5. Select `Qwen3-ASR` and tap `Download Qwen3-ASR`. After the download/extraction reaches 100%, the download section disappears; record speech and stop to transcribe.
6. If Qwen model download is skipped or fails, record once and confirm the clean missing-model error is shown and saved.
7. Select `Vosk` with English and tap `Download Vosk model`. After the download/extraction reaches 100%, the download section disappears; record speech and stop to transcribe if a compatible Vosk native binding is installed. If model files, ZIP extraction support, or the native binding are missing, confirm the clean error is shown and saved.
8. Select `Vosk` with Finnish and confirm the unsupported-language error is shown and saved.
9. Open `Results` and confirm saved ASR attempts can be retrieved.

## Known limitations

- Qwen requires model files before running.
- Qwen audio conversion depends on the Sherpa-ONNX native audio conversion helpers.
- Vosk is English-only.
- Vosk still needs a native Vosk binding package before it can transcribe.
- Vosk in-app ZIP extraction requires `react-native-zip-archive` in the native build; installing the package without rebuilding the dev app is not enough.
- WER/CER evaluation comes in Phase 2.
- Context extraction and form autofill come later.

## Phase 1 completion definition

Phase 1 is complete when:

- Native and Whisper are runnable or preserved.
- Qwen and Vosk are implemented or safely scaffolded.
- All engines are selectable.
- All results use the same `TranscriptionResult` format.
- The app does not crash on unavailable models.
- Results can be saved locally.
