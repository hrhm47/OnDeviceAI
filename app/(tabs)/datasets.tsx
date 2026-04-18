import { IconSymbol } from "@/components/ui/icon-symbol";
import { ASREngine, ASRResult } from "@/src/engine/types";
import { useSpeechStore } from "@/src/store/useSpeechStore";
import * as DocumentPicker from "expo-document-picker";
import React from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function DatasetsScreen() {
  const {
    history,
    activeModel,
    whisperModel,
    groundTruthText,
    setGroundTruthText,
    startBenchmarkingTimer,
    registerFirstSymbol,
    setLiveTranscript,
    setFinalTranscript,
    finalizeMetrics,
  } = useSpeechStore();

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileUri = result.assets[0].uri;

      let engine: ASREngine;
      if (activeModel === "native") {
        const { NativeEngine } = await import("@/src/engine/NativeEngine");
        engine = new NativeEngine();
      } else if (activeModel === "whisper") {
        const { WhisperEngine } = await import("@/src/engine/WhisperEngine");
        engine = new WhisperEngine(whisperModel);
      } else {
        Alert.alert(
          "Model Not Supported",
          `Offline processing is not hooked up for ${activeModel} engine currently.`,
        );
        return;
      }

      Alert.alert(
        "Processing",
        `Benchmarking audio file with ${activeModel.toUpperCase()}...`,
      );

      await engine.init();

      startBenchmarkingTimer();

      await engine.start(
        (res: ASRResult) => {
          registerFirstSymbol();
          setLiveTranscript(res.text);
          if (res.isFinal) {
            setFinalTranscript(res.text);
            finalizeMetrics(res.text);
            engine.destroy();
            Alert.alert(
              "Success",
              "Benchmark complete! View results in History tab.",
            );
          }
        },
        (err: Error) => {
          Alert.alert("ASR Error", err.message);
          engine.destroy();
        },
        fileUri,
      );
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    }
  };

  const handleExport = async () => {
    try {
      const RNFS = await import("react-native-fs");
      const path = RNFS.DocumentDirectoryPath + "/asr_benchmark_results.csv";
      let csv =
        "timestamp,model,wer,substitutions,deletions,insertions,ttfsMs,processingTimeMs\n";
      history.forEach((item) => {
        csv += `${item.timestamp},${item.model},${item.werDetails.wer.toFixed(2)},${item.werDetails.substitutions},${item.werDetails.deletions},${item.werDetails.insertions},${item.ttfsMs || ""},${item.processingTimeMs || ""}\n`;
      });
      await RNFS.writeFile(path, csv, "utf8");
      Alert.alert("Exported", `Results saved to ${path}`);
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>MANAGER V2.4</Text>
          <Text style={styles.title}>Acoustic Datasets</Text>
        </View>
        <Pressable style={styles.settingsBtn}>
          <IconSymbol size={20} name="gearshape.fill" color="#fff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.main}>
        {/* Action Buttons Grid */}
        <View style={styles.actionGrid}>
          <Pressable style={styles.btnGreen} onPress={handleUpload}>
            <View style={styles.iconBoxWhite}>
              <IconSymbol size={28} name="arrow.up.doc" color="#fff" />
            </View>
            <View>
              <Text style={styles.btnGreenText}>Upload{"\n"}Audio</Text>
              <Text style={styles.btnGreenSub}>.WAV / 44.1KHZ</Text>
            </View>
          </Pressable>

          <Pressable style={styles.btnWhite} onPress={handleExport}>
            <View style={styles.iconBoxDark}>
              <IconSymbol size={28} name="arrow.down.doc" color="#000" />
            </View>
            <View>
              <Text style={styles.btnWhiteText}>Download{"\n"}Results</Text>
              <Text style={styles.btnWhiteSub}>.CSV / METRICS</Text>
            </View>
          </Pressable>
        </View>

        {/* Ground Truth Config */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.dot, { backgroundColor: "#13ec80" }]} />
              <Text style={styles.sectionTitle}>GROUND TRUTH STRING</Text>
            </View>
          </View>
          <TextInput
            style={styles.gtInput}
            value={groundTruthText}
            onChangeText={setGroundTruthText}
            multiline
            placeholder="Enter the expected transcription here..."
            placeholderTextColor="rgba(0,0,0,0.3)"
          />
        </View>

        {/* Dataset List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.dot, { backgroundColor: "#13ec80" }]} />
              <Text style={styles.sectionTitle}>ACTIVE SITES</Text>
            </View>
            <Text style={styles.itemCount}>02 ITEMS</Text>
          </View>

          <View style={styles.fileCard}>
            <View style={styles.fileIconBox}>
              <IconSymbol size={24} name="hammer.fill" color="#000" />
            </View>
            <View style={styles.fileDetails}>
              <View style={styles.fileNameRow}>
                <Text style={styles.fileName}>Construction Noise</Text>
                <Text style={styles.fileId}>#001</Text>
              </View>
              <View style={styles.fileStats}>
                <IconSymbol size={12} name="timer" color="rgba(0,0,0,0.4)" />
                <Text style={styles.statTextLight}>12:45</Text>
                <Text
                  style={[
                    styles.tag,
                    {
                      color: "#13ec80",
                      backgroundColor: "rgba(19, 236, 128, 0.1)",
                    },
                  ]}
                >
                  85dB
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff", // This screen is light modeled in proto
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#13ec80",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000",
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  main: {
    padding: 20,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 40,
  },
  btnGreen: {
    flex: 1,
    backgroundColor: "#22c55e",
    borderRadius: 24,
    padding: 20,
    aspectRatio: 1,
    justifyContent: "space-between",
  },
  btnWhite: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 24,
    padding: 20,
    aspectRatio: 1,
    justifyContent: "space-between",
  },
  iconBoxWhite: {
    width: 48,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxDark: {
    width: 48,
    height: 48,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGreenText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  btnGreenSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontFamily: "Courier",
    marginTop: 4,
  },
  btnWhiteText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  btnWhiteSub: {
    color: "rgba(0,0,0,0.4)",
    fontSize: 10,
    fontFamily: "Courier",
    marginTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
    color: "rgba(0,0,0,0.5)",
  },
  itemCount: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "Courier",
    backgroundColor: "#f1f1f1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: "rgba(0,0,0,0.6)",
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fileIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  fileDetails: {
    flex: 1,
  },
  fileNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fileName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  fileId: {
    fontSize: 10,
    fontFamily: "Courier",
    color: "rgba(0,0,0,0.4)",
  },
  fileStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  statTextLight: {
    fontSize: 11,
    color: "rgba(0,0,0,0.5)",
    fontWeight: "500",
    marginRight: 8,
  },
  tag: {
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gtInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: "#000",
    minHeight: 100,
    textAlignVertical: "top",
  },
});
