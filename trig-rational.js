// Exact rational conversion and certified real-root isolation for periodic
// trigonometric rational expressions. Finite algebraic extrema are rounded
// only after isolation; zero and pole signs are established exactly.
const abs=a=>a<0n?-a:a;
const gcd=(a,b)=>{a=abs(a);b=abs(b);while(b){[a,b]=[b,a%b];}return a;};
const bad=()=>{throw new Error('trig rational computation budget or domain');};
const q=(n,d=1n)=>{if(!d)bad();if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};};
const qa=(a,b)=>q(a.n*b.d+b.n*a.d,a.d*b.d);
const qm=(a,b)=>q(a.n*b.n,a.d*b.d);
const qd=(a,b)=>q(a.n*b.d,a.d*b.n);
const qc=(a,b)=>{const v=a.n*b.d-b.n*a.d;return v<0n?-1:v>0n?1:0;};
const midpoint=(a,b)=>qd(qa(a,b),q(2n));
function numeric(a){
 if(!a.n)return 0;
 const n=abs(a.n),d=a.d,ns=Math.max(0,n.toString(2).length-53),ds=Math.max(0,d.toString(2).length-53);
 return (a.n<0n?-1:1)*Number(n>>BigInt(ns))/Number(d>>BigInt(ds))*2**(ns-ds);
}
function decimal(v){
 if(!Number.isFinite(v))bad();
 const [m,ex='0']=String(v).split('e'),[a,b='']=m.split('.');
 const k=Number(ex)-b.length;
 if(Math.abs(k)>350)bad();
 const n=BigInt(a+b);
 return k>=0?q(n*10n**BigInt(k)):q(n,10n**BigInt(-k));
}
const trim=a=>{while(a.length>1&&!a[a.length-1])a.pop();return a;};
const z=a=>a.length===1&&!a[0];
const lc=a=>a[a.length-1];
const neg=a=>a.map(x=>-x);
const scale=(a,c)=>trim(a.map(x=>x*c));
const content=a=>a.reduce((g,x)=>gcd(g,x),0n);
const prim=a=>{const g=content(a);return g>1n?a.map(x=>x/g):a;};
const check=a=>{if(a.length>65||a.some(x=>abs(x).toString(2).length>8192))bad();return a;};
const add=(a,b)=>check(trim(Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]||0n)+(b[i]||0n))));
function mul(a,b){
 if(z(a)||z(b))return [0n];
 if(a.length+b.length>66)bad();
 const c=Array(a.length+b.length-1).fill(0n);
 for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)c[i+j]+=a[i]*b[j];
 return check(trim(c));
}
const der=a=>trim(a.length<2?[0n]:a.slice(1).map((x,i)=>x*BigInt(i+1)));
function prem(a,b){
 if(z(b))bad();let r=a.slice();const l=abs(lc(b)),s=lc(b)<0n?-1n:1n;
 while(!z(r)&&r.length>=b.length){
  const d=r.length-b.length,k=lc(r)*s;
  r=prim(add(scale(r,l),neg([...Array(d).fill(0n),...scale(b,k)])));
  check(r);
 }return r;
}
function pgcd(a,b){
 a=prim(a);b=prim(b);
 while(!z(b)){[a,b]=[b,prem(a,b)];}
 return lc(a)<0n?neg(a):a;
}
function exactDiv(a,b){
 if(z(b))bad();const out=Array(Math.max(1,a.length-b.length+1)).fill(0n);let r=a.slice();
 while(!z(r)&&r.length>=b.length){
  if(lc(r)%lc(b))bad();
  const k=lc(r)/lc(b),d=r.length-b.length;out[d]=k;
  r=add(r,neg([...Array(d).fill(0n),...scale(b,k)]));
 }
 if(!z(r))bad();return trim(out);
}
function rat(n,d=[1n]){
 if(z(d))bad();if(z(n))return {n:[0n],d:[1n]};
 const g=pgcd(n,d);if(g.length>1){n=exactDiv(n,g);d=exactDiv(d,g);}
 const c=gcd(content(n),content(d));if(c>1n){n=n.map(x=>x/c);d=d.map(x=>x/c);}
 if(lc(d)<0n){n=neg(n);d=neg(d);}
 return {n:check(n),d:check(d)};
}
const ra=(a,b)=>rat(add(mul(a.n,b.d),mul(b.n,a.d)),mul(a.d,b.d));
const rm=(a,b)=>rat(mul(a.n,b.n),mul(a.d,b.d));
const ri=a=>rat(a.d,a.n);
function rp(a,k){
 if(!Number.isSafeInteger(k)||Math.abs(k)>128)bad();
 if(k<0){a=ri(a);k=-k;}
 let r=rat([1n]);while(k){if(k%2)r=rm(r,a);k=Math.floor(k/2);if(k)a=rm(a,a);}return r;
}
const S=rat([0n,2n],[1n,0n,1n]),C=rat([1n,0n,-1n],[1n,0n,1n]);
const names=['sin','cos','tan','cot','sec','csc'];
function phaseParts(e,harmonics){
 if(harmonics&&e.t==='m'){
  const constants=e.v.filter(t=>t.t==='n'),others=e.v.filter(t=>t.t!=='n');
  if(constants.length&&others.length){
   const k=constants.reduce((a,b)=>a*b.v,1);
   if(Number.isSafeInteger(k)&&k!==0&&Math.abs(k)<=32)return {k,base:others.length===1?others[0]:{t:'m',v:others}};
  }
 }
 return {k:1,base:e};
}
function convert(e,harmonics){
 let phase=null;
 const memo=new Map([[0,[rat([0n]),rat([1n])]], [1,[S,C]]]);
 function multiple(k){
  if(memo.has(k))return memo.get(k);
  if(k<0){const [s,c]=multiple(-k);return [rat(neg(s.n),s.d),c];}
  const [a,b]=multiple(Math.floor(k/2)),[c,d]=multiple(Math.ceil(k/2));
  const out=[ra(rm(a,d),rm(b,c)),ra(rm(b,d),rm(rat([-1n]),rm(a,c)))];
  memo.set(k,out);return out;
 }
 function walk(t,depth=0){
  if(depth>100)bad();const rec=x=>walk(x,depth+1);
  if(t.t==='n'){const a=decimal(t.v);return rat([a.n],[a.d]);}
  if(t.t==='a')return t.v.map(rec).reduce(ra,rat([0n]));
  if(t.t==='m')return t.v.map(rec).reduce(rm,rat([1n]));
  if(t.t==='p')return rp(rec(t.b),t.e);
  if(t.t!=='f'||!names.includes(t.f))bad();
  const {k,base}=phaseParts(t.arg,harmonics);
  if(phase&&JSON.stringify(phase)!==JSON.stringify(base))bad();
  phase=base;
  const [s,c]=multiple(k);
  return t.f==='sin'?s:t.f==='cos'?c:t.f==='tan'?rm(s,ri(c)):t.f==='cot'?rm(c,ri(s)):t.f==='sec'?ri(c):ri(s);
 }
 const r=walk(e);return phase?{...r,phase}:null;
}
function signAt(p,x){
 let r=lc(p),d=x.d;
 for(let i=p.length-2;i>=0;i--){r=r*x.n+p[i]*d;d*=x.d;}
 return r<0n?-1:r>0n?1:0;
}
function evalQ(p,x){
 let r=q(lc(p));for(let i=p.length-2;i>=0;i--)r=qa(qm(r,x),q(p[i]));return r;
}
function sturm(p){
 if(p.length<=1)return [];
 const sf=exactDiv(p,pgcd(p,der(p))),a=[sf,der(sf)];
 while(!z(a[a.length-1])){
  const r=neg(prem(a[a.length-2],a[a.length-1]));if(z(r))break;a.push(r);
 }
 return a;
}
function variation(a,x){
 let prev=0,v=0;for(const p of a){const s=signAt(p,x);if(s){if(prev&&prev!==s)v++;prev=s;}}return v;
}
const count=(a,l,r)=>variation(a,l)-variation(a,r);
function split(a,l,r){
 let m=midpoint(l,r);
 // Split at a nonroot; avoids ambiguous open/closed endpoints.
 for(let i=0;!signAt(a[0],m);i++){if(i>65)bad();m=midpoint(l,m);}
 return m;
}
function isolate(a){
 if(!a.length)return [];
 const p=a[0],lead=abs(lc(p));
 const b=2n+p.slice(0,-1).reduce((m,c)=>{const u=abs(c)/lead+1n;return u>m?u:m;},0n);
 const l=q(-b),r=q(b),todo=[[l,r,count(a,l,r)]],out=[];
 let steps=0;
 while(todo.length){
  if(++steps>4096)bad();
  const [l,r,n]=todo.pop();if(!n)continue;
  if(n===1){out.push([l,r]);continue;}
  const m=split(a,l,r),left=count(a,l,m);todo.push([m,r,n-left],[l,m,left]);
 }
 return out;
}
function refine(a,l,r){
 const m=split(a,l,r);return count(a,l,m)?[l,m]:[m,r];
}
const minQ=a=>a.reduce((x,y)=>qc(x,y)<=0?x:y);
const maxQ=a=>a.reduce((x,y)=>qc(x,y)>=0?x:y);
function imul(a,b){const v=a.flatMap(x=>b.map(y=>qm(x,y)));return [minQ(v),maxQ(v)];}
function polyInterval(p,l,r){
 let v=[q(lc(p)),q(lc(p))];for(let i=p.length-2;i>=0;i--)v=imul(v,[l,r]).map(x=>qa(x,q(p[i])));return v;
}
const signInterval=a=>a[0].n>0n?1:a[1].n<0n?-1:0;
function valueInterval(n,d,l,r){
 const a=polyInterval(n,l,r),b=polyInterval(d,l,r);
 if(!signInterval(b))return null;
 const v=a.flatMap(x=>b.map(y=>qd(x,y)));return [minQ(v),maxQ(v)];
}
function endpoint(a){
 const k=a.n.length-a.d.length;
 if(k<0)return [0,0];
 if(k===0){const v=numeric(q(lc(a.n),lc(a.d)));if(!Number.isFinite(v))bad();return [v,v];}
 const s=lc(a.n)<0n?-Infinity:Infinity;return [k%2?-s:s,s];
}
function extrema(a){
 const {n,d}=a;
 if(n.length===1&&d.length===1){const v=numeric(q(n[0],d[0]));if(!Number.isFinite(v)||v===0&&n[0]!==0n)bad();return [v,v];}
 const values=endpoint(a);
 const poles=sturm(d);
 for(let [l,r] of isolate(poles)){
  let sn=0;
  for(let i=0;i<180;i++){sn=signInterval(polyInterval(n,l,r));if(sn)break;[l,r]=refine(poles,l,r);}
  if(!sn)bad();
  for(const v of [l,r])values.push(sn*signAt(d,v)>0?Infinity:-Infinity);
 }
 if(values.includes(Infinity)&&values.includes(-Infinity))return [-Infinity,Infinity];
 let crit=add(mul(der(n),d),neg(mul(n,der(d))));
 if(!z(crit)){
  crit=exactDiv(crit,pgcd(crit,d));
  const st=sturm(crit),common=sturm(pgcd(crit,n));
  for(let [l,r] of isolate(st)){
   if(common.length&&count(common,l,r)>0){values.push(0);continue;}
   let found=false;
   for(let i=0;i<180;i++){
    const v=valueInterval(n,d,l,r);
    if(v&&signInterval(v)){
     const lo=numeric(v[0]),hi=numeric(v[1]);
     if(Number.isFinite(lo)&&Number.isFinite(hi)&&Math.abs(hi-lo)<=1e-12*Math.max(Math.abs(lo),Math.abs(hi))){
      values.push((lo+hi)/2);found=true;break;
     }
    }
    [l,r]=refine(st,l,r);
   }
   if(!found)bad();
  }
 }
 return [Math.min(...values),Math.max(...values)];
}
// null = not a supported rational expression, or an uncertified computation.
// Never return an approximate zero or a value the game would round to zero.
export function rationalTrigExtrema(e,phaseCertified){
 try{
  let a;
  try{a=convert(e,true);}catch{a=convert(e,false);}
  if(!a||!phaseCertified(a.phase))return null;
  const r=extrema(a);
  if(r.some(v=>Number.isNaN(v)||v!==0&&Math.abs(v)<1e-9))return null;
  return r;
 }catch{return null;}
}
