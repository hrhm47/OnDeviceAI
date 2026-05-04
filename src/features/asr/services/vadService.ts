import type { VADMetrics } from "../types/asr.types";

export type VADStatus =
  | "idle"
  | "listening"
  | "speech-detected"
  | "silence"
  | "processing-segment"
  | "error";

export type VADSpeechSegment = {
  id: string;
  samples: Float32Array;
  sampleRate: number;
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
  rms: number;
};

export type VADEvents = {
  onSpeechStart?: () => void;
  onSpeechEnd?: (segment: VADSpeechSegment) => void;
  onSpeechChunk?: (chunk: Float32Array) => void;
  onSilence?: () => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: VADStatus) => void;
};

export type VADOptions = {
  sampleRate?: number;
  speechThresholdRms?: number;
  minSpeechDurationMs?: number;
  minSilenceDurationMs?: number;
};

const DEFAULT_SAMPLE_RATE = 16000;
const DEFAULT_SPEECH_THRESHOLD_RMS = 0.012;
const DEFAULT_MIN_SPEECH_DURATION_MS = 120;
const DEFAULT_MIN_SILENCE_DURATION_MS = 650;

export class VADService {
  private events: VADEvents;
  private options: Required<VADOptions>;
  private listening = false;
  private inSpeech = false;
  private currentSegmentChunks: Float32Array[] = [];
  private currentSegmentStartMs: number | null = null;
  private currentSegmentSpeechMs = 0;
  private currentSegmentRmsTotal = 0;
  private currentSegmentRmsCount = 0;
  private trailingSilenceMs = 0;
  private speechStartCount = 0;
  private speechEndCount = 0;
  private totalSpeechDurationMs = 0;
  private totalSilenceDurationMs = 0;
  private segmentCount = 0;
  private timelineMs = 0;

  constructor(events: VADEvents = {}, options: VADOptions = {}) {
    this.events = events;
    this.options = {
      sampleRate: options.sampleRate ?? DEFAULT_SAMPLE_RATE,
      speechThresholdRms:
        options.speechThresholdRms ?? DEFAULT_SPEECH_THRESHOLD_RMS,
      minSpeechDurationMs:
        options.minSpeechDurationMs ?? DEFAULT_MIN_SPEECH_DURATION_MS,
      minSilenceDurationMs:
        options.minSilenceDurationMs ?? DEFAULT_MIN_SILENCE_DURATION_MS,
    };
  }

  setEvents(events: VADEvents) {
    this.events = events;
  }

  startListening() {
    this.resetState();
    this.listening = true;
    this.emitStatus("listening");
  }

  acceptAudioChunk(chunk: Float32Array, sampleRate = this.options.sampleRate) {
    if (!this.listening || chunk.length === 0) {
      return;
    }

    try {
      const durationMs = (chunk.length / sampleRate) * 1000;
      const rms = calculateRms(chunk);
      const isSpeech = rms >= this.options.speechThresholdRms;

      if (isSpeech) {
        this.handleSpeechChunk(chunk, sampleRate, durationMs, rms);
      } else {
        this.handleSilenceChunk(durationMs);
      }

      this.timelineMs += durationMs;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emitStatus("error");
      this.events.onError?.(message);
    }
  }

  stopListening() {
    if (this.inSpeech) {
      this.finishCurrentSegment();
    }

    this.listening = false;
    this.emitStatus("idle");
  }

  getMetrics(): VADMetrics {
    return {
      vadSpeechStartCount: this.speechStartCount,
      vadSpeechEndCount: this.speechEndCount,
      totalSpeechDurationMs: this.totalSpeechDurationMs,
      totalSilenceDurationMs: this.totalSilenceDurationMs,
      segmentCount: this.segmentCount,
    };
  }

  private handleSpeechChunk(
    chunk: Float32Array,
    sampleRate: number,
    durationMs: number,
    rms: number,
  ) {
    if (!this.inSpeech) {
      this.inSpeech = true;
      this.currentSegmentStartMs = this.timelineMs;
      this.currentSegmentSpeechMs = 0;
      this.currentSegmentRmsTotal = 0;
      this.currentSegmentRmsCount = 0;
      this.speechStartCount += 1;
      this.emitStatus("speech-detected");
      this.events.onSpeechStart?.();
    }

    this.trailingSilenceMs = 0;
    this.currentSegmentChunks.push(chunk);
    this.currentSegmentSpeechMs += durationMs;
    this.totalSpeechDurationMs += durationMs;
    this.currentSegmentRmsTotal += rms;
    this.currentSegmentRmsCount += 1;
    this.events.onSpeechChunk?.(chunk);
  }

  private handleSilenceChunk(durationMs: number) {
    this.totalSilenceDurationMs += durationMs;
    this.events.onSilence?.();

    if (!this.inSpeech) {
      this.emitStatus("silence");
      return;
    }

    this.trailingSilenceMs += durationMs;
    if (this.trailingSilenceMs >= this.options.minSilenceDurationMs) {
      this.finishCurrentSegment();
      this.emitStatus("silence");
    }
  }

  private finishCurrentSegment() {
    if (
      this.currentSegmentSpeechMs < this.options.minSpeechDurationMs ||
      this.currentSegmentChunks.length === 0 ||
      this.currentSegmentStartMs === null
    ) {
      this.clearCurrentSegment();
      return;
    }

    const samples = mergeChunks(this.currentSegmentChunks);
    const durationMs = (samples.length / this.options.sampleRate) * 1000;
    const segment: VADSpeechSegment = {
      id: `segment-${Date.now()}-${this.segmentCount + 1}`,
      samples,
      sampleRate: this.options.sampleRate,
      startedAtMs: this.currentSegmentStartMs,
      endedAtMs: this.currentSegmentStartMs + durationMs,
      durationMs,
      rms:
        this.currentSegmentRmsCount === 0
          ? 0
          : this.currentSegmentRmsTotal / this.currentSegmentRmsCount,
    };

    this.segmentCount += 1;
    this.speechEndCount += 1;
    this.emitStatus("processing-segment");
    this.events.onSpeechEnd?.(segment);
    this.clearCurrentSegment();
  }

  private clearCurrentSegment() {
    this.inSpeech = false;
    this.currentSegmentChunks = [];
    this.currentSegmentStartMs = null;
    this.currentSegmentSpeechMs = 0;
    this.currentSegmentRmsTotal = 0;
    this.currentSegmentRmsCount = 0;
    this.trailingSilenceMs = 0;
  }

  private resetState() {
    this.listening = false;
    this.clearCurrentSegment();
    this.speechStartCount = 0;
    this.speechEndCount = 0;
    this.totalSpeechDurationMs = 0;
    this.totalSilenceDurationMs = 0;
    this.segmentCount = 0;
    this.timelineMs = 0;
  }

  private emitStatus(status: VADStatus) {
    this.events.onStatusChange?.(status);
  }
}

export const mergeChunks = (chunks: Float32Array[]) => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
};

const calculateRms = (samples: Float32Array) => {
  let sum = 0;

  for (let index = 0; index < samples.length; index += 1) {
    sum += samples[index] * samples[index];
  }

  return Math.sqrt(sum / samples.length);
};
