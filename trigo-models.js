const rad=a=>a*Math.PI/180;
const sin=a=>Math.sin(rad(a)),cos=a=>Math.cos(rad(a)),tan=a=>Math.tan(rad(a));
const acos=x=>Math.acos(Math.max(-1,Math.min(1,x)))*180/Math.PI;
const asin=x=>Math.asin(x)*180/Math.PI;
const sq=x=>x*x;
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const mul=(a,k)=>a.map(v=>v*k);
export const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
export const length=a=>Math.hypot(...a);
export const distance=(a,b)=>length(sub(a,b));
export const midpoint=(a,b)=>mul(add(a,b),.5);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const unit=a=>mul(a,1/length(a));
export const foot=(p,a,b)=>add(a,mul(sub(b,a),dot(sub(p,a),sub(b,a))/sq(distance(a,b))));
export const angle=(a,b,c)=>acos(dot(sub(a,b),sub(c,b))/(distance(a,b)*distance(c,b)));
const side=(a,b,C)=>Math.sqrt(sq(a)+sq(b)-2*a*b*cos(C));
function root(x){
  if(x < -1e-7)throw new Error(`Impossible 3D constraint: ${x}`);
  return Math.sqrt(Math.max(0,x));
}
// Trilateration: construct a tetrahedron from its six edge lengths.
export function tetra(names,ab,ac,bc,ad,bd,cd){
  const x=(sq(ab)+sq(ac)-sq(bc))/(2*ab),y=root(sq(ac)-sq(x));
  const dx=(sq(ad)+sq(ab)-sq(bd))/(2*ab);
  const dy=(sq(ad)+sq(ac)-sq(cd)-2*x*dx)/(2*y);
  return Object.fromEntries(names.map((n,i)=>[n,[[0,0,0],[ab,0,0],[x,y,0],[dx,dy,root(sq(ad)-sq(dx)-sq(dy))]][i]]));
}
const faces4=([a,b,c,d])=>[[a,b,c],[a,b,d],[b,c,d],[c,a,d]];
const pyramid=()=>[['A','B','C','D'],['V','A','B'],['V','B','C'],['V','C','D'],['V','D','A']];
const groundFoot=(v,n,h)=>{v[h]=[v[n][0],v[n][1],0];};
function lesson(title,points,faces,facts,focus,help,extra={}){
  return {title,points,faces,facts,focus,help,aux:[],auxAngles:[],measures:[],angles:[],...extra};
}

export const trigoModels={
  '2012:18':()=>{
    const h=root(sq(10*tan(72))-100),V=[10,10,h],t=(20*sin(60)/sin(48))/length(V);
    const p={A:[0,0,0],B:[20,0,0],C:[20,20,0],D:[0,20,0],V};
    p.P=mul(V,t);p.Q=add(p.D,mul(sub(V,p.D),t));groundFoot(p,'P','H');
    p.K=[20,p.P[1],0];
    return lesson('切開角錐：分清楚線與面的傾斜',p,pyramid(),
      ['正方形底邊 20 cm；直立角錐。','∠VAB = 72°；∠PBA = 60°；PQ ∥ BC。'],
      [['P','B','C','Q'],['A','B','C','D']],
      ['金色是切面 PBCQ，綠色是底面 ABCD；兩面沿 BC 相遇。','H 是 P 正下方的點。PH 是高度；PK 與 HK 都垂直 BC，所以 ∠PKH 才是兩面的交角。∠PBH 則是 PB 與底面的交角。'],
      {cutFaces:[['A','B','C','D'],['A','B','P'],['P','B','C','Q'],['C','D','Q'],['D','A','P','Q']],cutHidden:['V'],aux:[['P','H'],['P','K'],['H','K'],['B','H']],extraPoints:['H','K'],measures:[['A','B','20 cm']],angles:[['V','A','B','72°'],['P','B','A','60°']],note:'「看整個模型」保留原角錐；「看關鍵平面」及「加上輔助線」顯示切走 VPBCQ 後留下的部分。'});
  },
  '2013:18':()=>{
    const C=acos(21/35),cm=21*sin(105-C)/sin(75),bm=21*sin(C)/sin(75),am=35-cm;
    const ac=side(am,cm,107),p=tetra(['B','C','A','M'],21,28,ac,bm,cm,am);
    p.N=foot(p.M,p.B,p.C);groundFoot(p,'M','H');
    return lesson('沿 BM 摺起的三角形紙卡',p,[['A','B','M'],['B','C','M']],
      ['AB = 28 cm；BC = 21 cm；摺前 AC = 35 cm。','摺前 ∠BMC = 75°；摺後 ∠AMC = 107°；AB、BC 在地面。'],
      [['B','C','M'],['A','B','C']],
      ['金色是面 BCM；綠色三角形 ABC 只是地面參考，不是多出來的紙卡。','N 在 BC 上，MN ⟂ BC；H 是 M 的地面投影。看 MN 的地面影子 NH，不要直接把 NA 當成影子。'],
      {ground:true,extraPoints:['H'],aux:[['M','N'],['M','H'],['N','H'],['N','A']],measures:[['A','B','28 cm'],['B','C','21 cm']],angles:[['A','M','C','107°']],note:'摺後 A、M、C 不再共線；35 cm 是摺前整條 AC 的長度。'});
  },
  '2014:17':()=>{
    const va=18*cos(110)+root(900-sq(18*sin(110))),x=va*cos(110);
    const p={A:[0,0,0],B:[18,0,0],C:[18,10,0],D:[0,10,0],V:[x,5,root(sq(va)-sq(x)-25)]};
    for(const [n,a,b]of [['P','A','B'],['Q','C','D'],['M','V','B'],['N','V','C']])p[n]=midpoint(p[a],p[b]);
    p.H=foot(p.M,p.P,p.Q);
    return lesson('角錐切面：找出真正的梯形高度',p,pyramid(),
      ['長方形底面：AB = 18 cm，BC = 10 cm。','VB = VC = 30 cm；∠VAB = ∠VDC = 110°。','P、Q、M、N 分別是 AB、CD、VB、VC 的中點。'],
      [['P','Q','N','M']],
      ['金色是切面 PQNM。轉一轉，看看這個梯形在角錐裡的位置。','H 在直線 PQ 上，MH ⟂ PQ。求梯形面積要用 MH，不是直接用斜邊 MP；H 可以落在 PQ 的延長線上。'],
      {cutFaces:[['A','P','Q','D'],['V','A','P','M'],['P','Q','N','M'],['V','N','Q','D'],['V','D','A'],['V','M','N']],cutHidden:['B','C'],extraPoints:['H'],aux:[['M','H'],['P','H']],measures:[['A','B','18 cm'],['B','C','10 cm'],['V','B','30 cm']],angles:[['V','A','B','110°']],note:'「看整個模型」保留原角錐；其餘兩步顯示切走 PBCQNM 後留下的部分，金色是露出的切面。'});
  },
  '2015:19':()=>{
    const ac=side(40,24,80),acb=acos((sq(ac)+576-1600)/(2*ac*24));
    const cd=2*ac*cos(132-acb),p=tetra(['C','D','A','B'],cd,ac,ac,24,24,40);
    groundFoot(p,'B','H');
    return lesson('五邊形紙卡摺成角錐',p,faces4(['A','C','D','B']),
      ['摺好後 AB = 40 cm；BC = BD = 24 cm。','原紙卡 ∠ABC = ∠AB′D = 80°；(b) 摺前 ∠BCD = 132°。','摺起後，原來的 B′ 與 B 合在同一點。'],
      [['A','C','D']],
      ['先把 ACD 當作角錐的底面，B 是離開底面的頂點。','H 是 B 正下方落在面 ACD 的點。體積要用 BH 這條垂直高度，不是 AB、BC 或 BD。'],
      {extraPoints:['H'],aux:[['B','H'],['A','H'],['C','H']],measures:[['A','B','40 cm'],['B','C','24 cm'],['B','D','24 cm']],angles:[['A','B','C','80°']],note:'這是 (b) 摺好後的模型；132° 是摺前的角，不能標成摺後的 ∠BCD。'});
  },
  '2016:19':()=>{
    const ad=10*cos(86)+root(225-sq(10*sin(86))),cd=side(8,15,43);
    const p=tetra(['B','C','D','A'],8,15,cd,10,6,ad);groundFoot(p,'A','H');
    return lesson('四面體：斜線的影子在哪裡？',p,faces4(['B','C','D','A']),
      ['AB = 10 cm；AC = 6 cm；BC = 8 cm；BD = 15 cm。','∠BAD = 86°；∠CBD = 43°。'],
      [['B','C','D']],
      ['金色是面 BCD。AB 是要比較的斜線。','H 是 A 在面 BCD 上的垂足，BH 才是 AB 的影子。AC ⟂ BC 並不代表 AC ⟂ 整個面 BCD；留意 C 與 H 不是同一點。'],
      {extraPoints:['H'],aux:[['A','H'],['B','H']],measures:[['A','B','10 cm'],['A','C','6 cm'],['B','C','8 cm'],['B','D','15 cm']],angles:[['B','A','D','86°'],['C','B','D','43°']]});
  },
  '2017:19':()=>{
    const ac=24*sin(108)/sin(30),ab=24*sin(42)/sin(30),cx=root(sq(ac)-64);
    const bx=(sq(cx)-96+sq(ab)-576)/(2*cx);
    const p={A:[0,0,10],C:[cx,0,2],B:[bx,root(sq(ab)-100-sq(bx)),0],D:[0,0,0],E:[cx,0,0],F:[cx*1.25,0,0]};
    p.H=foot(p.A,p.B,p.F);
    return lesson('懸起的金屬片：把 AC 延長到地面',p,[['A','B','C']],
      ['BC = 24 cm；∠BAC = 30°；∠ACB = 42°。','只有 B 在地面；AD = 10 cm，CE = 2 cm；D、E 是垂足。','AC 延長至 F，F 在地面。'],
      [['A','B','F'],['B','D','F']],
      ['三角形 ABF 與金屬片在同一平面；BF 是這個平面與地面的交線。','把 FB 經 B 向外延長，才到垂足 H；AH ⟂ BF。D 是 A 的地面投影，所以 DH 也垂直 BF；比較兩個面要看 ∠AHD。'],
      {ground:true,extraPoints:['H'],aux:[['A','D'],['C','E'],['C','F'],['B','F'],['B','H'],['A','H'],['D','H']],measures:[['B','C','24 cm'],['A','D','10 cm'],['C','E','2 cm']],angles:[['B','A','C','30°'],['A','C','B','42°']]});
  },
  '2018:17':()=>{
    const bd=60*sin(120)/sin(40),x=60*cos(20),y=60*sin(20);
    const t=acos((1600-sq(2*x-bd))/(2*sq(y))-1);
    const p={B:[0,0,0],D:[bd,0,0],C:[bd-x,-y,0],A:[x,y*cos(t),y*sin(t)]};
    p.H=foot(p.A,p.B,p.D);p.K=foot(p.C,p.B,p.D);
    return lesson('沿 BD 摺起的平行四邊形',p,[['A','B','D'],['B','C','D']],
      ['AB = 60 cm；摺前 ∠ABD = 20°、∠BAD = 120°。','摺好後 A 與 C 的直線距離是 40 cm。'],
      [['A','B','D'],['B','C','D']],
      ['金色是面 ABD，綠色是面 BCD。BD 就像兩頁書中間的摺痕。','AH、CK 分別垂直摺痕 BD。它們的方向才能反映兩頁打開的角度；H、K 不一定是同一點。'],
      {extraPoints:['H','K'],aux:[['A','H'],['C','K'],['A','C']],measures:[['A','B','60 cm'],['A','C','40 cm']],angles:[['A','B','D','20°']],note:'圖中是摺好後的紙卡；轉動視角不會改變 AC = 40 cm。'});
  },
  '2019:18':()=>{
    const ab=12*cos(72)+root(169-sq(12*sin(72))),p=tetra(['A','D','C','B'],13,13,13,ab,12,8);
    p.P=foot(p.B,p.A,p.D);p.H=foot(p.C,p.A,p.D);
    p.K=add(p.P,sub(p.C,p.H));
    return lesson('面與面交角：兩條線都要垂直交線',p,faces4(['A','D','C','B']),
      ['AC = AD = CD = 13 cm；BC = 8 cm；BD = 12 cm。','P 在 AD 上，BP ⟂ AD；∠ABD = 72°。'],
      [['A','B','D'],['A','C','D']],
      ['兩個面沿 AD 相遇。BP 已經垂直 AD，但 CP 是否也垂直？','H 是 C 到 AD 的垂足，與 P 不同。PK 平行 CH，所以 PK ⟂ AD；要看兩面交角可用 ∠BPK，不能直接用 ∠BPC。K 是新增的輔助點。'],
      {extraPoints:['H','K'],aux:[['B','P'],['C','P'],['C','H'],['P','K']],measures:[['A','D','13 cm'],['B','C','8 cm'],['B','D','12 cm']],angles:[['A','B','D','72°']]});
  },
  '2020:19':()=>{
    const qr=60*sin(95)/sin(55),lift=([x,y])=>[x,y*cos(32),y*sin(32)];
    const P=[60*cos(30),30],S=[P[0]+40*cos(330),P[1]+40*sin(330)];
    const p={Q:[0,0,0],R:[qr,0,0],P:lift(P),S:lift(S)};groundFoot(p,'P','H');groundFoot(p,'S','K');
    return lesson('斜放的四邊形紙卡',p,[['P','Q','R','S']],
      ['PQ = 60 cm；PS = 40 cm。','∠PQR = 30°；∠PRQ = 55°；∠QPS = 120°。','(c) QR 在地面，紙卡與地面交角為 32°。'],
      [['P','Q','R','S']],
      ['紙卡沿 QR 離開地面。32° 是整個面與地面的角，不是每一條斜邊的角。','H、K 分別在 P、S 正下方。PH 是 P 到地面的最短距離；RS 與地面的角要看 ∠SRK。'],
      {ground:true,extraPoints:['H','K'],aux:[['P','H'],['S','K'],['R','K'],['P','R']],measures:[['P','Q','60 cm'],['P','S','40 cm']],angles:[['P','Q','R','30°'],['P','R','Q','55°']],note:'採用 (c) 的傾斜狀態；水平參考面不是紙卡的一部分。'});
  },
  '2021:18':()=>{
    const be=45*sin(50),ae=45*cos(50);
    const p={E:[0,0,0],B:[0,be,0],C:[40,be,0],D:[40+be/tan(70),0,0],A:[0,0,ae]};
    p.H=foot(p.E,p.C,p.D);
    return lesson('沿 BE 摺起：A 在 E 正上方',p,[['B','C','D','E'],['A','B','C'],['A','C','D'],['A','D','E'],['A','E','B']],
      ['AB = 45 cm；(b) BC = 40 cm；E 在 AD 上，BE ⟂ AD（摺前）。','摺前 AD ∥ BC，∠BAD = 50°，∠ADC = 70°。','摺後 AE 垂直水平面 BCDE。'],
      [['A','C','D'],['B','C','D','E']],
      ['金色是斜面 ACD，綠色是水平底面 BCDE。兩面沿 CD 相遇。','H 在直線 CD 上，EH ⟂ CD；AH 也垂直 CD。轉到側面，看直角三角形 AEH；∠AHE 是兩面交角。'],
      {ground:true,extraPoints:['H'],aux:[['E','H'],['A','H']],measures:[['A','B','45 cm'],['B','C','40 cm']],note:'50° 和 70° 是摺前的角，並非這個摺好後模型的同名角。'});
  },
  '2022:18':()=>{
    const x=25*cos(95),z=25*sin(70),p={P:[0,0,0],Q:[30,0,0],R:[x,root(625-sq(x)-sq(z)),z]};
    p.M=midpoint(p.Q,p.R);groundFoot(p,'R','H');groundFoot(p,'M','K');
    return lesson('同一張紙卡，不同斜線的角度',p,[['P','Q','R']],
      ['PQ = 30 cm；PR = 25 cm；∠QPR = 95°。','PQ 在地面；M 是 QR 中點。','(b) PR 與地面的交角為 70°。'],
      [['P','Q','R']],
      ['70° 是 PR 與地面的角，不是紙卡與地面的交角，也不是 PM 的角。','H、K 分別是 R、M 的地面投影。PR 的角看 ∠RPH；PM 的角看 ∠MPK。先找影子，再找角。'],
      {ground:true,extraPoints:['H','K'],aux:[['R','H'],['P','H'],['M','K'],['P','K'],['P','M']],measures:[['P','Q','30 cm'],['P','R','25 cm']],angles:[['Q','P','R','95°']],auxAngles:[['R','P','H','70°']]});
  },
  '2023:17':()=>{
    const wy=5*cos(70)+root(36-sq(5*sin(70))),W=[wy*cos(70),wy*sin(70),0];
    const O=[2.5,(sq(wy)-5*W[0])/(2*W[1]),0],h=length(O)*tan(30);
    const p={Y:[0,0,0],X:[5,0,0],W,Z:[O[0],O[1],h],O};
    p.H=foot(p.Z,p.X,p.Y);
    return lesson('三條斜邊一樣長的角錐',p,faces4(['W','X','Y','Z']),
      ['WX = 6 cm；XY = 5 cm；∠WYX = 70°。','WZ = XZ = YZ；WZ 與底面 WXY 的交角是 30°。'],
      [['X','Y','Z'],['W','X','Y']],
      ['O 是 Z 正下方的點。三條斜邊一樣長，所以 O 到 W、X、Y 的距離一樣；不應隨便放在三角形「看起來的中心」。','H 在 XY 上，ZH、OH 都垂直 XY。∠ZHO 是面 XYZ 與底面的交角；30° 則是 ∠ZWO。'],
      {extraPoints:['O','H'],aux:[['Z','O'],['W','O'],['Z','H'],['O','H']],measures:[['W','X','6 cm'],['X','Y','5 cm']],angles:[['W','Y','X','70°']],auxAngles:[['Z','W','O','30°']]});
  },
  '2024:18':()=>{
    const qs=side(12,10,82),pX=(144+sq(qs)-100)/(2*qs),pY=root(144-sq(pX));
    const R=180-65-asin(13*sin(65)/qs),ry=13*sin(R);
    const p={Q:[0,0,0],S:[qs,0,0],P:[pX,pY,0],R:[13*cos(R),-ry*cos(80),ry*sin(80)]};
    groundFoot(p,'R','H');p.K=foot(p.R,p.Q,p.S);
    return lesson('沿 QS 摺起的金屬片',p,[['P','Q','S'],['Q','R','S']],
      ['PQ = 12 cm；PS = 10 cm；QR = 13 cm。','∠QPS = 82°；∠QRS = 65°。','(b) 沿 QS 摺起，面 PQS 與面 QRS 的交角為 80°。'],
      [['Q','R','S'],['P','Q','S']],
      ['QS 是摺痕。兩個面的交角是 80°，不是直接取 ∠RQP。','H 是 R 在面 PQS 上的垂足，RH 是最短距離。K 在 QS 上，RK ⟂ QS；看三角形 RKH 可以把立體問題拆成平面問題。'],
      {extraPoints:['H','K'],aux:[['R','H'],['R','K'],['H','K']],measures:[['P','Q','12 cm'],['P','S','10 cm'],['Q','R','13 cm']],angles:[['Q','P','S','82°'],['Q','R','S','65°']],auxAngles:[['R','K','H','80°']]});
  },
  '2026:17':()=>{
    const a=[70,0,0],d=[0,0,0],c=[100*cos(55),100*sin(55),0],ac=distance(a,c),acd=angle(a,c,d);
    const cb=ac*cos(130-acd)+root(8100-sq(ac*sin(130-acd)));
    const theta=Math.atan2(a[1]-c[1],a[0]-c[0])+rad(130-acd);
    const b=add(c,[cb*Math.cos(theta),cb*Math.sin(theta),0]),u=unit(sub(b,a)),v=[-u[1],u[0],0];
    if(dot(sub(d,a),v)<0)for(let i=0;i<3;i++)v[i]*=-1;
    const lift=p=>{const w=sub(p,a),y=dot(w,v);return [dot(w,u),y*cos(65),y*sin(65)];};
    const p={A:lift(a),B:lift(b),C:lift(c),D:lift(d)};
    p.V=[p.D[0],p.D[1]+root(6400-sq(p.D[2])),0];groundFoot(p,'D','H');p.K=foot(p.D,p.A,p.B);
    return lesson('底面斜放的角錐：VAB 才在地面',p,pyramid(),
      ['AB = 90 cm；AD = 70 cm；CD = 100 cm。','∠ADC = 55°；∠BCD = 130°。','面 VAB 在地面；(b) VD = 80 cm，面 ABCD 與地面交角為 65°。'],
      [['A','B','C','D'],['V','A','B']],
      ['A 是 AB 與 AD 相接的點；V 則連接 A、B、C、D，不能把兩點交換。金色 ABCD 是斜放的底，綠色 VAB 才在地面。','H 是 D 正下方的點；要找 VD 與地面的角，看 ∠DVH。把 BA 經 A 向外延長，才到垂足 K；DK ⟂ AB，面與地面的 65° 可放在 ∠DKH。'],
      {ground:true,extraPoints:['H','K'],aux:[['D','H'],['V','H'],['D','K'],['A','K'],['H','K']],measures:[['A','B','90 cm'],['A','D','70 cm'],['C','D','100 cm'],['V','D','80 cm']],angles:[['A','D','C','55°']],auxAngles:[['D','K','H','65°']],note:'題設沒有唯一決定 V 在地面的位置；這裡選一個符合 VD = 80 cm、擺放方向接近原圖的位置示範，並非加入新的已知條件。'});
  },
  'PP:18':()=>{
    const ab=side(20,12,60),p=tetra(['A','B','C','D'],ab,20,12,20,12,14);
    p.H=foot(p.C,p.A,p.B);p.P=midpoint(p.A,p.B);
    return lesson('四面體：看兩個面的交線 AB',p,faces4(['A','B','C','D']),
      ['AC = AD = 20 cm；BC = BD = 12 cm；CD = 14 cm。','∠ACB = 60°；(c) P 可以沿 AB 移動。'],
      [['A','B','C'],['A','B','D']],
      ['兩個面沿 AB 相遇。由於 AC = AD、BC = BD，C、D 到 AB 的垂足是同一點 H。','CH、DH 都垂直 AB，所以 ∠CHD 是兩面交角。P 暫放在 AB 中點作位置示意，不代表題目規定 P 是中點。'],
      {extraPoints:['H'],aux:[['C','H'],['D','H'],['C','P'],['D','P']],measures:[['A','C','20 cm'],['A','D','20 cm'],['B','C','12 cm'],['B','D','12 cm'],['C','D','14 cm']],angles:[['A','C','B','60°']],note:'此圖先用來觀察 (b) 的兩面交角；P 的位置並非已知數據。'});
  }
};
export function trigoKey(q){
  const n=String(q.q).match(/^(\d+)(?:$|\()/)?.[1],key=`${q.year}:${n}`;
  return Object.hasOwn(trigoModels,key)?key:null;
}
