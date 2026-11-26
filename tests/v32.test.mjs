import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateGraph,graphMotif} from '../seal-graph.js';
import {sealMarkup,sealSize} from '../sigil.js';
import {traceMarkup} from '../seal-animation.js';
const x={t:'x'},n=v=>({t:'n',v}),p=(b,e)=>({t:'p',b,e}),f=(f,arg=x)=>({t:'f',f,arg}),m=(...v)=>({t:'m',v}),a=(...v)=>({t:'a',v});
test('real sampling evaluates parity, products, quotients and nested functions',()=>{
 assert.equal(evaluateGraph(p(x,2),-2),4);
 assert.equal(evaluateGraph(p(x,3),-2),-8);
 assert.equal(evaluateGraph(p(x,-1),-2),-.5);
 assert.equal(evaluateGraph(f('exp',f('cos')),0),Math.E);
 assert.equal(evaluateGraph(m(n(2),a(x,n(1))),2),6);
 assert.ok(Number.isNaN(evaluateGraph(f('sqrt'),-1)));
});
test('graphs of basic functions preserve the characteristic shape',()=>{
 for(const e of [n(1),x,p(x,2),p(x,3),f('sin'),f('cos'),f('exp'),f('log'),f('sqrt'),f('atan'),f('erf')]){
  const g=graphMotif(e);assert.equal(g.mode,'sampled');assert.ok(g.curves.length);
  for(const c of g.curves)for(const [px,py] of c.points){assert.ok(Math.abs(px)<=46.01&&Math.abs(py)<=46.01);assert.ok(Number.isFinite(px)&&Number.isFinite(py));}
 }
 const parabola=graphMotif(p(x,2)).curves.flatMap(c=>c.points);
 assert.ok(parabola.every(pt=>pt[1]<=0));assert.ok(parabola.some(pt=>pt[0]===0&&pt[1]===0));
 assert.notEqual(graphMotif(f('sin')).curves[0].d,graphMotif(f('cos')).curves[0].d);
 assert.ok(graphMotif(f('sqrt')).curves.every(c=>c.points.every(pt=>pt[0]>=0)));
});
test('poles and discontinuities are not connected',()=>{
 for(const e of [p(x,-1),f('tan'),f('sign')]){
  const curves=graphMotif(e).curves;assert.ok(curves.length>=2);
  for(const c of curves){
   if(e.t==='p'||e.f==='sign')assert.ok(c.points.every(pt=>pt[0]<=0)||c.points.every(pt=>pt[0]>=0));
   if(e.f==='tan')for(let i=1;i<c.points.length;i++)assert.ok(Math.abs(c.points[i][1]-c.points[i-1][1])<46);
  }
 }
});
test('complex components and unsupported functions have explicit visual modes',()=>{
 const g=graphMotif({t:'complex',re:x,im:n(1)});
 assert.equal(g.mode,'complex');assert.ok(g.curves.some(c=>c.kind==='real'));assert.ok(g.curves.some(c=>c.kind==='imag'));
 assert.equal(graphMotif(f('unknown')).mode,'abstract');
 assert.equal(graphMotif({t:'complex',re:x,im:f('unknown')}).mode,'partial');
 assert.match(sealMarkup(f('unknown')),/data-graph="abstract"/);
 assert.doesNotMatch(sealMarkup(f('unknown')),/class="seal-graph graph-/);
});
test('fixed radius, graph last on drawing and first on erasure',()=>{
 const svg=sealMarkup(f('sin'));
 assert.match(svg,/viewBox="-84 -84 168 168"/);assert.equal(sealSize(f('sin')),1);
 assert.match(svg,/data-graph="sampled"/);assert.match(svg,/class="seal-graph graph-real"\/><\/svg>$/);
 for(const phase of ['draw','erase']){
  const t=traceMarkup(svg,phase);assert.match(t,/class="seal-graph graph-real" pathLength="1" data-trace="line"/);
  const delay=Number(t.match(/class="seal-graph graph-real"[^>]*--stroke-delay:(\d+)ms/)[1]);
  assert.equal(delay,phase==='draw'?340:0);
 }
});
