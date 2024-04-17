export function getLineNumber(): number | null {
	try {
		const error = new Error();
		const stack = error.stack?.split("\n")[2].trim();
		const lineNumberString = stack?.substring(
			stack.lastIndexOf(":") - 1,
			stack.lastIndexOf(":"),
		);
		const lineNumber = lineNumberString ? parseInt(lineNumberString, 10) : null;
		return lineNumber;
	} catch (e) {
		console.error("Failed to get line number:", e);
		return null;
	}
}
