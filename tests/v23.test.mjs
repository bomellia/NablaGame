import test from 'node:test';import assert from 'node:assert/strict';
import {sealMarkup,profile,inscription,logRune} from '../sigil.js';
import {newGame,preview} from '../engine.js';
const x={t:'x'},n=v=>({t:'n',v}),sin={t:'f',f:'sin',arg:x};
test('one seal has circular equation and deterministic structural geometry',()=>{const e={t:'a',v:[{t:'p',b:x,e:3},{t:'f',f:'exp',arg:sin}]};assert.ok(profile(e).level>profile(x).level);assert.equal(inscription({t:'p',b:x,e:3}),'x³');const svg=sealMarkup(e,'a');assert.match(svg,/class="annular-math"/);assert.equal(svg,sealMarkup(e,'a'));assert.notEqual(svg,sealMarkup(x,'a'));assert.doesNotMatch(logRune('あなた：COMの場に ∇ ／ 場全体を1階微分（基底2個消滅）'),/[一-龯ぁ-ゖァ-ヺ]/);});
test('destruction identifies the actual removed basis',()=>{const s=newGame();s.boards[1]=[n(1),x];s.hands[0][0]='DIFF';const r=preview(s,{cardIndex:0,owner:1,target:0});assert.ok(r.ok,r.reason);assert.deepEqual(r.effect.removed,[0]);assert.equal(r.state.boards[1].length,1);});
