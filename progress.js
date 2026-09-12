export const paperStatuses={working:'仍在作答',uncorrected:'已做完，尚未訂正',corrected:'已訂正'};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const timestamp=v=>Number.isSafeInteger(v)&&v>=0&&v<=Date.now()+86400000;
export function validateBackup(input,data){
  const fail=()=>{throw new Error('備份格式或題目資料不正確，尚未更改任何紀錄。');};
  if(!object(input)||input.app!=='dse-maths'||input.version!==1||!object(input.questions)||!object(input.extra))fail();
  const validIds=new Set([...data.questions,...data.groups].map(q=>q.id));
  const questions={};
  if(Object.keys(input.questions).length>validIds.size)fail();
  for(const [id,v] of Object.entries(input.questions)){
    if(!validIds.has(id)||!object(v)||typeof v.saved!=='boolean'||typeof v.done!=='boolean'||!timestamp(v.time))fail();
    if(v.outcome!=null&&!['independent','supported','stuck'].includes(v.outcome))fail();
    if(v.outcome==='stuck'&&v.done||['independent','supported'].includes(v.outcome)&&!v.done)fail();
    questions[id]={saved:v.saved,done:v.done,outcome:v.outcome||null,time:v.time};
  }
  const extra={last:null,papers:{},hideOutside:input.extra.hideOutside===true};
  if(input.extra.last!=null){
    const v=input.extra.last;
    if(!object(v)||typeof v.whole!=='boolean'||!timestamp(v.time)||!(v.whole?data.groups:data.questions).some(q=>q.id===v.id))fail();
    extra.last={id:v.id,whole:v.whole,time:v.time};
  }
  if(!object(input.extra.papers))fail();
  for(const [year,v] of Object.entries(input.extra.papers)){
    if(!Object.hasOwn(data.papers,year)||!object(v)||!Object.hasOwn(paperStatuses,v.status)||!timestamp(v.time))fail();
    if(v.question!==''&&!data.groups.some(q=>q.year===year&&q.q===v.question))fail();
    extra.papers[year]={question:v.question,status:v.status,time:v.time};
  }
  return {questions,extra};
}
export function mergeProgress(current,incoming){
  const mergeRows=(a,b)=>{
    const merged={...a};
    for(const [id,row] of Object.entries(b))if(!merged[id]||row.time>(merged[id].time||0))merged[id]=row;
    return merged;
  };
  return {
    questions:mergeRows(current.questions,incoming.questions),
    extra:{...current.extra,papers:mergeRows(current.extra.papers,incoming.extra.papers),
      last:!current.extra.last||(incoming.extra.last?.time||0)>current.extra.last.time?incoming.extra.last:current.extra.last}
  };
}
