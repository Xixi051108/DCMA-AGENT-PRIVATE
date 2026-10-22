import assert from "node:assert/strict";
import { test } from "node:test";
import { messageSources, parseChatSource, sourceHref } from "../src/sources.ts";
import type { ChatSource } from "../src/types.ts";

const source: ChatSource = {
	table: "real_data_03",
	page: "realtime",
	queriedAt: "2026-10-21T08:00:00Z",
	returned: 100,
};

test("citations link to the actual queried source and corresponding dashboard page", () => {
	assert.equal(sourceHref(source), "/dashboard/?table=real_data_03#realtime");
	assert.equal(sourceHref({ ...source, table: "real_data", page: "records" }), "/dashboard/?table=real_data#records");
	assert.deepEqual(parseChatSource({ ...source, href: "https://untrusted.example" }), source);
});

test("invalid persisted or streamed citation metadata is rejected", () => {
	for (const value of [
		null,
		{ ...source, table: "other_table" },
		{ ...source, page: "javascript:alert(1)" },
		{ ...source, queriedAt: "invalid" },
		{ ...source, returned: -1 },
		{ ...source, returned: 201 },
		{ ...source, returned: "100" },
	]) {
		assert.equal(parseChatSource(value), undefined);
	}
	assert.equal(parseChatSource({ ...source, returned: 0 })?.returned, 0);
});

test("only successful queries create citations, repeated events deduplicate, distinct queries remain separate", () => {
	const tools = [
		{ id: "1", name: "read_industrial_dashboard", status: "done" as const, source },
		{ id: "2", name: "read_industrial_dashboard", status: "done" as const, source },
		{ id: "3", name: "read_industrial_rows", status: "error" as const, source },
		{ id: "4", name: "read_industrial_rows", status: "running" as const, source },
		{ id: "5", name: "list_industrial_tables", status: "done" as const },
		{
			id: "6",
			name: "read_industrial_rows",
			status: "done" as const,
			source: { ...source, page: "records" as const },
		},
	];
	assert.deepEqual(messageSources(tools), [source, { ...source, page: "records" }]);
	assert.deepEqual(messageSources(), []);
});
