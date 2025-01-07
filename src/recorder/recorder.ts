import type { VoiceConnection } from "@discordjs/voice";
import { EndBehaviorType, VoiceConnectionStatus } from "@discordjs/voice";
import type {
  Guild,
  GuildMember,
  VoiceBasedChannel,
  VoiceState,
} from "discord.js";
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
logger.enable();

const RATE = 16000;
const CHANNELS = 1;
const AFTER_SILENCE_MSECS = process.env.AFTER_SILENCE_MSECS
  ? Number(process.env.AFTER_SILENCE_MSECS)
  : 1000;

logger.info("AFTER_SILENCE_MSECS", AFTER_SILENCE_MSECS);
logger.info("RATE", RATE);
logger.info("CHANNELS", CHANNELS);

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

      // // check EULA has been accepted by the user
      // const eula = manager.get(user).eula;
      // if (!eula) {
      // 	return;
      // }

      if (this.recording.has(user)) {
        return;
      }
      this.recording.add(user);
      logger.info("speaking start", user);
      this.emit("speaking", user);

      // https://discord.js.org/docs/packages/voice/main/EndBehaviorType:Enum#Manual
      const configuration1 = {
        behavior: EndBehaviorType.AfterSilence,
        duration: AFTER_SILENCE_MSECS,
      };
      const configuration2 = { behavior: EndBehaviorType.Manual as const };
      const audio = this.conn.receiver.subscribe(user, { end: configuration1 });

      // build filename for this recording talkburst
      const time_offset = Date.now() - this.start; // from start of this recording command session
      const fp = path.join(
        this.dir,
        user,
        `${time_offset.toString().padStart(8, "0")}.wav`,
      );
      if (!fs.existsSync(path.join(this.dir, user))) {
        fs.mkdirSync(path.join(this.dir, user), { recursive: true });
      }

      // const time_prefix = `${time_offset.toString().padStart(8, "0")}`;
      // const fp = path.join(this.dir, `${guild_id}_${user.toString()}_${time_prefix}.wav`)

      //------------------ event handler for when speaking ends
      audio.once("end", () => {
        logger.info("speaking end", user);
        this.recording.delete(user);
      });

      const transcoder = new prism.opus.Decoder({
        channels: CHANNELS,
        rate: RATE,
        frameSize: 960,
      }); // step 1 - decode OPUS to PCM
      const filewriter = new wav.FileWriter(fp, {
        sampleRate: RATE,
        channels: CHANNELS,
      }); // step 2 - write to WAV file
      audio.pipe(transcoder).pipe(filewriter); // connect steps 1 and 2

      //------------------ process DONE events
      filewriter.on("done", () => {
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

      const meta = path.join(this.dir, user, "meta.json");
      if (!fs.existsSync(meta)) {
        fs.writeFileSync(
          meta,
          JSON.stringify({
            id: user,
            name: this.chan.members.get(user)?.displayName ?? user,
            username: this.chan.members.get(user)?.user.username ?? user,
          }),
        );
      }
    });

    //--- event handler for change in connections ---------------------------------------------------------------------
    const client = this.chan.client;
    client.on("voiceStateUpdate", (old: VoiceState, cur: VoiceState) => {
      // process channel state
      //
      logger.info(
        `voiceStateUpdate event: old.channelId=${old.channelId}, cur.channelId=${cur.channelId}, this.chan.id=${this.chan.id}` +
          `old.member.id=${old.member?.id} this.user.id=${this.user.id}`,
      );
      // if (old.channelId === null && this.chan.id) {
      //   logger.info("new channelId detected: could auto start");
      //   return;
      // }

      // if (old.channelId !== this.chan.id) {
      //   logger.warn("voiceStateUpdate event: channelId changed ");
      //   return;
      // }
      // if (cur.channelId === null) {
      //   logger.error("voiceStateUpdate event: null channelId detected");
      //   // this.stop();
      // }

      // process member state
      //
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
    stopMuseSession(this.session_id);

    this.conn.destroy();
    if (this.interval) {
      clearInterval(this.interval);
    }

    // ----- stop muse session in the convex database
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
