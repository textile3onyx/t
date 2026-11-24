import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
plt.rcParams['font.family']='Noto Sans CJK KR'
NAVY,TEAL,ORG,GR='#2c3a52','#0f6d7a','#c2571a','#e4ebf6'
fig,ax=plt.subplots(figsize=(7,6.2));ax.set_xlim(0,10);ax.set_ylim(0,9);ax.axis('off')
def box(x,y,w,h,t,s,c=NAVY,fc='white'):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=0.02,rounding_size=0.25',fc=fc,ec=c,lw=2.2))
    ax.text(x+w/2,y+h*0.63,t,ha='center',va='center',fontsize=15,weight='bold',color=c)
    ax.text(x+w/2,y+h*0.27,s,ha='center',va='center',fontsize=11,color='#333')
def arr(a,b,t='',c=NAVY,ls='-',off=(0,0),both=False):
    ax.add_patch(FancyArrowPatch(a,b,arrowstyle='<|-|>' if both else '-|>',mutation_scale=16,color=c,lw=2,ls=ls))
    if t: ax.text((a[0]+b[0])/2+off[0],(a[1]+b[1])/2+off[1],t,ha='center',va='center',fontsize=11,color=c,weight='bold',
                  bbox=dict(fc='white',ec='none',pad=1.5))
box(0.2,6.8,3.0,1.8,'IMU × 2','상완 · 전완\n기울기 측정',TEAL,GR)
box(3.4,3.6,2.7,1.9,'ESP32-C3','굴곡각 계산\n제어 명령 생성')
box(6.9,6.8,2.9,1.8,'스마트폰','수동 / 자동 선택\n3D 자세 표시',ORG)
box(6.9,3.6,2.9,1.9,'SimpleFOC\nMini','모터 전류 제어')
box(6.9,0.4,2.9,1.9,'GL30 모터','엔코더 내장\n허브 회전',)
box(0.2,0.4,3.4,1.9,'PE 합사 꼬임','줄이 짧아져\n팔꿈치 굴곡',TEAL,GR)
arr((1.7,6.8),(3.8,5.5),'I²C',TEAL,off=(-0.55,0))
arr((5.4,5.5),(7.3,6.8),'Wi-Fi',ORG,ls='--',off=(-0.5,0.3),both=True)
arr((6.1,4.55),(6.9,4.55))
ax.text(6.5,4.0,'PWM',ha='center',fontsize=11,color=NAVY,weight='bold')
arr((8.35,3.6),(8.35,2.3),'3상 전류',off=(0.75,0))
arr((6.9,1.35),(3.6,1.35),'회전',off=(0,0.3))
arr((7.3,2.3),(5.6,3.6),'회전각 (SPI)',NAVY,ls=':',off=(-1.1,-0.1))
ax.annotate('',(1.0,6.8),(1.0,2.3),arrowprops=dict(arrowstyle='-|>',color=TEAL,lw=1.6,ls=(0,(4,3))))
ax.text(0.55,4.55,'팔 움직임',rotation=90,ha='center',va='center',fontsize=11,color=TEAL,weight='bold')
fig.savefig('/home/user/t/poster/img/control_flow.png',dpi=220,bbox_inches='tight',facecolor='white')
