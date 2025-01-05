import path from "node:path";

//---------------------------------------------------------------------
// load the environment from the files in the project directory
import pkg from "@next/env";
const { loadEnvConfig } = pkg;
const projectDir = process.cwd();

//---------------------------------------------------------------------
import Logger from "@/logger";
const logger = new Logger("commands");
logger.info("PROJECT_DIRECTORY = " + projectDir);

loadEnvConfig(projectDir);

//---------------------------------------------------------------------
// DISCORD ENVIRONMENT VARIABLES
if (!process.env.BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN");
}
if (!process.env.BOT_ID) {
  throw new Error("Missing BOT_ID");
}
if (!process.env.GUILD_ID) {
  throw new Error("Missing GUILD_ID");
}

export const BOT_TOKEN = process.env.BOT_TOKEN;
export const BOT_ID = process.env.BOT_ID;
export const GUILD_ID = process.env.GUILD_ID;

//---------------------------------------------------------------------
// CONVEX ENVIRONMENT VARIABLES
export const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL;
if (!CONVEX_SITE_URL) {
  throw new Error("Missing CONVEX_SITE_URL");
}

logger.info("CONVEX_SITE_URL = " + CONVEX_SITE_URL);

// export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./data");
// export const RECORDING_DIR = path.join(DATA_DIR, "recording");
// export const USER_DATA_DIR = path.join(DATA_DIR, "user");
export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./data"); // where we store all the temporary data
export const RECORDING_DIR = path.join(DATA_DIR, "recording"); // used for storing recordings
export const USER_DATA_DIR = path.join(DATA_DIR, "user"); // used for EULA management, should be written to convex

logger.info("DATA_DIR = " + DATA_DIR);
logger.info("RECORDING_DIR = " + RECORDING_DIR);
logger.info("USER_DATA_DIR = " + USER_DATA_DIR);
