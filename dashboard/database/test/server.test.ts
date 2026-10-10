import assert from "node:assert/strict";
import { once } from "node:events";
import { get } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { createDatabaseServer } from "../server.ts";
import type { DatabaseCatalog } from "../types.ts";

test("只读接口在无凭据时明确失败，并拒绝写入、无效参数及跨域访问", async (context) => {
	// 在独立测试进程中清除连接配置，避免访问真实 MySQL。
	for (const key of ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"]) delete process.env[key];
	const server = createDatabaseServer();
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	context.after(() => {
		server.closeAllConnections();
		server.close();
	});
	const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	const catalog = await fetch(`${base}/api/database/catalog`);
	assert.equal(catalog.status, 200);
	const body = (await catalog.json()) as DatabaseCatalog;
	assert.equal(body.configured, false);
	assert.equal(body.connected, false);
	assert.deepEqual(body.tables, []);
	assert.match(body.message, /尚未配置/);
	assert.equal((await fetch(`${base}/api/database/catalog`, { method: "POST" })).status, 405);
	assert.equal((await fetch(`${base}/api/database/rows?schema=example&table=real_data&limit=201`)).status, 400);
	assert.equal((await fetch(`${base}/api/database/rows`)).status, 400);
	assert.equal((await fetch(`${base}/api/database/rows?schema=example&table=real_data`)).status, 503);
	assert.equal((await fetch(`${base}/api/database/catalog`, { headers: { Origin: "https://example.com" } })).status, 403);
	const invalidHostStatus = await new Promise<number>((resolve, reject) => {
		get(`${base}/api/database/catalog`, { headers: { Host: "example.com:3001" } }, (response) => {
			response.resume();
			resolve(response.statusCode ?? 0);
		}).on("error", reject);
	});
	assert.equal(invalidHostStatus, 403);
	assert.equal((await fetch(`${base}/api/database/catalog`, { headers: { Origin: "http://127.0.0.1:3000" } })).status, 200);
	assert.equal((await fetch(`${base}/api/chat`)).status, 404);
});
