import assert from "node:assert/strict";
import { test } from "node:test";
import { Readable } from "node:stream";
import { createPool } from "mysql2/promise";
import { closeDatabase, listDatabaseTables, readDashboard, readCodeHistory } from "../database.ts";
import { dashboardTables, fieldLabels } from "../dashboard-types.ts";

test("只读查询对缺失表、标识混合、空表与全无效时间明确返回且不混设备", async (context) => {
	// 替换连接取得方法，独立测试进程不连接任何真实数据库。
	process.env.MYSQL_HOST = "test.invalid";
	process.env.MYSQL_USER = "test";
	process.env.MYSQL_PASSWORD = "test";
	process.env.MYSQL_DATABASE = "dcma";
	const dummyPool = createPool({});
	let scenario = "normal";
	const queries: string[] = [];
	const connection = {
		connection: { query(options: { sql: string }, parameters: unknown[]) {
			queries.push(options.sql);
			assert.match(options.sql, /WHERE device_name <=> \? AND inverter_name <=> \?/);
			assert.match(options.sql, /ORDER BY __collection_ms ASC, id ASC/);
			assert.doesNotMatch(options.sql, /LIMIT/);
			assert.deepEqual(parameters, ["设备A", "变频器A"]);
			return { stream: () => Readable.from([{ id: "1", timestamp: scenario === "invalid" ? "invalid" : "2026-10-10 12:00:00", fault_code: "F1", alarm_code: 0 }, { id: "2", timestamp: scenario === "invalid" ? "invalid" : "2026-10-10 12:01:00", fault_code: 0, alarm_code: 0 }]) };
		} },
		async query(options: { sql: string }) {
			queries.push(options.sql);
			if (options.sql.includes("information_schema.COLUMNS")) return [dashboardTables.flatMap((table) => {
				if (scenario === "missing" && table === "real_data_01") return [];
				return Object.keys(fieldLabels).filter((field) => scenario !== "columns" || table !== "real_data_01" || field !== "timestamp").map((field) => ({
					TABLE_SCHEMA: "dcma", TABLE_NAME: table, COLUMN_NAME: field, DATA_TYPE: "varchar", COLUMN_KEY: field === "id" ? "PRI" : "", COLUMN_COMMENT: "",
				}));
			})];
			if (options.sql.includes("SELECT DISTINCT")) {
				const selected = options.sql.includes("`real_data_01`");
				if (selected && scenario === "empty") return [[]];
				if (selected && scenario === "mixed") return [[{ device_name: "设备A", inverter_name: "变频器A" }, { device_name: "设备B", inverter_name: "变频器B" }]];
				return [[{ device_name: "设备A", inverter_name: "变频器A" }]];
			}
			return [[]];
		},
		async execute(options: { sql: string }, parameters: unknown[]) {
			if (options.sql.includes("information_schema.COLUMNS")) return this.query(options);
			queries.push(options.sql);
			assert.match(options.sql, /WHERE device_name <=> \? AND inverter_name <=> \?/);
			assert.match(options.sql, /ORDER BY __collection_ms DESC, id DESC LIMIT \?/);
			assert.deepEqual(parameters.slice(0, 2), ["设备A", "变频器A"]);
			return [[{ id: "2", device_name: "设备A", inverter_name: "变频器A", timestamp: scenario === "invalid" ? "invalid" : "2026-10-10 12:00:00", speed_actual: 0 }]];
		},
		destroy() {}, release() {},
	};
	context.mock.method(Object.getPrototypeOf(dummyPool), "getConnection", async () => connection);
	context.after(async () => { await closeDatabase(); await dummyPool.end(); });
	for (const mode of ["normal", "missing", "columns", "mixed", "empty", "invalid"]) {
		scenario = mode;
		await listDatabaseTables(true);
		const data = await readDashboard("real_data_01", 100);
		const selected = data.sources.find((source) => source.table === "real_data_01")!;
		assert.equal(data.sources.length, 5);
		assert.equal(data.latest, selected.latest);
		if (mode === "normal") { assert.equal(data.latest?.values.speed_actual, 0); assert.equal(data.samples.length, 1); }
		if (mode === "missing") { assert.equal(selected.available, false); assert.equal(data.latest, null); assert.match(selected.message, /数据表不存在/); }
		if (mode === "columns") { assert.equal(data.latest, null); assert.match(selected.message, /缺少/); }
		if (mode === "mixed") { assert.equal(data.latest, null); assert.match(selected.message, /多个设备/); }
		if (mode === "empty") { assert.deepEqual(data.records, []); assert.match(selected.message, /暂无采样/); }
		if (mode === "invalid") { assert.equal(data.latest?.raw.timestamp, "invalid"); assert.equal(data.latest?.acquiredAt, null); assert.deepEqual(data.samples, []); assert.ok(data.warnings.some((warning) => warning.includes("无法解析"))); }
		if (mode === "missing" || mode === "columns") await assert.rejects(readCodeHistory({ table: "real_data_01", page: 1 }), /CODE_HISTORY_UNAVAILABLE/);
		else if (mode === "mixed") await assert.rejects(readCodeHistory({ table: "real_data_01", page: 1 }), /CODE_HISTORY_MIXED_DEVICES/);
		else {
			const history = await readCodeHistory({ table: "real_data_01", page: 1 });
			assert.equal(history.total, mode === "normal" ? 1 : 0);
			if (mode === "normal") assert.equal(history.events[0].endedAt, "2026-10-10T04:01:00.000Z");
			if (mode === "invalid") assert.equal(history.invalidTimes, 2);
		}
	}
	assert.ok(queries.some((sql) => sql === "START TRANSACTION READ ONLY"));
	assert.ok(queries.every((sql) => /^(SELECT|START TRANSACTION READ ONLY|COMMIT)/.test(sql)));
});
