import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	stems: defineTable({
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
	})
		.index("by_session_id", ["session_id"])
		.index("by_channel_id", ["channel_id"]),

	games: defineTable({
		userId: v.string(),
		title: v.string(),
		description: v.string(),
		hashtags: v.optional(v.array(v.string())),
		imageURL: v.optional(v.string()),
	}).index("by_userId", ["userId"]),

	notes: defineTable({
		userId: v.string(),
		audioFileId: v.string(),
		audioFileUrl: v.string(),
		title: v.optional(v.string()),
		transcription: v.optional(v.string()),
		summary: v.optional(v.string()),
		embedding: v.optional(v.array(v.float64())),
		generatingTranscript: v.boolean(),
		generatingTitle: v.boolean(),
		generatingActionItems: v.boolean(),
	})
		.index("by_userId", ["userId"])
		.vectorIndex("by_embedding", {
			vectorField: "embedding",
			dimensions: 768,
			filterFields: ["userId"],
		}),

	actionItems: defineTable({
		noteId: v.id("notes"),
		userId: v.string(),
		task: v.string(),
		completed: v.boolean(),
	})
		.index("by_noteId", ["noteId"])
		.index("by_userId", ["userId"]),

	identities: defineTable({
		flagged: v.optional(v.string()),
		instructions: v.string(),
		name: v.string(),
	}),

	messages: defineTable({
		author: v.union(v.literal("user"), v.literal("assistant")),
		threadId: v.id("threads"),
		// body starts out undefined for assistant messages
		body: v.optional(v.string()),
		// For messages authenticated with Clerk
		user: v.optional(v.any()),
		// For ChatGPT Messages
		error: v.optional(v.string()),
		identityId: v.optional(v.id("identities")),
		updatedAt: v.optional(v.number()),
		usage: v.optional(
			v.object({
				completion_tokens: v.number(),
				prompt_tokens: v.number(),
				total_tokens: v.number(),
			}),
		),
	}),

	threads: defineTable({}),
});
