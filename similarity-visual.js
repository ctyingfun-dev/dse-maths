export function similarityValues(z){
  const n=Number(z);
  if(!Number.isInteger(n)||n<1||n>6)throw new RangeError('Ratio must be an integer from 1 to 6');
  return {z:n,area:n*n,volume:n**3,total:8+27+n**3,share:27/(35+n**3)};
}
const fraction=(a,b)=>`<span class="sv-fraction" aria-label="${a} 除以 ${b}"><span>${a}</span><span>${b}</span></span>`;
const power=(a,b,n)=>`<span class="sv-power" role="math" aria-label="${a} 除以 ${b} 的${n===2?'平方':'立方'}"><span aria-hidden="true" class="sv-power-base"><span>(</span>${fraction(a,b)}<span>)</span></span><sup aria-hidden="true">${n}</sup></span>`;
function cylinders(z){
  return `<svg class="sv-diagram" viewBox="0 0 360 245" role="img" aria-label="相似圓柱 X、Y、Z，半徑和高度同時按 2：3：${z} 縮放">${[2,3,z].map((r,i)=>{
    const cx=60+120*i,rx=r*8,h=r*22,ry=r*2.8,y=192;
    return `<g class="sv-cylinder sv-cylinder-${i}"><path d="M${cx-rx} ${y-h} V${y} A${rx} ${ry} 0 0 0 ${cx+rx} ${y} V${y-h}" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="2"/><ellipse cx="${cx}" cy="${y-h}" rx="${rx}" ry="${ry}" fill="white" stroke="currentColor" stroke-width="2"/><path d="M${cx} ${y-h} h${rx}" stroke="currentColor" stroke-width="2"/><text x="${cx}" y="225" text-anchor="middle">${['X','Y','Z'][i]} · 半徑 ${r} 份</text></g>`;
  }).join('')}</svg>`;
}
function results(z){
  const v=similarityValues(z);
  return `${cylinders(z)}
  <div class="sv-comparisons">
    <div><b>① 邊長比</b><div>${fraction('Z 半徑','Y 半徑')} = ${fraction(z,3)}</div></div>
    <div><b>② 面積比 = 邊長比的平方</b><div>${fraction('Z 總表面面積','Y 總表面面積')} = ${power(z,3,2)} = ${fraction(v.area,9)}</div></div>
    <div><b>③ 體積比 = 邊長比的立方</b><div>${fraction('Z 體積','Y 體積')} = ${power(z,3,3)} = ${fraction(v.volume,27)}</div></div>
  </div>
  <div class="sv-volume"><b>把三個圓柱的體積份數加起來</b>
  <div class="sv-bar" role="img" aria-label="X 體積 8 份，Y 體積 27 份，Z 體積 ${v.volume} 份"><span style="flex:${8}"></span><span style="flex:${27}"></span><span style="flex:${v.volume}"></span></div>
  <div class="sv-legend"><span>X：8 份</span><span>Y：27 份</span><span>Z：${v.volume} 份</span></div>
  <div class="sv-share">${fraction('Y 體積','總體積')} = ${fraction(27,`8 + 27 + ${v.volume}`)} = ${fraction(27,v.total)}</div></div>
  <div class="sv-message">${z===5?'原題比例 2：3：5：Y 佔總體積的 27/160，不是半徑所佔的 3/10。':(z===6?'看到了嗎？Z 的半徑是 Y 的 2 倍，面積是 4 倍，體積是 8 倍。':'')+'現在是實驗比例 2：3：'+z+'，不是原題答案。按「回到原題」可還原。'}</div>`;
}
export function similarityVisual(q,state){
  if(q.year!=='2026'||!(q.q==='13'||q.q.startsWith('13(')))return '';
  const z=state.z;
  return `<details class="similarity-visual" ${state.open?'open':''}>
  <summary>動手看：半徑改變，體積會怎樣？</summary>
  <div class="sv-body"><p>先猜一猜：Z 的半徑是 Y 的 2 倍，體積也是 2 倍嗎？把滑桿推到 6，看看結果。</p>
  <label class="sv-label" for="sv-ratio">Z 的半徑：<output id="sv-value">${z}</output> 份（Y 固定 3 份）</label>
  <input id="sv-ratio" type="range" min="1" max="6" step="1" value="${z}" aria-describedby="sv-experiment">
  <div class="sv-actions"><button type="button" data-sv-set="3">試試一樣大</button><button type="button" data-sv-set="6">試試 2 倍</button><button type="button" data-sv-set="5">回到原題</button></div>
  <p id="sv-experiment" class="sv-note">拖動時，Z 的半徑和高一起改變，才保持相似。圖用「比例份數」，不是實際 cm；拖動是在試另一組比例，不會改動原題。</p>
  <div class="sv-results">${results(z)}</div>
  <div class="sv-live" role="status" aria-live="polite"></div>
  <p class="sv-note">圖像是圓柱的示意投影。相似圓柱可以用平方比較總表面面積，但球與圓柱不相似，不能直接套用這個比率。這裏只探索比例，實際體積和半徑仍要按原題計算。</p>
  </div></details>`;
}
export function bindSimilarityVisual(container,state){
  const root=container.querySelector('.similarity-visual');
  if(!root)return;
  const slider=root.querySelector('#sv-ratio');
  const update=value=>{
    const v=similarityValues(value);state.z=v.z;
    slider.value=String(v.z);
    root.querySelector('#sv-value').textContent=v.z;
    root.querySelector('.sv-results').innerHTML=results(v.z);
  };
  const announce=()=>{
    const v=similarityValues(state.z);
    root.querySelector('.sv-live').textContent=`Z 半徑 ${v.z} 份；面積比 ${v.area}/9，體積比 ${v.volume}/27。${v.z===5?'已回到原題。':'現在是實驗比例。'}`;
  };
  root.addEventListener('toggle',()=>{state.open=root.open;});
  slider.addEventListener('input',()=>update(slider.value));
  slider.addEventListener('change',announce);
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-sv-set]');
    if(button){update(button.dataset.svSet);announce();}
  });
}
