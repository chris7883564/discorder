import fs from "fs";
import path from "path";
import Logger from "./logger"; // Adjust the import path as necessary

const logger = new Logger("directory-logger");

/**
 * Converts milliseconds to a human-readable string format.
 * @param milliseconds - The number of milliseconds to convert.
 * @returns A string representing the time in a human-readable format.
 */
export function millisecondsToHumanReadable(milliseconds: number): string {
  const seconds = Math.floor((milliseconds / 1000) % 60);
  const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
  const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));

  const daysStr = days > 0 ? `${days}d ` : "";
  const hoursStr = hours > 0 ? `${hours}h ` : "";
  const minutesStr = minutes > 0 ? `${minutes}m ` : "";
  const secondsStr = seconds > 0 ? `${seconds}s` : "";

  return `${daysStr}${hoursStr}${minutesStr}${secondsStr}`.trim();
}

export function ms_to_time(ms: number) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
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
  const indent = " ".repeat(depth * 2); // Indentation for nested files/folders

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
