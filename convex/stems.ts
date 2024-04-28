import { mutation, query } from "./_generated/server";

export const list = query(async (ctx) => {
	return await ctx.db.query("stems").collect();
});

export const generateUploadUrl = mutation(async (ctx) => {
	return await ctx.storage.generateUploadUrl();
});

export const createStem = mutation(async (ctx, args) => {
	const stemID = await ctx.db.insert("stems", args);

	// const _storageID: Id<"_storage"> = args.storageId as Id<"_storage">;
	// let fileUrl = (await ctx.storage.getUrl(_storageID)) as string;

	// await ctx.scheduler.runAfter(0, internal.transcribe, {
	// 	fileUrl,
	// 	id: noteId,
	// });

	return stemID;
});
