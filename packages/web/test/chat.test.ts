import assert from "node:assert/strict";
import { test } from "node:test";
import { chatHistory, finishReply, retryQuestion } from "../src/chat.ts";
import { loadWorkspace, storageKey } from "../src/storage.ts";
import type { ChatMessage } from "../src/types.ts";

const messages: ChatMessage[] = [
	{ id: "u1", role: "user", content: "先前问题", timestamp: "2026-10-21T00:00:00Z", status: "done" },
	{ id: "a1", role: "assistant", content: "先前结论", timestamp: "2026-10-21T00:00:00Z", status: "done" },
	{ id: "u2", role: "user", content: "查询电机温度", timestamp: "2026-10-21T00:01:00Z", status: "done" },
	{
		id: "a2",
		role: "assistant",
		content: "已生成部分回答",
		timestamp: "2026-10-21T00:01:00Z",
		status: "error",
		error: "连接中断",
	},
];

test("retry sends the original question once and excludes incomplete replies from history", () => {
	assert.equal(retryQuestion(messages), "查询电机温度");
	assert.deepEqual(chatHistory(messages, true), [
		{ role: "user", content: "先前问题" },
		{ role: "assistant", content: "先前结论" },
	]);
	assert.equal(chatHistory(messages, false).length, 3);
	assert.equal(retryQuestion([...messages, { ...messages[3], id: "retry", status: "cancelled" }]), "查询电机温度");
	assert.equal(retryQuestion(messages.slice(0, 2)), undefined);
	assert.equal(retryQuestion([]), undefined);
	assert.equal(
		chatHistory(
			Array.from({ length: 40 }, () => messages[0]),
			false,
		).length,
		20,
	);
});

test("stopping or failing preserves partial text and finalizes pending tool calls", () => {
	const pending: ChatMessage = {
		...messages[3],
		status: "streaming",
		tools: [
			{ id: "t1", name: "list_industrial_tables", status: "done" },
			{ id: "t2", name: "read_industrial_dashboard", status: "running" },
		],
	};
	const failed = finishReply(pending, "error", "网络中断");
	assert.equal(failed.content, pending.content);
	assert.equal(failed.error, "网络中断");
	assert.deepEqual(
		failed.tools?.map((tool) => tool.status),
		["done", "cancelled"],
	);
	assert.equal(pending.tools?.[1].status, "running");
	assert.equal(finishReply(pending, "cancelled").error, undefined);
});

test("restoring a session retains errors and source, marks interrupted work, and rejects malformed tool history", (context) => {
	const saved = {
		conversations: [
			{
				id: "c1",
				title: "测试",
				time: messages[0].timestamp,
				deviceId: "real_data_01",
				messages: [
					{
						...messages[3],
						dataSource: "模拟数据",
						tools: [
							{
								id: "done",
								name: "read_industrial_dashboard",
								status: "done",
								source: {
									table: "real_data_04",
									page: "realtime",
									queriedAt: "2026-10-21T08:00:00Z",
									returned: 100,
								},
							},
						],
					},
					{
						...messages[3],
						id: "pending",
						status: "streaming",
						tools: [
							{ id: "running", name: "read_industrial_dashboard", status: "running" },
							{ id: "bad", name: "__proto__", status: "done" },
							{ id: "invalid", name: "list_industrial_tables", status: "unknown" },
							null,
						],
					},
					{
						...messages[3],
						id: "old-protocol",
						status: "done",
						content: '<｜DSML｜ calls><｜DSML｜ invoke name="list_industrial_tables">',
					},
				],
			},
		],
		activeId: "c1",
	};
	const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: { getItem: (key: string) => (key === storageKey ? JSON.stringify(saved) : null) },
	});
	context.after(() => {
		if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
		else Reflect.deleteProperty(globalThis, "localStorage");
	});
	const restored = loadWorkspace().conversations[0].messages;
	assert.equal(restored[0].error, "连接中断");
	assert.equal(restored[0].dataSource, "模拟数据");
	assert.equal(restored[0].tools?.[0].status, "done");
	assert.equal(restored[0].tools?.[0].source?.table, "real_data_04");
	assert.equal(restored[1].status, "cancelled");
	assert.deepEqual(restored[1].tools, [{ id: "running", name: "read_industrial_dashboard", status: "cancelled" }]);
	assert.equal(restored[2].status, "error");
	assert.equal(restored[2].content, "");
	assert.ok(restored[2].error?.includes("未执行的工具调用"));
});
