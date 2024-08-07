import type { VoiceConnection } from "@discordjs/voice";
import type { GuildMember, VoiceBasedChannel } from "discord.js";
import { Recorder } from "./recorder";

export const tasks = new Map<string, Recorder>();

export function add(
  session_id: string,
  conn: VoiceConnection,
  chan: VoiceBasedChannel,
  user: GuildMember,
): Recorder {
  const recorder = new Recorder(session_id, conn, chan, user);
  tasks.set(user.id, recorder);
  return recorder;
}

export function get(userId: string): Recorder | undefined {
  return tasks.get(userId);
}

export function remove(user: GuildMember): Recorder | null {
  const recorder = tasks.get(user.id);
  if (recorder) {
    recorder.stop();
    tasks.delete(user.id);
    return recorder;
  } else {
    return null;
  }
}
