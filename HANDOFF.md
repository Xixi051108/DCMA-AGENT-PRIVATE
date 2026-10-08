# DCMA Industrial Agent 学习任务交接

## 1. 任务目标

用户正在用“边做边学”的方式学习 Pi Agent Harness、Pi SDK、TypeScript 和 Node.js，最终要基于 Pi SDK 开发一个 DCMA 工业 Agent。

当前阶段只做以下内容：

1. 跑通 Pi SDK 官方最小 Demo。
2. 沿 Demo 理解 Agent 创建、模型配置、Prompt/Context、Tool 注册、Tool Call、Tool 执行、Tool Result 写回、下一轮模型调用和最终回答。
3. 理解 Agent Loop、Session、事件监听和错误处理。
4. 修改一个简单 Tool，确认理解链路。
5. 最后实现使用模拟数据的 `get_device_status` Tool。

暂不做 Web 前端、MCP、多 Agent、复杂审批、真实 DCMA 内网数据或完整工业系统。

## 2. 用户偏好与协作方式

- 用户是 Pi、Agent Harness、TypeScript/Node.js 初学者，解释必须用中文和基础语言。
- 用户希望自己执行命令，不能再由助手一次性把所有操作完成。
- 用户最新要求：可以一次给后面几步，不必严格一条命令等一次回复，但每条命令仍要说明作用、原因和预期结果。
- 不要向用户出理解检查题；遇到值得知道的问题直接给答案。
- 遇到代码时，先说明它在 Agent Loop 中的位置，再解释语法。
- 不要假设仓库 API；以当前 README 和实际源码为准。
- 不要覆盖或删除现有 PPT、Markdown。
- 不要读取、打印或提交 OAuth Token/API Key。
- 不要把敏感信息写进代码。
- 只修改当前步骤所需文件，验证后检查 diff。

## 3. 工作区与仓库

- 项目根目录：`D:\DCMA-Agent`
- Pi 官方仓库：`D:\DCMA-Agent\pi`
- 官方仓库 URL：`https://github.com/earendil-works/pi`
- SDK 示例文档：`D:\DCMA-Agent\pi\packages\coding-agent\examples\sdk\README.md`
- 官方最小 Demo：`D:\DCMA-Agent\pi\packages\coding-agent\examples\sdk\01-minimal.ts`
- 学习版 Demo：`D:\DCMA-Agent\pi\packages\coding-agent\examples\sdk\01-minimal-proxy.ts`
- 可用 CLI：`D:\DCMA-Agent\pi\packages\coding-agent\dist\cli.js`

根目录资料：

- `下一步工作计划.md`
- `Pi-SDK示例文件说明.md`（当前根仓库未跟踪）
- `Pi-Agent-Harness背景知识.md`
- `实施.pptx`

根仓库已经初始化，已知初始提交为 `532715f chore: initialize DCMA Agent workspace`。根目录 `.gitignore` 忽略 `pi/` 和 `.env`，因此 Pi 是独立的嵌套 Git 仓库。

当前 Git 状态（交接时）：

```text
根仓库：?? Pi-SDK示例文件说明.md
Pi 仓库：?? packages/coding-agent/examples/sdk/01-minimal-proxy.ts
```

不要擅自提交、删除或覆盖这些文件。

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

## 8. 当前卡点

没有外部阻塞。当前只差完成阶段一的记录和成功 Tool 示例：

1. 尚未生成完整运行日志 `D:\DCMA-Agent\sdk-demo-run.txt`。
2. 学习版 Demo 仍使用官方问题 `What files are in the current directory?`，模型可能选择 Windows 不可用的 `/bin/bash`。
3. 还没有获得并整理一次成功的 `read` Tool Call → Tool Result → 下一轮模型调用 → 最终回答日志。
4. 还没有开始自定义 Tool 或 DCMA 项目骨架；不要把它们写成已完成。

## 9. 下一步计划

### 立即执行：完成 SDK Demo 的成功 Tool 链路

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
13. **不要一次性替用户完成后续所有代码。** 用户要亲手执行和理解，但现在允许一次给出数个连续步骤。
14. **不要删除或覆盖 PPT、Markdown，也不要顺手重构 Pi 仓库。**

## 11. 当前完成标准判断

- 模型和 OAuth：完成。
- Pi CLI：完成并验证多轮 Tool 错误处理。
- SDK 网络问题：已定位并在学习副本中修复。
- SDK Demo 模型调用：成功。
- SDK 成功 Tool Call 完整日志：未完成。
- Agent Loop 源码跟踪：未完成。
- 自定义 Tool：未完成。
- 模拟 `get_device_status`：未完成。
- 正式 DCMA 项目骨架：未创建。

下一会话应从“把学习版 Prompt 改为明确调用 `read`，运行并保存 `sdk-demo-run.txt`”开始，不要重新克隆、重新安装依赖或重复已经完成的 OAuth/模型配置。
