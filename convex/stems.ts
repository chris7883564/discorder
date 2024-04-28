import { mutation, query } from "./_generated/server";

export const list = query(async (ctx) => {
	return await ctx.db.query("stems").collect();
});

export const send = mutation(async (ctx, { body, author }) => {
	const message = { body, author };
	await ctx.db.insert("stems", message);
});

export const sendAudio = mutation(async (ctx, { storageId, author }) => {
	const payload = { body: storageId, author, format: "audio/wav" };
	await ctx.db.insert("stems", payload);
});

export const generateUploadUrl = mutation(async (ctx) => {
	return await ctx.storage.generateUploadUrl();
});

export const createStem = mutation(async (ctx, args) => {
	return await ctx.db.insert("stems", args);
});

// export const sendImage = mutation({
//   args: { storageId: v.id("_storage"), author: v.string() },
//   handler: async (ctx, args) => {
//     await ctx.db.insert("messages", {
//       body: args.storageId,
//       author: args.author,
//       format: "image",
//     });
//   },
// });
