import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  setTranscriptionDataFunc,
  useSpeechStore,
} from "@/src/store/useSpeechStore";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { whisperAvailableModels } from "@/constants/constant";
import { useWhisperEngine } from "@/hooks/useWhisperEngine";
import { NativeEngine } from "@/src/engine/NativeEngine";
import { ASREngine, ASRResult } from "@/src/engine/types";

export default function RecordScreen() {
  const {
    isRecording,
    setRecording,
    activeModel,
    setActiveModel,
    // whisperModel,
    whisperActiveModel,
    setwhisperActiveModel,
    liveTranscript,
    startBenchmarkingTimer,
    registerFirstSymbol,
    setLiveTranscript,
    finalTranscript,
    setFinalTranscript,
    finalizeMetrics,
  } = useSpeechStore();

  const {
    init: whisperInitialize,
    start: whisperStart,
    stop: whisperStop,
  } = useWhisperEngine();

  const activeEngine = useRef<ASREngine | null>(null);
  const [isEngineLoading, setEngineLoading] = useState(false);
  const [showModelOptions, setShowModelOptions] = useState(true);

  useEffect(() => {
    const destroyEngine = async () => {
      if (activeEngine.current) {
        await activeEngine.current.destroy();
        activeEngine.current = null;
      }
    };

    return () => {
      destroyEngine().catch(console.error);
    };
  }, [activeModel, whisperActiveModel]);

  const createEngine = async (): Promise<ASREngine | null> => {
    if (activeModel === "native") {
      return new NativeEngine();
    }

    if (activeModel === "whisper") {
      whisperInitialize(whisperActiveModel); // Placeholder since whisperStart is handled separately in the recording logic
    }

    return null;
  };

  const handleRecordPress = async () => {
    // if (isEngineLoading) {
    //   activeEngine.current
    //     ?.init()
    //     .then(() => {
    //       setEngineLoading(false);
    //       Alert.alert(
    //         "Engine Loaded",
    //         `${activeModel.toUpperCase()} is ready to use.`,
    //       );
    //     })
    //     .catch((err) => {
    //       setEngineLoading(false);
    //       Alert.alert(
    //         "Engine Load Failed",
    //         (err as Error).message ||
    //           `Failed to load ${activeModel.toUpperCase()}.`,
    //       );
    //     });
    //   return;
    // }

    // if (isRecording) {
    //   if (activeEngine.current) await activeEngine.current.stop();
    //   setRecording(false);
    //   // Wait a tiny bit for the final engine callback to update the store's transcripts
    //   setTimeout(() => {
    //     finalizeMetrics();
    //   }, 300);
    // } else {
    // try {
    //   if (!activeEngine.current) {
    //     setEngineLoading(true);
    //     const engine = await createEngine();

    // if (!engine) {
    //   Alert.alert(
    //     "Model Not Supported",
    //     `${activeModel.toUpperCase()} is not hooked up yet.`,
    //   );
    //   return;
    // }

    // await engine.init();
    // activeEngine.current = engine;
    //   }
    // } catch (err) {
    //   Alert.alert(
    //     "Engine Not Loaded",
    //     (err as Error).message ||
    //       `Failed to initialize ${activeModel.toUpperCase()}.`,
    //   );
    //   return;
    // } finally {
    //   setEngineLoading(false);
    // }

    if (isRecording) {
      if (activeModel === "whisper") {
        await whisperStop();
      } else {
        await activeEngine.current?.stop();
      }
      setRecording(false);
      // Wait a tiny bit for the final engine callback to update the store's transcripts
      setTimeout(() => {
        // finalizeMetrics();
      }, 300);
      return;
    }

    startBenchmarkingTimer();
    setRecording(true);

    if (!activeEngine.current) {
      setEngineLoading(true);
      // iniaialize whisper model if whisper is selected, otherwise create the engine as usual
      await createEngine()
        .then(() => {
          setEngineLoading(false);
          Alert.alert(
            "Engine Loaded",
            `${activeModel.toUpperCase()} is ready to use.`,
          );
        })
        .catch((err) => {
          setEngineLoading(false);
          Alert.alert(
            "Engine Load Failed",
            (err as Error).message ||
              `Failed to load ${activeModel.toUpperCase()}.`,
          );
        });

      // if (!engine) {
      //   Alert.alert(
      //     "Model Not Supported",
      //     `${activeModel.toUpperCase()} is not hooked up yet.`,
      //   );
      //   return;
      // }

      // await engine.init();
      // activeEngine.current = engine;
    }

    await whisperStart(
      (result: ASRResult) => {
        registerFirstSymbol();
        setTranscriptionDataFunc(result.text);
        setLiveTranscript(result?.text);
        if (result.isFinal) {
          setFinalTranscript((prev: string) => prev + result.text);
        }
      },
      (err: Error) => {
        Alert.alert("ASR Error", err.message);
        setRecording(false);
      },
    );
    // }
  };

  const cycleWhisperModel = (modelId: string) => {
    console.log("Selected Whisper Model ID:", modelId);
    const selectedModel: any = whisperAvailableModels.find(
      (m) => m.id === modelId,
    );
    setwhisperActiveModel(selectedModel?.title);
    setShowModelOptions(false);

    // const models = [
    //   "tiny.en",
    //   "tiny",
    //   // "base.en",
    //   // "base",
    // ];
    // const currentIndex = models.indexOf(whisperModel);
    // const nextIndex = (currentIndex + 1) % models.length;
    // setWhisperModel(models);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.modelSelector}
          onPress={() => [
            setActiveModel(activeModel === "native" ? "whisper" : "native"),
            setShowModelOptions(true),
          ]}
        >
          <Text style={styles.modelTag}>{activeModel.toUpperCase()}</Text>
          <IconSymbol size={18} name="chevron.down" color="#9CA3AF" />
        </Pressable>

        {activeModel === "whisper" && (
          <View>
            {showModelOptions
              ? whisperAvailableModels.map((model: any) => (
                  <Pressable
                    style={[
                      styles.modelSelector,
                      {
                        backgroundColor: "#E0F2FE",
                        borderColor: "rgba(56,189,248,0.3)",
                      },
                    ]}
                    onPress={() => cycleWhisperModel(model.id)}
                  >
                    <Text style={[styles.modelTag, { color: "#0284C7" }]}>
                      {model.title.toUpperCase()}
                    </Text>
                    <IconSymbol size={16} name="globe" color="#0284C7" />
                  </Pressable>
                ))
              : null}
          </View>
          // <Pressable
          //   style={[
          //     styles.modelSelector,
          //     {
          //       backgroundColor: "#E0F2FE",
          //       borderColor: "rgba(56,189,248,0.3)",
          //     },
          //   ]}
          //   onPress={cycleWhisperModel}
          // >
          //   <Text style={[styles.modelTag, { color: "#0284C7" }]}>
          //     {whisperModel[0].toUpperCase()}
          //   </Text>
          //   <IconSymbol size={16} name="globe" color="#0284C7" />
          // </Pressable>
          // {/* )} */}
        )}
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.main}>
        {/* Record Button Container */}
        <View style={styles.recordContainer}>
          <Pressable
            onPress={handleRecordPress}
            style={({ pressed }) => [
              styles.micButton,
              isRecording && styles.micButtonActive,
              pressed && styles.micButtonPressed,
            ]}
          >
            <IconSymbol
              size={64}
              name={isRecording ? "stop.fill" : "mic.fill"}
              color={isRecording ? "#ef4444" : "#c2c2c2ff"}
            />
          </Pressable>
          <Text style={styles.statusText}>
            {isEngineLoading
              ? "LOADING ENGINE..."
              : isRecording
                ? "LISTENING..."
                : "READY TO LISTEN"}
          </Text>
        </View>

        {/* Live Feed Container */}
        <View style={styles.liveFeedContainer}>
          <View style={styles.feedHeader}>
            <View style={styles.feedHeaderLeft}>
              <View
                style={[
                  styles.statusDot,
                  isRecording && styles.statusDotActive,
                ]}
              />
              <Text style={styles.feedTitle}>LIVE FEED</Text>
            </View>
            <Text style={styles.feedCodec}>UTF-8</Text>
          </View>

          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptText}>
              {liveTranscript || "Press record to start speaking..."}
              {/* {finalTranscript || "Press record to start speaking..."} */}
              {isRecording && <View style={styles.cursor} />}
            </Text>
          </View>
        </View>

        {/* KPI Mini Dashboard */}
        {/* <View style={styles.kpiContainer}>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCol}>
              <View style={styles.kpiHeader}>
                <IconSymbol size={14} name="checkmark.circle" color="#13ec80" />
                <Text style={styles.kpiLabel}>ACCURACY</Text>
              </View>
              <Text style={styles.kpiValue}>
                {metrics.werDetails
                  ? Math.max(0, 100 - metrics.werDetails.wer).toFixed(1)
                  : "--"}
                <Text style={styles.kpiUnit}>%</Text>
              </Text>
              <Text style={styles.kpiDescription}>
                Levenshtein Word Accuracy vs GT
              </Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiCol}>
              <View style={styles.kpiHeader}>
                <IconSymbol size={14} name="stopwatch" color="#9CA3AF" />
                <Text style={styles.kpiLabel}>TTFS</Text>
              </View>
              <Text style={styles.kpiValue}>
                {metrics.ttfsMs ? Math.round(metrics.ttfsMs) : "--"}
                <Text style={styles.kpiUnit}>ms</Text>
              </Text>
              <Text style={styles.kpiDescription}>
                Time To First Symbol recognized
              </Text>
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiCol}>
              <View style={styles.kpiHeader}>
                <IconSymbol size={14} name="cpu" color="#9CA3AF" />
                <Text style={styles.kpiLabel}>PROCESSING</Text>
              </View>
              <Text style={styles.kpiValue}>
                {metrics.processingTimeMs
                  ? (metrics.processingTimeMs / 1000).toFixed(2)
                  : "--"}
                <Text style={styles.kpiUnit}>s</Text>
              </Text>
              <Text style={styles.kpiDescription}>Total execution time</Text>
            </View>
          </View>
        </View> */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modelSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  modelTag: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.5,
    color: "#374151",
  },
  main: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  recordContainer: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  micButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#6a6a6aff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#13ec80",
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  micButtonActive: {
    shadowOpacity: 0.3,
    borderColor: "rgba(19,236,128,0.3)",
    backgroundColor: "#FFFFFF",
  },
  micButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  statusText: {
    marginTop: 24,
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 3,
    color: "#000000ff",
  },
  liveFeedContainer: {
    width: "100%",
    minHeight: 200,
    marginBottom: 24,
  },
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  feedHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },
  statusDotActive: {
    backgroundColor: "#13ec80",
  },
  feedTitle: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.5,
    color: "#9CA3AF",
  },
  feedCodec: {
    fontSize: 10,
    fontFamily: "Courier",
    color: "#D1D5DB",
  },
  transcriptBox: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  transcriptText: {
    fontSize: 20,
    lineHeight: 32,
    color: "#111827",
    fontFamily: "System",
    fontWeight: "500",
  },
  cursor: {
    width: 6,
    height: 24,
    backgroundColor: "#13ec80",
    marginLeft: 4,
  },
  kpiContainer: {
    width: "100%",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  kpiCol: {
    flex: 1,
    gap: 4,
  },
  kpiDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.1)",
    marginHorizontal: 16,
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  kpiLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#6B7280",
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    letterSpacing: -0.5,
  },
  kpiUnit: {
    color: "#13ec80",
    fontSize: 16,
  },
  kpiDescription: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 4,
    lineHeight: 12,
  },
});
