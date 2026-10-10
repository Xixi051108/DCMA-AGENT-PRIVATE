import assert from "node:assert/strict";
import { test } from "node:test";
import { displayTime, displayValue, sampleIdentity, sampleRange } from "../src/dashboard-view.ts";
import { dashboardExample } from "../../database/test/dashboard-example.ts";

test("展板显示保留0、负数、原始代码并明确缺失值和北京时间", () => {
	assert.equal(displayValue(0), "0");
	assert.equal(displayValue(-200), "-200");
	assert.equal(displayValue("0000:00:00"), "0000:00:00");
	for (const value of [null, undefined, ""]) assert.equal(displayValue(value), "—");
	assert.match(displayTime("2026-01-14T10:27:24.814Z"), /18:27:24/);
	const example = dashboardExample();
	assert.equal(example.records.length, 100);
	assert.equal(example.samples.length, 100);
	assert.ok(example.samples.every((sample, index) => index === 0 || sample.acquiredAt >= example.samples[index - 1].acquiredAt));
	assert.notEqual(sampleIdentity(example.latest), sampleIdentity(null));
	assert.match(example.latest!.raw.device_name!, /开发样例/);
});

test("仪表采样范围过滤缺失值，恒定值有非零跨度且保留负数", () => {
	assert.equal(sampleRange([null, NaN, Infinity]), null);
	assert.deepEqual(sampleRange([0, null, 20, -10]), { min: -10, max: 20 });
	assert.deepEqual(sampleRange([0, 0]), { min: -1, max: 1 });
	assert.deepEqual(sampleRange([-200, -200]), { min: -220, max: -180 });
});
