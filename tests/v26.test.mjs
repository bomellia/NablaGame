import test from 'node:test';
import assert from 'node:assert/strict';
import {mathBox,textRuns,annularLayout,curvedMath} from '../annular-math.js';
import {sealMarkup} from '../sigil.js';
const x={t:'x'},n=v=>({t:'n',v}),p=(b,e)=>({t:'p',b,e}),f=(f,arg)=>({t:'f',f,arg}),m=(...v)=>({t:'m',v}),a=(...v)=>({t:'a',v});
test('function name and argument share one natural text path',()=>{
 const e=f('atan',x),runs=textRuns(mathBox(e)),svg=curvedMath(e,'atan').markup;
 assert.equal(runs.length,1);
 assert.equal(runs[0].parts.map(p=>p.text).join(''),'arctan(x)');
 assert.equal((svg.match(/<textPath /g)||[]).length,1);
 assert.doesNotMatch(svg,/textLength=|lengthAdjust=|rotate\(/);
});
test('fraction and exponent use separate radial baselines',()=>{
 const e=m(n(2),p(f('cos',x),-2)),runs=textRuns(mathBox(e));
 assert.equal(runs.length,3);
 assert.ok(new Set(runs.map(r=>r.y)).size===3);
 const svg=curvedMath(e,'frac').markup;
 assert.equal((svg.match(/<textPath /g)||[]).length,3);
 assert.match(svg,/fraction-rule/);
 assert.equal(textRuns(mathBox(f('exp',m(n(-1),x)))).length,2);
});
test('wider expressions enlarge radius without increasing angular span',()=>{
 const simple=annularLayout(x),wide=annularLayout(f('atan',x));
 assert.ok(wide.r>simple.r);
 for(const e of [f('atan',x),m(n(2),p(f('cos',x),-2)),p(a(n(1),p(x,-1)),-1),f('exp',f('cos',x)),a(...Array.from({length:30},(_,i)=>p(x,i+1)))]){
  const l=annularLayout(e);
  assert.ok(l.b.w*l.scale/(l.r-l.b.bottom*l.scale)<=105*Math.PI/180+1e-7);
  assert.ok(l.outer<=124.01);
  assert.doesNotMatch(curvedMath(e).markup,/NaN|Infinity/);
 }
});
test('path IDs are local to each seal and compatible with destruction clones',()=>{
 const e=f('atan',x),a=curvedMath(e,'board-0-0').markup,b=curvedMath(e,'board-1-0').markup;
 assert.match(a,/id="board-0-0-arc-0"/);assert.match(a,/href="#board-0-0-arc-0"/);
 assert.match(b,/href="#board-1-0-arc-0"/);
 assert.doesNotMatch(a,/board-1-0/);
});
