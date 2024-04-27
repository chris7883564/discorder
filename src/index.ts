import { bot } from "./bot";
import { BOT_TOKEN } from "./config";

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
const address = process.env.CONVEX_URL;

const client: ConvexHttpClient = new ConvexHttpClient(String(address));
client.query(api.tasks.get).then((response: any) => console.log(response));

bot.login(BOT_TOKEN);
