

type whisperModels = 'tiny.en' | 'tiny' | 'base.en' | 'base';
type whisperSupportedModels = {'id': string, title: 'tiny.en' | 'tiny' | 'base.en' | 'base'};
type SupportedModel = 'native' | 'whisper' | 'qwen' | 'parakeet';


enum OnnxModelCategory {
  Stt = 'stt',
  Vad = 'vad',
  Diarization = 'diarization',
  Enhancement = 'enhancement',
  Separation = 'separation',
}



export type { SupportedModel, whisperModels, whisperSupportedModels };
