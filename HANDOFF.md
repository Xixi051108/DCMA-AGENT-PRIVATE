# DCMA 工作交接：监控展板与 Pi SDK 学习

最后更新：2026-10-10（Asia/Shanghai）。个人仓库的独立监控展板前置准备已完成、验证并推送到个人 `main`，代码提交为 `dc97768a2`；此前 Pi SDK 学习进度保留在第 1～11 节。

## 0. 当前任务：个人仓库中的独立监控展板

### 0.1 目标与范围

用户和合作同学改为各自开发一个完整版本，之后择优；原来的两人前后端分工已取消。用户独立完成展板前端与数据库接口，参考西门子“智驱宝”实时数据页面，将数据库数据读出来展示。截止时间为 **2026-10-11（周日）晚上**。

- 本轮已授权：在个人仓库创建页面开发与数据库目录，复制公用仓库中相关基础文件，并提交、推送到个人远程仓库。
- 已创建 `D:\DCMA-Agent\dashboard\frontend` 和 `D:\DCMA-Agent\dashboard\database`；独立依赖、配置示例、启动说明和验证已完成。
- 用户最新要求：个人仓库直接使用 `main`，无需另建开发分支。本对话的代码和文件都保存在 `DCMA-AGENT-PRIVATE`；公用仓库只读取，不修改或推送。
- 只设计实际数据支持的功能，不添加缺数据的页面或占位菜单。首版无需聊天、健康评分、故障统计、MQTT 配置或用户管理，也不要求 Pi SDK / Agent 接入。
- 当前请求只做前置准备和个人仓库推送。用户已询问是否开始前端开发，已明确说明只建立开发环境与数据库预览入口，完整展板尚未开发。
- 数据链路建议为“前端 → 后端接口 → 数据库”，连接凭据只在后端本地配置，不放入前端或 Git。

首版页面范围：

| 区域 | 内容 |
|---|---|
| 左侧栏 | DCMA 标志、平台名称、实时数据入口、数据源与设备选择、连接状态 |
| 顶部 | 设备与变频器名称、来源、采集时间、更新状态、手动刷新 |
| 趋势曲线 | 默认设定/实际转速对比；切换电流、转矩、电压、功率和温度 |
| 六个仪表 | 实际转速、电流、实际转矩、直流母线电压、变频器温度、电机温度 |
| 信息卡片 | 两项负荷率、运行时间、原始状态代码、当前故障码与报警码 |

不同单位的曲线切换查看，首版显示近期采样，不扩展任意日期查询。转矩利用率缺少计算依据，不转换成百分比；故障采样不等于独立事件，不统计次数或持续时间。

### 0.2 已确认信息与证据

- 数据库类型：MySQL；主机：`10.108.12.164`；端口：`3306`（用户最新 Navicat 连接属性截图显示）。不记录账号密码，不要求用户在聊天中提供密码。
- 该地址是内网地址；需要处于允许访问该服务器的网络中。不能把“连校园网”与“必然可访问”画等号。校外 VPN 是否可用未确认。
- 用户已打开 Navicat Premium，创建连接，名称为 `DCMA-AGENT数据库`。
- 用户明确反馈“显示连接成功”，随后截图显示已展开数据库列表和表列表。证据来自用户操作与截图，助手没有直接连接数据库或运行 SQL。
- 用户确认：`real_data_01`～`real_data_04` 是模拟表，字段结构一致；`real_data` 是短暂真实采集表，主要字段一致。目前数据范围仅这五张表。
- 字段截图和样例已提供并整理，不再以“缺少截图”作为阻塞。所在库名、模拟表区别、设备数量、持续写入情况、单位和状态码映射仍待确认；不要猜库名，也不要把四张表直接当作四台设备。
- 模拟 `timestamp` 样例为 `2026-10-08 11:26:04`，真实样例为 `1768371612980`。此前实际换算后者为北京时间 `2026-01-14 14:20:12.980`，属于 13 位毫秒时间戳；需核对采集含义和时区后统一输出。
- 两表 `create_time` 都是日期时间格式，注释为“数据入库时间”，不能当作采集时间。
- `status=0` 与约 1000 转速同时出现，不能直接解释为停机；故障/报警码也先显示原值。
- `air_intake_temp=-200` 含义不明，首版不作为环境温度；`system_run_time` 样例为 `0000:00:00` 和 `0`，格式、单位与累计范围待确认。
- 最初西门子截图中的 `192.168.1.101:8011` 是网页地址，`192.168.1.100:1883` 是 MQTT 通信配置，不是本次已确认的 MySQL 地址或端口。

已整理的全部 31 个字段：

`id`、`timestamp`、`device_name`、`inverter_name`、`date`、`time`、`status`、`fault_code`、`alarm_code`、`control_word`、`status_word`、`dc_voltage`、`speed_setpoint`、`speed_actual`、`current_actual`、`torque_setpoint`、`torque_actual`、`air_intake_temp`、`motor_temp`、`inverter_temp`、`actual_power`、`field_current`、`torque_current`、`system_run_time`、`inverter_radiator_temp`、`inverter_load_rate`、`motor_load_rate`、`pulse_frequency`、`motor_power`、`feedback_power`、`create_time`。

类型、中文解释和待确认单位见 `D:\DCMA-Agent\监控展板两人分工.md`。该文档已创建，字段与基础文件说明仍有用，但 A/B 分工、公用仓库开发和分支协作安排已过时。本次不修改或删除该文档。

### 0.3 已完成准备、未完成与下一步

前置代码已落地，入口为 `dashboard/frontend/src/App.tsx`，当前页面只提供数据库连接、字段和原始记录预览。SVG 折线图组件已复制但尚未接入；六个仪表、趋势布局、设备选择和实时刷新尚未开发。

数据库模块已提取连接、目录发现和有限只读查询，移除 Pi SDK、TypeBox 和 Agent 工具注册。HTTP 服务仅提供 `/api/database/catalog` 和 `/api/database/rows`，只允许 GET，并校验本机来源和读取参数。发现范围收紧为五张已确认表，保留只读事务、查询超时与结果数量限制。

启动方法见 `dashboard/README.md`：在 `dashboard` 执行 `npm ci --ignore-scripts`，然后在两个终端分别运行 `npm run dev:database` 与 `npm run dev:frontend`。前端地址 `http://127.0.0.1:3000`，开发代理转发到本机 `3001` 的数据库接口。后端本地配置为 `dashboard/database/.env`；仅提交账号密码为空的 `.env.example`，未创建实际凭据文件。

必要的数据库配置及字段语义仍待确认，见第 0.2 节。尚未直接连接 MySQL，现有排序仅适用于原始记录预览，不声称已经完成采集时间整理。

下一步：

1. 检查当前个人 `main` 与 Git 状态，保留已推送的准备文件；不修改公用仓库。
2. 用户继续要求完整展板时，按第 0.1 节实现页面和必要接口；不重复创建前置目录。
3. 确认实际库名、设备关系、单位、时间和状态码含义，在本机填写后端凭据后只读联调；不请求聊天中提供明文密码。
4. 核对采集时间变化与写入周期，历史采集不能标为实时；所有代码与资料继续留在个人仓库。

数据源与设备选择接口、最新值和近期曲线接口可按最小需要整理。轮询 3～5 秒是待验证方案，最终结合写入频率确定；查询数量设上限，请求不重叠。没有数据用 `null`，有效 0 保留；采集、入库、刷新时间分开处理，最新值和曲线必须来自同一来源与设备。

### 0.4 本次文件与验证状态

- 新增 `dashboard/` 独立 npm 工作区（frontend、database），安装依赖时禁用生命周期脚本，生成个人项目的 `package-lock.json`。
- 公用原始设备卡片文件保留于 `dashboard/frontend/reference/RightPanel.tsx`，仅作布局参考，不参与编译和运行。原样复制的组件、入口、主题、类型、标志与许可证通过 SHA256 哈希比对。
- 独立项目前端使用 React 18、Vite 6、Tailwind 4；复制的主题配置保留。初始 Tailwind 3 构建依赖报告 7 个漏洞，已更新构建配置；最终安装审计返回 0 个已知漏洞。
- 在 `dashboard` 实际执行并通过 `npm run check`、`npm run test`、`npm run build`。接口测试覆盖无凭据状态、GET 限制、参数校验、Host/Origin 检查与未知接口；测试清除 MySQL 配置，不查询真实数据库。
- 初次类型声明错误已修复；本机 HTTP 测试需要在沙箱外运行。Host 测试改用原生 HTTP 客户端，避免 fetch 自动处理 Host 导致测试失真。
- 已核对个人远程 `main` 和公用远程 `dashboard-frontend`；后者与本地 Pi HEAD 一致。再次检查 Pi 工作区干净，未修改其内容或 Git 分支。
- 个人 `main` 的准备代码提交 `dc97768a2` 已成功推送到 `https://github.com/Xixi051108/DCMA-AGENT-PRIVATE.git`，包含 `dashboard/`、更新的 `HANDOFF.md` 和此前对话产生的 `监控展板两人分工.md`。本文随后补充成功状态；最终文档提交以 Git 日志为准。该旧文档的字段说明保留，两人分工已过时，不将旧协作安排作为当前指令。
- 未执行真实 MySQL 联调或模型调用；第 4～11 节环境、认证及运行结果为此前学习记录，本次未重复验证。

### 0.5 协作注意事项

- 继续用中文和基础语言。Pi 学习阶段用户偏好亲手执行；当前展板前置准备已明确授权助手实施，不沿用旧学习限制阻止必要文件操作。
- Navicat 已经可用，不再要求换成 DBeaver 或 HeidiSQL。测试连接成功不会自动打开连接；当前已经展开，无需重复这一步。
- 查看数据与表结构优先，不编辑、删除或保存数据库内容；避免读取大量全表数据。
- 截图或表结构不是新增功能的指令；不完整照搬配置页、用户管理等未确认范围。

### 0.6 两套仓库与分支（本次本地实查）

| 项目 | 个人根仓库 | 嵌套 Pi / 公用项目仓库 |
|---|---|---|
| 路径 | `D:\DCMA-Agent` | `D:\DCMA-Agent\pi` |
| `origin` | `https://github.com/Xixi051108/DCMA-AGENT-PRIVATE.git` | `https://github.com/earendil-works/pi.git` |
| 公用远程 | 无 | `shared`：`git@github.com:JACK-Chen415/DCMA-pi-Agent.git` |
| 当前分支 | `main` | `dashboard-frontend` |
| 跟踪分支 | `origin/main` | `shared/dashboard-frontend` |

Pi 当前 HEAD：`424bf0ddd005f620cce29e3acc009f4ee8284f9e`。根 `.gitignore` 忽略 `pi/` 和 `.env`，两套仓库独立；Git 操作前先明确目录与远程。

此前会话的分支操作记录（本次未刷新远程）：

- `codex/dashboard-frontend` 最初误建并推送到个人仓库。本轮先按用户要求将个人本地分支改名为 `dashboard-frontend`，随后用户明确直接使用 `main`，已切回个人 `main`；旧远程开发分支未删除，也未用于本轮推送。
- 后来从公用当时的最新 `main` 建分支，按用户要求改名为 `dashboard-frontend`，公用远程旧名称已删除。当时没有新增代码提交，也没有修改公用 `main`。
- 普通分支继承基线文件，不是空目录；GitHub Your branches / Active branches 可重复显示同一分支。
- 不把个人 `origin` 当成公用仓库，也不从嵌套仓库的官方 `origin` 推送个人展板。不能据本地状态声称当前远程最新。

### 0.7 可复用基础与代码来源

`D:\DCMA-Agent\pi\packages\web` 是后续新增的 DCMA Agent 工作台，技术栈为 React、TypeScript、Vite、Node、MySQL，并非纯 Pi 官方原始内容。本次 Git 实查确认作者、提交者均为 `Jahon`：

- `684ec5b00`，2026-10-09 00:43:15 +08:00：新增 Web 工作台与 DeepSeek 集成。
- `424bf0ddd`，2026-10-09 01:17:09 +08:00：增加工业数据库能力与界面调整。

| 文件（相对于 `D:\DCMA-Agent\pi`） | 独立展板复用方式 |
|---|---|
| `packages/web/database.ts` | 连接、目录发现、限量只读查询；移除 Pi `defineTool` / TypeBox 工具注册依赖 |
| `packages/web/server.ts` | 提取数据库接口和独立服务入口，不复制模型聊天 |
| `packages/web/src/database-types.ts` | 参考数据库返回结构，按展板需求适配 |
| `packages/web/src/components/LineChart.tsx` | SVG 折线基础；适配现有类型和 Tailwind 样式依赖 |
| `packages/web/src/components/RightPanel.tsx` | 参考卡片布局；示例/导入数据不能冒充数据库读数 |
| `packages/web/src/components/DatabasePanel.tsx` | 参考连接检查、字段与原始记录预览 |
| `packages/web/package.json`、`README.md` | 参考依赖与启动方法，整理独立运行所需部分 |

已有接口：`GET /api/database/catalog`、`GET /api/database/rows?schema=...&table=...&limit=20`；尚需设备筛选、时间整理和展板映射。

原启动链路依赖 Pi 内部 `source-resolver.ts`，不能整体复制后声称独立可运行。本轮已选择性提取必要代码，原仓库文件保留不动；独立项目不依赖 Pi 内部路径。复制来源和调整清单见 `dashboard/README.md`。

## 1. 任务目标

本节及以下 Pi 相关内容是此前学习任务的保留记录，运行成功结果来自旧交接，本次未重新执行。用户恢复该学习任务时再按第 9 节继续；旧范围限制不适用于当前已明确提出的展板任务。

用户正在用“边做边学”的方式学习 Pi Agent Harness、Pi SDK、TypeScript 和 Node.js，最终要基于 Pi SDK 开发一个 DCMA 工业 Agent。

此前 Pi 学习阶段只做以下内容：

1. 跑通 Pi SDK 官方最小 Demo。
2. 沿 Demo 理解 Agent 创建、模型配置、Prompt/Context、Tool 注册、Tool Call、Tool 执行、Tool Result 写回、下一轮模型调用和最终回答。
3. 理解 Agent Loop、Session、事件监听和错误处理。
4. 修改一个简单 Tool，确认理解链路。
5. 最后实现使用模拟数据的 `get_device_status` Tool。

此前 Pi 学习阶段暂不做 Web 前端、MCP、多 Agent、复杂审批、真实 DCMA 内网数据或完整工业系统；当前展板和数据库查看是用户后续明确提出的独立任务。

## 2. 用户偏好与协作方式

- 用户是 Pi、Agent Harness、TypeScript/Node.js 初学者，解释必须用中文和基础语言。
- Pi 学习阶段用户希望亲手执行并理解命令；当前展板前置准备已明确授权助手实施，见第 0.1 节。
- Pi 学习阶段允许一次给后面几步，不必严格一条命令等一次回复，但每条命令仍要说明作用、原因和预期结果。
- 不要向用户出理解检查题；遇到值得知道的问题直接给答案。
- 遇到代码时，先说明它在 Agent Loop 中的位置，再解释语法。
- 不要假设仓库 API；以当前 README 和实际源码为准。
- 不要覆盖或删除现有 PPT、Markdown。
- 不要读取、打印或提交 OAuth Token/API Key。
- 不要把敏感信息写进代码。
- 只修改当前步骤所需文件，验证后检查 diff。

## 3. 工作区与仓库

- 项目根目录：`D:\DCMA-Agent`
- Pi 克隆仓库（当前含公用项目新增内容）：`D:\DCMA-Agent\pi`
- 官方仓库 URL：`https://github.com/earendil-works/pi`
- SDK 示例文档：`D:\DCMA-Agent\pi\packages\coding-agent\examples\sdk\README.md`
- 官方最小 Demo：`D:\DCMA-Agent\pi\packages\coding-agent\examples\sdk\01-minimal.ts`
- 学习版 Demo：`D:\DCMA-Agent\pi\packages\coding-agent\examples\sdk\01-minimal-proxy.ts`
- 可用 CLI：`D:\DCMA-Agent\pi\packages\coding-agent\dist\cli.js`

根目录资料：

- `下一步工作计划.md`
- `Pi-SDK示例文件说明.md`（本次确认存在）
- `Pi-Agent-Harness背景知识.md`
- `实施.pptx`

根仓库已经初始化，已知初始提交为 `532715f chore: initialize DCMA Agent workspace`。根目录 `.gitignore` 忽略 `pi/` 和 `.env`，因此 Pi 是独立的嵌套 Git 仓库。

2026-10-10 本次更新前实查：根仓库有未提交的 `HANDOFF.md` 改动，以及未跟踪的 `监控展板两人分工.md`；Pi 工作区干净。远程、分支与跟踪关系见第 0.6 节。

本轮用户已授权将页面准备和本对话相关文件提交、推送到个人 `main`；其他资料仍不得擅自删除或覆盖。

## 4. 本机环境

- Git：`2.51.1`
- Node.js：`22.23.2`
- npm：`10.9.8`
- 已在 Pi 仓库执行 `npm ci`
- 依赖目录：`D:\DCMA-Agent\pi\node_modules`
- 已完成核心 TypeScript 编译，可运行 `dist\cli.js`
- 单文件 bundle 曾因沙箱阻止 esbuild 子进程失败，但不影响当前学习

Node.js 22 可直接执行 `01-minimal.ts`。该 Demo 文件本身是 TypeScript 源码，但其中的 `@earendil-works/pi-coding-agent` 会加载本地 Pi 仓库已经编译的 `dist` SDK。

## 5. 认证与模型状态

- 使用 ChatGPT Plus OAuth 登录，不使用 OpenAI API Key。
- 凭据位置：`C:\Users\43521\.pi\agent\auth.json`
- **绝对不要读取或展示该文件内容。**
- 正确的安全检查命令：

```powershell
node D:\DCMA-Agent\pi\packages\coding-agent\dist\cli.js auth check --provider openai
```

- 已验证该命令返回 `ready`。
- 当前保存的默认模型：`openai/gpt-6-luna`
- 当前保存的默认思考级别：`low`
- `Ctrl+S` 必须在 `/model` 或 `/thinking` 选择列表仍打开时直接按；先按 Enter 只会临时切换当前会话，不会保存默认值。
- ChatGPT Plus OAuth 与 API Key 计费是不同方式。输出中的 `cost` 是 Pi 按模型价格表计算的等价估算，不代表一定从 API 余额额外扣款。

## 6. 网络代理

系统本地代理：

```text
http://127.0.0.1:11304
```

每次新开 PowerShell 后，临时环境变量都会丢失。运行模型前重新设置：

```powershell
$env:NODE_USE_ENV_PROXY = '1'
$env:HTTPS_PROXY = 'http://127.0.0.1:11304'
$env:HTTP_PROXY = 'http://127.0.0.1:11304'
$env:NO_PROXY = '127.0.0.1,localhost'
```

必须同时设置 `HTTP_PROXY` 和 `HTTPS_PROXY`。曾出现 `HTTP_PROXY` 为空，随后 OAuth 刷新报 `fetch failed`。

已验证：

- `https://auth.openai.com` 返回 HTTP 403，说明网络连接成功，403 只是未按正式认证流程访问根地址。
- `https://api.openai.com/v1/models` 无凭据返回 HTTP 401，说明模型 API 域名可达。
- `UNDICI-EHPA EnvHttpProxyAgent is experimental` 是 Node 的实验性代理警告，不是失败。

## 7. 已完成与验证结果

### 7.1 CLI 已成功运行模型

以下命令成功返回 `OK`：

```powershell
node D:\DCMA-Agent\pi\packages\coding-agent\dist\cli.js --print --model openai/gpt-6-luna --thinking low "Reply only with OK."
```

以下命令也成功完成模型调用、Tool Call、Tool 执行、Tool Result 写回和最终回答：

```powershell
node D:\DCMA-Agent\pi\packages\coding-agent\dist\cli.js --print --model openai/gpt-6-luna --thinking low "What files are in the current directory?"
```

但模型选择了 `bash` Tool，Windows 上报：

```text
/bin/bash isn't available in this environment
```

这不是模型或 Agent Loop 失败，而是 Pi 的默认 `bash` Tool 在当前 Windows 环境找不到 Unix `/bin/bash`。CLI 将该错误作为 Tool Result 写回，模型随后正常生成最终回答。

### 7.2 找到 SDK Demo 超时的根因

原始 SDK Demo 多次得到：

```text
content: []
usage: 全部为 0
stopReason: 'error'
errorMessage: 'Request timed out.'
```

已排除模型、OAuth、Prompt、`thinking off` 和 API 域名连通性问题。

源码对比发现：

- CLI 在 `packages/coding-agent/src/main.ts` 中调用 `applyHttpProxySettings(...)` 和 `configureHttpDispatcher(...)`。
- `createAgentSession()` 自身不会安装 Pi 的 Undici HTTP 代理调度器。
- 官方 `01-minimal.ts` 也没有调用该初始化函数。

因此在当前必须走本地代理的网络中，CLI 能成功，而原始 SDK Demo 会超时。

### 7.3 学习版 SDK Demo 已跑通

已创建：

```text
D:\DCMA-Agent\pi\packages\coding-agent\examples\sdk\01-minimal-proxy.ts
```

当前内容在官方 Demo 基础上增加：

```typescript
import { configureHttpDispatcher } from "../../src/core/http-dispatcher.ts";

configureHttpDispatcher();
```

调用顺序是：

```text
configureHttpDispatcher()
→ createAgentSession()
→ session.subscribe(...)
→ session.prompt(...)
```

该学习版已经成功执行，最终输出包括：

```text
input: 1710
output: 29
totalTokens: 1739
stopReason: 'stop'
rawStopReason: 'completed'
thinkingLevel: 'low'
```

这证明 SDK 请求已经正常完成，代理初始化修复了超时。

注意：`configureHttpDispatcher` 是 Pi 仓库内部源码路径，没有从 SDK 顶层公开导出。这个写法只用于在克隆仓库中学习和验证，正式 DCMA 项目不能长期依赖 `../../src/core/...`。

### 7.4 已创建会话交接 Skill

已安装个人 Skill：

```text
C:\Users\43521\.codex\skills\session-handoff
```

以后准备暂停或结束会话时，可以显式输入：

```text
$session-handoff
```

也可以自然表达“结束会话并更新 HANDOFF.md”。该 Skill 会先核对实际文件、Git 状态和验证结果，再创建或更新工作区根目录的 `HANDOFF.md`，并避免记录凭据或把未执行事项写成已完成。已通过 `quick_validate.py` 校验，结果为 `Skill is valid!`。

## 8. Pi 学习任务的未完成事项

没有外部阻塞。当前只差完成阶段一的记录和成功 Tool 示例：

1. 尚未生成完整运行日志 `D:\DCMA-Agent\sdk-demo-run.txt`。
2. 学习版 Demo 仍使用官方问题 `What files are in the current directory?`，模型可能选择 Windows 不可用的 `/bin/bash`。
3. 还没有获得并整理一次成功的 `read` Tool Call → Tool Result → 下一轮模型调用 → 最终回答日志。
4. 还没有开始自定义 Tool 或 DCMA 项目骨架；不要把它们写成已完成。

## 9. 恢复 Pi 学习时的下一步计划

### 恢复学习后执行：完成 SDK Demo 的成功 Tool 链路

1. 把学习版 Demo 中：

```typescript
await session.prompt("What files are in the current directory?");
```

改为：

```typescript
await session.prompt("Use the read tool to read Pi-SDK示例文件说明.md and tell me its title.");
```

运行命令时工作目录必须是 `D:\DCMA-Agent`，这样相对文件名才能正确解析。

2. 在已设置代理变量的 PowerShell 中运行并保存完整日志：

```powershell
cd D:\DCMA-Agent
node D:\DCMA-Agent\pi\packages\coding-agent\examples\sdk\01-minimal-proxy.ts 2>&1 | Tee-Object -FilePath D:\DCMA-Agent\sdk-demo-run.txt
```

3. 从日志中按顺序标记：

```text
system
user
assistant/toolCall
toolResult
assistant/final answer
```

同时解释：Agent 创建、Model 配置、Prompt/Context、Tool 注册、Tool Call、Tool 执行、Tool Result 写回、下一轮模型调用、最终回答。

4. 沿源码跟踪入口，优先查看：

- `packages/coding-agent/examples/sdk/01-minimal-proxy.ts`
- `packages/coding-agent/src/core/sdk.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `packages/agent/src/agent-loop.ts`（先用 `rg` 确认实际文件名和调用链，不要假设）
- `packages/ai/src/api/openai-responses.ts`

### 阶段一完成后

1. 在 `D:\DCMA-Agent` 下创建正式的最小 DCMA 项目，不要把正式业务代码写进 `pi` 官方仓库。
2. 写一个最简单的自定义 Tool，验证 Tool 定义、参数校验、执行和 Tool Result。
3. 实现模拟数据版只读 `get_device_status`：输入设备 ID，输出设备状态、状态码、最后更新时间和报警摘要。
4. 再扩展传感器数据、故障事件和故障手册；暂不接真实学校内网。

## 10. 绝对不要再踩的坑

1. **不要把当前模型显示为 `gpt-6-luna` 当成已经保存。** Enter 只是当前会话切换，必须在选择列表中直接按 `Ctrl+S`，并看到 `Default model:` 提示。
2. **不要在新 PowerShell 中默认代理仍存在。** 环境变量只对创建它们的当前窗口有效。
3. **不要只设置 `HTTPS_PROXY`。** 同时设置 `HTTP_PROXY`，否则认证或重定向链可能失败。
4. **不要把 `auth check` 写成无参数。** 正确命令必须带 `--provider openai`；不要使用 `--credentials`，避免泄露凭据。
5. **不要读取或打印 `auth.json`。** 只使用安全检查命令。
6. **不要把 `Request timed out` 直接归因于 API 额度或模型权限。** 本次根因是 SDK 入口没有初始化 Pi 的代理调度器。
7. **不要继续把 `thinking off` 当根因。** `low` 下原始 Demo 仍超时；加 `configureHttpDispatcher()` 后成功。
8. **不要看到 HTTP 401/403 就说网络失败。** 对无凭据测试而言，这些状态码证明服务器可达；要区分 HTTP 响应与 `fetch failed`/timeout。
9. **不要把 `/bin/bash isn't available` 当成 Agent Loop 失败。** 这是 Windows Tool 执行环境问题；改用跨平台 `read` Tool 完成当前学习验证。
10. **不要直接修改官方 `01-minimal.ts`。** 所有实验放在 `01-minimal-proxy.ts`；正式 DCMA 代码放到根项目自己的目录。
11. **不要让正式项目依赖 Pi 内部 `src/core/http-dispatcher.ts` 路径。** 该导入仅用于当前仓库内的学习副本。
12. **不要声称完整日志已经保存。** 交接时 `sdk-demo-run.txt` 不存在，下一会话需要实际运行并验证。
13. **Pi 学习阶段按用户节奏指导亲手执行。** 当前展板前置准备另有直接实施授权，见第 0.1 节。
14. **不要删除或覆盖 PPT、Markdown，也不要顺手重构 Pi 仓库。**

## 11. Pi 学习任务完成标准判断

- 模型和 OAuth：完成。
- Pi CLI：完成并验证多轮 Tool 错误处理。
- SDK 网络问题：已定位并在学习副本中修复。
- SDK Demo 模型调用：成功。
- SDK 成功 Tool Call 完整日志：未完成。
- Agent Loop 源码跟踪：未完成。
- 自定义 Tool：未完成。
- 模拟 `get_device_status`：未完成。
- 正式 DCMA 项目骨架：未创建。

下一会话按第 0.3 节的实际进度继续，前置目录与基础组件已准备，不要重复创建。用户要求继续完整展板时再开发页面与数据库联调。若用户明确恢复 Pi 学习，则从“把学习版 Prompt 改为明确调用 `read`，运行并保存 `sdk-demo-run.txt`”开始，不要重新克隆、重新安装依赖或重复此前已完成的 OAuth/模型配置。
