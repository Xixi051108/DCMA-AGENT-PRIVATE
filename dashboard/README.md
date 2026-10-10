# DCMA 独立监控展板：开发准备

本项目位于个人仓库 `Xixi051108/DCMA-AGENT-PRIVATE` 的 `main` 分支。后续本对话的代码与文件都保存在个人仓库；公用仓库只作为读取和复制来源。

当前完成前端开发环境和数据库只读接口的准备，页面仅提供连接检查、字段与原始记录预览。完整监控展板、设备筛选、采集时间统一、指标映射和定时刷新尚未实现；数据库未配置时显示明确状态，不使用示例数据替代查询结果。

## 文件位置

- `frontend/`：React、TypeScript、Vite 页面开发目录，入口为 `src/App.tsx`。
- `frontend/src/components/DatabasePanel.tsx`：连接检查、表结构与最多 20 行记录预览。
- `frontend/src/components/LineChart.tsx`：已复制的 SVG 折线图组件，供后续页面复用，当前未接入数据。
- `frontend/reference/RightPanel.tsx`：公用项目原始设备卡片布局，仅作参考，不参与编译和运行。
- `database/`：独立 Node/MySQL 后端、配置示例和接口测试。
- `database/types.ts`：数据库返回结构，前端通过类型导出共用，不包含连接配置。

## 安装与启动

需要 Node.js 22.18 或更新版本。无需安装或启动 Pi SDK。

```powershell
cd D:\DCMA-Agent\dashboard
npm ci --ignore-scripts
```

在两个终端中分别执行：

```powershell
cd D:\DCMA-Agent\dashboard
npm run dev:database
```

```powershell
cd D:\DCMA-Agent\dashboard
npm run dev:frontend
```

浏览器打开 <http://127.0.0.1:3000>。前端开发服务器把 `/api/database` 请求转发到本机 `3001` 端口的后端。两个服务均仅监听本机；Ctrl+C 分别停止服务。

## 数据库配置

```powershell
Copy-Item database/.env.example database/.env
```

在本机编辑 `database/.env`，填写 MySQL 用户、密码和实际库名，再重启后端。`.env` 被 Git 忽略，凭据仅由后端读取，禁止放入前端或提交到 Git。示例已填写确认过的主机 `10.108.12.164`、端口 `3306`，账号密码为空，不预填未知库名。

`MYSQL_DATABASE` 可限制到实际库名；留空时，仅从账号可访问的库中发现 `real_data`、`real_data_01` 至 `real_data_04` 五张已知表。需要所在网络能访问 MySQL；Navicat 的连接成功记录不能替代此后端的实际联调结果。

## 已准备接口

| 接口 | 用途 |
|---|---|
| `GET /api/database/catalog` | 返回配置、连接状态和五张已知表的字段结构 |
| `GET /api/database/catalog?refresh=1` | 重新检查目录，不使用 60 秒目录缓存 |
| `GET /api/database/rows?schema=实际库名&table=real_data_01&limit=20` | 返回所选表的有限原始记录窗口 |

接口仅接受 GET，不接受任意 SQL。查询使用只读事务、参数绑定与标识符转义；行数范围 1～200，记录数据限制 64KB，查询超时 5 秒。接口返回查询时间；原始 `timestamp` 和 `create_time` 保留原值，不把入库时间或刷新时间转换成采集时间。当前排序沿用源代码，优先日期时间类型字段，再使用主键；记录预览不是按采集时间整理好的趋势接口。

`real_data_01`～`real_data_04` 是模拟数据；`real_data` 是短暂真实采集数据。设备关系、持续写入情况、单位、时区、运行时间格式和状态码仍需核对。完整页面范围参考根目录 `HANDOFF.md`；`监控展板两人分工.md` 的字段说明可参考，其中两人分工和公用仓库协作安排已过时。

## 验证

```powershell
npm run check
npm run test
npm run build
```

接口测试不读取本机 `.env`，并在独立测试进程中清除 MySQL 配置，验证无凭据状态、只读限制、参数和来源检查，不连接真实数据库。构建输出位于 `frontend/dist`；当前仅整理开发启动流程，未配置部署服务。

## 复制来源与调整

来源为公用仓库 `JACK-Chen415/DCMA-pi-Agent` 的 `dashboard-frontend` 分支，提交 `424bf0ddd005f620cce29e3acc009f4ee8284f9e`。本次只读取本地 `pi/` 副本，并核对公用远程提交一致；未修改或推送公用仓库。

| 原文件（相对公用仓库） | 个人仓库用途及调整 |
|---|---|
| `packages/web/src/components/DatabasePanel.tsx` | 复制为预览入口；取消未验证的“实时”标注 |
| `packages/web/src/components/LineChart.tsx` | 原样复制，单独保留需要的 `ChartPoint` 类型 |
| `packages/web/src/components/RightPanel.tsx` | 原样保存于 `frontend/reference/`，不带入示例设备和聊天行为 |
| `packages/web/src/main.tsx` | 原样复制 React 入口 |
| `packages/web/src/database-types.ts` | 原样复制为 `database/types.ts`，供前后端共用 |
| `packages/web/tailwind.config.js`、`postcss.config.js` | 保留原主题配置；PostCSS 和 CSS 入口适配 Tailwind 4，避免原构建依赖的已知漏洞 |
| `packages/web/public/assets/logo.png` | 原样复制 DCMA 标志 |
| `packages/web/src/index.css`、`index.html` | 提取基础样式与入口，适配独立预览页面 |
| `packages/web/database.ts` | 提取连接、目录和只读查询，移除 Pi 工具注册；限定五张已知表 |
| `packages/web/server.ts`、`package.json` | 参考数据库 HTTP 接口和依赖，整理独立服务与工作区命令 |

原 Web 工作台的相关提交作者为 Jahon。保留源仓库 MIT 许可证于 `LICENSE`，不复制 Pi 模型配置、聊天功能、凭据、依赖目录或 Git 元数据。
