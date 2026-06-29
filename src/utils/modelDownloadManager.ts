import {
    downloadModelByCategory,
    getLocalModelPathByCategory,
    listDownloadedModelsByCategory,
    ModelCategory,
    refreshModelsByCategory,
} from 'react-native-sherpa-onnx/download';


export const testModelDownload = async () => {

    // console.log("Starting model download test...");

    // const targetModelId = 'sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8';
    // const targetModelId = 'sherpa-onnx-omnilingual-asr-1600-languages-300M-ctc-int8-2025-11-12';
    const targetModelId = 'sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25';

  
    const downloaded = await listDownloadedModelsByCategory(ModelCategory.Stt);

    // console.log(`${downloaded.length} models downloaded`);
    const existingTargetModel = downloaded.find((model) => model.id === targetModelId);

    if (existingTargetModel) {
        const modelPath = await getLocalModelPathByCategory(ModelCategory.Stt, existingTargetModel.id);
        // console.log('Model already downloaded at:', modelPath);
        return modelPath; // Return the local path of the requested model
    }

    // 1. Refresh the STT model registry
    await refreshModelsByCategory(ModelCategory.Stt, { forceRefresh: true });

    // 2. Download a specific model
    await downloadModelByCategory(
        ModelCategory.Stt,
        targetModelId,
        {
            onProgress: (progress) => {
                console.log(`${progress.percent.toFixed(1)}%`);
            },
        }
    );

    // 3. Get local path for the downloaded model
    const modelPath = await getLocalModelPathByCategory(
        ModelCategory.Stt,
        targetModelId
    );

    if (modelPath) {
        // console.log('Model downloaded successfully at:', modelPath);
        return modelPath;
    }

}
