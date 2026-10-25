import assert from 'node:assert/strict';
import { test } from 'node:test';
import { wrapEvalTools } from './eval-support.mjs';
const tools = [{name:'read_industrial_rows',execute:()=>{throw new Error('Unexpected real call');}}];
test('fixture row response uses the production shape and filters nulls', async () => {
  const [tool] = wrapEvalTools(tools,'missing','real_data_01');
  const result = await tool.execute('id',{table:'real_data_01',filters:[{column:'motor_temp',operator:'>=',value:-100}]});
  const report = JSON.parse(result.content[0].text);
  assert.equal(report.returned,0);
  assert.equal(report.table.name,'real_data_01');
  assert.ok(report.queriedAt);
});
test('fixture equality cannot return code zero for a nonzero filter',async()=>{
  const [tool] = wrapEvalTools(tools,'normal','real_data_01');
  const result = await tool.execute('id',{table:'real_data_01',filters:[{column:'fault_code',operator:'>=',value:1}]});
  assert.equal(JSON.parse(result.content[0].text).returned,0);
});
test('fixture enforces the existing shared eight-call budget',async()=>{
  const [tool] = wrapEvalTools(tools,'failure','real_data_01');
  for(let i=0;i<8;i++) await tool.execute('id',{});
  await assert.rejects(()=>tool.execute('id',{}),/达到上限/);
});
