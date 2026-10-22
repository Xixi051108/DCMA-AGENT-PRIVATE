import assert from "node:assert/strict";
import { test } from "node:test";
import { chatHistory, retryQuestion } from "../src/chat.ts";
import { hasToolMarkup, normalizeReply, ReplyTextStream, toolProtocolError } from "../src/reply-text.ts";
import type { ChatMessage } from "../src/types.ts";

test("protocol tags split at any stream boundary never appear as answer text", () => {
	for (const tag of [
		'<｜｜DSML｜｜ calls><｜｜DSML｜｜ invoke name="list_industrial_tables">',
		'<｜DSML｜ calls><｜DSML｜ invoke name="list_industrial_tables">',
		"<|DSML|tool_calls>",
		"< | DSML | invoke>",
		'<tool_call>\n{"name":"list_industrial_tables","arguments":{}}\n</tool_call>',
		"<tool_calls>",
	]) {
		const content = `已有有效正文。${tag}`;
		for (let split = 0; split <= content.length; split++) {
			let visible = "";
			const stream = new ReplyTextStream((text) => {
				visible += text;
			});
			assert.throws(
				() => {
					stream.push(content.slice(0, split));
					stream.push(content.slice(split));
					stream.finish();
				},
				{ message: toolProtocolError },
			);
			assert.equal(visible, "已有有效正文。");
		}
	}
});

test("normal streaming text, angle brackets, and discussion of DSML stay intact", () => {
	let visible = "";
	const text = "电流 < 3 A；DSML 是术语。代码：<div>设备</div>；末尾 <";
	const stream = new ReplyTextStream((delta) => {
		visible += delta;
	});
	for (const char of text) stream.push(char);
	stream.finish();
	assert.equal(visible, text);
	assert.equal(hasToolMarkup(text), false);
});

test("a response cut inside a tool marker is a failure", () => {
	for (const marker of ["<｜D", "<｜DS", "<|DSML", "<tool_call"]) {
		const stream = new ReplyTextStream(() => {});
		stream.push(marker);
		assert.throws(() => stream.finish(), { message: toolProtocolError });
	}
});

test("old completed protocol leaks become retryable errors and cannot contaminate history", () => {
	const question: ChatMessage = {
		id: "u1",
		role: "user",
		content: "查询当前设备状态",
		timestamp: "2026-10-21T08:00:00Z",
		status: "done",
	};
	const original: ChatMessage = {
		...question,
		id: "a1",
		role: "assistant",
		content: '已有正文。\n<｜DSML｜ calls><｜DSML｜ invoke name="list_industrial_tables">',
	};
	const normalized = normalizeReply(original);
	assert.equal(normalized.status, "error");
	assert.equal(normalized.content, "已有正文。");
	assert.equal(normalized.error, toolProtocolError);
	assert.equal(original.status, "done");
	assert.deepEqual(chatHistory([question, original], true), []);
	assert.equal(retryQuestion([question, original]), question.content);
	assert.equal(normalizeReply({ ...question, content: "<|DSML|tool_calls>" }).role, "user");
});
