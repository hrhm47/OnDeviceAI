import { useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";
import { createPcmLiveStream } from "react-native-sherpa-onnx/audio";
import { createStreamingSTT } from "react-native-sherpa-onnx/stt";

import * as expoAudio from 'expo-audio';

import { testModelDownload } from "@/src/utils/modelDownloadManager";

type SherpaEngine = Awaited<ReturnType<typeof createStreamingSTT>>;
type SherpaStream = Awaited<ReturnType<SherpaEngine["createStream"]>>;
type SherpaMicStream = ReturnType<typeof createPcmLiveStream>;

export const useSherpaOnnx = () => {
  const engineRef = useRef<SherpaEngine | null>(null);
  const streamRef = useRef<SherpaStream | null>(null);
  const micStreamRef = useRef<SherpaMicStream | null>(null);
  const unsubscribeRef = useRef<null | (() => void)>(null);
  const SAMPLE_RATE = 16000;

  const initSherpa = async () => {
    // if (engineRef.current && streamRef.current && micStreamRef.current) {
    //   return {
    //     engine: engineRef.current,
    //     stream: streamRef.current,
    //     micStream: micStreamRef.current,
    //   };
    // }
    const permission = await expoAudio.getRecordingPermissionsAsync();

    console.log("Microphone permission status:", permission);

    if (!permission.granted) {
      const requestResult = await expoAudio.requestRecordingPermissionsAsync();
      if (!requestResult.granted) {
        throw new Error("Microphone permission is required to use Sherpa ONNX.");
      }

    }
    console.log("Microphone permission granted.");

    const modelPath = await testModelDownload();

    if (!modelPath) {
      throw new Error("Failed to obtain model path for Sherpa ONNX.");
    }

    const engine = await createStreamingSTT({
      modelPath: { type: 'auto', path: modelPath },
      modelType: 'auto',
    });

    console.log("Sherpa ONNX engine created:", engine);

    const stream = await engine.createStream();

    // 2) Create PCM live stream
    const pcm = createPcmLiveStream({ sampleRate: SAMPLE_RATE });


    console.log("Sherpa ONNX mic stream created:", pcm);

    engineRef.current = engine;
    streamRef.current = stream;
    micStreamRef.current = pcm;

    return { engine, stream, pcm };
  };

  const startSherpa = useCallback(async () => {
    try {
      const { stream, pcm, engine } = await initSherpa();

      console.log("Starting Sherpa ONNX...", { stream, pcm, engine });

      //   if (unsubscribeRef.current) {
      //     unsubscribeRef.current();
      //     unsubscribeRef.current = null;
      //   }

        // unsubscribeRef.current = pcm.onData((samples, sampleRate) => {
        //   stream
        //     .processAudioChunk(samples, sampleRate)
        //     .then(async ({ result, isEndpoint }) => {
        //       if (result.text) {
        //         console.log(isEndpoint ? "Final:" : "Partial:", result.text);
        //       }

        //       if (isEndpoint) {
        //         await stream.reset();
        //       }
        //     })
        //     .catch((error) => {
        //       console.error("Sherpa STT error:", error);
        //     });
        // });

      //   await micStream.start();
    } catch (error) {
      Alert.alert(
        "Sherpa Error",
        error instanceof Error ? error.message : "Failed to start Sherpa ONNX.",
      );
    }
  }, []);

  const stopSherpa = useCallback(async () => {
    const pcm = micStreamRef.current;
    const stream = streamRef.current;
    const engine = engineRef.current;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (pcm) {
      await pcm.stop();
    }

    if (stream) {
      await stream.reset();
      await stream.release();
    }

    if (engine) {
      await engine.destroy();
    }

    micStreamRef.current = null;
    streamRef.current = null;
    engineRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopSherpa().catch(console.error);
    };
  }, [stopSherpa]);

  return {
    start: startSherpa,
    stop: stopSherpa,
  };
};
