import { TEST_LISTS } from './data.js';
import { clinicalAge_ } from './report.js';

export const MODES = ['Atención dividida','Atención focalizada - oído derecho','Atención focalizada - oído izquierdo'];

export function dateFromIso(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [y,m,d]=value.split('-').map(Number), date=new Date(y,m-1,d,12);
  return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d ? date : null;
}
export function today() {
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function blankSession() {
  return {
    participant:{name:'',patient:'',birth:'',exam:today(),hand:'',examiner:'',notes:''},
    lists:Object.fromEntries([1,2,3].map(n=>[n,{mode:MODES[n-1],odDb:'',oiDb:'',complete:false,scores:Array.from({length:81},()=>[false,false])}]))
  };
}
export function calculate(listNumber, list, participant) {
  const def=TEST_LISTS[listNumber];
  if (!def || !MODES.includes(list.mode)) throw new Error('Lista o modalidad no válida.');
  if (!Array.isArray(list.scores)||list.scores.length!==81||list.scores.some(s=>!Array.isArray(s)||s.length!==2||s.some(v=>typeof v!=='boolean'))) throw new Error('La lista debe contener 81 puntuaciones para cada oído.');
  const exam=dateFromIso(participant.exam),birth=participant.birth?dateFromIso(participant.birth):null;
  if(!exam) throw new Error('Introduce una fecha de examen válida.');
  if(participant.birth&&(!birth||birth>exam)) throw new Error('La fecha de nacimiento debe ser válida y anterior o igual a la del examen.');
  for(const v of [list.odDb,list.oiDb]) if(v!==''&&(!Number.isFinite(Number(v))||Number(v)<0||Number(v)>120)) throw new Error('La intensidad debe estar entre 0 y 120 dB nHL.');
  const percentage=(filter,ear)=>{
    const indexes=def.map((r,i)=>filter(r)?i:-1).filter(i=>i>=0);
    return list.complete ? indexes.reduce((sum,i)=>sum+Number(list.scores[i][ear]),0)/indexes.length*100 : null;
  };
  const measure=(label,filter)=>[label,percentage(filter,0),percentage(filter,1)];
  const od=percentage(()=>true,0),oi=percentage(()=>true,1);
  const total=list.complete?[od,oi,(od+oi)/2,list.mode===MODES[0]?(od+oi===0?0:(od-oi)/(od+oi)*100):null]:[null,null,null,null];
  const pairs=[[1,[1,2]],[2,[1,2]],[2,[2,3]],[3,[1,2]],[3,[2,3]],[3,[3,4]]];
  return {
    list:Number(listNumber),name:participant.name.trim(),patient:participant.patient.trim(),age:birth?clinicalAge_(birth,exam):null,
    date:`${String(exam.getDate()).padStart(2,'0')}/${String(exam.getMonth()+1).padStart(2,'0')}/${exam.getFullYear()}`,
    examiner:participant.examiner.trim(),hand:participant.hand,notes:participant.notes.trim(),mode:list.mode,odDb:list.odDb,oiDb:list.oiDb,
    completed:list.complete?100:0,totals:total,
    difficulty:[1,2,3].map(n=>measure('Par '+n,r=>r[1]===n)),
    pairs:pairs.map(([n,pos])=>measure('Par '+n+(n>1?'-'+pos[0]:''),r=>r[1]===n&&pos.includes(r[2]))),
    positions:[1,2,3].flatMap(n=>Array.from({length:n+1},(_,i)=>measure(n+'-'+(i+1),r=>r[1]===n&&r[2]===i+1)))
  };
}
