import fs from 'node:fs';
import path from 'node:path';
import { calculateIntegrated, exampleSession } from './core.js';
import { buildIntegratedPdf_ } from './report.js';

const session=exampleSession();
const neutral=process.argv.includes('--neutral');
session.participant.neutralReport=neutral;
for(const n of [1,2,3]) session.lists[n].complete=true;
const data=calculateIntegrated(session);
const output=path.resolve(neutral?'tmp/pdfs/Informe_04_neutro_QA.pdf':'output/pdf/Informe_04_Ejemplo_V1.9.pdf');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,Buffer.from(buildIntegratedPdf_(data)));
console.log(output);
