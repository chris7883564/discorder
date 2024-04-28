"use node";

import debug from "debug";
// import { config } from "dotenv";
import fs from "node:fs";
import Replicate from "replicate";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY });

interface whisperOutput {
	detected_language: string;
	segments: any;
	transcription: string;
	translation: string | null;
}

interface ReplicateOutput {
	text: string;
	chunks: {
		text: string;
		timestamp: [number, number];
	}[];
}

interface ReplicateTask {
	completed_at: string;
	created_at: string;
	error: any;
	id: string;
	input: {
		task: string;
		audio: string;
		batch_size: number;
		return_timestamps: boolean;
	};
	logs: any;
	metrics: {
		predict_time: number;
		total_time: number;
	};
	output: {
		text: string;
		chunks: {
			text: string;
			timestamp: [number, number];
		}[];
	};
	started_at: string;
	status: string;
	urls: {
		get: string;
		cancel: string;
	};
	version: string;
}

const log = debug("transcriber");
log.enabled = true;

const model = process.env.WHISPER_MODEL;
const server = process.env.REPLICATE_API_KEY;

// export function read_wav(file: string): Float32Array {
// 	const { sampleRate, channelData } = decode(fs.readFileSync(file));

// 	if (sampleRate !== 16000) {
// 		throw new Error(`Invalid sample rate: ${sampleRate}`);
// 	}
// 	if (channelData.length !== 1) {
// 		throw new Error(`Invalid channel count: ${channelData.length}`);
// 	}

// 	return channelData[0];
// }

export const local_transcribe = model
	? async (file: string, options: { language?: string; initial_prompt?: string } = {}) => {
			// if (!whisper) {
			// 	const { Whisper } = await import("smart-whisper");
			// 	whisper = new Whisper(model);
			// }
			// const pcm = read_wav(file);
			// const { result } = await whisper.transcribe(pcm, {
			// 	language: options.language ?? undefined,
			// 	initial_prompt: options.initial_prompt ?? undefined,
			// });
			const result = [{ text: "local transcribe not implemented", start: -1, end: -1 }];
			return { result };
		}
	: undefined;

export const remote_transcribe = server
	? async (fileUrl: string, options: { language?: string; prompt?: string } = {}) => {
			const audio = fs.readFileSync(fileUrl);
			const replicateOutput = (await replicate.run(
				"vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c",
				{
					input: {
						task: "transcribe",
						audio: audio,
						language: "None",
						timestamp: "chunk",
						batch_size: 64,
						return_timestamps: true,
						diarise_audio: false,
					},
				},
			)) as ReplicateOutput;
			// log(replicateOutput.text);

			// const replicateOutput = (await replicate.run(
			// 	"openai/whisper:4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2",
			// 	{
			// 		input: {
			// 			audio: fileUrl,
			// 			model: "large-v3",
			// 			translate: false,
			// 			temperature: 0,
			// 			transcription: "plain text",
			// 			suppress_tokens: "-1",
			// 			logprob_threshold: -1,
			// 			no_speech_threshold: 0.6,
			// 			condition_on_previous_text: true,
			// 			compression_ratio_threshold: 2.4,
			// 			temperature_increment_on_fallback: 0.01,
			// 		},
			// 	},
			// )) as whisperOutput;
			// const transcript = replicateOutput.transcription || "error";
			// log(transcript);
			// if (transcript == "error") {
			// 	throw new Error(`Server returned ${transcript}`);
			// }
			// const result = [
			// 	{
			// 		text: replicateOutput.transcription,
			// 		from: -1,
			// 		to: -1,
			// 	},
			// ];

			const result = [
				{
					text: replicateOutput.text,
					from: -1,
					to: -1,
				},
			];

			// const result = [{ text: "replicate transcribe not implemented", start: -1, end: -1 }];
			return { result };
		}
	: undefined;

log({
	model,
	server,
});
