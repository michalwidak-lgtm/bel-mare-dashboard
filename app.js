var TR=360,LAT=54.1139,LON=15.7744;
var MPL=['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
var EV26={'2026-04-03':'Wielki Piątek','2026-04-05':'Wielkanoc','2026-04-06':'Pon.Wielkanocny','2026-05-01':'1 Maja','2026-05-03':'3 Maja','2026-06-04':'Boże Ciało','2026-06-27':'Wakacje','2026-08-15':'15 Sierpnia','2026-08-31':'Koniec wakacji'};
var DEFUSERS=[{id:'admin',username:'admin',role:'admin',name:'Administrator'},{id:'op1',username:'operacja',role:'user',name:'Dział Operacyjny'},{id:'rec1',username:'recepcja',role:'viewer',name:'Recepcja'}];
var CU=null,CH={},calM=new Date().getMonth(),calY=new Date().getFullYear();
var pkgData=[],hskData=[],cancelData=[],rotbData=[];
var fPkg=[],fHsk=[];
var selFiles={pkg:null,hsk:null,cancel:null,rotb:null};
var history=[];

function fmtD(s){if(!s)return'';var p=s.split('-');return p[2]+'.'+p[1]+'.'+p[0];}
function fmtN(n){return(n||0).toLocaleString('pl-PL');}
function fmtPLN(n){return(n||0).toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})+' zł';}
function todStr(){return new Date().toISOString().slice(0,10);}
function dataRange(){if(!pkgData.length)return{min:'',max:''};var d=pkgData.map(function(r){return r.date;}).sort();return{min:d[0],max:d[d.length-1]};}

function loadHistory(){try{history=JSON.parse(localStorage.getItem('bm_hist')||'[]');}catch(e){history=[];}}
function saveHistory(){if(history.length>30)history=history.slice(-30);try{localStorage.setItem('bm_hist',JSON.stringify(history));}catch(e){history=history.slice(-10);try{localStorage.setItem('bm_hist',JSON.stringify(history));}catch(e2){}}}
function lastSnap(){return history.length?history[history.length-1]:null;}
function prevSnap(){return history.length>1?history[history.length-2]:null;}

function loadCurrentData(){
  var s=lastSnap();
  if(s){if(s.pkg&&s.pkg.length)pkgData=s.pkg;if(s.hsk&&s.hsk.length)hskData=s.hsk;if(s.cancel)cancelData=s.cancel;if(s.rotb&&s.rotb.length)rotbData=s.rotb;}
  if(!pkgData.length)pkgData=JSON.parse(JSON.stringify(S_PKG));
  if(!hskData.length)hskData=JSON.parse(JSON.stringify(S_HSK));
  if(!cancelData.length)cancelData=JSON.parse(JSON.stringify(S_CANCEL));
  if(!rotbData.length)rotbData=JSON.parse(JSON.stringify(S_ROTB));
}

function calcDelta(cur,prev){
  if(!prev||!cur)return null;
  var d={rotbMonths:[],prevDate:prev.date||'?',curDate:cur.date||'?'};
  var cr=cur.rotb||[],pr=prev.rotb||[];
  for(var i=0;i<cr.length;i++){var cm=cr[i];var pm=null;for(var j=0;j<pr.length;j++){if(pr[j].month===cm.month){pm=pr[j];break;}}var diff=cm.totalRooms-(pm?pm.totalRooms:0);var rd=cm.revenue-(pm?pm.revenue:0);if(diff||rd)d.rotbMonths.push({month:cm.month,diff:diff,revDiff:rd});}
  var sumCur=0,sumPrev=0,revCur=0,revPrev=0;
  for(var i=0;i<cr.length;i++){sumCur+=cr[i].totalRooms;revCur+=cr[i].revenue;}
  for(var i=0;i<pr.length;i++){sumPrev+=pr[i].totalRooms;revPrev+=pr[i].revenue;}
  d.totalRoomsDiff=sumCur-sumPrev;d.totalRevDiff=revCur-revPrev;
  var occC=0,occP=0,meC=0,meP=0;
  var cp=cur.pkg||[],pp=prev.pkg||[];
  for(var i=0;i<cp.length;i++){occC+=cp[i].occ;meC+=cp[i].bfk+cp[i].din+cp[i].lun+(cp[i].wst||0);}
  for(var i=0;i<pp.length;i++){occP+=pp[i].occ;meP+=pp[i].bfk+pp[i].din+pp[i].lun+(pp[i].wst||0);}
  d.occDiff=occC-occP;d.mealsDiff=meC-meP;
  d.cancelDiff=(cur.cancel||[]).length-(prev.cancel||[]).length;
  return d;
}

function buildDeltaBanner(){
  var el=document.getElementById('deltaBanner');
  var d=calcDelta(lastSnap(),prevSnap());
  if(!d){el.innerHTML='';return;}
  var sign=function(v){return v>0?'+'+fmtN(v):fmtN(v);};
  var cls=function(v){return v>0?'up':v<0?'dn':'';};
  var mdet='';for(var i=0;i<d.rotbMonths.length;i++){var m=d.rotbMonths[i];if(m.diff)mdet+='<span class="'+cls(m.diff)+'">'+m.month+': '+sign(m.diff)+' pok.</span> ';}
  el.innerHTML='<div class="delta-banner"><h3>📋 Zmiany: '+d.prevDate+' → '+d.curDate+'</h3><div class="dg">'+
    '<div class="di"><div class="dl">ROTB razem</div><div class="dv '+cls(d.totalRoomsDiff)+'">'+sign(d.totalRoomsDiff)+'</div><div class="dd">pokoi</div></div>'+
    '<div class="di"><div class="dl">Revenue</div><div class="dv '+cls(d.totalRevDiff)+'">'+(d.totalRevDiff>0?'+':'')+fmtPLN(d.totalRevDiff)+'</div></div>'+
    '<div class="di"><div class="dl">Obłożenie</div><div class="dv '+cls(d.occDiff)+'">'+sign(d.occDiff)+'</div></div>'+
    '<div class="di"><div class="dl">Posiłki</div><div class="dv '+cls(d.mealsDiff)+'">'+sign(d.mealsDiff)+'</div></div>'+
    '<div class="di"><div class="dl">Anulacje</div><div class="dv">'+(d.cancelDiff>0?'+':'')+d.cancelDiff+'</div></div>'+
    '</div>'+(mdet?'<div style="margin-top:12px;font-size:12px">'+mdet+'</div>':'')+'</div>';
}

// AUTH - BEZ HASŁA
function getUsers(){var u=localStorage.getItem('bm_users');if(!u){localStorage.setItem('bm_users',JSON.stringify(DEFUSERS));return JSON.parse(JSON.stringify(DEFUSERS));}return JSON.parse(u);}
function saveUsers(u){localStorage.setItem('bm_users',JSON.stringify(u));}

function handleLogin(){
  var u=document.getElementById('loginUser').value.trim();
  var e=document.getElementById('loginError');
  if(!u){e.textContent='Wpisz login';return;}
  var f=null;var users=getUsers();
  for(var i=0;i<users.length;i++){if(users[i].username===u){f=users[i];break;}}
  if(!f){e.textContent='Nieznany login. Dostępne: admin, operacja, recepcja';return;}
  CU=f;sessionStorage.setItem('bm_cu',JSON.stringify(f));
  document.getElementById('loginOverlay').classList.add('hidden');
  initAfterLogin();
}

function handleLogout(){sessionStorage.removeItem('bm_cu');CU=null;document.getElementById('loginOverlay').classList.remove('hidden');document.getElementById('loginUser').value='';document.getElementById('loginError').textContent='';}

function checkSession(){var s=sessionStorage.getItem('bm_cu');if(s){CU=JSON.parse(s);document.getElementById('loginOverlay').classList.add('hidden');initAfterLogin();}}

function initAfterLogin(){
  document.getElementById('uName').textContent=CU.name;
  document.getElementById('uRole').textContent=CU.role==='admin'?'Administrator':CU.role==='user'?'Operator':'Podgląd';
  document.getElementById('uAv').textContent=CU.name.charAt(0);
  document.getElementById('navAdmin').style.display=CU.role==='admin'?'flex':'none';
  initDash();
}

// NAV
var TITLES={'dashboard':'📊 Dashboard','calendar':'📅 Kalendarz','occupancy':'🛏️ Obłożenie','rotb':'📈 Rooms on the Books','meals':'🍽️ Posiłki','hsk':'🧹 Housekeeping','arrivals':'🚗 Przyjazdy / Wyjazdy','cancellations':'❌ Anulacje','changes':'📋 Zmiany','import':'📤 Import','admin':'⚙️ Admin'};
var navItems=document.querySelectorAll('.ni');
for(var i=0;i<navItems.length;i++){
  navItems[i].addEventListener('click',function(){
    var p=this.dataset.p;if(!p)return;
    var pages=document.querySelectorAll('.page');for(var j=0;j<pages.length;j++)pages[j].classList.remove('active');
    var nis=document.querySelectorAll('.ni');for(var j=0;j<nis.length;j++)nis[j].classList.remove('active');
    document.getElementById('page-'+p).classList.add('active');this.classList.add('active');
    document.getElementById('pageTitle').textContent=TITLES[p]||p;
    document.getElementById('sidebar').classList.remove('open');
    if(p==='calendar')buildCal();if(p==='admin')buildAdmin();if(p==='changes')buildChanges();
  });
}

// FILTER
function initFilters(){
  var r=dataRange();if(!r.min)return;
  var suf=['','O','M','H','A'];
  for(var i=0;i<suf.length;i++){var f=document.getElementById('fFrom'+suf[i]),t=document.getElementById('fTo'+suf[i]);if(f&&t){f.min=r.min;f.max=r.max;t.min=r.min;t.max=r.max;f.value=r.min;t.value=r.max;}}
  applyFilter();
}

function applyFilter(){
  var from=document.getElementById('fFrom').value,to=document.getElementById('fTo').value;
  var suf=['O','M','H','A'];
  for(var i=0;i<suf.length;i++){var f=document.getElementById('fFrom'+suf[i]),t=document.getElementById('fTo'+suf[i]);if(f&&t){f.value=from;t.value=to;}}
  if(!from||!to)return;
  fPkg=[];for(var i=0;i<pkgData.length;i++){if(pkgData[i].date>=from&&pkgData[i].date<=to)fPkg.push(pkgData[i]);}
  fHsk=[];for(var i=0;i<hskData.length;i++){if(hskData[i].date>=from&&hskData[i].date<=to)fHsk.push(hskData[i]);}
  var info=fPkg.length+' dni ('+fmtD(from)+' – '+fmtD(to)+')';
  var allSuf=['','O','M','H','A'];
  for(var i=0;i<allSuf.length;i++){var e=document.getElementById('fInfo'+allSuf[i]);if(e)e.textContent=info;}
  rebuildAll();
}

function preset(t,s){
  var td=todStr(),r=dataRange();var f=r.min,to=r.max;
  if(t==='today'){f=to=td;}
  else if(t==='tomorrow'){var d=new Date();d.setDate(d.getDate()+1);f=to=d.toISOString().slice(0,10);}
  else if(t==='week'){f=td;var d=new Date();d.setDate(d.getDate()+6);to=d.toISOString().slice(0,10);}
  else if(t==='2w'){f=td;var d=new Date();d.setDate(d.getDate()+13);to=d.toISOString().slice(0,10);}
  else if(t==='month'){f=td;var d=new Date();d.setDate(d.getDate()+29);to=d.toISOString().slice(0,10);}
  if(f<r.min)f=r.min;if(to>r.max)to=r.max;if(f>to)f=to;
  var suf=['','O','M','H','A'];
  for(var i=0;i<suf.length;i++){var a=document.getElementById('fFrom'+suf[i]),b=document.getElementById('fTo'+suf[i]);if(a&&b){a.value=f;b.value=to;}}
  applyFilter();
}

// KPI
function buildKPI(){
  var d=fPkg,h=fHsk;
  if(!d.length){document.getElementById('kpiGrid').innerHTML='<p style="color:#94a3b8;grid-column:1/-1;text-align:center;padding:40px">Brak danych</p>';return;}
  var td=todStr(),t=null;for(var i=0;i<d.length;i++){if(d[i].date===td){t=d[i];break;}}if(!t)t=d[0];
  var th=null;for(var i=0;i<h.length;i++){if(h[i].date===td){th=h[i];break;}}if(!th&&h.length)th=h[0];if(!th)th={morn:0,arr:0,dep:0};
  var peak=d[0];for(var i=1;i<d.length;i++){if(d[i].occ>peak.occ)peak=d[i];}
  var totLoss=0;for(var i=0;i<cancelData.length;i++)totLoss+=cancelData[i].revLoss||0;
  var totRotb=0,totRev=0;for(var i=0;i<rotbData.length;i++){totRotb+=rotbData[i].totalRooms;totRev+=rotbData[i].revenue;}
  var hskT=(th.morn||0)+(th.arr||0)+(th.dep||0);
  document.getElementById('kpiGrid').innerHTML=
    '<div class="kc blue"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">PRZYJAZDY</div><div class="ks">Arr. Rooms</div><div class="kv">'+t.arrR+'</div><div class="kd">'+t.arrP+' osób · '+fmtD(t.date)+'</div></div>'+
    '<div class="kc blue"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">WYJAZDY</div><div class="ks">Dep. Rooms</div><div class="kv">'+t.depR+'</div><div class="kd">'+t.depP+' osób</div></div>'+
    '<div class="kc green"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">POKOJE DZIŚ</div><div class="ks">Rooms tonight</div><div class="kv">'+t.occ+'</div><div class="kd">'+(t.occ/TR*100).toFixed(1)+'% z '+TR+'</div></div>'+
    '<div class="kc purple"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">GOŚCIE</div><div class="ks">Adults+Children</div><div class="kv">'+(t.adu+t.ch)+'</div><div class="kd">'+t.adu+' dor. · '+t.ch+' dz.</div></div>'+
    '<div class="kc orange"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">POSIŁKI</div><div class="ks">BFK+LUN+DIN</div><div class="kv">'+(t.bfk+t.lun+t.din)+'</div><div class="kd">Śn:'+t.bfk+' Ob:'+t.lun+' Kol:'+t.din+'</div></div>'+
    '<div class="kc red"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">HSK</div><div class="ks">Do sprzątania</div><div class="kv">'+hskT+'</div><div class="kd">Por:'+th.morn+' Prz:'+th.arr+' Wyj:'+th.dep+'</div></div>'+
    '<div class="kc teal"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">ROTB TOTAL</div><div class="ks">Wszystkie miesiące</div><div class="kv">'+fmtN(totRotb)+'</div><div class="kd">Rev: '+(totRev/1e6).toFixed(2)+'M zł</div></div>'+
    '<div class="kc pink"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">ANULACJE</div><div class="ks">Revenue Loss</div><div class="kv">'+cancelData.length+'</div><div class="kd">'+fmtPLN(totLoss)+'</div></div>';
}

// MONTH SUMMARY
function buildMonthSummary(){
  var el=document.getElementById('monthSummary');
  if(!rotbData.length){el.innerHTML='';return;}
  var prev=prevSnap();var prevR=prev?prev.rotb:null;
  var peak=rotbData[0];for(var i=1;i<rotbData.length;i++){if(rotbData[i].totalRooms>peak.totalRooms)peak=rotbData[i];}
  var h='';
  for(var i=0;i<rotbData.length;i++){
    var m=rotbData[i];var isPeak=m===peak&&m.totalRooms>0;var isEmpty=m.totalRooms===0;
    var deltaH='';
    if(prevR){var pm=null;for(var j=0;j<prevR.length;j++){if(prevR[j].month===m.month){pm=prevR[j];break;}}var diff=m.totalRooms-(pm?pm.totalRooms:0);if(diff!==0)deltaH='<div class="delta"><span class="'+(diff>0?'plus':'minus')+'">'+(diff>0?'▲ +':'▼ ')+Math.abs(diff)+' pok.</span></div>';}
    var lyD=(m.occPct-m.lyOccPct).toFixed(1);
    h+='<div class="ms-card'+(isPeak?' peak':'')+(isEmpty?' empty':'')+'"><h4>'+m.month+'</h4><div class="big">'+fmtN(m.totalRooms)+'</div><div class="meta">Occ: <strong>'+m.occPct+'%</strong> <span class="'+(lyD>=0?'up':'dn')+'">('+( lyD>=0?'+':'')+lyD+'pp vs LY '+m.lyOccPct+'%)</span><br>Rev: <strong>'+(m.revenue>0?fmtPLN(m.revenue):'–')+'</strong><br>ADR: <strong>'+(m.adr>0?fmtPLN(m.adr):'–')+'</strong></div>'+deltaH+'</div>';
  }
  el.innerHTML=h;
}

// CHARTS
function dc(id){if(CH[id]){CH[id].destroy();delete CH[id];}}

function buildDashCharts(){
  var d=fPkg;if(!d.length)return;
  var lb=[];for(var i=0;i<d.length;i++)lb.push(d[i].date.slice(5).replace('-','.'));
  var occD=[];var limD=[];for(var i=0;i<d.length;i++){occD.push(d[i].occ);limD.push(TR);}
  dc('chOcc');CH.chOcc=new Chart(document.getElementById('chOcc'),{type:'line',data:{labels:lb,datasets:[{label:'Pokoje',data:occD,borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.1)',fill:true,tension:.3,pointRadius:2},{label:'360',data:limD,borderColor:'#ef4444',borderDash:[5,5],pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,max:TR+20}}}});

  var bD=[],dD=[],lD=[],wD=[];for(var i=0;i<d.length;i++){bD.push(d[i].bfk);dD.push(d[i].din);lD.push(d[i].lun);wD.push(d[i].wst||0);}
  dc('chMeals');CH.chMeals=new Chart(document.getElementById('chMeals'),{type:'bar',data:{labels:lb,datasets:[{label:'Śniadania',data:bD,backgroundColor:'#f59e0b'},{label:'Kolacje',data:dD,backgroundColor:'#8b5cf6'},{label:'Obiady',data:lD,backgroundColor:'#10b981'},{label:'Wstawki',data:wD,backgroundColor:'#ec4899'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}}}});

  var aD=[],cD=[];for(var i=0;i<d.length;i++){aD.push(d[i].adu);cD.push(d[i].ch);}
  dc('chGuests');CH.chGuests=new Chart(document.getElementById('chGuests'),{type:'line',data:{labels:lb,datasets:[{label:'Dorośli',data:aD,borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.08)',fill:true,tension:.3,pointRadius:2},{label:'Dzieci',data:cD,borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,.08)',fill:true,tension:.3,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true}}}});

  if(rotbData.length){
    var am=[],ml=[];for(var i=0;i<rotbData.length;i++){if(rotbData[i].totalRooms>0||rotbData[i].lyOccPct>0){am.push(rotbData[i]);ml.push(rotbData[i].month.split(' ')[0]);}}
    var oD=[],lyD=[],rD=[];for(var i=0;i<am.length;i++){oD.push(am[i].occPct);lyD.push(am[i].lyOccPct);rD.push(am[i].totalRooms);}
    dc('chRotbD');CH.chRotbD=new Chart(document.getElementById('chRotbD'),{type:'bar',data:{labels:ml,datasets:[{label:'Occ%',data:oD,backgroundColor:'rgba(37,99,235,.7)'},{label:'LY%',data:lyD,backgroundColor:'rgba(239,68,68,.3)'},{type:'line',label:'Pokoje',data:rD,borderColor:'#10b981',yAxisID:'y1',tension:.3,pointRadius:4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,max:100},y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false}}}}});
  }
}

function buildSubPages(){
  var d=fPkg,h=fHsk,td=todStr();if(!d.length)return;
  var lb=[];for(var i=0;i<d.length;i++)lb.push(d[i].date.slice(5).replace('-','.'));

  // OCC
  var occP=[],occR=[];for(var i=0;i<d.length;i++){occP.push((d[i].occ/TR*100).toFixed(1));occR.push(d[i].occ);}
  dc('chOccD');CH.chOccD=new Chart(document.getElementById('chOccD'),{type:'bar',data:{labels:lb,datasets:[{type:'line',label:'%',data:occP,borderColor:'#ef4444',yAxisID:'y1',pointRadius:2,tension:.3,fill:false},{label:'Pokoje',data:occR,backgroundColor:'rgba(37,99,235,.6)',yAxisID:'y'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,max:TR+20},y1:{position:'right',min:0,max:110,grid:{drawOnChartArea:false}}}}});
  var t='<table><thead><tr><th>Data</th><th>Dzień</th><th>Pokoje</th><th>%</th><th>Dorośli</th><th>Dzieci</th><th>Prz.Pok</th><th>Wyj.Pok</th></tr></thead><tbody>';
  for(var i=0;i<d.length;i++){var r=d[i];var c=r.date===td?'today':(r.day==='Sob.'||r.day==='Niedz.')?'wknd':'';t+='<tr class="'+c+'"><td>'+r.date.slice(5).replace('-','.')+'</td><td>'+r.day+'</td><td class="num"><strong>'+r.occ+'</strong></td><td class="num">'+(r.occ/TR*100).toFixed(1)+'%</td><td class="num">'+r.adu+'</td><td class="num">'+r.ch+'</td><td class="num">'+r.arrR+'</td><td class="num">'+r.depR+'</td></tr>';}
  t+='</tbody></table>';document.getElementById('tblOcc').innerHTML=t;

  // MEALS
  var bD=[],dD=[],lD=[],wD=[];for(var i=0;i<d.length;i++){bD.push(d[i].bfk);dD.push(d[i].din);lD.push(d[i].lun);wD.push(d[i].wst||0);}
  dc('chMD');CH.chMD=new Chart(document.getElementById('chMD'),{type:'line',data:{labels:lb,datasets:[{label:'Śniadania',data:bD,borderColor:'#f59e0b',tension:.3,pointRadius:2},{label:'Kolacje',data:dD,borderColor:'#8b5cf6',tension:.3,pointRadius:2},{label:'Obiady',data:lD,borderColor:'#10b981',tension:.3,pointRadius:2},{label:'Wstawki',data:wD,borderColor:'#ec4899',tension:.3,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true}}}});
  var totD=[];for(var i=0;i<d.length;i++)totD.push(d[i].bfk+d[i].din+d[i].lun+(d[i].wst||0));
  dc('chMT');CH.chMT=new Chart(document.getElementById('chMT'),{type:'bar',data:{labels:lb,datasets:[{label:'Łącznie',data:totD,backgroundColor:'rgba(99,102,241,.6)'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
  t='<table><thead><tr><th>Data</th><th>Dzień</th><th>Śniadania</th><th>Kolacje</th><th>Obiady</th><th>Wstawki</th><th>Razem</th></tr></thead><tbody>';
  for(var i=0;i<d.length;i++){var r=d[i];var tot=r.bfk+r.din+r.lun+(r.wst||0);var c=r.date===td?'today':(r.day==='Sob.'||r.day==='Niedz.')?'wknd':'';t+='<tr class="'+c+'"><td>'+r.date.slice(5).replace('-','.')+'</td><td>'+r.day+'</td><td class="num">'+r.bfk+'</td><td class="num">'+r.din+'</td><td class="num">'+r.lun+'</td><td class="num">'+(r.wst||0)+'</td><td class="num"><strong>'+tot+'</strong></td></tr>';}
  t+='</tbody></table>';document.getElementById('tblMeals').innerHTML=t;

  // HSK
  if(h.length){
    var hl=[];for(var i=0;i<h.length;i++)hl.push(h[i].date.slice(5).replace('-','.'));
    var mD=[],aD=[],dpD=[],eD=[];for(var i=0;i<h.length;i++){mD.push(h[i].morn);aD.push(h[i].arr);dpD.push(h[i].dep);eD.push(h[i].eve);}
    dc('chHD');CH.chHD=new Chart(document.getElementById('chHD'),{type:'bar',data:{labels:hl,datasets:[{label:'Poranne',data:mD,backgroundColor:'#60a5fa'},{label:'Przyjazdy',data:aD,backgroundColor:'#34d399'},{label:'Wyjazdy',data:dpD,backgroundColor:'#f87171'},{type:'line',label:'Wieczorne',data:eD,borderColor:'#8b5cf6',pointRadius:2,tension:.3,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true}}}});
    t='<table><thead><tr><th>Data</th><th>Dzień</th><th>Goście</th><th>Poranne</th><th>Przyjazdy</th><th>Wyjazdy</th><th>Wieczorne</th><th>Σ sprz.</th></tr></thead><tbody>';
    for(var i=0;i<h.length;i++){var r=h[i];var c=r.date===td?'today':(r.day==='Sob.'||r.day==='Niedz.')?'wknd':'';t+='<tr class="'+c+'"><td>'+r.date.slice(5).replace('-','.')+'</td><td>'+r.day+'</td><td class="num">'+r.guests+'</td><td class="num">'+r.morn+'</td><td class="num">'+r.arr+'</td><td class="num">'+r.dep+'</td><td class="num">'+r.eve+'</td><td class="num"><strong>'+(r.morn+r.arr+r.dep)+'</strong></td></tr>';}
    t+='</tbody></table>';document.getElementById('tblHsk').innerHTML=t;
  }

  // ARRIVALS
  var arrD=[],depD=[];for(var i=0;i<d.length;i++){arrD.push(d[i].arrR);depD.push(-d[i].depR);}
  dc('chArr');CH.chArr=new Chart(document.getElementById('chArr'),{type:'bar',data:{labels:lb,datasets:[{label:'Przyjazdy',data:arrD,backgroundColor:'#34d399'},{label:'Wyjazdy',data:depD,backgroundColor:'#f87171'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
  t='<table><thead><tr><th>Data</th><th>Dzień</th><th>Prz.Pok</th><th>Prz.Os</th><th>Wyj.Pok</th><th>Wyj.Os</th><th>Bilans</th></tr></thead><tbody>';
  for(var i=0;i<d.length;i++){var r=d[i];var b=r.arrR-r.depR;var c=r.date===td?'today':(r.day==='Sob.'||r.day==='Niedz.')?'wknd':'';t+='<tr class="'+c+'"><td>'+r.date.slice(5).replace('-','.')+'</td><td>'+r.day+'</td><td class="num">'+r.arrR+'</td><td class="num">'+r.arrP+'</td><td class="num">'+r.depR+'</td><td class="num">'+r.depP+'</td><td class="num" style="color:'+(b>0?'var(--ok)':b<0?'var(--err)':'inherit')+';font-weight:600">'+(b>0?'+':'')+b+'</td></tr>';}
  t+='</tbody></table>';document.getElementById('tblArr').innerHTML=t;

  // CANCEL
  var cd=cancelData;var tLoss=0,tNts=0;for(var i=0;i<cd.length;i++){tLoss+=cd[i].revLoss||0;tNts+=cd[i].nts||0;}
  var reasons={};for(var i=0;i<cd.length;i++){var rr=cd[i].reason||'?';reasons[rr]=(reasons[rr]||0)+1;}
  var rStr='';for(var k in reasons)rStr+=k+':'+reasons[k]+' ';
  document.getElementById('cancelKpi').innerHTML=
    '<div class="kc red"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">ANULACJE</div><div class="kv">'+cd.length+'</div><div class="kd">'+tNts+' nocy</div></div>'+
    '<div class="kc orange"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">REVENUE LOSS</div><div class="kv">'+fmtPLN(tLoss)+'</div><div class="kd">Śr. '+(cd.length?fmtPLN(tLoss/cd.length):'-')+'</div></div>'+
    '<div class="kc purple"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">POWODY</div><div class="kv">'+Object.keys(reasons).length+'</div><div class="kd">'+rStr+'</div></div>';
  t='<table><thead><tr><th>#</th><th>Nr</th><th>Nazwisko</th><th>Typ</th><th>Przyjazd</th><th>Noce</th><th>Rate</th><th>Rev Loss</th><th>Powód</th><th>Opis</th></tr></thead><tbody>';
  for(var i=0;i<cd.length;i++){var c=cd[i];t+='<tr><td>'+(i+1)+'</td><td>'+c.confNo+'</td><td>'+c.name+'</td><td><span class="pill pill-b">'+c.roomType+'</span></td><td>'+c.arrDate+'</td><td class="num">'+c.nts+'</td><td>'+c.rate+'</td><td class="num" style="color:var(--err);font-weight:600">'+fmtPLN(c.revLoss||0)+'</td><td><span class="pill pill-o">'+c.reason+'</span></td><td style="white-space:normal;max-width:180px;font-size:11px">'+(c.reasonDesc||'-')+'</td></tr>';}
  if(cd.length)t+='<tr style="font-weight:700;background:#f1f5f9"><td colspan="7">RAZEM</td><td class="num" style="color:var(--err)">'+fmtPLN(tLoss)+'</td><td colspan="2"></td></tr>';
  t+='</tbody></table>';document.getElementById('tblCancel').innerHTML=t;

  // ROTB
  buildRotbPage();
}

function buildRotbPage(){
  var d=rotbData;if(!d.length)return;
  var totR=0,totRev=0;for(var i=0;i<d.length;i++){totR+=d[i].totalRooms;totRev+=d[i].revenue;}
  var adrArr=[];for(var i=0;i<d.length;i++){if(d[i].adr>0)adrArr.push(d[i].adr);}
  var adr=adrArr.length?adrArr.reduce(function(a,b){return a+b;},0)/adrArr.length:0;
  var peak=d[0];for(var i=1;i<d.length;i++){if(d[i].totalRooms>peak.totalRooms)peak=d[i];}
  document.getElementById('rotbKpi').innerHTML=
    '<div class="kc blue"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">RAZEM OTB</div><div class="kv">'+fmtN(totR)+'</div><div class="kd">pokoi</div></div>'+
    '<div class="kc green"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">REVENUE</div><div class="kv">'+(totRev/1e6).toFixed(2)+'M</div><div class="kd">'+fmtPLN(totRev)+'</div></div>'+
    '<div class="kc orange"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">ŚR. ADR</div><div class="kv">'+adr.toFixed(0)+' zł</div></div>'+
    '<div class="kc red"><button class="pb" onclick="printCard(this)">🖨️</button><div class="kt">PEAK</div><div class="kv">'+fmtN(peak.totalRooms)+'</div><div class="kd">'+peak.month+'</div></div>';

  // ROTB cards
  var prev=prevSnap();var prevR=prev?prev.rotb:null;
  var cards='';
  for(var i=0;i<d.length;i++){
    var m=d[i];var deltaH='';
    if(prevR){var pm=null;for(var j=0;j<prevR.length;j++){if(prevR[j].month===m.month){pm=prevR[j];break;}}var diff=m.totalRooms-(pm?pm.totalRooms:0);if(diff!==0)deltaH='<div class="delta"><span class="'+(diff>0?'plus':'minus')+'">'+(diff>0?'▲ +':'▼ ')+Math.abs(diff)+' pok.</span></div>';}
    var lyD=(m.occPct-m.lyOccPct).toFixed(1);
    cards+='<div class="ms-card'+(m===peak?' peak':'')+(m.totalRooms===0?' empty':'')+'"><h4>'+m.month+'</h4><div class="big">'+fmtN(m.totalRooms)+'</div><div class="meta">Occ: <strong>'+m.occPct+'%</strong> <span class="'+(lyD>=0?'up':'dn')+'">('+( lyD>=0?'+':'')+lyD+'pp vs LY)</span><br>Rev: <strong>'+(m.revenue>0?fmtPLN(m.revenue):'–')+'</strong></div>'+deltaH+'</div>';
  }
  document.getElementById('rotbCards').innerHTML=cards;

  // Charts
  var am=[],ml=[];for(var i=0;i<d.length;i++){if(d[i].totalRooms>0||d[i].lyOccPct>0){am.push(d[i]);ml.push(d[i].month.split(' ')[0]);}}
  var oD=[],lyD2=[],rD=[],revD=[],adrD=[];
  for(var i=0;i<am.length;i++){oD.push(am[i].occPct);lyD2.push(am[i].lyOccPct);rD.push(am[i].totalRooms);revD.push(am[i].revenue);adrD.push(am[i].adr);}
  dc('chRotb');CH.chRotb=new Chart(document.getElementById('chRotb'),{type:'bar',data:{labels:ml,datasets:[{label:'Occ%',data:oD,backgroundColor:'rgba(37,99,235,.7)'},{label:'LY%',data:lyD2,backgroundColor:'rgba(239,68,68,.3)'},{type:'line',label:'Pokoje',data:rD,borderColor:'#10b981',yAxisID:'y1',tension:.3,pointRadius:4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,max:100},y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false}}}}});
  dc('chRev');CH.chRev=new Chart(document.getElementById('chRev'),{type:'bar',data:{labels:ml,datasets:[{label:'Revenue',data:revD,backgroundColor:'rgba(16,185,129,.6)'},{type:'line',label:'ADR',data:adrD,borderColor:'#f59e0b',yAxisID:'y1',tension:.3,pointRadius:4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,ticks:{callback:function(v){return(v/1e6).toFixed(1)+'M';}}},y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false}}}}});

  // Table
  var t='<table><thead><tr><th>Miesiąc</th><th>Pokoje OTB</th><th>Occ %</th><th>LY %</th><th>Δ pp</th><th>Revenue</th><th>ADR</th></tr></thead><tbody>';
  for(var i=0;i<d.length;i++){var m=d[i];var diff=(m.occPct-m.lyOccPct).toFixed(1);t+='<tr><td><strong>'+m.month+'</strong></td><td class="num">'+fmtN(m.totalRooms)+'</td><td class="num">'+m.occPct+'%</td><td class="num">'+m.lyOccPct+'%</td><td class="num" style="color:'+(diff>=0?'var(--ok)':'var(--err)')+';font-weight:600">'+(diff>=0?'+':'')+diff+'</td><td class="num">'+fmtPLN(m.revenue)+'</td><td class="num">'+(m.adr>0?fmtPLN(m.adr):'–')+'</td></tr>';}
  t+='<tr style="font-weight:700;background:#f1f5f9"><td>RAZEM</td><td class="num">'+fmtN(totR)+'</td><td colspan="3"></td><td class="num">'+fmtPLN(totRev)+'</td><td></td></tr></tbody></table>';
  document.getElementById('tblRotb').innerHTML=t;
}

// CHANGES
function buildChanges(){
  var el=document.getElementById('changesContent');
  if(history.length<2){el.innerHTML='<div class="alm"><div style="font-size:48px;margin-bottom:16px">📋</div><h3>Brak danych do porównania</h3><p style="margin-top:8px">Potrzebujesz min. 2 importów.</p></div>';return;}
  var h='<div class="acard"><h3>📜 Historia ('+history.length+' importów)</h3>';
  for(var i=history.length-1;i>=0;i--){
    var s=history[i];var prev=i>0?history[i-1]:null;
    var d=calcDelta(s,prev);
    var sign=function(v){return v>0?'<span class="up">+'+fmtN(v)+'</span>':v<0?'<span class="dn">'+fmtN(v)+'</span>':'0';};
    h+='<div style="padding:16px;border-bottom:1px solid #f1f5f9;'+(i===history.length-1?'background:#eff6ff':'')+'"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong>'+s.date+(i===history.length-1?' <span class="pill pill-b">AKTUALNY</span>':'')+'</strong><span style="font-size:11px;color:#94a3b8">'+new Date(s.ts).toLocaleString('pl-PL')+'</span></div>';
    if(d){
      h+='<div style="display:flex;gap:20px;flex-wrap:wrap;font-size:12px">'+
        '<span>ROTB: '+sign(d.totalRoomsDiff)+' pok.</span>'+
        '<span>Pkg occ: '+sign(d.occDiff)+'</span>'+
        '<span>Posiłki: '+sign(d.mealsDiff)+'</span>'+
        '<span>Anulacje: '+(d.cancelDiff>0?'+':'')+d.cancelDiff+'</span></div>';
      if(d.rotbMonths.length){h+='<div style="margin-top:6px;font-size:11px;color:#64748b">';for(var j=0;j<d.rotbMonths.length;j++){var m=d.rotbMonths[j];h+='<span style="margin-right:12px">'+m.month+': '+sign(m.diff)+' pok.</span>';}h+='</div>';}
    } else {h+='<div style="font-size:12px;color:#94a3b8">Pierwszy import</div>';}
    h+='</div>';
  }
  h+='</div>';el.innerHTML=h;
}

// CALENDAR
function buildCal(){
  var g=document.getElementById('calGrid');
  document.getElementById('calLabel').textContent=MPL[calM]+' '+calY;
  var fd=new Date(calY,calM,1);var sd=fd.getDay();if(sd===0)sd=7;sd--;
  var dim=new Date(calY,calM+1,0).getDate();var td=todStr();
  var prev=prevSnap();var prevR=prev?prev.rotb:null;
  var rm=null;for(var i=0;i<rotbData.length;i++){if(rotbData[i].monthIdx===calM&&rotbData[i].year===calY){rm=rotbData[i];break;}}
  var prm=null;if(prevR){for(var i=0;i<prevR.length;i++){if(prevR[i].monthIdx===calM&&prevR[i].year===calY){prm=prevR[i];break;}}}

  var hd=['Pon','Wt','Śr','Czw','Pt','Sob','Ndz'];var html='';for(var i=0;i<hd.length;i++)html+='<div class="calh">'+hd[i]+'</div>';
  var pdim=new Date(calY,calM,0).getDate();
  for(var i=sd-1;i>=0;i--)html+='<div class="cald om"><div class="dnum">'+(pdim-i)+'</div></div>';
  for(var day=1;day<=dim;day++){
    var ds=calY+'-'+String(calM+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    var it=ds===td;var ev=EV26[ds];
    var rooms=0;
    var pk=null;for(var i=0;i<pkgData.length;i++){if(pkgData[i].date===ds){pk=pkgData[i];break;}}
    if(pk)rooms=pk.occ;
    else if(rm&&rm.daily&&rm.daily[day-1]>0)rooms=rm
