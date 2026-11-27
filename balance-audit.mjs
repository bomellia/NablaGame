import {newGame,chooseComMove,preview} from './engine.js';
import {LIMIT_CARDS} from './cards.js';
const total=Number(process.argv[2]||4),cap=Number(process.argv[3]||35),start=Number(process.argv[4]||123456);
const seedRandom=seed=>{let a=seed>>>0;return()=>((a=(Math.imul(a,1664525)+1013904223)>>>0)/4294967296);};
const rows=[];
for(let k=0;k<total;k++){
 const seed=start+k*71,rng=seedRandom(seed);Math.random=rng;
 let s=newGame({random:rng,difficulty:'hard',extended:true}),steps=0,attacks=0,limitKills=0,limitUses=0,swaps=0,turnLoss=0,maxBurst=0,lastKill=null,losses={};
 while(!s.finished&&s.turns<cap&&steps<cap*3){
  const move=chooseComMove(s);if(!move)break;
  const id=move.pass?'PASS':move.discard?'SWAP':s.hands[s.turn][move.cardIndex];
  const p=preview(s,move);if(!p.ok)throw Error(p.reason);
  const kill=Math.max(0,-p.delta[1-s.turn]);if(move.discard)swaps++;
  if(LIMIT_CARDS.includes(id))limitUses++;
  if(kill){attacks+=kill;losses[id]=(losses[id]||0)+kill;if(LIMIT_CARDS.includes(id))limitKills+=kill;lastKill=id;turnLoss+=kill;maxBurst=Math.max(maxBurst,turnLoss);}
  if(p.state.turn!==s.turn)turnLoss=0;s=p.state;steps++;
 }
 const row={seed,finished:s.finished,winner:s.winner,turns:s.turns,steps,attacks,limitKills,limitUses,swaps,maxBurst,lastKill,losses,dim:s.boards.map(b=>b.length)};rows.push(row);console.log(JSON.stringify(row));
}
const attacks=rows.reduce((a,r)=>a+r.attacks,0),limitKills=rows.reduce((a,r)=>a+r.limitKills,0);
console.log(JSON.stringify({matches:rows.length,finished:rows.filter(r=>r.finished).length,attacks,limitKills,limitShare:attacks?limitKills/attacks:null},null,2));
