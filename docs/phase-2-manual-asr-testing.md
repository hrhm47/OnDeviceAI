# Phase 2 Manual ASR Testing

## 1. Purpose

Phase 2 turns the prototype into a controlled manual ASR testing tool for English and Finnish construction-reporting sentences. The goal is to record the same reference test cases under repeatable quiet, moderate-noise, and hard-noise conditions, then save ASR accuracy and timing results for thesis analysis.

This phase does not implement automated FLEURS testing.

## 2. Test Case vs Test Session vs Test Result

Test case is the sentence/reference data:
- `testCaseId`
- `language`
- `category`
- `difficulty`
- `referenceText`
- `expectedFields`

Test session is the noise/environment/device setup for a group of recordings:
- `sessionId`
- `noiseCondition`
- `noiseProfile`
- `testDevice`
- `noiseSource`

Test result is one ASR model output and metrics for one test case inside one session:
- `recognizedText`
- `wer`
- `cer`
- `recordingDurationMs`
- `ttfsMs`
- `transcriptionTimeMs`
- `modelId`
- `runtimeMode`
- `success`
- `errorMessage`

Keeping these concepts separate prevents the reference dataset from being polluted with session-specific measurement data.

## 3. Removed Session Fields

These fields are intentionally not required in Phase 2:
- `speakerMouthDistanceFromTestDeviceCm`
- `noiseSourceDistanceFromTestDeviceCm`
- `testDeviceOrientation`
- `measurementPosition`
- `hearingProtectionUsed`
- `physicalSetup`

Reason: they are not reliably measurable in the current mobile testing setup. Phase 2 records simpler, honest noise/session metadata instead.

## 4. Test Session Structure

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

## 5. Manual ASR Result Structure

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

Battery, thermal, and memory fields are optional and may remain `null` when React Native or the platform cannot collect them reliably.

## 6. Noise Conditions

Default sessions:
- `S00_QUIET_UNDER_50DBA`: quiet, target 35-50 dBA, no added noise.
- `S01_MODERATE_65_75DBA`: moderate construction-like noise, target 65-75 dBA.
- `S02_HARD_80_85DBA`: hard construction-like noise, target 80-85 dBA.

The tester should keep the same noise source, playback section, and approximate volume inside a session.

## 7. WER/CER Calculation

Before scoring, both `referenceText` and `recognizedText` are normalized:
- lowercase
- trim
- collapse repeated whitespace
- remove basic punctuation
- preserve letters and digits so construction/location codes such as `A302` and `C4` survive normalization

WER is Levenshtein edit distance over normalized word tokens divided by the normalized reference word count.

CER is Levenshtein edit distance over normalized characters, excluding whitespace, divided by the normalized reference character count.

Scores are stored as ratios, so `0.15` means 15%. Raw and normalized texts are both saved.

## 8. CSV Export Fields

The CSV export joins test case, test session, and ASR result fields in this exact order:

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

## 9. Known Limitations

- Sound meter values are approximate because they rely on a mobile sound meter app and should be treated as session context, not laboratory-grade acoustics.
- Battery, thermal, and exact memory values may be `null`; memory warnings, failures, and thermal state can still support device-feasibility analysis.
- Offline models may have `ttfsMs` equal to the final transcription time or `null`; the implementation stores existing `timeToFirstTextMs` consistently as `ttfsMs`.
- Failed transcriptions can still be saved as Phase 2 rows with `success: false`, an `errorMessage`, empty `recognizedText`, and null WER/CER.

## 10. Manual Testing Checklist

[ ] Manual test cases load from JSON
[ ] English test cases are visible
[ ] Finnish test cases are visible
[ ] Test sessions are visible
[ ] Quiet session works
[ ] Moderate noise session works
[ ] Hard noise session works
[ ] User can edit measuredLaeqDba
[ ] User can edit measuredMaxDba
[ ] User can select test case
[ ] User can select model
[ ] App records and transcribes
[ ] Result includes referenceText
[ ] Result includes recognizedText
[ ] Normalized reference text is saved
[ ] Normalized recognized text is saved
[ ] WER is calculated
[ ] CER is calculated
[ ] ttfsMs is saved
[ ] transcriptionTimeMs is saved
[ ] realTimeFactor is calculated
[ ] battery fields are saved or null
[ ] thermal fields are saved or null
[ ] memory fields are saved or null
[ ] failed result saves errorMessage
[ ] CSV export works
[ ] CSV includes noise/session fields
[ ] CSV includes model/result fields
[ ] docs updated
