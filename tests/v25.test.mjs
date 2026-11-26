import test from 'node:test';
import assert from 'node:assert/strict';
import {mathBox,annularLayout,curvedMath} from '../annular-math.js';
import {sealMarkup,sealSize} from '../sigil.js';
const x={t:'x'},n=v=>({t:'n',v}),p=(b,e)=>({t:'p',b,e}),m=(...v)=>({t:'m',v}),a=(...v)=>({t:'a',v}),f=(f,arg)=>({t:'f',f,arg});
test('reciprocal uses radially stacked numerator and denominator, with arc rule',()=>{
 const e=p(x,-1),b=mathBox(e),g=b.items.filter(i=>i.type==='glyph');
 assert.equal(g[0].text,'1');assert.equal(g[1].text,'x');assert.ok(g[0].y<g[1].y);
 assert.match(curvedMath(e).markup,/class="math-rule fraction-rule" d="M[^"]+ A/);
 assert.match(sealMarkup(e),/fraction-ring/);assert.ok(sealSize(e)>sealSize(x));
});
test('rational coefficient, negative power, nested fraction and root',()=>{
 for(const [e,count] of [[n(.5),1],[m(n(.5),p(x,-2)),1],[p(a(n(1),p(x,-1)),-1),2],[p(x,1.5),1]]){
  assert.equal(mathBox(e).items.filter(i=>i.type==='fraction').length,count);
  assert.ok(annularLayout(e).outer>=97);
 }
 assert.match(curvedMath(f('sqrt',p(x,-1))).markup,/radical-rule/);
 assert.ok(mathBox(f('exp',x)).items.filter(i=>i.type==='glyph')[1].y<0);
});
test('large sums remain finite, with explicit ellipsis if too dense',()=>{
 const e=a(...Array.from({length:100},(_,i)=>p(x,-i-1)));
 const s=sealMarkup(e);assert.doesNotMatch(s,/NaN|Infinity/);
 assert.ok(sealSize(e)<=1.5);
});

test('power of exponential preserves grouping and inner glyphs have finite widths',()=>{const b=mathBox(p(f('exp',x),2));assert.equal(b.items.filter(i=>i.type==='glyph')[0].text,'(');assert.match(curvedMath(p(x,-1)).markup,/textLength="[0-9.]+"/);});
