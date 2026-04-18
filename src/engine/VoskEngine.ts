// import Vosk from 'react-native-vosk';
// import { ASREngine, ASRResult } from './types';

// export class VoskEngine implements ASREngine {
//   private vosk: typeof Vosk;

//   constructor() {
//     // @ts-ignore: React-Native-Vosk types don't expose proper construct signature
//     this.vosk = new Vosk();
//   }

//   async init(modelPath?: string): Promise<void> {
//     // modelPath usually points to a folder like 'model-en-us' inside Android assets or iOS bundle.
//     await this.vosk.loadModel(modelPath || 'model-en');
//   }

//   async start(
//     onResult: (result: ASRResult) => void, 
//     onError: (err: Error) => void, 
//     audioUri?: string
//   ): Promise<void> {
//     try {
//       this.vosk.onResult((res: any) => {
//         onResult({ text: res, isFinal: true });
//       });

//       this.vosk.onPartialResult((res: any) => {
//         if (res) onResult({ text: res, isFinal: false });
//       });

//       this.vosk.onError((e: string) => {
//         onError(new Error(e));
//       });

//       await this.vosk.start();
//     } catch (err) {
//       onError(err as Error);
//     }
//   }

//   async stop(): Promise<void> {
//     await this.vosk.stop();
//   }

//   async destroy(): Promise<void> {
//     this.vosk.unload();
//   }
// }
