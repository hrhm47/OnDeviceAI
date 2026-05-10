import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { ASREngine, ASRResult } from './types';

export class NativeEngine implements ASREngine {
  private resultListener: any = null;
  private errorListener: any = null;
  
  async init(): Promise<void> {
    const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Speech recognition permission not granted');
    }
  }

  async start(
    onResult: (result: ASRResult) => void,
    onError: (err: Error) => void,
    audioUri?: string
  ): Promise<void> {
    try {
      this.resultListener = ExpoSpeechRecognitionModule.addListener('start', (event: any) => {
        console.log("ASR Event:", event);
        // if (event.results && event.results.length > 0) {
        //   const text = event.results[0].transcript;
        //   console.log("ASR Result:", text, "isFinal:", event.isFinal);
          // onResult({ text, isFinal: event.isFinal });
        // }
      });

      
      // const options: any = {
      //   lang: 'en-US', // Add more languages as needed
      //   interimResults: true,
      //   androidRecognitionServicePackage: "com.google.android.tts",
      // };
      
      // if (audioUri) {
      //   options.audioSource = { uri: audioUri };
      // }
      
      // await ExpoSpeechRecognitionModule.start(options);
      
      this.resultListener = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
        console.log("ASR Event:", event);
        if (event.results && event.results.length > 0) {
          const text = event.results[0].transcript;
          console.log("ASR Result:", text, "isFinal:", event.isFinal);
          onResult({ text, isFinal: event.isFinal });
        }
      });
      
      

      // ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload((['fi-FI','en-US'])=>{

      // })

      ExpoSpeechRecognitionModule.start({
        lang: "en-US", // Set the language code as needed
        interimResults: true,
        // Recommended: true on iOS, false on Android, unless the speech model is installed, which you can check with `getSupportedLocales()`
        requiresOnDeviceRecognition: false, // Platform.OS === "ios",
        continuous: true,
        recordingOptions:{
          persist: true,
          outputSampleRate: 16000,},
          androidIntentOptions:{
            EXTRA_LANGUAGE_MODEL: "web_search",
            EXTRA_ENABLE_FORMATTING:'latency',
            EXTRA_LANGUAGE_DETECTION_ALLOWED_LANGUAGES: ["en-US", "fi-FI"],
            EXTRA_PREFER_OFFLINE: true,
          }
        // audioSource: {
        //   /** Local file URI */
        //   // uri: "file:///path/to/audio.wav",
        //   /** [Android only] The number of channels in the source audio. */
        //   audioChannels: 1,
        //   /** [Android only] A value from AudioFormat - https://developer.android.com/reference/android/media/AudioFormat */
        //   audioEncoding: AudioEncodingAndroid.ENCODING_PCM_16BIT,
        //   /** [Android only] Audio sampling rate in Hz. */
        //   sampleRate: 16000,
        //   /**
        //    * The delay between chunks of audio to stream to the speech recognition service.
        //    * Use this setting to avoid being rate-limited when using network-based recognition.
        //    * If you're using on-device recognition, you may want to increase this value to avoid unprocessed audio chunks.
        //    * Default: 50ms for network-based recognition, 15ms for on-device recognition
        //    */
        //   chunkDelayMillis: undefined,
        // },
      });

     




    } catch (err) {
      onError(err as Error);
    }
  }

  async stop(): Promise<void> {
    try {
     
      // this.errorListener = ExpoSpeechRecognitionModule.addListener('end', (event: any) => {
      //   // onError(new Error(event.message || 'Unknown ASR Error'));
      //   console.log("ASR End Event:", event);
      // });
      ExpoSpeechRecognitionModule.stop();
    } catch (e) {
      console.warn("Failed to stop ExpoSpeechRecognitionModule", e);
    }
    if (this.resultListener) {
      this.resultListener.remove();
      this.resultListener = null;
    }
    if (this.errorListener) {
      this.errorListener.remove();
      this.errorListener = null;
    }
  }

  async destroy(): Promise<void> {
    await this.stop();
  }
}
