// Pure presentation: the seal is a deterministic drawing of the AST, not a game statistic.
import {displayNumber} from './number-format.js?v=0.15';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const glyphs=Array.from('ᚨᛒᚲᛞᛖᚠᚷᚺᛁᛃᚲᛚᛗᚾᛟᛈᚲᚱᛊᛏᚢᚹᚹᚲᛇᛉ');
export const rune=s=>String(s).toUpperCase().replace(/[A-Z]/g,c=>glyphs[alphabet.indexOf(c)]);
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
function arc(r){const a=pt(r,130),b=pt(r,410);return 'M'+a.join(' ')+' A'+r+' '+r+' 0 1 1 '+b.join(' ');}
export function sealMarkup(e,id='seal'){
 id=String(id).replace(/[^a-zA-Z0-9_-]/g,'_');
 const p=profile(e),math=inscription(e),n=p.sides;
 // Each band carries a continuous segment of the same expression. The
 // reading direction is outer to inner; no duplicate formula in the core.
 const caps=[45,36,27,19],radii=[68,56,44,32],parts=[];
 let rest=math;
 for(let i=0;i<caps.length&&rest;i++){let end=Math.min(rest.length,caps[i]);if(end<rest.length&&i<3){const split=rest.lastIndexOf(' ',end);if(split>Math.floor(end*.65))end=split;}let part=rest.slice(0,end);rest=rest.slice(end).trimStart();if(i===3&&rest)part=part.slice(0,-1)+'…';parts.push(part);}
 const core=parts.length===1?45:Math.max(13,48-10*(parts.length-1));
 const lines=[];
 lines.push('<circle class="seal-rim" r="79"/><circle r="75" class="seal-line"/>');
 for(let i=0;i<parts.length;i++){const r=radii[i],text=parts[i],size=Math.min(14,Math.max(8,Math.floor((r*4.65)/(Math.max(1,text.length)*.62))));lines.push('<circle class="seal-guide" r="'+(r-4)+'"/><path id="'+id+'-arc-'+i+'" d="'+arc(r)+'" fill="none" stroke="none"/><text class="inscription" font-size="'+size+'" text-anchor="middle" '+(text.length>caps[i]*.75?'textLength="'+Math.min(r*4.2,text.length*size*.57)+'" lengthAdjust="spacingAndGlyphs"':'')+'><textPath href="#'+id+'-arc-'+i+'" startOffset="50%">'+escape(text)+'</textPath></text>');}
 lines.push('<circle r="'+core+'" class="seal-line"/><polygon points="'+polygon(core*.86,n)+'" class="seal-geometry"/>');
 if(p.level>=2)lines.push('<polygon points="'+polygon(core*.86,n,-90+180/n)+'" class="seal-geometry fine"/>');
 if(p.functions){const petals=Math.min(6,2+p.functions);for(let j=0;j<petals;j++)lines.push('<ellipse cx="0" cy="'+(-core*.31)+'" rx="'+core*.24+'" ry="'+core*.55+'" transform="rotate('+360*j/petals+')" class="seal-geometry fine"/>');}
 if(p.level>=4)lines.push('<polygon points="'+polygon(core*.61,n,-90,2)+'" class="seal-geometry fine"/>');
 if(p.powers||p.branches)for(let j=0;j<n;j++){const [x,y]=pt(core*.86,-90+j*360/n);lines.push('<circle cx="'+x+'" cy="'+y+'" r="1.5" class="seal-dot"/>');}
 const ticks=12+p.level*4;
 for(let j=0;j<ticks;j++){const a=j*360/ticks, [x,y]=pt(75,a),[u,v]=pt(j%4===0?79:77,a);lines.push('<path d="M'+x+' '+y+'L'+u+' '+v+'" class="seal-line"/>');}
 lines.push('<path d="M0 -6 L2 0 0 6 -2 0Z M-6 0L0 -2 6 0 0 2Z" class="seal-dot"/>');
 return '<svg viewBox="-84 -84 168 168" class="sigil level-'+p.level+'" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+lines.join('')+'</svg>';
}
export function logRune(s){
 return escape(String(s).replace(/あなた/g,'P').replace(/COM/g,'C').replace(/の場に/g,' → ').replace(/を基底に追加/g,' '+rune('INSCRIBE')).replace(/場全体を/g,rune('FIELD')+' ').replace(/階微分/g,' D').replace(/基底(\d+)個消滅/g,(_,n)=>'−'+n+' '+rune('BREAK')).replace(/カードを(\d+)枚交換（ターン消費）/g,(_,n)=>rune('SWAP')+' '+n).replace(/追加の演算を行わずターン終了/g,rune('END')).replace(/投了しました。/g,rune('YIELD')).replace(/[一-龯ぁ-ゖァ-ヺ]+/g,rune('RITE')).replace(/：/g,':').replace(/（/g,' (').replace(/）/g,')'));
}
