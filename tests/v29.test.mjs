import test from 'node:test';
import assert from 'node:assert/strict';
import {previewVariants} from '../formula-preview.js';
import {fitMath,inkBounds} from '../fit-math.js';
const x={t:'x'},n=v=>({t:'n',v}),p=(b,e)=>({t:'p',b,e}),f=(f,arg)=>({t:'f',f,arg}),m=(...v)=>({t:'m',v}),a=(...v)=>({t:'a',v});
test('single terms never get abbreviated, regardless of nesting or factor count',()=>{
 for(const e of [f('exp',f('sin',x)),f('exp',f('cos',p(x,2))),f('sin',f('exp',f('log',f('cos',x)))),p(f('sqrt',f('exp',f('sin',x))),-3),m(n(2),x,p(f('sin',x),2),f('exp',x),f('cos',x),p(f('tan',x),-1))])assert.deepEqual(previewVariants(e),[]);
});
test('only additive siblings are omitted; numerator, denominator, functions and factors remain',()=>{
 const e=m(f('exp',f('sin',a(p(x,4),x,n(1)))),p(f('cos',x),-2),f('log',x));
 const v=previewVariants(e);
 assert.ok(v.length);
 for(const {latex} of v){for(const s of ['e^{','\\sin','x^{4}','\\cos','\\ln','\\frac','\\cdots'])assert.ok(latex.includes(s),latex);}
});
test('measure symmetric bounds when rendered fraction exceeds wrapper',()=>{
 const rect=(left,top,right,bottom)=>({left,top,right,bottom,width:right-left,height:bottom-top});
 const ink={style:{},innerHTML:'full',getBoundingClientRect:()=>rect(0,0,80,20),
 querySelectorAll:()=>[{getBoundingClientRect:()=>rect(0,-10,80,25)}]};
 assert.deepEqual(inkBounds(ink),{width:80,height:40});
 const box={clientWidth:100,clientHeight:30,querySelector:()=>ink,classList:{contains:()=>true,toggle(){}}};
 fitMath({querySelectorAll:()=>[box]});assert.equal(ink.style.transform,'scale(0.6)');
 // A freshly created DOM node after selection must get the same scale.
 const selected={...ink,style:{}};
 box.querySelector=()=>selected;
 fitMath({querySelectorAll:()=>[box]});assert.equal(selected.style.transform,ink.style.transform);
});
