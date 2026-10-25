async (page) => {
  const checks = []; const errors = []; const observedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if(request.url().includes('/api/chat')) observedRequests.push(request.url()); });
  const check = (id, condition, detail) => { checks.push({id,passed:!!condition,detail}); };
  await page.goto('http://127.0.0.1:3000/');
  await page.evaluate(state => localStorage.setItem('dcma-workspace-v1',JSON.stringify(state)), {"conversations":[{"id":"evaluation-replay","title":"真实回答回放：设备基本信息","time":"2026-10-15T08:16:27.437Z","deviceId":"real_data_01","messages":[{"id":"eval-user","role":"user","content":"查询当前设备的基本信息和数据状态","timestamp":"2026-10-15T08:16:27.437Z","status":"done"},{"id":"eval-answer","role":"assistant","content":"我先读取数据库目录和当前设备看板数据。## 一、数据来源与查询方式\n- 库/表：`dcma.real_data_01`（**模拟数据**，非真实采集；真实采集表为 `dcma.real_data`）\n- 设备：`device_name = G120电机1`，`inverter_name = G120电机1`\n- 查询工具：目录发现 `list_industrial_tables` + 同源看板 `read_industrial_dashboard`\n- 查询时间：2026-10-15T08:16:31.856Z（工具返回时间）\n- 数据窗口：**id 1040953–1041052，共100条，约16:09:52–16:16:28（按展板暂定北京时间）**，采样间隔约4秒；该表 `hasMore=true`，本次仅为最近100条窗口，**不是全库统计**\n\n## 二、设备基本信息（表中可得字段）\n| 项目 | 值 |\n|---|---|\n| 设备名/变频器名 | G120电机1 / G120电机1 |\n| 数据日期/时间 | 2026-10-15 / 16:16:28 |\n| 最新记录ID | 1041052 |\n| system_run_time | 0000:00:00 |\n| 位置、投运日期 | **未提供**（当前来源无此字段） |\n\n## 三、数据状态\n- **采集连续性**：窗口内100条记录时间递增、间隔稳定约4秒，未见明显断点（仅就本窗口而言）。\n- **码值字段（未解码，不能推断运行状态）**：最新记录 `status=\"0\"`、`fault_code=\"0\"`、`alarm_code=\"0\"`，`control_word=\"5246\"`、`status_word=\"8784\"`。这些字的位定义未确认，**不作运行/停机或故障判断**。\n- **最新一条采样值**：直流电压 554.63；设定转速 759.21 / 实际转速 849.30；实际电流 0.775；设定扭矩 0.103 / 实际扭矩 −0.057；进气温度 26.18；电机温度 36.59；变频器温度 29.43；变频器散热器温度 31.14；实际功率 −0.019；励磁电流 0.525；转矩电流 0.194；变频器负载率 35.10；电机负载率 56.05；脉冲频率 3.642；电机功率 0.51；反馈功率 0.011。\n\n## 四、需要说明的限制\n1. **单位未确认**：电压、转速、温度、功率、负载率的工程单位在表结构中只有中文注释（如“直流电压”“实际转速”），**具体单位未确认**。\n2. **时区未确认**：`timestamp` 原始值为 16:16:28，而工具 `acquiredAt` 为 08:16:28Z，两者相差8小时；按展板暂定北京时间解释，字段真实时区未经核实。\n3. 以上数值仅代表该设备在当前**模拟**数据窗口中的记录，不代表全库或长期趋势。\n\n## 五、待验证建议（非结论）\n- 若需判断运行状态与故障，需先取得 `status`/`status_word`/`fault_code` 的厂家位定义；当前未连接厂家知识库，无法解码。\n- 若关注“实际功率为负”“设定与实际转速存在偏差”等现象，建议先确认单位、时区与采样口径，再扩大时间窗口做趋势对比。","timestamp":"2026-10-15T08:16:27.437Z","status":"done","engine":"DCMA Agent · deepseek/deepseek-flash"}]}],"activeId":"evaluation-replay","deviceId":"real_data_01","settings":{"model":"deepseek/deepseek-flash","telemetryIntervalMs":3000,"alarmThreshold":75,"databaseEnabled":true},"datasets":{}});
  await page.reload();
  await page.getByRole('log',{name:'对话消息'}).waitFor();
  check('U01', (await page.locator('.message-markdown').textContent()).includes('G120'), '真实P01回答经现有渲染组件显示');
  check('U02', await page.locator('.message-markdown h1,.message-markdown h2,.message-markdown h3').count() > 0, '真实回答Markdown标题解析');
  check('U03', await page.locator('.message-markdown table').count() > 0, '真实回答Markdown表格解析');
  for (const width of [375,768,1440]) {
    await page.setViewportSize({width,height:900});
    check('U04-'+width, await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth), '页面整体无横向溢出');
    check('U05-'+width, await page.getByRole('textbox',{name:'问题输入'}).isVisible(), '输入框可见');
    await page.getByRole('log',{name:'对话消息'}).evaluate(el=>el.scrollTop=0);
    await page.screenshot({path:'output/playwright/agent-eval-replay-'+width+'.png',fullPage:true});
  }
  await page.setViewportSize({width:1440,height:900});
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{name:'下载分析报告'}).click();
  const download = await downloadPromise;
  await download.saveAs('D:/DCMA-Agent/agent-evaluation/2026-10-15/analysis-download.md');
  check('U06', download.suggestedFilename().endsWith('.md'), '分析内容可导出Markdown');
  await page.getByRole('button',{name:'查看更多',exact:true}).click();
  await page.waitForURL('**/dashboard/**');
  check('U07',page.url().includes('table=real_data_01')&&page.url().endsWith('#realtime'),'进入展板保留来源');
  await page.getByRole('heading',{name:'实时数据',exact:true,level:1}).waitFor();
  check('U08',await page.locator('.gauge-card').count()===6,'展板六个仪表加载');
  await page.screenshot({path:'output/playwright/agent-eval-dashboard.png',fullPage:true});
  await page.goBack();
  await page.getByRole('log',{name:'对话消息'}).waitFor();
  check('U09',(await page.locator('.message-markdown').textContent()).includes('G120'),'返回聊天页保留会话');
  check('U10',errors.length===0,JSON.stringify(errors));
  check('U11',observedRequests.length===0,'回放检查没有发起额外模型请求');
  return {mode:'saved-real-answer-replay',sourceCase:'P01',checks,errors,observedRequests};
}