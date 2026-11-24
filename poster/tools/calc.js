const fs=require('fs');let src=fs.readFileSync('sim.js','utf8');
src=src.replace(/for\(const k in P\)\{[\s\S]*?\n\}\n/,'').replace('render();','');
global.document={getElementById:()=>({})};
eval(src+`
const out={};
function run(att,hub){P.attach.val=att;P.hub.val=hub;const r={};for(const th of [0,30,60,90]){const s=solve(th);r[th]={c:+s.contr.toFixed(2),F:+s.F.toFixed(1),rev:+s.rev.toFixed(1),t:+(s.tauM*1000).toFixed(1),ma:+s.ma.toFixed(2),rho:+(s.ratio*100).toFixed(1)}};r.lim=findLimit().th;return r}
for(const a of [6,7,7.5,9]) out['a'+a]=run(a,0.4);
out.hub6=run(9,0.6); out.hub3=run(9,0.3);
const curve=[];P.attach.val=9;P.hub.val=0.4;for(let th=0;th<=110;th+=2){const s=solve(th);curve.push([th,s.contr,s.F,s.tauM*1000,s.ma])}
out.curve=curve;
fs.writeFileSync('/tmp/claude-0/sim/res.json',JSON.stringify(out));
console.log(JSON.stringify({a6:out.a6[60],a7:out.a7[60],a75:out['a7.5'][60],a9:out.a9,hub6:out.hub6[60],hub3:out.hub3[60]},null,0));
`);
