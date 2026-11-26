// Bounded, presentation-only real sampling. No game math is changed.
const R=46, X=Math.PI, N=256, cache=new WeakMap();
const finite=Number.isFinite;
const nonzero=v=>Math.abs(v)>1e-12?v:NaN;
const erf=x=>{const a=Math.abs(x),t=1/(1+.3275911*a);return Math.sign(x)*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a));};
const functions={
 sin:Math.sin,cos:Math.cos,tan:x=>Math.sin(x)/nonzero(Math.cos(x)),cot:x=>Math.cos(x)/nonzero(Math.sin(x)),
 sec:x=>1/nonzero(Math.cos(x)),csc:x=>1/nonzero(Math.sin(x)),
 sinh:Math.sinh,cosh:Math.cosh,tanh:Math.tanh,coth:x=>1/nonzero(Math.tanh(x)),sech:x=>1/Math.cosh(x),csch:x=>1/nonzero(Math.sinh(x)),
 exp:Math.exp,log:Math.log,logabs:x=>Math.log(Math.abs(x)),sqrt:Math.sqrt,abs:Math.abs,sign:Math.sign,
 asin:Math.asin,acos:Math.acos,atan:Math.atan,asinh:Math.asinh,acosh:Math.acosh,atanh:Math.atanh,
 erf
};
function compile(e,budget,depth=0){
 if(!e||typeof e!=='object'||--budget.left<0||depth>40)return null;
 const child=z=>compile(z,budget,depth+1);
 switch(e.t){
 case 'n':return finite(e.v)?()=>e.v:null;
 case 'x':return x=>x;
 case 'a':case 'm':{
  if(!Array.isArray(e.v)||e.v.length>budget.left)return null;
  const parts=e.v.map(child);if(parts.some(p=>!p))return null;
  return e.t==='a'?x=>parts.reduce((s,f)=>s+f(x),0):x=>parts.reduce((s,f)=>s*f(x),1);
 }
 case 'p':{
  const f=child(e.b);if(!f||!finite(e.e))return null;
  return x=>Math.pow(f(x),e.e);
 }
 case 'f':{
  const f=child(e.arg),op=Object.hasOwn(functions,e.f)?functions[e.f]:null;
  return f&&op?x=>op(f(x)):null;
 }
 default:return null;
 }
}
export function evaluateGraph(e,x){
 const f=compile(e,{left:384});return f?f(x):NaN;
}
// Clip to the viewing square with a shared, symmetric vertical scale.
// Never clamp vertices into false horizontal plateaus at the frame boundary.
function clip(a,b,limit){
 const [x0,y0]=a,[x1,y1]=b;
 if(!finite(y0)||!finite(y1))return null;
 if(Math.abs(y0)>limit&&Math.abs(y1)>limit)return null;
 let t0=0,t1=1;const dy=y1-y0;
 if(!finite(dy))return null;
 if(dy===0){if(Math.abs(y0)>limit)return null;}
 else{
  const a=(-limit-y0)/dy,b=(limit-y0)/dy;
  t0=Math.max(0,Math.min(a,b));t1=Math.min(1,Math.max(a,b));
  if(t0>t1)return null;
 }
 const point=t=>[x0+(x1-x0)*t,y0+dy*t];
 return [point(t0),point(t1)];
}
const coord=(x,y,limit)=>[+(R*x/X).toFixed(2),+(-R*y/limit).toFixed(2)];
const same=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];
function segments(samples,limit){
 const paths=[];let points=[];
 const finish=()=>{if(points.length>1)paths.push(points);points=[];};
 for(let i=0;i<N;i++){
  const a=samples[2*i],mid=samples[2*i+1],b=samples[2*i+2];
  const y=a[1],z=b[1],m=mid[1];
  // Break at undefined values, likely poles and abrupt jumps. This is a
  // sampled visual heuristic, not a proof of continuity.
  const jump=Math.abs(z-y),bend=Math.abs(m/limit-(y/limit+z/limit)/2);
  if(![y,z,m].every(finite)||jump>limit*2||(jump>limit*.3&&bend>.12)){
   finish();continue;
  }
  const line=clip(a,b,limit);if(!line){finish();continue;}
  const p=coord(...line[0],limit),q=coord(...line[1],limit);
  if(!same(points.at(-1),p)){finish();points=[p];}
  if(!same(points.at(-1),q))points.push(q);
 }
 finish();return paths;
}
export function graphMotif(e){
 if(!e||typeof e!=='object')return {mode:'abstract',curves:[]};
 if(cache.has(e))return cache.get(e);
 const items=e.t==='complex'?[['real',e.re],['imag',e.im]]:[['real',e]];
 const samples=[];
 for(const [kind,expr] of items){
  const f=compile(expr,{left:384});if(!f)continue;
  const points=Array.from({length:2*N+1},(_,i)=>{const x=X*(i/N-1);return [x,f(x)];});
  if(points.filter(p=>finite(p[1])).length>=3)samples.push({kind,points});
 }
 const values=samples.flatMap(s=>s.points.map(p=>Math.abs(p[1])).filter(finite)).sort((a,b)=>a-b);
 const quantile=values[Math.floor((values.length-1)*.90)]||0;
 const limit=Math.max(1e-9,quantile)*1.18;
 // A constant-only trace is more legible away from the rim and zero axis.
 const scale=finite(limit)&&limit>0?limit:Number.MAX_VALUE;
 const curves=samples.flatMap(s=>segments(s.points,scale).map(points=>({kind:s.kind,points,d:points.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ')})));
 const mode=curves.length?(e.t==='complex'?(samples.length===2?'complex':'partial'):'sampled'):'abstract';
 const result={mode,curves};cache.set(e,result);return result;
}
