export interface ASRResult {
  text: string;
  isFinal: boolean;
}

export interface ASREngine {
  init(): Promise<void>;
  start(onResult: (result: ASRResult) => void, onError: (err: Error) => void, audioUri?: string): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
}
