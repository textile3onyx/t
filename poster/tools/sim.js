const G=9.81, D2R=Math.PI/180;
const P={
  theta:{el:'c-theta',label:'굴곡 각도',min:0,max:150,step:1,val:60,unit:'°'},
  attach:{el:'c-attach',label:'부착점 (팔꿈치에서)',min:1.5,max:20,step:.5,val:9,unit:'cm'},
  motor:{el:'c-motor',label:'모터 위치 (팔꿈치에서, 겨드랑이까지)',min:4,max:23.6,step:.1,val:16.8,unit:'cm'},
  pulley:{el:'c-pulley',label:'도르래 거리',min:3,max:12,step:.5,val:6.5,unit:'cm'},
  rfore:{el:'c-rfore',label:'전완 반지름 (부착점 자리)',min:3,max:7,step:.01,val:4.18,unit:'cm'},
  rupper:{el:'c-rupper',label:'상완 반지름 (구동부 자리)',min:3,max:8,step:.01,val:5.43,unit:'cm'},
  protr:{el:'c-protr',label:'구동부 돌출 높이',min:0,max:6,step:.1,val:2.5,unit:'cm'},
  fore:{el:'c-fore',label:'전완 길이 (팔꿈치~손목)',min:20,max:32,step:.1,val:25.7,unit:'cm'},
  upper:{el:'c-upper',label:'상완 길이 (팔꿈치~어깨)',min:28,max:40,step:.1,val:33.3,unit:'cm'},
  axilla:{el:'c-axilla',label:'팔꿈치~겨드랑이',min:15,max:32,step:.1,val:23.6,unit:'cm'},
  srad:{el:'c-srad',label:'줄 반경',min:.02,max:.2,step:.005,val:.075,unit:'cm'},
  strand:{el:'c-strand',label:'가닥 수',min:2,max:16,step:2,val:2,unit:'가닥'},
  hub:{el:'c-hub',label:'허브 지름',min:.2,max:4,step:.1,val:.4,unit:'cm'},
  twist:{el:'c-twist',label:'꼬임 구간 길이 (경로 대비)',min:50,max:400,step:10,val:100,unit:'%'},
  assist:{el:'c-assist',label:'보조율',min:0,max:100,step:5,val:50,unit:'%'},
  weight:{el:'c-weight',label:'체중',min:45,max:115,step:.1,val:72.7,unit:'kg'},
  time:{el:'c-time',label:'동작 시간',min:.4,max:4,step:.1,val:1.5,unit:'s'}
};
let mode='straight';
for(const k in P){
  const p=P[k], host=document.getElementById(p.el);
  host.innerHTML='<div class="row"><label for="i-'+k+'">'+p.label+'</label><output id="o-'+k+'"></output></div>'+
    '<input type="range" id="i-'+k+'" min="'+p.min+'" max="'+p.max+'" step="'+p.step+'" value="'+p.val+'">';
  p.input=document.getElementById('i-'+k); p.out=document.getElementById('o-'+k);
}
const V=k=>P[k].val;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const len=a=>Math.hypot(a[0],a[1]);
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
function hubPt(){ return [-V('motor'), V('rupper')+V('protr')]; }
function attachPt(th){
  const t=th*D2R, R=V('rfore'), d=V('attach');
  return [d*Math.cos(t) - R*Math.sin(t), d*Math.sin(t) + R*Math.cos(t)];
}
function geom(th){
  const Pm=hubPt(), Pa=attachPt(th);
  const v=sub(Pm,Pa), L=len(v);
  return {L, ma:Math.abs(cross(Pa,[v[0]/L,v[1]/L])), pts:[Pm,Pa]};
}
function solve(th){
  const g=geom(th), L0=geom(0).L;
  const mult=V('twist')/100;
  const Lt0=L0*mult;
  const a=Math.max(V('hub')/2, V('srad')/Math.sin(Math.PI/V('strand')));
  const contr=L0-g.L;
  const Lt=Lt0-contr;
  const impossible = Lt<=0;
  const phi=(!impossible && contr>0) ? Math.sqrt(Math.max(0,Lt0*Lt0-Lt*Lt))/a : 0;
  const ratio=Lt0>0?contr/Lt0:0;
  const mF=0.0252*V('weight'), dCom=0.68*V('fore')/100;
  const tauG=mF*G*dCom*Math.sin(th*D2R);
  const target=tauG*V('assist')/100;
  const F=g.ma>0.05 ? target/(g.ma/100) : Infinity;
  const tauM=(isFinite(F)&&!impossible&&Lt>0) ? F*phi*Math.pow(a/100,2)/(Lt/100) : Infinity;
  return {...g, L0, Lt0, Lt, mult, impossible, a, phi, rev:phi/(2*Math.PI), contr, ratio, tauG, target, F, tauM};
}
function findLimit(){
  let prev=solve(0).L;
  for(let th=1;th<=150;th++){
    const s=solve(th);
    if(s.L>prev+1e-4) return {th, why:'줄의 경로 길이가 다시 증가하여 당겨서 더 굽힐 수 없음'};
    if(s.ma<0.5) return {th, why:'모멘트암이 0에 가까워져 필요 장력이 발산함'};
    if(s.impossible) return {th, why:'필요 수축량이 꼬임 구간 길이를 넘어섬'};
    prev=s.L;
  }
  return {th:150, why:'150°까지 정의되지 않는 구간 없음'};
}
const NS='http://www.w3.org/2000/svg';
const mk=(t,at)=>{const e=document.createElementNS(NS,t);for(const k in at)e.setAttribute(k,at[k]);return e;};
function drawArm(th,s){
  const svg=document.getElementById('arm'); svg.textContent='';
  const k=Math.min(7.2, 500/(V('upper')+V('fore')+8));
  const ox=30+V('upper')*k, oy=215;
  const X=p=>ox+p[0]*k, Y=p=>oy-p[1]*k;
  const R=V('rfore'), RU=V('rupper');
  const up=[-V('upper'),0], fw=[V('fore')*Math.cos(th*D2R), V('fore')*Math.sin(th*D2R)];
  svg.appendChild(mk('line',{x1:X([0,0]),y1:Y([0,0]),x2:X(up),y2:Y(up),stroke:'var(--arm)','stroke-width':RU*2*k,'stroke-linecap':'round',opacity:'.35'}));
  svg.appendChild(mk('line',{x1:X([0,0]),y1:Y([0,0]),x2:X(fw),y2:Y(fw),stroke:'var(--arm)','stroke-width':R*2*k,'stroke-linecap':'round',opacity:'.35'}));
  svg.appendChild(mk('line',{x1:X([0,0]),y1:Y([0,0]),x2:X(up),y2:Y(up),stroke:'var(--arm)','stroke-width':'1.5',fill:'none'}));
  svg.appendChild(mk('line',{x1:X([0,0]),y1:Y([0,0]),x2:X(fw),y2:Y(fw),stroke:'var(--arm)','stroke-width':'1.5',fill:'none'}));
  if(s.ma>=0.05 && s.pts.length>=2){
    const A=s.pts[s.pts.length-2], B=s.pts[s.pts.length-1];
    const v=sub(A,B), n=len(v), u=[v[0]/n,v[1]/n];
    const t=-(B[0]*u[0]+B[1]*u[1]);
    const foot=[B[0]+u[0]*t, B[1]+u[1]*t];
    svg.appendChild(mk('line',{x1:X([0,0]),y1:Y([0,0]),x2:X(foot),y2:Y(foot),stroke:'var(--curve)','stroke-width':'1.6','stroke-dasharray':'4 3',fill:'none'}));
    const mid=[(foot[0])/2,(foot[1])/2];
    svg.appendChild(mk('circle',{cx:X(foot),cy:Y(foot),r:'2.4',fill:'var(--curve)'}));
    const tx=mk('text',{x:X(mid)+7,y:Y(mid)-5,fill:'var(--curve)','font-size':'11','font-family':'var(--font-num)'});
    tx.textContent=s.ma.toFixed(1)+' cm'; svg.appendChild(tx);
  }
  let d='M '+X(s.pts[0])+' '+Y(s.pts[0]);
  for(let i=1;i<s.pts.length;i++) d+=' L '+X(s.pts[i])+' '+Y(s.pts[i]);
  svg.appendChild(mk('path',{d,stroke:'var(--string)','stroke-width':'2.4',fill:'none','stroke-linejoin':'round'}));
  const Pm=s.pts[0], Pa=s.pts[s.pts.length-1];
  svg.appendChild(mk('rect',{x:X(Pm)-9,y:Y(Pm)-7,width:'18',height:'14',rx:'2',fill:'var(--string)',opacity:'.9'}));
  svg.appendChild(mk('circle',{cx:X(Pa),cy:Y(Pa),r:'4',fill:'var(--string)'}));
  svg.appendChild(mk('circle',{cx:X([0,0]),cy:Y([0,0]),r:'3.5',fill:'var(--ground)',stroke:'var(--ink)','stroke-width':'1.5'}));
  const lbl=(x,y,t,an)=>{const e=mk('text',{x,y,fill:'var(--ink-soft)','font-size':'10.5','text-anchor':an||'middle'});e.textContent=t;svg.appendChild(e);};
  lbl(X(Pm),Y(Pm)-13,'구동부·허브');
  lbl(X(Pa)+(th<100?16:-16),Y(Pa)+15,'부착점',th<100?'start':'end');
  lbl(X([0,0])+12,Y([0,0])+16,'팔꿈치','start');
  svg.appendChild(mk('circle',{cx:X(up),cy:Y(up),r:'5',fill:'none',stroke:'var(--arm)','stroke-width':'1.8'}));
  lbl(X(up),Y(up)-11,'어깨');
  const ax=[-V('axilla'),0], over=V('motor')>V('axilla');
  svg.appendChild(mk('line',{x1:X(ax),y1:Y([ax[0],RU+1.2]),x2:X(ax),y2:Y([ax[0],-RU-1.2]),
    stroke:over?'var(--warn)':'var(--ink-soft)','stroke-width':'1.6','stroke-dasharray':'3 3'}));
  const axl=mk('text',{x:X(ax),y:Y([ax[0],-RU-1.2])+14,fill:over?'var(--warn)':'var(--ink-soft)','font-size':'10.5','text-anchor':'middle'});
  axl.textContent='겨드랑이'; svg.appendChild(axl);
  lbl(X([-V('upper')/2,0]),Y([-V('upper')/2,0])+RU*k+16,'상완');
}
function drawChart(){
  const svg=document.getElementById('chart'); svg.textContent='';
  const W=560,H=280,mL=48,mR=52,mT=16,mB=38;
  const lim=findLimit();
  const rows=[]; for(let th=0;th<=150;th++){const s=solve(th);rows.push({th,ma:s.ma,F:isFinite(s.F)?s.F:null});}
  const inRange=rows.filter(r=>r.th<=lim.th);
  const maMax=Math.max(2,Math.ceil(Math.max(...rows.map(r=>r.ma))));
  const fVals=inRange.map(r=>r.F).filter(v=>v!==null);
  const fMax=Math.max(10,Math.ceil((fVals.length?Math.max(...fVals):10)/10)*10);
  const px=th=>mL+(W-mL-mR)*th/150;
  const pyA=v=>H-mB-(H-mT-mB)*v/maMax;
  const pyB=v=>H-mB-(H-mT-mB)*Math.min(v,fMax)/fMax;
  if(lim.th<150){
    svg.appendChild(mk('rect',{x:px(lim.th),y:mT,width:(W-mR-px(lim.th)),height:(H-mT-mB),fill:'var(--warn)',opacity:'.08'}));
    svg.appendChild(mk('line',{x1:px(lim.th),y1:mT,x2:px(lim.th),y2:H-mB,stroke:'var(--warn)','stroke-width':'1.4','stroke-dasharray':'5 3'}));
    const t=mk('text',{x:px(lim.th)+5,y:mT+12,fill:'var(--warn)','font-size':'10.5'});
    t.textContent=lim.th+'°'; svg.appendChild(t);
  }
  for(let th=0;th<=150;th+=30){
    svg.appendChild(mk('line',{x1:px(th),y1:mT,x2:px(th),y2:H-mB,stroke:'var(--grid)','stroke-width':'1'}));
    const t=mk('text',{x:px(th),y:H-mB+16,fill:'var(--ink-soft)','font-size':'10.5','text-anchor':'middle','font-family':'var(--font-num)'});
    t.textContent=th; svg.appendChild(t);
  }
  for(let i=0;i<=4;i++){
    const y=mT+(H-mT-mB)*i/4;
    svg.appendChild(mk('line',{x1:mL,y1:y,x2:W-mR,y2:y,stroke:'var(--grid)','stroke-width':'1'}));
    const a=mk('text',{x:mL-7,y:y+3.5,fill:'var(--curve)','font-size':'10.5','text-anchor':'end','font-family':'var(--font-num)'});
    a.textContent=(maMax*(4-i)/4).toFixed(maMax<4?1:0); svg.appendChild(a);
    const b=mk('text',{x:W-mR+7,y:y+3.5,fill:'var(--string)','font-size':'10.5','font-family':'var(--font-num)'});
    b.textContent=Math.round(fMax*(4-i)/4); svg.appendChild(b);
  }
  const line=(f,py,color)=>{
    let d='',open=false;
    rows.forEach(r=>{const v=f(r); if(v===null){open=false;return;} d+=(open?' L ':' M ')+px(r.th)+' '+py(v); open=true;});
    if(d) svg.appendChild(mk('path',{d:d.trim(),stroke:color,'stroke-width':'2',fill:'none','stroke-linejoin':'round'}));
  };
  line(r=>r.F,pyB,'var(--string)');
  line(r=>r.ma,pyA,'var(--curve)');
  const xt=mk('text',{x:(mL+W-mR)/2,y:H-4,fill:'var(--ink-soft)','font-size':'10.5','text-anchor':'middle'});
  xt.textContent='굴곡 각도 (°)'; svg.appendChild(xt);
  const l1=mk('text',{x:mL-7,y:mT-5,fill:'var(--curve)','font-size':'10','text-anchor':'end'});
  l1.textContent='cm'; svg.appendChild(l1);
  const l2=mk('text',{x:W-mR+7,y:mT-5,fill:'var(--string)','font-size':'10'});
  l2.textContent='N'; svg.appendChild(l2);
  document.getElementById('limitnote').innerHTML = lim.th<150
    ? '<b>'+lim.th+'°</b>부터 모델이 정의되지 않습니다 — '+lim.why+'.'
    : '0–150° 전 구간에서 모델이 정의됩니다.';
}
function render(){
  const th=V('theta'), s=solve(th);
  const cells=[
    ['@'+th+'° 수축 길이',s.contr.toFixed(2),'cm'],
    ['@'+th+'° 필요 장력',s.F.toFixed(1),'N'],
    ['@'+th+'° 모터 토크',(s.tauM*1000).toFixed(1),'mNm'],
    ['@'+th+'° 회전수',s.rev.toFixed(1),'rev'],
    ['@'+th+'° 모멘트암',s.ma.toFixed(2),'cm'],
    ['허브 지름',(V('hub')*10).toFixed(0),'mm']
  ];
  document.getElementById('out').innerHTML = cells.map(c=>
    '<div class="cell"><span class="k">'+c[0]+'</span><span class="v">'+c[1]+'<span class="u">'+c[2]+'</span></span></div>').join('');
  document.getElementById('outnote').innerHTML='전완 부착점 '+V('attach')+' cm, 보조율 '+V('assist')+' %, 체중 '+V('weight')+' kg (Size Korea 20~24세 남성 평균)';
  drawArm(th,s); drawChart();
}
render();
