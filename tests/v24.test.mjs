import test from 'node:test';
import assert from 'node:assert/strict';
import {fitScale,fitMath} from '../fit-math.js';
import {sealMarkup} from '../sigil.js';
test('fit both dimensions without enlarging short expressions',()=>{
 assert.equal(fitScale(80,50,30,20),1);
 assert.equal(fitScale(80,50,152,20),.5);
 assert.equal(fitScale(80,50,30,92),.5);
 assert.equal(fitScale(0,50,30,20),1);
});
test('fit recalculates after viewport resize and measures natural size',()=>{
 let resets=0;
 const ink={style:{},getBoundingClientRect(){assert.equal(this.style.transform,'none');resets++;return {width:152,height:20};}};
 const box={clientWidth:80,clientHeight:50,querySelector(){return ink;}};
 const doc={querySelectorAll(){return [box];}};
 fitMath(doc);assert.equal(ink.style.transform,'scale(0.5)');
 box.clientWidth=156;fitMath(doc);assert.equal(ink.style.transform,'scale(1)');assert.equal(resets,2);
});
test('short inscriptions receive larger type on the circle',()=>{
 const svg=sealMarkup({t:'f',f:'sin',arg:{t:'x'}},'test');
 assert.match(svg,/<text class="inscription" font-size="23"/);
 assert.match(svg,/<textPath href="#test-arc-0"/);
});
