'use strict';
const $=i=>document.getElementById(i),TAU=Math.PI*2,R=5;
// v = base speed, sp = obstacle spacing, w = weights [wall, gap, bar, double], rot = bar rotation speed
const LV=[
{n:'Neon Gate',h:180,len:1600,v:26,sp:46,w:[4,3,1,0],rot:.7},
{n:'Magenta Drift',h:300,len:2000,v:29,sp:42,w:[3,3,3,1],rot:.9},
{n:'Acid Circuit',h:110,len:2400,v:32,sp:38,w:[2,3,3,3],rot:1.1},
{n:'Solar Flare',h:30,len:2800,v:35,sp:35,w:[2,2,4,4],rot:1.3},
{n:'Void Runner',h:340,len:3400,v:38,sp:32,w:[1,3,4,5],rot:1.6}];
// s = speed multiplier, g = gap width (rad), r = spacing multiplier (reaction window)
const DF={Easy:{s:.8,g:1.9,r:1.3},Medium:{s:1,g:1.5,r:1.1},Hard:{s:1.3,g:1.2,r:.95}};
const store={get(k,d){try{const v=JSON.parse(localStorage.getItem('ntr_'+k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem('ntr_'+k,JSON.stringify(v))}catch(e){}}};
let cfg=Object.assign({sens:1,shake:true,diff:'Medium'},store.get('cfg',{})),best=store.get('best',{}),level=0,classic=false;
const S={mode:'menu',p:0,dist:0,last:0,t:0,shake:0,pulse:0,dir:0,tilt:0,drag:0};
let O=[],rings=[],ship,mFill,mEdge,mRing,rng;

const renderer=new THREE.WebGLRenderer({canvas:$('c'),antialias:true});
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(74,1,.1,400),world=new THREE.Group();
scene.add(world);
ship=new THREE.Mesh(new THREE.ConeGeometry(.3,1,4).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true}));
ship.position.set(0,-(R-.55),0);scene.add(ship);

function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

function build(h){
 while(world.children.length)world.remove(world.children[0]);
 O=[];rings=[];
 const cA=new THREE.Color().setHSL(h/360,1,.55),cB=new THREE.Color().setHSL(((h+150)%360)/360,1,.55);
 mRing=[new THREE.LineBasicMaterial({color:cA}),new THREE.LineBasicMaterial({color:cB})];
 mFill=new THREE.MeshBasicMaterial({color:cB,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false});
 mEdge=new THREE.LineBasicMaterial({color:cB.clone().lerp(new THREE.Color(1,1,1),.45)});
 scene.background=new THREE.Color(0x05000f);scene.fog=new THREE.Fog(0x05000f,25,170);
 const pts=[];for(let i=0;i<16;i++)pts.push(new THREE.Vector3(Math.cos(i/16*TAU)*R,Math.sin(i/16*TAU)*R,0));
 const rg=new THREE.BufferGeometry().setFromPoints(pts);
 for(let i=0;i<40;i++){const r=new THREE.LineLoop(rg,mRing[i%2]);r.position.z=-i*6;world.add(r);rings.push(r)}
 const lp=[];for(let i=0;i<16;i++){const a=i/16*TAU,x=Math.cos(a)*R,y=Math.sin(a)*R;lp.push(x,y,10,x,y,-240)}
 const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));
 world.add(new THREE.LineSegments(lg,mRing[0]));
}

// An obstacle is an arc of the tunnel wall: covers angles [ang, ang+span] and rotates at rs rad/s.
function obs(z,st,span,rs){
 const g=new THREE.CylinderGeometry(R-.05,R-.05,1.2,Math.max(4,Math.ceil(span*5)),1,true,0,span);
 g.rotateX(Math.PI/2);g.rotateZ(Math.PI/2); // map cylinder theta -> world angle
 const eg=new THREE.EdgesGeometry(g,1),piv=new THREE.Group();
 piv.add(new THREE.Mesh(g,mFill),new THREE.LineSegments(eg,mEdge));
 piv.position.z=z;piv.rotation.z=st;world.add(piv);
 O.push({piv,z,st,span,rs,g,eg,ang:st,done:false});
}
function spawn(z){
 const L=LV[level],D=DF[cfg.diff],w=L.w,tot=w[0]+w[1]+w[2]+w[3];
 let k=rng()*tot,t=0;while(k>=w[t]){k-=w[t];t++}
 const st=rng()*TAU,sgn=rng()<.5?-1:1;
 if(t===0)obs(z,st,1.3+rng()*.7,0);
 else if(t===1)obs(z,st,TAU-D.g,level>1?sgn*L.rot*.4:0);
 else if(t===2)obs(z,st,2.6,sgn*L.rot*(.7+rng()*.6));
 else{obs(z,st,1.5,0);obs(z,st+Math.PI,1.5,0)}
}

function start(i){ // instant: rebuilds in a single frame
 level=i;store.set('cfg',cfg);
 const L=LV[i],D=DF[cfg.diff];
 build(L.h);rng=mulberry(i*7919+13);
 Object.assign(S,{mode:'play',p:0,dist:0,last:0,t:0,shake:0,pulse:0,dir:0,tilt:0,drag:0});
 for(let z=-70;z>-160;z-=L.sp*D.r)spawn(z);
 ship.visible=true;showScreen(null);$('hud').hidden=false;
 $('lname').textContent=(i+1)+'. '+L.n+' ('+cfg.diff+')';
}
function end(win){
 const L=LV[level],k=level+'_'+cfg.diff;
 let pct=win?100:Math.min(99,Math.floor(S.dist/L.len*100));
 S.mode=win?'win':'dead';
 if(!(best[k]>=pct)){best[k]=pct;store.set('best',best)}
 if(!win){S.shake=1.3;flash('crash');if(navigator.vibrate)navigator.vibrate(120)}
 $('ovTitle').textContent=win?'Level clear':'Crashed';
 $('ovInfo').textContent=pct+'% reached. Best '+best[k]+'%';
 $('next').hidden=!(win&&level<LV.length-1);
 showScreen('over');
}
function flash(c){const f=$('flash');f.className='';void f.offsetWidth;f.className=c}

function moveObs(sp,dt){
 for(let i=O.length-1;i>=0;i--){
  const o=O[i];o.z+=sp*dt;o.ang=o.st+o.rs*S.t;
  o.piv.position.z=o.z;o.piv.rotation.z=o.ang;
  const d=(((S.p-o.ang)%TAU)+TAU)%TAU;
  if(Math.abs(o.z)<.75&&(d<o.span+.1||d>TAU-.1)){end(false);return}
  if(!o.done&&o.z>=0){o.done=true;const e=Math.min(d-o.span,TAU-d);
   if(e>0&&e<.32){S.pulse=1;S.shake=Math.max(S.shake,.25);flash('near')}}
  if(o.z>8){world.remove(o.piv);o.g.dispose();o.eg.dispose();O.splice(i,1)}
 }
}

function update(dt){
 const L=LV[level],D=DF[cfg.diff];let sp=0;
 if(S.mode==='play'){
  const prog=Math.min(S.dist/L.len,1);sp=L.v*D.s*(1+.25*prog);
  const dir=keys.r-keys.l;S.dir+=(dir-S.dir)*Math.min(1,dt*12);
  S.p+=S.dir*3.2*cfg.sens*dt+S.drag;S.drag=0;
  S.dist+=sp*dt;S.t+=dt;
  if(S.dist-S.last>=L.sp*D.r&&S.dist<L.len-150){S.last=S.dist;spawn(-160)}
  moveObs(sp,dt);
  if(S.mode==='play'&&S.dist>=L.len)end(true);
  $('prog').style.width=(prog*100)+'%';$('pct').textContent=Math.floor(prog*100)+'%';
 }else if(S.mode==='menu'){sp=18;S.p+=dt*.25;S.drag=0}
 else S.drag=0;
 for(const r of rings){r.position.z+=sp*dt;if(r.position.z>6)r.position.z-=240}
 world.rotation.z=-Math.PI/2-S.p;
 S.shake*=Math.exp(-dt*(S.mode==='dead'?3:7));S.pulse*=Math.exp(-dt*6);S.tilt*=Math.exp(-dt*10);
 const sh=cfg.shake?S.shake:0;
 cam.position.set((Math.random()-.5)*sh,-1.6+(Math.random()-.5)*sh,5);
 cam.lookAt(0,-.8,-40);
 cam.fov=(innerWidth<innerHeight?88:74)+S.pulse*(cfg.shake?10:3)+sp/60*6;cam.updateProjectionMatrix();
 ship.rotation.z=-(S.dir+S.tilt)*.5;ship.scale.setScalar(1+S.pulse*.4);
}
let prev=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-prev)/1000,.05);prev=now;update(dt);renderer.render(scene,cam)}
function resize(){renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
addEventListener('resize',resize);addEventListener('orientationchange',resize);

// ---- Input ----
const keys={l:0,r:0};
addEventListener('keydown',e=>{const k=e.key.toLowerCase();
 if(k==='arrowleft'||k==='a')keys.l=1;else if(k==='arrowright'||k==='d')keys.r=1;
 else if((k===' '||k==='enter'||k==='r')&&S.mode==='dead'){e.preventDefault();start(level)}
 else if(k==='escape'&&S.mode==='play')toMenu()});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')keys.l=0;else if(k==='arrowright'||k==='d')keys.r=0});
const cv=$('c');let px=null;
cv.addEventListener('pointerdown',e=>{px=e.clientX;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(px===null)return;const dx=e.clientX-px;px=e.clientX;
 S.drag+=dx*.012*cfg.sens;S.tilt=Math.max(-1,Math.min(1,dx/8))});
['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,()=>px=null));
addEventListener('blur',()=>{keys.l=keys.r=0});

// ---- Menus ----
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!==id)}
function toMenu(){S.mode='menu';$('hud').hidden=true;ship.visible=false;build(180);showScreen('main')}
function drawLevels(){
 const dv=$('diffs');dv.innerHTML='';
 Object.keys(DF).forEach(d=>{const b=document.createElement('button');b.className='btn sm'+(d===cfg.diff?' on':'');b.textContent=d;
  b.onclick=()=>{cfg.diff=d;store.set('cfg',cfg);drawLevels()};dv.append(b)});
 const g=$('grid');g.innerHTML='';
 LV.forEach((L,i)=>{const b=document.createElement('button');b.className='btn lv';b.style.setProperty('--c','hsl('+L.h+',100%,60%)');
  b.innerHTML='<b>'+(i+1)+'</b><span>'+L.n+'</span><em>Best '+(best[i+'_'+cfg.diff]||0)+'%</em>';
  b.onclick=()=>{classic=false;start(i)};g.append(b)});
}
$('bClassic').onclick=()=>{classic=true;start(0)};
$('bLevels').onclick=()=>{drawLevels();showScreen('levels')};
$('bSet').onclick=()=>{$('sens').value=cfg.sens;$('shake').checked=cfg.shake;showScreen('settings')};
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>showScreen('main'));
$('sens').oninput=e=>{cfg.sens=+e.target.value;store.set('cfg',cfg)};
$('shake').onchange=e=>{cfg.shake=e.target.checked;store.set('cfg',cfg)};
$('reset').onclick=()=>{best={};store.set('best',best);$('reset').textContent='Scores cleared'};
$('retry').onclick=()=>start(level);
$('next').onclick=()=>start(level+1);
$('menu').onclick=toMenu;

// ---- PWA ----
let dp;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;$('install').hidden=false});
$('install').onclick=async()=>{if(!dp)return;dp.prompt();try{await dp.userChoice}catch(_){}dp=null;$('install').hidden=true};
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

resize();toMenu();requestAnimationFrame(frame);
