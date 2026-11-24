const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:700,height:1400},deviceScaleFactor:3});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///tmp/claude-0/sim/sim.html');await p.waitForTimeout(300);
await (await p.$('#cardArm')).screenshot({path:'/home/user/t/poster/img/sim_arm.png'});
await (await p.$('#cardChart')).screenshot({path:'/home/user/t/poster/img/sim_chart.png'});
console.log(await p.evaluate(()=>document.getElementById('out').innerText.replace(/\n/g,' | ')), errs);await b.close()})();
