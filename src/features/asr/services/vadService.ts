import type { VADMetrics } from "../types/asr.types";

export type VADStatus =
  | "idle"
  | "listening"
  | "speech-detected"
  | "silence"
  | "processing-segment"
  | "unsupported"
  | "error";

export type VADConfig = {
  sampleRate: number;
  frameDurationMs: number;
  speechThreshold: number;
  minSpeechDurationMs: number;
  silenceTimeoutMs: number;
  preSpeechPaddingMs: number;
  maxSegmentDurationMs: number;
};

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
  onSegmentReady?: (segment: VADSpeechSegment) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: VADStatus) => void;
};

export const DEFAULT_VAD_CONFIG: VADConfig = {
  sampleRate: 16000,
  frameDurationMs: 30,
  speechThreshold: 0.012,
  minSpeechDurationMs: 200,
  silenceTimeoutMs: 700,
  preSpeechPaddingMs: 200,
  maxSegmentDurationMs: 12000,
};

type BufferedChunk = {
  samples: Float32Array;
  durationMs: number;
  rms: number;
  startedAtMs: number;
};

export class VADService {
  private events: VADEvents;
  private config: VADConfig;
  private listening = false;
  private inSpeech = false;
  private pendingSpeech = false;
  private preSpeechChunks: BufferedChunk[] = [];
  private currentSegmentChunks: BufferedChunk[] = [];
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

  constructor(events: VADEvents = {}, config: Partial<VADConfig> = {}) {
    this.events = events;
    this.config = {
      ...DEFAULT_VAD_CONFIG,
      ...config,
    };
  }

  setEvents(events: VADEvents) {
    this.events = events;
  }

  setConfig(config: Partial<VADConfig>) {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  startListening() {
    this.resetState();
    this.listening = true;
    this.emitStatus("listening");
  }

  acceptAudioChunk(chunk: Float32Array, sampleRate = this.config.sampleRate) {
    if (!this.listening || chunk.length === 0) {
      return;
    }

    try {
      const durationMs = (chunk.length / sampleRate) * 1000;
      const bufferedChunk: BufferedChunk = {
        samples: chunk,
        durationMs,
        rms: calculateRms(chunk),
        startedAtMs: this.timelineMs,
      };
      const isSpeech = bufferedChunk.rms >= this.config.speechThreshold;

      if (isSpeech) {
        this.handleSpeechChunk(bufferedChunk);
      } else {
        this.handleSilenceChunk(bufferedChunk);
      }

      this.timelineMs += durationMs;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emitStatus("error");
      this.events.onError?.(message);
    }
  }

  stopListening() {
    if (this.inSpeech || this.pendingSpeech) {
      this.finishCurrentSegment();
    }

    this.listening = false;
    this.emitStatus("idle");
  }

  getMetrics(): VADMetrics {
    return {
      speechStartCount: this.speechStartCount,
      speechEndCount: this.speechEndCount,
      speechDurationMs: this.totalSpeechDurationMs,
      silenceDurationMs: this.totalSilenceDurationMs,
      segmentCount: this.segmentCount,
    };
  }

  private handleSpeechChunk(chunk: BufferedChunk) {
    if (!this.inSpeech && !this.pendingSpeech) {
      this.pendingSpeech = true;
      this.currentSegmentStartMs =
        this.preSpeechChunks[0]?.startedAtMs ?? chunk.startedAtMs;
      this.currentSegmentChunks = [...this.preSpeechChunks];
      this.preSpeechChunks = [];
      this.currentSegmentSpeechMs = 0;
      this.currentSegmentRmsTotal = 0;
      this.currentSegmentRmsCount = 0;
    }

    this.trailingSilenceMs = 0;
    this.currentSegmentChunks.push(chunk);
    this.currentSegmentSpeechMs += chunk.durationMs;
    this.totalSpeechDurationMs += chunk.durationMs;
    this.currentSegmentRmsTotal += chunk.rms;
    this.currentSegmentRmsCount += 1;

    if (!this.inSpeech && this.currentSegmentSpeechMs >= this.config.minSpeechDurationMs) {
      this.inSpeech = true;
      this.pendingSpeech = false;
      this.speechStartCount += 1;
      this.emitStatus("speech-detected");
      this.events.onSpeechStart?.();
    }

    if (this.inSpeech) {
      this.events.onSpeechChunk?.(chunk.samples);
    }

    if (this.getCurrentSegmentDurationMs() >= this.config.maxSegmentDurationMs) {
      this.finishCurrentSegment();
    }
  }

  private handleSilenceChunk(chunk: BufferedChunk) {
    this.totalSilenceDurationMs += chunk.durationMs;
    this.events.onSilence?.();

    if (!this.inSpeech && !this.pendingSpeech) {
      this.preSpeechChunks.push(chunk);
      this.trimPreSpeechBuffer();
      this.emitStatus("silence");
      return;
    }

    if (this.pendingSpeech) {
      this.clearCurrentSegment();
      this.preSpeechChunks.push(chunk);
      this.trimPreSpeechBuffer();
      this.emitStatus("silence");
      return;
    }

    this.trailingSilenceMs += chunk.durationMs;
    if (this.trailingSilenceMs >= this.config.silenceTimeoutMs) {
      this.finishCurrentSegment();
      this.emitStatus("silence");
    }
  }

  private finishCurrentSegment() {
    if (
      this.currentSegmentSpeechMs < this.config.minSpeechDurationMs ||
      this.currentSegmentChunks.length === 0 ||
      this.currentSegmentStartMs === null
    ) {
      this.clearCurrentSegment();
      return;
    }

    const samples = mergeChunks(
      this.currentSegmentChunks.map((chunk) => chunk.samples),
    );
    const durationMs = (samples.length / this.config.sampleRate) * 1000;
    const segment: VADSpeechSegment = {
      id: `segment-${Date.now()}-${this.segmentCount + 1}`,
      samples,
      sampleRate: this.config.sampleRate,
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
    this.events.onSegmentReady?.(segment);
    this.clearCurrentSegment();
  }

  private clearCurrentSegment() {
    this.inSpeech = false;
    this.pendingSpeech = false;
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
    this.preSpeechChunks = [];
    this.speechStartCount = 0;
    this.speechEndCount = 0;
    this.totalSpeechDurationMs = 0;
    this.totalSilenceDurationMs = 0;
    this.segmentCount = 0;
    this.timelineMs = 0;
  }

  private trimPreSpeechBuffer() {
    let bufferedMs = this.preSpeechChunks.reduce(
      (sum, chunk) => sum + chunk.durationMs,
      0,
    );

    while (
      bufferedMs > this.config.preSpeechPaddingMs &&
      this.preSpeechChunks.length > 0
    ) {
      const removed = this.preSpeechChunks.shift();
      bufferedMs -= removed?.durationMs ?? 0;
    }
  }

  private getCurrentSegmentDurationMs() {
    return this.currentSegmentChunks.reduce(
      (sum, chunk) => sum + chunk.durationMs,
      0,
    );
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
