/* Explicit real principal branches. Inverses are taken on a monotone branch;
   the game's existing domain-forgetting convention applies to the result. */
import {x,constant as n,pow,mul,add,div,fn,Unsupported,sig} from './symbolic.js?v=0.11';
const X=x(), near=(a,b=0)=>Math.abs(a-b)<1e-9;
const neg=a=>mul(n(-1),a);
function poly(e){
 if(e.t==='n')return [e.v,0,0];if(e.t==='x')return [0,1,0];
 if(e.t==='p'&&e.b.t==='x'&&e.e===2)return [0,0,1];
 if(e.t==='a'){const out=[0,0,0];for(const t of e.v){const p=poly(t);if(!p)return null;p.forEach((v,i)=>out[i]+=v);}return out;}
 if(e.t==='m'){let p=[1,0,0];for(const t of e.v){const q=poly(t);if(!q)return null;const a=[0,0,0,0,0];p.forEach((v,i)=>q.forEach((w,j)=>a[i+j]+=v*w));if(a.slice(3).some(v=>!near(v)))return null;p=a.slice(0,3);}return p;}
 return null;
}
function frac(e){if(e.t==='p'&&e.e===-1)return [n(1),e.b];if(e.t==='m'){let a=[],b=[];for(const t of e.v){if(t.t==='p'&&t.e===-1)b.push(t.b);else a.push(t);}if(b.length)return [mul(...a),mul(...b)];}return null;}
function cubicCoefficients(e){
 const out=[0,0,0,0];
 for(const t of e.t==='a'?e.v:[e]){let c=1,q=t;if(t.t==='m'){const factors=t.v.filter(z=>z.t!=='n');c=t.v.filter(z=>z.t==='n').reduce((v,z)=>v*z.v,1);if(factors.length!==1)return null;q=factors[0];}
  if(q.t==='n')out[0]+=c*q.v;else if(q.t==='x')out[1]+=c;else if(q.t==='p'&&q.b.t==='x'&&Number.isInteger(q.e)&&q.e>=0&&q.e<=3)out[q.e]+=c;else return null;
 }
 return out[3]===0?null:out;
}
function root(y,k){const r=1/k;
 // Odd integer powers are invertible on both real half-lines.
 if(Number.isInteger(k)&&Math.abs(k)%2===1&&Math.abs(k)>1)return mul(fn('sign',y),pow(fn('abs',y),r));
 return pow(y,r);
}
export function solveInverse(e,y=X,F=fn,depth=0){
 if(depth>24)throw new Unsupported('逆関数の式が複雑すぎます');
 const solve=(a,b)=>solveInverse(a,b,F,depth+1);
 if(e.t==='x')return y;
 if(e.t==='n')throw new Unsupported('定数関数には逆関数がありません');
 const p=poly(e);
 if(p){const [c,b,a]=p;if(!near(a))return div(add(n(-b),pow(add(n(b*b-4*a*c),mul(n(4*a),y)),.5)),n(2*a));if(!near(b))return div(add(y,n(-c)),n(b));throw new Unsupported('定数関数には逆関数がありません');}
 const q=frac(e);
 if(q){const a=poly(q[0]),b=poly(q[1]);if(a&&b&&near(a[2])&&near(b[2])){if(near(a[1]*b[0]-a[0]*b[1]))throw new Unsupported('定数関数には逆関数がありません');return div(add(n(a[0]),neg(mul(n(b[0]),y))),add(mul(n(b[1]),y),n(-a[1])));}}
 const cubic=cubicCoefficients(e);
 if(cubic){const [c,b,d,a]=cubic;const shift=d/(3*a),p=b/a-3*shift*shift,q=2*shift**3-b/a*shift+c/a;
  const z=add(div(y,n(a)),n(-q));
  if(near(p))return add(root(z,3),n(-shift));
  if(p>0){const h=2*Math.sqrt(p/3);return add(mul(n(h),F('sinh',mul(n(1/3),F('asinh',mul(n(4/(h*h*h)),z))))),n(-shift));}
 }
 if(e.t==='a'){const ns=e.v.filter(t=>t.t==='n'),rest=e.v.filter(t=>t.t!=='n');if(ns.length)return solve(add(...rest),add(y,n(-ns.reduce((s,t)=>s+t.v,0))));}
 if(e.t==='m'){const ns=e.v.filter(t=>t.t==='n'),rest=e.v.filter(t=>t.t!=='n');if(ns.length&&rest.length)return solve(mul(...rest),div(y,n(ns.reduce((s,t)=>s*t.v,1))));}
 if(e.t==='m'&&e.v.length===2){
  const sg=e.v.find(t=>t.t==='f'&&t.f==='sign'),ab=e.v.find(t=>t.t==='p'&&t.b.t==='f'&&t.b.f==='abs');
  if(sg&&ab&&sig(sg.arg)===sig(ab.b.arg)&&!near(ab.e))return solve(sg.arg,mul(F('sign',y),pow(F('abs',y),1/ab.e)));
  const ex=e.v.find(t=>t.t==='f'&&t.f==='exp'),other=e.v.find(t=>t!==ex);
  if(ex&&other){const a=poly(other),b=poly(ex.arg);if(a&&b&&near(a[2])&&near(b[2])&&!near(a[1])&&!near(b[1])){const k=b[1]/a[1],c=b[0]-k*a[0];return div(add(div(F('LambertW',mul(n(k*Math.exp(-c)),y)),n(k)),n(-a[0])),n(a[1]));}}
 }
 if(e.t==='p'&&!near(e.e))return solve(e.b,root(y,e.e));
 if(e.t==='f'){
  const direct={exp:'log',log:'exp',logabs:'exp',sin:'asin',cos:'acos',tan:'atan',asin:'sin',acos:'cos',atan:'tan',sinh:'asinh',cosh:'acosh',tanh:'atanh',asinh:'sinh',acosh:'cosh',atanh:'tanh',erf:'erfinv',erfi:'erfiinv',erfinv:'erf',erfiinv:'erfi'};
  if(direct[e.f])return solve(e.arg,F(direct[e.f],y));
  if(e.f==='LambertW')return solve(e.arg,mul(y,F('exp',y)));
  if(e.f==='sqrt')return solve(e.arg,pow(y,2));
  if(e.f==='abs')return solve(e.arg,y);
  if(e.f==='cot')return solve(e.arg,add(n(Math.PI/2),neg(F('atan',y))));
  if(e.f==='sec')return solve(e.arg,F('acos',pow(y,-1)));
  if(e.f==='csc')return solve(e.arg,F('asin',pow(y,-1)));
  if(e.f==='sign')throw new Unsupported('符号関数には逆関数がありません');
 }
 throw new Unsupported('実数の逆関数の主枝を確定できません');
}
