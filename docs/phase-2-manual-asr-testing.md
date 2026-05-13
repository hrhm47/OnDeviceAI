# Phase 2 Manual ASR Testing

## 1. Purpose

Phase 2 turns the prototype into a controlled manual ASR testing tool for English and Finnish construction-reporting sentences. The app is used to record the same reference test cases across quiet, moderate-noise, and hard-noise sessions, then save ASR accuracy, timing, noise/session metadata, and device-feasibility fields for thesis analysis.

This phase is manual mobile testing only. Automated FLEURS testing is intentionally out of scope and will be added later as a separate phase.

## 2. Implementation Summary

Phase 2 is implemented in the ASR Test tab:

- Test cases load from `src/features/asr/asrTesting/data/phase2_manual_asr_testing_config_en_fi.json`.
- Test sessions load from the same config first, then local saved session edits override matching session IDs.
- The user selects `Manual mobile test`, a session, a language, a test case, and an ASR model.
- The app records/transcribes through the existing Phase 1 ASR controller.
- The Phase 1 `TranscriptionResult` is converted into a Phase 2 `ManualASRTestResult`.
- The user explicitly saves the Phase 2 result row.
- CSV export joins test case + test session + ASR result.
- CSV export writes a local file and uses the platform share sheet when available.

Relevant files:

- `app/(tabs)/bench.tsx`
- `src/features/asr/services/asrEngineRegistry.ts`
- `src/features/asr/asrTesting/data/phase2_manual_asr_testing_config_en_fi.json`
- `src/features/asr/asrTesting/types/manualAsrTesting.types.ts`
- `src/features/asr/asrTesting/services/manualAsrTestingStorage.ts`
- `src/features/asr/asrTesting/utils/asrScoring.ts`
- `src/features/asr/asrTesting/utils/manualAsrResultBuilder.ts`

## 3. Test Case vs Test Session vs Test Result

These three concepts must stay separate.

Test case is sentence/reference data:

- `testCaseId`
- `language`
- `category`
- `difficulty`
- `referenceText`
- `expectedFields`

Test session is noise/environment/device setup for a group of recordings:

- `sessionId`
- `sessionName`
- `testMode`
- `noiseCondition`
- `noiseProfile`
- `testDevice`
- `noiseSource`
- `createdAt`
- `notes`

Test result is one ASR model output and metrics for one test case inside one session:

- `recognizedText`
- `wer`
- `cer`
- `recordingDurationMs`
- `speechDurationMs`
- `silenceDurationMs`
- `ttfsMs`
- `transcriptionTimeMs`
- `realTimeFactor`
- `modelId`
- `runtimeMode`
- `success`
- `errorMessage`

Keeping these concepts separate prevents the reference dataset from being polluted with session-specific measurement data.

## 4. Removed Session Fields

These fields are intentionally not required in Phase 2:

- `speakerMouthDistanceFromTestDeviceCm`
- `noiseSourceDistanceFromTestDeviceCm`
- `testDeviceOrientation`
- `measurementPosition`
- `hearingProtectionUsed`
- `physicalSetup`

Reason: these are not reliably measurable in the current mobile testing setup. Phase 2 records simpler, honest noise/session metadata instead.

## 5. Test Session Structure

Each session includes:

- `sessionId`
- `sessionName`
- `testMode`
- `noiseCondition`
- `noiseProfile.targetRangeDba.min`
- `noiseProfile.targetRangeDba.max`
- `noiseProfile.measuredLaeqDba`
- `noiseProfile.measuredMaxDba`
- `noiseProfile.measurementDurationSec`
- `noiseProfile.measurementDevice`
- `noiseProfile.soundMeterApp`
- `noiseProfile.measurementNotes`
- `testDevice.deviceName`
- `testDevice.platform`
- `testDevice.role`
- `noiseSource.type`
- `noiseSource.sourceName`
- `noiseSource.sourceUrlOrNote`
- `noiseSource.playbackDevice`
- `noiseSource.volumePercent`
- `noiseSource.playbackStartTime`
- `noiseSource.playbackEndTime`
- `noiseSource.notes`
- `createdAt`
- `notes`

`measuredLaeqDba` and `measuredMaxDba` may be `null` until the tester fills them after measuring with a sound meter app.

Default sessions:

- `S00_QUIET_UNDER_50DBA`: quiet, target 35-50 dBA, no added noise.
- `S01_MODERATE_65_75DBA`: moderate construction-like noise, target 65-75 dBA.
- `S02_HARD_80_85DBA`: hard construction-like noise, target 80-85 dBA.

The tester should keep the same noise source, playback section, playback device, and approximate volume inside a session.

## 6. Manual ASR Result Structure

Saved Phase 2 result rows include:

- `resultId`
- `testCaseId`
- `sessionId`
- `timestamp`
- `modelId`
- `modelName`
- `engineType`
- `language`
- `runtimeMode`
- `referenceText`
- `recognizedText`
- `normalizedReferenceText`
- `normalizedRecognizedText`
- `wer`
- `cer`
- `recordingDurationMs`
- `speechDurationMs`
- `silenceDurationMs`
- `ttfsMs`
- `transcriptionTimeMs`
- `realTimeFactor`
- `partialTranscriptsCount`
- `segmentCount`
- `batteryLevelStart`
- `batteryLevelEnd`
- `batteryDelta`
- `thermalStateBefore`
- `thermalStateAfter`
- `memoryWarningCount`
- `availableMemoryMbBefore`
- `availableMemoryMbAfter`
- `success`
- `errorMessage`
- `notes`

Battery, thermal, and memory fields are currently saved as `null` when unavailable. They remain in the schema to support thesis RQ4 later without blocking Phase 2 testing now.

Failed transcriptions can still be saved as rows. A failed row stores `success: false`, `errorMessage`, model/test/session IDs, timestamp, reference text, empty recognized text if no transcript is available, and `wer`/`cer` as `null`.

## 7. UI Testing Flow

1. Open the ASR Test tab.
2. Select the ASR model: Native, Whisper, Qwen, or Parakeet if available.
3. Select `Manual mobile test`.
4. Select a test session: Quiet, Moderate noise, or Hard noise.
5. Fill or edit session measurement fields:
   - measured LAeq dBA
   - measured max dBA
   - measurement notes
   - noise source URL/title
   - volume percent
6. Save session metadata.
7. Select language: English or Finnish.
8. Select a test case from the scrollable test-case list.
9. Record and transcribe.
10. Review reference text, recognized text, WER, CER, duration, TTFS, transcription time, RTF, runtime mode, and success/error state.
11. Add optional result notes.
12. Save the Phase 2 result.
13. Export CSV when enough rows have been collected.

## 8. WER/CER Calculation

Before scoring, both `referenceText` and `recognizedText` are normalized:

- lowercase
- trim
- collapse repeated whitespace
- remove basic punctuation
- preserve letters and digits so construction/location codes such as `A302` and `C4` survive normalization

WER is Levenshtein edit distance over normalized word tokens divided by the normalized reference word count.

CER is Levenshtein edit distance over normalized characters, excluding whitespace, divided by the normalized reference character count.

Scores are stored as ratios, so `0.15` means 15%. Raw and normalized texts are both saved. If scoring fails or the result is a failed transcription, `wer` and `cer` are saved as `null`.

## 9. Timing Metrics

`ttfsMs` is copied from the existing Phase 1 `timeToFirstTextMs` field.

- Native streaming: TTFS is based on first partial/final text observed by the controller.
- Offline full-recording models: TTFS may be `null` or equal to the time when final text first appeared, depending on engine behavior.
- VAD-segmented offline models: TTFS is based on first segment text when available.

`realTimeFactor` is calculated as:

```text
transcriptionTimeMs / recordingDurationMs
```

If `recordingDurationMs` is missing or zero, `realTimeFactor` is `null`.

## 10. Local Storage

Phase 2 storage is separate from Phase 1 storage.

Phase 1 ASR results continue to use:

```text
<documentDirectory>/asr-results/results.json
```

Phase 2 manual testing uses:

```text
<documentDirectory>/phase2-manual-asr-testing/test-sessions.json
<documentDirectory>/phase2-manual-asr-testing/manual-asr-results.json
<documentDirectory>/phase2-manual-asr-testing/manual-asr-results-export.csv
```

Implementation methods:

- `getManualTestCases()`
- `getTestSessions()`
- `saveTestSession(session)`
- `getManualASRTestResults()`
- `saveManualASRTestResult(result)`
- `exportManualASRResultsCsv()`

## 11. CSV Export

CSV export joins:

- test case fields
- test session noise fields
- ASR result accuracy/timing/device fields

The export file is written to:

```text
<documentDirectory>/phase2-manual-asr-testing/manual-asr-results-export.csv
```

The app also attempts to open the platform share sheet through `expo-sharing` when sharing is available.

CSV fields are exported in this exact order:

```text
resultId
timestamp
testCaseId
sessionId
noiseCondition
measuredLaeqDba
measuredMaxDba
noiseSourceType
noiseSourceName
volumePercent
modelId
modelName
engineType
language
runtimeMode
category
difficulty
referenceText
recognizedText
normalizedReferenceText
normalizedRecognizedText
wer
cer
recordingDurationMs
speechDurationMs
silenceDurationMs
ttfsMs
transcriptionTimeMs
realTimeFactor
partialTranscriptsCount
segmentCount
batteryLevelStart
batteryLevelEnd
batteryDelta
thermalStateBefore
thermalStateAfter
memoryWarningCount
availableMemoryMbBefore
availableMemoryMbAfter
success
errorMessage
notes
```

## 12. Known Limitations

- Sound meter values are approximate because they rely on a mobile sound meter app and should be treated as session context, not laboratory-grade acoustics.
- Battery, thermal, and exact memory values are currently `null`; memory warnings, failures, and thermal state can still be added later as device-feasibility indicators.
- Offline model TTFS is less directly comparable to true streaming TTFS.
- Qwen and Parakeet depend on local model files and may appear unavailable until those files are downloaded/configured.
- The app still saves a Phase 1 `TranscriptionResult` automatically through the existing controller; Phase 2 result saving is a separate explicit action.
- CSV export can create an empty CSV with only headers if no Phase 2 results have been saved yet.

## 13. Manual Testing Checklist

Implementation checklist:

- [x] Manual test cases load from JSON
- [x] English test cases are visible
- [x] Finnish test cases are visible
- [x] Test sessions are visible
- [x] User can edit measuredLaeqDba
- [x] User can edit measuredMaxDba
- [x] User can select test case
- [x] Test case list is scrollable
- [x] User can select model
- [x] Result includes referenceText
- [x] Result includes recognizedText
- [x] Normalized reference text is saved
- [x] Normalized recognized text is saved
- [x] WER is calculated
- [x] CER is calculated
- [x] ttfsMs is saved
- [x] transcriptionTimeMs is saved
- [x] realTimeFactor is calculated
- [x] battery fields are saved or null
- [x] thermal fields are saved or null
- [x] memory fields are saved or null
- [x] failed result saves errorMessage
- [x] CSV export writes joined result/session/test-case fields
- [x] CSV includes noise/session fields
- [x] CSV includes model/result fields
- [x] docs updated

On-device validation checklist:

- [ ] App records and transcribes on the target phone
- [ ] Quiet session works end to end
- [ ] Moderate noise session works end to end
- [ ] Hard noise session works end to end
- [ ] CSV share/export has been opened on the target phone
- [ ] At least one failed transcription row has been intentionally saved and inspected
