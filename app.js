import {matchingQuestions, normalizeQuestion} from './matching.js';
import {techniques, questionHints, questionSubtopics, reviewedSummaries} from './techniques.js';
import {formulaPanel, hintFormulaPanel} from './formulas.js';
import {plainSummary} from './plain-language.js';
import {paperStatuses,validateBackup,mergeProgress} from './progress.js';
const main=document.querySelector('main'), dialog=document.querySelector('dialog');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<i data-lucide="${name}"></i>`;
const sectionName={A1:'甲一',A2:'甲二',B:'乙部'};
const yearName=y=>y==='PP'?'PP 練習卷':`${y} DSE`;
const key=q=>`${q.year}:${q.q}`;
const outsideScope=q=>q.topics?.some(t=>t==='極坐標'||t==='極座標')||q.parts?.some(outsideScope);
function scopeNotice(q){
  return outsideScope(q)?'<aside class="scope-notice"><strong>已超出課程範圍 · 極坐標</strong><span>此歷年題涉及已刪除的極坐標內容，現行課程操練可略過；保留原題只供參考。</span><a href="https://www.edb.gov.hk/attachment/en/curriculum-development/kla/ma/curr/CT_JS_e.pdf#page=8" target="_blank" rel="noopener">教育局課程對照表 · 第 8 頁</a></aside>':'';
}
function formalSummary(q){
  if(reviewedSummaries[key(q)])return reviewedSummaries[key(q)].text;
  if(q.parts?.some(p=>reviewedSummaries[key(p)]))return q.parts.map(formalSummary).join('；');
  return q.summary;
}
const summaryOf=q=>plainSummary(formalSummary(q));
function summaryHelp(q){
  return summaryOf(q)!==formalSummary(q)?`<details class="formal-summary"><summary>看看數學用語</summary><p>${esc(formalSummary(q))}</p></details>`:'';
}
const yearSort=(a,b)=>(Number(b)||0)-(Number(a)||0);
let data, stored={}, memoryOnly=false;
let extra={last:null,papers:{},hideOutside:false},pendingImport=null,backupMessage='',importReadId=0;
try{const raw=JSON.parse(localStorage.getItem('dse-extra-v1')||'null');if(raw)extra=raw;}catch{memoryOnly=true;}
try{stored=JSON.parse(localStorage.getItem('dse-practice-v1')||'{}');if(!stored||Array.isArray(stored)||typeof stored!=='object')stored={};stored=Object.fromEntries(Object.entries(stored).filter(([,v])=>v&&typeof v==='object'));}catch{memoryOnly=true;}
let state={route:'find',entry:'lookup',advanced:false,level:'whole',year:'2026',q:'4',source:null,selected:[],match:'all',section:'all',pp:false,page:1,
  topicSection:'all',topicSearch:'',topicPage:1,topicDetail:null,guide:'foundation',savedFilter:'all',savedPage:1};
let viewer=null, lastFocus=null;
const icons=()=>window.lucide?.createIcons();
function persist(){
  let beforeQuestions,beforeExtra;
  try{
    beforeQuestions=localStorage.getItem('dse-practice-v1');beforeExtra=localStorage.getItem('dse-extra-v1');
    localStorage.setItem('dse-extra-v1',JSON.stringify(extra));
    localStorage.setItem('dse-practice-v1',JSON.stringify(stored));memoryOnly=false;return true;
  }catch{
    try{
      if(beforeExtra!==undefined)beforeExtra===null?localStorage.removeItem('dse-extra-v1'):localStorage.setItem('dse-extra-v1',beforeExtra);
      if(beforeQuestions!==undefined)beforeQuestions===null?localStorage.removeItem('dse-practice-v1'):localStorage.setItem('dse-practice-v1',beforeQuestions);
    }catch{}
    memoryOnly=true;toast('瀏覽器未能儲存；本次紀錄只會暫存，請下載進度備份。');return false;
  }
}
function resumePanel(){
  const last=extra.last,q=last&&getQuestion(last.id,last.whole);
  const stuck=Object.values(stored).filter(v=>v.saved&&v.outcome==='stuck').length;
  return `<section class="resume-panel" aria-label="繼續練習"><div><strong>${q?'繼續上次練習':'今天想重練哪一題？'}</strong><p>${q?`${yearName(q.year)} Q${esc(q.q)}${outsideScope(q)?' · 已標記超綱':''}`:'做題後記下掌握程度，下次便能接着練。'}</p></div><div class="practice-actions">${q?'<button class="primary" data-action="resume">繼續上次</button>':''}<button class="secondary" data-action="show-stuck">還未明白 · ${stuck} 題</button></div></section>`;
}
function scopeFilter(){
  return `<label class="scope-filter"><input type="checkbox" data-hide-outside ${extra.hideOutside?'checked':''}><span>隱藏已標記超綱的題目<small>只排除已核對的極坐標題，不代表其他課題已全面核對。原卷 PDF 不會裁掉題目。</small></span></label>`;
}
function backupPanel(){
  return `<section class="backup-panel"><h2>把進度帶到另一部裝置</h2><p>先下載備份，再把檔案傳到另一部裝置，在這裏匯入。不用帳戶，不會上傳伺服器；請妥善保管備份。</p><div class="practice-actions"><button class="secondary" data-action="export-progress">下載進度備份</button><label class="secondary backup-upload">選擇備份檔<input id="import-progress" type="file" accept=".json,application/json"></label></div><p>包括收藏、自評、上次練習及整卷紀錄；不包括作答內容、已開啟提示或自動同步。</p><p role="status">${esc(backupMessage)}</p>${pendingImport?`<div class="import-preview"><strong>準備合併 ${Object.keys(pendingImport.questions).length} 筆題目、${Object.keys(pendingImport.extra.papers).length} 份整卷紀錄</strong><p>同一項保留較新的紀錄；時間相同保留本機紀錄。請先下載本機備份，方便日後還原。找題顯示設定維持本機選擇。</p><button class="primary" data-action="confirm-import">確認合併進度</button><button class="secondary" data-action="cancel-import">取消</button></div>`:''}</section>`;
}
function exportProgress(){
  const questions=Object.fromEntries(Object.entries(stored).filter(([id])=>getQuestion(id)).map(([id,v])=>[id,{saved:!!v.saved,done:!!v.done,outcome:v.outcome||null,time:v.time||0}]));
  const payload={app:'dse-maths',version:1,exportedAt:new Date().toISOString(),questions,extra};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`dse-progress-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function toast(text){const t=document.querySelector('#toast');t.textContent=text;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2200);}
const isSaved=q=>Boolean(stored[key(q)]?.saved);
const isDone=q=>Boolean(stored[key(q)]?.done);
function save(q){const k=key(q);stored[k]={...stored[k],saved:!isSaved(q),time:Date.now()};persist();toast(isSaved(q)?'已加入我的操練':'已移出我的操練');updateCount();}
function done(q){const k=key(q);stored[k]={...stored[k],saved:true,done:!isDone(q),outcome:null,time:Date.now()};persist();toast(isDone(q)?'已標記完成':'已改為待完成');updateCount();}
const outcomeLabels={independent:'自己做到',supported:'看提示做到',stuck:'還未明白'};
function recordOutcome(q,outcome){
  if(!outcomeLabels[outcome])return;
  stored[key(q)]={...stored[key(q)],saved:true,done:outcome!=='stuck',outcome,time:Date.now()};
  persist();updateCount();
}
function nextPractice(q){
  return matchingQuestions(q.parts?data.groups:data.questions,q,{selected:q.topics,mode:'all',section:q.section,pp:q.year==='PP'})
    .find(candidate=>!outsideScope(candidate)&&!isDone(candidate)&&(candidate.parts||[candidate]).some(p=>questionHints[key(p)]));
}
function learningPanel(q){
  const outcome=stored[key(q)]?.outcome,next=nextPractice(q);
  return `<section class="learning-panel" aria-label="這次練習"><h3>這次做得怎樣？</h3><p>自己記一下，不是系統評分；選好後會存到「我的操練」。</p>
  <div class="outcome-options">${Object.entries(outcomeLabels).map(([value,label])=>`<button data-action="outcome" data-value="${value}" aria-pressed="${outcome===value}">${icon(value==='stuck'?'sprout':value==='supported'?'lightbulb':'check')}${label}</button>`).join('')}</div>
  ${outcome||isDone(q)?`<div class="learning-next" role="status"><p>${outcome==='stuck'?'先不用急着換題。看一個提示，再試做第一步。':outcome==='supported'?'有提示也能走出一步。可以收起提示重試，看看能否自己完成。':'已留下這次進度。可以試另一年份的同課題題目。'}</p>
  <div class="practice-actions"><button class="secondary" data-action="${outcome==='stuck'?'focus-hints':'retry'}">${outcome==='stuck'?'帶我看提示':'收起提示，重試這題'}</button>${next?`<button class="primary" data-action="next-practice" data-id="${esc(key(next))}" data-whole="${Boolean(next.parts)}">練下一題 ${icon('arrow-right')}</button>`:'<span class="hint">暫時沒有未完成且附提示的同課題題目，可以先重做這題。</span>'}</div>
  ${next?'<small>下一題按相同課題配對，不代表難度相同。</small>':''}</div>`:''}</section>`;
}
function updateCount(){document.querySelector('#saved-count').textContent=Object.values(stored).filter(x=>x.saved).length;}
function head(kicker,title,desc,right=''){return `<div class="page-head"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p class="lead">${desc}</p></div>${right}</div>`;}
function segment(items,current,action){return `<div class="segmented">${items.map(([v,l])=>`<button data-action="${action}" data-value="${v}" aria-pressed="${v===current}">${l}</button>`).join('')}</div>`;}
function empty(title,text,action=''){return `<div class="empty">${icon('notebook-pen')}<h2>${title}</h2><p>${text}</p>${action}</div>`;}
function techniqueCopy(t){
  return `${scopeNotice({topics:[t.topic]})}<h4>甚麼時候用？</h4><p class="tech-recognize">${esc(t.recognize)}</p>${formulaPanel(t)}<h4>可以這樣做</h4><ol>${t.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="tech-caution"><strong>小心這一步</strong>${esc(t.mistake)}</p><h4>用小例子看一次</h4><p class="tech-example">${esc(t.example)}</p>`;
}
function station(topics,scope,q){
  const options=techniques.map((t,i)=>({...t,i})).filter(t=>topics.includes(t.topic));
  if(!options.length)return '';
  const preferred=q?(q.parts||[q]).flatMap(part=>questionSubtopics[key(part)]||[]):[];
  const initial=preferred.map(subtopic=>options.find(t=>t.subtopic===subtopic)).find(Boolean)||options[0];
  const selected=scope==='viewer'&&options.some(t=>t.i===viewer.method)?viewer.method:initial.i;
  const subtopics=[...new Set(options.map(t=>t.subtopic))];
  const choices=subtopics.map(subtopic=>`<optgroup label="${esc(subtopic)}">${options.filter(t=>t.subtopic===subtopic).map(t=>`<option value="${t.i}" ${selected===t.i?'selected':''}>${esc(t.subtopic)} · ${esc(t.title)}</option>`).join('')}</optgroup>`).join('');
  return `<details class="technique-station" data-station="${scope}" ${scope==='viewer'&&viewer.stationOpen?'open':''}><summary>${icon('lightbulb')}<span>題型技巧站<small>看懂題目 · 逐步試做 · 小例子</small></span>${icon('chevron-down')}</summary><div class="station-content"><label class="field" for="technique-${scope}">想看哪種方法？<select id="technique-${scope}" data-technique="${scope}">${choices}</select></label><p class="tech-scope">這是這類題目的常用方法，不一定適合眼前這一題；先看看題目給的條件是否相同。</p><div class="technique-copy">${techniqueCopy(techniques[selected])}</div></div></details>`;
}
function hintContent(q){
  const hints=questionHints[key(q)],count=viewer.hints[key(q)]||0;
  return `<div class="hint-copy" aria-live="polite">${hints.slice(0,count).map((text,i)=>`<p><strong>${['先看甚麼','試做這一步','怎樣檢查'][i]}</strong>${esc(text)}</p>${hintFormulaPanel(key(q),i)}`).join('')}</div>${count<hints.length?`<button class="text-button" data-action="reveal-hint" data-id="${esc(key(q))}">${icon('eye')}${count?'再看一個提示':'給我一點提示'} <span>${count+1} / ${hints.length}</span></button>`:''}${count?`<button class="icon-button" data-action="reset-hints" data-id="${esc(key(q))}" aria-label="收起 Q${esc(q.q)} 的提示" data-tip="收起提示">${icon('rotate-ccw')}</button>`:''}`;
}
function hintsPanel(q){
  const parts=q.parts||[q],available=parts.filter(p=>questionHints[key(p)]);
  return `<section class="question-hints" aria-label="本題提示"><h3>${icon('signpost')}本題提示</h3>${available.length?available.map(p=>`<div class="hint-part" data-hint-id="${esc(key(p))}"><h4>Q${esc(p.q)}</h4><div class="hint-content">${hintContent(p)}</div></div>`).join(''):'<p class="tech-scope">這題的提示還未核對好，暫時未能提供。下面有這類題目的常用方法可參考。</p>'}${available.length&&available.length<parts.length?'<p class="tech-scope">其餘分題的提示還未核對好，暫時未能提供。</p>':''}${available.length?'<p class="tech-scope">提示已對照原卷編寫，用來幫你思考；不是官方評分準則。</p>':''}</section>`;
}
function pool(){return state.level==='whole'?data.groups:data.questions;}
function getQuestion(id,whole=false){return (whole?data.groups:data.questions).find(q=>key(q)===id)||data.groups.find(q=>key(q)===id);}
function pager(total,page,action){const n=Math.ceil(total/6);return n>1?`<div class="pager"><button class="icon-button" data-action="${action}" data-value="${page-1}" ${page===1?'disabled':''} aria-label="上一頁">${icon('chevron-left')}</button><span>第 ${page} / ${n} 頁</span><button class="icon-button" data-action="${action}" data-value="${page+1}" ${page===n?'disabled':''} aria-label="下一頁">${icon('chevron-right')}</button></div>`:'';}
function card(q,{match=true}={}){
  const saved=isSaved(q), complete=isDone(q), whole=Boolean(q.parts);
  return `<article class="question-card ${complete?'completed':''}">
    <div class="card-top"><div class="card-kicker"><span class="dot ${q.exact?'exact':''}"></span>${match?(q.exact?'課題完全相同':`相同課題 ${q.shared?.length||0} 項`):sectionName[q.section]}${q.year==='PP'?' · 練習卷':''}</div><button class="icon-button ${saved?'on':''}" data-action="save" data-id="${esc(key(q))}" data-whole="${whole}" aria-label="${saved?'取消收藏':'收藏'} ${esc(yearName(q.year))} Q${esc(q.q)}" aria-pressed="${saved}" data-tip="${saved?'取消收藏':'加入操練'}">${icon('bookmark')}</button></div>
    <h3>${yearName(q.year)} <span>Q${esc(q.q)}</span></h3>${scopeNotice(q)}<p class="q-summary">${esc(summaryOf(q))}</p>${summaryHelp(q)}
    <div class="tags">${q.topics.map(t=>`<span class="tag ${(q.shared||[]).includes(t)?'matched':''}">${esc(t)}</span>`).join('')}</div>
    <div class="card-bottom"><span class="hint">${sectionName[q.section]} · 大題 ${q.parentMarks} 分</span><button class="text-button" data-action="open" data-id="${esc(key(q))}" data-whole="${whole}">查看原題 ${icon('arrow-up-right')}</button></div>
    ${stored[key(q)]?.outcome?`<div class="practice-status">${esc(outcomeLabels[stored[key(q)].outcome]||'')}</div>`:''}
    ${complete?`<div class="done-label">${icon('circle-check')}已完成</div>`:''}
  </article>`;
}
function availableQuestions(){return pool().filter(q=>q.year===state.year);}
function selectAvailableQuestion(value){
  const options=availableQuestions();
  return options.find(q=>q.q===value)||options.find(q=>q.parent===parseInt(value,10))||options[0];
}
function questionChoices(){
  const options=availableQuestions();
  return Object.entries(sectionName).map(([section,label])=>{
    const questions=options.filter(q=>q.section===section);
    return questions.length?`<optgroup label="${label}">${questions.map(q=>`<option value="${esc(q.q)}" ${q.q===state.q?'selected':''}>Q${esc(q.q)}</option>`).join('')}</optgroup>`:'';
  }).join('');
}
function searchForm(){
  const years=Object.keys(data.papers).sort(yearSort);
  return `<section class="search-tool" aria-label="按年份及題號搜尋"><div class="search-top"><h2>${icon('scan-search')}從手上的題目開始</h2>${segment([['whole','整題'],['part','分題']],state.level,'level')}</div>
  <form id="search-form" novalidate><div class="search-fields"><label class="field">年份<select name="year" id="year">${years.map(y=>`<option value="${y}" ${y===state.year?'selected':''}>${y==='PP'?'PP · 練習卷':y+' 年'}</option>`).join('')}</select></label>
  <label class="field">題號<select name="question" id="question" required aria-describedby="search-error">${questionChoices()}</select></label>
  <button class="primary" type="submit">${icon('search')}尋找同類題</button></div><p id="search-error" class="error" role="alert"></p></form></section>`;
}
function findPage(){
  main.innerHTML=head('一步一步練習','從一題開始，慢慢練穩。','先試做，卡住時看一點提示，再決定下一步。')+
  resumePanel()+`<div class="entry-options" role="group" aria-label="你想怎樣開始？"><button data-action="entry" data-value="lookup" aria-pressed="${state.entry==='lookup'}">${icon('search')}<span><strong>我有題目要查</strong><small>選年份和題號，找同類題練習</small></span></button><button data-action="entry" data-value="foundation" aria-pressed="${state.entry==='foundation'}">${icon('sprout')}<span><strong>我想由基礎開始</strong><small>不用知道題號，先選一種練習</small></span></button></div>
  ${state.entry==='foundation'?`<section class="starter-panel"><h2>今天先練哪一種？</h2><p>以下都是甲一分題，附有逐步提示。選一題，用紙筆試做即可。</p><div class="starter-options">${[
    ['2026:2','整理字母的次方','先練相乘、相除時怎樣處理次方'],
    ['2026:4(a)','把式子拆成括號','先找每項都有的部分'],
    ['2025:7(a)','打折前後的價錢','分清標價、售價與折扣']
  ].map(([id,title,description])=>`<button data-action="starter" data-id="${id}"><strong>${title}</strong><span>${description}</span><small>${id.split(':')[0]} Q${id.split(':')[1]} · 開始試做 ${icon('arrow-right')}</small></button>`).join('')}</div></section>`:searchForm()}
  <div id="search-results" ${state.entry==='foundation'?'hidden':''}></div>`;
  drawResults();
}
const matchChoices=[
  ['all','一起練這些課題','題目包含你選的全部課題，也可以有其他課題。'],
  ['any','找多一點選擇','只要包含其中一個已選課題，就會列出。'],
  ['exact','只練這些課題','課題標籤與你選的完全一樣，不包含其他課題。']
];
function redrawFilters(selector){
  drawResults();
  document.querySelector(selector)?.focus({preventScroll:true});
}
function drawResults(){
  const target=document.querySelector('#search-results');
  if(!target)return;
  const q=state.source;
  if(!q){target.innerHTML=empty('選一道題，開始操練','選擇卷一年份及題號。PP 為獨立練習卷。');return;}
  const results=matchingQuestions(pool(),q,{selected:state.selected,mode:state.match,section:state.section,pp:state.pp}).filter(q=>!extra.hideOutside||!outsideScope(q));
  const defaultTopics=q.topics.length===state.selected.length&&q.topics.every(t=>state.selected.includes(t));
  const defaultFilters=state.match==='all'&&state.section==='all'&&!state.pp&&defaultTopics;
  state.page=Math.min(state.page,Math.max(1,Math.ceil(results.length/6)));
  target.innerHTML=`<section class="current-question"><div><div class="current-label">正在配對的題目</div><div class="q-title">${yearName(q.year)} Q${esc(q.q)}<span class="section-tag">${sectionName[q.section]} · 大題 ${q.parentMarks} 分</span></div>
  ${scopeNotice(q)}<p class="q-summary">${esc(summaryOf(q))}</p>${summaryHelp(q)}<div class="tags" aria-label="配對課題">${q.topics.map(t=>`<button class="topic-toggle" data-action="toggle-topic" data-value="${esc(t)}" aria-pressed="${state.selected.includes(t)}">${icon(state.selected.includes(t)?'check':'plus')}${esc(t)}</button>`).join('')}</div></div>
  <div class="question-start"><div class="practice-actions"><button class="primary" data-action="open" data-id="${esc(key(q))}" data-whole="${Boolean(q.parts)}">開始做題 ${icon('arrow-right')}</button><button class="secondary" data-action="open-hints" data-id="${esc(key(q))}" data-whole="${Boolean(q.parts)}">${icon('lightbulb')}我需要提示</button></div><p>用紙筆試做即可；提示不會一次全部打開。</p></div>
  <button class="paper-thumb" data-action="open" data-id="${esc(key(q))}" data-whole="${Boolean(q.parts)}" aria-label="查看 ${yearName(q.year)} Q${esc(q.q)} 原卷"><img src="pages/${q.year}/${q.page||1}.jpg" alt="${yearName(q.year)} 原卷頁面"><span>${icon('expand')}查看原卷</span></button></section>
  ${station(q.topics,'find',q)}
  ${scopeFilter()}
  <div class="section-heading"><h2>其他年份的同類題<span class="count">${results.length} 題</span></h2><span class="hint">優先顯示課題完全相同的題目</span></div>
  <details class="advanced-filters" ${state.advanced?'open':''}><summary>調整找題條件 <small>${defaultFilters?'預設找法':esc(matchChoices.find(([value])=>value===state.match)[1])+' · '+(state.section==='all'?'所有部分':sectionName[state.section])+(state.pp?' · 包括 PP':'')+(!defaultTopics?' · 已更改課題':'')}</small></summary>
  <div class="filter-content"><p class="filter-intro">不用每項都改。題目太少時，可選「找多一點選擇」。</p>
  <fieldset class="match-fieldset"><legend>你想怎樣找？</legend><div class="match-options">${matchChoices.map(([value,title,description])=>`<button data-action="match" data-value="${value}" aria-pressed="${state.match===value}"><strong>${state.match===value?icon('circle-check'):icon('circle')}${title}${value==='all'?'<small>建議</small>':''}</strong><span>${description}</span></button>`).join('')}</div></fieldset>
  <p class="selected-topics"><strong>正在用這些課題找題：</strong>${state.selected.length?esc(state.selected.join('、')):'未選課題，請在上面的課題標籤選至少一個。'}</p>
  <div class="filter-extras"><label class="field" for="section-filter">想練哪個部分？<select id="section-filter"><option value="all" ${state.section==='all'?'selected':''}>所有部分</option>${Object.entries(sectionName).map(([v,l])=>`<option value="${v}" ${state.section===v?'selected':''}>${l}</option>`).join('')}</select></label>
  <label class="pp-option"><input type="checkbox" id="pp-filter" ${state.pp?'checked':''}><span><strong>也找 PP 練習卷</strong><small>加入額外練習；PP 不屬於正式年份試卷。</small></span></label></div>
  <div class="filter-footer"><span role="status" aria-live="polite">找到 <strong>${results.length}</strong> 題 · 選好即更新</span><button class="secondary" data-action="reset-filters">回復預設</button></div></div></details>
  ${results.length?`<div class="result-grid">${results.slice((state.page-1)*6,state.page*6).map(q=>card(q)).join('')}</div>${pager(results.length,state.page,'page')}`:empty('暫時沒有符合的題目',state.selected.length?'試試「找多一點選擇」，或改為所有部分。':'請至少選擇一個課題。','<button class="secondary" data-action="reset-filters">回復預設找法</button>')}
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
  main.innerHTML=head('TOPIC INSIGHTS','時間有限，先看重點。','統計保留歷年內容，包括已標記超綱題；隱藏題目不會改變歷年數字。')+
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
  const qs=data.groups.filter(q=>q.year!=='PP'&&q.topics.includes(s.topic)&&(state.topicSection==='all'||q.section===state.topicSection)&&(!extra.hideOutside||!outsideScope(q))).sort((a,b)=>yearSort(a.year,b.year)||a.parent-b.parent).slice(0,6);
  el.innerHTML=`<section class="topic-examples"><div class="section-heading"><div><h2>${esc(s.topic)}</h2><p class="hint">正式卷 ${s.count} 題 · ${s.years}/15 年出現 · PP ${s.pp} 題</p></div><button class="icon-button" data-action="close-topic" aria-label="收起課題例子">${icon('x')}</button></div>${scopeNotice({topics:[s.topic]})}${station([s.topic],'topics')}${qs.length?`<div class="result-grid">${qs.map(q=>card(q,{match:false})).join('')}</div>`:empty('這個部分未有記錄','此統計不代表該課題不屬現行考試範圍。')}</section>`;
  el.querySelector('.section-heading').insertAdjacentHTML('afterend',scopeFilter());
  if(extra.hideOutside&&!qs.length){
    el.querySelector('.empty h2').textContent='目前沒有顯示的題目';
    el.querySelector('.empty p').textContent='可取消超綱篩選或改選其他試卷部分；歷年統計保持不變。';
  }
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
  main.innerHTML=head('A PATH TO LEVEL 2','先練穩，再向前。','由自己現在做得到的開始，一步一步增加把握。')+
  `<div class="tab-row">${[['foundation','甲一優先'],['next','甲二分題'],['plan','四週安排'],['assessment','評核與目標']].map(([v,l])=>`<button data-action="guide-tab" data-value="${v}" class="${state.guide===v?'active':''}">${l}</button>`).join('')}</div><div id="guide-content"></div>`;
  const el=document.querySelector('#guide-content');
  if(state.guide==='foundation')el.innerHTML=`<div class="progress-band">${icon('sprout')}<div><h2>先由一題能自己開始的做起。</h2><p>每次選 3–5 題，分清「自己做到」「看提示做到」和「還未明白」。下次先重做需要提示的題，再試多一題；不用達到固定正確率才可以繼續。</p></div></div>${guideCards(foundation)}<p class="note">${icon('info')}「指數與對數」和「幹葉圖與集中趨勢」是資料庫分類名稱，首輪只選其中的基礎操作。</p>`;
  if(state.guide==='next')el.innerHTML=`<div class="progress-band">${icon('list-checks')}<div><h2>長題也可以從第一步開始。</h2><p>先做可獨立列式、代入或讀圖的分題；步驟配分須按原卷評卷參考核對。</p></div></div>${guideCards(nextSteps)}<section class="reading"><h2>暫時降低操練比重</h2><p>多步圓形證明、圓與直線綜合題、立體三角學、複雜組合概率及含參數的根的性質，可待基礎穩定後再加強。這不代表考試時放棄整個乙部。</p></section>`;
  if(state.guide==='plan')el.innerHTML=`<div class="steps-list">${[
    ['01','基本代數、因式分解、方程及不等式','先做3題理解步驟，再做5題不看例題的同類題。分類錯因，兩天後重做錯題。'],
    ['02','百分數、統計、基礎幾何與坐標','加入不標課題的甲一混合題，檢查是否能自行辨認解題方向。'],
    ['03','甲二前段分題，同步練卷二','先看能否獨立列式，再核對計算。每週至少保留一節卷二練習。'],
    ['04','未做過的完整試卷與錯題回測','卷一、卷二分開記錄，再看加權表現；基礎不穩便延長前兩週。']
  ].map(([n,t,d])=>`<div class="week"><div class="week-label">第 ${n} 週</div><div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}</div>
  <section class="reading"><h2>一次 45 分鐘的練習</h2><p><strong>5 分鐘</strong>回憶公式 · <strong>25 分鐘</strong>作答 · <strong>15 分鐘</strong>訂正。</p><h2>每次批改後記三件事</h2><p>失分是概念、列式，還是計算與讀題？兩天後能否自行修正？換了年份及表達方式，能否再次完成？</p></section>`;
  if(state.guide==='assessment')el.innerHTML=`<section class="reading"><h2>卷一和卷二都要準備</h2><p>以 2027 年官方必修部分架構作參考：卷一 2 小時 15 分鐘，卷二 1 小時 15 分鐘。卷一甲一、甲二及乙部各 35 分；卷二甲部佔該卷三分之二。</p><div class="weight-chart"><span>卷一 65%</span><span>卷二 35%</span></div><p>即使卷一甲一拿到 35 分全分，換算也只約佔總成績 21.7 分，不能據此推定已達第 2 級。</p>
  <h2>練習目標，按自己的起點調整</h2><p>先做一次練習，記下自己能獨立完成多少，再訂下一個小目標。不預設卷二 MC 能拿六成，也不要求所有人用同一組卷一分數作起點。</p>
  <div class="goal-steps"><article><h3>卷一：先拿穩會做的步驟</h3><p>先選 3–5 題甲一，試着自己列式和計算。批改後挑一個錯因修正，下次重做；再逐步加入能開始作答的甲二分題。步驟得分要按評卷參考核對。</p></article>
  <article><h3>MC：先分清「會做」和「估中」</h3><p>每次先練 10 題，記下有把握答對、估中及答錯的題數。例如目前只有 3 題能自己做對，下次可先爭取 4 題；未做到便先訂正，不用急着追百分比。</p></article>
  <article><h3>整卷：先完成一次，再比較自己</h3><p>可以先分段完成一份卷，熟習後再按卷面時間限時做。記下用時、未完成的題和常見錯因；不同年份難度有別，不要只看總分升跌。</p><a class="text-button" href="#papers">選一份整卷開始 ${icon('arrow-right')}</a></article></div>
  <p>以上是自訂練習目標，不是官方第 2 級分數線。考評局採用水平參照評級，不能以固定百分比保證取得第 2 級。卷一與卷二都要持續練習。</p>
  <h2>資料範圍</h2><p>15 份正式卷一，286 道大題及629筆分題記錄；另有 PP 19道大題及40筆分題記錄。排名不計 PP，未拆分的整題也算一筆分題。課題配對依現有 Excel 分類，不包含卷二分佈，也不是未來試卷預測。</p><p>歷年試卷跨越課程調整，使用舊題及 PP 時須核對應考年份課程。低頻或零次不等於不會考。</p>
  <h2>參考資料</h2><p><a href="https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/math/2027hkdse-e-math.pdf" target="_blank" rel="noopener">考評局 2027 數學科評核架構 ${icon('external-link')}</a></p><p><a href="https://www.hkeaa.edu.hk/en/HKDSE/assessment/the_reporting_system/SRR/" target="_blank" rel="noopener">考評局水平參照評級 ${icon('external-link')}</a></p></section>`;
}
function paperProgressForm(year){
  const row=extra.papers[year]||{question:'',status:'working'};
  return `<details class="paper-record" ${extra.papers[year]?'open':''}><summary>記錄／查看整卷進度</summary><form class="paper-progress" data-paper-record="${year}"><h3>我的整卷進度</h3><label class="field">做到哪一道大題？<select name="question"><option value="">尚未記錄題號</option>${data.groups.filter(q=>q.year===year).map(q=>`<option value="${esc(q.q)}" ${row.question===q.q?'selected':''}>Q${esc(q.q)}</option>`).join('')}</select></label><label class="field">現在的狀態<select name="status">${Object.entries(paperStatuses).map(([value,label])=>`<option value="${value}" ${row.status===value?'selected':''}>${label}</option>`).join('')}</select></label><button class="secondary" type="submit">儲存整卷進度</button><p class="paper-record-message" role="status">${extra.papers[year]?`已記錄：${row.question?'Q'+esc(row.question)+' · ':''}${paperStatuses[row.status]}`:'手動記錄，不會從 PDF 自動讀取進度。'}</p></form></details>`;
}
function papersPage(){
  const years=Object.keys(data.papers).filter(year=>year!=='PP').sort(yearSort);
  const paperCard=year=>{
    const paper=data.papers[year];
    const excluded=data.groups.filter(q=>q.year===year&&outsideScope(q));
    return `<article class="whole-paper-card"><div class="eyebrow">${year==='PP'?'額外練習 · 非正式年份試卷':'DSE 數學 · 必修部分'}</div><h2>${year==='PP'?'PP 練習卷':year+' 年卷一'}</h2><p>完整 PDF · ${paper.pages} 頁（檔案總頁數）</p>${excluded.length?`<div class="scope-notice"><strong>已超出課程範圍 · 極坐標</strong><span>${excluded.map(q=>'Q'+esc(q.q)).join('、')} 可略過；原卷保留完整內容。</span></div>`:''}<div class="practice-actions"><a class="primary" href="${esc(paper.url)}#page=1" target="_blank" rel="noopener" aria-label="開啟 ${year} 整份卷一">開啟整卷 ${icon('external-link')}</a><a class="secondary" href="${esc(paper.url)}" download="${esc(paper.name)}" aria-label="下載 ${year} 卷一">下載列印 ${icon('download')}</a></div>${paperProgressForm(year)}</article>`;
  };
  main.innerHTML=head('按年份練習','選一年，試做一整份。','先分段完成也可以；熟習後，再按卷面時間限時操卷。')+
  `<section class="paper-preparation"><h2>開始前，準備紙筆和計算機</h2><ol><li>選一份未做過的卷，在新分頁開啟，或下載列印。</li><li>先看封面的作答時間和指示；未能一次完成，可記下停在哪題，下次繼續。</li><li>做完才對答案，分清自己做到、需要協助和仍未明白的題，再回「同類題搜尋」補練。</li></ol><p class="note">部分檔案附有評分資料，操卷時先不要往後看。本頁目前只有卷一，未收錄卷二 MC；整卷成績和用時不會自動記錄。</p></section>
  <div class="section-heading"><h2>歷年卷一 <span class="count">${years.length} 份</span></h2></div><div class="whole-paper-grid">${years.map(paperCard).join('')}</div>
  ${data.papers.PP?`<section class="extra-paper"><h2>想多練一份？</h2>${paperCard('PP')}</section>`:''}`;
}
function savedPage(){
  const all=Object.entries(stored).filter(([,v])=>v.saved).map(([id,v])=>({...getQuestion(id),savedTime:v.time})).filter(q=>q.id).sort((a,b)=>b.savedTime-a.savedTime);
  const selected=all.filter(q=>state.savedFilter==='all'||(state.savedFilter==='stuck'?stored[key(q)]?.outcome==='stuck':state.savedFilter==='done'?isDone(q):!isDone(q)));
  const rows=selected.filter(q=>!extra.hideOutside||!outsideScope(q));
  state.savedPage=Math.min(state.savedPage,Math.max(1,Math.ceil(rows.length/6)));
  main.innerHTML=head('YOUR PRACTICE','留給下一次的自己。','收藏想再做的題目，把每一步進展留在這裡。')+
  `<div class="saved-stats"><span>已收藏 <strong>${all.length}</strong></span><span>已完成 <strong>${all.filter(isDone).length}</strong></span><span>待完成 <strong>${all.filter(q=>!isDone(q)).length}</strong></span></div>
  <div class="section-heading">${segment([['all','全部'],['stuck','還未明白'],['pending','待完成'],['done','已完成']],state.savedFilter,'saved-filter')}</div>
  ${scopeFilter()}${state.savedFilter==='stuck'?'<p class="retry-intro">先挑一題，看一點提示再試；明白後重新選擇掌握程度，這題便會移出本清單。</p>':''}
  ${rows.length?`<div class="result-grid">${rows.slice((state.savedPage-1)*6,state.savedPage*6).map(q=>card(q,{match:false})).join('')}</div>${pager(rows.length,state.savedPage,'saved-page')}`:empty(state.savedFilter==='stuck'?'目前沒有顯示「還未明白」的題目':'目前沒有符合的收藏',extra.hideOutside&&selected.length?'有題目被超綱篩選隱藏；取消勾選可查看。':'做題時選擇掌握程度，或按書籤收藏，便能在這裏繼續。','<a class="primary" href="#find">尋找同類題</a>')}
  ${backupPanel()}
  <p class="storage-note">${memoryOnly?'瀏覽器未能永久儲存，本次紀錄只會暫存。':'操練紀錄只儲存在本機瀏覽器，不會上傳；更換裝置或清除瀏覽器資料後不會保留。'}</p>`;
}
function render(){
  document.querySelectorAll('nav a').forEach(a=>{const active=a.dataset.route===state.route;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  ({find:findPage,topics:topicsPage,papers:papersPage,guide:guidePage,saved:savedPage}[state.route]||findPage)();
  icons();updateCount();
}
function openPaper(q){
  if(!q)return;
  extra.last={id:key(q),whole:Boolean(q.parts),time:Date.now()};persist();
  if(!dialog.open)lastFocus=document.activeElement;
  viewer={q,page:q.page||1,zoom:1,reading:false,hints:{},stationOpen:false,method:null};
  drawViewer();
  if(!dialog.open)dialog.showModal();
  dialog.querySelector('[data-action="close"]')?.focus();
}
function focusHints(){
  const section=dialog.querySelector('.question-hints');
  section.tabIndex=-1;
  section.focus();
  section.scrollIntoView({block:'nearest'});
}
function drawViewer(){
  const {q,page}=viewer,paper=data.papers[q.year];
  dialog.classList.toggle('reading-mode',viewer.reading);
  dialog.innerHTML=`<div class="viewer-head"><div><h2 id="paper-title">${yearName(q.year)} · Q${esc(q.q)}</h2><p>${sectionName[q.section]} · 大題 ${q.parentMarks} 分 ${q.parts?'':typeof q.marks==='number'?`· 本分題 ${q.marks} 分`:''}</p>${outsideScope(q)?'<small class="scope-badge">已超出課程範圍 · 極坐標</small>':''}</div><div class="viewer-head-actions"><button class="secondary" data-action="reading" aria-pressed="${viewer.reading}">${viewer.reading?'返回提示':'放大看題'}</button><button class="icon-button" data-action="close" aria-label="關閉原題">${icon('x')}</button></div></div>
  ${viewer.reading?`<div class="reading-toolbar" aria-label="看題工具"><button class="secondary" data-action="paper-page" data-value="${page-1}" ${page===1?'disabled':''}>上一頁</button><span>第 ${page} / ${paper.pages} 頁</span><button class="secondary" data-action="paper-page" data-value="${page+1}" ${page===paper.pages?'disabled':''}>下一頁</button><button class="secondary" data-action="zoom-fit">看整頁寬</button><button class="secondary" data-action="zoom" data-value="0.5" ${viewer.zoom>=3?'disabled':''}>放大 +</button><p>可上下、左右滑動原卷。這是整頁，請找 Q${esc(q.q)}；題目可能延續至下一頁。</p></div>`:''}
  <div class="viewer-body"><div class="page-scan" tabindex="0" role="region" aria-label="原卷圖片，可捲動查看"><img style="width:${viewer.zoom*100}%;max-width:${viewer.zoom===1?'900px':'none'}" src="pages/${q.year}/${page}.jpg" alt="${yearName(q.year)} 原卷第 ${page} 頁"></div><aside class="viewer-aside" ${viewer.reading?'hidden':''}>
  <div class="zoom-controls"><button class="icon-button" data-action="zoom" data-value="-0.5" ${viewer.zoom<=1?'disabled':''} aria-label="縮小原題" data-tip="縮小">${icon('zoom-out')}</button><span>${viewer.zoom*100}%</span><button class="icon-button" data-action="zoom" data-value="0.5" ${viewer.zoom>=3?'disabled':''} aria-label="放大原題" data-tip="放大">${icon('zoom-in')}</button><button class="icon-button" data-action="zoom-fit" aria-label="符合頁寬" data-tip="符合頁寬">${icon('maximize')}</button></div>
  <div class="page-controls"><button class="icon-button" data-action="paper-page" data-value="${page-1}" ${page===1?'disabled':''} aria-label="原卷上一頁">${icon('chevron-left')}</button><select id="paper-page" aria-label="原卷頁數">${Array.from({length:paper.pages},(_,i)=>`<option value="${i+1}" ${page===i+1?'selected':''}>第 ${i+1} / ${paper.pages} 頁</option>`).join('')}</select><button class="icon-button" data-action="paper-page" data-value="${page+1}" ${page===paper.pages?'disabled':''} aria-label="原卷下一頁">${icon('chevron-right')}</button></div>
  ${!q.page?`<p class="note">${icon('info')}這份原卷尚未定位題號，請用頁數選單尋找 Q${esc(q.q)}。</p>`:`<p class="note">${icon('info')}已定位大題起始頁；題目可能延續至下一頁。</p>`}
  ${scopeNotice(q)}<section class="student-summary"><h3>這題要做甚麼？</h3><p class="detail-copy">${esc(summaryOf(q))}</p>${summaryHelp(q)}</section><div class="tags">${q.topics.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
  ${hintsPanel(q)}${station(q.topics,'viewer',q)}
  ${learningPanel(q)}
  <details class="legacy-completion"><summary>只記錄完成狀態</summary><button class="secondary" data-action="viewer-done">${icon(isDone(q)?'circle-check':'check')} ${isDone(q)?'已完成 · 改回待完成':'標記已完成'}</button></details>
  <button class="secondary" data-action="viewer-save">${icon('bookmark')} ${isSaved(q)?'取消收藏':'加入我的操練'}</button>
  <a class="secondary" href="${paper.url}#page=${page}" target="_blank" rel="noopener">${icon('external-link')}開啟原卷 PDF</a>
  <p class="hint">${esc(q.note||'分數為大題總分，不可當作每個分題或課題的獨立配分。')}<br>部分原卷含評分資料。</p></aside></div>`;
  icons();
}
function refreshCards(){if(state.route==='find')drawResults();else if(state.route==='saved')savedPage();else if(state.route==='topics')drawTopicExamples();icons();}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b||b.disabled||!data)return;
  const a=b.dataset.action,v=b.dataset.value;
  if(a==='entry'){state.entry=v;findPage();document.querySelector(`[data-action="entry"][data-value="${v}"]`)?.focus();}
  else if(a==='resume'){
    const q=extra.last&&getQuestion(extra.last.id,extra.last.whole);
    if(q){state.entry='lookup';state.level=q.parts?'whole':'part';state.year=q.year;state.q=q.q;state.source=q;state.selected=[...q.topics];state.page=1;findPage();document.querySelector('.question-start .primary')?.focus();openPaper(q);}
  }
  else if(a==='show-stuck'){state.savedFilter='stuck';state.savedPage=1;location.hash='saved';}
  else if(a==='export-progress')exportProgress();
  else if(a==='cancel-import'){importReadId++;pendingImport=null;backupMessage='已取消，紀錄沒有更改。';savedPage();icons();}
  else if(a==='confirm-import'&&pendingImport){
    const merged=mergeProgress({questions:stored,extra},pendingImport);
    const previous={stored,extra};stored=merged.questions;extra=merged.extra;
    if(persist()){pendingImport=null;backupMessage='已合併及儲存。可在「我的操練」及「整卷操練」查看。';}
    else{stored=previous.stored;extra=previous.extra;backupMessage='未能永久儲存，沒有套用匯入。請先下載現有進度備份。';}
    savedPage();icons();updateCount();
  }
  else if(a==='starter'){
    const q=getQuestion(b.dataset.id);
    state.entry='lookup';state.level='part';state.year=q.year;state.q=q.q;state.source=q;state.selected=[...q.topics];state.page=1;state.match='all';state.section='all';state.pp=false;
    findPage();document.querySelector('.question-start .primary')?.focus();openPaper(q);
  }
  else if(a==='level'){
    if(state.level===v)return;
    state.level=v;state.q=selectAvailableQuestion(state.q).q;state.source=null;
    findPage();runSearch();icons();
  }
  else if(a==='match'){state.match=v;state.page=1;redrawFilters(`[data-action="match"][data-value="${v}"]`);}
  else if(a==='reset-filters'){state.match='all';state.section='all';state.pp=false;state.selected=[...state.source.topics];state.page=1;state.advanced=true;redrawFilters('.filter-footer [data-action="reset-filters"]');}
  else if(a==='toggle-topic'){state.selected=state.selected.includes(v)?state.selected.filter(t=>t!==v):[...state.selected,v];state.page=1;redrawFilters(`[data-action="toggle-topic"][data-value="${CSS.escape(v)}"]`);}
  else if(a==='page'){state.page=Number(v);drawResults();document.querySelector('.section-heading')?.scrollIntoView({block:'start'});}
  else if(a==='open')openPaper(getQuestion(b.dataset.id,b.dataset.whole==='true'));
  else if(a==='open-hints'){openPaper(getQuestion(b.dataset.id,b.dataset.whole==='true'));focusHints();}
  else if(a==='focus-hints')focusHints();
  else if(a==='outcome'){recordOutcome(viewer.q,v);drawViewer();refreshCards();dialog.querySelector(`[data-action="outcome"][data-value="${v}"]`)?.focus();}
  else if(a==='retry'){openPaper(viewer.q);}
  else if(a==='next-practice'){
    const q=getQuestion(b.dataset.id,b.dataset.whole==='true');
    if(state.route==='find'){
      state.entry='lookup';state.level=q.parts?'whole':'part';state.year=q.year;state.q=q.q;state.source=q;state.selected=[...q.topics];state.page=1;
      findPage();lastFocus=document.querySelector('.question-start .primary');
    }
    openPaper(q);
  }
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
  else if(a==='reading'){
    viewer.reading=!viewer.reading;
    if(viewer.reading){viewer.previousZoom=viewer.zoom;viewer.zoom=Math.max(1.5,viewer.zoom);}
    else viewer.zoom=viewer.previousZoom||1;
    drawViewer();dialog.querySelector('[data-action="reading"]').focus();
  }
  else if(a==='paper-page'){viewer.page=Number(v);drawViewer();if(viewer.reading)dialog.querySelector('.page-scan').focus();}
  else if(a==='zoom'){viewer.zoom=Math.max(1,Math.min(3,viewer.zoom+Number(v)));drawViewer();}
  else if(a==='zoom-fit'){viewer.zoom=1;drawViewer();}
  else if(a==='viewer-save'){save(viewer.q);drawViewer();refreshCards();}
  else if(a==='viewer-done'){done(viewer.q);drawViewer();refreshCards();}
  else if(a==='topic-section'){state.topicSection=v;state.topicPage=1;topicsPage();}
  else if(a==='topic-page'){state.topicPage=Number(v);drawChart();}
  else if(a==='topic-detail'){state.topicDetail=v;drawTopicExamples();document.querySelector('#topic-examples').scrollIntoView({block:'start'});}
  else if(a==='close-topic'){state.topicDetail=null;drawTopicExamples();}
  else if(a==='guide-tab'){state.guide=v;guidePage();}
  else if(a==='jump'){const q=getQuestion(b.dataset.id);state.entry='lookup';state.level='part';state.year=q.year;state.q=q.q;state.source=q;state.selected=[...q.topics];state.page=1;state.section='all';state.match='all';location.hash='find';state.route='find';render();window.scrollTo(0,0);}
  else if(a==='saved-filter'){state.savedFilter=v;state.savedPage=1;savedPage();}
  else if(a==='saved-page'){state.savedPage=Number(v);savedPage();}
  icons();
});
document.addEventListener('submit',e=>{
  if(e.target.id==='search-form'){e.preventDefault();runSearch(e.target.question.value,e.target.year.value);}
  if(e.target.matches('[data-paper-record]')){
    e.preventDefault();const form=e.target,year=form.dataset.paperRecord;
    extra.papers[year]={question:form.elements.question.value,status:form.elements.status.value,time:Date.now()};
    const success=persist();form.querySelector('.paper-record-message').textContent=success?'已儲存：'+(extra.papers[year].question?'Q'+extra.papers[year].question+' · ':'')+paperStatuses[extra.papers[year].status]:'只暫存於本次使用，請到「我的操練」下載備份。';
  }
});
document.addEventListener('toggle',e=>{if(e.target.isConnected&&e.target.matches('.advanced-filters'))state.advanced=e.target.open;},true);
document.addEventListener('change',async e=>{
  if(e.target.id==='import-progress'){
    const file=e.target.files[0];if(!file)return;
    const readId=++importReadId;
    pendingImport=null;
    try{
      if(file.size>1024*1024)throw new Error('檔案太大，請選擇 1 MB 以內的進度備份。');
      const text=await file.text();if(readId!==importReadId)return;
      pendingImport=validateBackup(JSON.parse(text),data);
      backupMessage='檔案已檢查，尚未更改紀錄。';
    }catch(error){backupMessage=error instanceof SyntaxError?'無法讀取這個檔案，請選擇網站下載的 JSON 備份。':error.message;}
    if(state.route==='saved'){savedPage();icons();document.querySelector('.backup-panel')?.scrollIntoView({block:'nearest'});}
    return;
  }
  if(e.target.matches('[data-hide-outside]')){
    extra.hideOutside=e.target.checked;state.page=1;state.savedPage=1;persist();
    if(state.route==='find')drawResults();else if(state.route==='saved')savedPage();else if(state.route==='topics')drawTopicExamples();
    icons();document.querySelector('[data-hide-outside]')?.focus({preventScroll:true});return;
  }
  if(e.target.dataset.technique){
    const t=techniques[Number(e.target.value)];
    if(!t)return;
    if(e.target.dataset.technique==='viewer')viewer.method=Number(e.target.value);
    e.target.closest('.technique-station').querySelector('.technique-copy').innerHTML=techniqueCopy(t);
  }
  if(e.target.id==='year'){
    state.year=e.target.value;state.q=selectAvailableQuestion(state.q).q;
    document.querySelector('#question').innerHTML=questionChoices();
    runSearch();
  }
  if(e.target.id==='question')runSearch(e.target.value);
  if(e.target.id==='section-filter'){state.section=e.target.value;state.page=1;redrawFilters('#section-filter');}
  if(e.target.id==='pp-filter'){state.pp=e.target.checked;state.page=1;redrawFilters('#pp-filter');}
  if(e.target.id==='paper-page'){viewer.page=Number(e.target.value);drawViewer();}
});
dialog.addEventListener('toggle',e=>{
  if(viewer&&e.target.dataset.station==='viewer')viewer.stationOpen=e.target.open;
},true);
document.addEventListener('input',e=>{if(e.target.id==='topic-search'){state.topicSearch=e.target.value;state.topicPage=1;drawChart();}});
dialog.addEventListener('close',()=>{
  viewer=null;
  if(state.route==='find'){const old=document.querySelector('.resume-panel');if(old){old.outerHTML=resumePanel();icons();}}
  (lastFocus?.isConnected?lastFocus:document.querySelector('.question-start .primary, nav a'))?.focus();
});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
window.addEventListener('hashchange',()=>{state.route=location.hash.slice(1)||'find';if(!['find','topics','papers','guide','saved'].includes(state.route))state.route='find';render();window.scrollTo(0,0);});
try{
  const response=await fetch('data.json');if(!response.ok)throw new Error('data unavailable');
  data=await response.json();
  try{extra=validateBackup({app:'dse-maths',version:1,questions:{},extra},data).extra;}
  catch{extra={last:null,papers:{},hideOutside:false};}
  state.source=pool().find(q=>q.year===state.year&&q.q===state.q);
  state.selected=[...state.source.topics];state.route=location.hash.slice(1)||'find';
  if(!['find','topics','papers','guide','saved'].includes(state.route))state.route='find';
  render();
}catch(err){main.innerHTML=empty('題庫暫時未能載入','請確認網站服務已啟動，再重新載入。','<button class="primary" onclick="location.reload()">重新載入</button>');console.error(err);}
