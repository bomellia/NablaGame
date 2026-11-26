// Pure presentation: the seal is a deterministic drawing of the AST, not a game statistic.
import {displayNumber} from './number-format.js?v=0.15';
import {graphMotif} from './seal-graph.js?v=0.32';
// Visual substitution, not historical transliteration. Keep Latin letters
// when no rune has a recognizable shape; never conflate different letters.
const glyphs=Object.freeze({"A":"A","B":"ᛒ","C":"C","D":"D","E":"E","F":"ᚠ","G":"G","H":"ᚺ","I":"ᛁ","J":"J","K":"K","L":"L","M":"ᛗ","N":"N","O":"ᛜ","P":"ᚹ","Q":"Q","R":"ᚱ","S":"ᛋ","T":"T","U":"U","V":"V","W":"W","X":"ᚷ","Y":"ᛉ","Z":"Z"});
export const rune=s=>String(s).toUpperCase().replace(/[A-Z]/g,c=>glyphs[c]);
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sup={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻'};
export function profile(e){
 let count=0,depth=0,functions=0,powers=0,branches=0,hash=2166136261;
 const stack=[[e,1]];
 while(stack.length&&count<2000){
  const [v,d]=stack.pop();if(!v||typeof v!=='object')continue;
  count++;depth=Math.max(depth,d);functions+=v.t==='f';powers+=v.t==='p';branches+=v.t==='a'||v.t==='m'||v.t==='complex';
  const tag=v.t+(v.f||'')+(v.e??'')+(v.v instanceof Array?'':v.v??'');
  for(const c of tag)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  for(const k of ['arg','b','re','im'])if(v[k])stack.push([v[k],d+1]);
  if(Array.isArray(v.v))for(const child of v.v)stack.push([child,d+1]);
 }
 const level=Math.min(5,1+Math.floor(Math.log2(Math.max(1,count)))+Math.floor((depth-1)/4));
 return {count,depth,functions,powers,branches,hash,level,sides:Math.min(10,3+level+(branches%2))};
}
export function inscription(e,max=170){
 let remaining=180;
 const group=(v,d)=>['a','m','complex'].includes(v?.t)?'('+walk(v,d)+')':walk(v,d);
 function walk(v,d=0){
  if(!v||d>24||--remaining<0)return '…';
  switch(v.t){
   case 'preview':return '…';
   case 'x':return 'x';
   case 'n':return Number.isFinite(v.v)?displayNumber(v.v).replace(/-/g,'−'):'?';
   case 'a':return v.v.slice(0,50).map(z=>walk(z,d+1)).join(' + ').replace(/\+ −/g,'− ')+(v.v.length>50?' …':'');
   case 'm':return v.v.slice(0,50).map(z=>group(z,d+1)).join('·')+(v.v.length>50?' …':'');
   case 'p':{const b=group(v.b,d+1),k=String(v.e);return /^-?\d+$/.test(k)?b+Array.from(k,c=>sup[c]).join(''):b+'^('+displayNumber(v.e)+')';}
   case 'f':{const a=walk(v.arg,d+1);if(v.f==='exp')return 'e^('+a+')';if(v.f==='sqrt')return '√('+a+')';if(v.f==='abs')return '|'+a+'|';if(v.f==='logabs')return 'ln|'+a+'|';return ({log:'ln',asin:'arcsin',acos:'arccos',atan:'arctan',sign:'sgn'}[v.f]||v.f)+'('+a+')';}
   case 'complex':return walk(v.re,d+1)+' + i('+walk(v.im,d+1)+')';
   case 'D':return 'D('+walk(v.arg,d+1)+')';
   case 'I':return '∫('+walk(v.arg,d+1)+')dx';
   case 'L':return 'lim('+walk(v.arg,d+1)+')';
   default:return '?';
  }
 }
 const full=walk(e);return full.length>max?full.slice(0,max-1)+'…':full;
}
const pt=(r,a)=>[+(r*Math.cos(a*Math.PI/180)).toFixed(3),+(r*Math.sin(a*Math.PI/180)).toFixed(3)];
const polygon=(r,n,offset=-90,step=1)=>Array.from({length:n},(_,i)=>pt(r,offset+i*360*step/n).join(',')).join(' ');
// Fixed outer radius; geometry describes the expression, never its strength.
export function sealFamily(e){
 if(e.t==='n')return 'constant';
 if(e.t==='p')return e.e<0?'reciprocal':e.e%1?'radical':'power';
 if(e.t==='a')return 'sum';
 if(e.t==='m')return e.v.some(t=>t.t==='p'&&t.e<0)?'reciprocal':'product';
 if(e.t==='complex')return 'complex';
 if(e.t==='f'){
  if(/^(sin|cos|tan|cot|sec|csc|sinh|cosh|tanh)$/.test(e.f))return 'wave';
  if(e.f==='exp')return 'exponential';
  if(e.f==='log'||e.f==='logabs')return 'logarithm';
  if(e.f==='sqrt')return 'radical';
  if(/^(a(sin|cos|tan|sinh|cosh|tanh)|arcsin|arccos|arctan)$/.test(e.f))return 'inverse';
  return 'special';
 }
 return 'variable';
}
export function sealSize(){return 1;}
export function sealMarkup(e,id='seal'){
 const p=profile(e),family=sealFamily(e),graph=graphMotif(e),rim=79,lines=[];
 const circle=(r,cls='seal-line',x=0,y=0)=>lines.push('<circle cx="'+x+'" cy="'+y+'" r="'+r+'" class="'+cls+'"/>');
 const poly=(r,n,a=-90,step=1,cls='seal-geometry')=>lines.push('<polygon points="'+polygon(r,n,a,step)+'" class="'+cls+'"/>');
 const path=(points,cls='seal-geometry')=>lines.push('<path d="'+points.map((a,i)=>(i?'L':'M')+a.join(' ')).join(' ')+'" class="'+cls+'"/>');
 const dot=(r,a,s=1.6)=>{const [x,y]=pt(r,a);lines.push('<circle cx="'+x+'" cy="'+y+'" r="'+s+'" class="seal-dot"/>');};
 const petals=(n,r=27,ry=31,rx=15,phase=0)=>{for(let j=0;j<n;j++)lines.push('<ellipse cx="0" cy="'+(-r)+'" rx="'+rx+'" ry="'+ry+'" transform="rotate('+(phase+360*j/n)+')" class="seal-geometry"/>');};
 const spiral=(turns,phase=0)=>path(Array.from({length:97},(_,i)=>pt(8+49*i/96,phase+turns*360*i/96)),'seal-geometry');
 circle(rim,'seal-rim');circle(74);circle(68,'seal-guide');
 // Retain an abstract seal when a reliable real sample is unavailable.
 if(!graph.curves.length){
 switch(family){
 case 'constant':
  circle(53);poly(37,4);poly(22,4,0,1,'seal-geometry fine');break;
 case 'variable':
  poly(56,3);circle(29);poly(18,3,90);break;
 case 'power':{
  const n=3+Math.min(5,Math.max(0,Math.round(Math.abs(e.e))-1));
  poly(57,n);poly(47,n,-90+180/n);circle(23);
  for(let i=0;i<n;i++)dot(57,-90+360*i/n);break;}
 case 'wave':{
  const offset=e.f.startsWith('cos')?30:e.f.startsWith('tan')?60:0;
  petals(e.f.startsWith('tan')?4:3,24,32,19,offset);circle(56);
  poly(49,3,-90+offset,1,'seal-geometry fine');break;}
 case 'exponential':
  spiral(1.4,-90);spiral(1.4,90);poly(58,4);poly(58,4,-45,1,'seal-geometry fine');break;
 case 'logarithm':
  for(let i=0;i<3;i++)circle(30,'seal-geometry',...pt(23,-90+i*120));
  circle(55);poly(31,3,90,1,'seal-geometry fine');break;
 case 'radical':
  poly(59,4);poly(48,3,90);circle(26);path([[-34,0],[-19,0],[-9,23],[10,-32],[33,-32]]);break;
 case 'reciprocal':
  circle(56);poly(53,4,0);poly(53,4,-45);path([[-56,0],[56,0]]);circle(21);break;
 case 'inverse':
  petals(4,21,32,15,45);poly(57,4,0);circle(29);break;
 case 'sum':
  poly(58,6, -90,2);poly(58,3,90);circle(33);poly(28,6);break;
 case 'product':
  poly(58,4);poly(58,4,-45);poly(40,4,-22.5);circle(21);break;
 case 'complex':
  circle(35,'seal-geometry',-22,0);circle(35,'seal-geometry',22,0);
  poly(58,4);path([[0,-56],[0,56]],'seal-geometry fine');break;
 default:
  poly(58,7,-90,2);circle(41);poly(27,7,-90,3,'seal-geometry fine');
 }
 // Complexity changes internal density, ticks and secondary motifs; all
 // decorations stay inside the same outer ring.
 if(p.level>=3)circle(63,'seal-geometry fine');
 if(p.level>=4)poly(37,p.sides,-90+(p.hash%12)*5,1,'seal-geometry fine');
 if(p.level>=5)poly(19,5,-90,2,'seal-geometry fine');
 }else{
  // Open central area for the function; frame and guides remain secondary.
  poly(64,8,-90,1,'seal-graph-frame');
  if(p.level>=3)circle(64,'seal-graph-frame');
  path([[-54,0],[54,0]],'seal-graph-axis');
  path([[0,-54],[0,54]],'seal-graph-axis');
  for(const k of [-30,-15,15,30]){path([[k,-2],[k,2]],'seal-graph-axis');path([[-2,k],[2,k]],'seal-graph-axis');}
 }
 const ticks=12+4*p.level;
 for(let i=0;i<ticks;i++){
  const a=i*360/ticks;path([pt(i%4===0?69:72,a),pt(78,a)],'seal-line');
 }
 for(let i=0;i<4;i++)dot(65,-90+i*90+(p.hash%4)*11.25,1.45);
 if(!graph.curves.length)lines.push('<path d="M0 -6 L2 0 0 6 -2 0Z M-6 0L0 -2 6 0 0 2Z" class="seal-dot"/>');
 // Last strokes: graphs erase first and are drawn after the ornamental frame.
 for(const curve of graph.curves)lines.push('<path d="'+curve.d+'" class="seal-graph '+(curve.kind==='imag'?'graph-imag':'graph-real')+'"/>');
 return '<svg viewBox="-84 -84 168 168" class="sigil level-'+p.level+'" data-family="'+family+'" data-graph="'+graph.mode+'" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+lines.join('')+'</svg>';
}
export function logRune(s){
 return escape(String(s).replace(/あなた/g,'P').replace(/COM/g,'C').replace(/の場に/g,' → ').replace(/を基底に追加/g,' '+rune('INSCRIBE')).replace(/場全体を/g,rune('FIELD')+' ').replace(/階微分/g,' D').replace(/基底(\d+)個消滅/g,(_,n)=>'−'+n+' '+rune('BREAK')).replace(/カードを(\d+)枚交換（ターン消費）/g,(_,n)=>rune('SWAP')+' '+n).replace(/追加の演算を行わずターン終了/g,rune('END')).replace(/投了しました。/g,rune('YIELD')).replace(/[一-龯ぁ-ゖァ-ヺ]+/g,rune('RITE')).replace(/：/g,':').replace(/（/g,' (').replace(/）/g,')'));
}
