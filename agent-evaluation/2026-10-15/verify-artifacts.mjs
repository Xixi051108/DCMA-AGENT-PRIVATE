import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const cases=await readJson('cases.json');
const results=await Promise.all(cases.map(c=>readJson(`results/${c.id}.json`)));
const assessment=await readJson('assessment.json');
const metrics=await readJson('metrics.json');
assert.equal(cases.length,32);assert.equal(assessment.length,32);
assert.equal(results.filter(r=>r.request.model!=='deepseek/deepseek-flash').length,0);
assert.equal(assessment.filter(a=>a.verdict==='通过').length,24);
assert.equal(assessment.filter(a=>a.verdict==='部分通过').length,6);
assert.equal(assessment.filter(a=>a.verdict==='失败').length,2);
assert.equal(results.filter(r=>r.completed).length,31);
assert.ok(Object.values(metrics.sourceHashesVerified).every(Boolean));
const contracts=await readJson('contract-results.json');assert.equal(contracts.length,11);assert.ok(contracts.every(r=>r.passed));
const ui=await readJson('ui-results.json');assert.equal(ui.checks.length,15);assert.ok(ui.checks.every(c=>c.passed));assert.equal(ui.observedRequests.length,0);
assert.ok((await readFile(new URL('unit-results.tap',import.meta.url),'utf8')).includes('# pass 19'));
assert.ok((await readFile(new URL('harness-tests.tap',import.meta.url),'utf8')).includes('# pass 3'));
const publicAnswer=results.find(r=>r.id==='P01');
assert.ok((await readFile(new URL('analysis-download.md',import.meta.url),'utf8')).includes(publicAnswer.answer));
for(const doc of ['REPORT.md','README.md','TEST-CASES.md','TEST-RESULTS.md','TRANSCRIPTS.md']){
  const content=await readFile(new URL(doc,import.meta.url),'utf8');
  for(const match of content.matchAll(/\]\(([^)]+)\)/g)){
    const target=match[1];if(target.startsWith('http')||target.startsWith('D:')||target.includes('*'))continue;
    await readFile(new URL(target.split('#')[0],import.meta.url));
  }
}
const files=[];
async function visit(url){for(const entry of await readdir(url,{withFileTypes:true})){const path=new URL(entry.name+(entry.isDirectory()?'/':''),url);if(entry.isDirectory())await visit(path);else files.push(path);}}
await visit(new URL('.',import.meta.url));
for(const path of files.filter(url=>/\.(json|md|log|tap|csv)$/.test(url.pathname))){const content=await readFile(path,'utf8');assert.ok(!/\bsk-[A-Za-z0-9_-]{24,}\b/.test(content),'Potential credential in '+path.pathname);}
const result={verifiedAt:new Date().toISOString(),cases:32,assessment:{pass:24,partial:6,fail:2},contractChecks:11,productUnitTests:19,harnessTests:3,browserChecks:15,allRequestsUseFlash:true,productSourceHashesUnchanged:true,downloadIncludesExactSavedAnswer:true,localMarkdownLinksExist:true,noKeyLikeStringsInTextArtifacts:true,files:files.length};
await writeFile(new URL('artifact-verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
