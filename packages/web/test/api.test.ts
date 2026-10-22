import assert from "node:assert/strict";
import { test } from "node:test";
import { streamChat } from "../src/api.ts";
import { toolProtocolError } from "../src/reply-text.ts";
import type { ChatToolCall } from "../src/types.ts";

test("stream decodes split UTF-8, dispatches tool states, and ends at done without waiting for disconnect", async (context) => {
	const encoder = new TextEncoder();
	const bytes = encoder.encode(
		[
			JSON.stringify({ type: "tool", id: "t1", name: "read_industrial_dashboard", status: "running" }),
			JSON.stringify({ type: "tool", id: "t1", name: "read_industrial_dashboard", status: "error" }),
			JSON.stringify({ type: "delta", text: "温度：45℃" }),
			JSON.stringify({ type: "done" }),
			"",
		].join("\n"),
	);
	let cancelled = false;
	context.mock.method(
		globalThis,
		"fetch",
		async () =>
			new Response(
				new ReadableStream({
					start(controller) {
						for (let index = 0; index < bytes.length; index += 2)
							controller.enqueue(bytes.slice(index, index + 2));
					},
					cancel() {
						cancelled = true;
					},
				}),
			),
	);
	let text = "";
	const tools: ChatToolCall[] = [];
	await streamChat(
		{},
		new AbortController().signal,
		(delta) => {
			text += delta;
		},
		(tool) => tools.push(tool),
	);
	assert.equal(text, "温度：45℃");
	assert.deepEqual(
		tools.map((tool) => tool.status),
		["running", "error"],
	);
	assert.ok(cancelled);
});

test("partial reply remains available when server errors or closes early", async (context) => {
	for (const tail of [JSON.stringify({ type: "error", message: "数据库连接失败" }), ""]) {
		context.mock.method(
			globalThis,
			"fetch",
			async () => new Response(`${JSON.stringify({ type: "delta", text: "部分回答" })}\n${tail}`),
		);
		let text = "";
		await assert.rejects(
			streamChat({}, new AbortController().signal, (delta) => {
				text += delta;
			}),
			/数据库连接失败|连接提前结束/,
		);
		assert.equal(text, "部分回答");
		context.mock.restoreAll();
	}
});

test("non-JSON HTTP errors and invalid tool events have readable errors", async (context) => {
	context.mock.method(globalThis, "fetch", async () => new Response("Bad gateway", { status: 502 }));
	await assert.rejects(
		streamChat({}, new AbortController().signal, () => {}),
		/请求失败（502）/,
	);
	context.mock.restoreAll();
	context.mock.method(
		globalThis,
		"fetch",
		async () => new Response('{"type":"tool","id":"t1","name":"query","status":"invalid"}\n'),
	);
	await assert.rejects(
		streamChat({}, new AbortController().signal, () => {}),
		/工具状态格式无效/,
	);
});

test("source citations survive streaming only on successful tools and invalid links are discarded", async (context) => {
	const source = { table: "real_data_02", page: "records", queriedAt: "2026-10-21T08:00:00Z", returned: 20 };
	context.mock.method(
		globalThis,
		"fetch",
		async () =>
			new Response(
				[
					{ type: "tool", id: "1", name: "read_industrial_rows", status: "running", source },
					{ type: "tool", id: "1", name: "read_industrial_rows", status: "done", source },
					{
						type: "tool",
						id: "2",
						name: "read_industrial_rows",
						status: "done",
						source: { ...source, page: "https://untrusted.example" },
					},
					{ type: "tool", id: "3", name: "read_industrial_rows", status: "error", source },
					{ type: "done" },
				]
					.map((event) => JSON.stringify(event))
					.join("\n"),
			),
	);
	const tools: ChatToolCall[] = [];
	await streamChat(
		{},
		new AbortController().signal,
		() => {},
		(tool) => tools.push(tool),
	);
	assert.equal(tools[0].source, undefined);
	assert.deepEqual(tools[1].source, source);
	assert.equal(tools[2].source, undefined);
	assert.equal(tools[3].source, undefined);
});

test("a server returning tool markup as completed text is rejected before raw tags reach the page", async (context) => {
	context.mock.method(
		globalThis,
		"fetch",
		async () =>
			new Response(
				[
					{ type: "delta", text: "已有正文。<｜DS" },
					{ type: "delta", text: 'ML｜ calls><｜DSML｜ invoke name="list_industrial_tables">' },
					{ type: "done" },
				]
					.map((event) => JSON.stringify(event))
					.join("\n"),
			),
	);
	let visible = "";
	await assert.rejects(
		streamChat({}, new AbortController().signal, (delta) => {
			visible += delta;
		}),
		{ message: toolProtocolError },
	);
	assert.equal(visible, "已有正文。");
});
