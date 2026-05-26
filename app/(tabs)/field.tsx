import { IconSymbol } from "@/components/ui/icon-symbol";
import { FieldColors as C } from "@/constants/theme";
import { useAsrController } from "@/src/features/asr/hooks/useAsrController";
import {
  extractGeneralTaskFormDraft,
  type Phase4ExtractionResult,
} from "@/src/features/phase4/draft/phase4TaskDraftBuilder";
import { phase4LocalLLMProvider } from "@/src/features/phase4/llm/phase4LocalLLMProvider";
import { getPhase4ReferenceData } from "@/src/features/phase4/referenceData/phase4ReferenceRepository";
import { savePhase4ExtractionResult } from "@/src/features/phase4/storage/phase4ExtractionStorage";
import type {
  Phase4AllowedDueDate,
  Phase4Language,
  Phase4RequiredAction,
  Phase4TaskTag,
} from "@/src/features/phase4/types/phase4.types";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FieldWorkflowStatus =
  | "idle"
  | "recording"
  | "transcribing"
  | "extracting"
  | "ready"
  | "saved"
  | "error";

type EditableDraft = {
  company: string;
  description: string;
  area: string;
  requiredAction: string;
  dueDate: string;
  tags: string;
};

const workflowSteps = [
  { key: "recording", label: "Record" },
  { key: "transcribing", label: "Transcribe" },
  { key: "extracting", label: "Extract" },
  { key: "ready", label: "Review" },
] as const;

const statusIndex: Record<FieldWorkflowStatus, number> = {
  idle: -1,
  recording: 0,
  transcribing: 1,
  extracting: 2,
  ready: 3,
  saved: 3,
  error: -1,
};

const waitForPaint = () =>
  new Promise((resolve) => requestAnimationFrame(resolve));

export default function FieldScreen() {
  const [language, setLanguage] = useState<Phase4Language>("en");
  const [workflowStatus, setWorkflowStatus] =
    useState<FieldWorkflowStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<Phase4ExtractionResult | null>(null);
  const [editableDraft, setEditableDraft] = useState<EditableDraft | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const referenceData = useMemo(() => getPhase4ReferenceData(), []);
  const {
    status: asrStatus,
    isRecording,
    liveTranscript,
    latestResult,
    error: asrError,
    recordingDurationMs,
    startRecording,
    stopRecordingAndTranscribe,
    reset,
  } = useAsrController({
    engineId: "native",
    language,
  });

  useEffect(() => {
    if (liveTranscript) {
      setTranscript(liveTranscript);
    }
  }, [liveTranscript]);

  useEffect(() => {
    if (asrError) {
      setWorkflowStatus("error");
      setMessage(asrError);
    }
  }, [asrError]);

  const beginRecording = async () => {
    setWorkflowStatus("recording");
    setTranscript("");
    setResult(null);
    setEditableDraft(null);
    setMessage(null);
    reset();

    try {
      await startRecording();
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setWorkflowStatus("error");
      setMessage(text);
    }
  };

  const stopAndExtract = async () => {
    if (!isRecording) {
      return;
    }

    setWorkflowStatus("transcribing");
    setMessage(null);

    const transcriptionResult = await stopRecordingAndTranscribe();
    const finalTranscript =
      transcriptionResult?.transcript.trim() ||
      latestResult?.transcript.trim() ||
      transcript.trim();

    setTranscript(finalTranscript);

    if (!finalTranscript) {
      setWorkflowStatus("error");
      setMessage("No transcript was captured. Record again before creating a draft.");
      return;
    }

    setWorkflowStatus("extracting");
    await waitForPaint();
    try {
      const nextResult = await extractGeneralTaskFormDraft({
        phase3ResultId: transcriptionResult?.id ?? latestResult?.id ?? null,
        transcript: finalTranscript,
        language,
        provider: phase4LocalLLMProvider,
      });

      setResult(nextResult);
      setEditableDraft(createEditableDraft(nextResult));
      setWorkflowStatus(nextResult.errorMessage ? "error" : "ready");
      setMessage(nextResult.errorMessage ?? "Draft ready for review.");
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setWorkflowStatus("error");
      setMessage(text);
    }
  };

  const saveDraft = async () => {
    if (!result || !editableDraft) {
      return;
    }

    try {
      const editedResult = applyEditsToResult(
        result,
        editableDraft,
        referenceData.companies,
      );
      await savePhase4ExtractionResult(editedResult);
      setResult(editedResult);
      setWorkflowStatus("saved");
      setMessage("Draft saved locally.");
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setMessage(text);
      Alert.alert("Save failed", text);
    }
  };

  const elapsedSeconds = Math.max(0, Math.floor(recordingDurationMs / 1000));
  const isProcessing =
    workflowStatus === "transcribing" || workflowStatus === "extracting";

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Field task</Text>
            <Text style={styles.title}>Voice to draft</Text>
          </View>

          <View style={styles.languageRow}>
            <ModeChip
              label="English"
              selected={language === "en"}
              disabled={isRecording || workflowStatus === "extracting"}
              onPress={() => setLanguage("en")}
            />
            <ModeChip
              label="Finnish"
              selected={language === "fi"}
              disabled={isRecording || workflowStatus === "extracting"}
              onPress={() => setLanguage("fi")}
            />
          </View>

          <WorkflowSteps status={workflowStatus} />

          <View style={styles.recorderPanel}>
            <Pressable
              onPress={isRecording ? stopAndExtract : beginRecording}
              disabled={workflowStatus === "transcribing" || workflowStatus === "extracting"}
              style={[
                styles.micButton,
                isRecording && styles.micButtonRecording,
                (workflowStatus === "transcribing" ||
                  workflowStatus === "extracting") &&
                  styles.micButtonDisabled,
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <IconSymbol
                  name={isRecording ? "stop.fill" : "mic.fill"}
                  size={48}
                  color="#FFFFFF"
                />
              )}
            </Pressable>
            <Text style={styles.recorderStatus}>
              {statusLabel(workflowStatus, asrStatus)}
            </Text>
            {isRecording ? (
              <Text style={styles.timer}>{elapsedSeconds}s</Text>
            ) : null}
          </View>

          {isProcessing ? <ProcessingPanel status={workflowStatus} /> : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transcript</Text>
            <Text style={styles.transcript}>
              {transcript || "Transcript will appear here while recording."}
            </Text>
          </View>

          {message ? (
            <Text
              style={[
                styles.message,
                workflowStatus === "error" && styles.errorMessage,
              ]}
            >
              {message}
            </Text>
          ) : null}

          {result && editableDraft ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Draft preview</Text>
              <ReadOnlyRow label="List" value={result.draft.list.value} />
              <EditableField
                label="Company"
                value={editableDraft.company}
                status={friendlyFieldStatus(result.draft.company.status)}
                onChangeText={(company) =>
                  setEditableDraft({ ...editableDraft, company })
                }
              />
              <EditableField
                label="Description"
                value={editableDraft.description}
                status={friendlyFieldStatus(result.draft.description.status)}
                multiline
                onChangeText={(description) =>
                  setEditableDraft({ ...editableDraft, description })
                }
              />
              <EditableField
                label="Area"
                value={editableDraft.area}
                status={friendlyFieldStatus(result.draft.area.status)}
                onChangeText={(area) =>
                  setEditableDraft({ ...editableDraft, area })
                }
              />
              <EditableField
                label="Required action"
                value={editableDraft.requiredAction}
                status={friendlyFieldStatus(result.draft.requiredAction.status)}
                onChangeText={(requiredAction) =>
                  setEditableDraft({ ...editableDraft, requiredAction })
                }
              />
              <EditableField
                label="Due date"
                value={editableDraft.dueDate}
                status={friendlyFieldStatus(result.draft.requiredActionDueDate.status)}
                onChangeText={(dueDate) =>
                  setEditableDraft({ ...editableDraft, dueDate })
                }
              />
              <EditableField
                label="Tags"
                value={editableDraft.tags}
                status={friendlyFieldStatus(result.draft.tags.status)}
                onChangeText={(tags) =>
                  setEditableDraft({ ...editableDraft, tags })
                }
              />
              <ReadOnlyRow label="Marker" value="Manual" />
              <ReadOnlyRow label="Photos" value="Skipped" />
              <ReadOnlyRow label="Notifications" value="False" />
              {result.warnings.map((warning) => (
                <Text
                  key={`${warning.fieldId}-${warning.code}`}
                  style={styles.warning}
                >
                  {warning.fieldId}: {warning.message}
                </Text>
              ))}
              <Pressable style={styles.saveButton} onPress={saveDraft}>
                <IconSymbol
                  name="tray.and.arrow.down.fill"
                  size={19}
                  color="#FFFFFF"
                />
                <Text style={styles.saveButtonText}>Save draft</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createEditableDraft = (result: Phase4ExtractionResult): EditableDraft => ({
  company: result.draft.company.value ?? "",
  description: result.draft.description.value,
  area: result.draft.area.value ?? "",
  requiredAction: result.draft.requiredAction.value ?? "",
  dueDate: result.draft.requiredActionDueDate.value ?? "",
  tags: result.draft.tags.value.join(", "),
});

const applyEditsToResult = (
  result: Phase4ExtractionResult,
  editableDraft: EditableDraft,
  companies: ReturnType<typeof getPhase4ReferenceData>["companies"],
): Phase4ExtractionResult => {
  const companyName = editableDraft.company.trim();
  const matchedCompany = companies.find(
    (company) =>
      company.displayName.toLowerCase() === companyName.toLowerCase(),
  );

  return {
    ...result,
    draft: {
      ...result.draft,
      company: {
        ...result.draft.company,
        value: companyName || null,
        companyId: matchedCompany?.companyId ?? null,
      },
      description: {
        ...result.draft.description,
        value: editableDraft.description.trim() || result.transcript,
      },
      area: {
        ...result.draft.area,
        value: editableDraft.area.trim() || null,
      },
      requiredAction: {
        ...result.draft.requiredAction,
        value:
          (editableDraft.requiredAction.trim() as Phase4RequiredAction) || null,
      },
      requiredActionDueDate: {
        ...result.draft.requiredActionDueDate,
        value: (editableDraft.dueDate.trim() as Phase4AllowedDueDate) || null,
      },
      tags: {
        ...result.draft.tags,
        value: splitTags(editableDraft.tags),
      },
    },
  };
};

const splitTags = (tags: string): Phase4TaskTag[] =>
  tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean) as Phase4TaskTag[];

const statusLabel = (status: FieldWorkflowStatus, asrStatus: string) => {
  if (status === "recording") {
    return "Listening";
  }
  if (status === "transcribing") {
    return "Preparing transcript";
  }
  if (status === "extracting") {
    return "Creating draft";
  }
  if (status === "ready") {
    return "Draft ready";
  }
  if (status === "saved") {
    return "Draft saved";
  }
  if (status === "error") {
    return "Needs attention";
  }
  return asrStatus === "idle" ? "Tap to record" : asrStatus;
};

const friendlyFieldStatus = (status: string) => {
  if (status === "extracted" || status === "defaulted") {
    return "Ready";
  }
  if (status === "suggested") {
    return "Review";
  }
  if (status === "manual_required") {
    return "Needs review";
  }
  return status.replaceAll("_", " ");
};

function WorkflowSteps({ status }: { status: FieldWorkflowStatus }) {
  const currentIndex = statusIndex[status];

  return (
    <View style={styles.stepRow}>
      {workflowSteps.map((step, index) => {
        const complete = currentIndex > index || status === "saved";
        const active = currentIndex === index && status !== "saved";
        return (
          <View key={step.key} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                complete && styles.stepDotComplete,
                active && styles.stepDotActive,
              ]}
            >
              {complete ? (
                <IconSymbol name="checkmark" size={15} color="#FFFFFF" />
              ) : null}
            </View>
            <Text
              style={[
                styles.stepLabel,
                (complete || active) && styles.stepLabelActive,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ProcessingPanel({ status }: { status: FieldWorkflowStatus }) {
  const title =
    status === "extracting" ? "Creating draft" : "Preparing transcript";
  const body =
    status === "extracting"
      ? "The local LLM is extracting task details."
      : "Finalizing the recorded speech.";

  return (
    <View style={styles.processingPanel}>
      <ActivityIndicator size="large" color={C.primary} />
      <View style={styles.processingTextBlock}>
        <Text style={styles.processingTitle}>{title}</Text>
        <Text style={styles.processingBody}>{body}</Text>
      </View>
    </View>
  );
}

function ModeChip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.modeChip,
        selected && styles.modeChipSelected,
        disabled && styles.modeChipDisabled,
      ]}
    >
      <Text
        style={[
          styles.modeChipText,
          selected && styles.modeChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EditableField({
  label,
  value,
  status,
  multiline,
  onChangeText,
}: {
  label: string;
  value: string;
  status: string;
  multiline?: boolean;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldStatus}>{status}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readOnlyRow}>
      <Text style={styles.readOnlyLabel}>{label}</Text>
      <Text style={styles.readOnlyValue}>{value}</Text>
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
    paddingBottom: 112,
    gap: 16,
  },
  header: {
    gap: 4,
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
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  languageRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeChip: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  modeChipSelected: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  modeChipDisabled: {
    opacity: 0.6,
  },
  modeChipText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: "900",
  },
  modeChipTextSelected: {
    color: C.primary,
  },
  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    gap: 7,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  stepDotActive: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  stepDotComplete: {
    borderColor: C.success,
    backgroundColor: C.success,
  },
  stepLabel: {
    color: C.textSubtle,
    fontSize: 12,
    fontWeight: "800",
  },
  stepLabelActive: {
    color: C.text,
  },
  recorderPanel: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
  },
  micButton: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonRecording: {
    backgroundColor: C.danger,
  },
  micButtonDisabled: {
    backgroundColor: C.borderStrong,
  },
  recorderStatus: {
    color: C.text,
    fontSize: 18,
    fontWeight: "900",
  },
  timer: {
    color: C.textSubtle,
    fontSize: 15,
    fontWeight: "800",
  },
  processingPanel: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  processingTextBlock: {
    flex: 1,
    gap: 3,
  },
  processingTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "900",
  },
  processingBody: {
    color: C.textSubtle,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  section: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 16,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "900",
  },
  transcript: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.surface,
    color: C.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "600",
    padding: 14,
  },
  message: {
    color: C.teal,
    fontSize: 14,
    fontWeight: "800",
  },
  errorMessage: {
    color: C.danger,
  },
  field: {
    gap: 8,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  fieldLabel: {
    color: C.textSubtle,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  fieldStatus: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.surface,
    color: C.text,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "700",
  },
  multilineInput: {
    minHeight: 92,
    paddingTop: 12,
    lineHeight: 21,
  },
  readOnlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.surfaceAlt,
    padding: 12,
  },
  readOnlyLabel: {
    flex: 1,
    color: C.textSubtle,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  readOnlyValue: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
  },
  warning: {
    color: C.warning,
    fontSize: 13,
    fontWeight: "800",
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
});
