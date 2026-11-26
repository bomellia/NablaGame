import test from 'node:test';
import assert from 'node:assert/strict';
import {sealMarkup,sealSize,sealFamily} from '../sigil.js';
import {fitMath} from '../fit-math.js';
const x={t:'x'},n=v=>({t:'n',v}),p=(b,e)=>({t:'p',b,e}),f=(f,arg)=>({t:'f',f,arg}),m=(...v)=>({t:'m',v}),a=(...v)=>({t:'a',v});
test('fixed circle and no mathematical text across all families',()=>{
 const expressions=[n(1),x,p(x,2),p(x,-2),p(x,.5),f('sin',x),f('cos',x),f('tan',x),f('exp',x),f('log',x),f('atan',x),f('erf',x),a(x,n(1)),m(x,f('sin',x)),{t:'complex',re:x,im:n(1)}];
 const shapes=expressions.map(e=>sealMarkup(e));
 for(let i=0;i<expressions.length;i++){
  assert.equal(sealSize(expressions[i]),1);
  assert.match(shapes[i],/viewBox="-84 -84 168 168"/);
  assert.match(shapes[i],/r="79" class="seal-rim"/);
  assert.doesNotMatch(shapes[i],/<text|textPath|NaN|Infinity/);
  assert.equal(shapes[i],sealMarkup(expressions[i]));
 }
 assert.equal(new Set(shapes).size,shapes.length);
 assert.equal(sealFamily(p(x,-1)),'reciprocal');
 assert.equal(sealFamily(f('atan',x)),'inverse');
});
test('complexity changes the pattern without changing outer size',()=>{
 const simple=f('exp',x),nested=f('exp',a(p(x,3),f('sin',x),n(1)));
 assert.equal(sealFamily(simple),sealFamily(nested));
 assert.notEqual(sealMarkup(simple),sealMarkup(nested));
 assert.equal(sealSize(simple),sealSize(nested));
});
test('single-term equation remains visible even when small',()=>{
 const ink={style:{},getBoundingClientRect:()=>({width:200,height:20})};
 let abbreviated=false;
 const box={clientWidth:80,clientHeight:36,querySelector:()=>ink,classList:{contains:()=>true,toggle:(_c,b)=>abbreviated=b}};
 const doc={querySelectorAll:()=>[box]};fitMath(doc);assert.equal(abbreviated,false);assert.equal(ink.style.transform,'scale(0.37)');
 box.clientWidth=160;fitMath(doc);assert.equal(abbreviated,false);
});
