import type { VoiceConnection } from "@discordjs/voice";
import { EndBehaviorType } from "@discordjs/voice";
import type { Guild, GuildMember, VoiceBasedChannel } from "discord.js";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import prism from "prism-media";
import wav from "wav";
import { RECORDING_DIR } from "../config";
import { stopMuseSession } from "@/commands/stop";

// import { uploadFileToConvex } from "./convexuploader";

import Logger from "@/logger";
const logger = new Logger("recorder");

const RATE = 16000;
const CHANNELS = 1;
const AFTER_SILENCE_MSECS = process.env.AFTER_SILENCE_MSECS
  ? Number(process.env.AFTER_SILENCE_MSECS)
  : 200;

export class Recorder extends EventEmitter {
  public session_id: string;
  public conn: VoiceConnection;
  public chan: VoiceBasedChannel;
  public user: GuildMember;
  public start: number;
  public guild: Guild;
  protected dir: string;
  protected interval: NodeJS.Timeout | null = null;
  protected recording = new Set<string>();

  constructor(
    session_id: string,
    conn: VoiceConnection,
    chan: VoiceBasedChannel,
    user: GuildMember,
  ) {
    super();

    this.session_id = session_id;
    this.conn = conn;
    this.chan = chan;
    this.user = user;
    this.guild = chan.guild;

    this.start = Date.now();
    this.dir = path.join(
      RECORDING_DIR,
      this.guild.toString(),
      this.start.toString(),
    );
    fs.mkdirSync(this.dir, { recursive: true });

    // fs.writeFileSync(
    // 	path.join(this.dir, "meta.json"),
    // 	JSON.stringify({
    // 		start: new Date(this.start).toISOString(),
    // 		guild: this.chan.guild.id,
    // 		channel: this.chan.id,
    // 		user: this.user.id,
    // 	}),
    // );

    this.setup(this.chan.guild.id);
  }

  //---------------------------------------------------------------------
  protected setup(guild_id: string) {
    //--- event handler for connection errors
    this.conn.on("error", logger.error);

    //--- event handler for when speaking starts
    this.conn.receiver.speaking.on("start", async (user) => {
      // ignore bots
      if (this.chan.members.get(user)?.user.bot) {
        return;
      }

      // // check EULA has been accepted by the user
      // const eula = manager.get(user).eula;
      // if (!eula) {
      // 	return;
      // }

      if (this.recording.has(user)) {
        return;
      }
      this.recording.add(user);
      // logger.info("speaking start", user);
      this.emit("speaking", user);

      const audio = this.conn.receiver.subscribe(user, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: AFTER_SILENCE_MSECS,
        },
      });

      // build filename for this recording talkburst
      const time_offset = Date.now() - this.start; // from start of this recording command session
      const time_prefix = `${time_offset.toString().padStart(8, "0")}`;
      // const fp = path.join(this.dir, user, `${time_prefix}.wav`)
      const fp = path.join(
        this.dir,
        `${guild_id}_${user.toString()}_${time_prefix}.wav`,
      );

      // create directory for this user if it doesn't exist
      // if (!fs.existsSync(path.join(this.dir, user))) {
      //   fs.mkdirSync(path.join(this.dir, user), { recursive: true })
      // }

      //--- event handler for when speaking ends
      audio.once("end", () => {
        // logger.info("speaking end", user);
        this.recording.delete(user);
      });

      // step 1 - decode OPUS to PCM
      const transcoder = new prism.opus.Decoder({
        channels: CHANNELS,
        rate: RATE,
        frameSize: 960,
      });

      // step 2 - write to WAV file
      const out = new wav.FileWriter(fp, {
        sampleRate: RATE,
        channels: CHANNELS,
      });

      // connect steps 1 and 2
      audio.pipe(transcoder).pipe(out);

      // process DONE events
      out.on("done", () => {
        const metadata = JSON.stringify({
          id: user,
          name: this.chan.members.get(user)?.displayName ?? user,
          username: this.chan.members.get(user)?.user.username ?? user,
        });
        this.emit(
          "recorded",
          fp,
          user,
          time_offset,
          this.session_id,
          this.chan.guild.id,
          this.chan.id,
          metadata,
        );
        logger.info(user, "talk burst emitted");
      });
    });

    const client = this.chan.client;
    client.on("voiceStateUpdate", (old, cur) => {
      if (old.member?.id !== this.user.id) {
        return;
      }

      if (old.channelId !== this.chan.id) {
        return;
      }

      if (cur.channelId === null) {
        logger.info("voiceStateUpdate calling stop...");
        this.stop();
      }
    });

    // check once per second for connection destroyed status
    this.interval = setInterval(() => {
      if (this.conn.state.status === "destroyed") {
        logger.info("connection destroyed");
        logger.info("watchdog calling stop...");
        this.stop();
      }
      const user = this.chan.members.get(this.user.id);
      if (!user) {
        logger.info("no more members in the channel");
        logger.info("watchdog calling stop...");
        this.stop();
      }
    }, 1000);
  }

  protected stopped = false;
  public stop() {
    if (this.stopped) {
      return;
    }
    logger.info("stopping muse session...", this.session_id);
    this.stopped = true;

    this.conn.destroy();
    if (this.interval) {
      clearInterval(this.interval);
    }

    // ----- stop muse session in the convex database
    stopMuseSession(this.session_id);
    logger.info("stopped.");
  }

  //--- old gather function, not used
  // public gather(): [time: number, user: string, content: string][] {
  //   const uids = fs.readdirSync(this.dir, { withFileTypes: true }).filter((x) => x.isDirectory())
  //   const result: [time: number, user: string, content: string][] = []
  //   for (const uid of uids) {
  //     const files = fs.readdirSync(path.join(this.dir, uid.name))
  //     const meta = JSON.parse(fs.readFileSync(path.join(this.dir, uid.name, "meta.json"), "utf-8"))
  //     for (const file of files) {
  //       if (!file.endsWith(".txt")) {
  //         continue
  //       }

  //       const time = parseInt(file.replace(/\.txt$/, ""))
  //       const content = fs.readFileSync(path.join(this.dir, uid.name, file), "utf-8")
  //       result.push([time, meta.name, content])
  //     }
  //   }

  //   result.sort((a, b) => a[0] - b[0])
  //   return result
  // }
}
