// Measure the real rendered equation (including KaTeX fractions and limits),
// not its source string length. Scaling never increases its natural size.
export function fitScale(width,height,naturalWidth,naturalHeight,padding=4){
 if(![width,height,naturalWidth,naturalHeight,padding].every(Number.isFinite)||Math.min(width,height,naturalWidth,naturalHeight)<=0)return 1;
 return Math.max(0,Math.min(1,Math.max(0,width-padding)/naturalWidth,Math.max(0,height-padding)/naturalHeight));
}
export function fitMath(root){
 if(!root?.querySelectorAll)return;
 for(const box of root.querySelectorAll('.card-symbol, #selected-card')){
  const ink=box.querySelector('.card-ink');if(!ink||!box.clientWidth||!box.clientHeight)continue;
  ink.style.transform='none';
  const r=ink.getBoundingClientRect();
  const scale=fitScale(box.clientWidth,box.clientHeight,r.width,r.height);
  ink.style.transform='scale('+scale+')';
 }
}
