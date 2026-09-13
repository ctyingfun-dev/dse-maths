const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=(x,y,s)=>{
  const rows=[''];
  let width=0;
  for(const c of s){
    const units=/[^\u0000-\u007f]/.test(c)?2:1;
    if(x===160&&width+units>33){rows.push('');width=0;}
    rows[rows.length-1]+=c;width+=units;
  }
  return `<text x="${x}" y="${y}" text-anchor="middle">${rows.map((row,i)=>`<tspan x="${x}" dy="${i?19:0}">${esc(row)}</tspan>`).join('')}</text>`;
};
const line=(x1,y1,x2,y2,cls='qs-measure')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
const ellipse=(cx,cy,rx,ry,cls='qs-top')=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" class="${cls}"/>`;
const polygon=(pts,cls)=>`<polygon points="${pts}" class="${cls}"/>`;
function ball(cx,cy,r,prefix){
  return `<g data-object="sphere"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${prefix}-ball)" class="qs-outline"/>${ellipse(cx,cy,r,r*.24,'qs-equator')}</g>`;
}
function cylinder(cx,top,r,h,prefix,water=false){
  const bottom=top+h,ry=r*.25;
  return `<g data-object="cylinder"><path d="M${cx-r} ${top} V${bottom} A${r} ${ry} 0 0 0 ${cx+r} ${bottom} V${top} Z" fill="url(#${prefix}-${water?'water':'metal'})" class="qs-outline"/>${ellipse(cx,bottom,r,ry,'qs-equator')}${ellipse(cx,top,r,ry,water?'qs-water-top':'qs-top')}</g>`;
}
function cone(cx,top,r,h,prefix){
  const bottom=top+h;
  return `<g data-object="cone"><path d="M${cx} ${top} L${cx-r} ${bottom} A${r} ${r*.25} 0 0 0 ${cx+r} ${bottom} Z" fill="url(#${prefix}-metal)" class="qs-outline"/>${ellipse(cx,bottom,r,r*.25,'qs-equator')}</g>`;
}
// t is distance from the common apex divided by the full height.
function conePiece(a,b,offset,prefix,selected=false,tone=null){
  const cx=160,top=58,fullH=177,fullR=76;
  const y1=top+fullH*a+offset,y2=top+fullH*b+offset,r1=fullR*a,r2=fullR*b;
  return `<g data-object="${a===0?'cone':'frustum'}">
    <path d="M${cx-r1} ${y1} L${cx-r2} ${y2} A${r2} ${r2*.25} 0 0 0 ${cx+r2} ${y2} L${cx+r1} ${y1} Z" fill="url(#${prefix}-${tone||(selected?'warm':'metal')})" class="qs-outline"/>
    ${ellipse(cx,y2,r2,r2*.25,'qs-equator')}${r1?ellipse(cx,y1,r1,r1*.25,'qs-top'):''}</g>`;
}
function cube(prefix){
  return `<g data-object="cube">${polygon('85,108 170,76 237,115 151,148','qs-top')}${polygon('85,108 151,148 151,238 85,198','qs-face')}${polygon('151,148 237,115 237,205 151,238','qs-side')}</g>`;
}
function pyramidPiece(a,b,offset,selected=false){
  const apex=[160,38],base=[[76,206],[171,180],[244,238],[149,264]];
  const pts=t=>base.map(([x,y])=>[apex[0]+(x-apex[0])*t,apex[1]+(y-apex[1])*t+offset]);
  const up=pts(a),down=pts(b),p=(list)=>list.map(pt=>pt.join(',')).join(' ');
  return `<g data-object="${a===0?'square-pyramid':'square-frustum'}">
    ${polygon(p([up[0],down[0],down[3],up[3]]),selected?'qs-warm-face':'qs-face')}
    ${polygon(p([up[3],down[3],down[2],up[2]]),selected?'qs-warm-side':'qs-side')}
    ${a?polygon(p(up),'qs-top'):line(apex[0],apex[1]+offset,down[1][0],down[1][1],'qs-hidden')}
    ${line(...down[0],...down[1],'qs-hidden')}${line(...down[1],...down[2],'qs-hidden')}</g>`;
}
export function pouringValues(){
  const water=8**2*64,capacity=20**2*60/3,sphere=4*14**3/3;
  const initialDepth=Math.cbrt(water*27);
  // Volumes below omit the common factor pi. For this cone, V/pi = h^3/27.
  return {water,capacity,sphere,initialDepth,
    finalDepth:Math.cbrt((water+sphere)*27),
    ballCentre:14*Math.sqrt(10),ballTop:14*(Math.sqrt(10)+1),
    overflow:water+sphere>capacity};
}
function pourScene(stage,prefix){
  const v=pouringValues(),cx=225,tip=228,scale=2.7,top=tip-60*scale,r=20*scale;
  const depth=stage===0?0:stage===1?v.initialDepth:v.finalDepth;
  const surface=tip-depth*scale,wr=depth/3*scale;
  const vessel=`<path d="M${cx-r} ${top} L${cx} ${tip} L${cx+r} ${top}" class="qs-glass"/>`;
  const water=depth?`<path d="M${cx-wr} ${surface} L${cx} ${tip} L${cx+wr} ${surface} Z" fill="url(#${prefix}-water)" opacity=".65"/>`:'';
  return cylinder(70,45,8*scale,64*scale,prefix,stage===0)+label(70,246,'圓柱容器')+
    `<g data-object="inverted-cone">${vessel}${water}${stage===2?ball(cx,tip-v.ballCentre*scale,14*scale,prefix):''}
    ${depth?ellipse(cx,surface,wr,wr*.16,'qs-water-top'):''}${vessel}${ellipse(cx,top,r,r*.16,'qs-rim')}</g>`+
    label(225,246,'倒置圓錐容器')+
    (stage<2?ball(160,309,14*scale,prefix)+label(160,363,'實心金屬球'):label(160,310,'球已完全放入水中'))+
    label(70,24,stage===0?'裝滿水':'水已倒出');
}
function cutScene(kind,stage,prefix){
  const t=kind==='2023:14'?1/4:1/3;
  if(kind==='2020:12'){
    if(stage===2)return conePiece(1/3,2/3,30,prefix,true)+label(160,272,'要找的是中間這一件');
    const gap=stage===1?24:0;
    const planes=stage===0?
      ellipse(160,117,76/3,76/12,'qs-cut-plane')+ellipse(160,176,152/3,38/3,'qs-cut-plane'):'';
    return conePiece(0,1/3,-gap,prefix)+conePiece(1/3,2/3,0,prefix,true)+conePiece(2/3,1,gap,prefix,false,'blue')+planes+
      dimensionLabel(160,stage===0?100:76,'上段')+dimensionLabel(160,154,'中段')+dimensionLabel(160,stage===0?223:247,'下段')+
      label(160,322,stage===0?'三種顏色代表三段；粗線是圓形切面':'三件高度相等，形狀和大小不同');
  }
  if(stage===2){
    if(kind==='2023:14')return ball(86,153,52,prefix)+ball(234,153,52,prefix)+label(160,250,'只把 Y 熔化，重鑄成兩個相同球');
    return cube(prefix)+label(160,278,'只把 X 熔化，重鑄成正方體');
  }
  if(stage===0)return cone(160,45,76,190,prefix)+label(160,288,'實心金屬直立圓錐');
  return conePiece(0,t,-22,prefix)+conePiece(t,1,12,prefix,true)+
    label(55,83,kind==='2023:14'?'X':'小圓錐')+label(45,210,kind==='2023:14'?'Y':'X')+label(160,302,'上面的切面和下面的底面都是圓形');
}
function squareScene(stage){
  if(stage===2)return pyramidPiece(.48,1,0,true)+label(160,300,'另一件 Z：高 3 cm')+label(160,325,'總表面面積 960 cm²');
  if(stage===0)return pyramidPiece(0,1,0)+label(160,305,'底面是正方形，周界 64 cm');
  return `<g transform="translate(16 38) scale(.9)">${pyramidPiece(0,.75,-55)}${pyramidPiece(.75,1,15,true)}</g>`+label(260,80,'Y')+label(265,252,'X')+label(160,320,'切面與底面平行，也都是正方形');
}
function compareSolids(stage,prefix){
  return cylinder(57,119,24,96,prefix)+cone(151,100,24,115,prefix)+cone(254,114,48,101,prefix)+
    label(57,251,'圓柱 X')+label(151,251,'圓錐 Y')+label(254,251,'圓錐 Z')+
    label(57,277,'高 20 cm')+label(151,277,'高 24 cm')+label(254,277,'高未知')+
    (stage===1?line(57,119,81,119)+line(151,215,175,215)+line(254,215,302,215)+
      label(160,30,'X、Y 半徑相同；Z 半徑 = X 直徑'):'');
}
function spheresToCones(stage,prefix){
  if(stage===0)return ball(85,142,42,prefix)+ball(229,142,63,prefix)+label(85,242,'較小的球')+label(229,242,'較大的球')+label(160,35,'表面面積比 4：9');
  return cone(83,120,36,60,prefix)+cone(231,38,65,142,prefix)+label(83,234,'圓錐 A')+label(231,234,'圓錐 B')+label(160,285,'兩個球一起熔化 → 重鑄成 A 和 B');
}
function sphereToCylinders(stage,prefix){
  return ball(160,72,48,prefix)+label(160,144,'金屬球 → 熔化、重鑄')+
    cylinder(62,237-28.8,16,28.8,prefix)+cylinder(157,237-43.2,24,43.2,prefix)+cylinder(259,237-72,40,72,prefix)+
    label(62,275,'X')+label(157,275,'Y')+label(259,275,'Z')+
    (stage===1?label(160,338,'半徑比 r₁：r₂：r₃ = 2：3：5'):'');
}
function triangles(key,stage){
  if(key==='2023:8'){
    return polygon('55,65 175,65 145,125',stage?'qs-highlight':'qs-flat')+
      polygon('145,125 100,215 280,215',stage?'qs-highlight':'qs-flat')+
      line(55,65,280,215,'qs-edge')+line(175,65,100,215,'qs-edge')+
      label(42,60,'A')+label(187,60,'C')+label(160,128,'E')+label(87,230,'D')+label(293,230,'B')+
      label(160,278,stage?'看 △ACE 和 △BDE':'AC ∥ DB；AB、CD 相交於 E');
  }
  return polygon('35,260 87,45.675 195,260','qs-flat')+
    polygon('35,260 203,117.115 275,260',stage?'qs-highlight':'qs-flat')+
    (stage?polygon('35,260 147,164.743 195,260','qs-highlight'):'')+
    line(35,260,203,117.115,'qs-edge')+line(87,45.675,195,260,'qs-edge')+
    label(87,31,'A')+label(28,281,'C')+label(195,281,'B')+label(283,281,'E')+label(137,154,'D')+label(210,105,'F')+
    label(160,318,stage?'A 仍保留；突出小 △CBD 和大 △CEF':'BD ∥ EF；BC = EF');
}
function dimensionLabel(x,y,value){
  return `<text class="qs-dimension-label" x="${x}" y="${y}" text-anchor="middle">${esc(value)}</text>`;
}
function radiusMark(cx,cy,r,x,y,value){
  const end=cx+r;
  return `<g class="qs-dimension" aria-label="${esc(value)}"><circle class="qs-centre" cx="${cx}" cy="${cy}" r="2.5"/>${line(cx,cy,end,cy)}${line(end,cy,x,y-9,'qs-leader')}${dimensionLabel(x,y,value)}</g>`;
}
function heightMark(x,top,bottom,tx,ty,value){
  return `<g class="qs-dimension" aria-label="${esc(value)}">${line(x,top,x,bottom)}${line(x-4,top,x+4,top)}${line(x-4,bottom,x+4,bottom)}${dimensionLabel(tx,ty,value)}</g>`;
}
// Only original givens are numeric. Dimensions that require solving stay symbolic.
function dimensions(key,stage){
  if(key==='2018:14'){
    const cy=228-pouringValues().ballCentre*2.7;
    return radiusMark(70,45,21.6,119,83,'r = 8 cm')+
      heightMark(32,45,217.8,25,145,'64 cm')+
      radiusMark(225,66,54,227,43,'r = 20 cm')+
      heightMark(300,66,228,291,164,'60 cm')+
      (stage<2?radiusMark(160,309,37.8,258,309,'r = 14 cm'):radiusMark(225,cy,-37.8,130,110,'球 r = 14 cm'));
  }
  if(key==='2020:12'){
    if(stage===2)return radiusMark(160,147,76/3,236,130,'r₁ 未知')+
      radiusMark(160,206,152/3,251,233,'r₂ 未知')+heightMark(105,147,206,75,180,'h 未知');
    const gap=stage===1?24:0;
    return radiusMark(160,235+gap,76,255,282,'r = 15 cm')+
      (stage===0?heightMark(47,58,235,43,156,'36 cm'):
        [[34,93],[117,176],[200,259]].map(([a,b])=>heightMark(273,a,b,288,(a+b)/2+5,'h')).join(''));
  }
  if(key==='2023:14'||key==='2025:14'){
    const r=key==='2023:14'?14:24;
    if(stage===2)return key==='2023:14'?
      radiusMark(86,153,52,86,225,'r 未知')+radiusMark(234,153,52,234,225,'r 未知'):
      line(151,238,237,205)+dimensionLabel(236,243,'邊長未知');
    if(stage===0)return radiusMark(160,235,76,255,263,`r = ${r} cm`)+
      heightMark(58,45,235,48,148,key==='2025:14'?'45 cm':'h 未知')+
      (key==='2023:14'?dimensionLabel(160,23,'曲面 700π cm²'):'');
    return radiusMark(160,247,76,255,276,`r = ${r} cm`)+
      (key==='2025:14'?heightMark(272,129,247,276,193,'30 cm'):dimensionLabel(160,23,'Y 曲面 = 15 × X 曲面'));
  }
  if(key==='2024:13'){
    if(stage===0)return heightMark(49,38,222,43,136,'24 cm');
    if(stage===1)return heightMark(43,22.7,146.9,43,115,'18 cm');
    return heightMark(54,126.32,222,45,185,'3 cm');
  }
  if(key==='2021:14')return radiusMark(57,119,24,57,96,'r')+
    radiusMark(151,215,24,151,195,'r')+radiusMark(254,215,48,254,195,'2r');
  if(key==='2022:13'){
    if(stage===0)return radiusMark(85,142,42,85,215,'r 未知')+radiusMark(229,142,63,229,215,'r = 9 cm');
    return radiusMark(83,180,36,83,208,'r = 6 cm')+radiusMark(231,180,65,231,208,'r = 12 cm')+
      heightMark(34,120,180,29,157,'10 cm')+heightMark(307,38,180,286,97,'h 未知');
  }
  if(key==='2026:13')return radiusMark(160,72,48,257,76,'r = 10 cm')+
    radiusMark(62,208.2,16,62,253,'r₁')+radiusMark(157,193.8,24,157,253,'r₂')+
    radiusMark(259,165,40,259,253,'r₃')+dimensionLabel(157,297,'高 9 cm (b)');
  if(key==='2023:8')return dimensionLabel(160,26,'(b) 長度單位：cm')+
    dimensionLabel(115,49,'10')+dimensionLabel(190,240,'15')+
    line(160,95,193,91,'qs-leader')+dimensionLabel(203,95,'7')+
    dimensionLabel(243,160,'AB = 20');
  if(key==='2026:8')return dimensionLabel(160,16,'長度單位：cm')+
    dimensionLabel(187,214,'8')+dimensionLabel(235,283,'6')+
    line(117,105,91,118,'qs-leader')+dimensionLabel(68,131,'10 (b)');
  return '';
}
function manyCylinders(stage,prefix){
  if(stage===0)return cylinder(85,70,37,125,prefix)+cylinder(235,70,37,125,prefix)+
    radiusMark(85,70,37,85,38,'半徑 R')+radiusMark(235,70,37,235,38,'半徑 R')+
    label(160,250,'原來有 2 個完全相同的大圓柱')+dimensionLabel(160,286,'每個大圓柱的高：未知');
  if(stage===1)return Array.from({length:27},(_,i)=>cylinder(32+(i%9)*32,48+Math.floor(i/9)*62,10,29,prefix)).join('')+
    label(160,25,'27 個小圓柱，每排 9 個')+
    dimensionLabel(160,257,'每個：半徑 r，高 10 cm')+label(160,298,'兩個大圓柱一起熔化，再分成 27 個');
  return cylinder(87,73,40,105,prefix)+cylinder(235,108,40/3,70,prefix)+
    radiusMark(87,73,40,87,43,'半徑 R')+radiusMark(235,108,40/3,235,78,'半徑 r')+
    heightMark(28,73,178,29,133,'高未知')+heightMark(278,108,178,278,150,'10 cm')+
    label(87,222,'取 1 個大的')+label(235,222,'取 1 個小的')+
    dimensionLabel(160,262,'底面積：大 = 9 × 小')+label(160,304,'比較尺寸，不是只有這兩件重鑄');
}
export function milkSceneValues(stage){
  if(!Number.isInteger(stage)||stage<0||stage>2)throw new RangeError('Milk scene must be 0, 1 or 2');
  const depth=stage===0?12:16;
  // Derive the cone's proportions from the added volume; do not invent a radius.
  const radiusPerDepth=Math.sqrt(3*444/(16**3-12**3));
  return {depth,radius:depth*radiusPerDepth,radiusPerDepth};
}
function milkContainer(stage,prefix){
  const {depth,radius,radiusPerDepth}=milkSceneValues(stage),tip=248,top=68,scale=9;
  const fullR=(tip-top)*radiusPerDepth,surface=tip-depth*scale,r=radius*scale;
  const side=`<path d="M${160-fullR} ${top} L160 ${tip} L${160+fullR} ${top}" class="qs-glass"/>`;
  return `<g data-object="inverted-cone">${side}
    <g data-object="milk" data-depth="${depth}"><path d="M${160-r} ${surface} L160 ${tip} L${160+r} ${surface} Z" fill="url(#${prefix}-milk)" class="qs-outline"/>${ellipse(160,surface,r,r*.15,'qs-milk-top')}</g>
    ${stage===2?`<path data-object="wetted-wall" d="M${160-r} ${surface} L160 ${tip} L${160+r} ${surface}" class="qs-wetted-wall"/>`:''}
    ${side}${ellipse(160,top,fullR,fullR*.15,'qs-rim')}</g>`+
    heightMark(285,surface,tip,288,188,`${depth} cm`)+
    label(160,27,stage===0?'原來的牛奶':'加入 444π cm³ 牛奶之後')+
    (stage===2?label(160,296,'金色標出被牛奶浸濕的側壁'):label(160,296,'牛奶深度從底部尖端向上量'))+
    dimensionLabel(160,342,'容器口半徑及總高：題目沒有給');
}
function prismToPyramids(stage,prefix){
  if(stage===0)return `<g data-object="triangular-prism">
    ${polygon('107,100 202,45 260,170 165,225','qs-side')}
    ${polygon('65,225 160,170 260,170 165,225','qs-face')}
    ${polygon('65,225 165,225 107,100','qs-warm-face')}
    ${line(160,170,202,45,'qs-hidden')}${line(160,170,65,225,'qs-hidden')}</g>`+
    line(107,100,202,45)+line(170,65,219,73,'qs-leader')+dimensionLabel(248,78,'20 cm')+
    dimensionLabel(111,200,'84 cm²')+label(160,277,'金色三角形是底面')+
    label(160,310,'原物件是三角柱，不是三角錐');
  if(stage===1)return `<g transform="translate(-3 110) scale(.48)">${pyramidPiece(0,1,0)}</g>
    <g transform="translate(101 45) scale(.72)">${pyramidPiece(0,1,0)}</g>`+
    label(76,261,'小角錐')+label(218,261,'大角錐')+
    heightMark(23,128.24,216.56,30,182,'高未知')+heightMark(295,72.36,204.84,275,134,'12 cm (b)')+
    dimensionLabel(160,301,'兩個底面都是正方形')+label(160,333,'一件三角柱 → 兩個相似角錐');
  return `<g data-object="square-base">${polygon('48,118 108,118 108,178 48,178','qs-warm-face')}</g>
    <g data-object="square-base">${polygon('178,103 268,103 268,193 178,193','qs-face')}</g>`+
    label(78,227,'小底面')+label(223,227,'大底面')+dimensionLabel(160,274,'底面積比 4：9')+
    label(160,311,'從正上方看兩個正方形底面');
}
function relatedBalls(stage,prefix){
  const spheres=ball(80,145,34,prefix)+ball(225,145,68,prefix);
  if(stage===0)return spheres+radiusMark(80,145,34,80,97,'r 未知')+
    radiusMark(225,145,68,225,234,'R 未知')+label(80,266,'小球')+label(225,266,'大球')+
    dimensionLabel(160,28,'兩球總體積 = 324π cm³')+label(160,315,'實際半徑仍要計算');
  return spheres+line(46,145,114,145)+line(225,145,293,145)+
    dimensionLabel(80,215,'小球直徑')+dimensionLabel(225,243,'大球半徑')+
    label(160,28,'比較這兩條棕色線')+label(160,303,'小球整條直徑 = 大球一條半徑')+
    dimensionLabel(160,341,'不是「兩球的直徑相等」');
}
function paintedCans(stage,prefix){
  if(stage===0)return cylinder(160,72,52,125,prefix)+
    line(208,125,247,119,'qs-leader')+dimensionLabel(240,103,'外面髹漆')+
    dimensionLabel(160,249,'(a) 表面面積 13 m²')+
    label(160,297,'罐形未指定；以圓柱罐作示意');
  return cylinder(79,120,26,62.5,prefix)+cylinder(231,57.5,52,125,prefix)+
    label(79,223,'原來的罐')+label(231,223,'較大的罐')+
    dimensionLabel(79,254,'表面 13 m²')+dimensionLabel(231,254,'表面積未知')+
    dimensionLabel(160,301,'大罐體積 = 8 × 原罐體積')+
    label(160,343,'兩罐相似；不要把表面積也當成 8 倍');
}
export function sectorSceneValues(){
  const radius=12,areaCoefficient=30;
  return {radius,areaCoefficient,angle:2*areaCoefficient*Math.PI/radius**2};
}
function sectorScene(stage){
  const {angle}=sectorSceneValues(),cx=100,cy=210,r=150;
  const bx=cx+r*Math.cos(angle),by=cy-r*Math.sin(angle);
  const outline=`M${cx} ${cy} L${cx+r} ${cy} A${r} ${r} 0 0 0 ${bx} ${by} Z`;
  return `<g data-object="sector"><path d="${outline}" class="qs-sector-fill"/>
    ${stage===1?`<path data-object="sector-arc" d="M${cx+r} ${cy} A${r} ${r} 0 0 0 ${bx} ${by}" class="qs-sector-arc"/>${line(cx,cy,cx+r,cy)}${line(cx,cy,bx,by)}`:''}
    <path d="M130 210 A30 30 0 0 0 ${cx+30*Math.cos(angle)} ${cy-30*Math.sin(angle)}" class="qs-angle"/></g>`+
    label(84,230,'O')+label(269,217,'A')+label(bx,by-17,'B')+
    dimensionLabel(120,196,'θ')+dimensionLabel(174,237,'12 cm')+
    line(118,143,86,128,'qs-leader')+dimensionLabel(62,121,'12 cm')+
    (stage===0?dimensionLabel(184,165,'30π cm²'):
      line(220,118,248,100,'qs-leader')+dimensionLabel(246,87,'弧長未知'))+
    label(160,284,stage===0?'陰影是扇形面積；θ 是未知的角':'藍色弧線 + 兩條棕色半徑')+
    dimensionLabel(160,332,stage===0?'半徑 12 cm；面積 30π cm²':'周界不是只有弧長');
}
export function interceptSceneValues(){
  const a=(-9-0)/(8**2-4**2),b=-a*4**2;
  return {a,b,value:x=>a*x*x+b};
}
function interceptScene(stage){
  const {value}=interceptSceneValues(),px=x=>120+18*x,py=y=>140-18*y;
  const points=Array.from({length:133},(_,i)=>{const x=-5+i*.1;return [px(x),py(value(x))];});
  const curve=points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(3)} ${y.toFixed(3)}`).join(' ');
  const dot=(x,y)=>`<circle cx="${px(x)}" cy="${py(y)}" r="3.5" class="qs-plot-point"/>`;
  return `<g data-object="coordinate-plot">
    ${stage===1?polygon(`${px(-4)},140 ${px(4)},140 120,${py(value(0))}`,'qs-triangle-fill'):''}
    ${line(24,140,292,140,'qs-axis')}${line(120,50,120,322,'qs-axis')}
    <path d="${curve}" class="qs-curve"/>${dot(4,0)}${dot(8,-9)}
    ${stage===1?dot(-4,0)+dot(0,value(0)):''}</g>`+
    label(303,146,'x')+label(120,37,'y')+dimensionLabel(109,158,'O')+
    dimensionLabel(226,123,'(4, 0)')+dimensionLabel(245,331,'(8, −9)')+
    (stage===1?label(48,165,'U')+label(190,165,'V')+label(142,74,'W'):'')+
    label(160,374,stage===0?'曲線通過題目給出的兩個點':'連起 U、V、W：這就是 △UVW')+
    dimensionLabel(160,419,'不標未知截距，先自己計算');
}
export const questionSceneLessons={
  '2012:11':{title:'髹漆看表面，不是看罐內容量',labels:['看要髹漆的罐','比較兩個相似罐'],height:385,
    source:{year:'2012',page:8,hasOriginalDiagram:false},
    facts:['C 是表面面積 A m² 的罐的髹漆成本；成本包含固定部分及隨面積正變的部分。','已知 A = 2 時 C = 62；A = 6 時 C = 74。','(a) 罐的表面面積 13 m²；(b) 另一相似罐的體積是它的 8 倍。'],
    captions:['題目沒有指定罐的形狀，這裏以圓柱罐示意，不額外假設半徑或高度。油漆覆蓋的是外表面，13 m² 不是容量。','大小罐保持同一形狀，所有方向一起放大。題目給「體積 8 倍」，不是「面積 8 倍」，也不是「髹漆成本 8 倍」；成本還包含固定部分。'],
    draw:paintedCans},
  '2015:9':{kind:'plane',title:'一塊扇形：面積與外圈是兩回事',labels:['看扇形和未知角','沿外圈看周界'],height:375,
    source:{year:'2015',page:7,hasOriginalDiagram:false},
    facts:['扇形半徑 12 cm，面積 30π cm²。','(a) 求扇形的角；(b) 以 π 表示周界。','O、A、B 和 θ 是圖解輔助標記，不是原題額外條件。'],
    captions:['兩條直邊都是半徑，所以各長 12 cm。陰影代表面積，θ 代表要找的圓心角；圖中不填角度答案。','沿外圈走一圈，要走一條圓弧及兩條半徑。圖用不同顏色分開三段，避免只計弧長就當成周界。'],
    draw:sectorScene},
  '2026:11':{kind:'coordinate',title:'曲線在哪裏碰到坐標軸？',labels:['看題目給出的兩個點','連起 U、V、W'],height:455,
    source:{year:'2026',page:9,hasOriginalDiagram:false},
    facts:['f(x) 一部分隨 x² 正變，另一部分是常數。','已知 f(4) = 0、f(8) = −9。','(a) 求 y 截距；(b) U、V 是 x 軸交點，W 是 y 軸交點，求 △UVW 周界。'],
    captions:['曲線按題目條件繪製。f(4) = 0 表示 (4, 0) 在 x 軸上；(8, −9) 在 x 軸下方。沒有顯示未求出的截距數值，也不要從圖上量答案。','U、V 都在 x 軸上，W 在 y 軸上。陰影只用來找出 △UVW；題目問周界，要計三條邊的長度，不是陰影面積。此圖把左交點稱為 U、右交點稱為 V。'],
    draw:interceptScene},
  '2013:13':{title:'2 個大圓柱，變成 27 個小圓柱',labels:['原來 2 個大圓柱','重鑄成 27 個','比較一大一小'],height:355,
    source:{year:'2013',page:11,hasOriginalDiagram:false},
    facts:['原來：2 個完全相同的實心金屬圓柱，半徑都是 R cm。','重鑄後：27 個完全相同的小圓柱，每個半徑 r cm、高 10 cm。','大圓柱底面積是小圓柱的 9 倍。'],
    captions:['先數清楚是兩件，不是一件；R 是大圓柱的半徑，不是直徑。','圖中確實有 27 個，每排 9 個、共 3 排。每一個的高都是 10 cm，不是 27 個加起來高 10 cm。','拿出各一件只是方便比較。題目給的是底面積 9 倍；不能直接把半徑或高度也當成 9 倍，更不能先假設相似。'],
    draw:manyCylinders},
  '2016:11':{title:'同一個倒置圓錐，加奶前與加奶後',labels:['原來深 12 cm','加入牛奶後深 16 cm','看看浸濕的側壁'],height:380,
    source:{year:'2016',page:9,hasOriginalDiagram:false},
    facts:['容器是尖端向下的直立圓錐；原來牛奶深 12 cm。','加入 444π cm³ 牛奶後，深度變為 16 cm，沒有溢出。','(b) 要判斷被浸濕的曲面面積是否至少 800 cm²。'],
    captions:['容器壁透明化，讓你直接看到牛奶。12 cm 由最低的尖端量到奶面，不是由容器口往下量。','容器沒有變，牛奶更多，奶面也變闊。444π cm³ 是後來加入的量，不是最終總量。容器口大小及總高僅作示意。','金色邊界指出圓錐側壁被浸濕的範圍。奶面本身是液體表面，不是容器的側壁，不能把奶面面積加進去。'],
    draw:milkContainer},
  '2017:12':{title:'三角柱重鑄成兩個正方形底角錐',labels:['看原來三角柱','重鑄成兩個角錐','看兩個正方形底面'],height:380,
    source:{year:'2017',page:10,hasOriginalDiagram:false},
    facts:['原三角柱：底面積 84 cm²，高 20 cm。','重鑄成兩個相似的實心直立角錐；底面都是正方形。','小角錐與大角錐的底面積比是 4：9；(b) 給大角錐高 12 cm。'],
    captions:['84 cm² 指金色三角形底面的面積，不是一條邊長。20 cm 是柱體兩個平行三角形底面之間的垂直距離；圖中連接對應頂點的柱邊表示這個方向。','原來的金屬一起熔化，再分成兩個角錐。原物件是三角形底，新物件是正方形底，不能當作同一種立體直接比較。','這是底面的俯視圖，不是角錐的側面。4：9 說的是面積，並不表示正方形邊長比也是 4：9。'],
    draw:prismToPyramids},
  '2019:9':{title:'小球的直徑，等於大球的半徑',labels:['看兩個球','對照直徑與半徑'],height:375,
    source:{year:'2019',page:7,hasOriginalDiagram:false},
    facts:['兩個球的體積之和是 324π cm³。','大球的半徑等於小球的直徑。','(a) 求大球體積；(b) 求兩球表面面積之和。'],
    captions:['先看清楚兩個球的大小關係。r、R 只代表未求出的半徑，不預先填入答案。','小球的棕色線由一邊穿過中心到另一邊，是直徑；大球的線只由中心到球面，是半徑。兩條線畫成同樣長，直接呈現題目的條件。'],
    draw:relatedBalls},
  '2018:14':{title:'把水倒進圓錐，再放入球',labels:['看原來三件物件','把水倒入圓錐','放入球體（看結果）'],height:390,
    facts:['圓柱：半徑 8 cm，高 64 cm，原本裝滿水。','倒置圓錐：半徑 20 cm，高 60 cm。','金屬球：半徑 14 cm，題設為完全浸入水中。'],
    captions:['先看看題目中的三件物件。圓錐尖端向下，容器壁畫成透明，方便看水。','同一筒水已倒進圓錐；水的形狀變了，水量不變。先不顯示水深答案。','球把水面推高了，但水仍未溢出。這一步會顯示 (c) 的判斷；計算理由在下面的提示。'],
    draw:(s,p)=>pourScene(s,p)},
  '2020:12':{title:'圓錐切成三件',labels:['看完整圓錐','分開三部分','只看中間'],height:360,
    facts:['原圓錐：高 36 cm，底半徑 15 cm。','兩個切面都平行於底面，三件的高度相等。'],
    captions:['綠色上段、金色中段、藍色下段合起來是完整圓錐。兩條粗橢圓線表示平行底面的圓形切面；三段高度相等，不是體積相等。','移開上面和下面，便能看清中間那件。分開的空隙不屬於物件高度；三個 h 代表相同的高度。','題目要找的是這個圓台的體積及曲面面積。'],
    draw:(s,p)=>cutScene('2020:12',s,p)},
  '2021:14':{title:'圓柱 X，以及圓錐 Y、Z',labels:['看三個立體','標出半徑關係'],height:315,
    facts:['X、Y 的底半徑相同；高分別為 20 cm、24 cm。','Z 的體積 = X 和 Y 的體積之和。','Z 的底半徑 = X 的底直徑。Y 體積 800π cm³ 是題目中的宣稱。'],
    captions:['三件物件分開看，別把圓柱和圓錐當作同一種立體。','線段表示半徑；X 的直徑是半徑的兩倍，所以 Z 的半徑是 2r。不可單靠畫出的外形判斷相似。'],
    draw:compareSolids},
  '2022:13':{title:'兩個球重鑄成兩個圓錐',labels:['看原來兩個球','重鑄成 A、B'],height:315,
    facts:['兩球表面面積比 4：9；大球半徑 9 cm。','重鑄後：A 高 10 cm、底半徑 6 cm；B 底半徑 12 cm。'],
    captions:['先看兩個球。題目給的是表面面積比，不是半徑比。','A、B 都由原來兩個球的金屬重鑄；不是一個球各自變成一個圓錐。B 的高仍要計算。'],
    draw:spheresToCones},
  '2023:14':{title:'圓錐切開，再把 Y 變成球',labels:['看原來圓錐','切開看 X、Y','把 Y 重鑄成球'],height:330,
    facts:['原圓錐：底半徑 14 cm，曲面面積 700π cm²。','小圓錐 X；下方圓台 Y。Y 曲面面積是 X 的 15 倍。'],
    captions:['這是題目中的實心金屬圓錐，高和斜高還沒有標成答案。','只切開，不是挖空。X 是完整小圓錐；Y 有上下兩個圓面。','只有 Y 熔化，變成兩個完全相同的實心球；X 不參與重鑄。球的直徑仍未知。'],
    draw:(s,p)=>cutScene('2023:14',s,p)},
  '2024:13':{title:'正方形底角錐，不是圓錐',labels:['看原來角錐','切開看 X、Y','看另一件 Z'],height:350,
    facts:['原角錐：高 24 cm；正方形底面的周界 64 cm。','上方角錐 Y 高 18 cm；下方是平截頭體 X。'],
    captions:['底面有四條直邊，四個側面是三角形。虛線表示藏在後面的邊。','切開後仍能看到正方形切面。X 是下面留下的部分，不是上面的尖頂。','Z 來自另一個正方形底角錐；與 X 分開繪製，沒有按相同比例縮放，不能看圖判斷相似。'],
    draw:s=>squareScene(s)},
  '2025:14':{title:'圓錐留下圓台，再變成正方體',labels:['看原來圓錐','切開看 X','把 X 重鑄成正方體'],height:330,
    facts:['原圓錐：高 45 cm，底半徑 24 cm。','下方留下的圓台 X 高 30 cm。'],
    captions:['先看完整的金屬圓錐。題目不是給一個三角形。','切走尖頂，留下 X。上、下圓面也是 X 表面的一部分。','只有 X 熔化，變成實心正方體；保留的是金屬體積，不是表面面積。正方體邊長仍未知。'],
    draw:(s,p)=>cutScene('2025:14',s,p)},
  '2026:13':{title:'一個金屬球變成三個圓柱',labels:['看題目物件','標出相似尺寸'],height:375,
    facts:['原金屬球：半徑 10 cm。','重鑄為三個相似圓柱 X、Y、Z；半徑比 2：3：5。','(b) 題設 Y 高 9 cm。'],
    captions:['上面是原來的球；下面是重鑄後的三個圓柱。圓柱有圓形頂面、底面和彎曲的側面。','三個圓柱相似，高也跟半徑一起按比例改變。這裏用原題比例；下面另有可調比例的實驗。'],
    draw:sphereToCylinders},
  '2023:8':{kind:'plane',title:'保留題目完整的蝴蝶形圖',labels:['看完整圖形','突出兩個三角形'],height:310,
    facts:['AC ∥ DB，AB 與 CD 相交於 E。','(b) AB = 20 cm、AC = 10 cm、BD = 15 cm、CE = 7 cm。'],
    captions:['完整保留 A、B、C、D、E 和原題的交叉關係。','兩個三角形仍留在原位，方便看出共同交點與平行邊。對應邊的解釋收在下面。'],
    draw:s=>triangles('2023:8',s)},
  '2026:8':{kind:'plane',title:'把 A、B、C、D、E、F 全部保留',labels:['看完整圖形','突出要比較的三角形'],height:345,
    facts:['D 在 AB 上；E 在 CB 的延線；F 在 CD 的延線。','BD ∥ EF；BC = EF；BD = 8 cm，BE = 6 cm。','(b) 另給 AD = 10 cm。'],
    captions:['不再一開始就刪去 A，學生可以直接把圖與題目對照。','突出 △CBD 和 △CEF，但完整圖形仍然保留，不會失去它們在原題中的位置。'],
    draw:s=>triangles('2026:8',s)}
};
export function questionSceneKey(q){
  const match=String(q.q).match(/^(\d+)(?:$|\()/);
  const key=match?`${q.year}:${match[1]}`:'';
  const lesson=Object.hasOwn(questionSceneLessons,key)?questionSceneLessons[key]:null;
  return lesson?key:null;
}
function picture(key,stage){
  const lesson=questionSceneLessons[key],prefix=`qs-${key.replace(':','-')}`;
  return `<svg class="qs-picture" viewBox="0 0 320 ${lesson.height}" role="img" aria-label="${esc(lesson.title+'：'+lesson.labels[stage])}">
    <title>${esc(lesson.title+'：'+lesson.labels[stage])}</title><desc>${esc(lesson.captions[stage])}</desc>
    <defs>
    <linearGradient id="${prefix}-metal"><stop stop-color="#a8cfc1"/><stop offset=".45" stop-color="#e5f3ea"/><stop offset="1" stop-color="#6d9f90"/></linearGradient>
    <linearGradient id="${prefix}-warm"><stop stop-color="#ddb06d"/><stop offset=".45" stop-color="#ffdfad"/><stop offset="1" stop-color="#b78140"/></linearGradient>
    <linearGradient id="${prefix}-blue"><stop stop-color="#779fcb"/><stop offset=".45" stop-color="#cbdff2"/><stop offset="1" stop-color="#507da7"/></linearGradient>
    <linearGradient id="${prefix}-water"><stop stop-color="#389acb"/><stop offset=".5" stop-color="#9bdaed"/><stop offset="1" stop-color="#338ab7"/></linearGradient>
    <linearGradient id="${prefix}-milk"><stop stop-color="#e5d7ad"/><stop offset=".5" stop-color="#fffaf0"/><stop offset="1" stop-color="#d3c28e"/></linearGradient>
    <radialGradient id="${prefix}-ball" cx=".32" cy=".26" r=".78"><stop stop-color="#f2f4f1"/><stop offset=".35" stop-color="#c4d3cf"/><stop offset="1" stop-color="#5a7671"/></radialGradient>
    </defs>${lesson.draw(stage,prefix)}${dimensions(key,stage)}</svg>`;
}
export function questionScene(q,state={}){
  const key=questionSceneKey(q);
  if(!key)return '';
  const lesson=questionSceneLessons[key];
  const stage=Number.isInteger(state.sceneStage)&&state.sceneStage>=0&&state.sceneStage<lesson.labels.length?state.sceneStage:0;
  return `<section class="question-scene" aria-label="題目場景"><div class="qs-heading"><span>先看懂題目</span><h4>${esc(lesson.title)}</h4></div>
    <p class="qs-note">示意圖不一定按比例繪製，不可用尺量答案。圖中若有 r、h，分別代表半徑、垂直高度；「(b)」表示該數據在 (b) 才提供。未知尺寸不預先填答案。</p>
    <div class="qs-controls" role="group" aria-label="切換題目場景">${lesson.labels.map((s,i)=>`<button type="button" data-qs-stage="${i}" aria-pressed="${stage===i}">${esc(s)}</button>`).join('')}</div>
    <div class="qs-drawing">${picture(key,stage)}</div><p class="qs-caption">${esc(lesson.captions[stage])}</p>
    <ul class="qs-facts">${lesson.facts.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
    <p class="qs-note">想知道怎樣計算？再展開下面的提示或圖解。</p>
    <span class="qs-status" role="status" aria-live="polite"></span></section>`;
}
export function bindQuestionScene(container,q,state){
  const root=container.querySelector('.question-scene'),key=questionSceneKey(q);
  if(!root||!key)return;
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-qs-stage]');
    if(!button)return;
    const stage=Number(button.dataset.qsStage),lesson=questionSceneLessons[key];
    if(!Number.isInteger(stage)||stage<0||stage>=lesson.labels.length)return;
    state.sceneStage=stage;
    root.querySelectorAll('[data-qs-stage]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.qsStage)===stage)));
    root.querySelector('.qs-drawing').innerHTML=picture(key,stage);
    root.querySelector('.qs-caption').textContent=lesson.captions[stage];
    root.querySelector('.qs-status').textContent=lesson.captions[stage];
  });
}
