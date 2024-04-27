import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
export const get = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("tasks").collect();
	},
});

export const add = mutation({
	args: { text: v.string() },
	handler: async (ctx, args) => {
		const taskId = await ctx.db.insert("tasks", { text: args.text, isCompleted: false });
		// do something with `taskId`
	},
});
