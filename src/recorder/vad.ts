import { NonRealTimeVAD, NonRealTimeVADOptions } from "@ricky0123/vad-node";
import fs from "fs";
import Logger from "@/logger";
import { ms_to_time } from "@/utils";

const logger = new Logger("VAD");
logger.enable();

export interface VADResult {
  hasVoice: boolean;
  startTime?: number;
  endTime?: number;
}

export class VADProcessor {
  private vad: NonRealTimeVAD | null = null;
  private useVAD: boolean;
  private vad_options: Partial<NonRealTimeVADOptions> = {};

  constructor(useVAD: boolean) {
    this.useVAD = useVAD;

    if (this.useVAD) {
      this.initializeVAD(this.vad_options);
    }
  }

  private async initializeVAD(options: Partial<NonRealTimeVADOptions>) {
    try {
      this.vad = await NonRealTimeVAD.new(options);
      logger.info("VAD initialized successfully");
    } catch (error) {
      logger.error("Error initializing VAD:", error);
      this.vad = null;
    }
  }

  async processAudio(filePath: string, sampleRate: number): Promise<VADResult> {
    if (!this.useVAD || !this.vad) {
      return { hasVoice: true }; // Assume voice if VAD is not used
    }

    try {
      const buffer = fs.readFileSync(filePath);

      // Convert Buffer to Float32Array
      const float32Array = new Float32Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
      );

      // Run VAD processing
      for await (const { audio, start, end } of this.vad.run(
        float32Array,
        sampleRate,
      )) {
        logger.info(
          `VAD detected voice from ${ms_to_time(start)} to ${ms_to_time(end)}`,
        );

        // Return on the first detected chunk of voice
        return { hasVoice: true, startTime: start, endTime: end };
      }

      // No voice detected in audio
      return { hasVoice: false };
    } catch (error) {
      logger.error("Error during VAD processing:", error);
      return { hasVoice: false };
    }
  }
}
