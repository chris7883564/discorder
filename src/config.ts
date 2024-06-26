// import { config } from "dotenv";
import path from "node:path";

// config();
import "./envConfig";

export const BOT_TOKEN = process.env.BOT_TOKEN ?? "";
export const BOT_ID = process.env.BOT_ID ?? "";
export const GUILD_ID = process.env.GUILD_ID ?? "";

// export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./data");
// export const RECORDING_DIR = path.join(DATA_DIR, "recording");
// export const USER_DATA_DIR = path.join(DATA_DIR, "user");

export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./data"); // where we store all the temporary data
export const RECORDING_DIR = path.join(DATA_DIR, "recording"); // used for storing recordings
export const USER_DATA_DIR = path.join(DATA_DIR, "user"); // used for EULA management, should be written to convex

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN");
}

if (!BOT_ID) {
  throw new Error("Missing BOT_ID");
}
