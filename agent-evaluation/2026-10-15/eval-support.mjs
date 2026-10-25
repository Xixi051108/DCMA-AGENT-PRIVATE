import { readFileSync } from 'node:fs';
const fixtures = JSON.parse(readFileSync(new URL('./tool-fixtures.json', import.meta.url), 'utf8'));
export function publicEvalEvent(event) {
  if (event.type === 'tool_execution_start') return { event: event.type, toolCallId: event.toolCallId, toolName: event.toolName, args: event.args, at: Date.now() };
  if (event.type === 'tool_execution_end') return { event: event.type, toolCallId: event.toolCallId, toolName: event.toolName, result: event.result, isError: event.isError, at: Date.now() };
  if (event.type === 'message_end' && event.message.role === 'assistant') return { event: 'model_usage', usage: event.message.usage, stopReason: event.message.stopReason, at: Date.now() };
  return null;
}
export function wrapEvalTools(tools, fixtureName, selectedTable) {
  if (!fixtureName) return tools;
  const fixture = fixtures[fixtureName];
  if (!fixture) throw new Error('Unknown evaluation fixture');
  let remaining = 8;
  return tools.map(tool => ({ ...tool, execute: async (_id, args) => {
    if (remaining-- <= 0) throw new Error('本轮数据库查询次数已达到上限。');
    let report;
    if (fixture.failure) report = { connected: false, error: fixture.failure };
    else if (tool.name === 'list_industrial_tables') report = fixture.catalog;
    else {
      const table = args.table ?? selectedTable;
      const data = fixture.tables[table];
      if (!data) report = { connected: false, error: '当前来源不存在或不可用。' };
      else if (tool.name === 'read_industrial_dashboard') report = data;
      else {
        const rows = data.latest ? [data.latest.raw].filter(row => (args.filters ?? []).every(filter => {
          const value = row[filter.column];
          if (value === null || value === undefined) return false;
          const expected = filter.value;
          if (filter.operator === '=') return String(value) === String(expected);
          const left = typeof expected === 'number' ? Number(value) : String(value);
          return filter.operator === '>=' ? left >= expected : left <= expected;
        })) : [];
        report = { table: fixture.catalog.tables.find(item => item.name === table), queriedAt: data.queriedAt, rows, returned: rows.length, hasMore: data.hasMore, orderBy: 'id', note: '受控测试仅包含最新原始记录，筛选在该记录内执行；不包含更早原始记录，不代表完整时间范围。' };
      }
    }
    return { content: [{type: 'text', text: JSON.stringify(report)}], details: { connected: !fixture.failure, evaluationFixture: fixtureName } };
  }}));
}
