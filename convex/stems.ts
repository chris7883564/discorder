import { ConvexError, v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { action, mutation, query } from "./_generated/server";

//-------------------------------------------------------------------------
export const save = mutation({
	args: {
		id: v.id("stems"),
		transcript: v.string(),
	},
	handler: async (ctx, args) => {
		const { id, transcript } = args;

		return await ctx.db.patch(id, {
			text: transcript,
			// generatingTranscript: false,
		});
	},
});

//-------------------------------------------------------------------------
export const create = mutation({
	args: {
		session_id: v.string(),
		storage_id: v.string(), //v.id("storage"),
		talker_id: v.string(),
		guild_id: v.string(),
		channel_id: v.string(),
		time_offset: v.number(),
		format: v.string(),
		length: v.number(),
		metadata: v.string(),
		text: v.optional(v.string()),
		generatingTranscript: v.boolean(),
	},
	handler: async (ctx, args) => {
		const stemID = await ctx.db.insert("stems", args);

		// const _storageID: Id<"_storage"> = args.storageId as Id<"_storage">;
		// let fileUrl = (await ctx.storage.getUrl(_storageID)) as string;

		// await ctx.scheduler.runAfter(0, internal.transcribe, {
		// 	fileUrl,
		// 	id: noteId,
		// });

		return stemID;
	},
});

//-------------------------------------------------------------------------
export const list = query(async (ctx): Promise<Doc<"stems">[]> => {
	return await ctx.db.query("stems").collect();
});

//-------------------------------------------------------------------------
export const listEmpty = query(async (ctx): Promise<Doc<"stems">[]> => {
	return await ctx.db
		.query("stems")
		.filter((q) => q.eq(q.field("text"), ""))
		.collect();
});

//-------------------------------------------------------------------------
export const translateEmpty = action(async (ctx): Promise<Doc<"stems">[]> => {
	const docs = await ctx.runQuery(api.stems.listEmpty);
	for (const doc of docs) {
		let fileUrl = (await ctx.storage.getUrl(doc.storage_id)) as string;
		await ctx.runMutation(api.stems.translate, { id: doc._id });
	}
	return docs;
});

//-------------------------------------------------------------------------
export const translate = mutation({
	args: {
		id: v.id("stems"),
	},
	handler: async (ctx, args) => {
		const { id } = args;
		const docs = (await ctx.db.query("stems").collect()).filter((stem) => stem._id === args.id);
		if (docs.length === 0) {
			throw new ConvexError("Stem not found");
		}
		const stem = docs[0];
		await ctx.db.patch(stem._id, { generatingTranscript: true });
		let fileUrl = (await ctx.storage.getUrl(stem.storage_id)) as string;
		console.log("fileUrl", fileUrl);

		const result = await ctx.scheduler.runAfter(0, internal.fastwhisper.translate, {
			fileUrl,
			id: id,
		});
		await ctx.db.patch(stem._id, { generatingTranscript: false });
	},
});

//-------------------------------------------------------------------------
export const remove = mutation({
	args: {
		id: v.id("stems"),
	},
	handler: async (ctx, args) => {
		const { id } = args;

		// delete the associated file
		const stem = (await ctx.db.get(args.id)) as Doc<"stems">;
		console.log(stem);
		// const docs = (await ctx.db.query("stems").collect()).filter((stem) => stem._id === args.id)
		// const stem = docs[0]
		await ctx.storage.delete(stem.storage_id as Id<"_storage">);

		//delete the stem record
		await ctx.db.delete(id);
	},
});
