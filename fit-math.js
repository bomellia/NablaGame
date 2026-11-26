// Measure the real rendered equation (including KaTeX fractions and limits),
// not its source string length. Scaling never increases its natural size.
import {mathMarkup} from './latex.js?v=0.28';
export function fitScale(width,height,naturalWidth,naturalHeight,padding=4){
 if(![width,height,naturalWidth,naturalHeight,padding].every(Number.isFinite)||Math.min(width,height,naturalWidth,naturalHeight)<=0)return 1;
 return Math.max(0,Math.min(1,Math.max(0,width-padding)/naturalWidth,Math.max(0,height-padding)/naturalHeight));
}
const cache=new WeakMap();
export function fitMath(root){
 if(!root?.querySelectorAll)return;
 for(const box of root.querySelectorAll('.card-symbol, #selected-card, .basis-equation')){
  const ink=box.querySelector('.card-ink');if(!ink||!box.clientWidth||!box.clientHeight)continue;
  const basis=box.classList?.contains('basis-equation');
  let state=basis?cache.get(ink):null;
  if(basis&&!state){
   let variants=[];try{variants=JSON.parse(box.dataset?.previews||'[]');}catch{}
   state={full:ink.innerHTML,variants,rendered:new Map()};cache.set(ink,state);
  }
  if(state&&ink.innerHTML!==state.full)ink.innerHTML=state.full;
  ink.style.transform='none';
  const measure=()=>{const r=ink.getBoundingClientRect();return fitScale(box.clientWidth,box.clientHeight,r.width,r.height);};
  let scale=measure(),abbreviated=!!basis&&scale<.60;
  if(abbreviated&&state?.variants.length){
   let best={html:state.full,scale};
   for(const variant of state.variants){
    let html=state.rendered.get(variant.latex);
    if(html===undefined){html=mathMarkup(variant.latex,variant.text);state.rendered.set(variant.latex,html);}
    ink.innerHTML=html;
    const candidate=measure();
    if(candidate>best.scale)best={html,scale:candidate};
    if(candidate>=.60){best={html,scale:candidate};break;}
   }
   ink.innerHTML=best.html;scale=best.scale;
   abbreviated=best.html!==state.full;
  }
  box.classList?.toggle('equation-abbreviated',abbreviated);
  ink.style.transform='scale('+scale+')';
 }
}
