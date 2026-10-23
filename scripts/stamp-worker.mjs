import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const buildId=(await readFile(new URL('.next/BUILD_ID',root),'utf8')).trim();
const template=await readFile(new URL('service-worker/worker.js',root),'utf8');
await writeFile(new URL('public/sw.js',root),template.replace(/const RELEASE = "[^"]+";/,`const RELEASE = ${JSON.stringify(buildId)};`));
console.log('Offline worker stamped for the completed production build.');
