// "use node";

import debug from "debug";
const log = debug("convexuploader");
log.enabled = true;

import "../envConfig";

// import { ConvexHttpClient } from "convex/browser";
import fs from "node:fs";

// import { api } from "../../convex/_generated/api.js";

const convexSiteUrl = process.env.CONVEX_SITE_URL;
log("CONVEX_SITE_URL = " + convexSiteUrl);
// const client = new ConvexHttpClient(String(address));

const computeTodaysSessionId = () => {
	const date = new Date();
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Months are 0-based in JavaScript
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${year}${month}${day}`;
};

export async function uploadFileToConvex_org(
	filename: string,
	talker_id: string,
	time_offset: number,
	guild_id: string,
	channel_id: string,
	metadata: string,
) {
	// try {
	// 	// get the upload URL
	// 	const uploadURL = await client.mutation(api.utils.generateUploadUrl);
	// 	// upload the file to convex
	// 	const file = await fs.readFileSync(filename);
	// 	const result = await fetch(uploadURL, {
	// 		method: "POST",
	// 		headers: { "Content-Type": "audio/wav" },
	// 		body: file.buffer,
	// 	});
	// 	const { storageId } = (await result.json()) as { storageId: string };
	// 	// write to stem table
	// 	const stem = {
	// 		session_id: computeTodaysSessionId(),
	// 		storage_id: storageId,
	// 		talker_id,
	// 		guild_id,
	// 		channel_id,
	// 		time_offset,
	// 		format: "audio/wav",
	// 		length: file.length,
	// 		metadata: metadata,
	// 		text: "",
	// 		generatingTranscript: false,
	// 	};
	// 	const stem_id = await client.mutation(api.stems.create, stem);
	// 	log(`uploaded [${filename}] ${file.length} bytes. storageId = [${storageId}]`);
	// 	// log(JSON.stringify(stem, null, 2));
	// } catch (e) {
	// 	log("error: convex loader failed", e);
	// }
}

export async function uploadFileToConvex(
	filename: string,
	talker_id: string,
	time_offset: number,
	guild_id: string,
	channel_id: string,
	metadata: string,
) {
	try {
		// upload the file to convex
		const uploadURL = new URL(`${convexSiteUrl}/upload`);
		const file = await fs.readFileSync(filename);
		uploadURL.searchParams.set("talker_id", talker_id);
		log(uploadURL.href);

		// set all the parameters, eg. talkerID, guild etc.

		// const sendImageUrl = new URL(`${convexSiteUrl}/sendImage`);
		// sendImageUrl.searchParams.set("author", "Jack Smith");
		// await fetch(sendImageUrl, {
		//   method: "POST",
		//   headers: { "Content-Type": selectedImage!.type },
		//   body: selectedImage,
		// });

		const result = await fetch(uploadURL, {
			method: "POST",
			headers: { "Content-Type": "audio/wav" },
		});
		log(result.status);
		// const { storageId } = (await result.json()) as { storageId: string };
	} catch (e) {
		log("error: convex loader failed", e);
	}
}
