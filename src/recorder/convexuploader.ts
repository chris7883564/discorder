// "use node";

import debug from "debug";
const log = debug("convex");
log.enabled = true;

import "../envConfig.js";

import { ConvexHttpClient } from "convex/browser";
import fs from "node:fs";

import { api } from "../../convex/_generated/api.js";

const address = process.env.CONVEX_URL;
log("CONVEX_URL = " + address);
const client = new ConvexHttpClient(String(address));

export function test1() {
	return client.query(api.tasks.getTasks);
}

export async function uploadFileToConvex(filename: string) {
	const uploadURL = await client.mutation(api.stems.generateUploadUrl);

	const file = await fs.readFileSync(filename);

	const result = await fetch(uploadURL, {
		method: "POST",
		headers: { "Content-Type": "audio/wav" },
		body: file.buffer,
	});
	const { storageId } = (await result.json()) as { storageId: string };
	// log(
	// 	`uploaded [${filename}] ${file.length} bytes to [${uploadURL}]. storageId = [${storageId}]`,
	// );
	log(`uploaded ${file.length} bytes.`);
}
