import {newGame,chooseComMove,applyMove,legalMoves,preview} from './engine.js';
import {display,expressionSize} from './symbolic-extended.js';
const seedRandom = seed => {let a=seed>>>0;return ()=> {a=(a*1664525+1013904223)>>>0;return a/4294967296;}};
const results={matches:0,complete:0,aborted:0,player0:0,player1:0,draw:0,turns:0,maxTurns:0,maxBasisSize:0,maxDisplayLength:0,swaps:0,unknownCards:0,formalExprs:0,tanCount:0,reason:{},errors:[],samples:[]};
const total=Number(process.argv[2]||60);
const start=Number(process.argv[3]||0);
for(let k=start;k<start+total;k++){
 if(process.env.DEBUG_MATCHES) console.error('START',k);
 const r=seedRandom(123456+k*71);Math.random=r;
 let s=newGame({random:r,difficulty:k%3===0?'hard':'normal',extended:k%2===0});
 let localSwaps=0;
 try{
  while(!s.finished&&s.turns<150){
   if(process.env.DEBUG_MATCHES&&s.turns%10===0) console.error('TURN',k,s.turns,s.boards.map(b=>b.length));
   const m=chooseComMove(s);
   if(!m){results.reason.noMoves=(results.reason.noMoves||0)+1;break;}
   const p=preview(s,m);
   if(!p.ok)throw new Error(`preview rejected chosen move: ${p.reason}`);
   if(m.discard){results.swaps++;localSwaps++}
   const next=p.state;
   for(const b of next.boards)for(const e of b){
    const label=display(e);
    results.maxDisplayLength=Math.max(results.maxDisplayLength,label.length);
    results.maxBasisSize=Math.max(results.maxBasisSize,expressionSize(e));
    if(label.includes('tan(')||label.includes('cot('))results.tanCount++;
    if(/lim\[/.test(label))results.formalExprs++;
   }
   s=next;
  }
  results.matches++;results.turns+=s.turns;results.maxTurns=Math.max(results.maxTurns,s.turns);
  if(s.finished){results.complete++;if(s.winner===0)results.player0++;else if(s.winner===1)results.player1++;else results.draw++;}
  else {results.aborted++;results.samples.push({k,turns:s.turns,boards:s.boards.map(x=>x.map(display)),hands:s.hands});}
  if(k<5)results.samples.push({seed:k,turns:s.turns,winner:s.winner,swaps:localSwaps,finalBoard:s.boards.map(x=>x.map(display)).map(x=>x.slice(0,3))});
 }catch(e){results.errors.push({k,turns:s.turns,error:e.stack?.slice(0,300)||String(e)});}
}
console.log(JSON.stringify({...results,avgTurns:results.turns/Math.max(1,results.matches)},null,2));
