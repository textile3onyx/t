import json, matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams['font.family']='Noto Sans CJK KR'; plt.rcParams['axes.unicode_minus']=False
R=json.load(open('/tmp/claude-0/sim/res.json'))
C=R['curve']; th=[c[0] for c in C]; x=[c[1] for c in C]; F=[c[2] for c in C]
TEAL,ORG,INK='#0f6d7a','#c2571a','#1d1d1f'
fig,axs=plt.subplots(1,2,figsize=(12,4.6),gridspec_kw={'width_ratios':[1.25,1]})
ax=axs[0]
ax.plot(th,F,color=ORG,lw=3,label='필요 장력 (N)'); ax.set_ylabel('필요 장력 (N)',color=ORG,fontsize=13)
ax.set_xlabel('팔꿈치 굴곡각 (°)',fontsize=13); ax.set_ylim(0,max(F)*1.15); ax.tick_params(labelsize=11)
ax2=ax.twinx(); ax2.plot(th,x,color=TEAL,lw=3,ls='--'); ax2.set_ylabel('수축 길이 (cm)',color=TEAL,fontsize=13); ax2.set_ylim(0,max(x)*1.15); ax2.tick_params(labelsize=11)
ax.axvline(60,color='#888',lw=1.2,ls=':')
ax.plot([60],[14.0],'o',color=ORG,ms=8); ax2.plot([60],[8.28],'o',color=TEAL,ms=8)
ax.annotate('14.0 N',(60,14.0),(40,17.5),fontsize=12,color=ORG,weight='bold',arrowprops=dict(arrowstyle='->',color=ORG))
ax2.annotate('8.3 cm',(60,8.28),(68,4.5),fontsize=12,color=TEAL,weight='bold',arrowprops=dict(arrowstyle='->',color=TEAL))
ax.set_title('(a) 굴곡각에 따른 필요 장력·수축 길이 (전완 부착점 9 cm)',fontsize=13,weight='bold')
ax.grid(alpha=.25); ax.set_xlim(0,110)
ax=axs[1]
labs=['6','7.5','9']; keys=['a6','a7.5','a9']
Fs=[R[k]['60']['F'] for k in keys]; Xs=[R[k]['60']['c'] for k in keys]
import numpy as np; i=np.arange(3); w=.36
b1=ax.bar(i-w/2,Fs,w,color=ORG,label='필요 장력 (N)'); 
ax3=ax.twinx(); b2=ax3.bar(i+w/2,Xs,w,color=TEAL,label='수축 길이 (cm)')
for r,v in zip(b1,Fs): ax.text(r.get_x()+r.get_width()/2,v+0.4,f'{v:.1f}',ha='center',fontsize=12,color=ORG,weight='bold')
for r,v in zip(b2,Xs): ax3.text(r.get_x()+r.get_width()/2,v+0.2,f'{v:.1f}',ha='center',fontsize=12,color=TEAL,weight='bold')
ax.set_xticks(i); ax.set_xticklabels([l+' cm' for l in labs],fontsize=12); ax.set_xlabel('전완 부착점 (팔꿈치에서)',fontsize=13)
ax.set_ylim(0,24); ax3.set_ylim(0,11); ax.set_ylabel('필요 장력 (N)',color=ORG,fontsize=13); ax3.set_ylabel('수축 길이 (cm)',color=TEAL,fontsize=13)
ax.tick_params(labelsize=11); ax3.tick_params(labelsize=11)
ax.set_title('(b) 전완 부착점에 따른 60° 굴곡 요구값',fontsize=13,weight='bold')
fig.tight_layout(); fig.savefig('/home/user/t/poster/img/sim_results.png',dpi=220,facecolor='white')
