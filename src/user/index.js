import fs from "node:fs";
import path from "node:path";
import { USER_DATA_DIR } from "../config";
export class UserDataManager {
	dir;
	constructor(dir) {
		this.dir = path.resolve(dir);
		fs.mkdirSync(this.dir, { recursive: true });
	}
	get(id) {
		const file = path.join(this.dir, `${id}.json`);
		if (fs.existsSync(file)) {
			return JSON.parse(fs.readFileSync(file, "utf-8"));
		} else {
			return {};
		}
	}
	set(id, data) {
		const file = path.join(this.dir, `${id}.json`);
		fs.writeFileSync(file, JSON.stringify(data));
	}
}
export const manager = new UserDataManager(USER_DATA_DIR);
//# sourceMappingURL=index.js.map
