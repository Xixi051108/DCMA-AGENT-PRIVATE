# Pi Agent Harness 背景知识

> 本文用于帮助初学者理解 DCMA 工业 Agent 项目中涉及的核心概念。当前阶段不要求掌握复杂架构，重点是理解大模型、Agent、Tool、Agent Loop、Pi Agent Harness 和 Pi SDK 之间的关系。

## 一、整体认识

DCMA 工业 Agent 的目标，是让大模型能够查询设备数据、检索故障知识，并根据真实依据生成辅助诊断结果。

整体流程如下：

```text
用户提出问题
    ↓
Agent 理解用户需求
    ↓
调用设备状态、传感器数据或故障知识工具
    ↓
DCMA 系统或知识库返回真实数据
    ↓
Agent 综合数据和知识
    ↓
生成有依据的回答
```

## 二、大模型是什么

大模型可以理解成一个擅长理解和生成文字的“大脑”。

例如，用户提出：

> 查询 G120电机1 最近一小时有没有异常。

普通大模型只能根据自身已有知识回答。它本身：

- 不知道设备当前状态。
- 不能直接访问 DCMA 数据库。
- 不知道最新的报警记录。
- 不会自动执行查询程序。
- 在缺少数据时可能生成没有依据的答案。

因此，仅有大模型还不能构成可靠的工业应用。

## 三、Agent 是什么

Agent 可以简单理解为：

```text
Agent = 大模型 + 工具 + 运行循环 + 上下文 + 行为规则
```

普通聊天模型主要负责生成回答。Agent 除了生成回答，还可以：

- 判断完成任务需要哪些信息。
- 选择并调用合适的工具。
- 根据工具结果决定下一步。
- 经过多轮工具调用完成任务。
- 保存当前会话的上下文。
- 遵循预先设定的安全规则。

## 四、Agent Harness 是什么

`Harness` 原意是装备或连接装置。在 Agent 系统中，可以将 Agent Harness 理解为：

> 把大模型、工具、上下文和运行流程连接起来的运行底座。

如果大模型是发动机，Agent Harness 就像车辆底盘和控制系统。它负责让发动机、传感器、控制器和车轮共同工作。

Agent Harness 通常负责：

- 保存消息和对话上下文。
- 将用户问题发送给大模型。
- 接收模型返回的 Tool Call。
- 执行对应的工具。
- 将 Tool Result 交回模型。
- 判断是否需要继续下一轮。
- 记录运行事件和错误。
- 管理 Session。
- 控制模型可以使用哪些工具。

## 五、Pi Agent Harness 是什么

根据项目 PPT 中采用的架构，Pi Agent Harness 是一个核心较精简、可以扩展的 Agent 运行底座。

它的主要特点包括：

- 核心结构较小，便于理解 Agent 的运行过程。
- 默认提供少量基础工具。
- 可以通过 TypeScript 扩展额外能力。
- 可以接入不同的大模型。
- 支持自定义 Tool。
- 支持 Session 管理和事件监听。
- 适合观察完整的 Agent Loop。
- 可以作为工业 Agent 的二次开发基础。

项目 PPT 中提到的基础工具包括：

- `read`：读取文件。
- `write`：写入文件。
- `edit`：修改文件。
- `bash`：执行命令。

后续需要增加面向 DCMA 的工业工具，例如：

- `get_device_status`
- `query_sensor_data`
- `query_fault_events`
- `search_fault_manual`

这里的 Pi 不是圆周率，也不是树莓派，而是项目采用的 Agent 开发底座。

## 六、Agent Loop 是什么

Agent Loop 是 Agent 最核心的运行循环。

可以将它简化为下面的伪代码：

```ts
while (任务还没有完成) {
  const response = 调用大模型(历史消息, 可用工具);

  if (response 要求调用工具) {
    const result = 执行工具(response.toolCall);
    把工具结果加入历史消息;
  } else {
    return response.最终回答;
  }
}
```

以 DCMA 为例：

```text
第一轮模型调用
模型：我需要查询设备状态
Tool Call：get_device_status

工具执行
Tool Result：设备正在运行，目前没有活动报警

第二轮模型调用
模型：还需要查询最近一小时的数据
Tool Call：query_sensor_data

工具执行
Tool Result：电流在 27.5～30.5 A 之间

第三轮模型调用
模型：根据查询结果生成最终回答
```

一次用户提问可能触发多次模型调用。阶段一最重要的目标，就是观察并理解这个过程。

## 七、Tool 是什么

Tool 是可以被 Agent 调用的程序函数。

例如：

```ts
getDeviceStatus({
  deviceId: "G120电机1"
});
```

工具可能返回：

```json
{
  "deviceId": "G120电机1",
  "status": "running",
  "activeAlarm": false,
  "updatedAt": "2026-10-05T10:30:00+08:00"
}
```

各部分职责如下：

- 大模型负责理解问题、选择工具和解释结果。
- Tool 负责查询数据库、调用 API 或进行确定性计算。
- DCMA 负责提供设备和业务数据。

大模型不应该自己编造设备状态，而应该通过 Tool 获取真实数据。

## 八、Tool Call 和 Tool Result

### 1. Tool Call

Tool Call 表示模型请求执行某个工具。

```json
{
  "name": "get_device_status",
  "arguments": {
    "deviceId": "G120电机1"
  }
}
```

### 2. Tool Result

Tool Result 是程序执行工具后返回的结果。

```json
{
  "status": "running",
  "alarmCode": null
}
```

Pi Agent Harness 负责把 Tool Call 转交给工具，再把 Tool Result 放回上下文，让模型继续判断。

## 九、SDK 是什么

SDK 是 Software Development Kit，即软件开发工具包。

Pi Agent Harness 是 Agent 的运行机制，Pi SDK 是开发者通过代码使用这套机制的接口。

| 名称 | 简单理解 |
|---|---|
| Pi Agent Harness | Agent 的运行底座 |
| Pi SDK | 程序员操作这套底座的开发工具包 |
| DCMA API | 获取 DCMA 数据的通信接口 |
| DCMA Tool | 对 DCMA API 的 Agent 化封装 |
| 大模型 | 负责理解、判断和生成回答 |

开发者可以通过 Pi SDK：

- 创建 Agent。
- 注册 Tool。
- 发送用户问题。
- 监听运行事件。
- 管理 Session。
- 获取最终回答。

## 十、API 是什么

API 是两个系统之间约定好的通信接口。

例如，假设 DCMA 提供下面的接口：

```http
GET /devices/G120-01/status
```

接口返回：

```json
{
  "running": true,
  "temperature": 38.5
}
```

DCMA Tool 会调用这个 API：

```text
Agent
  ↓ 调用
get_device_status Tool
  ↓ 请求
DCMA API
  ↓ 返回
设备数据
```

SDK 和 API 的区别：

- SDK 是帮助开发者构建程序的工具包。
- API 是两个系统之间的通信约定。

## 十一、Prompt 是什么

Prompt 不只是用户提出的问题，还包括 Agent 的长期行为说明。

例如，DCMA Agent 的系统 Prompt 可以规定：

```text
你是 DCMA 工业设备辅助诊断 Agent。

回答设备状态问题前必须调用数据查询工具。
不得编造设备数据。
必须说明查询时间范围。
诊断结论必须给出数据或手册依据。
涉及设备控制时必须要求人工审批。
```

Prompt 可以约束模型的行为，但不能替代程序层面的权限检查和安全控制。

## 十二、Skill 是什么

Skill 可以理解成一份供 Agent 使用的专业操作说明。

例如，“电机故障分析 Skill”可以规定：

1. 确认设备和分析时间范围。
2. 查询设备运行状态。
3. 查询电流、温度和转矩。
4. 查询同一时间范围内的故障事件。
5. 根据故障码检索故障手册。
6. 区分事实数据、手册内容和模型推断。
7. 给出有顺序的现场检查建议。

三者的区别：

- Prompt：规定 Agent 的总体身份和规则。
- Skill：说明某一类任务应该怎么完成。
- Tool：真正执行查询或操作的程序。

Skill 主要指导 Agent“怎么做”，Tool 负责真正“执行”。

## 十三、Context 和 Session

### 1. Context

Context 是模型在当前一次调用中能够看到的信息，例如：

- 系统 Prompt。
- 用户消息。
- 历史对话。
- Tool Call。
- Tool Result。
- Skill 内容。
- 检索到的相关文档。

Context 有长度限制，不能无限保存所有信息。

### 2. Session

Session 是一段连续的 Agent 会话。

例如：

```text
用户：查询 G120电机1。
Agent：当前运行正常。

用户：那最近一个小时呢？
```

第二句话没有再次说明设备名称，但 Session 保留了前面的消息，因此 Agent 可以判断“最近一个小时”仍然指 G120电机1。

## 十四、Model Provider

Model Provider 负责连接具体的大模型服务。

项目 PPT 的架构中提到可以接入 DeepSeek 或其他模型：

```text
Pi Agent Harness
    ↓
Model Provider
    ↓
DeepSeek 或其他模型
```

Pi 不等于某个具体模型。它是模型外面的运行底座。理想情况下，更换模型时不需要重写所有 Tool。

## 十五、MCP 是什么

MCP 是一种让大模型应用连接工具和数据源的标准协议。

可以把 MCP 理解成 Agent 世界里的“通用插座”：

- 不使用 MCP 时，每个工具可能需要单独设计连接方式。
- 使用 MCP 时，工具可以按照统一协议提供给 Agent。

当前阶段不需要优先学习 MCP。应该先掌握普通 Tool Call，理解 Pi 如何注册和调用自定义工具，再学习 MCP。

## 十六、DCMA 工业 Agent 的整体结构

```text
用户
  ↓
Web 聊天界面
  ↓
Pi Agent Harness
  ├─ 系统 Prompt
  ├─ Session 和 Context
  ├─ 故障分析 Skill
  └─ DCMA Tools
       ├─ 查询设备状态
       ├─ 查询传感器数据
       ├─ 查询故障事件
       └─ 检索故障手册
              ↓
        DCMA 系统、数据库和知识库
```

Pi 负责运行 Agent，DCMA 提供工业数据，项目开发工作负责把两者连接起来。

## 十七、当前阶段需要掌握的五个结论

1. 大模型负责理解和判断，但不知道真实设备状态。
2. Tool 负责获取真实数据或执行确定性操作。
3. Agent Loop 让模型和 Tool 反复交互，直到任务完成。
4. Pi Agent Harness 负责运行这个循环。
5. Pi SDK 让开发者能够通过代码创建和控制 Agent。

## 十八、建议学习顺序

```text
大模型
→ Agent
→ Tool Call 和 Tool Result
→ Agent Loop
→ Pi Agent Harness
→ Pi SDK Demo
→ 自定义 Tool
→ DCMA 数据接入
```

## 十九、阶段一的学习目标

阶段一不要求立即完成工业故障诊断。当前目标是亲眼观察并理解：

> 模型为什么调用工具、工具返回了什么，以及工具结果如何进入下一轮模型调用。

阶段一建议完成以下任务：

- [ ] 理解本文中的基础概念。
- [ ] 跑通 Pi SDK 官方 Demo。
- [ ] 找到 Demo 中创建 Agent 的代码。
- [ ] 找到 Demo 中注册 Tool 的代码。
- [ ] 观察一次完整的 Tool Call 和 Tool Result。
- [ ] 保存一次 Agent Loop 的运行日志。
- [ ] 编写一个使用模拟数据的简单 Tool。
- [ ] 让 Agent 调用该 Tool 并生成最终回答。

完成以上内容后，再进入 DCMA 真实数据接入阶段。
