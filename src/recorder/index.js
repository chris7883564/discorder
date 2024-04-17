import { Recorder } from "./recorder";
export const tasks = new Map();
export function add(conn, chan, user) {
	const recorder = new Recorder(conn, chan, user);
	tasks.set(user.id, recorder);
	return recorder;
}
export function remove(user) {
	const recorder = tasks.get(user.id);
	if (recorder) {
		recorder.stop();
		tasks.delete(user.id);
		return recorder;
	} else {
		return null;
	}
}
//# sourceMappingURL=index.js.map
