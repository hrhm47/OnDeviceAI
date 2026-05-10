import { IconSymbol } from "@/components/ui/icon-symbol";
import { FieldColors as C } from "@/constants/theme";
import { useSpeechStore } from "@/src/store/useSpeechStore";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const savedItems = [
  {
    id: "D-104",
    title: "Water leak near stairwell B",
    type: "Draft report",
    status: "Draft",
    updated: "Today 14:20",
    model: "Whisper",
  },
  {
    id: "T-087",
    title: "Temporary guardrail missing",
    type: "ASR result",
    status: "Tested",
    updated: "Yesterday 16:05",
    model: "Native ASR",
  },
  {
    id: "R-041",
    title: "Concrete delivery delay",
    type: "Report",
    status: "Reviewed",
    updated: "Friday 09:10",
    model: "Whisper",
  },
  {
    id: "R-033",
    title: "Blocked access route at gate 3",
    type: "Report",
    status: "Confirmed",
    updated: "Thursday 12:42",
    model: "Native ASR",
  },
];

export default function DraftsScreen() {
  const { history } = useSpeechStore();
  const [report, setReport] = useState({
    type: "Safety observation",
    title: "Water leak near stairwell B",
    description:
      "Water has collected near stairwell B on level 2. The walking surface is slippery beside the temporary partition. Area should be marked and dried before work continues.",
    location: "Helsinki site 04 / Level 2 / Stairwell B",
    category: "Safety / housekeeping",
    urgency: "High",
    responsible: "Site maintenance team",
  });

  const items = useMemo(() => {
    const transcriptItems = history.slice(0, 2).map((item, index) => ({
      id: `T-${String(index + 1).padStart(3, "0")}`,
      title: item.aiOutput || "Saved transcript",
      type: "ASR result",
      status: "Tested",
      updated: new Date(item.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      model: item.model.toUpperCase(),
    }));

    return transcriptItems.length > 0 ? [...transcriptItems, ...savedItems] : savedItems;
  }, [history]);

  const updateField = (key: keyof typeof report, value: string) => {
    setReport((current) => ({ ...current, [key]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Saved drafts and report preview</Text>
          <Text style={styles.title}>Resume field work</Text>
          <Text style={styles.subtitle}>
            Saved transcripts and report drafts stay easy to scan, edit, and
            confirm.
          </Text>
        </View>

        <View style={styles.savedHeader}>
          <Text style={styles.sectionTitle}>Saved drafts / results</Text>
          <Text style={styles.sectionMeta}>{items.length} items</Text>
        </View>

        <View style={styles.savedList}>
          {items.map((item) => (
            <Pressable key={item.id} style={styles.savedCard}>
              <View style={styles.savedTop}>
                <View style={styles.savedIcon}>
                  <IconSymbol
                    size={22}
                    name={item.type === "ASR result" ? "doc.text.fill" : "folder.fill"}
                    color={C.primary}
                  />
                </View>
                <View style={styles.savedTextBlock}>
                  <Text style={styles.savedTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.savedMeta}>
                    {item.id} / {item.type} / {item.model}
                  </Text>
                </View>
                <StatusTag status={item.status} />
              </View>
              <Text style={styles.savedUpdated}>Updated {item.updated}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View>
              <Text style={styles.cardTitle}>Autofill preview</Text>
              <Text style={styles.previewSub}>
                Worker reviews and edits before confirmation.
              </Text>
            </View>
            <View style={styles.warningPill}>
              <IconSymbol
                size={16}
                name="exclamationmark.triangle.fill"
                color={C.warning}
              />
              <Text style={styles.warningText}>2 uncertain</Text>
            </View>
          </View>

          <EditableField
            icon="doc.text.fill"
            label="Report type"
            value={report.type}
            onChangeText={(value) => updateField("type", value)}
          />
          <EditableField
            icon="square.and.pencil"
            label="Title"
            value={report.title}
            onChangeText={(value) => updateField("title", value)}
          />
          <EditableField
            icon="list.bullet.rectangle"
            label="Description"
            value={report.description}
            onChangeText={(value) => updateField("description", value)}
            multiline
          />
          <EditableField
            icon="location.fill"
            label="Location"
            value={report.location}
            onChangeText={(value) => updateField("location", value)}
          />
          <EditableField
            icon="tag.fill"
            label="Category"
            value={report.category}
            onChangeText={(value) => updateField("category", value)}
            warning="Confirm category"
          />
          <EditableField
            icon="flag.fill"
            label="Urgency"
            value={report.urgency}
            onChangeText={(value) => updateField("urgency", value)}
          />
          <EditableField
            icon="person.2.fill"
            label="Responsible party"
            value={report.responsible}
            onChangeText={(value) => updateField("responsible", value)}
            warning="Low confidence"
          />

          <View style={styles.photoPlaceholder}>
            <IconSymbol size={24} name="camera.fill" color={C.textSubtle} />
            <View style={styles.photoTextBlock}>
              <Text style={styles.photoTitle}>Attachment / photo</Text>
              <Text style={styles.photoSub}>No photo attached yet</Text>
            </View>
            <Text style={styles.addPhoto}>Add</Text>
          </View>

          <View style={styles.previewButtons}>
            <Pressable style={styles.outlineButton}>
              <Text style={styles.outlineButtonText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.draftButton}>
              <Text style={styles.draftButtonText}>Save draft</Text>
            </Pressable>
            <Pressable style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusTag({ status }: { status: string }) {
  const isConfirmed = status === "Confirmed";
  const isReviewed = status === "Reviewed";
  const isTested = status === "Tested";
  return (
    <View
      style={[
        styles.statusTag,
        isConfirmed && styles.statusTagConfirmed,
        isReviewed && styles.statusTagReviewed,
        isTested && styles.statusTagTested,
      ]}
    >
      <Text
        style={[
          styles.statusTagText,
          isConfirmed && styles.statusTagTextConfirmed,
          isReviewed && styles.statusTagTextReviewed,
          isTested && styles.statusTagTextTested,
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

function EditableField({
  icon,
  label,
  value,
  onChangeText,
  multiline,
  warning,
}: {
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  warning?: string;
}) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIcon}>
        <IconSymbol size={20} name={icon} color={C.primary} />
      </View>
      <View style={styles.fieldBody}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {warning ? <Text style={styles.fieldWarning}>{warning}</Text> : null}
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
          placeholderTextColor={C.textSubtle}
        />
      </View>
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
  savedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: C.text,
    fontSize: 19,
    fontWeight: "900",
  },
  sectionMeta: {
    color: C.textSubtle,
    fontSize: 13,
    fontWeight: "800",
  },
  savedList: {
    gap: 12,
  },
  savedCard: {
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  savedTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  savedIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  savedTextBlock: {
    flex: 1,
  },
  savedTitle: {
    color: C.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
  },
  savedMeta: {
    color: C.textSubtle,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  savedUpdated: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  statusTag: {
    backgroundColor: C.warningSoft,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusTagConfirmed: {
    backgroundColor: C.successSoft,
  },
  statusTagReviewed: {
    backgroundColor: C.primarySoft,
  },
  statusTagTested: {
    backgroundColor: C.tealSoft,
  },
  statusTagText: {
    color: C.warning,
    fontSize: 12,
    fontWeight: "900",
  },
  statusTagTextConfirmed: {
    color: C.success,
  },
  statusTagTextReviewed: {
    color: C.primary,
  },
  statusTagTextTested: {
    color: C.teal,
  },
  previewCard: {
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 14,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: "900",
  },
  previewSub: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  warningPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.warningSoft,
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  warningText: {
    color: C.warning,
    fontSize: 12,
    fontWeight: "900",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceWarm,
    padding: 12,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldBody: {
    flex: 1,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  fieldLabel: {
    color: C.textSubtle,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  fieldWarning: {
    color: C.warning,
    fontSize: 12,
    fontWeight: "900",
  },
  fieldInput: {
    color: C.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
    padding: 0,
    marginTop: 6,
  },
  fieldInputMultiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  photoPlaceholder: {
    minHeight: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.borderStrong,
    backgroundColor: C.surfaceWarm,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  photoTextBlock: {
    flex: 1,
  },
  photoTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "900",
  },
  photoSub: {
    color: C.textSubtle,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  addPhoto: {
    color: C.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  previewButtons: {
    flexDirection: "row",
    gap: 10,
  },
  outlineButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: {
    color: C.text,
    fontSize: 15,
    fontWeight: "900",
  },
  draftButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: C.neutralDark,
    alignItems: "center",
    justifyContent: "center",
  },
  draftButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  confirmButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: C.success,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
