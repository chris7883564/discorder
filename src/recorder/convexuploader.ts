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

export function test1() {
	return client.query(api.tasks.getTasks);
}

export async function uploadFileToConvex(
	filename: string,
	talker_id: string,
	time_offset: number,
	guild_id: string,
	channel_id: string,
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
		storage_id: storageId,
		talker_id,
		guild_id,
		channel_id,
		time_offset,
		format: "audio/wav",
		length: file.length,
	};

	const stem_id = await client.mutation(api.stems.createStem, stem);

	// log(
	// 	`uploaded [${filename}] ${file.length} bytes to [${uploadURL}]. storageId = [${storageId}]`,
	// );
	log(JSON.stringify(stem, null, 2));
}
