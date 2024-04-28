import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import debug from "debug";
const log = debug("recorder");
log.enabled = true;

import { ConvexHttpClient } from "convex/browser";
import * as fs from "node:fs/promises";

import { api } from "../../convex/_generated/api";

const address = process.env.CONVEX_URL;
const client = new ConvexHttpClient(String(address));

export function test1() {
	return client.query(api.tasks.getTasks);
}

export async function uploadFileToConvex(filename: string) {
	const uploadURL = await client.mutation(api.stems.generateUploadUrl);

	// const filename = "./data/recording/1714273057501/1007158516705927243/00000524.wav";
	const file = await fs.readFile(filename);

	const result = await fetch(uploadURL, {
		method: "POST",
		headers: { "Content-Type": "audio/wav" },
		body: file.buffer,
	});
	const { storageId } = (await result.json()) as { storageId: string };
	log(
		`uploaded [${filename}] ${file.length} bytes to [${uploadURL}]. storageId = [${storageId}]`,
	);
}
