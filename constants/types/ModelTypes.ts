

type whisperModels = 'base';
type whisperSupportedModels = {'id': string, title: 'base'};
type SupportedModel = 'native' | 'whisper' | 'qwen';


enum OnnxModelCategory {
  Stt = 'stt',
  Vad = 'vad',
  Diarization = 'diarization',
  Enhancement = 'enhancement',
  Separation = 'separation',
}



export type { SupportedModel, whisperModels, whisperSupportedModels };
