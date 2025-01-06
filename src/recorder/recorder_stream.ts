import type { VoiceConnection } from "@discordjs/voice";
import { EndBehaviorType, VoiceConnectionStatus } from "@discordjs/voice";
import type {
  Guild,
  GuildMember,
  VoiceBasedChannel,
  VoiceState,
} from "discord.js";
import { EventEmitter } from "node:events";
import fs, { stat } from "node:fs";
import path from "node:path";
import prism from "prism-media";
import wav from "wav";
import { RECORDING_DIR } from "../config";
import { stopMuseSession } from "@/commands/stop";

// import { uploadFileToConvex } from "./convexuploader";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

import Logger from "@/logger";
import { PassThrough } from "node:stream";
const logger = new Logger("recorder");
logger.enable();

const RATE = 16000;
const CHANNELS = 1;
const AFTER_SILENCE_MSECS = process.env.AFTER_SILENCE_MSECS
  ? Number(process.env.AFTER_SILENCE_MSECS)
  : 1000;

logger.info("AFTER_SILENCE_MSECS", AFTER_SILENCE_MSECS);
logger.info("RATE", RATE);
logger.info("CHANNELS", CHANNELS);

export class RecorderStream extends EventEmitter {
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

    // create a directory for this session
    this.dir = path.join(
      RECORDING_DIR,
      this.guild.toString(),
      this.start.toString(),
    );

    // create the directory for this session
    fs.mkdirSync(this.dir, { recursive: true });

    // write metadata for this session
    fs.writeFileSync(
      path.join(this.dir, "meta.json"),
      JSON.stringify({
        start: new Date(this.start).toISOString(),
        guild: this.chan.guild.id,
        channel: this.chan.id,
        user: this.user.id,
      }),
    );

    this.setup(this.chan.guild.id);
  }

  //---------------------------------------------------------------------
  protected setup(guild_id: string) {
    //--- event handler for connection errors ---------------------------------------------------------------------
    this.conn.on("error", logger.error);

    //--- event handler for when speaking starts ---------------------------------------------------------------------
    this.conn.receiver.speaking.on("start", async (user) => {
      // ignore bots
      if (this.chan.members.get(user)?.user.bot) {
        return;
      }
      if (this.recording.has(user)) {
        return;
      }
      this.recording.add(user);

      logger.info(`Receiving audio from user: ${user}`);
      this.emit("speaking", user);

      const audioStream = this.conn.receiver.subscribe(user, {
        end: { behavior: EndBehaviorType.Manual },
      });
      audioStream.on("data", (data) => {
        logger.info("data", data.length);
      });
      audioStream.on("close", () => {
        logger.info("close");
      });
      audioStream.on("error", () => {
        logger.error("error");
      });

      audioStream.once("end", () => {
        logger.info("speaking end", user);
        this.recording.delete(user);
      });

      const outputDir = path.join(this.dir);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputFilePath = `${outputDir}/${user}-${Date.now()}.mp3`;
      const passThrough = new PassThrough();

      ffmpeg(audioStream)
        .setFfmpegPath(ffmpegPath)
        .inputFormat("s16le")
        .audioCodec("libmp3lame")
        .audioBitrate(128)
        .format("mp3")
        .pipe(passThrough)
        .on("error", (err) => {
          logger.error("ffmpeg error", err);
        })
        .on("end", () => {
          logger.info("ffmpeg end");
        })
        .on("close", () => {
          logger.info("ffmpeg close");
        })
        .on("data", (data: any) => {
          logger.info("ffmpeg data", data.length);
        });

      const writeStream = fs.createWriteStream(outputFilePath);
      passThrough.pipe(writeStream);

      writeStream.on("finish", () => {
        logger.info(`Audio saved for user ${user} at ${outputFilePath}`);
      });

      writeStream.on("error", (err) => {
        logger.error(`Error saving audio for user ${user}:`, err);
      });
    });

    //--- event handler for change in connections ---------------------------------------------------------------------
    const client = this.chan.client;
    client.on("voiceStateUpdate", (old: VoiceState, cur: VoiceState) => {
      logger.info(
        `voiceStateUpdate event: old.channelId=${old.channelId}, cur.channelId=${cur.channelId}, this.chan.id=${this.chan.id}`,
      );
      // does this event relate to this userId
      if (old.member?.id !== this.user.id) {
        logger.warn("voiceStateUpdate event: memberId changed");
        return;
      }
    });

    //--- check once per second for connection destroyed status ---------------------------------------------------------------------

    let lastStatusVoiceConnectionStatus: VoiceConnectionStatus =
      VoiceConnectionStatus.Disconnected;
    this.interval = setInterval(() => {
      // has it changed?
      if (lastStatusVoiceConnectionStatus !== this.conn.state.status) {
        logger.info(
          "VoiceConnectionStatus changed to " + this.conn.state.status,
        );
        lastStatusVoiceConnectionStatus = this.conn.state.status;

        const collection = this.chan.members;
        logger.info(`${collection.size} members in this channel`);

        // const user = collection.get(this.user.id);
        // if (!user) {
        if (!collection.size) {
          logger.info("channel is empty: watchdog calling stop...");
          this.stop();
        }
      }
      // if (this.conn.state.status === VoiceConnectionStatus.Destroyed ) {
      // logger.error("connection destroyed");
      // logger.error("watchdog calling stop...");
      // this.stop();
      // }
    }, 1000);
  }

  protected stopped = false;

  //--------------------------------------------------------------------------------------------------------------------------------
  public stop() {
    if (this.stopped) {
      return;
    }
    logger.info("stopping muse session...", this.session_id);
    stopMuseSession(this.session_id);

    this.conn.destroy();
    if (this.interval) {
      clearInterval(this.interval);
    }

    // ----- stop muse session in the convex database
    logger.info("stopped.");
    this.stopped = true;
  }

  //--------------------------------------------------------------------------------------------------------------------------------
  public gather(): [time: number, user: string, content: string][] {
    const uids = fs
      .readdirSync(this.dir, { withFileTypes: true })
      .filter((x) => x.isDirectory());
    const result: [time: number, user: string, content: string][] = [];
    for (const uid of uids) {
      const files = fs.readdirSync(path.join(this.dir, uid.name));
      const meta = JSON.parse(
        fs.readFileSync(path.join(this.dir, uid.name, "meta.json"), "utf-8"),
      );
      for (const file of files) {
        if (!file.endsWith(".txt")) {
          continue;
        }

        const time = parseInt(file.replace(/\.txt$/, ""));
        const content = fs.readFileSync(
          path.join(this.dir, uid.name, file),
          "utf-8",
        );
        result.push([time, meta.name, content]);
      }
    }

    result.sort((a, b) => a[0] - b[0]);
    return result;
  }
}
