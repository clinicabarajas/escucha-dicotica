import { TEST_LISTS } from './data.js?v=1.8';
import { MODES, blankSession, calculate, exampleSession } from './core.js?v=1.8';
import { buildClinicalPdf_, clinicalNorm_ } from './report.js?v=1.8';
import { APP_VERSION } from './version.js?v=1.8';

const $=id=>document.getElementById(id);
document.querySelectorAll('[data-version]').forEach(el=>el.textContent=APP_VERSION);
let session=blankSession(),active=1,pdfUrl=null,dirty=false;
const fields=['name','patient','birth','exam','hand','examiner','notes'];
const listFields=['mode','odDb','oiDb'];
const format=v=>v===null?'—':v.toLocaleString('es-ES',{maximumFractionDigits:1})+' %';
function setStatus(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error)}
function releasePdf(){if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null}$('pdfPreview').replaceChildren()}
function refreshResults(){
  releasePdf();
  const list=session.lists[active];
  let data;try{data=calculate(active,list,session.participant)}catch(e){list.complete=false;setStatus(e.message,true)}
  $('odTotal').textContent=data?format(data.totals[0]):'—';$('oiTotal').textContent=data?format(data.totals[1]):'—';
  $('odLabel').textContent=list.mode===MODES[2]?'Intrusiones OD':'Aciertos OD';$('oiLabel').textContent=list.mode===MODES[1]?'Intrusiones OI':'Aciertos OI';
  $('preview').disabled=$('download').disabled=!list.complete;
  if(data){const norm=clinicalNorm_(data);$('normStatus').textContent=norm.group?`Referencia: ${norm.group.label}. Incluye desviación en z y percentiles estimados por oído y dificultad.`:norm.reason;}
  const marked=list.scores.reduce((n,r)=>n+Number(r[0])+Number(r[1]),0);$('markedCount').textContent=`${marked} dígitos marcados de 162`;
}
function onFieldChange(e){
  const id=e.target.id;
  if(fields.includes(id))session.participant[id]=e.target.value;
  else if(listFields.includes(id)){session.lists[active][id]=e.target.value;session.lists[active].complete=false;updateInstruction();}
  else return;
  dirty=true;setStatus(session.lists[active].complete?'Informe actualizado. Puedes descargarlo.':'Revisa los 27 ítems antes de calcular.');refreshResults();
}
function updateInstruction(){const mode=session.lists[active].mode;document.querySelector(`[data-list="${active}"] span`).textContent=['Atención dividida','Focalizada · OD','Focalizada · OI'][MODES.indexOf(mode)];$('instruction').textContent=mode===MODES[0]?'Atención dividida: registrar los dígitos reconocidos de ambos oídos.':mode===MODES[1]?'Atención focalizada en OD: las marcas de OI se contabilizan como intrusiones.':'Atención focalizada en OI: las marcas de OD se contabilizan como intrusiones.';}
function renderList(){
  const list=session.lists[active];
  for(const id of listFields)$(id).value=list[id];
  for(const button of document.querySelectorAll('[data-list]'))button.setAttribute('aria-pressed',String(Number(button.dataset.list)===active));
  $('reportList').textContent='LISTA '+active;$('calculate').textContent='Calcular informe de Lista '+active+' →';updateInstruction();
  const root=$('items');root.replaceChildren();
  const byItem=Map.groupBy?Map.groupBy(TEST_LISTS[active].map((row,index)=>({row,index})),x=>x.row[0]):TEST_LISTS[active].reduce((m,row,index)=>(m.has(row[0])||m.set(row[0],[]),m.get(row[0]).push({row,index}),m),new Map());
  for(const [item,rows]of byItem){
    const box=document.createElement('section');box.className='item';box.setAttribute('aria-label','Ítem '+item);
    const header=document.createElement('div');header.className='item-heading';header.innerHTML=`<b>Ítem ${String(item).padStart(2,'0')}</b><span>${rows[0].row[1]} ${rows[0].row[1]===1?'par':'pares'}</span>`;box.append(header);
    for(const [ear,earName]of ['OD','OI'].entries()){
      const group=document.createElement('div');group.className='digit-ear '+(ear===1?'oi':'od');const label=document.createElement('span');label.textContent=earName;group.append(label);
      for(const {row,index}of rows){const control=document.createElement('label');control.className='digit-control';const input=document.createElement('input');input.type='checkbox';input.checked=list.scores[index][ear];input.setAttribute('aria-label',`Ítem ${item}, ${earName}, posición ${row[2]}, dígito ${row[ear+3]}`);input.dataset.index=index;input.dataset.ear=ear;const digit=document.createElement('span');digit.textContent=row[ear+3];control.append(input,digit);group.append(control);}
      box.append(group);
    }
    root.append(box);
  }
  setStatus(list.complete?'Informe calculado. Puedes abrirlo o descargarlo.':'Revisa los 27 ítems antes de calcular.');refreshResults();
}
function resetAll(){
  releasePdf();session=blankSession();active=1;dirty=false;$('evaluationForm').reset();
  $('exampleContext').hidden=true;
  document.querySelectorAll('[data-list] span').forEach((span,i)=>span.textContent=['Atención dividida','Focalizada · OD','Focalizada · OI'][i]);
  fields.forEach(id=>$(id).value=session.participant[id]);renderList();
}
function loadExample(){
  releasePdf();session=exampleSession();active=1;dirty=true;$('evaluationForm').reset();
  $('exampleContext').hidden=false;$('exampleContext').open=true;
  document.querySelectorAll('[data-list] span').forEach((span,i)=>span.textContent=['Atención dividida','Focalizada · OD','Focalizada · OI'][i]);
  fields.forEach(id=>$(id).value=session.participant[id]);$('exampleDialog').close();renderList();
  setStatus('Ejemplo anónimo cargado. Revisa las tres listas antes de calcular.');document.querySelector('[data-list="1"]').focus();
}
function createPdf(){
  const list=session.lists[active];if(!list.complete)throw new Error('Revisa y calcula la lista antes de descargar el informe.');
  const data=calculate(active,list,session.participant);
  if(!pdfUrl)pdfUrl=URL.createObjectURL(new Blob([new Uint8Array(buildClinicalPdf_(data))],{type:'application/pdf'}));
  return {data,url:pdfUrl};
}
function download(){try{const {data,url}=createPdf();const link=document.createElement('a');link.href=url;link.download=`TDD_Lista_${active}_${data.date.replaceAll('/','-')}.pdf`;document.body.append(link);link.click();link.remove();setStatus('PDF preparado para descargar. Ábrelo para imprimir.')}catch(e){setStatus(e.message,true)}}

$('evaluationForm').addEventListener('submit',e=>e.preventDefault());
$('evaluationForm').addEventListener('input',onFieldChange);
$('evaluationForm').addEventListener('change',e=>{
  if(e.target.matches('#items input[type=checkbox]')){const list=session.lists[active];list.scores[Number(e.target.dataset.index)][Number(e.target.dataset.ear)]=e.target.checked;list.complete=false;dirty=true;setStatus('Respuestas modificadas. Vuelve a calcular el informe.');refreshResults();}
});
document.querySelectorAll('[data-list]').forEach(button=>button.addEventListener('click',()=>{active=Number(button.dataset.list);renderList()}));
$('calculate').addEventListener('click',()=>{
  if(!$('evaluationForm').reportValidity())return;
  try{calculate(active,session.lists[active],session.participant)}catch(e){setStatus(e.message,true);return}
  const marked=session.lists[active].scores.reduce((n,r)=>n+Number(r[0])+Number(r[1]),0);
  $('confirmText').textContent=`En la Lista ${active} hay ${marked} dígitos marcados. Los ${162-marked} restantes contarán como no reconocidos. Confirma que has revisado los 27 ítems de esta lista.`;
  $('confirmDialog').showModal();
});
$('cancelConfirm').addEventListener('click',()=>$('confirmDialog').close());
$('acceptConfirm').addEventListener('click',()=>{session.lists[active].complete=true;dirty=true;$('confirmDialog').close();refreshResults();setStatus('Informe calculado. Puedes abrirlo o descargarlo.');$('preview').focus()});
$('download').addEventListener('click',download);$('dialogDownload').addEventListener('click',download);
$('preview').addEventListener('click',()=>{try{const {data}=createPdf();$('pdfTitle').textContent='Informe de Lista '+active;$('pdfPreview').innerHTML=buildClinicalPdf_(data,true);$('pdfDialog').showModal()}catch(e){setStatus(e.message,true)}});
$('closePreview').addEventListener('click',()=>$('pdfDialog').close());
$('loadExample').addEventListener('click',()=>$('exampleDialog').showModal());
$('cancelExample').addEventListener('click',()=>$('exampleDialog').close());
$('acceptExample').addEventListener('click',loadExample);
$('reset').addEventListener('click',()=>$('resetDialog').showModal());
$('cancelReset').addEventListener('click',()=>$('resetDialog').close());
$('acceptReset').addEventListener('click',()=>{$('resetDialog').close();resetAll();$('name').focus()});
$('clearList').addEventListener('click',()=>$('clearDialog').showModal());
$('cancelClear').addEventListener('click',()=>$('clearDialog').close());
$('acceptClear').addEventListener('click',()=>{session.lists[active].scores=Array.from({length:81},()=>[false,false]);session.lists[active].complete=false;dirty=true;$('clearDialog').close();renderList()});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
window.addEventListener('pagehide',()=>{releasePdf();session=blankSession();dirty=false;$('evaluationForm').reset();$('exampleContext').hidden=true;$('items').replaceChildren()});
window.addEventListener('pageshow',e=>{if(e.persisted)resetAll()});
resetAll();
