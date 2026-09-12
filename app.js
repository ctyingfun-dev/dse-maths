import {matchingQuestions, normalizeQuestion} from './matching.js';
import {techniques, questionHints} from './techniques.js';
const main=document.querySelector('main'), dialog=document.querySelector('dialog');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<i data-lucide="${name}"></i>`;
const sectionName={A1:'甲一',A2:'甲二',B:'乙部'};
const yearName=y=>y==='PP'?'PP 練習卷':`${y} DSE`;
const key=q=>`${q.year}:${q.q}`;
const yearSort=(a,b)=>(Number(b)||0)-(Number(a)||0);
let data, stored={}, memoryOnly=false;
try{stored=JSON.parse(localStorage.getItem('dse-practice-v1')||'{}');if(!stored||Array.isArray(stored)||typeof stored!=='object')stored={};stored=Object.fromEntries(Object.entries(stored).filter(([,v])=>v&&typeof v==='object'));}catch{memoryOnly=true;}
let state={route:'find',level:'part',year:'2026',q:'4(b)',source:null,selected:[],match:'all',section:'all',pp:false,page:1,
  topicSection:'all',topicSearch:'',topicPage:1,topicDetail:null,guide:'foundation',savedFilter:'all',savedPage:1};
let viewer=null, lastFocus=null;
const icons=()=>window.lucide?.createIcons();
function persist(){try{localStorage.setItem('dse-practice-v1',JSON.stringify(stored));}catch{memoryOnly=true;toast('瀏覽器未能儲存；本次操練紀錄只會暫存。');}}
function toast(text){const t=document.querySelector('#toast');t.textContent=text;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2200);}
const isSaved=q=>Boolean(stored[key(q)]?.saved);
const isDone=q=>Boolean(stored[key(q)]?.done);
function save(q){const k=key(q);stored[k]={...stored[k],saved:!isSaved(q),time:Date.now()};persist();toast(isSaved(q)?'已加入我的操練':'已移出我的操練');updateCount();}
function done(q){const k=key(q);stored[k]={...stored[k],saved:true,done:!isDone(q),time:Date.now()};persist();toast(isDone(q)?'已標記完成':'已改為待完成');updateCount();}
function updateCount(){document.querySelector('#saved-count').textContent=Object.values(stored).filter(x=>x.saved).length;}
function head(kicker,title,desc,right=''){return `<div class="page-head"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p class="lead">${desc}</p></div>${right}</div>`;}
function segment(items,current,action){return `<div class="segmented">${items.map(([v,l])=>`<button data-action="${action}" data-value="${v}" aria-pressed="${v===current}">${l}</button>`).join('')}</div>`;}
function empty(title,text,action=''){return `<div class="empty">${icon('notebook-pen')}<h2>${title}</h2><p>${text}</p>${action}</div>`;}
function techniqueCopy(t){
  return `<p class="tech-recognize">${esc(t.recognize)}</p><h4>解題步驟</h4><ol>${t.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="tech-caution"><strong>容易失分</strong>${esc(t.mistake)}</p><h4>小例子</h4><p class="tech-example">${esc(t.example)}</p>`;
}
function station(topics,scope){
  const options=techniques.map((t,i)=>({...t,i})).filter(t=>topics.includes(t.topic));
  if(!options.length)return '';
  const selected=scope==='viewer'&&options.some(t=>t.i===viewer.method)?viewer.method:options[0].i;
  return `<details class="technique-station" data-station="${scope}" ${scope==='viewer'&&viewer.stationOpen?'open':''}><summary>${icon('lightbulb')}<span>題型技巧站<small>辨認特徵 · 解題步驟 · 易錯位</small></span>${icon('chevron-down')}</summary><div class="station-content"><label class="field" for="technique-${scope}">課題與方法<select id="technique-${scope}" data-technique="${scope}">${options.map(t=>`<option value="${t.i}" ${selected===t.i?'selected':''}>${esc(t.topic)} · ${esc(t.title)}</option>`).join('')}</select></label><p class="tech-scope">共用方法參考；先核對題目條件，不代表每題都適用。</p><div class="technique-copy">${techniqueCopy(techniques[selected])}</div></div></details>`;
}
function hintContent(q){
  const hints=questionHints[key(q)],count=viewer.hints[key(q)]||0;
  return `<div class="hint-copy" aria-live="polite">${hints.slice(0,count).map((text,i)=>`<p><strong>${['觀察重點','第一步','關鍵檢查'][i]}</strong>${esc(text)}</p>`).join('')}</div>${count<hints.length?`<button class="text-button" data-action="reveal-hint" data-id="${esc(key(q))}">${icon('eye')}提示 ${count+1}</button>`:''}${count?`<button class="icon-button" data-action="reset-hints" data-id="${esc(key(q))}" aria-label="收起 Q${esc(q.q)} 的提示" data-tip="收起提示">${icon('rotate-ccw')}</button>`:''}`;
}
function hintsPanel(q){
  const parts=q.parts||[q],available=parts.filter(p=>questionHints[key(p)]);
  return `<section class="question-hints" aria-label="本題提示"><h3>${icon('signpost')}本題提示</h3>${available.length?available.map(p=>`<div class="hint-part" data-hint-id="${esc(key(p))}"><h4>Q${esc(p.q)}</h4><div class="hint-content">${hintContent(p)}</div></div>`).join(''):'<p class="tech-scope">本題尚未加入已核對原卷的專屬提示，可先參考下方共用技巧。</p>'}${available.length&&available.length<parts.length?'<p class="tech-scope">其餘分題的專屬提示尚待核對。</p>':''}${available.length?'<p class="tech-scope">按原卷編寫的操練提示，非官方評分準則。</p>':''}</section>`;
}
function pool(){return state.level==='whole'?data.groups:data.questions;}
function getQuestion(id,whole=false){return (whole?data.groups:data.questions).find(q=>key(q)===id)||data.groups.find(q=>key(q)===id);}
function pager(total,page,action){const n=Math.ceil(total/6);return n>1?`<div class="pager"><button class="icon-button" data-action="${action}" data-value="${page-1}" ${page===1?'disabled':''} aria-label="上一頁">${icon('chevron-left')}</button><span>第 ${page} / ${n} 頁</span><button class="icon-button" data-action="${action}" data-value="${page+1}" ${page===n?'disabled':''} aria-label="下一頁">${icon('chevron-right')}</button></div>`:'';}
function card(q,{match=true}={}){
  const saved=isSaved(q), complete=isDone(q), whole=Boolean(q.parts);
  return `<article class="question-card ${complete?'completed':''}">
    <div class="card-top"><div class="card-kicker"><span class="dot ${q.exact?'exact':''}"></span>${match?(q.exact?'課題完全相同':`相同課題 ${q.shared?.length||0} 項`):sectionName[q.section]}${q.year==='PP'?' · 練習卷':''}</div><button class="icon-button ${saved?'on':''}" data-action="save" data-id="${esc(key(q))}" data-whole="${whole}" aria-label="${saved?'取消收藏':'收藏'} ${esc(yearName(q.year))} Q${esc(q.q)}" aria-pressed="${saved}" data-tip="${saved?'取消收藏':'加入操練'}">${icon('bookmark')}</button></div>
    <h3>${yearName(q.year)} <span>Q${esc(q.q)}</span></h3><p class="q-summary">${esc(q.summary)}</p>
    <div class="tags">${q.topics.map(t=>`<span class="tag ${(q.shared||[]).includes(t)?'matched':''}">${esc(t)}</span>`).join('')}</div>
    <div class="card-bottom"><span class="hint">${sectionName[q.section]} · 大題 ${q.parentMarks} 分</span><button class="text-button" data-action="open" data-id="${esc(key(q))}" data-whole="${whole}">查看原題 ${icon('arrow-up-right')}</button></div>
    ${complete?`<div class="done-label">${icon('circle-check')}已完成</div>`:''}
  </article>`;
}
function searchForm(){
  const years=Object.keys(data.papers).sort(yearSort);
  const options=pool().filter(q=>q.year===state.year);
  return `<section class="search-tool" aria-label="按年份及題號搜尋"><div class="search-top"><h2>${icon('scan-search')}從手上的題目開始</h2>${segment([['part','分題'],['whole','整題']],state.level,'level')}</div>
  <form id="search-form" novalidate><div class="search-fields"><label class="field">年份<select name="year" id="year">${years.map(y=>`<option value="${y}" ${y===state.year?'selected':''}>${y==='PP'?'PP · 練習卷':y+' 年'}</option>`).join('')}</select></label>
  <label class="field">題號<input name="question" id="question" list="question-options" value="${esc(state.q)}" placeholder="${state.level==='whole'?'例如 4':'例如 4(b)'}" autocomplete="off" required aria-describedby="search-error"><datalist id="question-options">${options.map(q=>`<option value="${esc(q.q)}">${sectionName[q.section]}</option>`).join('')}</datalist></label>
  <button class="primary" type="submit">${icon('search')}尋找同類題</button></div><p id="search-error" class="error" role="alert"></p></form></section>`;
}
function findPage(){
  main.innerHTML=head('QUESTION EXPLORER','找到下一題，練好同一課題。','從歷屆真題出發，把同一個概念練得更扎實。','<span class="mini-label">305 道大題 · 669 筆分題</span>')+searchForm()+`<div id="search-results"></div>`;
  drawResults();
}
function drawResults(){
  const target=document.querySelector('#search-results');
  if(!target)return;
  const q=state.source;
  if(!q){target.innerHTML=empty('選一道題，開始操練','輸入卷一年份及題號。PP 為獨立練習卷。');return;}
  const results=matchingQuestions(pool(),q,{selected:state.selected,mode:state.match,section:state.section,pp:state.pp});
  state.page=Math.min(state.page,Math.max(1,Math.ceil(results.length/6)));
  target.innerHTML=`<section class="current-question"><div><div class="current-label">正在配對的題目</div><div class="q-title">${yearName(q.year)} Q${esc(q.q)}<span class="section-tag">${sectionName[q.section]} · 大題 ${q.parentMarks} 分</span></div>
  <p class="q-summary">${esc(q.summary)}</p><div class="tags" aria-label="配對課題">${q.topics.map(t=>`<button class="topic-toggle" data-action="toggle-topic" data-value="${esc(t)}" aria-pressed="${state.selected.includes(t)}">${icon(state.selected.includes(t)?'check':'plus')}${esc(t)}</button>`).join('')}</div></div>
  <button class="paper-thumb" data-action="open" data-id="${esc(key(q))}" data-whole="${Boolean(q.parts)}" aria-label="查看 ${yearName(q.year)} Q${esc(q.q)} 原卷"><img src="pages/${q.year}/${q.page||1}.jpg" alt="${yearName(q.year)} 原卷頁面"><span>${icon('expand')}查看原卷</span></button></section>
  ${station(q.topics,'find')}
  <div class="section-heading"><h2>其他年份的同類題<span class="count">${results.length} 題</span></h2><span class="hint">優先顯示課題完全相同的題目</span></div>
  <div class="filters">${segment([['all','包含全部課題'],['exact','課題完全相同'],['any','任一相同課題']],state.match,'match')}
  <select id="section-filter" aria-label="篩選試卷部分"><option value="all">所有部分</option>${Object.entries(sectionName).map(([v,l])=>`<option value="${v}" ${state.section===v?'selected':''}>${l}</option>`).join('')}</select>
  <label class="checkbox"><input type="checkbox" id="pp-filter" ${state.pp?'checked':''}>包括 PP</label></div>
  ${results.length?`<div class="result-grid">${results.slice((state.page-1)*6,state.page*6).map(q=>card(q)).join('')}</div>${pager(results.length,state.page,'page')}`:empty('暫時沒有符合的題目',state.selected.length?'試試「任一相同課題」，或改為所有部分。':'請至少選擇一個課題。')}
  <p class="note">${icon('info')}配對依據為 Excel 課題標籤，並非相同解法或難度；分數為整道大題總分。</p>`;
  icons();
}
function runSearch(value=state.q,year=state.year){
  const norm=normalizeQuestion(value);
  const found=pool().find(q=>q.year===year && normalizeQuestion(q.q)===norm);
  if(!found){
    const subparts=pool().filter(q=>q.year===year && String(q.parent)===norm).map(q=>q.q);
    const error=document.querySelector('#search-error');
    if(error)error.textContent=subparts.length?`請選擇分題：${subparts.join('、')}，或切換至「整題」。`:'找不到這個題號，請檢查年份、題號及括號。';
    return false;
  }
  state.year=year;state.q=found.q;state.source=found;state.selected=[...found.topics];state.page=1;
  document.querySelector('#search-error')?.replaceChildren();
  drawResults();return true;
}
function topicsPage(){
  main.innerHTML=head('TOPIC INSIGHTS','時間有限，先看重點。','正式試卷獨立統計；同一大題中的相同課題只計一次。')+
  `<div class="stat-strip"><div><strong>15<em>年</em></strong><span>2012–2026 正式試卷</span></div><div><strong>286<em>題</em></strong><span>正式卷一大題</span></div><div><strong>43<em>項</em></strong><span>課題分類 · PP 另計</span></div></div>
  <div class="section-heading"><h2>課題出現次數</h2><div class="search-mini">${icon('search')}<input id="topic-search" placeholder="搜尋課題" aria-label="搜尋課題" value="${esc(state.topicSearch)}"></div></div>
  <div class="tab-row">${[['all','全卷'],['A1','甲一 · 基礎短題'],['A2','甲二'],['B','乙部']].map(([v,l])=>`<button class="${state.topicSection===v?'active':''}" data-action="topic-section" data-value="${v}">${l}</button>`).join('')}</div>
  <div id="topic-chart"></div><div id="topic-examples"></div>
  <p class="note">${icon('info')}一題可包含多個課題，不能把各課題次數或大題分數相加。高頻不等於容易取分，低頻不代表不會考。</p>`;
  drawChart();drawTopicExamples();
}
function drawChart(){
  const k=state.topicSection==='all'?'count':state.topicSection;
  const rows=data.stats.filter(s=>s.topic.includes(state.topicSearch.trim())).sort((a,b)=>b[k]-a[k]||b.count-a.count);
  const max=Math.max(1,...rows.map(s=>s[k]));
  const pages=Math.ceil(rows.length/10);
  state.topicPage=Math.min(state.topicPage,Math.max(1,pages));
  document.querySelector('#topic-chart').innerHTML=`<div class="legend"><span style="--c:#148777">甲一</span><span style="--c:#e9be49">甲二</span><span style="--c:#db927c">乙部</span><span>單位：大題</span></div>
  ${rows.length?`<div class="distribution">${rows.slice((state.topicPage-1)*10,state.topicPage*10).map((s,i)=>`<div class="chart-row"><span class="rank">${String((state.topicPage-1)*10+i+1).padStart(2,'0')}</span><button class="topic-name" data-action="topic-detail" data-value="${esc(s.topic)}">${esc(s.topic)}</button><div class="bar" role="img" aria-label="${esc(s.topic)} ${s[k]} 題">${['A1','A2','B'].map((v,j)=>`<span class="${['a1','a2','b'][j]}" style="width:${(state.topicSection==='all'||state.topicSection===v)?s[v]/max*100:0}%"></span>`).join('')}</div><b>${s[k]}</b><button class="icon-button" data-action="topic-detail" data-value="${esc(s.topic)}" aria-label="查看${esc(s.topic)}題目">${icon('arrow-up-right')}</button></div>`).join('')}</div>
  ${pages>1?`<div class="pager"><button class="icon-button" data-action="topic-page" data-value="${state.topicPage-1}" ${state.topicPage===1?'disabled':''} aria-label="上一頁">${icon('chevron-left')}</button><span>${state.topicPage} / ${pages}</span><button class="icon-button" data-action="topic-page" data-value="${state.topicPage+1}" ${state.topicPage===pages?'disabled':''} aria-label="下一頁">${icon('chevron-right')}</button></div>`:''}`:empty('找不到這個課題','可用「方程」、「統計」或完整課題名稱搜尋。')}`;
  icons();
}
function drawTopicExamples(){
  const el=document.querySelector('#topic-examples');if(!el)return;
  if(!state.topicDetail){el.innerHTML='';return;}
  const s=data.stats.find(s=>s.topic===state.topicDetail);
  const qs=data.groups.filter(q=>q.year!=='PP'&&q.topics.includes(s.topic)&&(state.topicSection==='all'||q.section===state.topicSection)).sort((a,b)=>yearSort(a.year,b.year)||a.parent-b.parent).slice(0,6);
  el.innerHTML=`<section class="topic-examples"><div class="section-heading"><div><h2>${esc(s.topic)}</h2><p class="hint">正式卷 ${s.count} 題 · ${s.years}/15 年出現 · PP ${s.pp} 題</p></div><button class="icon-button" data-action="close-topic" aria-label="收起課題例子">${icon('x')}</button></div>${station([s.topic],'topics')}${qs.length?`<div class="result-grid">${qs.map(q=>card(q,{match:false})).join('')}</div>`:empty('這個部分未有記錄','此統計不代表該課題不屬現行考試範圍。')}</section>`;
  icons();
}
const foundation=[
  ['基本代數','指數律、負指數轉正指數、公式主項與代數分式通分。','甲一：指數與對數 13 題 · 公式變換 12 題',['2026:1','2026:2','2024:1']],
  ['因式分解','抽公因式、平方差、二次三項式，再練利用前題結果分組分解。','甲一：15 題',['2025:5(a)','2025:5(b)','2025:5(c)']],
  ['一次方程與比','把文字及比例寫成方程，求解後代回檢查。','甲一：一次方程 18 題 · 比與比例 6 題',['2025:3']],
  ['一次不等式','處理「且／或」、負數轉向及最大或最小整數解。','甲一：14 題',['2024:4(a)','2026:6(a)','2026:6(b)']],
  ['百分數與買賣','折扣逆算標價，分清成本、售價、加成和盈利率的基數。','甲一：14 題',['2025:7(a)','2025:7(b)','2025:7(c)']],
  ['基本統計與概率','讀頻數表與累積頻數；求平均值、中位數、眾數及基本概率。','甲一：集中趨勢、頻數、概率各 9 題',['2024:9(a)','2024:9(b)','2026:9(b)']],
  ['基礎幾何','全等理由、對應邊及相似比；辨認直角再用畢氏定理。','甲一：相似形、畢氏定理各 8 題',['2025:8(a)','2025:8(b)']],
  ['基礎坐標','坐標平移、兩點斜率、平行及垂直斜率關係。','甲一：直線坐標、坐標變換各 5 題',['2026:3(a)','2026:3(b)']]
];
const nextSteps=[
  ['多項式與因式定理','由常數項或餘式條件代入，先求參數，再處理完整分解。','先練列式與代入',['2024:14(a)']],
  ['變分','按文字寫出模型，代入兩組資料求常數。','先掌握模型，再處理判別式',['2025:11(a)']],
  ['統計讀圖','讀眾數、上下四分位數；用數據比較分佈域及四分位距。','直接讀圖也是可練的分題',['2026:10(b)(i)','2025:12(b)(i)','2025:12(b)(ii)']],
  ['直線方程','由一點及斜率求直線方程，熟練後再聯立求交點。','先穩住常用步驟',['2026:12(a)']],
  ['相似與立體量度','分清長度、面積、體積比；由體積公式求半徑。','分題可能需要前段結果，須保留原題上下文',['2026:13(a)','2026:13(b)(i)']]
];
function guideCards(items){return `<div class="guide-list">${items.map(([title,desc,note,ids],i)=>`<article class="guide-card"><span class="step">PRIORITY ${String(i+1).padStart(2,'0')}</span><h3>${title}</h3><p>${desc}</p><p class="hint">${note}</p><div class="practice-links">${ids.map(id=>`<button data-action="jump" data-id="${id}">${id.split(':')[0]} Q${id.split(':')[1]} ${icon('arrow-up-right')}</button>`).join('')}</div></article>`).join('')}</div>`;}
function guidePage(){
  main.innerHTML=head('A PATH TO LEVEL 2','先練穩，再向前。','把 Word 備試指南化成可逐步完成的操練路線。')+
  `<div class="tab-row">${[['foundation','甲一優先'],['next','甲二分題'],['plan','四週安排'],['assessment','評核與目標']].map(([v,l])=>`<button data-action="guide-tab" data-value="${v}" class="${state.guide===v?'active':''}">${l}</button>`).join('')}</div><div id="guide-content"></div>`;
  const el=document.querySelector('#guide-content');
  if(state.guide==='foundation')el.innerHTML=`<div class="progress-band">${icon('sprout')}<div><h2>基礎題，先做到不用看例題。</h2><p>同類題連續兩輪約八成正確，再進入混合限時練習。這是練習指標，並非等級分數線。</p></div></div>${guideCards(foundation)}<p class="note">${icon('info')}「指數與對數」和「幹葉圖與集中趨勢」是資料庫分類名稱，首輪只選其中的基礎操作。</p>`;
  if(state.guide==='next')el.innerHTML=`<div class="progress-band">${icon('list-checks')}<div><h2>長題也可以從第一步開始。</h2><p>先做可獨立列式、代入或讀圖的分題；步驟配分須按原卷評卷參考核對。</p></div></div>${guideCards(nextSteps)}<section class="reading"><h2>暫時降低操練比重</h2><p>多步圓形證明、圓與直線綜合題、立體三角學、複雜組合概率及含參數的根的性質，可待基礎穩定後再加強。這不代表考試時放棄整個乙部。</p></section>`;
  if(state.guide==='plan')el.innerHTML=`<div class="steps-list">${[
    ['01','基本代數、因式分解、方程及不等式','先做3題理解步驟，再做5題不看例題的同類題。分類錯因，兩天後重做錯題。'],
    ['02','百分數、統計、基礎幾何與坐標','加入不標課題的甲一混合題，檢查是否能自行辨認解題方向。'],
    ['03','甲二前段分題，同步練卷二','先看能否獨立列式，再核對計算。每週至少保留一節卷二練習。'],
    ['04','未做過的完整試卷與錯題回測','卷一、卷二分開記錄，再看加權表現；基礎不穩便延長前兩週。']
  ].map(([n,t,d])=>`<div class="week"><div class="week-label">第 ${n} 週</div><div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}</div>
  <section class="reading"><h2>一次 45 分鐘的練習</h2><p><strong>5 分鐘</strong>回憶公式 · <strong>25 分鐘</strong>作答 · <strong>15 分鐘</strong>訂正。</p><h2>每次批改後記三件事</h2><p>失分是概念、列式，還是計算與讀題？兩天後能否自行修正？換了年份及表達方式，能否再次完成？</p></section>`;
  if(state.guide==='assessment')el.innerHTML=`<section class="reading"><h2>卷一和卷二都要準備</h2><p>以 2027 年官方必修部分架構作參考：卷一 2 小時 15 分鐘，卷二 1 小時 15 分鐘。卷一甲一、甲二及乙部各 35 分；卷二甲部佔該卷三分之二。</p><div class="weight-chart"><span>卷一 65%</span><span>卷二 35%</span></div><p>即使卷一甲一拿到 35 分全分，換算也只約佔總成績 21.7 分，不能據此推定已達第 2 級。</p>
  <h2>練習目標，不是保證分數線</h2><p>可先以兩份未做過的限時卷，檢查甲一 <strong>28/35</strong>、甲二 <strong>12/35</strong>，卷二<strong>六成</strong>的掌握程度。若卷一乙部暫以零分計，這個情境的加權成績約 45.8%。</p><p>這只是備試檢查目標，並非官方第 2 級分數線。考評局採用水平參照評級；任何固定百分比都不能由本報告保證取得第 2 級。</p>
  <h2>資料範圍</h2><p>15 份正式卷一，286 道大題及629筆分題記錄；另有 PP 19道大題及40筆分題記錄。排名不計 PP，未拆分的整題也算一筆分題。課題配對依現有 Excel 分類，不包含卷二分佈，也不是未來試卷預測。</p><p>歷年試卷跨越課程調整，使用舊題及 PP 時須核對應考年份課程。低頻或零次不等於不會考。</p>
  <h2>來源</h2><p>DSE_Maths_試卷分析庫_分題版.xlsx，更新於 2026 年9月11日。</p><p><a href="https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/math/2027hkdse-e-math.pdf" target="_blank" rel="noopener">考評局 2027 數學科評核架構 ${icon('external-link')}</a></p><p><a href="https://www.hkeaa.edu.hk/en/HKDSE/assessment/the_reporting_system/SRR/" target="_blank" rel="noopener">考評局水平參照評級 ${icon('external-link')}</a></p><a class="secondary" href="study-guide.docx" download>${icon('download')}下載完整 Word 指南</a></section>`;
}
function savedPage(){
  const all=Object.entries(stored).filter(([,v])=>v.saved).map(([id,v])=>({...getQuestion(id),savedTime:v.time})).filter(q=>q.id).sort((a,b)=>b.savedTime-a.savedTime);
  const rows=all.filter(q=>state.savedFilter==='all'||(state.savedFilter==='done'?isDone(q):!isDone(q)));
  state.savedPage=Math.min(state.savedPage,Math.max(1,Math.ceil(rows.length/6)));
  main.innerHTML=head('YOUR PRACTICE','留給下一次的自己。','收藏想再做的題目，把每一步進展留在這裡。')+
  `<div class="saved-stats"><span>已收藏 <strong>${all.length}</strong></span><span>已完成 <strong>${all.filter(isDone).length}</strong></span><span>待完成 <strong>${all.filter(q=>!isDone(q)).length}</strong></span></div>
  <div class="section-heading">${segment([['all','全部'],['pending','待完成'],['done','已完成']],state.savedFilter,'saved-filter')}</div>
  ${rows.length?`<div class="result-grid">${rows.slice((state.savedPage-1)*6,state.savedPage*6).map(q=>card(q,{match:false})).join('')}</div>${pager(rows.length,state.savedPage,'saved-page')}`:empty('留下一題，下次再練。','把搜尋結果中的題目加入收藏，便能在這裡繼續操練。','<a class="primary" href="#find">尋找同類題</a>')}
  <p class="storage-note">${memoryOnly?'瀏覽器未能永久儲存，本次紀錄只會暫存。':'操練紀錄只儲存在本機瀏覽器，不會上傳；更換裝置或清除瀏覽器資料後不會保留。'}</p>`;
}
function render(){
  document.querySelectorAll('nav a').forEach(a=>{const active=a.dataset.route===state.route;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  ({find:findPage,topics:topicsPage,guide:guidePage,saved:savedPage}[state.route]||findPage)();
  icons();updateCount();
}
function openPaper(q){
  lastFocus=document.activeElement;
  viewer={q,page:q.page||1,zoom:1,hints:{},stationOpen:false,method:null};
  drawViewer();
  if(!dialog.open)dialog.showModal();
  dialog.querySelector('[data-action="close"]')?.focus();
}
function drawViewer(){
  const {q,page}=viewer,paper=data.papers[q.year];
  dialog.innerHTML=`<div class="viewer-head"><div><h2 id="paper-title">${yearName(q.year)} · Q${esc(q.q)}</h2><p>${sectionName[q.section]} · 大題 ${q.parentMarks} 分 ${q.parts?'':typeof q.marks==='number'?`· 本分題 ${q.marks} 分`:''}</p></div><button class="icon-button" data-action="close" aria-label="關閉原題">${icon('x')}</button></div>
  <div class="viewer-body"><div class="page-scan"><img style="width:${viewer.zoom*100}%;max-width:${viewer.zoom===1?'900px':'none'}" src="pages/${q.year}/${page}.jpg" alt="${yearName(q.year)} 原卷第 ${page} 頁"></div><aside class="viewer-aside">
  <div class="zoom-controls"><button class="icon-button" data-action="zoom" data-value="-0.5" ${viewer.zoom<=1?'disabled':''} aria-label="縮小原題" data-tip="縮小">${icon('zoom-out')}</button><span>${viewer.zoom*100}%</span><button class="icon-button" data-action="zoom" data-value="0.5" ${viewer.zoom>=3?'disabled':''} aria-label="放大原題" data-tip="放大">${icon('zoom-in')}</button><button class="icon-button" data-action="zoom-fit" aria-label="符合頁寬" data-tip="符合頁寬">${icon('maximize')}</button></div>
  <div class="page-controls"><button class="icon-button" data-action="paper-page" data-value="${page-1}" ${page===1?'disabled':''} aria-label="原卷上一頁">${icon('chevron-left')}</button><select id="paper-page" aria-label="原卷頁數">${Array.from({length:paper.pages},(_,i)=>`<option value="${i+1}" ${page===i+1?'selected':''}>第 ${i+1} / ${paper.pages} 頁</option>`).join('')}</select><button class="icon-button" data-action="paper-page" data-value="${page+1}" ${page===paper.pages?'disabled':''} aria-label="原卷下一頁">${icon('chevron-right')}</button></div>
  ${!q.page?`<p class="note">${icon('info')}這份原卷尚未定位題號，請用頁數選單尋找 Q${esc(q.q)}。</p>`:`<p class="note">${icon('info')}已定位大題起始頁；題目可能延續至下一頁。</p>`}
  <h3>題目摘要</h3><p class="detail-copy">${esc(q.summary)}</p><div class="tags">${q.topics.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
  ${hintsPanel(q)}${station(q.topics,'viewer')}
  <button class="primary" data-action="viewer-done">${icon(isDone(q)?'circle-check':'check')} ${isDone(q)?'已完成 · 改回待完成':'標記已完成'}</button>
  <button class="secondary" data-action="viewer-save">${icon('bookmark')} ${isSaved(q)?'取消收藏':'加入我的操練'}</button>
  <a class="secondary" href="${paper.url}#page=${page}" target="_blank" rel="noopener">${icon('external-link')}開啟原卷 PDF</a>
  <p class="hint">${esc(q.note||'分數為大題總分，不可當作每個分題或課題的獨立配分。')}<br>部分原卷含評分資料。</p></aside></div>`;
  icons();
}
function refreshCards(){if(state.route==='find')drawResults();else if(state.route==='saved')savedPage();else if(state.route==='topics')drawTopicExamples();icons();}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled||!data)return;
  const a=b.dataset.action,v=b.dataset.value;
  if(a==='level'){state.level=v;state.q=String(state.source?.parent||1);state.source=null;findPage();runSearch();icons();}
  else if(a==='match'){state.match=v;state.page=1;drawResults();}
  else if(a==='toggle-topic'){state.selected=state.selected.includes(v)?state.selected.filter(t=>t!==v):[...state.selected,v];state.page=1;drawResults();}
  else if(a==='page'){state.page=Number(v);drawResults();document.querySelector('.section-heading')?.scrollIntoView({block:'start'});}
  else if(a==='open')openPaper(getQuestion(b.dataset.id,b.dataset.whole==='true'));
  else if(a==='save'){save(getQuestion(b.dataset.id,b.dataset.whole==='true'));refreshCards();}
  else if(a==='close')dialog.close();
  else if(a==='reveal-hint'||a==='reset-hints'){
    const id=b.dataset.id,q=(viewer.q.parts||[viewer.q]).find(p=>key(p)===id);
    if(!q||!questionHints[id])return;
    viewer.hints[id]=a==='reset-hints'?0:Math.min(3,(viewer.hints[id]||0)+1);
    const el=b.closest('.hint-content');
    el.innerHTML=hintContent(q);
    el.querySelector('button')?.focus();
  }
  else if(a==='paper-page'){viewer.page=Number(v);drawViewer();}
  else if(a==='zoom'){viewer.zoom=Math.max(1,Math.min(3,viewer.zoom+Number(v)));drawViewer();}
  else if(a==='zoom-fit'){viewer.zoom=1;drawViewer();}
  else if(a==='viewer-save'){save(viewer.q);drawViewer();refreshCards();}
  else if(a==='viewer-done'){done(viewer.q);drawViewer();refreshCards();}
  else if(a==='topic-section'){state.topicSection=v;state.topicPage=1;topicsPage();}
  else if(a==='topic-page'){state.topicPage=Number(v);drawChart();}
  else if(a==='topic-detail'){state.topicDetail=v;drawTopicExamples();document.querySelector('#topic-examples').scrollIntoView({block:'start'});}
  else if(a==='close-topic'){state.topicDetail=null;drawTopicExamples();}
  else if(a==='guide-tab'){state.guide=v;guidePage();}
  else if(a==='jump'){const q=getQuestion(b.dataset.id);state.level='part';state.year=q.year;state.q=q.q;state.source=q;state.selected=[...q.topics];state.page=1;state.section='all';state.match='all';location.hash='find';state.route='find';render();window.scrollTo(0,0);}
  else if(a==='saved-filter'){state.savedFilter=v;state.savedPage=1;savedPage();}
  else if(a==='saved-page'){state.savedPage=Number(v);savedPage();}
  icons();
});
document.addEventListener('submit',e=>{if(e.target.id==='search-form'){e.preventDefault();runSearch(e.target.question.value,e.target.year.value);}});
document.addEventListener('change',e=>{
  if(e.target.dataset.technique){
    const t=techniques[Number(e.target.value)];
    if(!t)return;
    if(e.target.dataset.technique==='viewer')viewer.method=Number(e.target.value);
    e.target.closest('.technique-station').querySelector('.technique-copy').innerHTML=techniqueCopy(t);
  }
  if(e.target.id==='year'){state.year=e.target.value;document.querySelector('#question-options').innerHTML=pool().filter(q=>q.year===state.year).map(q=>`<option value="${esc(q.q)}">${sectionName[q.section]}</option>`).join('');}
  if(e.target.id==='section-filter'){state.section=e.target.value;state.page=1;drawResults();}
  if(e.target.id==='pp-filter'){state.pp=e.target.checked;state.page=1;drawResults();}
  if(e.target.id==='paper-page'){viewer.page=Number(e.target.value);drawViewer();}
});
dialog.addEventListener('toggle',e=>{
  if(viewer&&e.target.dataset.station==='viewer')viewer.stationOpen=e.target.open;
},true);
document.addEventListener('input',e=>{if(e.target.id==='topic-search'){state.topicSearch=e.target.value;state.topicPage=1;drawChart();}});
dialog.addEventListener('close',()=>{viewer=null;lastFocus?.isConnected&&lastFocus.focus();});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
window.addEventListener('hashchange',()=>{state.route=location.hash.slice(1)||'find';if(!['find','topics','guide','saved'].includes(state.route))state.route='find';render();window.scrollTo(0,0);});
try{
  const response=await fetch('data.json');if(!response.ok)throw new Error('data unavailable');
  data=await response.json();
  state.source=data.questions.find(q=>q.year===state.year&&q.q===state.q);
  state.selected=[...state.source.topics];state.route=location.hash.slice(1)||'find';
  if(!['find','topics','guide','saved'].includes(state.route))state.route='find';
  render();
}catch(err){main.innerHTML=empty('題庫暫時未能載入','請確認網站服務已啟動，再重新載入。','<button class="primary" onclick="location.reload()">重新載入</button>');console.error(err);}
