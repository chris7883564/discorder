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
import { NonRealTimeVAD, NonRealTimeVADOptions } from "@ricky0123/vad-node";
import { uploadFileToConvex } from "../recorder/convexuploader";

import Logger from "@/logger";
import { ms_to_time } from "@/utils";
const logger = new Logger("recorder");
logger.enable();

// VAD CONTROL
if (!process.env.USE_VAD) {
  throw new Error("USE_VAD is not set");
}
const USE_VAD = process.env.USE_VAD;
const vad_options: Partial<NonRealTimeVADOptions> = {};

logger.info("USE_VAD", USE_VAD);

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
  protected active_talkers = new Set<string>();
  private myvad: NonRealTimeVAD | undefined;

  // Method to initialize VAD
  async initializeVAD(vad_options: Partial<NonRealTimeVADOptions>) {
    try {
      // VAD setup
      this.myvad = await NonRealTimeVAD.new(vad_options);
      console.log("VAD initialized successfully");
    } catch (error) {
      console.error("Error initializing VAD:", error);
    }
  }

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
    this.initializeVAD(vad_options);

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

      if (this.active_talkers.has(user)) {
        return;
      }
      this.active_talkers.add(user);
      logger.info(user, "speaking start");
      this.emit("speaking", user);

      // https://discord.js.org/docs/packages/voice/main/EndBehaviorType:Enum#Manual
      const audio = this.conn.receiver.subscribe(user, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: AFTER_SILENCE_MSECS,
        },
      });

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
        logger.info(user, "speaking end");
        this.active_talkers.delete(user);
      });

      // step 1 - decode OPUS to PCM
      const transcoder = new prism.opus.Decoder({
        channels: CHANNELS,
        rate: RATE,
        frameSize: 960,
      });

      // step 2 - write to WAV file
      const filewriter = new wav.FileWriter(fp, {
        sampleRate: RATE,
        channels: CHANNELS,
      });

      // connect steps 1 and 2
      audio.pipe(transcoder).pipe(filewriter);

      //------------------ process DONE events
      filewriter.on("done", () => {
        this.emit("recorded", fp, user, time_offset, this.session_id);
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

    //----- event handler for when recording is done
    //

    this.on(
      "recorded",
      async (
        wav_filename: string,
        user_id: string,
        time_offset: number,
        session_id: string,
      ) => {
        // arrives with the file already written to disk

        const username =
          this.chan.guild.members.cache.get(user_id)?.displayName ?? user_id;
        const name =
          this.chan.guild.members.cache.get(user_id)?.user.username ?? user_id;
        logger.info(username, name);

        //
        // VAD
        //
        let bFoundVoice = !USE_VAD; // default to true if there's no VAD in use
        if (USE_VAD && this.myvad) {
          const fb = await fs.readFileSync(wav_filename);
          // Convert Buffer to Float32Array
          const float32Array = new Float32Array(
            fb.buffer,
            fb.byteOffset,
            fb.byteLength / Float32Array.BYTES_PER_ELEMENT,
          );
          for await (const { audio, start, end } of this.myvad.run(
            float32Array,
            16000,
          )) {
            logger.info("VAD chunk: ", ms_to_time(time_offset), start, end);
            bFoundVoice = true;
            // TODO: here we assume any voice in the first detected chunk means the whole thing is voice
            // we could remove non-voice VAD chunks in future
            // do stuff with
            //   audio (float32array of audio)
            //   start (milliseconds into audio where speech starts)
            //   end (milliseconds into audio where speech ends)
            break;
          }
        }

        // delete the file if no speech detected
        if (!bFoundVoice) {
          logger.info(
            ms_to_time(time_offset) + " " + "no speech detected in burst",
          );
          logger.info("Deleting " + wav_filename);
          fs.unlink(
            wav_filename,
            (err) =>
              err && logger.error(`Failed to delete ${wav_filename}`, err),
          );
          return;
        }

        // at this point, we have a valid voice burst
        // we can now upload to convex and transcribe

        // 1. upload to convex
        uploadFileToConvex(
          wav_filename,
          username,
          session_id,
          user_id,
          time_offset,
          this.chan.guild.id,
          this.chan.id,
        )
          .then(() => {
            // upload success
          })
          .catch((e) => {
            logger.error("Failed to upload " + wav_filename, e);
          });

        // "transcribe and send back to live channel"
        let text = `filename: ${wav_filename} username: ${username} offset: ${ms_to_time(time_offset)}`;
        const fp = wav_filename.replace(/\.wav$/, ".txt");
        fs.writeFileSync(fp, text);
        // update live channel
        // const username = channel.guild.members.cache.get(user_id)?.displayName ?? user_id;
        // await live_chan.send({ content: `**${username}**: ${text}`, });
        logger.info(text);
      },
    );

    //--- event handler for change in connections ---------------------------------------------------------------------
    const client = this.chan.client;
    client.on("voiceStateUpdate", (old: VoiceState, cur: VoiceState) => {
      logger.info(`voiceStateUpdate: from: ${old} `);
      logger.info(`voiceStateUpdate: to: ${cur} `);

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
      // if (old.member?.id !== this.user.id) {
      //   logger.warn("voiceStateUpdate event: memberId changed");
      //   return;
      // }
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
