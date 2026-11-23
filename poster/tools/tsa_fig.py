import numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams['font.family']='Noto Sans CJK KR'; plt.rcParams['axes.unicode_minus']=False
T,O,INK='#0f6d7a','#c2571a','#1d1d1f'
fig,axs=plt.subplots(2,1,figsize=(6.4,5.6))
L=10.0
def draw(ax,turns,title):
    r=0.35
    Lt = L*0.72 if turns else L
    # motor
    ax.add_patch(plt.Rectangle((-1.6,-0.9),1.2,1.8,color='#3a4048'))
    ax.text(-1.0,-1.35,'모터',ha='center',va='top',fontsize=12)
    # load
    ax.add_patch(plt.Rectangle((Lt+0.2,-0.6),0.5,1.2,color='#8b95a5'))
    if not turns: ax.text(Lt+0.45,-1.35,'전완 쪽\n부착점',ha='center',va='top',fontsize=11)
    x=np.linspace(0,Lt,400)
    if turns==0:
        ax.plot([0,Lt],[r,r],color=O,lw=3); ax.plot([0,Lt],[-r,-r],color=T,lw=3)
    else:
        ph=2*np.pi*turns*x/Lt
        y1=r*np.cos(ph); y2=-r*np.cos(ph); z=np.sin(ph)
        for i in range(len(x)-1):
            a=(x[i:i+2]); 
            front1=z[i]>0
            ax.plot(a,y1[i:i+2],color=O,lw=3,zorder=3 if front1 else 2,solid_capstyle='round')
            ax.plot(a,y2[i:i+2],color=T,lw=3,zorder=2 if front1 else 3,solid_capstyle='round')
    ax.annotate('',(0,1.25),(Lt,1.25),arrowprops=dict(arrowstyle='<->',color=INK,lw=1.2))
    ax.text(Lt/2,1.45,title[1],ha='center',va='bottom',fontsize=12,color=INK)
    if turns:
        ax.add_patch(plt.Rectangle((L+0.2,-0.6),0.5,1.2,fill=False,ls='--',ec='#8b95a5',lw=1.2))
        ax.annotate('',(Lt+0.45,-0.9),(L+0.45,-0.9),arrowprops=dict(arrowstyle='<->',color=O,lw=1.8))
        ax.text((Lt+L)/2+0.45,-1.05,'줄어든 길이\n→ 팔꿈치를 당김',ha='center',va='top',fontsize=11,color=O,weight='bold')
        ax.annotate('모터가 θ만큼 회전',(-0.3,0.2),(0.9,-1.7),fontsize=11,color=INK,
                    arrowprops=dict(arrowstyle='->',color=INK,connectionstyle='arc3,rad=-0.3'))
    else:
        ax.plot([0,L],[0,0],color='#999',lw=1,ls=(0,(6,4)))
        ax.text(L/2,-1.0,'PE 합사 2가닥 (회전축에서 r = 2 mm)',ha='center',fontsize=11,color=INK)
    ax.set_title(title[0],fontsize=14,weight='bold',pad=4)
    ax.set_xlim(-2,L+1.2); ax.set_ylim(-2.4,2.2); ax.axis('off'); ax.set_aspect('equal')
draw(axs[0],0,('꼬기 전','꼬기 전 길이'))
draw(axs[1],5,('꼬은 뒤','꼬인 뒤 길이'))
fig.tight_layout()
fig.savefig('/home/user/t/poster/img/tsa_principle.png',dpi=220,facecolor='white',bbox_inches='tight')
