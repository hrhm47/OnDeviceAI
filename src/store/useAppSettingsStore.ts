import * as FileSystem from "expo-file-system/legacy";
import { create } from "zustand";

type AppSettings = {
  fieldUiEnabled: boolean;
};

type AppSettingsState = AppSettings & {
  hasLoaded: boolean;
  loadSettings: () => Promise<void>;
  setFieldUiEnabled: (enabled: boolean) => Promise<void>;
};

const SETTINGS_DIR_NAME = "app-settings";
const SETTINGS_FILE_NAME = "settings.json";

const defaultSettings: AppSettings = {
  fieldUiEnabled: false,
};

const getSettingsFileUri = () => {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is unavailable for app settings.");
  }

  return {
    settingsDir: `${documentDirectory}${SETTINGS_DIR_NAME}/`,
    settingsFile: `${documentDirectory}${SETTINGS_DIR_NAME}/${SETTINGS_FILE_NAME}`,
  };
};

const ensureSettingsDir = async () => {
  const { settingsDir } = getSettingsFileUri();
  await FileSystem.makeDirectoryAsync(settingsDir, { intermediates: true }).catch(
    async (error) => {
      const info = await FileSystem.getInfoAsync(settingsDir);
      if (!info.exists) {
        throw error;
      }
    },
  );
};

const readSettings = async (): Promise<AppSettings> => {
  const { settingsFile } = getSettingsFileUri();
  const info = await FileSystem.getInfoAsync(settingsFile);
  if (!info.exists) {
    return defaultSettings;
  }

  try {
    const text = await FileSystem.readAsStringAsync(settingsFile);
    const parsed = JSON.parse(text) as Partial<AppSettings>;
    return {
      ...defaultSettings,
      fieldUiEnabled: Boolean(parsed.fieldUiEnabled),
    };
  } catch (error) {
    console.warn("Failed to read app settings", error);
    return defaultSettings;
  }
};

const writeSettings = async (settings: AppSettings) => {
  await ensureSettingsDir();
  const { settingsFile } = getSettingsFileUri();
  await FileSystem.writeAsStringAsync(
    settingsFile,
    JSON.stringify(settings, null, 2),
  );
};

export const useAppSettingsStore = create<AppSettingsState>((set, get) => ({
  ...defaultSettings,
  hasLoaded: false,

  loadSettings: async () => {
    const settings = await readSettings();
    set({ ...settings, hasLoaded: true });
  },

  setFieldUiEnabled: async (enabled) => {
    const previousEnabled = get().fieldUiEnabled;
    const nextSettings = {
      fieldUiEnabled: enabled,
    };
    set(nextSettings);
    try {
      await writeSettings(nextSettings);
    } catch (error) {
      set({ fieldUiEnabled: previousEnabled });
      throw error;
    }
  },
}));
