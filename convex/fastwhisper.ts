"use node";

import { v } from "convex/values";
import Replicate from "replicate";
import { api } from "./_generated/api";
import { internalAction } from "./_generated/server";

//-------------------------------------------------------------------------
const replicate = new Replicate({
	auth: process.env.REPLICATE_API_KEY,
});

//-------------------------------------------------------------------------
interface FastWhisperOutput {
	text: string;
	chunks: {
		text: string;
		timestamp: [number, number];
	}[];
}

//-------------------------------------------------------------------------
export const translate = internalAction({
	args: {
		fileUrl: v.string(),
		id: v.id("stems"),
	},
	handler: async (ctx, args) => {
		const replicateOutput = (await replicate.run(
			"vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c",
			{
				input: {
					task: "transcribe",
					audio: args.fileUrl,
					language: "english",
					timestamp: "chunk",
					batch_size: 8,
					return_timestamps: true,
					diarise_audio: false,
				},
			},
		)) as FastWhisperOutput;

		console.log(replicateOutput);

		const transcript = replicateOutput.text || "error";
		console.log("transcript", transcript);

		const result = await ctx.scheduler.runAfter(0, api.stems.save, {
			id: args.id,
			transcript: transcript,
		});

		return transcript;
	},
});
