/* Presentation only: numerical game state retains full available precision. */
export function fractionParts(value, limit=1000) {
 if(!Number.isFinite(value))return null;
 if(value===0)return {p:0,q:1};
 if(Number.isInteger(value))return {p:value,q:1};
 if(Math.abs(value)>1e8)return null;
 // Allow the 12-digit coefficients emitted by symbolic.js to recover fractions.
 for(let q=1;q<=limit;q++){
  const p=Math.round(value*q);
  if(p===0)continue;
  if(Math.abs(value-p/q)<=2e-11*Math.max(1,Math.abs(value)))return {p,q};
 }
 return null;
}
export function displayNumber(value) {
 if(!Number.isFinite(value))return '未定義';
 const fraction=fractionParts(value);
 if(fraction)return fraction.q===1?String(fraction.p):`${fraction.p}/${fraction.q}`;
 return String(Number(value.toPrecision(3)));
}
export function latexNumber(value) {
 if(!Number.isFinite(value))return '\\text{未定義}';
 const fraction=fractionParts(value);
 if(fraction)return fraction.q===1?String(fraction.p):`${fraction.p<0?'-':''}\\frac{${Math.abs(fraction.p)}}{${fraction.q}}`;
 return String(Number(value.toPrecision(3)));
}
