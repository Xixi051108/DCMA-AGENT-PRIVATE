# Pi SDK 示例文件说明

## 目录位置

Pi SDK 官方示例位于：

```text
D:\DCMA-Agent\pi\packages\coding-agent\examples\sdk
```

该目录包含 14 个 TypeScript 示例文件和 1 个 README。示例按照功能逐步展开，不需要一开始全部掌握。

## 文件用途

| 文件 | 用途 |
|---|---|
| `README.md` | SDK 示例目录的说明、运行命令、配置参数和事件类型速查。 |
| `01-minimal.ts` | 最小 Demo：创建 Session、监听文本事件、发送 Prompt、释放资源。 |
| `02-custom-model.ts` | 指定模型供应商、模型 ID 和思考等级。 |
| `03-custom-prompt.ts` | 替换系统 Prompt，或在默认 Prompt 后追加规则。 |
| `04-skills.ts` | 加载、筛选、添加或替换 Skills。 |
| `05-tools.ts` | 选择允许 Agent 使用的内置 Tool，例如 `read`、`grep`、`bash`。 |
| `06-extensions.ts` | 使用扩展监听 Agent 事件、拦截 Tool Call、注册自定义 Tool 和命令。 |
| `07-context-files.ts` | 加载或添加 `AGENTS.md`，给 Agent 注入项目级规则。 |
| `08-prompt-templates.ts` | 定义可通过 `/名称` 调用的 Prompt 模板。 |
| `09-api-keys-and-oauth.ts` | 配置和解析模型 API Key、OAuth 认证。 |
| `10-settings.ts` | 调整压缩、失败重试、终端等运行设置。 |
| `11-sessions.ts` | 管理 Session：内存会话、持久化、继续历史会话、列出和打开会话。 |
| `12-full-control.ts` | 不使用自动发现，显式配置模型、Prompt、Tool、Session 和 Settings。 |
| `13-session-runtime.ts` | 管理可替换的活动 Session，用于新建、恢复、切换、fork 或导入会话。 |
| `14-codemode-mcp.ts` | 加载 Code Mode、`tool_search` 和 MCP 扩展；当前阶段暂时忽略。 |

## 当前推荐学习顺序

```text
01 最小流程
→ 02 模型配置
→ 03 Prompt 配置
→ 05 Tool 选择
→ 06 自定义 Tool 和事件
→ 11 Session 管理
```

其中：

- `04-skills.ts` 和 `07-context-files.ts` 与 Prompt、Context 组装有关，可以在理解最小流程后学习。
- `09-api-keys-and-oauth.ts` 在配置模型认证时使用。
- `10-settings.ts` 在学习重试和错误处理时使用。
- `12-full-control.ts` 适合在掌握各组件后，用来查看完整显式配置。
- `13-session-runtime.ts` 和 `14-codemode-mcp.ts` 属于进阶内容，当前阶段不需要学习。
