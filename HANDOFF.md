# DCMA 工作交接：监控展板与 Pi SDK 学习

最后更新：2026-10-10（Asia/Shanghai）。完整监控展板、只读接口及联调已完成。全页只显示所选电机；按用户最新参考图补充六页侧边栏导航，采用深蓝侧栏与青色选中态，保留浅色数据面板。最新按截图补充单位，隐藏status和系统运行时间，故障/报警零值仅显示0且其他原码保留；字段名仅中文。按阶段本地提交，未推送。当前交付、验证及后续事项见第0节；此前Pi学习记录保留在第1～11节，仅作历史记录。

## 0. 当前任务：个人仓库中的完整监控展板

### 0.1 用户已确认并要求执行的方案

目标：在 `D:\DCMA-Agent\dashboard` 实现 DCMA 数据展板与 MySQL 只读接口。参考西门子截图的监控内容、六个半圆仪表与侧边栏导航；最新页面采用深蓝侧栏、青色选中态、浅色背景与白色圆角数据卡片。交付时间沿用开发说明：2026-10-11（周日）晚上。

**页面与交互**

- 设备概览和数据说明页新增两幅蓝青色工业SVG插图，分别为电机/变频器与采样/记录，保存在 `frontend/public/assets/illustrations/`。装饰图片使用空alt和aria-hidden，固定固有尺寸、响应式缩放；不添加说明文案，不改变设备数据。
- 最新按用户要求清理监控页辅助说明：移除“原始值 · 格式待确认”、单位待确认、代码规则、页面/分组副标题、表格和曲线操作说明、侧栏提示及规则页脚；字段名后标注已有单位。仪表标签按固定/动态范围显示“量程”/“采样范围”，错误/空数据/查询状态/截断提示保留；“数据说明”集中参考页仍在。
- 非零故障码红色、非零报警码深黄色，零值仅显示0，与缺失默认颜色；运行卡片、完整参数和两类明细表统一使用 `codeClassName`，代码原值保留。`frontend/test/browser-codes.js` 通过浏览器请求拦截模拟五种代码状态，不写数据库，结束恢复真实数据。
- 最新“完整参数”按设备信息、采样信息、运动、电气、功率、温度、负荷参数、故障与控制分成8组；删除标题下“30 个字段 · 保留最新记录原值”。仍保留29项中文字段、单位与完整原值，桌面双列分区、窄屏单列。
- 最新按用户图片补充六页导航：设备概览、实时数据、运行指标、故障与报警、采样明细、数据说明。各页保留设备/来源/条数，地址片段支持后退、切页回顶部。代码页新增从所选来源全部历史采样生成的持久事件历史，与最近50/100/200条窗口分离；开始为首次观察非零，结束为首次观察归零或换码，未观察恢复保留“未结束”，缺失不恢复。北京时间范围查询匹配与范围重叠的事件，保留完整起止、已观察持续时间、汇总/代码分布、本页时段图及50条分页；每30秒检查，可手动查询。事件依赖数据库原始历史保留，用户已选择此方案，不另建事件表或文件，不写数据库。原8列采样表保留类型/代码筛选；明细仍29字段。
- 通过“查看设备”选择电机1～4；全页只显示选中电机的详情、仪表、趋势、运行信息和明细，不同时展示其他电机概览。此项为用户最新明确要求，替代此前四台概览方案。
- 电机1可切换模拟与真实采集；电机2～4各使用自己的模拟表，来源栏显示模拟并禁用切换。默认电机1模拟数据，返回电机1时保留它此前的来源选择，不混合两种来源。
- 单台详情顶部显示设备/变频器名称、来源、采集时间、入库时间和查询状态；本机浏览器使用，优先适配1366和1920宽度。
- 六个半圆仪表按最新参考图固定五项量程：实际转速−1500～1500 rpm、实际电流0～3.3 A、直流母线电压0～1200 V、变频器温度和电机温度均0～150 °C。第三项仍为实际转矩N·m；用户明确要求保留原来的范围，继续按当前有效采样生成刻度、恒定值扩展跨度，不替换为转矩利用率%。缺失值显示“—”且不画指针，固定刻度保留；超量程仅指针停在边界，数值不裁剪。显示范围不代表安全阈值。
- 曲线默认设定/实际转速对比；支持设定/实际转矩对比，全部18个数值字段均可单指标查看。默认100条，可选50/100/200条；按采集时间升序，悬停查看时间及各曲线数值，不做缩放/拖动或任意日期查询。数值缺失处断开曲线，不补0、不连跨缺失点。
- 运行信息：两项负荷率、故障码、报警码；页面隐藏status和system_run_time，其余29个字段仅显示中文名称与单位。数据库/接口的31字段保持不变。
- 打开、切设备/来源/采样条数时立即请求；每5秒自动检查，可手动刷新。请求不重叠；取消旧请求且拒绝旧响应覆盖新选择。
- 查询失败保留同一选择下的上次成功结果并标明刷新失败；首次失败或切换失败不显示上一设备的数据。空表、加载、无新记录、截断要有明确显示。
- 单位按用户参考图：转速rpm、电流A、转矩N·m、电压V、功率kW、温度°C、负荷率%，同类字段统一标注，不换算数值。图中的转矩利用率是另一指标，当前实际转矩按曲线的N·m标注。脉冲频率单位与额定值仍待确认。用户已明确故障/报警码0为正常；最新要求零值仅显示“0”，不附加“正常”文字；其他代码原样保留，缺失为“—”，不推断具体故障类型。控制字/状态字保留原值；运行时间在接口保留、页面隐藏，`air_intake_temp=-200`不解释特殊含义。
- 连接状态、数据来源和采集更新状态分开。当前已有证据表明模拟表在新增记录，真实表是历史采集；可按观察显示“检测到新采样”/“本次无新采样”，不仅凭连接成功宣称持续实时采集。

**数据与接口**

- 库名已确认 `dcma`，主机 `10.108.12.164:3306`。限定五张表：`real_data_01`～`04` 对应G120电机1～4，`real_data` 为电机1历史真实采集。
- 保留 `GET /api/database/catalog` 和 `/api/database/rows`；新增 `GET /api/database/dashboard?table=real_data_01&limit=100`，采样条数只允许50、100、200。
- 同一响应包含五个来源摘要、所选来源最新记录、近期采样、原始记录及查询时间。类型共用于前后端；最新值与所选摘要从同一批查询结果产生。
- 采集时间降序取最近记录，以id稳定排序；曲线返回升序。13位时间戳按毫秒解析，日期文本暂按北京时间（UTC+08:00），输出ISO时间且保留原值；入库时间单独处理。无效采集时间不进曲线，不用入库时间替代。
- 数值仅接受有限数字，缺失/无效值为null，有效0、负数保留；只读事务、参数绑定、超时及结果上限持续保留。
- 只做现有数据支持的功能；用户已要求并确认基于全部历史采样生成事件记录、观测起止时间与持续时间，不声称设备精确发生/恢复时刻。其他聊天、健康评分、节能量、MQTT配置、用户管理或数据库写入仍不在范围。

**开发顺序与验收**

1. 复查本节进度和代码，不重新创建基础目录或要求用户重新提供已经确认的信息。
2. 先制作明确标识的开发用返回样例，锁定共享类型，交替推进前端和接口；正式页面不自动以示例数据代替数据库结果。
3. 按设备详情→仪表→趋势→扩展参数接入真实查询；完成错误处理和刷新。
4. 补齐相关测试，运行check/test/build；浏览器验证1366/1920宽度、悬停及键盘操作；最后检查diff和更新启动文档。

### 0.2 已完成与验证证据（本轮最终状态）

完整展板、只读接口及联调已完成。前后端均位于个人根仓库的 `dashboard/`，未修改嵌套公用 `pi/`，未推送。

**实现与配置**

- `frontend/src/App.tsx`：六页地址片段导航、分组指标到趋势跳转、代码采样记录、数据说明；仅显示所选电机，设备与电机1来源切换、采集/入库/查询时间、来源与采集更新状态、运行信息、29字段完整参数及可展开明细；只显示当前来源警告。
- `frontend/src/components/Gauge.tsx`：接受可选固定range，五项使用`App.tsx`的截图量程；实际转矩继续调用`sampleRange`。固定/动态标签与无障碍title一致，指针限制在量程内但读数不裁剪；不影响曲线范围。
- `frontend/src/components/LineChart.tsx`：转速/转矩对比和全部18字段单项曲线、50/100/200条、缺失断点、悬停提示、毫秒时间及键盘查看。
- `database/code-events.ts` 与 `readCodeHistory`：只读流式遍历所选来源全部历史，连续同码合并、归零/换码关闭、缺失不恢复；时间范围按重叠匹配，保留完整起止，返回50条分页与筛选后事件汇总。`GET /api/database/code-history` 限定五表和标准ISO日期，55秒SQL/60秒请求超时并可取消，拒绝混设备与缺字段。
- `frontend/src/components/CodeEventHistory.tsx`：北京时间时间范围查询、全部时间、历史汇总/代码分布、本页时段图、开始/结束/持续时间/状态表与分页。每30秒刷新历史，65秒超时；同条件失败保留，切条件或设备清空/取消。`CodeAnalysis.tsx`保留8列代码采样及类型/代码筛选，`code-analysis.ts`仅负责跨度格式化。组件以table为key，切设备/来源重置。
- `frontend/src/useDashboard.ts`：每5秒检查、手动刷新、请求不重叠、切换取消和旧响应保护；同一选择失败保留结果，切换失败不残留旧设备值。
- `frontend/src/dashboard-view.ts`：读数、原始值、北京时间、采样范围和断点整理；统一单位映射及故障/报警原码显示。卡片读数最多4位小数，完整参数/采样明细不舍入原值。
- 原`readDashboard`和`GET /api/database/dashboard`查询逻辑不变；新增全历史`readCodeHistory`沿用现有目录校验、时间解析和只读事务。旧catalog/rows接口保留。
- 开发返回样例已保存于 `database/test/dashboard-example.ts`，明确标识开发样例，正式页面从不自动加载。
- 用户已填写的 `dashboard/database/.env` 保持不变，Git忽略；不打印或提交凭据。共享类型不包含连接配置。
- `dashboard/README.md` 已更新为实际启动、操作、数据规则、接口及验证说明。无需重新安装或克隆Pi。

**实际验证**

- 最新量程修改check、build通过；`browser-gauges.js`模拟中点、低于左界、高于右界和缺失四种状态，验证五项左右极值固定、指针比例/边界、数字保留实际读数、缺失不画指针、实际转矩继续采样范围、50/100/200条切换及四档布局。`gauges-fixed.png`已目视检查，拦截撤除恢复真实数据和原生窗口；数据库未写入。本次未重复单元测试及其他浏览器脚本。
- 本轮新增全历史事件后 check、12项测试、build通过；只读实际查询 `real_data_01` 返回116条报警事件，`real_data`返回1条未结束故障事件（查询时结果，后续可变化）。后端已重启加载新接口，解决页面“接口不存在”。`browser-history.js`完整通过：61条事件、起止/持续时间、未结束、北京时间/重叠范围、无效范围/空结果、分页、刷新与采样条数独立、失败保留、设备切换取消、四档布局与图形可见。`browser-codes.js`四页五种代码状态/颜色及筛选通过；`browser-real.js`六页/四档布局/跨页只显示所选电机、来源切换、29字段及既有交互通过。两种模拟均撤除拦截恢复真实数据，三个脚本均恢复原生窗口；未运行本轮`browser-edge.js`。历史桌面/手机截图已目视检查。此前验证记录保留如下。
- 临时`output/playwright/verify-history-live.js`通过：模拟来源真实历史第一页50条；真实来源`F01030`未结束事件的日期与原码正确；北京时间2026-01-14 18:00～19:00范围实际查询成功，页面无接口错误。结束恢复模拟来源及原生窗口；截图`history-live.png`，临时脚本和图片均被Git忽略。

- 隐藏系统运行时间后 check、8项测试、build 通过；`browser-real.js` 复验六页、四档宽度、设备/来源切换、29字段和运行时间无残留通过；`browser-codes.js` 五种代码状态复验通过。两脚本的窗口恢复均执行完成。临时 `output/playwright/verify-native-window.js` 验证真实窗口缩小（视口1088×628）与最大化（2307×1168）后，页面宽度和侧栏高度跟随窗口；未写数据库。撤销测试视口用0×0关闭尺寸覆盖，之后Playwright截图会因该标记失败；截图应在固定尺寸验收期间完成，结束后恢复原生窗口。
- 去掉故障/报警码“（正常）”后 check、8项测试、build 通过；`browser-codes.js` 验证四页五种状态的零值仅显示0、非零原码及颜色、缺失和混合记录通过，撤除拦截后恢复真实数据；数据库未写入。未重复运行整套 `browser-real.js`。
- 插图改动后 check、build 通过；临时 `output/playwright/verify-illustrations.js` 已验证375/768/1366/1920宽度的图片加载、无横向溢出、装饰语义和30参数完整，未重新加入说明文案。设备概览桌面/手机插图及数据说明桌面截图已目视检查；未改数据逻辑，本轮未重复运行单元测试。截图前缀 `illustrated-` 和 `illustration-overview-`，脚本与截图均被Git忽略。
- 辅助说明清理后 check、8项测试、build 通过；`browser-real.js` 已复验六页导航、375/768/1366/1920布局、监控页说明文字消失及单位/字段/设备切换。`browser-codes.js` 复验颜色通过并恢复真实页面；最新实时数据和代码页截图已目视检查。
- 故障/报警颜色修改后 `npm run check`、`npm run test`（8项）、`npm run build` 均通过；`frontend/test/browser-codes.js` 验证四页中同时故障/报警、单独故障、单独报警、正常、缺失的原始文字与实际颜色，以及表格混合记录。模拟截图 `codes-simulated.png` 已目视检查；请求拦截撤除后重新载入真实数据。数据库未写入。
- 最终 `npm run check`、`npm run test`、`npm run build` 均通过；7项自动测试通过。新增单位标注、故障报警0/原码/缺失及状态字不误标正常验证。测试覆盖只读限制、参数、缺失表/字段、多设备、空表、全无效时间、两种时间、无效数值、0/负数、原值、窗口截断、仪表恒定跨度及曲线缺失断点。
- `node database/test/live-check.ts` 已实际执行，只读SELECT检查SQL/JavaScript对非法日期、24点、空值及有效时间的一致性；验证预先取消、查询中取消、并发读取、取消后连接恢复，以及200条结果升序和摘要一致。未修改表、索引或任何记录。
- 浏览器 `frontend/test/browser-real.js` 已在单位/status/故障报警显示修改后重跑通过：375/768/1366/1920宽度的六页无横向溢出；导航选中态、浏览器后退、切页回到顶部、18项分组及对应趋势跳转、代码采样记录、30字段、status隐藏、单位标注与故障报警0正常/非零原码检查通过。逐台跨页只显示当前电机，来源切换与保留、六个仪表、18指标、50/100/200条、悬停、键盘、手动及自动刷新仍通过。
- 浏览器 `frontend/test/browser-edge.js` 已在单位/status/故障报警显示修改后重跑通过：模拟请求失败/空表/截断/慢请求/延迟响应，验证仅显示当前来源警告、分组指标0/缺失/-200、原值精度、代码/明细空表、缺失断线、同选择失败保留、切换失败清空、请求不重叠和竞态保护。只拦截浏览器请求，不写数据库；结束后移除拦截并恢复真实页面。
- 真实接口观察仍符合此前：模拟表新增采样约4秒一条；真实来源最新有效记录id566，采集时间 `2026-01-14T10:27:24.814Z`（北京时间18:27:24.814）。真实来源手动刷新显示“本次无新采样”，模拟来源自动刷新检测到新采样。无标识id567未作为最新采样展示。
- 截图位于 `dashboard/output/playwright/`：`dashboard-1366.png`、`dashboard-1920.png`、`trend-hover.png`、`edge-cases.png`，新增 `metrics.png`、`metrics-mobile.png`、`codes.png`、`records.png`。截图和CLI缓存被Git忽略；实时数据、运行指标的桌面/手机版、代码与明细截图已目视检查。
- 普通沙箱仍会阻止回环网络/数据库网络及Vite realpath（EPERM）；按工具权限流程在沙箱外运行测试、构建、联调后通过。Git目录沙箱只读，本地提交同样需要工具提权；不要把这些限制归因于数据库凭据或源码。
- 每次提交前检查相关diff；最终公用 `pi/` 工作区检查干净。

**本地提交**

- `0806a59c8`：此前完成的只读展板API。
- `4d30105d3`：此前完整方案交接。
- `da7a99a69`：四台概览、页面框架与请求数据流。
- `e5cc6ce64`：六个采样范围仪表。
- `ebe0d79bf`：交互趋势、全部指标和每5秒刷新。
- `bdf9f15f1`：联调修正、真实数据库/浏览器异常验收脚本与测试。
- 启动说明与本HANDOFF作为最后文档提交保存；具体哈希以 `git log` 为准。所有提交仅本地，未推送。
- 后续按用户要求移除四台概览，改为全页仅显示所选电机（`f3dfda1c6`）；六页导航提交为`6e130eef6`，中文字段名提交为`02ea355e0`；最新单位/status/代码显示另作本地提交，具体哈希以 `git log` 为准。

### 0.3 当前交付状态与后续

- 系统运行时间（system_run_time）已从所有页面隐藏，完整参数与采样明细为29字段；数据库和接口31字段保持不变。浏览器验收脚本在finally撤销固定测试视口并恢复窗口边界，避免无痕验收窗口最大化留白或较小窗口裁切。`browser-real.js`与`browser-codes.js`需用Chrome运行。
- 已确认方案没有未完成的实现项，也没有阻塞。尚缺脉冲频率单位、非零代码含义、额定值、运行时间格式及-200含义资料，按既定规则显示待确认和原始值；有资料后再做用户要求的补充，不自行解释。
- 本轮结束时本机前后端开发服务已启动：`http://127.0.0.1:3000` 页面、`3001`只读接口。会话/电脑关闭后可能停止，下一次检查端口再按README在两个终端启动。服务没有安装为系统常驻服务。
- 当前为本机开发/演示交付，未部署、未推送，不新增未要求功能。后续只有用户明确要求时才发布或推送。
- 需要复验时依次运行 `npm run check`、`npm run test`、`npm run build`；真实只读验收和浏览器脚本按README运行，不把样例注入正式页面。
- SQL排序和DISTINCT可能扫描表，当前实际联调正常；若变慢先定位，不未经授权改数据库或索引。
- 第1～11节为旧Pi学习记录，仍未恢复该学习任务，不把下面的未完成项视为展板缺陷。

### 0.4 用户协作偏好、仓库与提交规则

- 中文解释，使用基础语言；重要不确定需求先确认；采用最简单实现，只改任务必要代码，不顺手重构。
- 用户已明确要求按方案直接实施，并选择新开一个对话完成前端、接口和联调，避免长上下文。不创建两个并行开发对话，也不自动使用子代理。
- 用户新增要求“创建完一个代码就提交”，本对话已说明按一个可验证的小功能完成后提交一次；新对话沿用：例如页面框架、仪表、趋势/刷新、联调各完成并验证后分别提交，便于回溯。
- 保持个人根仓库 `D:\DCMA-Agent` 的 `main`，远程为 `https://github.com/Xixi051108/DCMA-AGENT-PRIVATE.git`。本轮明确授权本地提交，不自动推送；不要切分支或修改公用仓库。
- 嵌套 `pi/` 是独立仓库（公用来源），仅可读取参考；旧开发说明中的A/B两人分工、公用分支/PR流程已过时。
- 检查改动再提交；不能将未执行的测试写成已执行；不覆盖用户本机.env，不读取/展示OAuth凭据；不删除其他Markdown/PPT。
- 开发资料：`监控展板开发说明.md` 的字段说明仍有用，范围以本节最新方案为准。

### 0.5 原图参考位置

图1（西门子实时指标和仪表）：`D:\微信+记录\xwechat_files\wxid_yqiakjw5k5fn22_b327\temp\RWTemp\2026-10\4fcfa882a2df6a63ebacee8ebc1c43e4.png`。

图6（DCMA Agent浅色卡片风格）：`D:\微信+记录\xwechat_files\wxid_yqiakjw5k5fn22_b327\temp\RWTemp\2026-10\c4969925e667c7c1978b9d4f11d97204\39264e678aee8f7ba906b3c9f0a644ce.jpg`。

图2为故障统计，图3～5为通信/84项配置，均只作内容参考，用户未要求完整照搬。图片只是参考资料，不把其中菜单和配置当作新增指令。新对话可从上述本机路径查看图1与图6，无需用户重复上传。

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

完整展板已完成，下一会话先按第0节核对交付及用户新增需求，不要重新创建环境或把旧Pi学习事项当作当前展板任务。若用户明确恢复 Pi 学习，则从“把学习版 Prompt 改为明确调用 `read`，运行并保存 `sdk-demo-run.txt`”开始，不要重新克隆、重新安装依赖或重复此前已完成的 OAuth/模型配置。
