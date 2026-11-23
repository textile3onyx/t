const pptxgen=require('pptxgenjs');const fs=require('fs');
const D=JSON.parse(fs.readFileSync('/tmp/claude-0/pp/data.json'));
const I=v=>v/96, PT=v=>Math.round(v*0.75*10)/10;
const hex=c=>{const m=c.match(/\d+(\.\d+)?/g);if(!m)return'000000';return m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join('').toUpperCase()};
const FONT='맑은 고딕';
const pres=new pptxgen();pres.defineLayout({name:'A0',width:33.11,height:46.81});pres.layout='A0';
pres.theme={headFontFace:FONT,bodyFontFace:FONT};pres.title='TSA 팔꿈치 보조기기 포스터';
const s=pres.addSlide();s.background={color:'FFFFFF'};
// header
const hdr=D.texts.find(t=>t.cls==='aff');
s.addImage({path:'/tmp/claude-0/pp/header.png',x:0,y:0,w:33.11,h:I(hdr.r.y+hdr.r.h)+0.85,objectName:'header-bg'});
// shapes
const mk=(runs,dflt)=>runs.filter(u=>!u.br).map((u,i,arr)=>({text:(i==0?u.t.replace(/^\s+/,''):u.t).replace(i==arr.length-1?/\s+$/:/$^/,''),options:{fontSize:PT(u.fs),bold:u.bold,color:hex(u.color),fontFace:FONT,...dflt}}));
for(const sh of D.shapes){const r=sh.r,o={x:I(r.x),y:I(r.y),w:I(r.w),h:I(r.h)};
 if(sh.k=='sec')s.addShape(pres.ShapeType.rect,{...o,fill:{color:'FFFFFF'},line:{color:'3C4A63',width:1.7}});
 if(sh.k=='tab')s.addText(mk(sh.runs),{...o,shape:pres.ShapeType.roundRect,rectRadius:0.15,fill:{color:'D9DDE4'},line:{type:'none'},align:'center',valign:'middle',margin:0,fontFace:FONT,shadow:{type:'outer',blur:3,offset:1.5,angle:90,color:'000000',opacity:0.25}});
 if(sh.k=='bar')s.addText(mk(sh.runs),{...o,shape:pres.ShapeType.roundRect,rectRadius:0.06,fill:{color:'2C3A52'},line:{type:'none'},align:'center',valign:'middle',margin:0,fontFace:FONT});
 if(sh.k=='eq')s.addText(mk(sh.runs),{...o,shape:pres.ShapeType.roundRect,rectRadius:0.15,fill:{color:'E4EBF6'},line:{type:'none'},align:'center',valign:'middle',margin:0,fontFace:FONT});
 if(sh.k=='box'){const runs=[];sh.items.forEach((it,i)=>{runs.push({text:'- ',options:{fontSize:PT(it.fs),color:hex(it.color),fontFace:FONT}});const m=mk(it.runs);if(i<sh.items.length-1)m[m.length-1].options.breakLine=true;runs.push(...m)});
   s.addText(runs,{...o,shape:pres.ShapeType.roundRect,rectRadius:0.15,fill:{color:'E4EBF6'},line:{type:'none'},valign:'middle',margin:[0.05,0.2,0.05,0.2],fontFace:FONT,lineSpacingMultiple:1.15});}
 if(sh.k=='ph')s.addText([{text:sh.title,options:{bold:true,fontSize:24,color:'4B5563',breakLine:true}},{text:sh.sub,options:{fontSize:19,color:'4B5563'}}],{...o,shape:pres.ShapeType.roundRect,rectRadius:0.12,fill:{color:'F4F6F9'},line:{color:'8B95A5',width:1.7,dashType:'dash'},align:'center',valign:'middle',fontFace:FONT});
 if(sh.k=='arrow')s.addShape(pres.ShapeType.triangle,{...o,h:I(30),fill:{color:'F5C518'},line:{type:'none'},rotate:180});
 if(sh.k=='vline')s.addShape(pres.ShapeType.line,{x:o.x,y:o.y,w:0,h:o.h,line:{color:'8B95A5',width:1.4,dashType:'dash'}});
}
// images
for(const im of D.imgs){const r=im.r;s.addImage({path:'/home/user/t/poster/'+im.src,x:I(r.x),y:I(r.y),w:I(r.w),h:I(r.h)})}
// text
for(const t of D.texts){const r=t.r;const runs=[];
 if(t.li)runs.push({text:t.dash?'- ':'• ',options:{fontSize:PT(t.fs),color:hex(t.color)}});
 t.runs.forEach((u,i)=>{if(u.br){if(runs.length)runs[runs.length-1].options.breakLine=true;return}
   let tx=u.t; if(i==0||t.runs[i-1].br)tx=tx.replace(/^\s+/,''); if(i==t.runs.length-1)tx=tx.replace(/\s+$/,'');
   runs.push({text:tx,options:{fontSize:PT(u.fs),bold:u.bold,color:hex(u.color),superscript:!!u.sup}})});
 const align=(t.cls=='tab'||t.cls=='bar'||t.align=='center')?'center':(t.align=='right'||t.align=='end')?'right':'left';
 const vc=false;s.addText(runs,{x:I(r.x),y:I(r.y),w:vc?I(r.w):I(r.w)*1.03+0.05,h:vc?I(r.h):I(r.h)+0.05,margin:0,valign:vc?'middle':'top',align,fontFace:FONT,lineSpacing:PT(t.lh)||undefined,isTextBox:true,fit:'none'});
}
// tables
for(const tb of D.tables){const colW=tb.rows[0].map(c=>I(c.r.w));
 const rows=tb.rows.map(row=>row.map(c=>({text:c.t,options:{fontSize:PT(c.fs),bold:c.bold,color:hex(c.color),align:'center',valign:'middle',fontFace:FONT,
   fill:c.th?{color:'2C3A52'}:{color:'FFFFFF'},border:[{type:'none'},{type:'none'},{pt:0.8,color:'B8C0CC'},{type:'none'}],margin:0.03}})));
 s.addTable(rows,{x:I(tb.r.x),y:I(tb.r.y),w:I(tb.r.w),colW,rowH:tb.rows.map(r=>I(r[0].r.h))});
}
pres.writeFile({fileName:'/home/user/t/poster/poster.pptx'}).then(()=>console.log('ok'));
