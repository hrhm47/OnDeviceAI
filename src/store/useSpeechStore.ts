import { SupportedModel, whisperModels } from '@/constants/types/ModelTypes';
import { create } from 'zustand';
import { calculateWER, WERResult } from '../utils/metrics';



interface Metrics {
  werDetails: WERResult | null;
  ttfsMs: number | null;
  processingTimeMs: number | null;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  model: SupportedModel;
  groundTruth: string;
  aiOutput: string;
  werDetails: WERResult;
  ttfsMs: number | null;
  processingTimeMs: number | null;
}

let transcriptionData = "";

export const setTranscriptionDataFunc = (data: string) => {
  transcriptionData += (data);
}

export const getTranscriptionDataFunc = () => {
  return transcriptionData;
}

interface SpeechState {
  // Config
  activeModel: SupportedModel;
  setActiveModel: (model: SupportedModel) => void;
  // whisperModel: whisperSupportedModels[];
  // setWhisperModel: (model: string[]) => void;
  //  'base'
  whisperActiveModel: whisperModels;
  setwhisperActiveModel: (model: whisperModels) => void;

  // State
  isRecording: boolean;
  setRecording: (recording: boolean) => void;

  // Transcripts
  liveTranscript: string;
  finalTranscript: string;
  groundTruthText: string;
  setLiveTranscript: (text: any) => void;
  setFinalTranscript: (text: any) => void;
  setGroundTruthText: (text: string) => void;

  // Benchmarking Trackers
  startTime: number | null;
  firstSymbolTime: number | null;
  startBenchmarkingTimer: () => void;
  registerFirstSymbol: () => void;

  // Results & History
  metrics: Metrics;
  history: HistoryItem[];
  finalizeMetrics: (finalTranscriptOverride?: string) => void;
  resetSession: () => void;
}

export const useSpeechStore = create<SpeechState>((set, get) => ({
  activeModel: 'native',
  setActiveModel: (model) => set({ activeModel: model }),

  // whisperModel:()=> ['base'],
  // setWhisperModel: (model) => set({ whisperModel: model }),
  whisperActiveModel: 'base',
  setwhisperActiveModel: (model) => set({ whisperActiveModel: model }),

  isRecording: false,
  setRecording: (recording) => set({ isRecording: recording }),

  liveTranscript: '',
  finalTranscript: '',
  groundTruthText: 'The quick brown fox jumps over the lazy dog in the construction site.',
  setLiveTranscript: (text) => set({ liveTranscript: text }),
  setFinalTranscript: (text) => set({ finalTranscript: text }),
  setGroundTruthText: (text) => set({ groundTruthText: text }),

  startTime: null,
  firstSymbolTime: null,

  startBenchmarkingTimer: () => {
    set({ startTime: performance.now(), firstSymbolTime: null, liveTranscript: '', finalTranscript: '', metrics: { werDetails: null, ttfsMs: null, processingTimeMs: null } });
  },

  registerFirstSymbol: () => {
    const { firstSymbolTime, startTime } = get();
    if (!firstSymbolTime && startTime) {
      set({ firstSymbolTime: performance.now() });
    }
  },

  metrics: { werDetails: null, ttfsMs: null, processingTimeMs: null },
  history: [],

  finalizeMetrics: (finalTranscriptOverride) => {
    const { startTime, firstSymbolTime, liveTranscript, finalTranscript, groundTruthText, activeModel, history } = get();
    const endTime = performance.now();

    let ttfsMs = null;
    if (startTime && firstSymbolTime) {
      ttfsMs = firstSymbolTime - startTime;
    }

    let processingTimeMs = null;
    if (startTime) {
      processingTimeMs = endTime - startTime;
    }

    const resolvedTranscript = finalTranscriptOverride || finalTranscript || liveTranscript;
    const werDetails = calculateWER(groundTruthText, resolvedTranscript);

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      model: activeModel,
      groundTruth: groundTruthText,
      aiOutput: resolvedTranscript,
      werDetails,
      ttfsMs,
      processingTimeMs,
    };

    set({
      metrics: { ttfsMs, processingTimeMs, werDetails },
      history: [newItem, ...history]
    });
  },

  resetSession: () => set({
    liveTranscript: '', finalTranscript: '',
    startTime: null, firstSymbolTime: null,
    metrics: { werDetails: null, ttfsMs: null, processingTimeMs: null }
  })
}));
