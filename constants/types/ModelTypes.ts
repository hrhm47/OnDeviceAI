

type whisperModels = 'tiny.en' | 'tiny' | 'base.en' | 'base';
type whisperSupportedModels = {'id': string, title: 'tiny.en' | 'tiny' | 'base.en' | 'base'};
type SupportedModel = 'native' | 'whisper' | 'vosk' | 'sherpa';



export type { SupportedModel, whisperModels, whisperSupportedModels };

