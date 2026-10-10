async (page) => {
	const check = (condition, message) => { if (!condition) throw new Error(message); };
	await page.goto("http://127.0.0.1:3000");
	await page.locator(".sidebar-footer").filter({ hasText: "数据库查询成功" }).waitFor();
	for (const width of [1366, 1920]) {
		await page.setViewportSize({ width, height: width === 1366 ? 900 : 1080 });
		check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${width}页面横向溢出`);
		check(await page.locator(".gauge-card").count() === 6, "六个仪表缺失");
		check(await page.locator(".motor-card").count() === 4, "四台概览缺失");
		await page.screenshot({ path: `output/playwright/dashboard-${width}.png`, fullPage: true });
	}
	const chart = page.getByRole("group", { name: /设定转速与实际转速趋势/ });
	await chart.hover({ position: { x: 250, y: 100 } });
	await page.locator(".chart-tooltip").waitFor();
	check((await page.locator(".chart-tooltip").innerText()).includes("实际转速"), "悬停没有实际值");
	await chart.focus();
	await page.keyboard.press("Home");
	const first = await page.locator(".chart-tooltip").innerText();
	await page.keyboard.press("ArrowRight");
	check(await page.locator(".chart-tooltip").innerText() !== first, "键盘未切换采样");
	await page.keyboard.press("Escape");
	check(await page.locator(".chart-tooltip").count() === 0, "Esc未关闭提示");
	const metric = page.getByRole("combobox", { name: "查看指标" });
	await metric.selectOption("torque");
	await page.getByRole("group", { name: /设定转矩与实际转矩趋势/ }).waitFor();
	const fields = await metric.locator("optgroup[label='单项指标'] option").evaluateAll((options) => options.map((option) => option.value));
	check(fields.length === 18, "单项指标不是18个");
	for (const field of fields) {
		await metric.selectOption(field);
		check(await page.locator(".chart-surface svg path").count() === 1, `${field}曲线缺失`);
	}
	await metric.selectOption("speed");
	for (const limit of ["50", "200", "100"]) {
		await page.getByRole("combobox", { name: "采样条数" }).selectOption(limit);
		await page.getByText(new RegExp(`已返回 ${limit} 条记录`)).waitFor();
	}
	await page.getByRole("combobox", { name: "查看设备" }).selectOption("2");
	await page.getByRole("region", { name: "当前设备详情" }).getByRole("heading", { name: "G120电机2", exact: true }).waitFor();
	await page.locator(".motor-card").nth(0).click();
	await page.getByRole("region", { name: "当前设备详情" }).getByRole("heading", { name: "G120电机1", exact: true }).waitFor();
	await page.getByRole("combobox", { name: "电机 1 数据来源" }).selectOption("history");
	await page.getByText("2026/01/14 18:27:24", { exact: true }).first().waitFor();
	await page.getByRole("button", { name: "刷新数据", exact: true }).click();
	await page.getByText("本次无新采样", { exact: true }).waitFor();
	check((await page.locator(".device-detail").innerText()).includes("历史真实采集"), "历史来源标识错误");
	await page.locator("summary").focus();
	await page.keyboard.press("Enter");
	check(await page.locator("details").getAttribute("open") !== null, "采样明细键盘未展开");
	check(await page.locator("table th").count() === 31, "原始记录缺字段");
	await page.keyboard.press("Enter");
	await page.getByRole("combobox", { name: "电机 1 数据来源" }).selectOption("simulation");
	await page.locator(".sidebar-footer").filter({ hasText: "数据库查询成功" }).waitFor();
	await page.getByText("检测到新采样", { exact: true }).waitFor({ timeout: 12000 });
	await page.setViewportSize({ width: 1366, height: 900 });
	await page.locator(".chart-surface svg").hover({ position: { x: 450, y: 120 } });
	await page.screenshot({ path: "output/playwright/trend-hover.png" });
	console.log("PASS: 1366/1920无横向溢出；6仪表/4概览/31字段；悬停、键盘、18指标、50/100/200、设备/来源切换、手动刷新、真实历史无新采样、模拟自动新采样。");
}
