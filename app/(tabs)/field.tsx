import { IconSymbol } from "@/components/ui/icon-symbol";
import { FieldColors as C } from "@/constants/theme";
import { useAsrController } from "@/src/features/asr/hooks/useAsrController";
import {
  loadActiveProjectContext,
  type ProjectContextPackage,
} from "@/src/features/phase4/context/activeProjectContextLoader";
import {
  getPhase4SeedBundle,
  PHASE4_DEFAULT_USER_ID,
  type Phase4SeedUser,
} from "@/src/features/phase4/data/phase4SeedData";
import {
  extractGeneralTaskFormDraft,
  type Phase4ExtractionProgressStep,
  type Phase4ExtractionResult,
} from "@/src/features/phase4/draft/phase4TaskDraftBuilder";
import { phase4LocalLLMProvider } from "@/src/features/phase4/llm/phase4LocalLLMProvider";
import { savePhase4ExtractionResult } from "@/src/features/phase4/storage/phase4ExtractionStorage";
import { preparePhase4HybridRagRuntime } from "@/src/features/phase4/storage/phase4HybridRagRuntime";
import type {
  Phase4AllowedDueDate,
  Phase4Language,
  Phase4RequiredAction,
  Phase4TaskTag,
} from "@/src/features/phase4/types/phase4.types";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  | "selecting_user"
  | "loading_context"
  | "ready_to_record"
  | "recording"
  | "transcribing"
  | "preparing_transcript"
  | "retrieving_context"
  | "extracting_with_llm"
  | "ready"
  | "saved"
  | "error";

type EditableDraft = {
  company: string;
  companyId: string | null;
  description: string;
  area: string;
  areaId: string | null;
  requiredAction: string;
  dueDate: string;
  tags: string;
  tagCodes: string[];
};

type InlineSuggestion = {
  id: string;
  label: string;
  meta?: string;
  selected?: boolean;
  onPress?: () => void;
};

const phase4SeedBundle = getPhase4SeedBundle();

const workflowSteps = [
  { key: "selecting_user", label: "User" },
  { key: "loading_context", label: "Data" },
  { key: "recording", label: "Record" },
  { key: "transcribing", label: "Speech" },
  { key: "retrieving_context", label: "RAG" },
  { key: "extracting_with_llm", label: "Draft" },
  { key: "ready", label: "Review" },
] as const;

const statusIndex: Record<FieldWorkflowStatus, number> = {
  selecting_user: 0,
  loading_context: 1,
  ready_to_record: 2,
  recording: 2,
  transcribing: 3,
  preparing_transcript: 3,
  retrieving_context: 4,
  extracting_with_llm: 5,
  ready: 6,
  saved: 6,
  error: -1,
};

const waitForPaint = () =>
  new Promise((resolve) => requestAnimationFrame(resolve));

export default function FieldScreen() {
  const [selectedUserId, setSelectedUserId] = useState(PHASE4_DEFAULT_USER_ID);
  const [projectContext, setProjectContext] =
    useState<ProjectContextPackage | null>(null);
  const [language, setLanguage] = useState<Phase4Language>("en");
  const [workflowStatus, setWorkflowStatus] =
    useState<FieldWorkflowStatus>("loading_context");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<Phase4ExtractionResult | null>(null);
  const [editableDraft, setEditableDraft] = useState<EditableDraft | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [embeddingIndexProgress, setEmbeddingIndexProgress] = useState<
    string | null
  >(null);
  const [userSelectorOpen, setUserSelectorOpen] = useState(false);

  const selectedUser = useMemo(
    () =>
      phase4SeedBundle.users.find((user) => user.user_id === selectedUserId) ??
      null,
    [selectedUserId],
  );
  const selectedProject = useMemo(
    () =>
      phase4SeedBundle.projects.find(
        (project) => project.project_id === selectedUser?.active_project_id,
      ) ?? null,
    [selectedUser],
  );
  const referenceData = projectContext?.referenceData ?? { companies: [] };

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
    let active = true;

    const loadProjectContext = async () => {
      setWorkflowStatus("loading_context");
      setProjectContext(null);
      setTranscript("");
      setResult(null);
      setEditableDraft(null);
      setEmbeddingIndexProgress(null);
      setUserSelectorOpen(false);
      setMessage("Loading project data.");

      const contextResult = loadActiveProjectContext({
        userId: selectedUserId,
      });
      if (!contextResult.ok) {
        if (!active) {
          return;
        }
        setWorkflowStatus("error");
        setMessage(contextResult.errorMessage);
        return;
      }

      const nextUserLanguage =
        contextResult.context.activeUser.default_language === "fi"
          ? "fi"
          : "en";
      if (active) {
        setLanguage(nextUserLanguage);
        setProjectContext(contextResult.context);
        setMessage("Preparing retrieval.");
      }

      try {
        const runtime = await preparePhase4HybridRagRuntime({
          userId: selectedUserId,
          embeddingMode: "ifReady",
          onEmbeddingProgress: (progress) => {
            if (!active) {
              return;
            }
            setEmbeddingIndexProgress(
              `Indexing embeddings ${progress.completed}/${progress.total}`,
            );
          },
        });

        if (!active) {
          return;
        }
        setWorkflowStatus("ready_to_record");
        setMessage(runtime.status.message);
      } catch (error) {
        if (!active) {
          return;
        }
        const text = error instanceof Error ? error.message : String(error);
        setWorkflowStatus("error");
        setMessage(text);
      } finally {
        if (active) {
          setEmbeddingIndexProgress(null);
        }
      }
    };

    void loadProjectContext();

    return () => {
      active = false;
    };
  }, [selectedUserId]);

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

  const busyWithExtraction =
    workflowStatus === "transcribing" ||
    workflowStatus === "preparing_transcript" ||
    workflowStatus === "retrieving_context" ||
    workflowStatus === "extracting_with_llm";
  const contextLoading = workflowStatus === "loading_context";
  const userControlsDisabled =
    contextLoading || isRecording || busyWithExtraction;
  const micDisabled = contextLoading || busyWithExtraction || !projectContext;
  const languageDisabled = userControlsDisabled;
  const elapsedSeconds = Math.max(0, Math.floor(recordingDurationMs / 1000));
  const showProcessingPanel = contextLoading || busyWithExtraction;

  const beginRecording = async () => {
    if (!projectContext || contextLoading) {
      return;
    }

    setWorkflowStatus("recording");
    setTranscript("");
    setResult(null);
    setEditableDraft(null);
    setMessage(null);
    setUserSelectorOpen(false);
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
    setMessage("Finalizing recorded speech.");

    const transcriptionResult = await stopRecordingAndTranscribe();
    const finalTranscript =
      transcriptionResult?.transcript.trim() ||
      latestResult?.transcript.trim() ||
      transcript.trim();

    setTranscript(finalTranscript);

    if (!finalTranscript) {
      setWorkflowStatus("error");
      setMessage(
        "No transcript was captured. Record again before creating a draft.",
      );
      return;
    }

    setWorkflowStatus("preparing_transcript");
    setMessage("Preparing transcript.");
    await waitForPaint();

    try {
      const nextResult = await extractGeneralTaskFormDraft({
        phase3ResultId: transcriptionResult?.id ?? latestResult?.id ?? null,
        transcript: finalTranscript,
        phase4UserId: selectedUserId,
        language,
        provider: phase4LocalLLMProvider,
        onProgress: (step) => {
          const nextStatus = fieldStatusForExtractionStep(step);
          setWorkflowStatus(nextStatus);
          setMessage(messageForExtractionStep(step));
        },
      });

      setResult(nextResult);
      setEditableDraft(createEditableDraft(nextResult));
      setWorkflowStatus("ready");
      setMessage("Draft ready for review.");
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

  const selectUser = (userId: string) => {
    if (userControlsDisabled || selectedUserId === userId) {
      setUserSelectorOpen(false);
      return;
    }
    setSelectedUserId(userId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            {/* <Text style={styles.eyebrow}>Field </Text> */}
            <Text style={styles.title}>Voice to Draft</Text>
          </View>

          <UserSelector
            users={phase4SeedBundle.users}
            selectedUser={selectedUser}
            selectedProjectName={
              projectContext?.project.project_name ??
              selectedProject?.project_name ??
              "Project not loaded"
            }
            disabled={userControlsDisabled}
            open={userSelectorOpen}
            onToggle={() => setUserSelectorOpen((value) => !value)}
            onSelect={selectUser}
          />

          <View style={styles.languageRow}>
            <ModeChip
              label="English"
              selected={language === "en"}
              disabled={languageDisabled}
              onPress={() => setLanguage("en")}
            />
            <ModeChip
              label="Finnish"
              selected={language === "fi"}
              disabled={languageDisabled}
              onPress={() => setLanguage("fi")}
            />
          </View>

          <WorkflowSteps status={workflowStatus} />

          <View style={styles.recorderPanel}>
            <Pressable
              onPress={isRecording ? stopAndExtract : beginRecording}
              disabled={micDisabled}
              style={[
                styles.micButton,
                isRecording && styles.micButtonRecording,
                micDisabled && styles.micButtonDisabled,
              ]}
            >
              {showProcessingPanel ? (
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

          {showProcessingPanel ? (
            <ProcessingPanel
              status={workflowStatus}
              detail={embeddingIndexProgress ?? message}
            />
          ) : null}

          {projectContext ? (
            <View style={styles.contextPanel}>
              <ReadOnlyRow
                label="Worker"
                value={projectContext.activeUser.display_name}
              />
              <ReadOnlyRow
                label="Project"
                value={projectContext.project.project_name}
              />
            </View>
          ) : null}

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
                suggestions={companyInlineSuggestions(
                  result,
                  editableDraft.companyId,
                  (suggestion) =>
                    setEditableDraft({
                      ...editableDraft,
                      company: suggestion.label,
                      companyId: suggestion.companyId,
                    }),
                )}
                onChangeText={(company) =>
                  setEditableDraft({ ...editableDraft, company, companyId: null })
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
                suggestions={areaInlineSuggestions(
                  result,
                  editableDraft.areaId,
                  (suggestion) =>
                    setEditableDraft({
                      ...editableDraft,
                      area: suggestion.label,
                      areaId: suggestion.areaId,
                    }),
                )}
                onChangeText={(area) =>
                  setEditableDraft({ ...editableDraft, area, areaId: null })
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
                status={friendlyFieldStatus(
                  result.draft.requiredActionDueDate.status,
                )}
                suggestions={dueDateInlineSuggestions(result)}
                onChangeText={(dueDate) =>
                  setEditableDraft({ ...editableDraft, dueDate })
                }
                onSelectSuggestion={(suggestion) =>
                  setEditableDraft({
                    ...editableDraft,
                    dueDate: suggestion.label,
                  })
                }
              />
              <EditableField
                label="Tags"
                value={editableDraft.tags}
                status={friendlyFieldStatus(result.draft.tags.status)}
                suggestions={tagInlineSuggestions(
                  result,
                  editableDraft.tagCodes,
                  (suggestion) =>
                    setEditableDraft(toggleEditableDraftTag(editableDraft, suggestion)),
                )}
                onChangeText={(tags) =>
                  setEditableDraft({ ...editableDraft, tags, tagCodes: [] })
                }
              />
              <ReadOnlyRow label="Marker" value="Manual" />
              <ReadOnlyRow label="Photos" value="Skipped" />
              <ReadOnlyRow label="Notifications" value="False" />
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

const createEditableDraft = (
  result: Phase4ExtractionResult,
): EditableDraft => ({
  company: result.draft.company.value ?? "",
  companyId: result.draft.company.companyId,
  description: result.draft.description.value,
  area: result.draft.area.value ?? "",
  areaId: result.draft.area.areaId ?? null,
  requiredAction: result.draft.requiredAction.value ?? "",
  dueDate: result.draft.requiredActionDueDate.value ?? "",
  tags: result.draft.tags.value.join(", "),
  tagCodes: result.draft.tags.tagCodes ?? [],
});

const applyEditsToResult = (
  result: Phase4ExtractionResult,
  editableDraft: EditableDraft,
  companies: readonly { displayName: string; companyId: string }[],
): Phase4ExtractionResult => {
  const companyName = editableDraft.company.trim();
  const matchedCompany = companies.find(
    (company) =>
      company.displayName.toLowerCase() === companyName.toLowerCase(),
  );
  const tagValues = splitTags(editableDraft.tags);

  return {
    ...result,
    draft: {
      ...result.draft,
      company: {
        ...result.draft.company,
        value: companyName || null,
        companyId: editableDraft.companyId ?? matchedCompany?.companyId ?? null,
      },
      description: {
        ...result.draft.description,
        value: editableDraft.description.trim() || result.transcript,
      },
      area: {
        ...result.draft.area,
        value: editableDraft.area.trim() || null,
        areaId: editableDraft.areaId,
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
        value: tagValues,
        tagCodes: editableDraft.tagCodes,
      },
    },
  };
};

const splitTags = (tags: string): Phase4TaskTag[] =>
  tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean) as Phase4TaskTag[];

const companyInlineSuggestions = (
  result: Phase4ExtractionResult,
  selectedCompanyId: string | null,
  onSelect: (suggestion: { label: string; companyId: string | null }) => void,
): InlineSuggestion[] =>
  result.reviewSuggestions.companySuggestions.map((item) => ({
    id: item.companyId ?? item.displayName ?? item.reason,
    label: item.displayName ?? "Manual company",
    meta: friendlySuggestionMeta(item.matchType, item.confidence),
    selected: Boolean(item.companyId && item.companyId === selectedCompanyId),
    onPress: () =>
      onSelect({
        label: item.displayName ?? "",
        companyId: item.companyId,
      }),
  }));

const areaInlineSuggestions = (
  result: Phase4ExtractionResult,
  selectedAreaId: string | null,
  onSelect: (suggestion: { label: string; areaId: string }) => void,
): InlineSuggestion[] =>
  result.reviewSuggestions.areaSuggestions.map((item) => ({
    id: item.areaId,
    label: item.displayName,
    meta: friendlySuggestionMeta(item.matchType, item.confidence),
    selected: item.areaId === selectedAreaId,
    onPress: () => onSelect({ label: item.displayName, areaId: item.areaId }),
  }));

const dueDateInlineSuggestions = (
  result: Phase4ExtractionResult,
): InlineSuggestion[] =>
  result.reviewSuggestions.spokenDueDateText
    ? [
        {
          id: "spoken-due-date",
          label: result.reviewSuggestions.spokenDueDateText,
          meta: "spoken",
        },
      ]
    : [];

const tagInlineSuggestions = (
  result: Phase4ExtractionResult,
  selectedTagCodes: string[],
  onToggle: (suggestion: { label: Phase4TaskTag; tagCode: string }) => void,
): InlineSuggestion[] =>
  result.reviewSuggestions.tagSuggestions.map((item) => ({
    id: item.tagCode,
    label: item.displayName,
    meta: item.confidence,
    selected: selectedTagCodes.includes(item.tagCode),
    onPress: () =>
      onToggle({ label: item.displayName, tagCode: item.tagCode }),
  }));

const friendlySuggestionMeta = (matchType: string, confidence: string) =>
  `${matchType} / ${confidence}`;

const toggleEditableDraftTag = (
  draft: EditableDraft,
  suggestion: { label: Phase4TaskTag; tagCode: string },
): EditableDraft => {
  const selected = draft.tagCodes.includes(suggestion.tagCode);
  const nextTagCodes = selected
    ? draft.tagCodes.filter((code) => code !== suggestion.tagCode)
    : [...draft.tagCodes, suggestion.tagCode];
  const currentTags = splitTags(draft.tags);
  const nextTags = selected
    ? currentTags.filter((tag) => tag !== suggestion.label)
    : Array.from(new Set([...currentTags, suggestion.label]));

  return {
    ...draft,
    tags: nextTags.join(", "),
    tagCodes: nextTagCodes,
  };
};

const fieldStatusForExtractionStep = (
  step: Phase4ExtractionProgressStep,
): FieldWorkflowStatus => {
  if (step === "preparing_transcript") {
    return "preparing_transcript";
  }
  if (step === "preparing_runtime" || step === "retrieving_context") {
    return "retrieving_context";
  }
  return "extracting_with_llm";
};

const messageForExtractionStep = (step: Phase4ExtractionProgressStep) => {
  if (step === "preparing_transcript") {
    return "Preparing transcript.";
  }
  if (step === "preparing_runtime") {
    return "Loading project retrieval.";
  }
  if (step === "retrieving_context") {
    return "Retrieving project context.";
  }
  if (step === "building_llm_input") {
    return "Preparing local LLM input.";
  }
  if (step === "running_llm") {
    return "Local LLM is creating the draft.";
  }
  return "Checking draft suggestions.";
};

const statusLabel = (status: FieldWorkflowStatus, asrStatus: string) => {
  if (status === "loading_context") {
    return "Loading project data";
  }
  if (status === "ready_to_record") {
    return "Tap to record";
  }
  if (status === "recording") {
    return "Listening";
  }
  if (status === "transcribing") {
    return "Transcribing";
  }
  if (status === "preparing_transcript") {
    return "Preparing transcript";
  }
  if (status === "retrieving_context") {
    return "Retrieving context";
  }
  if (status === "extracting_with_llm") {
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

function UserSelector({
  users,
  selectedUser,
  selectedProjectName,
  disabled,
  open,
  onToggle,
  onSelect,
}: {
  users: Phase4SeedUser[];
  selectedUser: Phase4SeedUser | null;
  selectedProjectName: string;
  disabled: boolean;
  open: boolean;
  onToggle: () => void;
  onSelect: (userId: string) => void;
}) {
  return (
    <View style={styles.userSelector}>
      <Pressable
        disabled={disabled}
        onPress={onToggle}
        style={[
          styles.userSelectorButton,
          open && styles.userSelectorButtonOpen,
          disabled && styles.modeChipDisabled,
        ]}
      >
        <View style={styles.userSelectorTextBlock}>
          <Text style={styles.selectorLabel}>Worker</Text>
          <Text style={styles.selectorValue}>
            {selectedUser?.display_name ?? "Select user"}
          </Text>
          <Text style={styles.selectorSubValue}>{selectedProjectName}</Text>
        </View>
        <IconSymbol name="chevron.down" size={18} color={C.primary} />
      </Pressable>
      {open ? (
        <View style={styles.userOptionList}>
          {users.map((user) => (
            <Pressable
              key={user.user_id}
              onPress={() => onSelect(user.user_id)}
              style={[
                styles.userOption,
                selectedUser?.user_id === user.user_id &&
                  styles.userOptionSelected,
              ]}
            >
              <Text style={styles.userOptionName}>{user.display_name}</Text>
              <Text style={styles.userOptionMeta}>
                {user.role_type ?? "Worker"} /{" "}
                {user.default_language === "fi" ? "Finnish" : "English"}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

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

function ProcessingPanel({
  status,
  detail,
}: {
  status: FieldWorkflowStatus;
  detail?: string | null;
}) {
  const { title, body } = processingCopy(status, detail);

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

const processingCopy = (
  status: FieldWorkflowStatus,
  detail?: string | null,
) => {
  if (status === "loading_context") {
    return {
      title: "Loading project data",
      body: detail ?? "Preparing the selected worker project.",
    };
  }
  if (status === "transcribing") {
    return {
      title: "Transcribing",
      body: "Finalizing the recorded speech.",
    };
  }
  if (status === "preparing_transcript") {
    return {
      title: "Preparing transcript",
      body: "Cleaning the captured text for extraction.",
    };
  }
  if (status === "retrieving_context") {
    return {
      title: "Retrieving context",
      body: "Finding matching project data for this report.",
    };
  }
  return {
    title: "Creating draft",
    body: "The local LLM is extracting task details.",
  };
};

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
        style={[styles.modeChipText, selected && styles.modeChipTextSelected]}
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
  suggestions,
  multiline,
  onChangeText,
  onSelectSuggestion,
}: {
  label: string;
  value: string;
  status: string;
  suggestions?: InlineSuggestion[];
  multiline?: boolean;
  onChangeText: (text: string) => void;
  onSelectSuggestion?: (suggestion: InlineSuggestion) => void;
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
      <InlineSuggestions
        suggestions={suggestions ?? []}
        onSelectSuggestion={onSelectSuggestion}
      />
    </View>
  );
}

function InlineSuggestions({
  suggestions,
  onSelectSuggestion,
}: {
  suggestions: InlineSuggestion[];
  onSelectSuggestion?: (suggestion: InlineSuggestion) => void;
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.inlineSuggestionList}>
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion.id}
          onPress={() => {
            suggestion.onPress?.();
            onSelectSuggestion?.(suggestion);
          }}
          style={[
            styles.inlineSuggestionItem,
            suggestion.selected && styles.inlineSuggestionItemSelected,
          ]}
        >
          <Text style={styles.inlineSuggestionLabel}>{suggestion.label}</Text>
          {suggestion.meta ? (
            <Text style={styles.inlineSuggestionMeta}>{suggestion.meta}</Text>
          ) : null}
        </Pressable>
      ))}
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
  userSelector: {
    gap: 8,
  },
  userSelectorButton: {
    minHeight: 66,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
  },
  userSelectorButtonOpen: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  userSelectorTextBlock: {
    flex: 1,
    gap: 2,
  },
  selectorLabel: {
    color: C.textSubtle,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  selectorValue: {
    color: C.text,
    fontSize: 17,
    fontWeight: "900",
  },
  selectorSubValue: {
    color: C.textSubtle,
    fontSize: 13,
    fontWeight: "700",
  },
  userOptionList: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.surface,
    overflow: "hidden",
  },
  userOption: {
    gap: 3,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  userOptionSelected: {
    backgroundColor: C.primarySoft,
  },
  userOptionName: {
    color: C.text,
    fontSize: 15,
    fontWeight: "900",
  },
  userOptionMeta: {
    color: C.textSubtle,
    fontSize: 12,
    fontWeight: "700",
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
    gap: 6,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    gap: 7,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontSize: 10,
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
  contextPanel: {
    gap: 8,
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
  inlineSuggestionList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  inlineSuggestionItem: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    backgroundColor: C.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  inlineSuggestionItemSelected: {
    backgroundColor: C.primarySoft,
    borderColor: C.primary,
  },
  inlineSuggestionLabel: {
    color: C.text,
    fontSize: 13,
    fontWeight: "900",
  },
  inlineSuggestionMeta: {
    color: C.primary,
    fontSize: 11,
    fontWeight: "800",
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
