import { bot } from "./bot";
import { BOT_TOKEN } from "./config";

bot.login(BOT_TOKEN);

import { uploadFileToConvex } from "./recorder/convexuploader";
// test1().then(console.log);
uploadFileToConvex("./data/recording/1714273057501/1007158516705927243/00000524.wav").then(
	console.log,
);
