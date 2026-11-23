const names={sin:'\\sin',cos:'\\cos',tan:'\\tan',cot:'\\cot',sec:'\\sec',csc:'\\csc',exp:'\\exp',log:'\\ln',asin:'\\arcsin',acos:'\\arccos',atan:'\\arctan',Li:'\\operatorname{Li}',Ei:'\\operatorname{Ei}',Si:'\\operatorname{Si}',Ci:'\\operatorname{Ci}',erf:'\\operatorname{erf}',erfi:'\\operatorname{erfi}',FresnelS:'\\operatorname{S}',FresnelC:'\\operatorname{C}'};
const round=s=>'\\left('+s+'\\right)';
export function toLatex(e){
 if(!e||typeof e!=='object')return '\\text{?}';
 switch(e.t){
 case 'n':return String(e.v);
 case 'x':return 'x';
 case 'a':return e.v.map((t,i)=>{const s=toLatex(t);return i===0?s:s.startsWith('-')?' - '+s.slice(1):' + '+s}).join('')||'0';
 case 'm':{
  const top=[],bottom=[];
  for(const f of e.v)if(f.t==='p'&&f.e<0)bottom.push(f.e===-1?toLatex(f.b):toLatex({...f,e:-f.e}));else top.push(f);
  let sign='';
  if(top[0]?.t==='n'&&top[0].v<0){sign='-';top[0]={...top[0],v:-top[0].v};if(top[0].v===1&&top.length>1)top.shift()}
  const up=top.map(f=>f.t==='a'?round(toLatex(f)):toLatex(f)).join('\\,')||'1';
  return bottom.length?sign+'\\frac{'+up+'}{'+bottom.join('\\,')+'}':sign+up;
 }
 case 'p':{
  if(e.e===1)return toLatex(e.b);
  if(e.e<0)return '\\frac{1}{'+(e.e===-1?toLatex(e.b):toLatex({...e,e:-e.e}))+'}';
  return (['x','n','f'].includes(e.b?.t)?toLatex(e.b):round(toLatex(e.b)))+'^{'+e.e+'}';
 }
 case 'f':{
  const arg=toLatex(e.arg);
  if(e.f==='sqrt')return '\\sqrt{'+arg+'}';
  if(e.f==='abs')return '\\left|'+arg+'\\right|';
  if(e.f==='logabs')return '\\ln\\left|'+arg+'\\right|';
  return (names[e.f]||'\\operatorname{'+String(e.f).replace(/[^A-Za-z]/g,'')+'}')+round(arg);
 }
 case 'I':return '\\int '+toLatex(e.arg)+'\\,\\mathrm{d}x';
 case 'D':return '\\frac{\\mathrm{d}'+(e.order>1?'^{'+e.order+'}':'')+'}{\\mathrm{d}x'+(e.order>1?'^{'+e.order+'}':'')+'}'+round(toLatex(e.arg));
 case 'L':{
  const at=e.point==='plus'?'+\\infty':e.point==='minus'?'-\\infty':e.side==='plus'?'0^+':e.side==='minus'?'0^-':'0';
  return (e.kind==='sup'?'\\limsup':e.kind==='inf'?'\\liminf':'\\lim')+'_{x\\to '+at+'} '+toLatex(e.arg);
 }
 default:return '\\text{?}';
 }
}
const cards={ZERO:'0',ONE:'1',X:'x',X2:'x^2',EXP:'e^x',SIN:'\\sin x',COS:'\\cos x',NABLA:'\\nabla',DELTA:'\\Delta',DIFF:'\\frac{\\mathrm{d}}{\\mathrm{d}x}',INTEGRATE:'\\int\\mathrm{d}x',MUL:'\\times',DIV:'\\div',LIM_PLUS:'\\lim_{x\\to+\\infty}',LIM_MINUS:'\\lim_{x\\to-\\infty}',LIM_ZERO:'\\lim_{x\\to0}',LIMSUP:'\\limsup',LIMINF:'\\liminf',SQRT:'\\sqrt{\\phantom{x}}',INVERSE:'f^{-1}',LOG:'\\ln',PLUS_C:'+C',REFLECT:'x\\mapsto-x'};
export const cardLatex=id=>cards[id]||'\\text{?}';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mathMarkup(latex,fallback=''){
 if(typeof window!=='undefined'&&window.katex?.renderToString)try{return window.katex.renderToString(latex,{throwOnError:false,trust:false,strict:'ignore',maxExpand:300})}catch{}
 return esc(fallback||latex);
}
