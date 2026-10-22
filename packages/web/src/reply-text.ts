import type { ChatMessage } from "./types.ts";

export const toolProtocolError = "模型返回了未执行的工具调用标记，本次回答未完成。请重试或更换模型。";
const toolMarker = /<\s*(?:[|｜]+\s*DSML\s*[|｜]+|tool_calls?\s*>)/iu;
const toolPrefixes = ["<|DSML|", "<TOOL_CALL>", "<TOOL_CALLS>"];

export function hasToolMarkup(text: string): boolean {
	return toolMarker.test(text);
}

export function normalizeReply(message: ChatMessage): ChatMessage {
	if (message.role !== "assistant") return message;
	const index = message.content.search(toolMarker);
	return index < 0
		? message
		: { ...message, content: message.content.slice(0, index).trimEnd(), status: "error", error: toolProtocolError };
}

export class ReplyTextStream {
	private pending = "";
	private readonly onText: (text: string) => void;

	constructor(onText: (text: string) => void) {
		this.onText = onText;
	}

	push(delta: string): void {
		this.pending += delta;
		const marker = this.pending.search(toolMarker);
		if (marker >= 0) {
			if (marker) this.onText(this.pending.slice(0, marker));
			this.pending = "";
			throw new Error(toolProtocolError);
		}
		const start = this.pending.lastIndexOf("<");
		const suffix = this.pending
			.slice(start)
			.replace(/\s/gu, "")
			.replace(/[|｜]+/gu, "|")
			.toUpperCase();
		const hold = start >= 0 && toolPrefixes.some((prefix) => prefix.startsWith(suffix)) ? start : this.pending.length;
		if (hold) this.onText(this.pending.slice(0, hold));
		this.pending = this.pending.slice(hold);
	}

	finish(): void {
		const suffix = this.pending
			.replace(/\s/gu, "")
			.replace(/[|｜]+/gu, "|")
			.toUpperCase();
		if (
			(suffix.startsWith("<|D") || suffix.startsWith("<TOOL_")) &&
			toolPrefixes.some((prefix) => prefix.startsWith(suffix))
		) {
			this.pending = "";
			throw new Error(toolProtocolError);
		}
		if (this.pending) this.onText(this.pending);
		this.pending = "";
	}
}
