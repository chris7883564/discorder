import { bot } from "./bot";
import { BOT_TOKEN } from "./config";

bot.login(BOT_TOKEN);

import { testSendAudio } from "./ctest";
// test1().then(console.log);
testSendAudio().then(console.log);
