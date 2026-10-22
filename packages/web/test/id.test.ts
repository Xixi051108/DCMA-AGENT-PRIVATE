import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { test } from "node:test";
import { createId } from "../src/id.ts";

test("message IDs work on LAN HTTP without crypto.randomUUID", (context) => {
	context.mock.getter(globalThis, "crypto", () => ({ getRandomValues: webcrypto.getRandomValues.bind(webcrypto) }));
	assert.equal(typeof crypto.randomUUID, "undefined");
	const ids = Array.from({ length: 1000 }, () => createId());
	assert.ok(ids.every((id) => /^[0-9a-f]{32}$/.test(id)));
	assert.equal(new Set(ids).size, ids.length);
});
