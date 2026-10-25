# DCMA Agent 测试材料

先读 [完整报告](REPORT.md)，再查看 [测试用例](TEST-CASES.md)、[逐项结果](TEST-RESULTS.md) 和 [全部真实回答](TRANSCRIPTS.md)。

只使用 `deepseek/deepseek-flash`。32次有效评估，3次因夹具问题作废并重跑；作废记录保留。测试没有修改产品代码，也没有提交/推送。

## 复现前提

- 此材料针对本机 `D:\DCMA-Agent\pi` 的提交 `668598cec`，Node.js 22.23.2。
- 已有3000端口服务、原有本机数据库配置、当前DeepSeek Flash授权。
- 模型测试会发送设备采样到已有DeepSeek配置并产生费用；不可把普通离线检查误认为无需外部调用的完整模型测试。
- 如果产品源码或路径变更，需先检查加载钩子与返回结构；loader在关键注入点不匹配时会拒绝运行。

## 检查已有结果，不产生模型费用

```powershell
node D:\DCMA-Agent\agent-evaluation\2026-10-15\assess-results.mjs
node --test D:\DCMA-Agent\agent-evaluation\2026-10-15\eval-support.test.mjs
```

`assess-results.mjs`根据已保存的人工语义复核笔记生成结果表，不是自动模型裁判。`analyze-results.mjs`从原始轨迹独立重算指标；截图归档后亦可使用已归档截图。

## 再次执行模型评估

应先复制本材料到新的评估目录，保留本轮原始证据；新一轮使用自己的空 `results` 目录，不能覆盖旧结果。`run-evaluation.mjs run`会复用已有同名结果，作为中断恢复机制，不会自动重新调用模型。

准备阶段从3000端口读取五来源快照，生成夹具、参考值和执行前登记文件：

```powershell
node .\run-evaluation.mjs prepare
```

在 `D:\DCMA-Agent\pi\packages\web` 启动独立观察实例，设置本轮loader的真实file URL。加载既有本机数据库配置，服务器仍自行加载原有模型配置；不需要复制或输出密钥：

```powershell
$env:DCMA_PORT = '3340'
node --env-file=D:/DCMA-Agent/dashboard/database/.env --import file:///D:/DCMA-Agent/pi/packages/coding-agent/src/experimental/source-resolver.ts --import file:///D:/DCMA-Agent/agent-evaluation/2026-10-15/eval-loader.mjs server.ts
```

上例引用本轮目录；新一轮必须替换loader路径，工具夹具由loader旁的文件读取。保持3000与3340两实例可用后，运行新目录的：

```powershell
node .\run-evaluation.mjs run
node .\run-evaluation.mjs contracts
node .\analyze-results.mjs
```

可以在 `run` 后加用例ID只运行指定用例。代码中的并发为2，默认模型固定Flash。仅重复3类指定用例，不能把每次相同问题都当独立样本。

## 辅助检查与浏览器复现

本轮实际执行的产品相关离线测试命令（在公共仓库根目录）：

```powershell
node --test packages/web/test/telemetry.test.ts dashboard/database/test/server.test.ts dashboard/database/test/dashboard-query.test.ts dashboard/database/test/code-events.test.ts dashboard/frontend/test/dashboard.test.ts
npm run check:web
npm --prefix dashboard run check
```

浏览器使用独立Playwright CLI会话。先有P01真实结果，再运行 `prepare-ui-check.mjs` 生成 `ui-run.js`；通过 `playwright-cli run-code --filename=...` 执行。脚本回放结果而不发送新聊天请求，图片生成于公共仓库 `packages/web/output/playwright/`，最终复制归档到本目录 `ui/`。浏览器日志原 `.playwright-cli` 已归档为 `ui-browser-logs/`。

这份脚本不是对所有用户界面的完整回归测试，也不是现场工业诊断认证。
