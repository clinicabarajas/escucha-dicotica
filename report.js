import { PDF_LOGO } from './logo-pdf.js?v=1.14';
import { APP_VERSION } from './version.js?v=1.14';
import { BRAIN_IMAGE } from './brain-image.js?v=1.14';
// Referencia descriptiva publicada: Zenker Castro et al., 2007, tabla 1, p. 78.
// Percentiles estimados bajo distribución normal; no son percentiles empíricos publicados.
const TDD_NORMS = [
  {min:6,max:12,label:'6-12 años',n:23,od:[[89.9,10.6],[77.2,12.1],[75.6,11.3]],oi:[[69.0,18.0],[58.2,19.8],[50.3,17.4]]},
  {min:13,max:17,label:'13-17 años',n:20,od:[[94.1,8.6],[87.0,14.1],[79.6,18.0]],oi:[[89.5,7.3],[81.0,17.3],[66.8,21.3]]},
  {min:18,max:34,label:'18-34 años',n:22,od:[[91.2,9.4],[75.1,14.3],[65.6,16.6]],oi:[[84.9,12.5],[70.1,17.4],[56.5,14.0]]},
  {min:35,max:59,label:'35-59 años',n:25,od:[[86.4,14.6],[73.7,15.6],[62.9,18.4]],oi:[[86.6,9.6],[70.8,19.4],[55.1,17.9]]},
  {min:61,max:72,label:'>60 años (hasta 72)',n:23,od:[[79.0,24.8],[68.9,22.3],[61.1,20.6]],oi:[[70.6,24.3],[63.9,15.2],[42.9,17.8]]}
];

function clinicalAge_(birth, exam) {
  if (!(birth instanceof Date) || !(exam instanceof Date) || isNaN(birth) || isNaN(exam) || birth > exam) return null;
  let age = exam.getFullYear()-birth.getFullYear();
  if (exam.getMonth()<birth.getMonth() || (exam.getMonth()===birth.getMonth() && exam.getDate()<birth.getDate())) age--;
  return age;
}

function clinicalNorm_(d) {
  if(d.mode!=='Atención dividida') return {reason:'La referencia de 2007 corresponde a atención dividida; no se aplica a atención focalizada.'};
  if(d.hand && !['Diestro','No consta'].includes(d.hand)) return {reason:'La referencia publicada se obtuvo en participantes diestros. No se aplica automáticamente a la lateralidad registrada.'};
  if(d.age===null || d.age===undefined) return {reason:'No consta una edad válida. Introduzca la fecha de nacimiento para comparar por edad.'};
  if(d.age===60) return {reason:'Edad de 60 años: la tabla publicada no define expresamente este límite. Comparación no disponible.'};
  const g=TDD_NORMS.find(g=>d.age>=g.min && d.age<=g.max);
  if(!g) return {reason:'Edad fuera del rango de referencia disponible (6-72 años). No se extrapolan valores.'};
  return {group:g};
}

function clinicalPercentile_(z) {
  const t=1/(1+0.2316419*Math.abs(z));
  const tail=0.3989422804014327*Math.exp(-z*z/2)*t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
  return 100*(z>=0?1-tail:tail);
}

function buildClinicalPdf_(d, preview=false) {
  const W=595.28,H=841.89,M=34,CW=W-2*M;
  const ink='#183348',muted='#617789',line='#dce5eb',soft='#f1f6f8',od='#c62828',oi='#1565c0',accent='#087f8c',white='#ffffff';
  const branded=!d.neutralReport;
  const pages=[[]];let out=pages[0];const svg=[];
  const xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function vector(s){if(!preview)return;const i=pages.indexOf(out);if(!svg[i])svg[i]=[];svg[i].push(s);}
  const num=v=>Number(v).toFixed(3).replace(/\.?0+$/,'')||'0';
  const color=h=>[1,3,5].map(i=>num(parseInt(h.slice(i,i+2),16)/255)).join(' ');
  const win=s=>Array.from(String(s??'').normalize('NFC')).map(c=>{const x=c.charCodeAt(0);return x<256?x:({'€':128,'–':150,'—':151,'‘':145,'’':146,'“':147,'”':148,'•':149,'…':133,'−':45}[c]||63);});
  const esc=s=>win(s).map(c=>c<32||c>126||[40,41,92].includes(c)?'\\'+c.toString(8).padStart(3,'0'):String.fromCharCode(c)).join('');
  const width=(s,size,bold=false)=>win(s).reduce((a,c)=>a+TDD_PDF_WIDTHS[bold?1:0][c],0)*size/1000;
  function text(s,x,y,size=10,bold=false,fill=ink,align='left') {if(align==='right')x-=width(s,size,bold);if(align==='center')x-=width(s,size,bold)/2;vector('<text x="'+x+'" y="'+y+'" font-size="'+size+'" font-weight="'+(bold?'700':'400')+'" fill="'+fill+'">'+xml(s)+'</text>');out.push('BT /'+(bold?'F2':'F1')+' '+num(size)+' Tf '+color(fill)+' rg 1 0 0 1 '+num(x)+' '+num(H-y)+' Tm ('+esc(s)+') Tj ET');}
  function rect(x,y,w,h,fill){if(w<=0||h<=0)return;vector('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'"/>');out.push(color(fill)+' rg '+[x,H-y-h,w,h].map(num).join(' ')+' re f');}
  function stroke(x1,y1,x2,y2,fill=line,w=.6,dash=false){vector('<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+fill+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="3 2"':'')+'/>');out.push(color(fill)+' RG '+num(w)+' w '+(dash?'[3 2]':'[]')+' 0 d '+num(x1)+' '+num(H-y1)+' m '+num(x2)+' '+num(H-y2)+' l S [] 0 d');}
  function dot(x,y,r,fill){vector('<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'"/>');const k=.55228475*r,a=H-y;out.push(color(fill)+' rg '+`${num(x+r)} ${num(a)} m ${num(x+r)} ${num(a+k)} ${num(x+k)} ${num(a+r)} ${num(x)} ${num(a+r)} c ${num(x-k)} ${num(a+r)} ${num(x-r)} ${num(a+k)} ${num(x-r)} ${num(a)} c ${num(x-r)} ${num(a-k)} ${num(x-k)} ${num(a-r)} ${num(x)} ${num(a-r)} c ${num(x+k)} ${num(a-r)} ${num(x+r)} ${num(a-k)} ${num(x+r)} ${num(a)} c f`);}
  function wrap(s,max,size=10,bold=false){const lines=[];String(s||'').split(/\r?\n/).forEach(p=>{let cur='';p.split(/\s+/).filter(Boolean).forEach(word=>{if(width(word,size,bold)>max){if(cur){lines.push(cur);cur='';}let part='';for(const c of word){if(width(part+c,size,bold)>max){lines.push(part);part='';}part+=c;}cur=part;}else if(cur && width(cur+' '+word,size,bold)>max){lines.push(cur);cur=word;}else cur+=(cur?' ':'')+word;});lines.push(cur);});return lines;}
  const fmt=(v,dec=1)=>v===null||v===undefined||!isFinite(v)?'—':Number(v).toFixed(dec).replace('.',',');
  const pct=z=>{const p=clinicalPercentile_(z);return p<1?'<1':p>99?'>99':String(Math.round(p));};
  const norm=clinicalNorm_(d),g=norm.group,free=d.mode==='Atención dividida';
  const participantName=d.name||(d.isExample?'CASO DE EJEMPLO · ANÓNIMO':'Sin identificar');
  const odLabel=d.mode.includes('oído izquierdo')?'Intrusiones OD':'Aciertos OD';
  const oiLabel=d.mode.includes('oído derecho')?'Intrusiones OI':'Aciertos OI';
  function footer(page,total){stroke(M,799,W-M,799);text(branded?'CLÍNICA BARAJAS':'ESCUCHA DICÓTICA',M,815,8,true);text('Lista '+d.list+'  ·  '+(d.date||'Sin fecha')+'  ·  '+APP_VERSION+'  ·  '+page+'/'+total,W-M,815,8,false,muted,'right');}
  function legend(x,y){dot(x,y-3,3,od);text(odLabel,x+8,y,8,false,od);dot(x+108,y-3,3,oi);text(oiLabel,x+116,y,8,false,oi);}
  const logoW=69,logoH=logoW*PDF_LOGO.height/PDF_LOGO.width;
  if(branded){vector('<image href="./logo-clinica-barajas.png" x="'+M+'" y="22" width="'+logoW+'" height="'+logoH+'"/>');out.push('q '+num(logoW)+' 0 0 '+num(logoH)+' '+num(M)+' '+num(H-22-logoH)+' cm /Logo Do Q');}
  else{text('TEST DE DÍGITOS DICÓTICOS',M,51,9,true,accent);}
  text('INFORME AUDIOLÓGICO',W-M,43,8,true,muted,'right');text('TDD / LISTA '+d.list,W-M,59,11,true,ink,'right');
  text('Escucha dicótica',branded?M+90:M,84,27,true);text('Test de Dígitos Dicóticos',branded?M+90:M,105,11,false,muted);
  rect(M,131,CW,2,accent);text(d.mode,M,151,10,true);text(d.completed===100?'EVALUACIÓN COMPLETA':'REGISTRO INCOMPLETO · '+fmt(d.completed,0)+' %',W-M,151,8,true,muted,'right');
  rect(M,162,CW,66,soft);
  text('PARTICIPANTE',M+12,177,7.5,true,muted);let nameSize=12;while(nameSize>8&&wrap(participantName,310,nameSize,true).length>2)nameSize--;const nameLines=wrap(participantName,310,nameSize,true);nameLines.forEach((s,i)=>text(s,M+12,193+i*13,nameSize,true));
  text('FECHA',W-M-132,177,7.5,true,muted);text(d.date||'No consta',W-M-132,194,11,true);
  text('ID: '+(d.patient||'—')+'   ·   Edad: '+(d.age===null?'No consta':d.age+' años'),M+12,218,8.5,false,muted);
  text('Lateralidad: '+(d.hand||'No consta'),W-M-132,218,8.5,false,muted);
  const cards=[['OÍDO DERECHO',odLabel,d.totals[0],od],['OÍDO IZQUIERDO',oiLabel,d.totals[1],oi],['MEDIA BILATERAL',free?'Porcentaje de aciertos':'Media descriptiva',d.totals[2],ink],['LATERALIDAD',free?'Índice IL':'No aplicable',d.totals[3],ink]];
  cards.forEach((c,i)=>{const x=M+i*(CW+9)/4,w=(CW-27)/4;rect(x,244,w,78,soft);rect(x,244,w,2,c[3]);text(c[0],x+10,260,7.4,true,muted);let value=fmt(c[2]);if(i===3&&c[2]>0)value='+'+value;text(value,x+10,293,27,true,c[3]);if(c[2]!==null)text('%',x+w-10,292,10,false,muted,'right');text(c[1],x+10,309,8,false,muted);});
  text('01',M,347,9,true,accent);text(free?'Referencia por edad y dificultad':'Resultados por dificultad',M+23,347,14,true);
  text(g?'Grupo '+g.label+' · n = '+g.n+' · referencia publicada':free?'Comparación por edad no disponible':'Aciertos del oído atendido e intrusiones del no atendido',M,364,8.5,false,muted);
  const xScore=M+130,xNorm=M+221,xPlot=M+241,plotW=135,xZ=M+437,xP=W-M;
  text('MEDIDA',M,386,7.8,true,muted);text('RESULTADO',xScore,386,7.8,true,muted,'right');text(free?'MEDIA ± DT':'TIPO',xNorm,386,7.8,true,muted,'right');text(free?'DISTRIBUCIÓN DE REFERENCIA':'PORCENTAJE REGISTRADO',xPlot,386,6.8,true,muted);if(free){text('z (DT)',xZ,386,8,true,muted,'right');text('P EST.*',xP,386,7.8,true,muted,'right');}
  d.difficulty.forEach((row,i)=>[1,2].forEach((ear,j)=>{const y=405+(i*2+j)*23,v=row[ear],c=ear===1?od:oi,label=(i+1)+' '+(i===0?'par':'pares')+' / '+(ear===1?'OD':'OI');const ns=g?(ear===1?g.od[i]:g.oi[i]):null;
    if(i%2===0)rect(M-4,y-12,CW+8,23,'#f7f9fa');dot(M+2,y-3,2.7,c);text(label,M+12,y,9,true,c);text(v===null?'—':fmt(v)+' %',xScore,y,10,true,c,'right');text(ns?fmt(ns[0])+' ± '+fmt(ns[1]):free?'—':(ear===1?odLabel:oiLabel).replace(/ (OD|OI)/,''),xNorm,y,9,false,muted,'right');
    stroke(xPlot,y-3,xPlot+plotW,y-3,line,1);[0,50,100].forEach(t=>stroke(xPlot+t/100*plotW,y-6,xPlot+t/100*plotW,y,line,.5));
    if(ns){const lo=Math.max(0,ns[0]-ns[1]),hi=Math.min(100,ns[0]+ns[1]);rect(xPlot+lo/100*plotW,y-7,(hi-lo)/100*plotW,8,'#d5e1e8');stroke(xPlot+ns[0]/100*plotW,y-9,xPlot+ns[0]/100*plotW,y+3,ink,1);}
    if(v!==null){dot(xPlot+Math.max(0,Math.min(100,v))/100*plotW,y-3,3.4,c);}
    const z=ns&&v!==null?(v-ns[0])/ns[1]:null;if(free){text(z===null?'—':(z>0?'+':'')+fmt(z,2),xZ,y,9,true,c,'right');text(z===null?'—':pct(z),xP,y,10,true,c,'right');}
  }));
  text('0',xPlot,534,7,false,muted,'center');text('50',xPlot+plotW/2,534,7,false,muted,'center');text('100 %',xPlot+plotW,534,7,false,muted,'center');
  text(g?'Punto: resultado  ·  Banda: media ± 1 DT':'Punto: resultado registrado',M,534,8,false,muted);
  function profile(data,x,y,w,title){text(title,x,y,10,true);const top=y+16,h=63,left=x+21,right=x+w-7;[0,50,100].forEach(v=>{const yy=top+h-v/100*h;stroke(left,yy,right,yy,line,.5);text(String(v),left-5,yy+3,7,false,muted,'right');});data.forEach((r,i)=>text(r[0].replace('Par ',''),left+i*(right-left)/(data.length-1),top+h+13,7,false,muted,'center'));[1,2].forEach(ear=>{const c=ear===1?od:oi;let prev=null;data.forEach((r,i)=>{const v=r[ear];if(v===null){prev=null;return;}const p=[left+i*(right-left)/(data.length-1),top+h-v/100*h];if(prev)stroke(prev[0],prev[1],p[0],p[1],c,1.6,ear===2);dot(p[0],p[1],2,c);prev=p;});});if(data.every(r=>r[1]===null&&r[2]===null))text('Sin resultados finales',x+w/2,top+35,9,false,muted,'center');}
  profile(d.pairs,M,565,250,'02 / Perfil por pares');profile(d.positions,M+277,565,250,'03 / Posición en el bloque');legend(M,677);
  const detail='Intensidad OD: '+(d.odDb||'—')+' / OI: '+(d.oiDb||'—')+' dB nHL. Respuestas ajenas al estímulo: '+(d.otherErrors===null||d.otherErrors===undefined?'no registradas':d.otherErrors)+'. Examinador: '+(d.examiner||'No consta')+'.';
  let explain=free?'IL = (OD - OI) / (OD + OI) × 100. Un valor positivo indica predominio OD.':'En atención focalizada, las marcas del oído no atendido representan intrusiones. El IL no se interpreta con la referencia de escucha libre.';
  if(!g)explain+=' '+norm.reason;
  const noteLines=wrap(detail+' '+explain+' Observaciones: '+(d.notes||'Sin observaciones registradas.'),CW-24,8.4);
  rect(M,692,CW,62,soft);text('LECTURA DEL INFORME',M+12,706,7.5,true,muted);noteLines.slice(0,3).forEach((s,i)=>text(s,M+12,720+i*11,8.4));
  if(noteLines.length>3)text('Notas completas en la página siguiente.',M+12,752,7.5,true,accent);
  text(free?'* P est.: estimación normal; z = (resultado - media) / DT. No son percentiles empíricos.':'Atención focalizada: resultados descriptivos sin comparación normativa ni percentiles.',M,764,7.2,false,muted);
  text('Referencia: participantes diestros, atención dividida, 65 dB nHL. No implica diagnóstico.',M,774,7.2,false,muted);
  text('Norma: Zenker Castro et al. (2007). Rev. Logop. Foniatr. Audiol. 27(2):74-85, tabla 1.',M,784,7.1,false,muted);
  text('Referencia clínica: Zenker Castro et al. (2008). Acta Otorrinolaringol. Esp. 59(10):503-505.',M,794,7.1,false,muted);
  if(noteLines.length>3){const continued=wrap(detail+' '+explain+' Observaciones: '+(d.notes||'Sin observaciones registradas.'),CW,9.5);const chunks=[];for(let i=0;i<continued.length;i+=46)chunks.push(continued.slice(i,i+46));chunks.forEach(chunk=>{out=[];pages.push(out);text('Notas de la evaluación',M,70,24,true);text('Lista '+d.list+' · '+participantName,M,94,11,false,muted);stroke(M,110,W-M,110,od,1.5);chunk.forEach((s,i)=>text(s,M,138+i*13,9.5));});}
  pages.forEach((p,i)=>{out=p;footer(i+1,pages.length);});
  if(preview)return svg.map((lines,i)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" font-family="Arial,Helvetica,sans-serif" role="img" aria-label="Informe de Lista '+d.list+', página '+(i+1)+'"><rect width="'+W+'" height="'+H+'" fill="white"/>'+lines.join('')+'</svg>').join('');
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
  if(branded){const mask=PDF_LOGO.alpha+'>',rgb=PDF_LOGO.rgb+'>';objects.push('<< /Type /XObject /Subtype /Image /Width '+PDF_LOGO.width+' /Height '+PDF_LOGO.height+' /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter [/ASCIIHexDecode /FlateDecode] /Length '+mask.length+' >>\nstream\n'+mask+'\nendstream');objects.push('<< /Type /XObject /Subtype /Image /Width '+PDF_LOGO.width+' /Height '+PDF_LOGO.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask 5 0 R /Filter [/ASCIIHexDecode /FlateDecode] /Length '+rgb.length+' >>\nstream\n'+rgb+'\nendstream');}
  const kids=[];pages.forEach(p=>{const pageId=objects.length+1,streamId=pageId+1,stream=p.join('\n');kids.push(pageId+' 0 R');const xObject=branded?' /XObject << /Logo 6 0 R >>':'';objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>'+xObject+' >> /Contents '+streamId+' 0 R >>');objects.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');});objects[1]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
  let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((s,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+s+'\nendobj\n';});const offset=pdf.length;pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+offset+'\n%%EOF';
  return Array.from(pdf,c=>c.charCodeAt(0));
}

function buildIntegratedPdf_(d,preview=false){
  const W=595.28,H=841.89,M=34,CW=W-2*M;
  const ink='#183348',muted='#617789',line='#dce5eb',soft='#f1f6f8',od='#c62828',oi='#1565c0',accent='#087f8c',white='#ffffff',branded=!d.neutralReport;
  const pages=[[]];let out=pages[0];const svg=[];
  const xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function vector(s){if(!preview)return;const i=pages.indexOf(out);if(!svg[i])svg[i]=[];svg[i].push(s);}
  const num=v=>Number(v).toFixed(3).replace(/\.?0+$/,'')||'0';
  const color=h=>[1,3,5].map(i=>num(parseInt(h.slice(i,i+2),16)/255)).join(' ');
  const win=s=>Array.from(String(s??'').normalize('NFC')).map(c=>{const x=c.charCodeAt(0);return x<256?x:({'€':128,'–':150,'—':151,'‘':145,'’':146,'“':147,'”':148,'•':149,'…':133,'−':45}[c]||63);});
  const esc=s=>win(s).map(c=>c<32||c>126||[40,41,92].includes(c)?'\\'+c.toString(8).padStart(3,'0'):String.fromCharCode(c)).join('');
  const width=(s,size,bold=false)=>win(s).reduce((a,c)=>a+TDD_PDF_WIDTHS[bold?1:0][c],0)*size/1000;
  function text(s,x,y,size=10,bold=false,fill=ink,align='left'){if(align==='right')x-=width(s,size,bold);if(align==='center')x-=width(s,size,bold)/2;vector('<text x="'+x+'" y="'+y+'" font-size="'+size+'" font-weight="'+(bold?'700':'400')+'" fill="'+fill+'">'+xml(s)+'</text>');out.push('BT /'+(bold?'F2':'F1')+' '+num(size)+' Tf '+color(fill)+' rg 1 0 0 1 '+num(x)+' '+num(H-y)+' Tm ('+esc(s)+') Tj ET');}
  function rect(x,y,w,h,fill,strokeColor=null,strokeWidth=.7){if(w<=0||h<=0)return;vector('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(strokeColor?6:0)+'" fill="'+fill+'"'+(strokeColor?' stroke="'+strokeColor+'" stroke-width="'+strokeWidth+'"':'')+'/>');out.push(color(fill)+' rg '+(strokeColor?color(strokeColor)+' RG '+num(strokeWidth)+' w ':'')+[x,H-y-h,w,h].map(num).join(' ')+' re '+(strokeColor?'B':'f'));}
  function stroke(x1,y1,x2,y2,fill=line,w=.7,dash=false){vector('<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+fill+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="4 3"':'')+'/>');out.push(color(fill)+' RG '+num(w)+' w '+(dash?'[4 3]':'[]')+' 0 d '+num(x1)+' '+num(H-y1)+' m '+num(x2)+' '+num(H-y2)+' l S [] 0 d');}
  function dot(x,y,r,fill,strokeColor=null){vector('<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'"'+(strokeColor?' stroke="'+strokeColor+'" stroke-width="1"':'')+'/>');const k=.55228475*r,a=H-y;out.push(color(fill)+' rg '+(strokeColor?color(strokeColor)+' RG 1 w ':'')+`${num(x+r)} ${num(a)} m ${num(x+r)} ${num(a+k)} ${num(x+k)} ${num(a+r)} ${num(x)} ${num(a+r)} c ${num(x-k)} ${num(a+r)} ${num(x-r)} ${num(a+k)} ${num(x-r)} ${num(a)} c ${num(x-r)} ${num(a-k)} ${num(x-k)} ${num(a-r)} ${num(x)} ${num(a-r)} c ${num(x+k)} ${num(a-r)} ${num(x+r)} ${num(a-k)} ${num(x+r)} ${num(a)} c `+(strokeColor?'B':'f'));}
  function triangle(points,fill){vector('<polygon points="'+points.map(p=>p.join(',')).join(' ')+'" fill="'+fill+'"/>');out.push(color(fill)+' rg '+num(points[0][0])+' '+num(H-points[0][1])+' m '+points.slice(1).map(p=>num(p[0])+' '+num(H-p[1])+' l').join(' ')+' h f');}
  function arrow(x1,y1,x2,y2,fill,w=2,dash=false){stroke(x1,y1,x2,y2,fill,w,dash);const a=Math.atan2(y2-y1,x2-x1),len=7+w,spread=4+w*.5;triangle([[x2,y2],[x2-len*Math.cos(a)+spread*Math.sin(a),y2-len*Math.sin(a)-spread*Math.cos(a)],[x2-len*Math.cos(a)-spread*Math.sin(a),y2-len*Math.sin(a)+spread*Math.cos(a)]],fill);}
  function brainImage(x,y,w,h){vector('<image data-illustration="brain-ears" href="./cerebro-oidos.jpg?v=1.14" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet"/>');out.push('q '+num(w)+' 0 0 '+num(h)+' '+num(x)+' '+num(H-y-h)+' cm /Brain Do Q');}
  function wrap(s,max,size=10,bold=false){const lines=[];String(s||'').split(/\r?\n/).forEach(p=>{let cur='';p.split(/\s+/).filter(Boolean).forEach(word=>{if(cur&&width(cur+' '+word,size,bold)>max){lines.push(cur);cur=word;}else cur+=(cur?' ':'')+word;});if(cur)lines.push(cur);});return lines;}
  const fmt=(v,dec=1)=>v===null||v===undefined||!isFinite(v)?'—':Number(v).toFixed(dec).replace('.',',');
  const signed=v=>v===null||v===undefined||!isFinite(v)?'—':(v>0?'+':'')+fmt(v);
  const participantName=d.name||(d.isExample?'CASO DE EJEMPLO · ANÓNIMO':'Sin identificar');
  function header(label){const logoW=65,logoH=logoW*PDF_LOGO.height/PDF_LOGO.width;if(branded){vector('<image href="./logo-clinica-barajas.png" x="'+M+'" y="18" width="'+logoW+'" height="'+logoH+'"/>');out.push('q '+num(logoW)+' 0 0 '+num(logoH)+' '+num(M)+' '+num(H-18-logoH)+' cm /Logo Do Q');}else{text('TEST DE DÍGITOS DICÓTICOS',M,46,9,true,accent);}text('INFORME AUDIOLÓGICO',W-M,38,8,true,muted,'right');text(label,W-M,54,10,true,ink,'right');}
  function footer(page){stroke(M,799,W-M,799);text(branded?'CLÍNICA BARAJAS':'ESCUCHA DICÓTICA',M,815,8,true);text('Informe 04  ·  '+(d.date||'Sin fecha')+'  ·  '+APP_VERSION+'  ·  '+page+'/2',W-M,815,8,false,muted,'right');}
  function brainPanel(x,y,w,h,title,attended,mGain,mSuppress,focus){
    rect(x,y,w,h,'#f8fafb',line);text(title,x+13,y+20,11,true);text('MODULACIÓN SOSTENIDA',x+w-13,y+20,6.8,true,muted,'right');
    const cx=x+w/2,lx=x+48,rx=x+w-48,ih=96,iw=ih*BRAIN_IMAGE.width/BRAIN_IMAGE.height,ix=cx-iw/2,iy=y+29,earY=iy+ih*.63,leftEar=ix+iw*.08,rightEar=ix+iw*.92;
    rect(ix-5,iy-3,iw+10,ih+6,white,line,.5);brainImage(ix,iy,iw,ih);
    const targetX=attended==='OD'?rx:lx,targetColor=attended==='OD'?od:oi,otherX=attended==='OD'?lx:rx,otherColor=attended==='OD'?oi:od;
    const targetEar=attended==='OD'?rightEar:leftEar,otherEar=attended==='OD'?leftEar:rightEar;
    arrow(cx+(attended==='OD'?8:-8),iy+ih*.31,targetEar,earY,targetColor,Math.min(4,1.5+Math.abs(mGain.index||0)/34));arrow(cx+(attended==='OD'?-8:8),iy+ih*.31,otherEar,earY,otherColor,1.15,true);dot(leftEar,earY,3,white,oi);dot(rightEar,earY,3,white,od);
    const ey=y+136;text(attended==='OI'?'OI · FOCO':'OI · COMPETIDOR',lx,ey,7.1,true,attended==='OI'?oi:muted,'center');text(attended==='OD'?'OD · FOCO':'OD · COMPETIDOR',rx,ey,7.1,true,attended==='OD'?od:muted,'center');
    text('LB '+fmt(mGain.base)+' / AF '+fmt(mGain.focused),targetX,ey+13,7.4,true,targetColor,'center');text('Aciertos '+signed(mGain.delta)+' pp',targetX,ey+25,7.4,true,targetColor,'center');
    text('LB '+fmt(mSuppress.base)+' / AF '+fmt(mSuppress.focused),otherX,ey+13,7.4,true,otherColor,'center');text('Intrusiones '+signed(-mSuppress.delta)+' pp',otherX,ey+25,7.4,true,otherColor,'center');
    rect(x+13,y+h-28,w-26,18,white);text('Selectividad acierto - intrusión: '+signed(focus.selectivity)+' pp',x+w/2,y+h-15,7.8,true,ink,'center');
  }
  function loadPanel(x,y,w,h,title,facKey,supKey,facColor,supColor){
    rect(x,y,w,h,'#f8fafb',line);text(title,x+13,y+20,11,true);dot(x+15,y+38,3,facColor);text('Facilitación del oído atendido',x+23,y+41,7.3,false,muted);dot(x+w/2+5,y+38,3,supColor);text('Supresión del oído competidor',x+w/2+13,y+41,7.3,false,muted);
    const left=x+88,right=x+w-18,zero=(left+right)/2,scale=(right-left)/200;stroke(zero,y+53,zero,y+h-17,ink,.8);text('-100',left,y+54,6.8,false,muted,'center');text('0',zero,y+54,6.8,false,muted,'center');text('+100 pp',right,y+54,6.8,false,muted,'center');
    d.load.forEach((row,i)=>{const yy=y+76+i*34;text(row.pairs+' '+(row.pairs===1?'par':'pares'),x+13,yy+8,8.4,true);[[row[facKey],facColor,-4],[row[supKey],supColor,7]].forEach(([v,c,off])=>{const start=v>=0?zero:zero+v*scale,wv=Math.abs(v*scale);rect(start,yy+off,wv,8,c);text(signed(v),v>=0?Math.min(right,start+wv+4):Math.max(left,start-4),yy+off+7,7,true,c,v>=0?'left':'right');});});
  }
  const byKey=Object.fromEntries(d.measures.map(m=>[m.key,m]));
  header('TDD / INFORME 04');text('Perfil integrado de modulación',branded?M+86:M,82,23,true);text('Atención dividida y focalizada por oído',branded?M+86:M,102,10,false,muted);rect(M,126,CW,2,accent);
  rect(M,143,CW,58,soft);text('PARTICIPANTE',M+12,158,7.2,true,muted);text(participantName,M+12,177,12,true);text('ID: '+(d.patient||'—')+'  ·  Edad: '+(d.age===null?'No consta':d.age+' años')+'  ·  Lateralidad: '+(d.hand||'No consta'),M+12,192,8,false,muted);text('FECHA',W-M-112,158,7.2,true,muted);text(d.date||'No consta',W-M-112,177,10,true);text(d.intensity===null?'Intensidad no consignada':d.intensity+' dB nHL · OD/OI',W-M-112,192,7.5,false,muted);
  const conditionCards=[['01 · ATENCIÓN DIVIDIDA','OD '+fmt(d.baseline.od)+' %  ·  OI '+fmt(d.baseline.oi)+' %','IL '+signed(d.baseline.il),accent],['02 · FOCO OD','Aciertos OD '+fmt(d.focusRight.hit)+' %','Intrusiones OI '+fmt(d.focusRight.intrusion)+' %',od],['03 · FOCO OI','Aciertos OI '+fmt(d.focusLeft.hit)+' %','Intrusiones OD '+fmt(d.focusLeft.intrusion)+' %',oi]];
  conditionCards.forEach((c,i)=>{const gap=9,w=(CW-gap*2)/3,x=M+i*(w+gap);rect(x,218,w,73,'#f8fafb',line);rect(x,218,w,3,c[3]);text(c[0],x+11,237,7.2,true,muted);text(c[1],x+11,258,10,true,c[3]);text(c[2],x+11,277,8.4,false,ink);});
  text('01',M,318,9,true,accent);text('Cambio respecto a la línea base',M+23,318,14,true);text('Puntos porcentuales e índice simétrico descriptivo',M,335,8.2,false,muted);
  d.measures.forEach((m,i)=>{const gap=8,w=(CW-gap*3)/4,x=M+i*(w+gap),c=m.ear==='OD'?od:oi;rect(x,350,w,73,soft);rect(x,350,w,2,c);text(m.label.toUpperCase(),x+9,367,7.2,true,c);text(signed(m.delta)+' pp',x+9,393,18,true,c);text('Índice '+signed(m.index),x+9,411,7.8,false,muted);});
  text('02',M,451,9,true,accent);text('Esquema funcional de la modulación',M+23,451,14,true);text('Las flechas representan dirección atencional y cambio de puntuación, no localización anatómica.',M,468,8.2,false,muted);
  brainPanel(M,482,(CW-12)/2,216,'Atención focalizada en OD','OD',byKey.gainOd,byKey.suppressOi,d.focusRight);brainPanel(M+(CW-12)/2+12,482,(CW-12)/2,216,'Atención focalizada en OI','OI',byKey.gainOi,byKey.suppressOd,d.focusLeft);
  rect(M,715,CW,63,'#edf7f7');text('LECTURA DESCRIPTIVA',M+12,731,7.2,true,accent);const summary='Al dirigir la atención a OD, los aciertos OD cambiaron '+signed(byKey.gainOd.delta)+' pp y las intrusiones OI '+signed(-byKey.suppressOi.delta)+' pp. Al dirigirla a OI, los aciertos OI cambiaron '+signed(byKey.gainOi.delta)+' pp y las intrusiones OD '+signed(-byKey.suppressOd.delta)+' pp.';wrap(summary,CW-24,8.4).slice(0,3).forEach((s,i)=>text(s,M+12,746+i*11,8.4));footer(1);

  out=[];pages.push(out);header('TDD / INFORME 04');text('Carga auditiva y trazabilidad',branded?M+86:M,82,23,true);text('Cambios por dificultad, tabla completa y límites de interpretación',branded?M+86:M,102,10,false,muted);rect(M,126,CW,2,accent);
  text('03',M,155,9,true,accent);text('Efecto de carga',M+23,155,14,true);text('Cambio en puntos porcentuales frente a la misma dificultad de la atención dividida.',M,172,8.2,false,muted);
  loadPanel(M,190,CW,158,'Atención focalizada en OD','gainOd','suppressOi',od,oi);loadPanel(M,363,CW,158,'Atención focalizada en OI','gainOi','suppressOd',oi,od);
  text('04',M,548,9,true,accent);text('Trazabilidad de los cuatro índices',M+23,548,14,true);
  const cols=[M,M+190,M+278,M+367,W-M];text('MEDIDA',cols[0],570,7.2,true,muted);text('LÍNEA BASE',cols[1],570,7.2,true,muted,'right');text('FOCALIZADA',cols[2],570,7.2,true,muted,'right');text('CAMBIO PP',cols[3],570,7.2,true,muted,'right');text('ÍNDICE',cols[4],570,7.2,true,muted,'right');stroke(M,578,W-M,578);
  d.measures.forEach((m,i)=>{const y=596+i*22,c=m.ear==='OD'?od:oi;if(i%2===0)rect(M-4,y-13,CW+8,21,'#f7f9fa');dot(M+2,y-3,2.8,c);text(m.label,M+11,y,8.7,true,c);text(fmt(m.base)+' %',cols[1],y,8.7,false,ink,'right');text(fmt(m.focused)+' %',cols[2],y,8.7,false,ink,'right');text(signed(m.delta),cols[3],y,8.7,true,c,'right');text(signed(m.index),cols[4],y,8.7,true,c,'right');});
  text('Índice = 100 × (AF - LB) / (AF + LB). Para supresión se invierte el signo, de modo que un valor positivo indique reducción de intrusiones.',M,684,7.2,false,muted);
  const errors=d.otherErrors.map(v=>v===null?'no registrado':String(v));text('Respuestas ajenas al estímulo: Lista 1 '+errors[0]+'  ·  Lista 2 '+errors[1]+'  ·  Lista 3 '+errors[2]+'.',M,698,7.4,false,muted);
  rect(M,714,CW,65,soft);text('INTERPRETACIÓN Y LÍMITES',M+12,730,7.2,true,accent);const limits=[d.quality,'Comparación intraindividual descriptiva: no dispone de percentiles ni puntos de corte para atención focalizada.','No diagnostica por sí sola un trastorno atencional, una alteración hemisférica ni la lateralización del lenguaje.'];limits.forEach((s,i)=>text('• '+s,M+12,745+i*11,7.8,false,i===0?ink:muted));text('Marco experimental: Gadea y Espert (2009); ASI: Asbjørnsen y Bryden (1998). Este informe no calcula el ASI. Referencia TDD: Zenker et al. (2007, 2008).',M,791,6.6,false,muted);footer(2);
  if(preview)return svg.map((lines,i)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" font-family="Arial,Helvetica,sans-serif" role="img" aria-label="Informe 04, página '+(i+1)+'"><rect width="'+W+'" height="'+H+'" fill="white"/>'+lines.join('')+'</svg>').join('');
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
  if(branded){const mask=PDF_LOGO.alpha+'>',rgb=PDF_LOGO.rgb+'>';objects.push('<< /Type /XObject /Subtype /Image /Width '+PDF_LOGO.width+' /Height '+PDF_LOGO.height+' /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter [/ASCIIHexDecode /FlateDecode] /Length '+mask.length+' >>\nstream\n'+mask+'\nendstream');objects.push('<< /Type /XObject /Subtype /Image /Width '+PDF_LOGO.width+' /Height '+PDF_LOGO.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask 5 0 R /Filter [/ASCIIHexDecode /FlateDecode] /Length '+rgb.length+' >>\nstream\n'+rgb+'\nendstream');}
  const brainJpeg=atob(BRAIN_IMAGE.base64),brainId=objects.length+1,brainSpace=BRAIN_IMAGE.components===1?'/DeviceGray':'/DeviceRGB';objects.push('<< /Type /XObject /Subtype /Image /Width '+BRAIN_IMAGE.width+' /Height '+BRAIN_IMAGE.height+' /ColorSpace '+brainSpace+' /BitsPerComponent 8 /Filter /DCTDecode /Length '+brainJpeg.length+' >>\nstream\n'+brainJpeg+'\nendstream');
  const kids=[];pages.forEach(p=>{const pageId=objects.length+1,streamId=pageId+1,stream=p.join('\n');kids.push(pageId+' 0 R');const xObject=' /XObject << '+(branded?'/Logo 6 0 R ':'')+'/Brain '+brainId+' 0 R >>';objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>'+xObject+' >> /Contents '+streamId+' 0 R >>');objects.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');});objects[1]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
  let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((s,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+s+'\nendobj\n';});const offset=pdf.length;pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+offset+'\n%%EOF';return Array.from(pdf,c=>c.charCodeAt(0));
}

const TDD_PDF_WIDTHS = [[761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,761,222,556,333,1000,556,556,333,1000,667,333,1000,761,611,761,761,222,222,333,333,350,556,1000,333,1000,500,333,944,761,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500],[761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,761,278,556,500,1000,556,556,333,1000,667,333,1000,761,611,761,761,278,278,500,500,350,556,1000,333,1000,556,333,944,761,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556]];

export { buildClinicalPdf_, buildIntegratedPdf_, clinicalAge_, clinicalNorm_, clinicalPercentile_, TDD_NORMS };
