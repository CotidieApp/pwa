import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'out','sw.js'),'utf8');
const urls=[...source.matchAll(/url:"([^"]+)"/g)].map(match=>match[1]);
if(!urls.length)throw new Error('No se pudo reconocer el manifiesto precache; revisar el validador.');
const missing=urls.filter(url=>url.startsWith('/') && !fs.existsSync(path.join(root,'out',url==='/'?'index.html':url.split('?')[0])));
if(missing.length)throw new Error('Recursos PWA ausentes en export estático: '+missing.join(', '));
for (const asset of ['breviarium-3.1.8.js', 'hours-cl.json', 'lectionary-cl.json.gz']) {
  const route = '/liturgy/' + asset;
  if (!urls.includes(route) || !fs.existsSync(path.join(root, 'out', route))) {
    throw new Error(`Falta un recurso litúrgico local en la exportación o en la precaché PWA: ${route}.`);
  }
}
console.log(`PWA: ${urls.length} entradas de precache verificadas.`);
