/* Domain-forgetting normalization: a game rule deliberately identifies x/x with 1,
   including at removed points. No singularity history is retained. */
import * as b from './symbolic.js?v=0.9';
const EPS=1e-9, MAX_DEG=12;
const n=b.constant, x=b.x;
const approx=(a,z=0)=>Math.abs(a-z)<EPS;
const trim=p=>{let q=[...p];while(q.length>1&&approx(q.at(-1)))q.pop();return q.map(v=>approx(v)?0:+v.toPrecision(12));};
const plus=(a,c)=>trim(Array.from({length:Math.max(a.length,c.length)},(_,i)=>(a[i]||0)+(c[i]||0)));
const negative=a=>a.map(v=>-v);
const times=(a,c)=>{if(a.length+c.length-2>MAX_DEG)return null;const q=Array(a.length+c.length-1).fill(0);a.forEach((v,i)=>c.forEach((w,j)=>q[i+j]+=v*w));return trim(q);};
const scale=(a,k)=>trim(a.map(v=>v*k));
const degree=p=>trim(p).length-1;
function division(a,c){let r=trim(a),q=Array(Math.max(1,r.length-c.length+1)).fill(0),d=degree(c);if(approx(c[d]))return null;let count=0;while(degree(r)>=d&&(!approx(r[0])||degree(r)>0)&&count++<32){const shift=degree(r)-d,ratio=r.at(-1)/c.at(-1);q[shift]+=ratio;r=plus(r,negative([...(Array(shift).fill(0)),...scale(c,ratio)]));if(r.length===1&&approx(r[0]))break;}return {quotient:trim(q),remainder:trim(r)};}
function gcd(a,c){let p=trim(a),q=trim(c),loops=0;while(!(q.length===1&&approx(q[0]))&&loops++<26){const d=division(p,q);if(!d)return [1];p=q;q=d.remainder;}const leading=p.at(-1);return approx(leading)?[1]:scale(p,1/leading);}
const rat=(p,q)=>({p:trim(p),q:trim(q)});
function rational(e,depth=0){if(depth>15)return null;switch(e.t){
 case 'n':return rat([e.v],[1]);case 'x':return rat([0,1],[1]);
 case 'a':{let acc=rat([0],[1]);for(const t of e.v){const v=rational(t,depth+1);if(!v)return null;const p=times(acc.p,v.q),q=times(v.p,acc.q),d=times(acc.q,v.q);if(!p||!q||!d)return null;acc=rat(plus(p,q),d);}return acc;}
 case 'm':{let acc=rat([1],[1]);for(const t of e.v){const v=rational(t,depth+1);if(!v)return null;const p=times(acc.p,v.p),q=times(acc.q,v.q);if(!p||!q)return null;acc=rat(p,q);}return acc;}
 case 'p':{if(!Number.isInteger(e.e)||Math.abs(e.e)>8)return null;const base=rational(e.b,depth+1);if(!base)return null;let v=rat([1],[1]);for(let i=0;i<Math.abs(e.e);i++){const p=times(v.p,base.p),q=times(v.q,base.q);if(!p||!q)return null;v=rat(p,q);}return e.e>=0?v:rat(v.q,v.p);}
 default:return null;
}}
const toPolynomial=p=>{
 const terms=[];for(let i=p.length-1;i>=0;i--){const v=p[i];if(approx(v))continue;terms.push(i===0?n(v):b.mul(n(v),i===1?x():b.pow(x(),i)));}
 return terms.length?b.add(...terms):n(0);
};
export function rationalNormalize(e){
 const r=rational(e);if(!r)return e;
 if(r.q.length===1&&approx(r.q[0],1))return e; // A polynomial's factored form may be shorter.
 if(r.q.length===1&&approx(r.q[0]))throw new b.Unsupported('恒等的に0で除算できません');
 const g=gcd(r.p,r.q),pdiv=division(r.p,g),qdiv=division(r.q,g);if(!pdiv||!qdiv)return e;
 if(!approx(pdiv.remainder[0])||pdiv.remainder.length!==1||!approx(qdiv.remainder[0])||qdiv.remainder.length!==1)return e;
 const pp=pdiv.quotient,qq=qdiv.quotient,k=qq.at(-1);if(approx(k))return e;
 const top=toPolynomial(scale(pp,1/k)),bottom=toPolynomial(scale(qq,1/k));
 if(bottom.t==='n'&&approx(bottom.v,1))return top;
 const reduced=b.mul(top,b.pow(bottom,-1));
 return JSON.stringify(reduced).length+10<JSON.stringify(e).length?reduced:e;
}
const same=(a,c)=>b.sig(a)===b.sig(c);
const trigSquare=e=>e?.t==='p'&&e.e===2&&e.b?.t==='f'&&['sin','cos'].includes(e.b.f)?e.b:null;
function coefficient(e){if(e.t==='m'&&e.v[0]?.t==='n')return [e.v[0].v,b.mul(...e.v.slice(1))];return [1,e];}
export function trigNormalize(expr){
 if(expr.t==='a'){
  const terms=[...expr.v],removed=new Set(),added=[];
  for(let i=0;i<terms.length;i++){
   if(removed.has(i))continue;
   const [c1,a]=coefficient(terms[i]),sq=trigSquare(a);if(!sq)continue;
   for(let j=i+1;j<terms.length;j++){
    if(removed.has(j))continue;
    const [c2,z]=coefficient(terms[j]),s2=trigSquare(z);
    if(s2&&sq.f!==s2.f&&same(sq.arg,s2.arg)&&approx(c1,c2)){
     removed.add(i);removed.add(j);added.push(n(c1));break;
    }
   }
  }
  if(removed.size)return b.add(...terms.filter((_,i)=>!removed.has(i)),...added);
 }
 if(expr.t==='m'){
  const terms=[...expr.v];let changed=false;
  for(let i=0;i<terms.length;i++){
   const a=terms[i];if(a?.t!=='f')continue;
   for(let j=i+1;j<terms.length;j++){
    const z=terms[j];if(z?.t!=='f'||!same(a.arg,z.arg))continue;
    const match={ 'sin:csc':n(1),'cos:sec':n(1),'tan:cot':n(1),
      'tan:cos':b.fn('sin',a.arg),'cot:sin':b.fn('cos',a.arg)};
    const key=[a.f,z.f].sort().join(':');
    // Both orientations are considered.
    const value=match[key]||match[`${a.f}:${z.f}`]||match[`${z.f}:${a.f}`];
    if(value){terms[i]=value;terms.splice(j,1);changed=true;break;}
   }
   if(changed)break;
  }
  if(changed)return b.mul(...terms);
 }
 return expr;
}
/** Canonical descending-degree order for rendering; preserve canonical AST keys. */
export function orderedTerms(terms){
 const weight=e=>{const [coef,t]=coefficient(e);void coef;
  if(t?.t==='n')return [-Infinity,0];
  const p=rational(t);if(p&&p.q.length===1&&approx(p.q[0],1))return [degree(p.p),0];
  if(t?.t==='m'){
   const mon=t.v.filter(a=>a.t==='x'||a.t==='p'&&a.b.t==='x'&&a.e>0).reduce((s,a)=>s+(a.t==='x'?1:a.e),0);
   return [mon,1];
  }
  return [0,2];
 };
 return [...terms].sort((a,c)=>{const A=weight(a),B=weight(c);return B[0]-A[0]||A[1]-B[1]||b.sig(a).localeCompare(b.sig(c));});
}
