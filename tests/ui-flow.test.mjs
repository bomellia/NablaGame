import test from 'node:test';import assert from 'node:assert/strict';
import {newGame} from '../engine.js';
// Exercise the actual click handlers and asynchronous COM phases without a browser.
test('selection, ordered operands, confirmation and staged COM interaction',async()=>{
 const state=newGame();state.hands[0]=['DIV','X','DIFF','INTEGRATE','PLUS_C','NABLA','COS','X'];state.hands[1]=['X2','X','DIFF','SIN','COS','MUL','DIV','X'];state.boards=[[{t:'x'},{t:'f',f:'sin',arg:{t:'x'}}],[{t:'p',b:{t:'x'},e:2},{t:'f',f:'cos',arg:{t:'x'}}]];state.turn=0;state.turns=1;state.finished=false;
 let stored=JSON.stringify(state);const handlers={},nodes=new Map(),timers=[];let worker;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',textContent:'',value:'normal',checked:true,scrollLeft:0,classList:{toggle(){}},querySelector(){return null;},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 globalThis.document={getElementById:node,addEventListener:(name,fn)=>handlers[name]=fn};globalThis.window={addEventListener(){}};globalThis.localStorage={getItem:()=>stored,setItem:(_key,value)=>{stored=value;}};globalThis.confirm=()=>true;
 const oldSet=globalThis.setTimeout,oldClear=globalThis.clearTimeout;globalThis.setTimeout=(fn,delay)=>{const obj={fn,delay,cancelled:false};timers.push(obj);return obj;};globalThis.clearTimeout=t=>{if(t)t.cancelled=true;};globalThis.Worker=class{constructor(){worker=this;}postMessage(s){this.state=s;}terminate(){}};
 try{
  await import('../ui.js');const click=(dataset={},id='')=>handlers.click({target:{closest:()=>({dataset,id})}});const saved=()=>JSON.parse(stored);
  assert.match(node('action-panel').innerHTML,/手札からカードを選択/);click({owner:'1',index:'0'});assert.equal(node('formula-dialog').open,true);click({},'close-formula');
  click({card:'0'});assert.match(node('action-panel').innerHTML,/左の式を選択/);click({card:'1'});assert.match(node('action-panel').innerHTML,/右の式を選択/);click({owner:'1',index:'0'});assert.match(node('action-panel').innerHTML,/式を確認して実行/);assert.match(node('action-panel').innerHTML,/結果/);assert.match(node('action-panel').innerHTML,/class="action-buttons confirm-actions"/);assert.match(node('action-panel').innerHTML,/id="act-btn"/);assert.doesNotMatch(node('action-panel').innerHTML,/id="hint-btn"|id="swap-btn"|id="inspect-btn"/);click({card:'1'});assert.doesNotMatch(node('action-panel').innerHTML,/1枚ずつ選択してください/);assert.equal(saved().turn,0);assert.equal(saved().boards[1][0].e,2);
  click({},'act-btn');assert.equal(saved().turn,1);assert.equal(saved().boards[1][0].e,-1);assert.match(node('action-panel').innerHTML,/COMが次の手/);
  worker.onmessage({data:{move:{cardIndex:0,owner:1,target:null}}});assert.match(node('action-panel').innerHTML,/COMがカードを選択/);const next=()=>{const t=timers.find(t=>!t.cancelled);assert.ok(t);t.cancelled=true;t.fn();};next();assert.match(node('action-panel').innerHTML,/COMが対象を選択/);next();assert.match(node('action-panel').innerHTML,/結果/);next();assert.equal(saved().turn,0);
  const i=saved().hands[0].indexOf('DIFF');click({card:String(i)});assert.match(node('action-panel').innerHTML,/対象の基底を選択/);click({owner:'0',index:'0'});click({},'act-btn');assert.equal(saved().turn,1);assert.deepEqual(saved().boards[0][0],{t:'n',v:1});
  worker.onmessage({data:{move:{discard:true,cardIndex:0}}});click({},'skip-com');assert.equal(saved().turn,0);
  const globalIndex=saved().hands[0].indexOf('NABLA');assert.ok(globalIndex>=0);click({card:String(globalIndex)});assert.match(node('player').className,/field-selectable/);
  handlers.click({target:{closest:selector=>selector==='button'?null:selector==='#opponent,#player'?node('player'):null}});
  assert.equal(saved().turn,1);assert.deepEqual(saved().boards[0],[{t:'f',f:'cos',arg:{t:'x'}}]);
 }finally{globalThis.setTimeout=oldSet;globalThis.clearTimeout=oldClear;delete globalThis.document;delete globalThis.window;delete globalThis.Worker;delete globalThis.localStorage;delete globalThis.confirm;}
});
