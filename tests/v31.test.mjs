import test from 'node:test';
import assert from 'node:assert/strict';
import {transitionBoard,animationMarkup,traceMarkup,REWRITE_MS,INSCRIBE_MS} from '../seal-animation.js';
import {sealMarkup} from '../sigil.js';
const x={t:'x'},n=v=>({t:'n',v}),f=(f,arg=x)=>({t:'f',f,arg});
test('rewrites are mapped to surviving indices after rank reduction',()=>{
 const before=[n(1),f('sin'),f('exp')],after=[f('cos'),f('exp')];
 const changes=transitionBoard(before,after,[0],[],100);
 assert.deepEqual(changes[0],{before:f('sin'),after:f('cos'),start:100,duration:REWRITE_MS});
 assert.equal(changes[1],null);
});
test('new basis draws without erasing, and unchanged transitions persist across index shifts',()=>{
 const a=transitionBoard([x],[x,f('sin')],[],[],10);
 assert.equal(a[0],null);assert.equal(a[1].before,null);assert.equal(a[1].duration,INSCRIBE_MS);
 const b=transitionBoard([x,f('sin')],[f('sin')],[0],a,50);
 assert.equal(b[0],a[1]);
 assert.equal(transitionBoard([f('sin')],[f('sin')],[],b,1000)[0],null);
});
test('old strokes erase in reverse order, new strokes draw in order',()=>{
 const svg=sealMarkup(f('exp'));
 const draw=traceMarkup(svg,'draw'),erase=traceMarkup(svg,'erase');
 const delays=s=>Array.from(s.matchAll(/--stroke-delay:(\d+)ms/g),m=>+m[1]);
 const d=delays(draw),e=delays(erase);
 assert.ok(d.length>10);assert.equal(d[0],0);assert.equal(d.at(-1),340);
 assert.equal(e[0],180);assert.equal(e.at(-1),0);
 assert.match(draw,/pathLength="1"/);assert.match(draw,/data-trace="dot"/);
});
test('redraw resumes elapsed animation and expired animations disappear',()=>{
 const [t]=transitionBoard([x],[f('sin')],[],[],100);
 const a=animationMarkup(t,450);
 assert.match(a,/--elapsed:350ms/);assert.match(a,/seal-erase/);assert.match(a,/seal-draw/);
 assert.equal(animationMarkup(t,100+REWRITE_MS),'');
 const [newSeal]=transitionBoard([],[x],[],[],0);
 assert.doesNotMatch(animationMarkup(newSeal,10),/seal-erase/);
});
