import { TEST_LISTS } from './data.js?v=1.10';
import { clinicalAge_ } from './report.js?v=1.10';

export const MODES = ['Atención dividida','Atención focalizada - oído derecho','Atención focalizada - oído izquierdo'];

export const EXAMPLE_PROFILE = Object.freeze({age:10,hand:'Diestro',odDb:'65',oiDb:'65'});

const EXAMPLE_BITS = {
  1:['111111111111101111110011110101111001111001111011111111011111111001111011011011011','101000010011001010110111110111001001011101001001100101100100010110110111101101001'],
  2:['010111110101110001001111011101111111111111111111111111111110011111110111111111110','100000000000001000000000000010000000000000000000000000000001100000000000000000000'],
  3:['000001000000001001000000001100000101000100000001010011001010000010000010000000000','111100110111110111001111001010101000011001111010101001110101010101111011110110111']
};

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
    participant:{name:'',patient:'',birth:'',exam:today(),hand:'',examiner:'',notes:'',neutralReport:false},
    lists:Object.fromEntries([1,2,3].map(n=>[n,{mode:MODES[n-1],odDb:'',oiDb:'',otherErrors:'',complete:false,scores:Array.from({length:81},()=>[false,false])}]))
  };
}
export function exampleSession() {
  const session=blankSession();
  const examYear=Number(session.participant.exam.slice(0,4));
  session.participant.birth=`${examYear-EXAMPLE_PROFILE.age}-01-01`;
  session.participant.hand=EXAMPLE_PROFILE.hand;
  for(const n of [1,2,3]){
    const [od,oi]=EXAMPLE_BITS[n];
    session.lists[n].odDb=EXAMPLE_PROFILE.odDb;
    session.lists[n].oiDb=EXAMPLE_PROFILE.oiDb;
    session.lists[n].scores=Array.from({length:81},(_,i)=>[od[i]==='1',oi[i]==='1']);
  }
  return session;
}
export function calculate(listNumber, list, participant) {
  const def=TEST_LISTS[listNumber];
  if (!def || !MODES.includes(list.mode)) throw new Error('Lista o modalidad no válida.');
  if (!Array.isArray(list.scores)||list.scores.length!==81||list.scores.some(s=>!Array.isArray(s)||s.length!==2||s.some(v=>typeof v!=='boolean'))) throw new Error('La lista debe contener 81 puntuaciones para cada oído.');
  const exam=dateFromIso(participant.exam),birth=participant.birth?dateFromIso(participant.birth):null;
  if(!exam) throw new Error('Introduce una fecha de examen válida.');
  if(participant.birth&&(!birth||birth>exam)) throw new Error('La fecha de nacimiento debe ser válida y anterior o igual a la del examen.');
  for(const v of [list.odDb,list.oiDb]) if(v!==''&&(!Number.isFinite(Number(v))||Number(v)<0||Number(v)>120)) throw new Error('La intensidad debe estar entre 0 y 120 dB nHL.');
  if(list.otherErrors!==''&&(!Number.isInteger(Number(list.otherErrors))||Number(list.otherErrors)<0||Number(list.otherErrors)>999)) throw new Error('Las respuestas ajenas al estímulo deben ser un número entero entre 0 y 999.');
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
    examiner:participant.examiner.trim(),hand:participant.hand,notes:participant.notes.trim(),neutralReport:Boolean(participant.neutralReport),mode:list.mode,odDb:list.odDb,oiDb:list.oiDb,otherErrors:list.otherErrors===''?null:Number(list.otherErrors),
    completed:list.complete?100:0,totals:total,
    difficulty:[1,2,3].map(n=>measure('Par '+n,r=>r[1]===n)),
    pairs:pairs.map(([n,pos])=>measure('Par '+n+(n>1?'-'+pos[0]:''),r=>r[1]===n&&pos.includes(r[2]))),
    positions:[1,2,3].flatMap(n=>Array.from({length:n+1},(_,i)=>measure(n+'-'+(i+1),r=>r[1]===n&&r[2]===i+1)))
  };
}

export function integratedReadiness(session) {
  if(!session?.participant||![1,2,3].every(n=>session.lists?.[n])) return {ok:false,reason:'La evaluación no contiene las tres listas.'};
  if(![1,2,3].every(n=>session.lists[n].complete)) return {ok:false,reason:'Completa y calcula las tres listas para activar el Informe 04.'};
  if(![1,2,3].every(n=>session.lists[n].mode===MODES[n-1])) return {ok:false,reason:'El Informe 04 requiere Lista 1 dividida, Lista 2 focalizada en OD y Lista 3 focalizada en OI.'};
  const intensities=[1,2,3].flatMap(n=>[session.lists[n].odDb,session.lists[n].oiDb]);
  const recorded=intensities.filter(v=>v!=='');
  if(recorded.length&&recorded.length!==intensities.length) return {ok:false,reason:'Para comparar las listas, registra todas las intensidades o déjalas todas sin consignar.'};
  if(recorded.length&&new Set(recorded.map(Number)).size!==1) return {ok:false,reason:'Las intensidades deben ser iguales en ambos oídos y en las tres listas para generar el Informe 04.'};
  return {ok:true,reason:recorded.length?'Tres listas completas y condiciones comparables.':'Tres listas completas. Intensidad no consignada; el informe mostrará esta limitación.',intensity:recorded.length?Number(recorded[0]):null};
}

export function calculateIntegrated(session) {
  const readiness=integratedReadiness(session);
  if(!readiness.ok) throw new Error(readiness.reason);
  const lists=Object.fromEntries([1,2,3].map(n=>[n,calculate(n,session.lists[n],session.participant)]));
  const baseline=lists[1].totals,focusRight=lists[2].totals,focusLeft=lists[3].totals;
  const changeIndex=(focused,base)=>focused+base===0?null:(focused-base)/(focused+base)*100;
  const measure=(key,label,direction,ear,base,focused,suppression=false)=>{
    const signed=changeIndex(focused,base);
    return {key,label,direction,ear,base,focused,delta:suppression?base-focused:focused-base,index:signed===null?null:(suppression?-signed:signed),originalIndex:signed,suppression};
  };
  const measures=[
    measure('gainOd','Facilitación OD','Atención a OD','OD',baseline[0],focusRight[0]),
    measure('suppressOi','Supresión OI','Atención a OD','OI',baseline[1],focusRight[1],true),
    measure('gainOi','Facilitación OI','Atención a OI','OI',baseline[1],focusLeft[1]),
    measure('suppressOd','Supresión OD','Atención a OI','OD',baseline[0],focusLeft[0],true)
  ];
  const load=lists[1].difficulty.map((row,i)=>({
    pairs:i+1,
    gainOd:lists[2].difficulty[i][1]-row[1],
    suppressOi:row[2]-lists[2].difficulty[i][2],
    gainOi:lists[3].difficulty[i][2]-row[2],
    suppressOd:row[1]-lists[3].difficulty[i][1]
  }));
  return {
    name:lists[1].name,patient:lists[1].patient,age:lists[1].age,date:lists[1].date,examiner:lists[1].examiner,hand:lists[1].hand,notes:lists[1].notes,
    neutralReport:lists[1].neutralReport,intensity:readiness.intensity,quality:readiness.reason,lists,measures,load,
    baseline:{od:baseline[0],oi:baseline[1],mean:baseline[2],il:baseline[3]},
    focusRight:{hit:focusRight[0],intrusion:focusRight[1],selectivity:focusRight[0]-focusRight[1],omissions:100-focusRight[0]},
    focusLeft:{hit:focusLeft[1],intrusion:focusLeft[0],selectivity:focusLeft[1]-focusLeft[0],omissions:100-focusLeft[1]},
    otherErrors:[1,2,3].map(n=>lists[n].otherErrors)
  };
}
