import fs from "fs";
import path from "path";
import Logger from "./logger"; // Adjust the import path as necessary

const logger = new Logger("utils");

import { VoiceState } from "discord.js";

// A simple string representation to capture the essential details of a Discord VoiceState can look like this:
export function captureVoiceState(voiceState: VoiceState): string {
  const userId = voiceState.id;
  const username = voiceState.member?.user.username ?? "Unknown User";
  const channelId = voiceState.channelId ?? "Not Connected";
  const isDeafened = voiceState.selfDeaf ? "Yes" : "No";
  const isMuted = voiceState.selfMute ? "Yes" : "No";
  return `User: ${username} (ID: ${userId}), Channel: ${channelId}, Deafened: ${isDeafened}, Muted: ${isMuted}`;
}

/**
 * Converts milliseconds to a time string in the format HH:MM:SS:xxxx.
 * @param ms - The number of milliseconds to convert.
 * @returns A string representing the time in HH:MM:SS:xxxx format.
 */
export function ms_to_time(ms: number): string {
  const milliseconds = ms % 1000;
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${milliseconds.toString().padStart(4, "0")}`;
}

/**
 * Recursively reads the directory structure and logs it.
 * @param dirPath - The path of the directory to read.
 * @param depth - The current depth of the recursion (used for indentation).
 */
export function logDirectoryStructure(
  dirPath: string,
  depth: number = 0,
): void {
  const indent = "_".repeat(depth * 2); // Indentation for nested files/folders

  try {
    const items = fs.readdirSync(dirPath);

    items.forEach((item) => {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        logger.info(`${indent}${item}/`);
        logDirectoryStructure(fullPath, depth + 1); // Recursively read subdirectories
      } else {
        logger.info(`${indent}${item}`);
      }
    });
  } catch (error) {
    logger.error(`Failed to read directory: ${dirPath}`, error);
  }
}
