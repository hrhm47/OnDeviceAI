import { createRecognizer, getResult, start, stop } from 'sherpa-onnx';
import { ASREngine, ASRResult } from './types';

export class SherpaEngine implements ASREngine {
  private recognizer: any = null;
  private isRecording = false;
  private pollInterval: any = null;

  async init(paths?: { encoder: string; decoder: string; joiner: string; tokens: string }): Promise<void> {
    // Provide actual ONNX model paths (Zipformer/Transducer) here
    this.recognizer = await createRecognizer({
      featConfig: { sampleRate: 16000, featureDim: 80 },
      modelConfig: {
        transducer: {
          encoder: paths?.encoder || 'encoder.onnx',
          decoder: paths?.decoder || 'decoder.onnx',
          joiner: paths?.joiner || 'joiner.onnx',
        },
        tokens: paths?.tokens || 'tokens.txt',
        numThreads: 4,
        debug: false,
      },
      decoderConfig: { decodingMethod: 'greedy_search', numActivePaths: 4 },
      enableEndpoint: true,
      rule1MinTrailingSilence: 2.4,
      rule2MinTrailingSilence: 1.2,
      rule3MinUtteranceLength: 20,
    });
  }

  async start(onResult: (result: ASRResult) => void, onError: (err: Error) => void): Promise<void> {
    if (!this.recognizer) {
      onError(new Error('Sherpa-ONNX recognizer not initialized'));
      return;
    }
    
    try {
      this.isRecording = true;
      await start(this.recognizer);

      // Simple polling mechanism to grab live sherpa results
      this.pollInterval = setInterval(async () => {
        if (!this.isRecording) return;
        const text = await getResult(this.recognizer);
        if (text) onResult({ text, isFinal: false });
      }, 500);

    } catch (err) {
      onError(err as Error);
    }
  }

  async stop(): Promise<void> {
    this.isRecording = false;
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.recognizer) {
      await stop(this.recognizer);
    }
  }

  async destroy(): Promise<void> {
    await this.stop();
  }
}
