import { readFile, readdir, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const readJson = async path => JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const saveJson = (path,value) => writeFile(new URL(path,import.meta.url),JSON.stringify(value,null,2)+'\n');
const cases=await readJson('cases.json');
const results=await Promise.all(cases.map(c=>readJson(`results/${c.id}.json`)));
const stats=values=>{const a=values.filter(v=>typeof v==='number').toSorted((a,b)=>a-b);return {n:a.length,min:a[0]??null,median:a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:null,max:a.at(-1)??null,p95:a.length?a[Math.ceil(a.length*.95)-1]:null,mean:a.length?a.reduce((s,n)=>s+n,0)/a.length:null};};
const sumUsage=items=>items.flatMap(r=>r.modelUsage??[]).reduce((a,u)=>{for(const key of ['input','output','cacheRead','reasoning','totalTokens']) a[key]+=(u?.[key]??0); a.estimatedCostUSD+=u?.cost?.total??0;a.modelTurns++;return a;},{input:0,output:0,cacheRead:0,reasoning:0,totalTokens:0,estimatedCostUSD:0,modelTurns:0});
const archived=await Promise.all((await readdir(new URL('invalidated-initial/',import.meta.url))).filter(n=>n.endsWith('.json')).map(n=>readJson('invalidated-initial/'+n)));
const summary={validRuns:results.length,independentCaseDefinitions:cases.filter(c=>!c.repeatOf).length,actualAttempts:results.length+archived.length,invalidatedHarnessRuns:archived.length,streamCompleted:results.filter(r=>r.completed).length,latencyMs:stats(results.map(r=>r.totalMs)),firstTextMs:stats(results.map(r=>r.firstTextMs)),answerChars:stats(results.map(r=>r.answerChars)),toolCalls:stats(results.filter(r=>r.mode!=='public-api').map(r=>r.toolStarts)),validObservedUsage:sumUsage(results),allObservedUsageIncludingInvalidated:sumUsage([...results,...archived]),usageLimitation:'两个原服务黑盒用例未暴露usage；cost为SDK按本地模型价格配置估算USD，并非供应商账单。不得把该值当作全部实际费用。',modes:Object.fromEntries([...new Set(results.map(r=>r.mode))].map(mode=>[mode,results.filter(r=>r.mode===mode).length])),repeats:{},sourceHashesVerified:{}};
for(const id of ['D01','D02','D06']){const group=results.filter(r=>r.id===id||r.id.startsWith(id+'-R'));summary.repeats[id]={runs:group.map(r=>({id:r.id,chars:r.answerChars,ms:r.totalMs,tools:r.toolStarts})),chars:stats(group.map(r=>r.answerChars))};}
const env=await readJson('environment.json');
for(const [path,hash] of Object.entries(env.sourceHashes))summary.sourceHashesVerified[path]=createHash('sha256').update(await readFile('D:/DCMA-Agent/pi/'+path)).digest('hex')===hash;
const numerical={};
for(const result of results){
  const queries=[];
  for(const event of result.events.filter(e=>e.event==='tool_execution_end')){
    for(const block of event.result?.content??[]){if(block.type!=='text')continue;let data;try{data=JSON.parse(block.text);}catch{continue;}
      if(!Array.isArray(data.columns)||!Array.isArray(data.rows)||!Array.isArray(data.rows[0]))continue;
      const metrics={};for(const [i,field] of data.columns.entries()){if(i<2)continue;const values=data.rows.map(row=>row[i]).filter(n=>typeof n==='number');if(values.length)metrics[field]={n:values.length,min:Math.min(...values),max:Math.max(...values),mean:values.reduce((a,b)=>a+b,0)/values.length,first:values[0],last:values.at(-1)};}
      queries.push({table:data.table,returned:data.returned,latest:data.latest,columns:data.columns,from:data.rows[0]?.[1],to:data.rows.at(-1)?.[1],metrics});
    }
  }
  numerical[result.id]=queries;
}
await saveJson('metrics.json',summary);await saveJson('numeric-evidence.json',numerical);
await saveJson('run-summary.json',results.map(({events,request,answer,...r})=>r));
let caseDoc='# 测试用例与逐项结果\n\n所有用例在模型执行前已保存于 cases.json。功能判定见 assessment.json；完整回答和轨迹见 results/。\n\n';
for(const test of cases){const result=results.find(r=>r.id===test.id);caseDoc+=`## ${test.id} ${test.title}\n\n- 分层：${test.mode}；夹具：${test.fixture??'无'}；设备来源：${test.table}\n- 问题：${test.text}\n- 判定依据：${test.rubric.join('；')}\n- 历史上下文：${test.history?JSON.stringify(test.history):'无'}\n- 传输完成：${result.completed}；耗时：${(result.totalMs/1000).toFixed(2)}秒；首文本：${result.firstTextMs===null?'无':(result.firstTextMs/1000).toFixed(2)+'秒'}；字符：${result.answerChars}；工具：${result.mode==='public-api'?'不可观察':result.toolStarts}\n- [原始回答](${`results/${test.id}.md`}) · [完整请求与工具证据](${`results/${test.id}.json`})\n\n`;}
await writeFile(new URL('TEST-CASES.md',import.meta.url),caseDoc);
let transcripts='# 全部有效测试的真实回答\n\n';
for(const result of results)transcripts+=`## ${result.id} ${result.title}\n\n问题：${result.request.text}\n\n${result.answer||'（没有返回正文）'}\n\n${result.events.filter(e=>e.type==='error').map(e=>'接口错误：'+e.message).join('\n')}\n\n---\n\n`;
await writeFile(new URL('TRANSCRIPTS.md',import.meta.url),transcripts);
const uiLog=await readFile(new URL('ui-results.log',import.meta.url),'utf8');
const line=uiLog.split(/\r?\n/).find(line=>line.startsWith('{"mode"'));
if(line)await saveJson('ui-results.json',JSON.parse(line));
await mkdir(new URL('ui/',import.meta.url),{recursive:true});
for(const name of ['agent-eval-replay-375.png','agent-eval-replay-768.png','agent-eval-replay-1440.png','agent-eval-dashboard.png']){
  try { await copyFile('D:/DCMA-Agent/pi/packages/web/output/playwright/'+name,new URL('ui/'+name,import.meta.url)); }
  catch(error) { if(error.code!=='ENOENT')throw error; await readFile(new URL('ui/'+name,import.meta.url)); }
}
console.log(JSON.stringify(summary,null,2));
console.log('L06 independent statistics: '+JSON.stringify(numerical.L06.map(q=>({table:q.table,metrics:q.metrics})),null,2));
