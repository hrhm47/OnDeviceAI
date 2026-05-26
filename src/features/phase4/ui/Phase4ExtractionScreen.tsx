import { IconSymbol } from "@/components/ui/icon-symbol";
import { FieldColors as C } from "@/constants/theme";
import { runPhase4ManualChecks } from "@/src/features/phase4/checks/phase4CheckRunner";
import {
  extractGeneralTaskFormDraft,
  type Phase4ExtractionResult,
} from "@/src/features/phase4/draft/phase4TaskDraftBuilder";
import {
  downloadPhase4LocalLLMModel,
  getPhase4LocalLLMReadiness,
  phase4LocalLLMProvider,
} from "@/src/features/phase4/llm/phase4LocalLLMProvider";
import { phase4MockLLMProvider } from "@/src/features/phase4/llm/phase4MockLLMProvider";
import { PHASE4_SELECTED_LLM_MODEL } from "@/src/features/phase4/llm/phase4ModelConfig";
import {
  exportPhase4ExtractionResultsCsv,
  savePhase4ExtractionResult,
} from "@/src/features/phase4/storage/phase4ExtractionStorage";
import type { Phase4Language } from "@/src/features/phase4/types/phase4.types";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProviderChoice = "mock" | "local";

export default function Phase4ExtractionScreen() {
  const [transcript, setTranscript] = useState(
    "There is a pipe leak in the bathroom. It needs to be fixed today. Mark it as quality.",
  );
  const [language, setLanguage] = useState<Phase4Language>("en");
  const [providerChoice, setProviderChoice] = useState<ProviderChoice>("mock");
  const [result, setResult] = useState<Phase4ExtractionResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rawVisible, setRawVisible] = useState(false);
  const [checkSummary, setCheckSummary] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const runExtraction = async () => {
    console.log("Running extraction with input:", {
      transcript,
      language,
      provider: providerChoice,
    });
    setMessage("Running Phase 4 extraction...");
    const provider =
      providerChoice === "local"
        ? phase4LocalLLMProvider
        : phase4MockLLMProvider;
    const nextResult = await extractGeneralTaskFormDraft({
      transcript,
      language,
      provider,
    });

    console.log("Extraction result:", nextResult);
    setResult(nextResult);
    setMessage(
      nextResult.errorMessage
        ? `Extraction completed with warning: ${nextResult.errorMessage}`
        : "Phase 4 extraction completed.",
    );
  };

  const saveResult = async () => {
    if (!result) {
      return;
    }
    await savePhase4ExtractionResult(result);
    setMessage("Phase 4 result saved locally.");
  };

  const exportCsv = async () => {
    try {
      const path = await exportPhase4ExtractionResultsCsv();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: "text/csv",
          dialogTitle: "Share Phase 4 extraction CSV",
        });
      }
      setMessage(`Phase 4 CSV export created: ${path}`);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(`CSV export failed: ${text}`);
      Alert.alert("CSV export failed", text);
    }
  };

  const runChecks = async () => {
    const summary = await runPhase4ManualChecks();
    setCheckSummary(summary.summary);
    setMessage(summary.summary);
  };

  const checkLocalModel = async () => {
    const readiness = await getPhase4LocalLLMReadiness();
    setMessage(readiness.message);
  };

  const downloadLocalModel = async () => {
    try {
      setDownloadProgress(0);
      const uri = await downloadPhase4LocalLLMModel(setDownloadProgress);
      setMessage(`Phase 4 local model downloaded to ${uri}`);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(`Model download failed: ${text}`);
      Alert.alert("Model download failed", text);
    } finally {
      setDownloadProgress(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Phase 4</Text>
          <Text style={styles.title}>General Task Extraction</Text>
          <Text style={styles.subtitle}>
            Local, data-grounded draft creation for user review.
          </Text>
        </View>

        <Section title="Input">
          <TextInput
            value={transcript}
            onChangeText={setTranscript}
            multiline
            textAlignVertical="top"
            style={styles.textArea}
          />
          <View style={styles.row}>
            <Chip
              selected={language === "en"}
              label="English"
              onPress={() => setLanguage("en")}
            />
            <Chip
              selected={language === "fi"}
              label="Finnish"
              onPress={() => setLanguage("fi")}
            />
          </View>
          <View style={styles.row}>
            <Chip
              selected={providerChoice === "mock"}
              label="Mock provider"
              onPress={() => setProviderChoice("mock")}
            />
            <Chip
              selected={providerChoice === "local"}
              label="Local provider"
              onPress={() => setProviderChoice("local")}
            />
          </View>
        </Section>

        <Section title="Model">
          <Metric
            label="Selected model"
            value={PHASE4_SELECTED_LLM_MODEL.displayName}
          />
          <Metric
            label="Runtime"
            value={PHASE4_SELECTED_LLM_MODEL.runtimeTarget}
          />
          <Text style={styles.note}>
            Local provider uses llama.rn and needs the GGUF file in the app
            document directory.
          </Text>
        </Section>

        <View style={styles.actions}>
          <Button
            label="Run extraction"
            icon="play.fill"
            onPress={runExtraction}
          />
          <Button
            label="Save result"
            icon="tray.and.arrow.down.fill"
            onPress={saveResult}
            disabled={!result}
          />
          <Button
            label="Export CSV"
            icon="arrow.down.doc"
            onPress={exportCsv}
          />
          <Button
            label="Run checks"
            icon="checkmark.circle"
            onPress={runChecks}
          />
          <Button
            label="Check model"
            icon="info.circle.fill"
            onPress={checkLocalModel}
          />
          <Button
            label="Download model"
            icon="icloud.and.arrow.down"
            onPress={downloadLocalModel}
          />
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}
        {downloadProgress !== null ? (
          <Text style={styles.note}>
            Downloading model: {Math.round(downloadProgress)}%
          </Text>
        ) : null}
        {checkSummary ? <Text style={styles.note}>{checkSummary}</Text> : null}

        {result ? (
          <Section title="Extracted draft">
            <Text style={styles.note}>
              Company is suggested and must be confirmed.
            </Text>
            <Text style={styles.note}>
              Area is filled only if spoken and allowed.
            </Text>
            <Text style={styles.note}>
              Marker must be selected manually. Photos are skipped.
              Notifications are false by default.
            </Text>
            <Field
              label="List"
              value={result.draft.list.value}
              status={result.draft.list.status}
              confidence={result.draft.list.confidence}
            />
            <Field
              label="Company"
              value={result.draft.company.value ?? "Manual"}
              status={result.draft.company.status}
              confidence={result.draft.company.confidence}
            />
            <Field
              label="Description"
              value={result.draft.description.value}
              status={result.draft.description.status}
              confidence={result.draft.description.confidence}
            />
            <Field
              label="Area"
              value={result.draft.area.value ?? "Manual"}
              status={result.draft.area.status}
              confidence={result.draft.area.confidence}
            />
            <Field
              label="Required action"
              value={result.draft.requiredAction.value ?? "Manual"}
              status={result.draft.requiredAction.status}
              confidence={result.draft.requiredAction.confidence}
            />
            <Field
              label="Due date"
              value={result.draft.requiredActionDueDate.value ?? "Manual"}
              status={result.draft.requiredActionDueDate.status}
              confidence={result.draft.requiredActionDueDate.confidence}
            />
            <Field
              label="Tags"
              value={result.draft.tags.value.join(", ") || "Manual"}
              status={result.draft.tags.status}
              confidence={result.draft.tags.confidence}
            />
            <Metric
              label="Extraction time"
              value={`${result.extractionTimeMs} ms`}
            />
            <Metric
              label="Parse / validation"
              value={`${result.parseSuccess ? "parsed" : "failed"} / ${result.validationPassed ? "passed" : "needs review"}`}
            />
            {result.warnings.map((item) => (
              <Text key={`${item.fieldId}-${item.code}`} style={styles.warning}>
                {item.fieldId}: {item.message}
              </Text>
            ))}
            <ReviewSuggestions result={result} />
            <HybridRetrievalDebug result={result} />
            <Pressable
              style={styles.debugToggle}
              onPress={() => setRawVisible((value) => !value)}
            >
              <Text style={styles.debugText}>
                {rawVisible ? "Hide raw LLM output" : "Show raw LLM output"}
              </Text>
            </Pressable>
            {rawVisible ? (
              <Text style={styles.raw}>
                {result.rawLlmOutput || result.errorMessage}
              </Text>
            ) : null}
          </Section>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Chip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.chip, selected && styles.chipSelected]}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label}
    </Text>
  </Pressable>
);

const Button = ({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={[styles.button, disabled && styles.buttonDisabled]}
  >
    <IconSymbol
      name={icon}
      size={18}
      color={disabled ? C.textSubtle : C.surface}
    />
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metric}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const Field = ({
  label,
  value,
  status,
  confidence,
}: {
  label: string;
  value: string;
  status: string;
  confidence: string;
}) => (
  <View style={styles.fieldRow}>
    <View style={styles.fieldText}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
    <Text style={styles.status}>
      {status} / {confidence}
    </Text>
  </View>
);

const ReviewSuggestions = ({
  result,
}: {
  result: Phase4ExtractionResult;
}) => {
  const suggestions = result.reviewSuggestions;
  const hasSuggestions =
    Boolean(suggestions.workIntent) ||
    Boolean(suggestions.spokenDueDateText) ||
    Boolean(suggestions.spokenCompanyText) ||
    suggestions.companySuggestions.length > 0 ||
    suggestions.manualReviewReasons.length > 0;

  if (!hasSuggestions) {
    return null;
  }

  return (
    <View style={styles.suggestionBox}>
      <Text style={styles.suggestionTitle}>Review suggestions</Text>
      {suggestions.workIntent ? (
        <Text style={styles.note}>Work intent: {suggestions.workIntent}</Text>
      ) : null}
      {suggestions.spokenDueDateText ? (
        <Text style={styles.note}>
          Spoken due date: {suggestions.spokenDueDateText}
        </Text>
      ) : null}
      {suggestions.spokenCompanyText ? (
        <Text style={styles.note}>
          Spoken company: {suggestions.spokenCompanyText}
        </Text>
      ) : null}
      {suggestions.companySuggestions.map((item) => (
        <Text
          key={`${item.companyId ?? item.displayName}-${item.source}`}
          style={styles.note}
        >
          {item.displayName ?? item.companyId ?? "Manual company"} -{" "}
          {item.matchType} / {item.confidence}
        </Text>
      ))}
      {suggestions.manualReviewReasons.map((reason) => (
        <Text key={reason} style={styles.note}>
          {reason}
        </Text>
      ))}
    </View>
  );
};

const HybridRetrievalDebug = ({
  result,
}: {
  result: Phase4ExtractionResult;
}) => {
  const retrieval = result.hybridRetrieval;
  if (!retrieval) {
    return null;
  }

  return (
    <View style={styles.suggestionBox}>
      <Text style={styles.suggestionTitle}>Retrieval debug</Text>
      {result.projectContext ? (
        <Text style={styles.note}>
          {result.projectContext.activeUserName} /{" "}
          {result.projectContext.projectName}
        </Text>
      ) : null}
      <Metric
        label="Retrieval counts"
        value={`exact ${retrieval.counts.exact} / lexical ${retrieval.counts.lexical} / semantic ${retrieval.counts.semantic}`}
      />
      <Metric
        label="Retrieval time"
        value={`${retrieval.timings.totalMs} ms`}
      />
      <Text style={styles.note}>
        Companies:{" "}
        {retrieval.companyCandidates
          .map((item) => `${item.value.displayName} (${item.confidence})`)
          .join(", ") || "none"}
      </Text>
      <Text style={styles.note}>
        Areas:{" "}
        {retrieval.areaCandidates
          .map((item) => `${item.value} (${item.confidence})`)
          .join(", ") || "none"}
      </Text>
      <Text style={styles.note}>
        Work types:{" "}
        {retrieval.workTypeCandidates
          .map((item) => `${item.value} (${item.confidence})`)
          .join(", ") || "none"}
      </Text>
      {retrieval.warnings.map((warning) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { padding: 20, gap: 18 },
  header: { gap: 5 },
  eyebrow: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: { color: C.text, fontSize: 28, fontWeight: "800" },
  subtitle: { color: C.textSubtle, fontSize: 15, lineHeight: 21 },
  section: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 16,
  },
  sectionTitle: { color: C.text, fontSize: 18, fontWeight: "800" },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.surface,
    color: C.text,
    padding: 12,
    fontSize: 15,
    lineHeight: 21,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: C.surface,
  },
  chipSelected: { borderColor: C.primary, backgroundColor: C.primarySoft },
  chipText: { color: C.textMuted, fontWeight: "700" },
  chipTextSelected: { color: C.primary },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  buttonDisabled: { backgroundColor: C.borderStrong },
  buttonText: { color: C.surface, fontWeight: "800" },
  message: { color: C.teal, fontSize: 14, fontWeight: "700" },
  note: { color: C.textSubtle, fontSize: 13, lineHeight: 19 },
  metric: { gap: 2 },
  metricLabel: {
    color: C.textSubtle,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: { color: C.text, fontSize: 15, fontWeight: "700" },
  fieldRow: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.surface,
    padding: 12,
    gap: 8,
  },
  fieldText: { gap: 3 },
  fieldLabel: {
    color: C.textSubtle,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  fieldValue: { color: C.text, fontSize: 15, lineHeight: 21 },
  status: { color: C.primary, fontSize: 12, fontWeight: "800" },
  suggestionBox: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.surfaceAlt,
    padding: 12,
    gap: 6,
  },
  suggestionTitle: { color: C.text, fontSize: 14, fontWeight: "800" },
  warning: { color: C.warning, fontSize: 13, fontWeight: "700" },
  debugToggle: { paddingVertical: 8 },
  debugText: { color: C.primary, fontWeight: "800" },
  raw: {
    color: C.neutralDark,
    backgroundColor: C.surfaceAlt,
    borderRadius: 8,
    padding: 12,
    fontFamily: "monospace",
    fontSize: 12,
  },
});
