// Two-dimensional math boxes in em units, projected onto an annular baseline.
// y is positive down (toward the seal centre), x follows the reading direction.
import {displayNumber,fractionParts} from './number-format.js?v=0.15';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={log:'ln',asin:'arcsin',acos:'arccos',atan:'arctan',sign:'sgn',asinh:'arsinh',acosh:'arcosh',atanh:'artanh'};
const width=c=>c===' '? .28:'il1|'.includes(c)?.32:'()[]'.includes(c)?.39:'−+=·'.includes(c)?.66:'.'.includes(c)?.27:.58;
const box=(w,top,bottom,items)=>({w,top,bottom,items});
function text(s,italic=false){
 let w=0;const items=[];
 for(const c of String(s)){const a=width(c);if(c!==' ')items.push({type:'glyph',x:w+a/2,y:0,w:a,size:1,text:c,italic});w+=a;}
 return box(w,.79,.23,items);
}
function place(b,x=0,y=0,k=1){
 return b.items.map(i=>i.type==='glyph'?{...i,x:x+i.x*k,y:y+i.y*k,w:i.w*k,size:i.size*k}:{...i,points:i.points.map(([u,v])=>[x+u*k,y+v*k]),stroke:i.stroke*k});
}
function row(...bs){
 let w=0,top=0,bottom=0,items=[];
 for(const b of bs){items.push(...place(b,w));w+=b.w;top=Math.max(top,b.top);bottom=Math.max(bottom,b.bottom);}
 return box(w,top,bottom,items);
}
function bracket(b,left='(',right=')'){
 const k=Math.max(1,(b.top+b.bottom)/1.02), y=(b.bottom-b.top)/2+.28*k;
 const l=text(left),r=text(right),w=l.w*k+b.w+r.w*k;
 return box(w,Math.max(b.top,l.top*k-y),Math.max(b.bottom,l.bottom*k+y),[...place(l,0,y,k),...place(b,l.w*k),...place(r,l.w*k+b.w,y,k)]);
}
function fraction(a,b){
 const k=.88,w=Math.max(a.w,b.w)*k+.24,line=-.23;
 const ay=line-.15-a.bottom*k,by=line+.15+b.top*k;
 return box(w,Math.max(-ay+a.top*k,.3),Math.max(by+b.bottom*k,0),[
  ...place(a,(w-a.w*k)/2,ay,k),{type:'fraction',points:[[.035,line],[w-.035,line]],stroke:.055},...place(b,(w-b.w*k)/2,by,k)]);
}
function power(a,b){
 const k=.69,y=-a.top+.14-b.bottom*k;
 return box(a.w+b.w*k+.06,Math.max(a.top,-y+b.top*k),Math.max(a.bottom,y+b.bottom*k),[...place(a),...place(b,a.w+.06,y,k)]);
}
function radical(b){
 const top=b.top+.13,w=b.w+.65;
 return box(w,top,b.bottom,[...place(b,.59),{type:'radical',points:[[.02,-.06],[.16,-.12],[.31,b.bottom],[.5,-top],[w,-top]],stroke:.055}]);
}
function number(v){
 if(!Number.isFinite(v))return text('?');
 const f=fractionParts(v);
 if(f&&f.q!==1)return row(...(f.p<0?[text('−')]:[]),fraction(text(Math.abs(f.p)),text(f.q)));
 return text(displayNumber(v).replace(/-/g,'−'));
}
function negative(e){
 if(e?.t==='n'&&e.v<0)return {t:'n',v:-e.v};
 if(e?.t==='m'&&e.v[0]?.t==='n'&&e.v[0].v<0){const a=e.v[0].v===-1?e.v.slice(1):[{t:'n',v:-e.v[0].v},...e.v.slice(1)];return a.length===1?a[0]:{t:'m',v:a};}
 return null;
}
export function mathBox(e){
 let budget=500;
 function walk(v,d=0){
  if(!v||d>30||--budget<0)return text('…');
  const next=x=>walk(x,d+1);
  const group=x=>['a','complex'].includes(x?.t)?bracket(next(x)):next(x);
  const product=vs=>row(...vs.flatMap((x,i)=>i?[text(' '),group(x)]:[group(x)]));
  switch(v.t){
   case 'x':return text('x',true);
   case 'n':return number(v.v);
   case 'a':return row(...v.v.slice(0,80).flatMap((x,i)=>{const neg=negative(x);return i?[text(neg?' − ':' + '),next(neg||x)]:[next(x)];}),...(v.v.length>80?[text('…')]:[]));
   case 'm':{
    const neg=negative(v);if(neg)return row(text('−'),next(neg));
    const a=[],b=[];
    for(const x of v.v.slice(0,80)){
     if(x.t==='p'&&x.e<0)b.push(x.e===-1?x.b:{...x,e:-x.e});
     else if(x.t==='n'){const f=fractionParts(x.v);if(f&&f.q!==1){if(f.p!==1)a.push({t:'n',v:f.p});b.push({t:'n',v:f.q});}else a.push(x);}
     else a.push(x);
    }
    const numerator=a.length?product(a):text('1');
    return row(b.length?fraction(numerator,product(b)):numerator,...(v.v.length>80?[text('…')]:[]));
   }
   case 'p':{
    if(v.e===1)return next(v.b);
    if(v.e<0)return fraction(text('1'),next(v.e===-1?v.b:{...v,e:-v.e}));
    if(v.e===.5)return radical(next(v.b));
    const b=['x','f'].includes(v.b.t)||v.b.t==='n'&&v.b.v>=0&&Number.isInteger(v.b.v)?next(v.b):bracket(next(v.b));
    return power(b,number(v.e));
   }
   case 'f':{
    const a=next(v.arg);
    if(v.f==='exp')return power(text('e',true),a);
    if(v.f==='sqrt')return radical(a);
    if(v.f==='abs')return bracket(a,'|','|');
    if(v.f==='logabs')return row(text('ln'),bracket(a,'|','|'));
    const ell=/^Elliptic([EF])(Sin|Cos)(?::(.+))?$/.exec(v.f);
    if(ell)return row(text(ell[1]),bracket(row(fraction(a,text('2')),...(ell[2]==='Sin'?[text('−'),fraction(text('π'),text('4'))]:[]),text(' | '),number(ell[3]===undefined?2:Number(ell[3])))));
    return row(text(names[v.f]||v.f),bracket(a));
   }
   case 'complex':return row(...(v.re?.t==='n'&&v.re.v===0?[]:[next(v.re),text(' + ')]),text('i',true),bracket(next(v.im)));
   case 'D':{const k=v.order||1;return row(fraction(k===1?text('d'):power(text('d'),number(k)),row(text('d'),k===1?text('x',true):power(text('x',true),number(k)))),bracket(next(v.arg)));}
   case 'I':return row(text('∫'),next(v.arg),text(' dx'));
   case 'L':return row(text(v.kind==='sup'?'limsup':v.kind==='inf'?'liminf':'lim'),bracket(next(v.arg)));
   default:return text('?');
  }
 }
 return walk(e);
}
export function annularLayout(e){
 let b=mathBox(e),scale=21;
 // Preserve the inner geometry. Allocate radial room for the complete box.
 // For very long expressions choose a larger seal first, then shrink the ink;
 // full unabridged KaTeX is still available in the inspection dialog.
 function dims(){
  const r=43+Math.max(4,b.bottom*scale)+5;
  const outer=Math.max(79,r+b.top*scale+6);
  return {r,outer};
 }
 let {r,outer}=dims();
 for(let i=0;i<12;i++){
  const k=Math.min(1,124/outer,4.55*r/Math.max(1,b.w*scale));
  if(k>.995)break;
  scale*=k*.97;({r,outer}=dims());
 }
 const fractional=b.items.some(i=>i.type==='fraction');
 // Fractions always have an additional boundary outside the core.
 if(fractional)outer=Math.max(97,outer);
 if(scale<5){
  // Never present half a fraction as a valid equation. Keep the ellipsis
  // explicit and direct the player to the full equation on tap.
  b=text('…');scale=21;r=59;outer=fractional?97:79;
 }
 return {b,scale,r,outer,fractional};
}
export function curvedMath(e){
 const layout=annularLayout(e),{b,scale,r,outer,fractional}=layout;
 const angle=x=>((x-b.w/2)*scale/r);
 const point=(x,y)=>{const a=angle(x),rr=r-y*scale;return [rr*Math.sin(a),-rr*Math.cos(a)];};
 const fmt=x=>Number(x.toFixed(3));
 const pair=p=>p.map(fmt).join(' ');
 const items=b.items.map(i=>{
  if(i.type==='glyph'){
   const [x,y]=point(i.x,i.y),a=angle(i.x)*180/Math.PI;
   return '<text class="inscription math-glyph" x="'+fmt(x)+'" y="'+fmt(y)+'" transform="rotate('+fmt(a)+' '+fmt(x)+' '+fmt(y)+')" text-anchor="middle" font-size="'+fmt(i.size*scale)+'"'+(i.italic?' font-style="italic"':'')+'>'+esc(i.text)+'</text>';
  }
  let d='';
  if(i.type==='fraction'){
   const [a,z]=i.points,rr=r-a[1]*scale;
   d='M'+pair(point(...a))+' A'+fmt(rr)+' '+fmt(rr)+' 0 '+(angle(z[0])-angle(a[0])>Math.PI?1:0)+' 1 '+pair(point(...z));
  }else d=i.points.map((p,j)=>(j?'L':'M')+pair(point(...p))).join(' ');
  return '<path class="math-rule '+(i.type==='fraction'?'fraction-rule':'radical-rule')+'" d="'+d+'" fill="none" stroke-width="'+fmt(i.stroke*scale)+'"/>';
 }).join('');
 return {outer,r,fractional,markup:'<g class="annular-math">'+items+'</g>'};
}
