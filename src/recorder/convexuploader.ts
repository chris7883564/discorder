// "use node";

import debug from "debug";
const log = debug("convexuploader");
log.enabled = true;

import "../envConfig";

import { ConvexHttpClient } from "convex/browser";
import fs from "node:fs";

import { api } from "../../convex/_generated/api.js";

const address = process.env.CONVEX_URL;
log("CONVEX_URL = " + address);
const client = new ConvexHttpClient(String(address));

const computeTodaysSessionId = () => {
	const date = new Date();
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Months are 0-based in JavaScript
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${year}${month}${day}`;
};

export async function uploadFileToConvex(
	filename: string,
	talker_id: string,
	time_offset: number,
	guild_id: string,
	channel_id: string,
	metadata: string,
) {
	const uploadURL = await client.mutation(api.stems.generateUploadUrl);

	// upload the file to convex
	const file = await fs.readFileSync(filename);
	const result = await fetch(uploadURL, {
		method: "POST",
		headers: { "Content-Type": "audio/wav" },
		body: file.buffer,
	});
	const { storageId } = (await result.json()) as { storageId: string };

	// write to stem table
	const stem = {
		session_id: computeTodaysSessionId(),
		storage_id: storageId,
		talker_id,
		guild_id,
		channel_id,
		time_offset,
		format: "audio/wav",
		length: file.length,
		metadata: metadata,
	};

	const stem_id = await client.mutation(api.stems.createStem, stem);

	// log(
	// 	`uploaded [${filename}] ${file.length} bytes to [${uploadURL}]. storageId = [${storageId}]`,
	// );
	log(JSON.stringify(stem, null, 2));
}
