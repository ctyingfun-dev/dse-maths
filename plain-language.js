// Translate complete phrases only; retain the original summary for comparison.
const phrases=[
  ['抽取共同二項因式','找出各組都有的相同括號，再提出括號'],
  ['抽取公因式','找出每一項都有的因數，再把它提出來'],
  ['辨認完全平方三項式','看看三項能否寫成同一個括號的平方'],
  ['辨認完全平方','看看能否寫成同一個式子的平方'],
  ['利用平方差分解','把兩個平方相減寫成「一加一減」兩個括號相乘'],
  ['分解二次三項式','把二次三項式寫成兩個括號相乘'],
  ['分解二次式','把二次式寫成因式相乘'],
  ['利用指數法則化簡','按次方的乘除規則，把式子寫得簡潔一些'],
  ['化簡指數式','按次方的規則，把式子寫得簡潔一些'],
  ['求兩個不等式解集的交集','找出同時符合兩個不等式的數值範圍'],
  ['計算正整數解個數','數一數有多少個大於 0 的整數符合條件'],
  ['逆向求原值','從改變後的數值倒推原本的數值'],
  ['判斷三點共線','判斷三個點是否在同一直線上'],
  ['求反射及旋轉後坐標','找出圖形翻轉及轉動後，各點的位置']
];
export function plainSummary(text=''){
  let result=text.replace(/將 ([A-Za-z]) 變為公式主項/g,(_,letter)=>`把公式整理成「${letter} = …」的形式`);
  for(const [formal,plain] of phrases)result=result.replaceAll(formal,plain);
  return result;
}
