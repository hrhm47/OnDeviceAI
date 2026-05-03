import { IconSymbol } from "@/components/ui/icon-symbol";
import { FieldColors as C } from "@/constants/theme";
import { useSpeechStore } from "@/src/store/useSpeechStore";
import Constants from "expo-constants";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const modelInfo = [
  {
    name: "Native ASR",
    state: "Ready",
    description: "Device speech recognition service for quick baseline tests.",
  },
  {
    name: "Whisper tiny / base",
    state: "Available",
    description: "Bundled local models for offline English/Finnish testing.",
  },
  {
    name: "Qwen3-ASR",
    state: "Planned",
    description: "Research comparison target for later implementation.",
  },
  {
    name: "Vosk",
    state: "Optional",
    description: "Offline baseline if time allows in the thesis prototype.",
  },
];

export default function SettingsScreen() {
  const { history, activeModel } = useSpeechStore();
  const [language, setLanguage] = useState<"English" | "Finnish">("English");

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Settings and model info</Text>
          <Text style={styles.title}>Prototype controls</Text>
          <Text style={styles.subtitle}>
            Keep device readiness, exports, and thesis context visible for demo
            and evaluation sessions.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <IconSymbol size={22} name="globe" color={C.primary} />
            <Text style={styles.cardTitle}>App language</Text>
          </View>
          <View style={styles.segmentRow}>
            {(["English", "Finnish"] as const).map((item) => (
              <Pressable
                key={item}
                onPress={() => setLanguage(item)}
                style={[
                  styles.segment,
                  language === item && styles.segmentActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    language === item && styles.segmentTextActive,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <IconSymbol size={22} name="cpu" color={C.teal} />
            <Text style={styles.cardTitle}>Available ASR models</Text>
          </View>

          <View style={styles.modelList}>
            {modelInfo.map((model) => (
              <View key={model.name} style={styles.modelRow}>
                <View style={styles.modelIcon}>
                  <IconSymbol
                    size={19}
                    name={
                      model.state === "Ready" || model.state === "Available"
                        ? "checkmark.circle"
                        : "icloud.and.arrow.down"
                    }
                    color={
                      model.state === "Ready" || model.state === "Available"
                        ? C.success
                        : C.warning
                    }
                  />
                </View>
                <View style={styles.modelTextBlock}>
                  <Text style={styles.modelName}>{model.name}</Text>
                  <Text style={styles.modelDesc}>{model.description}</Text>
                </View>
                <View
                  style={[
                    styles.modelState,
                    model.state === "Planned" && styles.modelStateWarning,
                    model.state === "Optional" && styles.modelStateOptional,
                  ]}
                >
                  <Text
                    style={[
                      styles.modelStateText,
                      model.state === "Planned" && styles.modelStateTextWarning,
                      model.state === "Optional" && styles.modelStateTextOptional,
                    ]}
                  >
                    {model.state}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <IconSymbol size={22} name="iphone" color={C.primary} />
            <Text style={styles.cardTitle}>Device info</Text>
          </View>
          <InfoRow label="Platform" value={`${Platform.OS} ${Platform.Version}`} />
          <InfoRow label="Active model" value={activeModel.toUpperCase()} />
          <InfoRow label="Recorded runs" value={String(history.length)} />
          <InfoRow label="App version" value={appVersion} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <IconSymbol size={22} name="tray.and.arrow.down.fill" color={C.primary} />
            <Text style={styles.cardTitle}>Export results</Text>
          </View>
          <Text style={styles.bodyText}>
            Export CSV metrics for WER, CER, latency, model, language, and noise
            condition during baseline testing.
          </Text>
          <Pressable
            style={styles.exportButton}
            onPress={() =>
              Alert.alert(
                "Export placeholder",
                "CSV export UI is ready. File writing can be connected once the research schema is finalized.",
              )
            }
          >
            <Text style={styles.exportButtonText}>Export research results</Text>
          </Pressable>
        </View>

        <View style={styles.aboutCard}>
          <View style={styles.cardTitleRow}>
            <IconSymbol size={22} name="info.circle.fill" color={C.teal} />
            <Text style={styles.cardTitle}>About thesis prototype</Text>
          </View>
          <Text style={styles.bodyText}>
            This mobile prototype studies how privacy-first on-device AI can
            reduce reporting friction and cognitive load in digital construction
            reporting. The intended flow is voice input, local ASR, construction
            vocabulary improvement, context extraction, and editable report
            autofill preview.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    padding: 20,
    paddingBottom: 104,
    gap: 16,
  },
  header: {
    paddingTop: 8,
  },
  eyebrow: {
    color: C.teal,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: C.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: C.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    marginTop: 8,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 14,
  },
  aboutCard: {
    backgroundColor: C.tealSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#B8D8D4",
    padding: 16,
    gap: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    color: C.text,
    fontSize: 19,
    fontWeight: "900",
  },
  segmentRow: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderStrong,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  segmentActive: {
    backgroundColor: C.primary,
  },
  segmentText: {
    color: C.text,
    fontSize: 15,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  modelList: {
    gap: 12,
  },
  modelRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.neutral,
  },
  modelIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceWarm,
    borderWidth: 1,
    borderColor: C.border,
  },
  modelTextBlock: {
    flex: 1,
  },
  modelName: {
    color: C.text,
    fontSize: 15,
    fontWeight: "900",
  },
  modelDesc: {
    color: C.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    marginTop: 3,
  },
  modelState: {
    backgroundColor: C.successSoft,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  modelStateWarning: {
    backgroundColor: C.warningSoft,
  },
  modelStateOptional: {
    backgroundColor: C.surfaceAlt,
  },
  modelStateText: {
    color: C.success,
    fontSize: 12,
    fontWeight: "900",
  },
  modelStateTextWarning: {
    color: C.warning,
  },
  modelStateTextOptional: {
    color: C.textMuted,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: C.neutral,
    paddingTop: 12,
  },
  infoLabel: {
    flex: 1,
    color: C.textSubtle,
    fontSize: 14,
    fontWeight: "800",
  },
  infoValue: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  bodyText: {
    color: C.textMuted,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600",
  },
  exportButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  exportButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
