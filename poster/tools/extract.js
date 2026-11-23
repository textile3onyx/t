const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:3179,height:4494}});
await p.goto('file:///home/user/t/poster/poster.html');await p.waitForTimeout(800);
// header background without text
await p.evaluate(()=>document.querySelectorAll('header *').forEach(e=>e.style.visibility='hidden'));
await (await p.$('header')).screenshot({path:'/tmp/claude-0/pp/header.png'});
await p.evaluate(()=>document.querySelectorAll('header *').forEach(e=>e.style.visibility=''));
const data=await p.evaluate(()=>{
 const R=e=>{const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}};
 const st=e=>{const c=getComputedStyle(e);return {fs:parseFloat(c.fontSize),bold:parseInt(c.fontWeight)>=600,color:c.color,align:c.textAlign,lh:parseFloat(c.lineHeight)}};
 const runs=e=>{const out=[];const walk=(n,inh)=>{for(const k of n.childNodes){if(k.nodeType==3){const t=k.textContent.replace(/\s+/g,' ');if(t.trim()||t==' ')out.push({t,...st(k.parentElement)})}else if(k.nodeType==1){if(k.tagName=='BR'){out.push({br:1})}else if(k.tagName=='SUP'){out.push({t:k.textContent,...st(k),sup:1})}else walk(k)}}};walk(e);return out};
 const texts=[],imgs=[],shapes=[],tables=[];
 document.querySelectorAll('h1,.auth,.aff,li,.sub>p,.step,figcaption,.arrowtext,.rf').forEach(e=>{
   if(e.closest('table')||e.closest('.box'))return;
   texts.push({cls:e.className||e.tagName,r:R(e),runs:runs(e),...st(e),li:e.tagName=='LI',dash:!!e.closest('.box')});
 });
 document.querySelectorAll('main img').forEach(e=>imgs.push({src:e.getAttribute('src'),r:R(e)}));
 document.querySelectorAll('.sec').forEach(e=>shapes.push({k:'sec',r:R(e)}));
 document.querySelectorAll('.tab').forEach(e=>shapes.push({k:'tab',r:R(e),runs:runs(e),...st(e)}));
 document.querySelectorAll('.bar').forEach(e=>shapes.push({k:'bar',r:R(e),runs:runs(e),...st(e)}));
 document.querySelectorAll('.eq').forEach(e=>shapes.push({k:'eq',r:R(e),runs:runs(e),...st(e)}));
 document.querySelectorAll('.box').forEach(e=>shapes.push({k:'box',r:R(e),items:[...e.querySelectorAll('li')].map(l=>({runs:runs(l),...st(l)}))}));
 document.querySelectorAll('.ph').forEach(e=>shapes.push({k:'ph',r:R(e),title:e.childNodes[0].textContent.trim(),sub:(e.querySelector('small')||{}).innerText||''}));
 document.querySelectorAll('.arrow').forEach(e=>shapes.push({k:'arrow',r:R(e)}));
 document.querySelectorAll('.sub+.sub').forEach(e=>shapes.push({k:'vline',r:R(e)}));
 
 document.querySelectorAll('table').forEach(t=>{const rows=[...t.rows].map(tr=>[...tr.cells].map(c=>({t:c.innerText.trim(),r:R(c),...st(c),bg:getComputedStyle(c).backgroundColor,th:c.tagName=='TH'})));tables.push({r:R(t),rows})});
 return {texts,imgs,shapes,tables,W:document.documentElement.scrollWidth};
});
require('fs').writeFileSync('/tmp/claude-0/pp/data.json',JSON.stringify(data));await b.close();console.log(data.texts.length,data.imgs.length,data.tables.length)})();
