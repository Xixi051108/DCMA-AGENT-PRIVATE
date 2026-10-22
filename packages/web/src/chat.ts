import { normalizeReply } from "./reply-text.ts";
import type { ChatMessage } from "./types.ts";

export const toolLabels: Record<string, string> = {
	list_industrial_tables: "读取数据库目录",
	read_industrial_dashboard: "查询设备监测数据",
	read_industrial_rows: "查询设备记录",
};

export function retryQuestion(messages: ChatMessage[]): string | undefined {
	const lastMessage = messages.at(-1);
	const last = lastMessage ? normalizeReply(lastMessage) : undefined;
	if (last?.role !== "assistant" || (last.status !== "error" && last.status !== "cancelled")) return;
	return messages.findLast((message) => message.role === "user")?.content;
}

export function chatHistory(messages: ChatMessage[], retry: boolean) {
	const history = retry
		? messages.slice(
				0,
				messages.findLastIndex((message) => message.role === "user"),
			)
		: messages;
	return history
		.map(normalizeReply)
		.filter((message) => message.status === "done" && message.content.trim())
		.slice(-20)
		.map(({ role, content }) => ({ role, content: content.slice(0, 8000) }));
}

export function finishReply(message: ChatMessage, status: "done" | "error" | "cancelled", error?: string): ChatMessage {
	return {
		...message,
		status,
		error,
		tools: message.tools?.map((tool) => (tool.status === "running" ? { ...tool, status: "cancelled" } : tool)),
	};
}
