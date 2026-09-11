export function normalizeQuestion(value) {
  return String(value).normalize('NFKC').trim().replace(/^q\s*/i,'').replace(/\s+/g,'').toLowerCase();
}
export function matchingQuestions(pool, source, {selected=source.topics, mode='all', section='all', pp=false}={}) {
  if (!selected.length) return [];
  const base = new Set(selected);
  return pool.filter(q => q.year !== source.year && (pp || q.year !== 'PP') && (section==='all'||q.section===section))
    .map(q=>{
      const shared=q.topics.filter(t=>base.has(t));
      return {...q, shared, exact:q.topics.length===base.size && shared.length===base.size,
        score:shared.length/new Set([...selected,...q.topics]).size};
    })
    .filter(q => mode==='exact' ? q.exact : mode==='all' ? q.shared.length===base.size : q.shared.length>0)
    .sort((a,b)=>Number(b.exact)-Number(a.exact) || b.score-a.score || Number(b.section===source.section)-Number(a.section===source.section) || (Number(b.year)||0)-(Number(a.year)||0) || a.parent-b.parent || a.q.localeCompare(b.q));
}
