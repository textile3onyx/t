const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:3});
let el=0;
await p.route('**/*',r=>{const u=r.request().url();
 if(u.includes('/s?'))return r.fulfill({contentType:'application/json',body:JSON.stringify({m:2,el:el,ph:el,up:0,tn:el/8,f:0,i:0.4,io:1,zi:1,zs:1,nt:20,tc:0,msg:''})});
 if(u.includes('/do'))return r.fulfill({body:'ok'});
 return r.fulfill({contentType:'text/html',body:require('fs').readFileSync('/tmp/claude-0/page.html','utf8')})});
await p.goto('http://x.test/');
for(const a of [0,60,100]){el=a;await p.waitForTimeout(1500);await (await p.$('#arm')).screenshot({path:`/tmp/claude-0/st${a}.png`})}
await b.close()})();
