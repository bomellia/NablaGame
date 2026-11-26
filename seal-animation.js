// Presentation-only transitions. The committed game state is never delayed.
import {sealMarkup} from './sigil.js?v=0.32';
export const REWRITE_MS=1120, INSCRIBE_MS=760;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function transitionBoard(previous,next,removed=[],prior=[],now=Date.now()){
 const deleted=new Set(removed),survivors=previous.map((e,i)=>({e,i})).filter(z=>!deleted.has(z.i));
 return next.map((after,i)=>{
  const old=survivors[i];
  if(!old)return {before:null,after,start:now,duration:INSCRIBE_MS};
  if(!same(old.e,after))return {before:old.e,after,start:now,duration:REWRITE_MS};
  const existing=prior[old.i];
  return existing&&same(existing.after,after)&&now-existing.start<existing.duration?existing:null;
 });
}
// Stagger the actual SVG strokes in their construction order. Filled dots
// appear/disappear separately. pathLength normalizes circles and long spirals.
export function traceMarkup(svg,phase){
 const tags=Array.from(svg.matchAll(/<(circle|ellipse|polygon|path)\b[^>]*\/>/g));
 const count=tags.length;
 let index=0;
 return svg.replace(/<(circle|ellipse|polygon|path)\b([^>]*?)\/>/g,(_,tag,attrs)=>{
  const i=index++,dot=/class="seal-dot"/.test(attrs);
  const order=phase==='erase'?count-1-i:i;
  // Outer rings first on draw; reverse on erase. Keep all timings bounded.
  const offset=count>1?order/(count-1):0;
  const delay=Math.round(offset*(phase==='erase'?180:340));
  const duration=dot?(phase==='erase'?90:120):(phase==='erase'?210:380);
  return '<'+tag+attrs+' pathLength="1" data-trace="'+(dot?'dot':'line')+'" style="--stroke-delay:'+delay+'ms;--stroke-time:'+duration+'ms"/>';
 });
}
export function animationMarkup(transition,now=Date.now()){
 if(!transition)return '';
 const elapsed=Math.max(0,now-transition.start);
 if(elapsed>=transition.duration)return '';
 const rewrite=!!transition.before;
 const old=rewrite?'<span class="seal-trace-layer seal-erase">'+traceMarkup(sealMarkup(transition.before),'erase')+'</span>':'';
 const next='<span class="seal-trace-layer seal-draw">'+traceMarkup(sealMarkup(transition.after),'draw')+'</span>';
 return '<span class="seal-animation '+(rewrite?'seal-rewrite':'seal-inscribe')+'" aria-hidden="true" style="--elapsed:'+elapsed+'ms;--total:'+transition.duration+'ms;--draw-start:'+(rewrite?390:0)+'ms">'+old+next+'</span>';
}
