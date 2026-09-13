import {trigoModels,trigoKey,add,sub,mul,dot,length,unit,cross} from './trigo-models.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const radians=a=>a*Math.PI/180;
export const orbitDefaults=key=>({azimuth:key==='2026:17'?25:35,elevation:key==='2017:19'?60:24,mode:0,labels:false,expanded:false});
const modes=['看整個模型','看關鍵平面','加上輔助線'];
function current(state,key){
  if(state.trigo?.key!==key)state.trigo={key,...orbitDefaults(key)};
  return state.trigo;
}
export function trigoVisual(q,state={}){
  const key=trigoKey(q);
  if(!key)return '';
  const model=trigoModels[key](),s=current(state,key);
  return `<section class="trigo-visual" data-trigo-key="${esc(key)}" aria-label="360 度立體圖">
    <div class="trigo-heading"><span>轉一轉，看清楚</span><h4>${esc(model.title)}</h4></div>
    <button type="button" class="trigo-expand" data-trigo-expand aria-pressed="${!!s.expanded}">${s.expanded?'返回原題和提示':'放大立體圖'}</button>
    <p class="trigo-intro">用滑鼠或一隻手指拖動圖形，可轉足一圈。只改變觀看方向，不改變題目尺寸。</p>
    <div class="trigo-modes" role="group" aria-label="立體圖學習步驟">${modes.map((v,i)=>`<button type="button" data-trigo-mode="${i}" aria-pressed="${i===s.mode}">${v}</button>`).join('')}</div>
    <div class="trigo-stage"></div>
    <p class="trigo-legend">實線：看得見的邊　灰色虛線：被擋住的邊${s.mode===2?'　紅色虛線：輔助線':''}</p>
    <p class="trigo-caption">${esc(s.mode?model.help[s.mode-1]:'先認一認各個頂點；再按「看關鍵平面」，比較題目提到的面。')}</p>
    <div class="trigo-presets" role="group" aria-label="立體圖觀看方向">
      <button type="button" data-trigo-view="reset">重設視角</button><button type="button" data-trigo-view="top">從上面看</button><button type="button" data-trigo-view="side">從側面看</button>
      ${model.focus.map((face,i)=>`<button type="button" data-trigo-face="${i}">正對 ${esc(face.join(''))} 面看</button>`).join('')}
    </div>
    <div class="trigo-sliders">
      <label>左右旋轉 <output data-trigo-angle="azimuth">${s.azimuth}°</output><input type="range" min="0" max="360" step="1" value="${s.azimuth}" data-trigo-orbit="azimuth" aria-label="左右旋轉角度"></label>
      <label>上下觀看 <output data-trigo-angle="elevation">${s.elevation}°</output><input type="range" min="-90" max="90" step="1" value="${s.elevation}" data-trigo-orbit="elevation" aria-label="上下觀看角度"></label>
    </div>
    <label class="trigo-label-toggle"><input type="checkbox" data-trigo-labels ${s.labels?'checked':''}> 顯示已知長度和角度</label>
    <ul class="trigo-facts">${model.facts.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
    <p class="trigo-note">${esc(model.note||'新增的垂足只幫助看圖，不會預先填上答案。')} 「看關鍵平面」會淡化其他面，方便看清內部；請勿用尺量圖求答案。</p>
    <span class="trigo-status" role="status"></span>
  </section>`;
}

export function renderTrigo(model,s,width=320,height=340){
  const p=model.points,extras=new Set(model.extraPoints||[]);
  const removed=new Set(s.mode?model.cutHidden||[]:[]);
  const faces=s.mode&&model.cutFaces?model.cutFaces:model.faces;
  const visible=Object.keys(p).filter(n=>!removed.has(n)&&(s.mode===2||!extras.has(n)));
  const all=Object.values(p),lo=[0,1,2].map(i=>Math.min(...all.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...all.map(p=>p[i])));
  const centre=mul(add(lo,hi),.5),radius=Math.max(...all.map(p=>length(sub(p,centre))));
  const a=radians(s.azimuth),e=radians(s.elevation);
  const camera=point=>{
    const [x,y,z]=sub(point,centre),horizontal=x*Math.cos(a)-y*Math.sin(a),depth=x*Math.sin(a)+y*Math.cos(a);
    // Screen y points down; positive elevation looks down from above the ground.
    // Larger camera depth is nearer, matching the face painter and hidden-edge test.
    return [horizontal,-depth*Math.sin(e)-z*Math.cos(e),-depth*Math.cos(e)+z*Math.sin(e)];
  };
  const bounds=visible.map(n=>camera(p[n]));
  const min=[0,1].map(i=>Math.min(...bounds.map(v=>v[i]))),max=[0,1].map(i=>Math.max(...bounds.map(v=>v[i])));
  const margin=s.labels?86:60;
  const scale=Math.min((width-margin)/Math.max(max[0]-min[0],radius*.15),(height-margin)/Math.max(max[1]-min[1],radius*.15));
  const project=point=>{const v=camera(point);return [width/2+(v[0]-(min[0]+max[0])/2)*scale,height/2+(v[1]-(min[1]+max[1])/2)*scale,v[2]];};
  const screen=Object.fromEntries(Object.entries(p).map(([n,p])=>[n,project(p)]));
  const path=(a,b,cls)=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="${cls}"/>`;
  const line=(a,b,cls)=>path(screen[a],screen[b],cls);
  const key=face=>[...face].sort().join(':');
  const focus=model.focus.map(key),polys=faces.map(f=>({f,tone:s.mode?(focus.includes(key(f))?focus.indexOf(key(f))+1:0):0}));
  if(s.mode)for(const [i,f]of model.focus.entries())if(!polys.some(v=>key(v.f)===key(f)))polys.push({f,tone:i+1});
  const shapes=polys.map(({f,tone})=>({pts:f.map(n=>screen[n]),tone,f}));
  shapes.sort((a,b)=>a.pts.reduce((n,p)=>n+p[2],0)/a.pts.length-b.pts.reduce((n,p)=>n+p[2],0)/b.pts.length);
  let content='';
  if(model.ground){
    const pad=radius*.16;
    const corners=[[lo[0]-pad,lo[1]-pad,0],[hi[0]+pad,lo[1]-pad,0],[hi[0]+pad,hi[1]+pad,0],[lo[0]-pad,hi[1]+pad,0]].map(project);
    content+=`<polygon points="${corners.map(p=>p.slice(0,2).join(',')).join(' ')}" class="trigo-ground"/>`;
    // A ground reference grid stays attached to the model, not the screen.
    for(let i=1;i<5;i++){
      const x=lo[0]+(hi[0]-lo[0])*i/5,y=lo[1]+(hi[1]-lo[1])*i/5;
      content+=path(project([x,lo[1]-pad,0]),project([x,hi[1]+pad,0]),'trigo-grid');
      content+=path(project([lo[0]-pad,y,0]),project([hi[0]+pad,y,0]),'trigo-grid');
    }
  }
  for(const {pts,tone,f}of shapes){
    const normal=unit(cross(sub(p[f[1]],p[f[0]]),sub(p[f[2]],p[f[0]])));
    const light=.45+.55*Math.abs(dot(normal,unit([-.4,-.6,1])));
    const shade=Math.round(60+light*18);
    content+=`<polygon points="${pts.map(p=>p.slice(0,2).join(',')).join(' ')}" style="--face-shade:hsl(157 25% ${shade}%)" class="trigo-face trigo-tone-${tone}${s.mode?' is-focused':''}" data-face="${esc(f.join(''))}"/>`;
  }
  const surfaces=faces.flatMap(f=>f.slice(1,-1).map((_,i)=>[screen[f[0]],screen[f[i+1]],screen[f[i+2]]]));
  // Compare depth within projected face triangles; split edges at occlusion changes.
  const blocked=point=>surfaces.some(([a,b,c])=>{
    const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if(Math.abs(det)<1e-8)return false;
    const u=((b[1]-c[1])*(point[0]-c[0])+(c[0]-b[0])*(point[1]-c[1]))/det;
    const v=((c[1]-a[1])*(point[0]-c[0])+(a[0]-c[0])*(point[1]-c[1]))/det,w=1-u-v;
    return Math.min(u,v,w)>-1e-8&&u*a[2]+v*b[2]+w*c[2]>point[2]+radius*1e-6;
  });
  const hiddenEdges=[],frontEdges=[];
  const edge=(a,b,cls)=>{
    const start=screen[a],delta=sub(screen[b],start);
    if(Math.hypot(delta[0],delta[1])<1e-6)return;
    let from=0,hidden=blocked(add(start,mul(delta,.5/48)));
    for(let i=1;i<=48;i++){
      const next=i<48?blocked(add(start,mul(delta,(i+.5)/48))):!hidden;
      if(next!==hidden){
        const segment=path(add(start,mul(delta,from/48)),add(start,mul(delta,i/48)),hidden?'trigo-hidden':cls)
          .replace('<line ',`<line data-edge="${esc(a+':'+b)}" `);
        (hidden?hiddenEdges:frontEdges).push(segment);
        from=i;hidden=next;
      }
    }
  };
  const edges=new Map();
  const register=(f,cls)=>f.forEach((n,i)=>{
    const pair=[n,f[(i+1)%f.length]].sort();
    edges.set(pair.join(':'),{pair,cls});
  });
  for(const f of faces)register(f,'trigo-edge');
  // Shared edges are drawn once, in a stable direction, so dashes cannot fill each other's gaps.
  if(s.mode)for(const f of model.focus)register(f,'trigo-focus-edge');
  for(const {pair,cls}of edges.values())edge(...pair,cls);
  content+=hiddenEdges.join('')+frontEdges.join('');
  if(s.mode===2)for(const [a,b]of model.aux)content+=line(a,b,'trigo-aux');
  const labels=[];
  for(const n of visible){
    const [x,y]=screen[n];
    content+=`<circle data-vertex="${esc(n)}" cx="${x}" cy="${y}" r="3" class="${extras.has(n)?'trigo-foot':'trigo-point'}"/>`;
    labels.push({text:n,x,y,vertex:true});
  }
  if(s.labels){
    for(const [a,b,text]of model.measures){
      if(removed.has(a)||removed.has(b))continue;
      const mid=mul(add(p[a],p[b]),.5),[x,y]=project(mid);
      labels.push({text,x,y});
    }
    for(const [a,b,c,text]of [...model.angles,...(s.mode===2?model.auxAngles:[])]){
      if([a,b,c].some(n=>removed.has(n)))continue;
      const u=unit(sub(p[a],p[b])),v=unit(sub(p[c],p[b])),angle=Math.acos(Math.max(-1,Math.min(1,dot(u,v))));
      const radiusArc=Math.min(length(sub(p[a],p[b])),length(sub(p[c],p[b])))*.19;
      const points=Array.from({length:17},(_,i)=>{
        const t=i/16,dir=add(mul(u,Math.sin((1-t)*angle)/Math.sin(angle)),mul(v,Math.sin(t*angle)/Math.sin(angle)));
        return project(add(p[b],mul(dir,radiusArc)));
      });
      content+=`<polyline points="${points.map(p=>p.slice(0,2).join(',')).join(' ')}" class="trigo-angle"/>`;
      const [x,y]=project(add(p[b],mul(unit(add(u,v)),radiusArc*1.45)));
      labels.push({text,x,y});
    }
  }
  // Place screen-space labels after projection so they remain upright at every angle.
  const boxes=[];
  for(const item of labels){
    const w=Math.max(18,item.text.length*7.6+8),h=20;
    const away=Math.atan2(item.y-height/2,item.x-width/2);
    const candidates=[];
    for(const r of [15,29,45,64,84,108])for(let i=0;i<16;i++){
      const a=away+i*Math.PI/8,x=Math.max(w/2+4,Math.min(width-w/2-4,item.x+r*Math.cos(a))),y=Math.max(14,Math.min(height-14,item.y+r*Math.sin(a)));
      const box={x,y,w,h};
      const overlap=boxes.reduce((sum,b)=>sum+Math.max(0,(w+b.w)/2+4-Math.abs(x-b.x))*Math.max(0,(h+b.h)/2+3-Math.abs(y-b.y)),0);
      candidates.push({box,score:overlap*1000+Math.hypot(x-item.x,y-item.y)+i*.25});
    }
    candidates.sort((a,b)=>a.score-b.score);const box=candidates[0].box;boxes.push(box);
    content+=(Math.hypot(box.x-item.x,box.y-item.y)>24?path([item.x,item.y],[box.x,box.y],'trigo-leader'):'')+
      `<text x="${box.x}" y="${box.y}" class="trigo-text ${item.vertex?'trigo-vertex-label':''}" data-label="${esc(item.text)}">${esc(item.text)}</text>`;
  }
  return `<svg class="trigo-picture" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(model.title+'；'+modes[s.mode])}"><title>${esc(model.title)}</title><desc>${esc(model.facts.join(' ')+' '+(s.mode?model.help[s.mode-1]:''))}</desc>${content}</svg>
    <span class="trigo-drag-tip" aria-hidden="true">拖動旋轉 · 360°${model.ground?' · 格線是水平地面':''}</span>`;
}

export function bindTrigoVisual(container,q,state){
  const root=container.querySelector('.trigo-visual'),key=trigoKey(q);
  if(!root||!key)return;
  const model=trigoModels[key](),s=current(state,key),stage=root.querySelector('.trigo-stage'),dialog=root.closest('dialog');
  state.trigoCleanup?.();
  dialog?.classList.toggle('trigo-enlarged',!!s.expanded&&!dialog.classList.contains('reading-mode'));
  const redraw=()=>{
    const height=s.expanded?Math.max(340,Math.min(620,window.innerHeight*.62)):380;
    stage.style.setProperty('--trigo-height',`${height}px`);
    stage.innerHTML=renderTrigo(model,s,Math.max(220,Math.round(stage.getBoundingClientRect().width)),height);
    root.querySelectorAll('[data-trigo-angle]').forEach(o=>{o.textContent=`${Math.round(s[o.dataset.trigoAngle])}°`;});
    root.querySelectorAll('[data-trigo-orbit]').forEach(i=>{i.value=s[i.dataset.trigoOrbit];});
  };
  const announce=()=>{root.querySelector('.trigo-status').textContent=`視角：左右 ${Math.round(s.azimuth)}°，上下 ${Math.round(s.elevation)}°。`;};
  root.querySelectorAll('[data-trigo-mode]').forEach(b=>b.addEventListener('click',()=>{
    s.mode=Number(b.dataset.trigoMode);
    root.querySelectorAll('[data-trigo-mode]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.trigoMode)===s.mode)));
    root.querySelector('.trigo-caption').textContent=s.mode?model.help[s.mode-1]:'先認一認各個頂點；再按「看關鍵平面」，比較題目提到的面。';
    root.querySelector('.trigo-legend').textContent='實線：看得見的邊　灰色虛線：被擋住的邊'+(s.mode===2?'　紅色虛線：輔助線':'');
    redraw();
  }));
  root.querySelectorAll('[data-trigo-view]').forEach(b=>b.addEventListener('click',()=>{
    const view=b.dataset.trigoView;
    const pose=view==='top'?{azimuth:0,elevation:90}:view==='side'?{azimuth:0,elevation:0}:orbitDefaults(key);
    s.azimuth=pose.azimuth;s.elevation=pose.elevation;redraw();announce();
  }));
  root.querySelectorAll('[data-trigo-face]').forEach(b=>b.addEventListener('click',()=>{
    const f=model.focus[Number(b.dataset.trigoFace)],p=model.points;
    let n=unit(cross(sub(p[f[1]],p[f[0]]),sub(p[f[2]],p[f[0]])));
    if(n[2]<0)n=mul(n,-1);
    s.azimuth=(Math.atan2(-n[0],-n[1])*180/Math.PI+360)%360;
    s.elevation=Math.asin(Math.max(-1,Math.min(1,n[2])))*180/Math.PI;
    root.querySelector('[data-trigo-mode="1"]').click();redraw();announce();
  }));
  const expand=()=>{
    s.expanded=!s.expanded;dialog?.classList.toggle('trigo-enlarged',s.expanded);
    const button=root.querySelector('[data-trigo-expand]');
    button.textContent=s.expanded?'返回原題和提示':'放大立體圖';
    button.setAttribute('aria-pressed',String(s.expanded));redraw();
    root.scrollIntoView({block:'start'});button.focus();
  };
  root.querySelector('[data-trigo-expand]').addEventListener('click',expand);
  const escape=e=>{if(e.key==='Escape'&&s.expanded){e.preventDefault();e.stopPropagation();expand();}};
  dialog?.addEventListener('keydown',escape,true);
  root.querySelectorAll('[data-trigo-orbit]').forEach(i=>{
    i.addEventListener('input',()=>{s[i.dataset.trigoOrbit]=Number(i.value);redraw();});
    i.addEventListener('change',announce);
  });
  root.querySelector('[data-trigo-labels]').addEventListener('change',e=>{s.labels=e.target.checked;redraw();});
  let drag=null;
  stage.addEventListener('pointerdown',e=>{
    if(e.button!==0||drag)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,a:s.azimuth,e:s.elevation};
    stage.setPointerCapture(e.pointerId);stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    s.azimuth=((drag.a+(e.clientX-drag.x)*.7)%360+360)%360;
    s.elevation=Math.max(-85,Math.min(85,drag.e-(e.clientY-drag.y)*.5));redraw();
  });
  const end=e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;stage.classList.remove('is-dragging');announce();};
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('lostpointercapture',end);
  // Abort old observers when the question dialog is rebuilt (zoom/reading controls).
  let lastWidth=0;
  const resize=new ResizeObserver(entries=>{
    const width=Math.round(entries[0].contentRect.width);
    if(width>0&&width!==lastWidth){lastWidth=width;redraw();}
  });
  resize.observe(stage);
  state.trigoCleanup=()=>{resize.disconnect();dialog?.classList.remove('trigo-enlarged');dialog?.removeEventListener('keydown',escape,true);};
  redraw();
}
