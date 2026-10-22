import { dashboardTables } from "../../../dashboard/database/dashboard-types.ts";
import type { ChatSource, ChatToolCall } from "./types.ts";

export const sourcePages = { realtime: "实时数据", records: "采样明细" };

export function parseChatSource(value: unknown): ChatSource | undefined {
	if (!value || typeof value !== "object") return;
	const source = value as Record<string, unknown>;
	const table = dashboardTables.find((table) => table === source.table);
	if (
		!table ||
		(source.page !== "realtime" && source.page !== "records") ||
		typeof source.queriedAt !== "string" ||
		!Number.isFinite(Date.parse(source.queriedAt)) ||
		typeof source.returned !== "number" ||
		!Number.isInteger(source.returned) ||
		source.returned < 0 ||
		source.returned > 200
	)
		return;
	return { table, page: source.page, queriedAt: source.queriedAt, returned: source.returned };
}

export function sourceHref(source: ChatSource): string {
	return `/dashboard/?table=${source.table}#${source.page}`;
}

export function messageSources(tools: ChatToolCall[] = []): ChatSource[] {
	const sources = new Map<string, ChatSource>();
	for (const tool of tools) {
		if (tool.status !== "done" || !tool.source) continue;
		const source = tool.source;
		sources.set(`${source.table}/${source.page}/${source.queriedAt}`, source);
	}
	return [...sources.values()];
}
