/* ===== BEL MARE v3.0 – APP LOGIC ===== */
const TR=360,LAT=54.1139,LON=15.7744;
const MPL=['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const EV26={'2026-04-03':'Wielki Piątek','2026-04-05':'Wielkanoc','2026-04-06':'Pon.Wielkanocny','2026-05-01':'1 Maja','2026-05-03':'3 Maja','2026-06-04':'Boże Ciało','2026-06-27':'Wakacje','2026-08-15':'15 Sierpnia','2026-08-31':'Koniec wakacji'};
const DEFUSERS=[{id:'admin',username:'admin',password:'belmare2026!',role:'admin',name:'Administrator'},{id:'op1',username:'operacja',password:'belmare2026!',role:'user',name:'Dział Operacyjny'},{id:'rec1',username:'recepcja',password:'belmare2026!',role:'viewer',name:'Recepcja'}];

let CU=null,CH={},calM=new Date().getMonth(),calY=new Date().getFullYear();
let pkgData=[],hskData=[],cancelData=[],rotbData=[];
let fPkg=[],fHsk=[];
let selFiles={pkg:null,hsk:null,cancel:null,rotb:null};
let history=[];

// ===== HELPERS =====
function fmtD(s){if(!s)return'';const p=s.split('-');return p[2]+'.'+p[1]+'.'+p[0];}
function fmtN(n){return(n||0).toLocaleString('pl-PL');}
function fmtPLN(n){return(n||0).toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})+' zł';}
function todStr(){return new Date().toISOString().slice(0,10);}
function dataRange(){if(!pkgData.length)return{min:'',max:''};const d=pkgData.map(r=>r.date).sort();return{min:d[0],max:d[d.length-1]};}

// ===== HISTORY =====
function loadHistory(){try{history=JSON.parse(localStorage.getItem('bm_hist')||'[]');}catch(e){history=[];}}
function saveHistory(){if(history.length>30)history=history.slice(-30);try{localStorage.setItem('bm_hist',JSON.stringify(history));}catch(e){history=history.slice(-10);try{localStorage.setItem('bm_hist',JSON.stringify(history));}catch(e2){}}}
function lastSnap(){return history.length?history[history.length-1]:null;}
function prevSnap(){return history.length>1?history[history.length-2]:null;}

function loadCurrentData(){
  const s=lastSnap();
  if(s){if(s.pkg&&s.pkg.length)pkgData=s.pkg;if(s.hsk&&s.hsk.length)hskData=s.hsk;if(s.cancel)cancelData=s.cancel;if(s.rotb&&s.rotb.length)rotbData=s.rotb;}
  if(!pkgData.length)pkgData=JSON.parse(JSON.stringify(S_PKG));
  if(!hskData.length)hskData=JSON.parse(JSON.stringify(S_HSK));
  if(!cancelData.length)cancelData=JSON.parse(JSON.stringify(S_CANCEL));
  if(!rotbData.length)rotbData=JSON.parse(JSON.stringify(S_ROTB));
}

// ===== DELTA =====
function calcDelta(cur,prev){
  if(!prev)return null;
  const d={rotbMonths:[],prevDate:prev.date,curDate:cur.date};
  const cr=cur.rotb||[],pr=prev.rotb||[];
  cr.forEach(cm=>{const pm=pr.find(m=>m.month===cm.month);const diff=cm.totalRooms-(pm?pm.totalRooms:0);const rd=cm.revenue-(pm?pm.revenue:0);if(diff||rd)d.rotbMonths.push({month:cm.month,rooms:cm.totalRooms,prev:pm?pm.totalRooms:0,diff,revDiff:rd});});
  d.totalRoomsDiff=cr.reduce((s,m)=>s+m.totalRooms,0)-pr.reduce((s,m)=>s+m.totalRooms,0);
  d.totalRevDiff=cr.reduce((s,m)=>s+m.revenue,0)-pr.reduce((s,m)=>s+m.revenue,0);
  d.occDiff=(cur.pkg||[]).reduce((s,r)=>s+r.occ,0)-(prev.pkg||[]).reduce((s,r)=>s+r.occ,0);
  d.mealsDiff=(cur.pkg||[]).reduce((s,r)=>s+r.bfk+r.din+r.lun+(r.wst||0),0)-(prev.pkg||[]).reduce((s,r)=>s+r.bfk+r.din+r.lun+(r.wst||0),0);
  d.cancelDiff=(cur.cancel||[]).length-(prev.cancel||[]).length;
  d.lossDiff=(cur.cancel||[]).reduce((s,c)=>s+(c.revLoss||0),0)-(prev.cancel||[]).reduce((s,c)=>s+(c.revLoss||0),0);
  return d;
}

function buildDeltaBanner(){
  const el=document.getElementById('deltaBanner');
  const d=calcDelta(lastSnap(),prevSnap());
  if(!d){el.innerHTML='';return;}
  const sign=v=>v>0?'+'+fmtN(v):fmtN(v);
  const cls=v=>v>0?'up':v<0?'dn':'';
  const signP=v=>v>0?'+'+fmtPLN(v):fmtPLN(v);
  let mdet='';d.rotbMonths.forEach(m=>{if(m.diff)mdet+=`<span class="${cls(m.diff)}">${m.month}: ${sign(m.diff)} pok.</span> `;});
  el.innerHTML=`<div class="delta-banner"><h3>📋 Zmiany: ${d.prevDate} → ${d.curDate}</h3><div class="dg">
    <div class="di"><div class="dl">ROTB razem</div><div class="dv ${cls(d.totalRoomsDiff)}">${sign(d.totalRoomsDiff)}</div><div class="dd">pokoi</div></div>
    <div class="di"><div class="dl">Revenue</div><div class="dv ${cls(d.totalRevDiff)}">${signP(d.totalRevDiff)}</div></div>
    <div class="di"><div class="dl">Obłożenie pkg</div><div class="dv ${cls(d.occDiff)}">${sign(d.occDiff)}</div><div class="dd">pokojo-dni</div></div>
    <div class="di"><div class="dl">Posiłki</div><div class="dv ${cls(d.mealsDiff)}">${sign(d.mealsDiff)}</div></div>
    <div class="di"><div class="dl">Anulacje</div><div class="dv ${cls(-d.cancelDiff)}">${d.cancelDiff>0?'+':''}${d.cancelDiff}</div></div>
  </div>${mdet?'<div style="margin-top:12px;font-size:12px">'+mdet+'</div>':''}</div>`;
}

// ===== AUTH =====
function getUsers(){let u=localStorage.getItem('bm_users');if(!u){localStorage.setItem('bm_users',JSON.stringify(DEFUSERS));return JSON.parse(JSON.stringify(DEFUSERS));}return JSON.parse(u);}
function saveUsers(u){localStorage.setItem('bm_users',JSON.stringify(u))}
function handleLogin(){const u=document.getElementById('loginUser').value.trim(),p=document.getElementById('loginPass').value,e=document.getElementById('loginError');if(!u||!p){e.textContent='Podaj login i hasło';return;}const f=getUsers().find(x=>x.username===u&&x.password===p);if(!f){e.textContent='Nieprawidłowy login lub hasło';return;}CU=f;sessionStorage.setItem('bm_cu',JSON.stringify(f));document.getElementById('loginOverlay').classList.add('hidden');initAfterLogin();}
function handleLogout(){sessionStorage.removeItem('bm_cu');CU=null;document.getElementById('loginOverlay').classList.remove('hidden');document.getElementById('loginUser').value='';document.getElementById('loginPass').value='';document.getElementById('loginError').textContent='';}
function checkSession(){const s=sessionStorage.getItem('bm_cu');if(s){CU=JSON.parse(s);document.getElementById('loginOverlay').classList.add('hidden');initAfterLogin();}}
function initAfterLogin(){document.getElementById('uName').textContent=CU.name;document.getElementById('uRole').textContent=CU.role==='admin'?'Administrator':CU.role==='user'?'Operator':'Podgląd';document.getElementById('uAv').textContent=CU.name.charAt(0);document.getElementById('navAdmin').style.display=CU.role==='admin'?'flex':'none';initDash();}

// ===== NAV =====
const TITLES={'dashboard':'📊 Dashboard','calendar':'📅 Kalendarz','occupancy':'🛏️ Obłożenie','rotb':'📈 Rooms on the Books','meals':'🍽️ Posiłki','hsk':'🧹 Housekeeping','arrivals':'🚗 Przyjazdy / Wyjazdy','cancellations':'❌ Anulacje','changes':'📋 Zmiany','import':'📤 Import','admin':'⚙️ Admin'};
document.querySelectorAll('.ni').forEach(n=>n.addEventListener('click',function(){const p=this.dataset.p;if(!p)return;document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.ni').forEach(x=>x.classList.remove('active'));document.getElementById('page-'+p).classList.add('active');this.classList.add('active');document.getElementById('pageTitle').textContent=TITLES[p]||p;document.getElementById('sidebar').classList.remove('open');if(p==='calendar')buildC<span class="cursor">█</span>