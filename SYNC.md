# 仓库同步

日期：2026-10-25（北京时间）。

- 公共源码：[JACK-Chen415/DCMA-pi-Agent](https://github.com/JACK-Chen415/DCMA-pi-Agent)，`main` 为 `724628e827c381836559610d5259656f2e65486d`。
- 个人归档：[Xixi051108/DCMA-AGENT-PRIVATE](https://github.com/Xixi051108/DCMA-AGENT-PRIVATE)，保存完整项目源码、功能方案、交接、评估说明和评估脚本，保留已有提交历史。
- 个人仓库保持公开，仅上传代码和说明文档；知识手册原件、原始采样、聊天截图和原始答复、导出报告、运行日志、浏览器会话及凭据不上传。评估脚本依赖的原始证据仍需在本机提供。
- 两个远程仓库都在根目录放置应用源码。当前电脑为两个独立仓库：`D:\DCMA-Agent` 管理个人记录，`D:\DCMA-Agent\pi` 为实际应用，继续从 pi 执行 `npm run web:dev`。同步用的独立检出位于 `D:\dcma-sync`，不覆盖这两个工作区。
- 旧版根目录说明保留在个人仓库的 `notes/README.md`；启动、配置和工具用法以 `packages/web/README.md` 为准。

本次执行的验证：20项定向测试、展板类型检查和完整 `npm run check` 均通过。隔离浏览器验证通过，使用合成采样和模拟保存接口，不包含真实模型、数据库和原生保存窗口的端到端验收。提交前检查 diff，推送后核对远程 SHA 和源码文件内容。
