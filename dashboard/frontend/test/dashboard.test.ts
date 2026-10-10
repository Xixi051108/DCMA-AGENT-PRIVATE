import assert from "node:assert/strict";
import { test } from "node:test";
import { displayTime, displayValue, displayRaw, displayRawField, displayFieldLabel, fieldUnits, sampleIdentity, sampleRange, linePath } from "../src/dashboard-view.ts";
import { dashboardExample } from "../../database/test/dashboard-example.ts";

test("展板显示保留0、负数、原始代码并明确缺失值和北京时间", () => {
	assert.equal(displayValue(0), "0");
	assert.equal(displayValue(-200), "-200");
	assert.equal(displayValue("0000:00:00"), "0000:00:00");
	assert.equal(displayRaw(0.123456789), "0.123456789");
	assert.equal(displayRaw(0), "0");
	assert.match(displayTime("2026-01-14T10:27:24.814Z", false, true), /18:27:24.814/);
	for (const value of [null, undefined, ""]) assert.equal(displayValue(value), "—");
	assert.match(displayTime("2026-01-14T10:27:24.814Z"), /18:27:24/);
	const example = dashboardExample();
	assert.equal(example.records.length, 100);
	assert.equal(example.samples.length, 100);
	assert.ok(example.samples.every((sample, index) => index === 0 || sample.acquiredAt >= example.samples[index - 1].acquiredAt));
	assert.notEqual(sampleIdentity(example.latest), sampleIdentity(null));
	assert.match(example.latest!.raw.device_name!, /开发样例/);
});

test("参考单位只作标注，故障报警仅0标为正常，其他代码和缺失保留", () => {
	assert.equal(displayFieldLabel("speed_actual"), "实际转速（rpm）");
	assert.equal(displayFieldLabel("torque_actual"), "实际转矩（N·m）");
	assert.equal(displayFieldLabel("inverter_load_rate"), "变频器负荷率（%）");
	assert.equal(fieldUnits.pulse_frequency, undefined);
	assert.equal(fieldUnits.system_run_time, undefined);
	for (const field of ["fault_code", "alarm_code"] as const) {
		assert.equal(displayRawField(field, 0), "0（正常）");
		assert.equal(displayRawField(field, "0"), "0（正常）");
		assert.equal(displayRawField(field, "A2062"), "A2062");
		assert.equal(displayRawField(field, "F01030"), "F01030");
		assert.equal(displayRawField(field, 12), "12");
		for (const value of [null, undefined, ""]) assert.equal(displayRawField(field, value), "—");
	}
	assert.equal(displayRawField("status_word", "0"), "0");
	assert.equal(displayRawField("motor_load_rate", 0.123456789), "0.123456789");
});

test("仪表采样范围过滤缺失值，恒定值有非零跨度且保留负数", () => {
	assert.equal(sampleRange([null, NaN, Infinity]), null);
	assert.deepEqual(sampleRange([0, null, 20, -10]), { min: -10, max: 20 });
	assert.deepEqual(sampleRange([0, 0]), { min: -1, max: 1 });
	assert.deepEqual(sampleRange([-200, -200]), { min: -220, max: -180 });
});

test("曲线在缺失点断开，0与负值仍保留且单点可绘制", () => {
	assert.equal(linePath([{ x: 0, y: 0 }, { x: 1, y: -2 }, { x: 2, y: null }, { x: 3, y: 4 }]), "M0.00,0.00 L1.00,-2.00  M3.00,4.00");
	assert.equal(linePath([{ x: 0, y: null }, { x: 1, y: 0 }]), "M1.00,0.00");
	assert.equal(linePath([{ x: 0, y: null }]), "");
});
