import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
const serverPath = 'D:/DCMA-Agent/pi/packages/web/server.ts';
const supportUrl = new URL('./eval-support.mjs', import.meta.url).href;
registerHooks({
  load(url, context, nextLoad) {
    const loaded = nextLoad(url, context);
    if (!url.startsWith('file:') || fileURLToPath(url).replaceAll('\\', '/') !== serverPath) return loaded;
    let source = String(loaded.source);
    const toolsLine = 'const databaseTools = databaseConfigured() ? createDatabaseTools(body.table ?? "real_data_01") : [];';
    const subscribeLine = 'const unsubscribe = session.subscribe((event) => {';
    if (!source.includes(toolsLine) || !source.includes(subscribeLine)) throw new Error('Evaluation hook no longer matches source; refusing to run');
    source = `import { wrapEvalTools, publicEvalEvent } from ${JSON.stringify(supportUrl)};\n` + source;
    source = source.replace(toolsLine, 'const databaseTools = wrapEvalTools(databaseConfigured() ? createDatabaseTools(body.table ?? "real_data_01") : [], request.headers["x-dcma-eval-fixture"], body.table ?? "real_data_01");');
    source = source.replace(subscribeLine, subscribeLine + '\n const observed = publicEvalEvent(event); if (observed) emit({type: "eval_trace", ...observed});');
    return { ...loaded, source };
  }
});
