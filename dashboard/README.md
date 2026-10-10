# DCMA 电机监控展板

独立项目位于个人仓库 `Xixi051108/DCMA-AGENT-PRIVATE` 的 `main`。前端为 React / TypeScript / Vite / Tailwind，后端为 Node / MySQL，只查询 `dcma` 库的五张已确认表。无需启动 Pi SDK。

已实现四台电机概览、单台详情、六个半圆仪表、趋势曲线、运行信息、31 个原始字段及可展开采样明细。正式页面只显示接口查询结果，不会以开发样例替代数据库。

## 启动

当前本机环境和 `database/.env` 已准备完成，在两个终端分别运行：

```powershell
cd D:\DCMA-Agent\dashboard
npm run dev:database
```

```powershell
cd D:\DCMA-Agent\dashboard
npm run dev:frontend
```

打开 <http://127.0.0.1:3000>。前端将 `/api/database` 转发到本机 `3001` 的后端，两个服务仅监听本机；分别按 Ctrl+C 停止。

新电脑需要 Node.js 22.18 或更新版本，在 `dashboard` 运行 `npm ci --ignore-scripts`。只有本机配置不存在时才复制示例：

```powershell
if (-not (Test-Path database/.env)) { Copy-Item database/.env.example database/.env }
```

编辑 `database/.env` 填写数据库账号密码，库名为 `dcma`，主机和端口已在示例中填写。需要校园网/VPN能够访问数据库。修改配置后重启后端；不要覆盖已有 `.env`，不要将凭据放进前端、截图或 Git。

## 页面操作与数据规则

- 点击概览卡片或选择设备更新下方详情。电机 1 默认模拟数据，可改为历史真实采集；电机 2～4使用各自模拟表，来源开关只作用于电机 1。
- 趋势默认设定/实际转速对比，可切换转矩对比或全部 18 个数值字段单项查看。采样条数为 50 / 100 / 200，默认 100。时间升序；缺失点断线，不补 0。
- 悬停查看北京时间、毫秒、记录编号和各曲线值；Tab 聚焦图表后用左右箭头查看相邻采样，Home / End 到首尾，Esc 关闭提示。采样明细支持 Enter 展开。
- 打开和切设备、来源、采样条数立即请求。每 5 秒自动检查，查询未结束时跳过，手动刷新查询期间禁用。切换取消旧请求并拒绝旧响应回写。
- 同一选择刷新失败保留上次成功结果并提示；首次或切换失败不展示其他设备的旧值。空表、无效时间、截断均有提示。
- 六个仪表依据当前有效采样范围生成刻度；恒定值扩展为非零跨度，缺失值显示“—”。范围不代表额定量程或安全阈值。
- 单位均待确认，不换算原始值；卡片读数最多显示 4 位小数，完整参数和采样明细保留原值。有效 0、负值及 `air_intake_temp=-200` 保留。状态、故障、报警、控制字、状态字和运行时间不自行解释。
- 采集时间、入库时间、接口查询时间分别显示；日期文本暂按北京时间解释，13 位时间戳按毫秒解析。无效采集时间不进入曲线，不用入库时间替代。
- 接口连接、数据来源和采集更新状态分别展示。“检测到新采样”来自相邻成功查询的记录变化；“本次无新采样”不等于连接失败。当前真实表为 2026-01-14 的历史采集。

## 只读接口

| 接口 | 用途与限制 |
|---|---|
| `GET /api/database/dashboard?table=real_data_01&limit=100` | 五个来源摘要、所选最新值、近期采样、原始记录和查询时间；limit仅支持50/100/200，响应上限512000字节，过大时明确截断较早记录 |
| `GET /api/database/catalog` | 配置与连接状态、已知表的字段结构；`?refresh=1`重新检查 |
| `GET /api/database/rows?schema=dcma&table=real_data_01&limit=20` | 旧原始预览接口保留，1～200行/64KB；不作为趋势数据接口 |

`real_data_01`～`04`对应电机1～4的模拟表，`real_data`对应电机1历史真实采集。展板固定只读 `dcma`，不接受任意SQL或写入。查询使用只读事务、参数绑定、5秒SQL超时和15秒展板请求时限；浏览器18秒超时。发现一个来源有多个设备/变频器时停止混合展示；无设备标识记录被排除。

## 验证

```powershell
npm run check
npm run test
npm run build
```

当前三个命令通过，6 项测试通过。自动测试不读取本机 `.env`，接口测试清除配置，查询异常测试替换连接；覆盖只读/参数检查、缺失表/字段、多设备、空表、全无效时间、时间数值整理、截断、0/负数、仪表跨度和曲线断点。构建输出为 `frontend/dist`，未配置发布服务。

已执行真实数据库只读检查：

```powershell
node database/test/live-check.ts
```

该命令显式读取本机 `.env`，仅执行只读事务与 SELECT，检查 SQL/JS 时间一致性、取消、并发及200条结果，不打印凭据。与离线自动测试分开运行。

浏览器验收使用 Playwright CLI，先启动前后端：

```powershell
npx --yes --package @playwright/cli playwright-cli -s=dcma open http://127.0.0.1:3000 --headed
npx --yes --package @playwright/cli playwright-cli -s=dcma run-code --filename=frontend/test/browser-real.js
npx --yes --package @playwright/cli playwright-cli -s=dcma run-code --filename=frontend/test/browser-edge.js
```

两份脚本已通过：真实接口检查1366/1920布局、18指标、采样条数、设备/来源切换、悬停、键盘与自动/手动刷新；异常脚本只拦截浏览器请求，检查失败保留/切换清空、空表、截断、缺失断线、慢请求与竞态，结束后移除拦截。截图位于 `output/playwright/`，工具缓存和截图均被 Git 忽略。

开发返回样例位于 `database/test/dashboard-example.ts`，标明“开发样例”，只供测试使用。共享类型和31字段中文名在 `database/dashboard-types.ts`；页面逻辑在 `frontend/src/App.tsx`，请求与刷新在 `useDashboard.ts`，图表在 `components/LineChart.tsx`，仪表在 `components/Gauge.tsx`。

## 来源与未确认资料

基础预览、样式、DCMA标志和接口最初复制/提取自公用仓库 `JACK-Chen415/DCMA-pi-Agent` 的 `dashboard-frontend` 分支，提交 `424bf0ddd005f620cce29e3acc009f4ee8284f9e`。本轮只修改个人独立项目；公用嵌套 `pi/` 未修改。折线图已调整为展板多曲线交互；原 `DatabasePanel` 保留，`frontend/reference/RightPanel.tsx`仅作参考，不参与编译。

原相关提交作者为 Jahon，MIT许可证保留于 `LICENSE`。未复制模型配置、聊天、凭据或Git元数据。

单位、代码映射、额定值、运行时间格式及特殊值含义等待数据负责人资料；当前均有明确展示规则，不阻塞已确认功能。未实施部署、推送、数据库写入或未要求的聊天、健康评分、故障统计等功能。当前范围和提交记录见根目录 `HANDOFF.md` 第0节，开发说明第2节仍可用作字段参考。
