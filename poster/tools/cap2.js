const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:900,height:900},deviceScaleFactor:3});
await p.goto('file:///tmp/claude-0/sim/sim.html');await p.waitForTimeout(300);
await p.evaluate(()=>{
  const svg=document.getElementById('arm');
  svg.querySelectorAll('text').forEach(t=>{const f=parseFloat(t.getAttribute('font-size'));t.setAttribute('font-size',f*1.4);t.setAttribute('font-weight','600');
    if(t.textContent.includes('cm')){t.setAttribute('font-size',17);t.setAttribute('font-family','Noto Sans CJK KR');t.textContent='모멘트암 '+t.textContent;}});
  svg.querySelectorAll('path').forEach(e=>e.setAttribute('stroke-width','3.5'));const sw=[...svg.querySelectorAll('line')].map(l=>+l.getAttribute('stroke-width')||0);
  // nudge labels that collide
  svg.querySelectorAll('text').forEach(t=>{
    if(t.textContent==='부착점'){t.setAttribute('x',+t.getAttribute('x')+10);t.setAttribute('y',+t.getAttribute('y')-6);}
    if(t.textContent.includes('cm')){t.setAttribute('text-anchor','end');t.setAttribute('x',+t.getAttribute('x')-14);t.setAttribute('y',+t.getAttribute('y')+8);}
    if(t.textContent==='상완'){t.setAttribute('x',+t.getAttribute('x')+60);}
    if(t.textContent==='겨드랑이'){t.setAttribute('x',+t.getAttribute('x')-10);}
    if(t.textContent==='구동부·허브'){t.setAttribute('y',+t.getAttribute('y')-6);}
    if(t.textContent==='팔꿈치'){t.setAttribute('y',+t.getAttribute('y')+8);}
  });
  const bb=svg.getBBox(),pad=6;
  const R=Math.max(...sw)/2;svg.setAttribute('viewBox',[bb.x-R-pad,bb.y-R-pad,bb.width+2*R+2*pad,bb.height+2*R+2*pad].join(' '));
  const card=document.getElementById('cardArm');card.style.width='860px';card.querySelector('h2').remove();
  const lg=card.querySelector('.legend');lg.style.fontSize='18px';lg.style.fontWeight='600';lg.querySelectorAll('i').forEach(i=>{i.style.width='28px';i.style.height='4px'});
});
await p.waitForTimeout(100);
await (await p.$('#cardArm')).screenshot({path:'/home/user/t/poster/img/sim_arm.png'});
await b.close()})();
