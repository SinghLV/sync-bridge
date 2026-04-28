import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let model = null;

/**
 * TFLITE VISION SERVICE (On-Device)
 * Uses TensorFlow.js to perform real on-device object detection.
 */
export const runTfliteVision = async (imageElement = null) => {
  console.log("📸 [TFLite] Initializing On-Device Vision Engine...");

  if (model === 'LOADING') return { status: 'INITIALIZING' };
  
  try {
    if (!model) {
      model = 'LOADING';
      console.log("🚀 [TFLite] Downloading Vision Weights (20MB)...");
      model = await cocoSsd.load();
      console.log("✅ [TFLite] Model Loaded Successfully.");
    }

    if (!imageElement) {
       // Fallback for demo when no image is provided
       return {
         detected_objects: ["SURROUNDINGS_SCANNED"],
         vision_confidence: 0.95,
         ai_source: "TFLITE_WEB_CORE",
         status: "IDLE_WAITING_FOR_INPUT"
       };
    }

    // Actual Inference call
    const predictions = await model.detect(imageElement);
    
    return {
      detected_objects: predictions.map(p => p.class.toUpperCase()),
      vision_confidence: predictions[0]?.score || 0,
      ai_source: "TFLITE_WEB_CORE",
      predictions: predictions
    };

  } catch (error) {
    console.error("❌ [TFLite] Vision Inference Error:", error);
    return { error: "LOCAL_VISION_FAILED", ai_source: "FALLBACK" };
  }
};
