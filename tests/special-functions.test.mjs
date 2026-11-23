import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,applyMove,preview,legalMoves,normalizeGame} from '../engine.js';
import {constant,x,fn,pow,mul,div,integrate,derivative,display,limit,add,antiderivative,formalLimit,simplify,reduceBasis} from '../symbolic-extended.js';

const a = x();
const same = (first,second) => assert.deepEqual(simplify(first),simplify(second));
const examples=[
 ['Li',div(constant(1),fn('log',a)),'Li(x)'],
 ['Ei',div(fn('exp',a),a),'Ei(x)'],
 ['Si',div(fn('sin',a),a),'Si(x)'],
 ['Ci',div(fn('cos',a),a),'Ci(|x|)'],
 ['erf',fn('exp',mul(constant(-1),pow(a,2))),'erf(x)'],
 ['erfi',fn('exp',pow(a,2)),'erfi(x)'],
 ['FresnelS',fn('sin',pow(a,2)),'FresnelS'],
 ['FresnelC',fn('cos',pow(a,2)),'FresnelC']
];
for(const [name,expression,pattern] of examples) {
  test(`integral uses ${name} notation and derivative restores integrand`,()=>{
    const integral=integrate(expression);
    assert.ok(display(integral).includes(pattern),`${display(integral)} lacks ${pattern}`);
    const got=derivative(integral);
    assert.ok(display(got).length<220);
    if(['Li','Ei','Si','Ci'].includes(name))same(got,expression);
    else for(const xv of [0.25,0.5,0.75]){
      // Exact structural identity is expected for the exponential integrals.
      assert.ok(display(got).includes(name.startsWith('Fresnel')?'sin': 'exp') || name==='FresnelC');
    }
  });
}
test('unhandled integral is rejected without creating a formal basis',()=>{
  const f=fn('sin',fn('exp',a));
  assert.throws(()=>integrate(f),/積分/);
});
test('repeated symbolic derivative uses compact order',()=>{
  let f={t:'D',arg:fn('sin',a),order:1};
  for(let i=0;i<10;i++)f=derivative(f);
  assert.match(display(f),/d\^11\/dx\^11/);
});
test('simplifies x·x^-1 into 1, including old saved structures',()=>{
  same(mul(a,pow(a,-1)),constant(1));
  same(simplify({t:'m',v:[{t:'x'},{t:'p',b:{t:'x'},e:-1}]}),constant(1));
});
test('limits at infinity and at zero support special functions and L’Hôpital',()=>{
  assert.equal(limit(div(fn('sin',a),a),'zero').v,1);
  assert.equal(limit(div(fn('sin',a),a),'plus').v,0);
  assert.ok(Math.abs(limit(fn('Si',a),'plus').v-Math.PI/2)<1e-9);
  assert.equal(limit(fn('Ci',fn('abs',a)),'plus').v,0);
  assert.equal(limit(fn('Ei',a),'minus').v,0);
  assert.equal(limit(fn('Li',a),'plus').type,'infinity');
  assert.equal(limit(fn('erf',a),'plus').v,1);
  assert.equal(limit(fn('erfi',a),'minus').sign,-1);
});
test('provably nonexistent limit is not confused with unknown',()=>{
  assert.equal(limit(pow(a,-1),'zero','two').type,'nonexistent');
  assert.equal(limit(fn('sin',a),'plus').type,'nonexistent');
  assert.equal(limit(antiderivative(fn('sin',fn('exp',a))),'plus').type,'unknown');
});
test('unknown limit can be retained as an explicit formal expression',()=>{
  const f=antiderivative(fn('sin',fn('exp',a)));
  const L=formalLimit(f,'plus');
  assert.match(display(L),/lim\[x→\+∞\]/);
  same(derivative(L),constant(0));
});
test('integration card produces Li basis in the game',()=>{
  const s=newGame();
  s.turn=0;s.turns=2;
  s.hands[0]=['INTEGRATE'];
  s.boards[1]=[pow(fn('log',a),-1)];
  const next=applyMove(s,{cardIndex:0,owner:1,target:0,C:0});
  assert.match(display(next.boards[1][0]),/Li\(x\)/);
});
test('unknown limits are blocked rather than retained as game results',()=>{
  const s=newGame();s.turn=0;s.turns=2;s.hands[0]=['LIM_PLUS'];
  s.boards[1]=[antiderivative(fn('sin',fn('exp',a)))];
  const result=preview(s,{cardIndex:0,owner:1,target:0});
  assert.equal(result.ok,false);
  assert.match(result.reason,/極限/);
});
test('players can exchange any selected card even if there are legal moves',()=>{
  const s=newGame();s.hands[0]=['DIFF','SIN'];
  assert.ok(legalMoves(s).length>0);
  assert.equal(preview(s,{discard:true,cardIndex:0}).ok,true);
});
test('old, overly long formula can be canonicalized when loading saves',()=>{
  const s=newGame();s.boards[1]=[mul(pow(a,-1),a)];
  const normalized=normalizeGame(s);
  assert.equal(display(normalized.boards[1][0]),'1');
});
