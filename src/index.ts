import { bot } from "./bot";
import { BOT_TOKEN } from "./config";

import { ConvexHttpClient } from "convex/browser";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const address = process.env.CONVEX_URL;

const client: ConvexHttpClient = new ConvexHttpClient(String(address));
// client.query(api.tasks.get).then((response: any) => console.log(response));

// client.query(api.tasks.get).then((response) => console.log(response));

bot.login(BOT_TOKEN);
