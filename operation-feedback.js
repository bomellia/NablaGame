// Presentation-only translation. Never alter the engine's original reason or save data.
const messages=new Map([
 ['四則演算は相手の場にのみ使用できます','Arithmetic targets the enemy field only.'],
 ['交換時は手札の極限カードをすべて交換してください','All limit cards must be swapped.'],
 ['上極限・下極限には無限遠で実数値を取ることの確認が必要です','Upper and lower limits require a verified real-valued tail.'],
 [
  "微分結果を確定できません",
  "Derivative cannot be determined."
 ],
 [
  "対戦は終了しています",
  "The duel has ended."
 ],
 [
  "カードが選択されていません",
  "Select a card."
 ],
 [
  "カードが不正です",
  "Invalid card."
 ],
 [
  "連続演算・追加行動では基底を追加できません",
  "Cannot add a basis during a chain or bonus."
 ],
 [
  "2つ目の演算は同じ基底に適用してください",
  "Apply the next operation to the same basis."
 ],
 [
  "個別演算のみ連続使用できます",
  "Only single-target operations can be chained."
 ],
 [
  "対象のプレイヤーが不正です",
  "Invalid field."
 ],
 [
  "対象の基底を選んでください",
  "Select a target basis."
 ],
 [
  "次元上限は4です",
  "Maximum dimension is 4."
 ],
 [
  "同じ場の異なる2基底を選んでください",
  "Select two distinct bases on one field."
 ],
 [
  "積分区間を指定してください",
  "Select an integration interval."
 ],
 [
  "D±1 の符号を選んでください",
  "Select the sign of D ± 1."
 ],
 [
  "倍率aを選んでください",
  "Select the scale factor a."
 ],
 [
  "先攻1ターン目のΔは使用できません",
  "Delta is unavailable on the opening turn."
 ],
 [
  "別の関数カードが必要です",
  "Select another function card."
 ],
 [
  "合成順序（外側・内側）を指定してください",
  "Select outer and inner functions."
 ],
 [
  "演算の順序を指定してください",
  "Select the order of operands."
 ],
 [
  "定数Cを選択してください",
  "Select the constant C."
 ],
 [
  "追加カードのCは0以外にしてください",
  "Choose a nonzero C."
 ],
 [
  "0への極限の向きを選択してください",
  "Select the direction of the limit at zero."
 ],
 [
  "0の逆数は定義されません",
  "Reciprocal of zero is undefined."
 ],
 [
  "恒等的に0となる式では除算できません",
  "Cannot divide by an identically zero function."
 ],
 [
  "この極限は振動・左右差などにより存在しません",
  "Limit does not exist."
 ],
 [
  "極限の収束・発散を厳密に判定できません（未評価のまま使用不可）",
  "Limit cannot be resolved."
 ],
 [
  "未対応カードです",
  "Unsupported card."
 ],
 [
  "山札データが不正です",
  "Invalid deck data."
 ],
 [
  "追加行動中のみ終了できます",
  "End is available only during a bonus or chain."
 ],
 [
  "連続演算・追加行動中は交換できません",
  "Cannot swap cards during a chain or bonus."
 ],
 [
  "交換するカードを正しく選択してください",
  "Select valid cards to swap."
 ],
 [
  "演算結果を確定できません",
  "Result cannot be determined."
 ],
 [
  "この操作からは連続演算できません",
  "This operation cannot be chained."
 ],
 [
  "0で除算できません",
  "Division by zero."
 ],
 [
  "複素数の分数乗は未対応です",
  "Fractional complex powers are unsupported."
 ],
 [
  "ln(0)は未定義です",
  "Logarithm of zero is undefined."
 ],
 [
  "この複素数値関数の主枝計算は未対応です",
  "Principal branch is unsupported."
 ],
 [
  "この関数の合成は未対応です",
  "This composition is unsupported."
 ],
 [
  "複素数値関数の逆関数は未対応です",
  "Complex inverse functions are unsupported."
 ],
 [
  "このラプラス変換の収束または閉じた結果を確定できません",
  "Laplace transform cannot be resolved."
 ],
 [
  "この逆ラプラス変換は未対応です",
  "Inverse Laplace transform is unsupported."
 ],
 [
  "通常関数としてのフーリエ変換を確定できません（超関数は対象外）",
  "Fourier transform cannot be resolved as an ordinary function."
 ],
 [
  "広義積分の収束と値を確定できません",
  "Improper integral cannot be resolved."
 ],
 [
  "積分区間内の特異点・実数定義域を確認できません",
  "Cannot verify the domain or singularities."
 ],
 [
  "広義積分の境界で有限な収束値を確定できません",
  "No verified finite boundary limit."
 ],
 [
  "未対応の積分区間",
  "Unsupported integration interval."
 ],
 [
  "原始関数の左右の境界値を一致させられません",
  "Antiderivative boundary values do not agree."
 ],
 [
  "未対応の演算カード",
  "Unsupported operation card."
 ],
 [
  "式が不正です",
  "Invalid expression."
 ],
 [
  "数値が大きすぎます",
  "Number is too large."
 ],
 [
  "指数を有限数として表現できません",
  "Exponent is not finite."
 ],
 [
  "実数で定義されません",
  "Undefined over the reals."
 ],
 [
  "数値計算の表現範囲を超えています",
  "Numerical range exceeded."
 ],
 [
  "対数の実数定義域が空です",
  "Logarithm has no real domain."
 ],
 [
  "log|0|は未定義です",
  "Logarithm of zero is undefined."
 ],
 [
  "平方根の実数定義域が空です",
  "Square root has no real domain."
 ],
 [
  "逆三角関数の定義域外です",
  "Outside the inverse trigonometric domain."
 ],
 [
  "未知の式形式です",
  "Unknown expression type."
 ],
 [
  "関数カードではありません",
  "Not a function card."
 ],
 [
  "この式の微分はまだ非対応です",
  "Derivative is unsupported."
 ],
 [
  "この式の積分は試作版では未対応です",
  "Integral is unsupported."
 ],
 [
  "変数置換に未対応です",
  "Substitution is unsupported."
 ],
 [
  "逆関数は単調な既知の形だけに対応します",
  "Inverse requires a supported monotonic function."
 ],
 [
  "tan の極に当たります",
  "Tangent pole."
 ],
 [
  "cot の極に当たります",
  "Cotangent pole."
 ],
 [
  "sec の極に当たります",
  "Secant pole."
 ],
 [
  "csc の極に当たります",
  "Cosecant pole."
 ],
 [
  "erfinv の実数定義域外です",
  "Outside the real inverse error function domain."
 ],
 [
  "Lambert W の実数主枝の定義域外です",
  "Outside the real principal branch of Lambert W."
 ],
 [
  "acosh の定義域外です",
  "Outside the inverse hyperbolic cosine domain."
 ],
 [
  "atanh の定義域外です",
  "Outside the inverse hyperbolic tangent domain."
 ],
 [
  "未対応の関数を微分できません",
  "Derivative of this function is unsupported."
 ],
 [
  "未知の式を微分できません",
  "Cannot differentiate an unknown expression."
 ],
 [
  "未評価の積分を積み重ねる操作は許可されません",
  "Cannot stack unresolved integrals."
 ],
 [
  "未評価の極限式は積分できません",
  "Cannot integrate an unresolved limit."
 ],
 [
  "この積分は対応済みの初等関数・特殊関数で表せません",
  "No supported closed form for this integral."
 ],
 [
  "未評価の積分式は場に追加できません",
  "Cannot add an unresolved integral."
 ],
 [
  "式データが破損しています",
  "Corrupted expression data."
 ],
 [
  "逆関数の式が複雑すぎます",
  "Inverse expression is too complex."
 ],
 [
  "定数関数には逆関数がありません",
  "Constant functions have no inverse."
 ],
 [
  "符号関数には逆関数がありません",
  "Sign function has no inverse."
 ],
 [
  "実数の逆関数の主枝を確定できません",
  "Real inverse branch cannot be determined."
 ],
 [
  "恒等的に0で除算できません",
  "Cannot divide by an identically zero function."
 ],
 [
  "演算を実行できません。",
  "Operation unavailable."
 ],
 [
  "操作できません",
  "Operation unavailable."
 ],
 [
  "同じ基底を選択してください。",
  "Select the same basis."
 ],
 [
  "場の基底と手札の関数カードを1枚ずつ選択してください。",
  "Select one basis and one function card."
 ],
 [
  "同じ場の異なる2基底を選んでください。",
  "Select two distinct bases on one field."
 ],
 [
  "追加できる演算がありません。ターンを終了してください。",
  "No further operation. End the turn."
 ],
 [
  "合法手が見つかりません。カード交換を試してください。",
  "No legal move. Try swapping cards."
 ],
 [
  "提案した対象を確認して実行します。",
  "Confirm the suggested target."
 ],
 [
  "積分できません",
  "Integral cannot be evaluated."
 ]
]);
export function feedbackEnglish(reason){
 const s=String(reason??'').trim();
 if(!s)return '';
 if(messages.has(s))return messages.get(s);
 // Unknown future diagnostics still receive an intelligible English summary.
 if(/[ぁ-んァ-ヶ一-龯]/.test(s)){
  if(/積分/.test(s))return 'Integral cannot be evaluated.';
  if(/極限/.test(s))return 'Limit cannot be resolved.';
  if(/微分/.test(s))return 'Derivative cannot be determined.';
  if(/定義域|未定義/.test(s))return 'Outside the supported domain.';
  if(/逆関数/.test(s))return 'Inverse cannot be determined.';
  return 'Operation unavailable.';
 }
 return s;
}
