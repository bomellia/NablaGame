import test from 'node:test';
import assert from 'node:assert/strict';
import {previewVariants} from '../formula-preview.js';
import {fitMath} from '../fit-math.js';
import {toLatex} from '../latex.js';
const x={t:'x'},n=v=>({t:'n',v}),p=(b,e)=>({t:'p',b,e}),f=(f,arg)=>({t:'f',f,arg}),m=(...v)=>({t:'m',v}),a=(...v)=>({t:'a',v});
test('summaries preserve leading terms and do not modify the original AST',()=>{
 const expr=a(...Array.from({length:10},(_,i)=>p(x,i+1)));
 const snapshot=JSON.stringify(expr),full=toLatex(expr),variants=previewVariants(expr);
 assert.ok(variants.length);
 assert.ok(variants.every(v=>v.latex.includes('x^{10}')&&v.latex.includes('\\cdots')));
 assert.equal(JSON.stringify(expr),snapshot);
 assert.equal(toLatex(expr),full);
 assert.deepEqual(previewVariants(f('sin',x)),[]);
});
test('fraction retains numerator, denominator and outer function when abbreviated',()=>{
 const expr=m(n(2),f('exp',a(p(x,3),x,n(1))),p(a(p(x,2),x,n(1)),-1),p(f('cos',x),-2));
 const variants=previewVariants(expr);
 assert.ok(variants.length);
 assert.ok(variants.every(v=>v.latex.includes('\\frac{')&&v.latex.includes('e^{')&&v.latex.includes('\\cdots')));
 assert.ok(variants.every(v=>v.text.includes('…')));
});
test('nested functions preserve outer operation',()=>{
 const expr=f('sin',f('exp',f('log',a(p(x,3),x,n(1)))));
 const variants=previewVariants(expr);
 assert.ok(variants.length);
 assert.ok(variants.every(v=>v.latex.includes('\\sin')&&v.latex.includes('e^{')&&v.latex.includes('\\ln')&&v.latex.includes('\\cdots')));
});
test('choose detailed readable preview, restore full formula on resize',()=>{
 const ink={innerHTML:'full',style:{},getBoundingClientRect(){return {width:{full:400,detailed:160,compact:75}[this.innerHTML]||400,height:20};}};
 let abbreviated=false;
 const box={clientWidth:106,clientHeight:36,querySelector:()=>ink,
  dataset:{previews:JSON.stringify([{latex:'detailed',text:'detailed'},{latex:'compact',text:'compact'}])},
  classList:{contains:()=>true,toggle:(_c,b)=>abbreviated=b}};
 const root={querySelectorAll:()=>[box]};
 fitMath(root);assert.equal(ink.innerHTML,'detailed');assert.equal(abbreviated,true);
 box.clientWidth=80;fitMath(root);assert.equal(ink.innerHTML,'compact');
 box.clientWidth=500;fitMath(root);assert.equal(ink.innerHTML,'full');assert.equal(abbreviated,false);
});
