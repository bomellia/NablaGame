import {newGame,preview,chooseComMove,chooseLegacyComMove} from './engine.js';
const pairs=Number(process.argv[2]||1),cap=Number(process.argv[3]||8),start=Number(process.argv[4]||5678),timeMs=Number(process.argv[5]||1800);
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const rows=[];
for(let k=0;k<pairs;k++)for(const side of [0,1]){
 const seed=start+k*71,random=rng(seed);Math.random=random;
 let s=newGame({random,difficulty:'hard'}),steps=0,losses=[0,0],futures=0,newActions=0,maxMs=0;
 while(!s.finished&&s.turns<cap&&steps<cap*3){
  const isNew=s.turn===side;let diagnostics=false,t=Date.now();
  const move=isNew?chooseComMove(s,{timeMs,onProgress:(_m,d)=>{if(d?.phase==='future')diagnostics=true;}}):chooseLegacyComMove(s);
  if(isNew){newActions++;if(diagnostics)futures++;maxMs=Math.max(maxMs,Date.now()-t);}
  const p=preview(s,move);if(!p.ok)throw Error(p.reason);
  losses[s.turn]+=Math.max(0,-p.delta[1-s.turn]);s=p.state;steps++;
 }
 const row={seed,newSide:side,turns:s.turns,steps,winner:s.winner,finished:s.finished,dimensions:s.boards.map(b=>b.length),losses,futures,newActions,maxMs};
 rows.push(row);console.log(JSON.stringify(row));
}
console.log(JSON.stringify({games:rows.length,newWins:rows.filter(r=>r.finished&&r.winner===r.newSide).length,oldWins:rows.filter(r=>r.finished&&r.winner===1-r.newSide).length,unfinished:rows.filter(r=>!r.finished).length,draws:rows.filter(r=>r.finished&&r.winner===-1).length,completedFutureSearches:rows.reduce((a,r)=>a+r.futures,0),newActions:rows.reduce((a,r)=>a+r.newActions,0)},null,2));
