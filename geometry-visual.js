import {questionSceneKey} from './question-scenes.js';
const frac=(a,b)=>`<span class="gv-frac" role="math" aria-label="${a} 除以 ${b}"><span>${a}</span><span>${b}</span></span>`;
const pow=(a,b,n)=>`<span class="gv-power">(${frac(a,b)})<sup>${n}</sup></span>`;
const text=(x,y,s)=>`<text x="${x}" y="${y}" text-anchor="middle">${s}</text>`;
const line=(x1,y1,x2,y2,cls='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
const svg=(label,body)=>`<svg viewBox="0 0 320 250" role="img" aria-label="${label}"><title>${label}</title>${body}</svg>`;
const polygon=(points,cls='')=>`<polygon points="${points}" class="${cls}"/>`;
const rightTriangle=()=>svg('圓錐的半剖面：直立的是高 h，底部是半徑 r，斜邊是斜高 l',
  polygon('75,30 75,205 235,205','gv-fill')+line(75,30,75,205,'gv-height')+line(75,205,235,205,'gv-radius')+line(75,30,235,205,'gv-slant')+
  '<path d="M75 190 H90 V205"/>'+text(44,120,'高 h')+text(156,232,'半徑 r')+text(198,108,'斜高 l'));

// Cuts are fractions of the full height, measured from the common apex.
function cutDiagram(cuts,labels,pyramid=false){
  const x=t=>160-95*t, xr=t=>160+95*t, y=t=>30+170*t;
  const [a,b]=cuts;
  return svg(pyramid?'角錐剖面：上方小角錐，下方是留下的平截頭體':'圓錐剖面：由同一尖頂量高度；陰影是要保留的部分',
    polygon(`160,30 65,200 255,200`)+
    polygon(`${x(a)},${y(a)} ${xr(a)},${y(a)} ${xr(b)},${y(b)} ${x(b)},${y(b)}`,'gv-fill')+
    line(160,30,160,200,'gv-dash')+
    cuts.filter(t=>t>0&&t<1).map(t=>line(x(t),y(t),xr(t),y(t),'gv-cut')).join('')+
    text(160,18,'共同尖頂')+labels.map(([yy,s])=>text(160,yy,s)).join('')+
    text(160,238,pyramid?'沿中心切開看：不是底面的形狀':'沿中心切開看：圓錐的剖面'));
}
function spheres(){
  return svg('兩個球：表面面積比 4 比 9，半徑比要先開平方',
    '<circle cx="85" cy="122" r="44" class="gv-fill"/><ellipse cx="85" cy="122" rx="44" ry="12" class="gv-dash"/>'+
    '<circle cx="230" cy="122" r="66" class="gv-fill"/><ellipse cx="230" cy="122" rx="66" ry="18" class="gv-dash"/>'+
    line(85,122,129,122,'gv-radius')+line(230,122,296,122,'gv-radius')+
    text(85,205,'小球：r 未知')+text(230,220,'大球：r = 9 cm')+text(160,30,'表面面積比 4：9'));
}
function solids(){
  return svg('X 是圓柱，Y 和 Z 是圓錐；Z 半徑是 X 半徑的兩倍，不能先假設相似',
    '<path d="M20 75 V170 A32 10 0 0 0 84 170 V75 Z"/><ellipse cx="52" cy="75" rx="32" ry="10"/>'+
    polygon('155,55 123,170 187,170')+polygon('255,90 210,170 300,170')+
    text(52,205,'X：高 20')+text(155,205,'Y：高 24')+text(255,205,'Z：高未知')+
    text(52,231,'半徑 r')+text(155,231,'半徑 r')+text(255,231,'半徑 2r')+text(160,25,'體積：X + Y = Z'));
}
function bowtie(step){
  return svg('AC 平行 DB；三角形 ACE 與 BDE 的對應點是 A 對 B、C 對 D、E 對 E',
    polygon('55,45 175,45 145,105',step===0?'gv-fill':'')+
    polygon('145,105 100,195 280,195',step===1?'gv-fill':'')+
    line(55,45,280,195)+line(175,45,100,195)+
    line(55,45,175,45,'gv-radius')+line(100,195,280,195,'gv-radius')+
    text(42,42,'A')+text(187,42,'C')+text(160,108,'E')+text(87,208,'D')+text(292,208,'B')+
    text(160,238,'AC ↔ BD；AE ↔ BE；CE ↔ DE'));
}
function nestedTriangle(step){
  return svg('C、B、E 在同一直線，C、D、F 在同一直線，BD 平行 EF；比較 CBD 與 CEF',
    polygon('35,200 275,200 203,40',step===1?'gv-fill':'')+
    polygon('35,200 195,200 147,93.333',step===0?'gv-fill':'')+
    line(195,200,147,93.333,'gv-radius')+line(275,200,203,40,'gv-radius')+
    text(24,218,'C')+text(194,219,'B')+text(287,218,'E')+text(138,84,'D')+text(209,30,'F')+
    text(114,220,'x')+text(236,220,'6')+text(194,142,'8')+text(270,115,'x')+
    text(160,245,'只抽出 (a) 要用的兩個三角形'));
}
export function waterValues(depth){
  const h=Number(depth);
  if(!Number.isFinite(h)||h<0||h>60)throw new RangeError('Water depth must be between 0 and 60');
  return {depth:h,radius:h/3,fraction:(h/60)**3};
}
function waterDiagram(depth){
  const v=waterValues(depth),top=215-v.depth*3,half=v.depth;
  return svg(`倒置圓錐，水深 ${depth} cm，水面半徑 ${Number(v.radius.toFixed(2))} cm`,
    polygon('100,35 220,35 160,215')+
    polygon(`${160-half},${top} ${160+half},${top} 160,215`,'gv-fill')+
    line(160-half,top,160+half,top,'gv-cut')+line(160,35,160,215,'gv-dash')+
    text(160,23,'容器口：半徑 20 cm')+text(55,130,'高 60')+text(252,172,`水深 ${depth}`)+text(160,241,'水也是一個尖端向下的小圓錐'));
}
const step=(title,copy,formula,diagram)=>({title,copy,formula,diagram});
export const geometryLessons={
  '2018:14':{title:'水深一半，水量也是一半嗎？',steps:[
    step('先分清楚：不變的是水量','圓柱內的水倒進圓錐後，水的形狀變了，但水的體積沒有變。先算原本那一筒水。圖中的 30 cm 只是實驗例子，不是原題已知數或答案。','水的體積 = π × 8<sup>2</sup> × 64',()=>waterDiagram(30)),
    step('水深與水面半徑一起變','水面較低時，水面也較窄。水形成的小圓錐與整個容器相似；試把水深調到 30 cm，看看水量佔多少。',`${frac('水體積','容器容量')} = ${pow('水深',60,3)}`,()=>waterDiagram(30)),
    step('放入球，看看還有多少空位','題目已說球完全浸入水中，所以排開的水量等於整個球的體積。比較「原有水量 + 球體積」與容器容量，不是比較高度。',`球體積 = ${frac(4,3)}π × 14<sup>3</sup>；容器容量 = ${frac(1,3)}π × 20<sup>2</sup> × 60`,()=>waterDiagram(30))
  ],water:true},
  '2020:12':{title:'三段一樣高，不代表一樣大',steps:[
    step('由尖頂向下量','整個高 36 cm，三段各高 12 cm。中間那段不是小圓錐，要先找兩個都有同一尖頂的圓錐。','小圓錐高 12；較大圓錐高 24；整個高 36',()=>cutDiagram([1/3,2/3],[[65,'上段'],[122,'中間'],[188,'下段']])),
    step('中間 = 較大圓錐 − 小圓錐','先計高 24 cm 的圓錐，再扣走高 12 cm 的圓錐。體積比例要用立方。',`中間體積 = 整個體積 × [${pow(24,36,3)} − ${pow(12,36,3)}]`,()=>cutDiagram([1/3,2/3],[[120,'保留陰影部分']])),
    step('曲面也相減，但改用平方','題目只問曲面，不要加上下兩個圓形切面。先用半徑 15、高 36 求整個斜高。',`整個斜高 = √(15<sup>2</sup> + 36<sup>2</sup>)；曲面差 = 整個曲面 × [${pow(24,36,2)} − ${pow(12,36,2)}]`,rightTriangle)
  ]},
  '2021:14':{title:'同樣叫圓錐，也未必相似',steps:[
    step('把三個立體分開看','X 和 Y 的底半徑相同，但 X 是圓柱，Y 是圓錐。Z 的半徑等於 X 的直徑，即 2r。圖中 Z 的高度只是示意，不是答案。','V<sub>Z</sub> = V<sub>X</sub> + V<sub>Y</sub>',solids),
    step('先算體積，再檢查相似','用 Y 的體積 800π 和高 24 求 r，再求 X、Z 的體積。若 Y、Z 相似，半徑放大 2 倍，體積就必須放大 2³ 倍。',`${frac('VZ','VY')} 是否等於 ${pow('2r','r',3)}？`,solids),
    step('求曲面時，用斜高，不是直立的高','圓柱曲面用 2πrh；圓錐曲面用 πrl。Y、Z 各自用自己的半徑和高求斜高，不要混用。','l = √(r<sup>2</sup> + h<sup>2</sup>)',rightTriangle)
  ]},
  '2022:13':{title:'面積比 4：9，半徑不是 4：9',steps:[
    step('由面積比倒推半徑比','兩個球一定相似。面積比是半徑比的平方，所以先開平方，才得到半徑比。',`${frac('小球半徑','大球半徑')} = √${frac(4,9)} = ${frac(2,3)}`,spheres),
    step('再用立方求體積比','大球半徑是 9 cm。可先求小球半徑，再用球體積公式；不要把面積比 4/9 當作體積比。',`${frac('小球體積','大球體積')} = ${pow(2,3,3)}`,spheres),
    step('熔成圓錐後，要重新檢查相似','兩球的總體積 = 圓錐 A、B 的總體積。先扣去 A 的體積求 B；B 的半徑是 A 的 2 倍，若相似，高也要是 2 倍。','V<sub>B</sub> = 兩球總體積 − V<sub>A</sub>；再用 V = ⅓πr²h 求 B 的高',rightTriangle)
  ]},
  '2023:14':{title:'曲面 15 倍，要與哪一個比較？',steps:[
    step('分清楚半徑、高和斜高','已知半徑 14 cm、曲面 700π cm²。曲面公式中的 l 是斜高；先找到 l，再求直立的高。','π × 14 × l = 700π；h = √(l<sup>2</sup> − 14<sup>2</sup>)',rightTriangle),
    step('整個曲面 = 1 份 + 15 份','小圓錐 X 的曲面是 1 份，下面 Y 的曲面是 15 份，整個才是 16 份。X 與整個圓錐相似；X 與 Y 並不相似。',`${frac('X 曲面','整個曲面')} = ${frac(1,16)}；${frac('X 高','整個高')} = ${frac(1,4)}`,()=>cutDiagram([1/4,1],[[58,'X'],[145,'Y：留下的部分']])),
    step('先扣走 X，再平分成兩球','體積比例由高度比的立方得到。Y 熔成兩個相同球後，每球只用 Y 體積的一半；最後記得半徑乘 2 才是直徑。',`V<sub>Y</sub> = V<sub>整個</sub> × [1 − ${pow(1,4,3)}]；每球體積 = ${frac('VY',2)}`,()=>cutDiagram([1/4,1],[[58,'X'],[145,'Y → 兩個相同球']]))
  ]},
  '2024:13':{title:'18 cm 是上面，還是下面的高？',steps:[
    step('18 cm 屬於上面的小角錐 Y','整個高 24 cm，小角錐 Y 高 18 cm，所以留下的 X 高是 24 − 18 = 6 cm。底面是正方形，不是圓形。','正方形底面邊長 = 64 ÷ 4 = 16 cm',()=>cutDiagram([3/4,1],[[100,'Y：高 18'],[187,'X：高 6']],true)),
    step('小角錐與整個角錐相比','兩個都由同一尖頂開始，才是一對相似角錐。不要把 X 的高 6 直接拿去當小角錐的高。',`V<sub>X</sub> = ${frac(1,3)} × 16<sup>2</sup> × 24 × [1 − ${pow(18,24,3)}]`,()=>cutDiagram([3/4,1],[[100,'扣走 Y'],[187,'留下 X']],true)),
    step('比較 X 與 Z 時，才用它們的高','Z 高 3 cm；若 X 與 Z 相似，總表面面積比必須等於高度比的平方。仍要計 X 的總表面面積，不能單靠外觀判斷。',`${frac('Z 總表面面積','X 總表面面積')} 是否等於 ${pow(3,6,2)}？`,()=>cutDiagram([3/4,1],[[187,'X：高 6']],true))
  ]},
  '2025:14':{title:'留下 30 cm，切走的是多少？',steps:[
    step('整個 45，下面留下 30','上面的小圓錐高是 45 − 30 = 15 cm。先把這兩個高度放對位置，再寫比例。','小圓錐高 15 cm；留下 X 高 30 cm；整個底半徑 24 cm',()=>cutDiagram([1/3,1],[[68,'切走：高 15'],[153,'留下 X：高 30']])),
    step('體積用大減小','小圓錐與整個圓錐的高度比是 15/45，體積比就是這個分數的立方。',`V<sub>X</sub> = ${frac(1,3)}π × 24<sup>2</sup> × 45 × [1 − ${pow(15,45,3)}]`,()=>cutDiagram([1/3,1],[[68,'小圓錐'],[153,'X = 整個 − 小圓錐']])),
    step('總表面面積要加兩個圓面','先用大圓錐曲面減小圓錐曲面，再加上面的圓和下面的圓。重鑄正方體只保持體積，不保持表面面積。','X 總表面面積 = 曲面差 + πr<sub>小</sub><sup>2</sup> + π × 24<sup>2</sup>',()=>cutDiagram([1/3,1],[[68,'上圓面'],[153,'側面'],[220,'下圓面也要加']]))
  ]},
  '2023:8':{title:'蝴蝶形：先配好對應的邊',steps:[
    step('先找相同的角','AC 平行 DB，所以有內錯角相等；E 處還有一對對頂角。注意頂點順序：A 對 B，C 對 D，E 對 E。','△ACE ∼ △BDE',()=>bowtie(0)),
    step('分數上面小三角形，下面大三角形','AC 對 BD，不是 AC 對 BE。三個分數都保持「上面的三角形 ÷ 下面的三角形」，別倒轉其中一個。',`${frac('AC','BD')} = ${frac('AE','BE')} = ${frac('CE','DE')} = ${frac(10,15)}`,()=>bowtie(1)),
    step('AB 是兩段相加，不是其中一段','AB = AE + BE = 20。先按 2：3 分配這 20 cm，再求 DE。最後以 △BDE 最長的一邊檢查畢氏定理，不要看圖猜直角。','AE：BE = 2：3；AE + BE = 20',()=>bowtie(2))
  ]},
  '2026:8':{title:'把藏起來的兩個三角形抽出來',steps:[
    step('只看小 △CBD 和大 △CEF','先暫時不看 A。BD 平行 EF，兩個三角形有共同的 C 角，可以配出相似三角形。圖中的線長只是示意，不能用尺量答案。','C 對 C；B 對 E；D 對 F',()=>nestedTriangle(0)),
    step('把未知邊改叫 x','題目說 BC = EF，所以兩條都寫 x。CE 是 CB 加 BE，即 x + 6，不能只寫 6。',`${frac('CB','CE')} = ${frac('BD','EF')}，即 ${frac('x','x + 6')} = ${frac(8,'x')}`,()=>nestedTriangle(1)),
    step('交叉相乘，再解方程','左右同乘 x(x + 6)，便得到 x² = 8(x + 6)。解出的長度必須大於 0；(b) 證明全等要回到原圖，把 A 加回去。','x<sup>2</sup> = 8(x + 6)',()=>nestedTriangle(2))
  ]}
};
export function geometryLesson(q){
  if(!questionSceneKey(q))return null;
  const parent=String(q.q).match(/^\d+/)?.[0];
  if(!parent||!new RegExp(`^${parent}(?:$|\\()`).test(String(q.q)))return null;
  return geometryLessons[`${q.year}:${parent}`]||null;
}
function content(lesson,index){
  const s=lesson.steps[index];
  return `<h4>${index+1}. ${s.title}</h4>${s.diagram()}<p>${s.copy}</p><div class="gv-formula">${s.formula}</div>`;
}
function waterReadout(depth){
  const v=waterValues(depth);
  return `實驗水深 ${depth} cm：水量佔容器容量 ${(v.fraction*100).toFixed(1)}%。這不是原題水深的答案。`;
}
export function geometryVisual(q,state={}){
  const lesson=geometryLesson(q);
  if(!lesson)return '';
  const index=Number.isInteger(state.geometryStep)&&state.geometryStep>=0&&state.geometryStep<3?state.geometryStep:0;
  const depth=Number.isFinite(state.waterDepth)?Math.max(0,Math.min(60,state.waterDepth)):30;
  return `<details class="geometry-visual" ${state.geometryOpen?'open':''}><summary>看圖一步步想：${lesson.title}</summary>
    <div class="gv-body"><p class="gv-note">按「下一步」才會顯示更多提示。圖是學習示意，不按實際比例繪製；數字以原題為準。</p>
    <div class="gv-content">${content(lesson,index)}</div>
    <div class="gv-nav"><button type="button" data-gv-move="-1" ${index===0?'disabled':''}>上一步</button><span class="gv-count">${index+1} / 3</span><button type="button" data-gv-move="1" ${index===2?'disabled':''}>下一步</button></div>
    ${lesson.water?`<section class="gv-water"><h4>動手試水深（實驗，不改動原題）</h4><label for="gv-depth">實驗水深（cm）</label><input id="gv-depth" type="range" min="0" max="60" step="1" value="${depth}" aria-describedby="gv-water-result"><div class="gv-water-picture">${waterDiagram(depth)}</div><p id="gv-water-result">${waterReadout(depth)}</p><button type="button" data-gv-half>試試一半水深：30 cm</button></section>`:''}
    <span class="gv-status" role="status" aria-live="polite"></span></div></details>`;
}
export function bindGeometryVisual(container,q,state){
  const root=container.querySelector('.geometry-visual'),lesson=geometryLesson(q);
  if(!root||!lesson)return;
  root.addEventListener('toggle',()=>{state.geometryOpen=root.open;});
  root.addEventListener('click',event=>{
    const move=event.target.closest('[data-gv-move]');
    if(move){
      const index=Math.max(0,Math.min(2,(state.geometryStep||0)+Number(move.dataset.gvMove)));
      state.geometryStep=index;
      root.querySelector('.gv-content').innerHTML=content(lesson,index);
      root.querySelector('.gv-count').textContent=`${index+1} / 3`;
      root.querySelector('[data-gv-move="-1"]').disabled=index===0;
      root.querySelector('[data-gv-move="1"]').disabled=index===2;
      root.querySelector('.gv-status').textContent=`第 ${index+1} 步：${lesson.steps[index].title}`;
    }
  });
  const slider=root.querySelector('#gv-depth');
  if(slider){
    const update=()=>{
      state.waterDepth=Number(slider.value);
      root.querySelector('.gv-water-picture').innerHTML=waterDiagram(state.waterDepth);
      root.querySelector('#gv-water-result').textContent=waterReadout(state.waterDepth);
    };
    slider.addEventListener('input',update);
    slider.addEventListener('change',()=>{root.querySelector('.gv-status').textContent=waterReadout(state.waterDepth);});
    root.querySelector('[data-gv-half]').addEventListener('click',()=>{
      slider.value='30';update();root.querySelector('.gv-status').textContent=waterReadout(30);
    });
  }
}
