async (page) => {
	const check = (condition, message) => { if (!condition) throw new Error(message); };
	// 只读取基准响应；模拟数据仅通过浏览器请求拦截返回，不写入数据库。
	const baseline = await (await page.request.get("http://127.0.0.1:3000/api/database/dashboard?table=real_data_01&limit=100")).json();
	const cases = [
		{ name: "故障与报警", fault: "F01030", alarm: "A2062" },
		{ name: "仅故障", fault: 12, alarm: "0" },
		{ name: "仅报警", fault: "0", alarm: 2062 },
		{ name: "正常", fault: 0, alarm: "0" },
		{ name: "缺失", fault: null, alarm: "" },
	];
	let current = cases[0];
	const windowSession = await page.context().newCDPSession(page);
	const { windowId, bounds } = await windowSession.send("Browser.getWindowForTarget");
	const text = (value) => value === null || value === "" ? "—" : String(value);
	const color = (field, value) => value === 0 || value === "0" || value === null || value === ""
		? "rgb(30, 41, 59)" : field === "fault" ? "rgb(185, 28, 28)" : "rgb(161, 98, 7)";
	const verify = async (node, field, value, context) => {
		check(await node.innerText() === text(value), `${context}/${field}原始代码显示错误`);
		check(await node.evaluate((element) => getComputedStyle(element).color) === color(field, value), `${context}/${field}颜色错误`);
	};
	await page.route("**/api/database/dashboard?**", async (route) => {
		const data = structuredClone(baseline);
		data.latest.raw.device_name = `模拟验收 · ${current.name}`;
		data.latest.raw.fault_code = current.fault;
		data.latest.raw.alarm_code = current.alarm;
		data.records = data.records.slice(0, 3);
		for (const [index, record] of data.records.entries()) {
			record.raw.fault_code = index === 0 ? current.fault : index === 1 ? 0 : null;
			record.raw.alarm_code = index === 0 ? current.alarm : index === 1 ? "0" : "";
		}
		data.returned = data.records.length;
		await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
	});
	try {
		await page.setViewportSize({ width: 1366, height: 900 });
		for (const scenario of cases) {
			current = scenario;
			await page.goto("http://127.0.0.1:3000/#overview");
			await page.reload();
			await page.getByRole("heading", { name: `模拟验收 · ${current.name}`, exact: true }).waitFor();
			for (const view of ["设备概览", "实时数据", "故障与报警", "采样明细"]) {
				await page.getByRole("navigation", { name: "监控页面" }).getByRole("link", { name: view, exact: true }).click();
				await page.getByRole("heading", { name: view, exact: true, level: 1 }).waitFor();
				for (const [field, label] of [["fault", "故障码"], ["alarm", "报警码"]]) {
					if (view !== "采样明细") {
						await verify(page.locator(".running-card").filter({ has: page.getByText(label, { exact: true }) }).locator("strong"), field, current[field], view);
					}
					if (view === "设备概览") {
						await verify(page.locator(".parameter-grid > div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd"), field, current[field], "完整参数");
					}
					if (view === "故障与报警" || view === "采样明细") {
						const column = (await page.locator("table th").allTextContents()).indexOf(label);
						check(column >= 0, `${view}缺少${label}列`);
						for (let index = 0; index < 3; index++) {
							await verify(page.locator("table tbody tr").nth(index).locator("td").nth(column), field,
								index === 0 ? current[field] : index === 1 ? 0 : null, `${view}/记录${index}`);
						}
					}
				}
				if (scenario === cases[0] && view === "故障与报警") {
					check(await page.locator(".code-grid .running-card").filter({ has: page.getByText("控制字", { exact: true }) }).locator("strong").evaluate((node) => getComputedStyle(node).color) === "rgb(30, 41, 59)", "控制字被误标色");
					await page.screenshot({ path: "output/playwright/codes-simulated.png" });
				}
			}
		}
		console.log("PASS: 四个页面的故障红色、报警黄色、原始字母/数值代码、正常及缺失默认颜色、混合采样记录；数据库未写入。");
	} finally {
		try {
			await page.unroute("**/api/database/dashboard?**");
			await page.goto("http://127.0.0.1:3000/#overview");
			await page.reload();
			await page.locator(".sidebar-footer").filter({ hasText: "数据库查询成功" }).waitFor();
			check(await page.getByRole("heading", { name: /模拟验收/ }).count() === 0, "未恢复真实数据");
		} finally {
			// 撤销测试视口并恢复真实窗口，避免最大化后仍按固定尺寸显示。
			await page.setViewportSize({ width: 0, height: 0 });
			try {
				await windowSession.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal" } });
				await windowSession.send("Browser.setWindowBounds", { windowId, bounds: bounds.windowState === "normal" ? bounds : { windowState: bounds.windowState } });
			} finally { await windowSession.detach(); }
		}
	}
}
