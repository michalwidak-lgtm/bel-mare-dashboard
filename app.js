/* ===== BEL MARE v3.0 - APP LOGIC ===== */
var TR=360,LAT=54.1139,LON=15.7744;
var MPL=['Styczen','Luty','Marzec','Kwiecien','Maj','Czerwiec','Lipiec','Sierpien','Wrzesien','Pazdziernik','Listopad','Grudzien'];
var EV26={'2026-04-03':'Wielki Piatek','2026-04-05':'Wielkanoc','2026-04-06':'Pon.Wielkanocny','2026-05-01':'1 Maja','2026-05-03':'3 Maja','2026-06-04':'Boze Cialo','2026-06-27':'Wakacje','2026-08-15':'15 Sierpnia','2026-08-31':'Koniec wakacji'};
var DEFUSERS=[{id:'admin',username:'admin',role:'admin',name:'Administrator'},{id:'op1',username:'operacja',role:'user',name:'Dzial Operacyjny'},{id:'rec1',username:'recepcja',role:'viewer',name:'Recepcja'}];

var CU=null,CH={},calM=new Date().getMonth(),calY=new Date().getFullYear();
var pkgData=[],hskData=[],cancelData=[],rotbData=[];
var fPkg=[],fHsk=[];
var selFiles={pkg:null,hsk:null,cancel:null,rotb:null};
var history=[];

function fmtD(s){if(!s)return'';var p=s.split('-');return p[2]+'.'+p[1]+'.'+p[0];}
function fmtN(n){return(n||0).toLocaleString('pl-PL');}
function fmtPLN(n){return(n||0).toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})+' zl';}
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
  el.innerHTML='<div class="delta-banner"><h3>Zmiany: '+d.prevDate+' -> '+d.curDate+'</h3><div class="dg">'+
    '<div class="di"><div class="dl">ROTB razem</div><div class="dv '+cls(d.totalRoomsDiff)+'">'+sign(d.totalRoomsDiff)+'</div><div class="dd">pokoi</div></div>'+
    '<div class="di"><div class="dl">Revenue</div><div class="dv '+cls(d.totalRevDiff)+'">'+(d.totalRevDiff>0?'+':'')+fmtPLN(d.totalRevDiff)+'</div></div>'+
    '<div class="di"><div class="dl">Oblozenie</div><div class="dv '+cls(d.occDiff)+'">'+sign(d.occDiff)+'</div></div>'+
    '<div class="di"><div class="dl">Posilki</div><div class="dv '+cls(d.mealsDiff)+'">'+sign(d.mealsDiff)+'</div></div>'+
    '<div class="di"><div class="dl">Anulacje</div><div class="dv">'+(d.cancelDiff>0?'+':'')+d.cancelDiff+'</div></div>'+
    '</div>'+(mdet?'<div style="margin-top:12px;font-size:12px">'+mdet+'</div>':'')+'</div>';
}

/* AUTH - BEZ HASLA */
function getUsers(){var u=localStorage.getItem('bm_users');if(!u){localStorage.setItem('bm_users',JSON.stringify(DEFUSERS));return JSON.parse(JSON.stringify(DEFUSERS));}return JSON.parse(u);}
function saveUsers(u){localStorage.setItem('bm_users',JSON.stringify(u));}

function handleLogin(){
  var u=document.getElementById('loginUser').value.trim();
  var e=document.getElementById('loginError');
  if(!u){e.textContent='Wpisz login';return;}
  var f=null;var users=getUsers();
  for(var i=0;i<users.length;i++){if(users[i].username===u){f=users[i];break;}}
  if(!f){e.textContent='Nieznany login. Dostepne: admin, operacja, recepcja';return;}
  CU=f;sessionStorage.setItem('bm_cu',JSON.stringify(f));
  document.getElementById('loginOverlay').classList.add('hidden');
  initAfterLogin();
}

function handleLogout(){sessionStorage.removeItem('bm_cu');CU=null;document.getElementById('loginOverlay').classList.remove('hidden');document.getElementById('loginUser').value='';document.getElementById('loginError').textContent='';}

function checkSession(){var s=sessionStorage.getItem('bm_cu');if(s){CU=JSON.parse(s);document.getElementById('loginOverlay').classList.add('hidden');initAfterLogin();}}

function initAfterLogin(){
  document.getElementById('uName').textContent=CU.name;
  document.getElementById('uRole').textContent=CU.role==='admin'?'Administrator':CU.role==='user'?'Operator':'Podglad';
  document.getElementById('uAv').textContent=CU.name.charAt(0);
  document.getElementById('navAdmin').style.display=CU.role==='admin'?'flex':'none';
  initDash();
}

/* NAV */
var TITLES={'dashboard':'Dashboard','calendar':'Kalendarz','occupancy':'Oblozenie','rotb':'Rooms on the Books','meals':'Posilki','hsk':'Housekeeping','arrivals':'Przyjazdy / Wyjazdy','cancellations':'Anulacje','changes':'Zmiany','import':'Import','admin':'Admin'};
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

/* FILTER */
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
  var info=fPkg.length+' dni ('+fmtD(from)+' - '+fmtD(to)+')';
  var allSuf=['','O','M','H','A'];
  for(var i=0;i<allSuf.length;i++){var e=document.getElementById('fInfo'+allSuf[i]);if(e)e.textContent=info;}
  rebuildAll();
}

function preset(t){
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

/* KPI */
function buildKPI(){
  var d=fPkg,h=fHsk;
  if(!d.length){document.getElementById('kpiGrid').innerHTML='<p style="color:#94a3b8;grid-column:1/-1;text-align:center;padding:40px">Brak danych</p>';return;}
  var td=todStr(),t=null;for(var i=0;i<d.length;i++){if(d[i].date===td){t=d[i];break;}}if(!t)t=d[0];
  var th=null;for(var i=0;i<h.length;i++){if(h[i].date===td){th=h[i];break;}}if(!th&&h.length)th=h[0];if(!th)th={morn:0,arr:0,dep:0};
  var totLoss=0;for(var i=0;i<cancelData.length;i++)totLoss+=cancelData[i].revLoss||0;
  var totRotb=0,totRev=0;for(var i=0;i<rotbData.length;i++){totRotb+=rotbData[i].totalRooms;totRev+=rotbData[i].revenue;}
  var hskT=(th.morn||0)+(th.arr||0)+(th.dep||0);
  document.getElementById('kpiGrid').innerHTML=
    '<div class="kc blue"><div class="kt">PRZYJAZDY</div><div class="ks">Arr. Rooms</div><div class="kv">'+t.arrR+'</div><div class="kd">'+t.arrP+' osob - '+fmtD(t.date)+'</div></div>'+
    '<div class="kc blue"><div class="kt">WYJAZDY</div><div class="ks">Dep. Rooms</div><div class="kv">'+t.depR+'</div><div class="kd">'+t.depP+' osob</div></div>'+
    '<div class="kc green"><div class="kt">POKOJE DZIS</div><div class="ks">Rooms tonight</div><div class="kv">'+t.occ+'</div><div class="kd">'+(t.occ/TR*100).toFixed(1)+'% z '+TR+'</div></div>'+
    '<div class="kc purple"><div class="kt">GOSCIE</div><div class="ks">Adults+Children</div><div class="kv">'+(t.adu+t.ch)+'</div><div class="kd">'+t.adu+' dor. / '+t.ch+' dz.</div></div>'+
    '<div class="kc orange"><div class="kt">POSILKI</div><div class="ks">BFK+LUN+DIN</div><div class="kv">'+(t.bfk+t.lun+t.din)+'</div><div class="kd">Sn:'+t.bfk+' Ob:'+t.lun+' Kol:'+t.din+'</div></div>'+
    '<div class="kc red"><div class="kt">HSK</div><div class="ks">Do sprzatania</div><div class="kv">'+hskT+'</div><div class="kd">Por:'+th.morn+' Prz:'+th.arr+' Wyj:'+th.dep+'</div></div>'+
    '<div class="kc teal"><div class="kt">ROTB TOTAL</div><div class="ks">Wszystkie miesiace</div><div class="kv">'+fmtN(totRotb)+'</div><div class="kd">Rev: '+(totRev/1e6).toFixed(2)+'M zl</div></div>'+
    '<div class="kc pink"><div class="kt">ANULACJE</div><div class="ks">Revenue Loss</div><div class="kv">'+cancelData.length+'</div><div class="kd">'+fmtPLN(totLoss)+'</div></div>';
}

function buildMonthSummary(){
  var el=document.getElementById('monthSummary');
  if(!rotbData.length){el.innerHTML='';return;}
  var peak=rotbData[0];for(var i=1;i<rotbData.length;i++){if(rotbData[i].totalRooms>peak.totalRooms)peak=rotbData[i];}
  var h='';
  for(var i=0;i<rotbData.length;i++){
    var m=rotbData[i];var isPeak=m===peak&&m.totalRooms>0;var isEmpty=m.totalRooms===0;
    var lyD=(m.occPct-m.lyOccPct).toFixed(1);
    h+='<div class="ms-card'+(isPeak?' peak':'')+(isEmpty?' empty':'')+'"><h4>'+m.month+'</h4><div class="big">'+fmtN(m.totalRooms)+'</div><div class="meta">Occ: <strong>'+m.occPct+'%</strong> <span class="'+(lyD>=0?'up':'dn')+'">('+( lyD>=0?'+':'')+lyD+'pp vs LY '+m.lyOccPct+'%)</span><br>Rev: <strong>'+(m.revenue>0?fmtPLN(m.revenue):'-')+'</strong><br>ADR: <strong>'+(m.adr>0?fmtPLN(m.adr):'-')+'</strong></div></div>';
  }
  el.innerHTML=h;
}

/* CHARTS */
function dc(id){if(CH[id]){CH[id].destroy();delete CH[id];}}

function buildDashCharts(){
  var d=fPkg;if(!d.length)return;
  var lb=[];for(var i=0;i<d.length;i++)lb.push(d[i].date.slice(5).replace('-','.'));
  var occD=[],limD=[];for(var i=0;i<d.length;i++){occD.push(d[i].occ);limD.push(TR);}
  dc('chOcc');CH.chOcc=new Chart(document.getElementById('chOcc'),{type:'line',data:{labels:lb,datasets:[{label:'Pokoje',data:occD,borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.1)',fill:true,tension:.3,pointRadius:2},{label:'360',data:limD,borderColor:'#ef4444',borderDash:[5,5],pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,max:TR+20}}}});

  var bD=[],dD=[],lD=[],wD=[];for(var i=0;i<d.length;i++){bD.push(d[i].bfk);dD.push(d[i].din);lD.push(d[i].lun);wD.push(d[i].wst||0);}
  dc('chMeals');CH.chMeals=new Chart(document.getElementById('chMeals'),{type:'bar',data:{labels:lb,datasets:[{label:'Sniadania',data:bD,backgroundColor:'#f59e0b'},{label:'Kolacje',data:dD,backgroundColor:'#8b5cf6'},{label:'Obiady',data:lD,backgroundColor:'#10b981'},{label:'Wstawki',data:wD,backgroundColor:'#ec4899'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}}}});

  var aD=[],cD=[];for(var i=0;i<d.length;i++){aD.push(d[i].adu);cD.push(d[i].ch);}
  dc('chGuests');CH.chGuests=new Chart(document.getElementById('chGuests'),{type:'line',data:{labels:lb,datasets:[{label:'Dorosli',data:aD,borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.08)',fill:true,tension:.3,pointRadius:2},{label:'Dzieci',data:cD,borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,.08)',fill:true,tension:.3,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true}}}});

  if(rotbData.length){
    var am=[],ml=[];for(var i=0;i<rotbData.length;i++){if(rotbData[i].totalRooms>0||rotbData[i].lyOccPct>0){am.push(rotbData[i]);ml.push(rotbData[i].month.split(' ')[0]);}}
    var oD=[],lyD=[],rD=[];for(var i=0;i<am.length;i++){oD.push(am[i].occPct);lyD.push(am[i].lyOccPct);rD.push(am[i].totalRooms);}
    dc('chRotbD');CH.chRotbD=new Chart(document.getElementById('chRotbD'),{type:'bar',data:{labels:ml,datasets:[{label:'Occ%',data:oD,backgroundColor:'rgba(37,99,235,.7)'},{label:'LY%',data:lyD,backgroundColor:'rgba(239,68,68,.3)'},{type:'line',label:'Pokoje',data:rD,borderColor:'#10b981',yAxisID:'y1',tension:.3,pointRadius:4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,max:100},y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false}}}}});
  }
}

function buildSubPages(){
  var d=fPkg,h=fHsk,td=todStr();if(!d.length)return;
  var lb=[];for(var i=0;i<d.length;i++)lb.push(d[i].date.slice(5).replace('-','.'));

  /* OCC */
  var occP=[],occR=[];for(var i=0;i<d.length;i++){occP.push((d[i].occ/TR*100).toFixed(1));occR.push(d[i].occ);}
  dc('chOccD');CH.chOccD=new Chart(document.getElementById('chOccD'),{type:'bar',data:{labels:lb,datasets:[{type:'line',label:'%',data:occP,borderColor:'#ef4444',yAxisID:'y1',pointRadius:2,tension:.3,fill:false},{label:'Pokoje',data:occR,backgroundColor:'rgba(37,99,235,.6)',yAxisID:'y'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,max:TR+20},y1:{position:'right',min:0,max:110,grid:{drawOnChartArea:false}}}}});
  var t='<table><thead><tr><th>Data</th><th>Dzien</th><th>Pokoje</th><th>%</th><th>Dorosli</th><th>Dzieci</th><th>Prz.Pok</th><th>Wyj.Pok</th></tr></thead><tbody>';
  for(var i=0;i<d.length;i++){var r=d[i];var c=r.date===td?'today':(r.day==='Sob.'||r.day==='Niedz.')?'wknd':'';t+='<tr class="'+c+'"><td>'+r.date.slice(5).replace('-','.')+'</td><td>'+r.day+'</td><td class="num"><strong>'+r.occ+'</strong></td><td class="num">'+(r.occ/TR*100).toFixed(1)+'%</td><td class="num">'+r.adu+'</td><td class="num">'+r.ch+'</td><td class="num">'+r.arrR+'</td><td class="num">'+r.depR+'</td></tr>';}
  t+='</tbody></table>';document.getElementById('tblOcc').innerHTML=t;

  /* MEALS */
  var bD=[],dD=[],lD=[],wD=[];for(var i=0;i<d.length;i++){bD.push(d[i].bfk);dD.push(d[i].din);lD.push(d[i].lun);wD.push(d[i].wst||0);}
  dc('chMD');CH.chMD=new Chart(document.getElementById('chMD'),{type:'line',data:{labels:lb,datasets:[{label:'Sniadania',data:bD,borderColor:'#f59e0b',tension:.3,pointRadius:2},{label:'Kolacje',data:dD,borderColor:'#8b5cf6',tension:.3,pointRadius:2},{label:'Obiady',data:lD,borderColor:'#10b981',tension:.3,pointRadius:2},{label:'Wstawki',data:wD,borderColor:'#ec4899',tension:.3,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true}}}});
  var totD=[];for(var i=0;i<d.length;i++)totD.push(d[i].bfk+d[i].din+d[i].lun+(d[i].wst||0));
  dc('chMT');CH.chMT=new Chart(document.getElementById('chMT'),{type:'bar',data:{labels:lb,datasets:[{label:'Lacznie',data:totD,backgroundColor:'rgba(99,102,241,.6)'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
  t='<table><thead><tr><th>Data</th><th>Dzien</th><th>Sniadania</th><th>Kolacje</th><th>Obiady</th><th>Wstawki</th><th>Razem</th></tr></thead><tbody>';
  for(var i=0;i<d.length;i++){var r=d[i];var tot=r.bfk+r.din+r.lun+(r.wst||0);var c=r.date===td?'today':(r.day==='Sob.'||r.day==='Niedz.')?'wknd':'';t+='<tr class="'+c+'"><td>'+r.date.slice(5).replace('-','.')+'</td><td>'+r.day+'</td><td class="num">'+r.bfk+'</td><td class="num">'+r.din+'</td><td class="num">'+r.lun+'</td><td class="num">'+(r.wst||0)+'</td><td class="num"><strong>'+tot+'</strong></td></tr>';}
  t+='</tbody></table>';document.getElementById('tblMeals').innerHTML=t;

  /* HSK */
  if(h.length){
    var hl=[];for(var i=0;i<h.length;i++)hl.push(h[i].date.slice(5).replace('-','.'));
    var mD=[],aD=[],dpD=[],eD=[];for(var i=0;i<h.length;i++){mD.push(h[i].morn);aD.push(h[i].arr);dpD.push(h[i].dep);eD.push(h[i].eve);}
    dc('chHD');CH.chHD=new Chart(document.getElementById('chHD'),{type:'bar',data:{labels:hl,datasets:[{label:'Poranne',data:mD,backgroundColor:'#60a5fa'},{label:'Przyjazdy',data:aD,backgroundColor:'#34d399'},{label:'Wyjazdy',data:dpD,backgroundColor:'#f87171'},{type:'line',label:'Wieczorne',data:eD,borderColor:'#8b5cf6',pointRadius:2,tension:.3,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true}}}});
    t='<table><thead><tr><th>Data</th><th>Dzien</th><th>Goscie</th><th>Poranne</th><th>Przyjazdy</th><th>Wyjazdy</th><th>Wieczorne</th><th>Suma</th></tr></thead><tbody>';
    for(var i=0;i<h.length;i++){var r=h[i];var c=r.date===td?'today':(r.day==='Sob.'||r.day==='Niedz.')?'wknd':'';t+='<tr class="'+c+'"><td>'+r.date.slice(5).replace('-','.')+'</td><td>'+r.day+'</td><td class="num">'+r.guests+'</td><td class="num">'+r.morn+'</td><td class="num">'+r.arr+'</td><td class="num">'+r.dep+'</td><td class="num">'+r.eve+'</td><td class="num"><strong>'+(r.morn+r.arr+r.dep)+'</strong></td></tr>';}
    t+='</tbody></table>';document.getElementById('tblHsk').innerHTML=t;
  }

  /* ARRIVALS */
  var arrD=[],depD2=[];for(var i=0;i<d.length;i++){arrD.push(d[i].arrR);depD2.push(-d[i].depR);}
  dc('chArr');CH.chArr=new Chart(document.getElementById('chArr'),{type:'bar',data:{labels:lb,datasets:[{label:'Przyjazdy',data:arrD,backgroundColor:'#34d399'},{label:'Wyjazdy',data:depD2,backgroundColor:'#f87171'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
  t='<table><thead><tr><th>Data</th><th>Dzien</th><th>Prz.Pok</th><th>Prz.Os</th><th>Wyj.Pok</th><th>Wyj.Os</th><th>Bilans</th></tr></thead><tbody>';
  for(var i=0;i<d.length;i++){var r=d[i];var b=r.arrR-r.depR;var c=r.date===td?'today':(r.day==='Sob.'||r.day==='Niedz.')?'wknd':'';t+='<tr class="'+c+'"><td>'+r.date.slice(5).replace('-','.')+'</td><td>'+r.day+'</td><td class="num">'+r.arrR+'</td><td class="num">'+r.arrP+'</td><td class="num">'+r.depR+'</td><td class="num">'+r.depP+'</td><td class="num" style="color:'+(b>0?'var(--ok)':b<0?'var(--err)':'inherit')+';font-weight:600">'+(b>0?'+':'')+b+'</td></tr>';}
  t+='</tbody></table>';document.getElementById('tblArr').innerHTML=t;

  /* CANCEL */
  var cd=cancelData;var tLoss=0,tNts=0;for(var i=0;i<cd.length;i++){tLoss+=cd[i].revLoss||0;tNts+=cd[i].nts||0;}
  var reasons={};for(var i=0;i<cd.length;i++){var rr=cd[i].reason||'?';reasons[rr]=(reasons[rr]||0)+1;}
  var rStr='';for(var k in reasons)rStr+=k+':'+reasons[k]+' ';
  document.getElementById('cancelKpi').innerHTML=
    '<div class="kc red"><div class="kt">ANULACJE</div><div class="kv">'+cd.length+'</div><div class="kd">'+tNts+' nocy</div></div>'+
    '<div class="kc orange"><div class="kt">REVENUE LOSS</div><div class="kv">'+fmtPLN(tLoss)+'</div><div class="kd">Sr. '+(cd.length?fmtPLN(tLoss/cd.length):'-')+'</div></div>'+
    '<div class="kc purple"><div class="kt">POWODY</div><div class="kv">'+Object.keys(reasons).length+'</div><div class="kd">'+rStr+'</div></div>';
  t='<table><thead><tr><th>#</th><th>Nr</th><th>Nazwisko</th><th>Typ</th><th>Przyjazd</th><th>Noce</th><th>Rate</th><th>Rev Loss</th><th>Powod</th></tr></thead><tbody>';
  for(var i=0;i<cd.length;i++){var c2=cd[i];t+='<tr><td>'+(i+1)+'</td><td>'+c2.confNo+'</td><td>'+c2.name+'</td><td><span class="pill pill-b">'+c2.roomType+'</span></td><td>'+c2.arrDate+'</td><td class="num">'+c2.nts+'</td><td>'+c2.rate+'</td><td class="num" style="color:var(--err);font-weight:600">'+fmtPLN(c2.revLoss||0)+'</td><td><span class="pill pill-o">'+c2.reason+'</span></td></tr>';}
  if(cd.length)t+='<tr style="font-weight:700;background:#f1f5f9"><td colspan="7">RAZEM</td><td class="num" style="color:var(--err)">'+fmtPLN(tLoss)+'</td><td></td></tr>';
  t+='</tbody></table>';document.getElementById('tblCancel').innerHTML=t;

  buildRotbPage();
}

function buildRotbPage(){
  var d=rotbData;if(!d.length)return;
  var totR=0,totRev=0;for(var i=0;i<d.length;i++){totR+=d[i].totalRooms;totRev+=d[i].revenue;}
  var adrArr=[];for(var i=0;i<d.length;i++){if(d[i].adr>0)adrArr.push(d[i].adr);}
  var adr=adrArr.length?adrArr.reduce(function(a,b){return a+b;},0)/adrArr.length:0;
  var peak=d[0];for(var i=1;i<d.length;i++){if(d[i].totalRooms>peak.totalRooms)peak=d[i];}
  document.getElementById('rotbKpi').innerHTML=
    '<div class="kc blue"><div class="kt">RAZEM OTB</div><div class="kv">'+fmtN(totR)+'</div><div class="kd">pokoi</div></div>'+
    '<div class="kc green"><div class="kt">REVENUE</div><div class="kv">'+(totRev/1e6).toFixed(2)+'M</div><div class="kd">'+fmtPLN(totRev)+'</div></div>'+
    '<div class="kc orange"><div class="kt">SR. ADR</div><div class="kv">'+adr.toFixed(0)+' zl</div></div>'+
    '<div class="kc red"><div class="kt">PEAK</div><div class="kv">'+fmtN(peak.totalRooms)+'</div><div class="kd">'+peak.month+'</div></div>';

  var cards='';
  for(var i=0;i<d.length;i++){
    var m=d[i];
    var lyD2=(m.occPct-m.lyOccPct).toFixed(1);
    cards+='<div class="ms-card'+(m===peak?' peak':'')+(m.totalRooms===0?' empty':'')+'"><h4>'+m.month+'</h4><div class="big">'+fmtN(m.totalRooms)+'</div><div class="meta">Occ: <strong>'+m.occPct+'%</strong> <span class="'+(lyD2>=0?'up':'dn')+'">('+( lyD2>=0?'+':'')+lyD2+'pp vs LY)</span><br>Rev: <strong>'+(m.revenue>0?fmtPLN(m.revenue):'-')+'</strong></div></div>';
  }
  document.getElementById('rotbCards').innerHTML=cards;

  var am=[],ml=[];for(var i=0;i<d.length;i++){if(d[i].totalRooms>0||d[i].lyOccPct>0){am.push(d[i]);ml.push(d[i].month.split(' ')[0]);}}
  var oD=[],lyD3=[],rD=[],revD=[],adrD=[];
  for(var i=0;i<am.length;i++){oD.push(am[i].occPct);lyD3.push(am[i].lyOccPct);rD.push(am[i].totalRooms);revD.push(am[i].revenue);adrD.push(am[i].adr);}
  dc('chRotb');CH.chRotb=new Chart(document.getElementById('chRotb'),{type:'bar',data:{labels:ml,datasets:[{label:'Occ%',data:oD,backgroundColor:'rgba(37,99,235,.7)'},{label:'LY%',data:lyD3,backgroundColor:'rgba(239,68,68,.3)'},{type:'line',label:'Pokoje',data:rD,borderColor:'#10b981',yAxisID:'y1',tension:.3,pointRadius:4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,max:100},y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false}}}}});
  dc('chRev');CH.chRev=new Chart(document.getElementById('chRev'),{type:'bar',data:{labels:ml,datasets:[{label:'Revenue',data:revD,backgroundColor:'rgba(16,185,129,.6)'},{type:'line',label:'ADR',data:adrD,borderColor:'#f59e0b',yAxisID:'y1',tension:.3,pointRadius:4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true},y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false}}}}});

  var t2='<table><thead><tr><th>Miesiac</th><th>Pokoje OTB</th><th>Occ %</th><th>LY %</th><th>D pp</th><th>Revenue</th><th>ADR</th></tr></thead><tbody>';
  for(var i=0;i<d.length;i++){var m2=d[i];var diff2=(m2.occPct-m2.lyOccPct).toFixed(1);t2+='<tr><td><strong>'+m2.month+'</strong></td><td class="num">'+fmtN(m2.totalRooms)+'</td><td class="num">'+m2.occPct+'%</td><td class="num">'+m2.lyOccPct+'%</td><td class="num" style="color:'+(diff2>=0?'var(--ok)':'var(--err)')+';font-weight:600">'+(diff2>=0?'+':'')+diff2+'</td><td class="num">'+fmtPLN(m2.revenue)+'</td><td class="num">'+(m2.adr>0?fmtPLN(m2.adr):'-')+'</td></tr>';}
  t2+='<tr style="font-weight:700;background:#f1f5f9"><td>RAZEM</td><td class="num">'+fmtN(totR)+'</td><td colspan="3"></td><td class="num">'+fmtPLN(totRev)+'</td><td></td></tr></tbody></table>';
  document.getElementById('tblRotb').innerHTML=t2;
}

/* CALENDAR */
function calMo(dir){calM+=dir;if(calM>11){calM=0;calY++;}if(calM<0){calM=11;calY--;}buildCal();}

function buildCal(){
  document.getElementById('calLabel').textContent=MPL[calM]+' '+calY;
  var grid=document.getElementById('calGrid');
  var h='';var dNames=['Pon','Wt','Sr','Czw','Pt','Sob','Nie'];
  for(var i=0;i<7;i++)h+='<div class="calh">'+dNames[i]+'</div>';
  var first=new Date(calY,calM,1);var startDay=(first.getDay()+6)%7;
  var daysInMonth=new Date(calY,calM+1,0).getDate();
  var td=todStr();
  var rotbMap={};
  for(var i=0;i<pkgData.length;i++){rotbMap[pkgData[i].date]=pkgData[i].occ;}
  for(var i=0;i<startDay;i++){h+='<div class="cald om"></div>';}
  for(var day=1;day<=daysInMonth;day++){
    var ds=calY+'-'+String(calM+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    var isTod=ds===td;
    var occ=rotbMap[ds];
    var pct=occ!==undefined?(occ/TR*100):0;
    var cls2=occ===undefined?'no':pct>=80?'hi':pct>=50?'md':'lo';
    var ev=EV26[ds];
    h+='<div class="cald'+(isTod?' tod':'')+'"><div class="dnum">'+day+'</div>';
    if(occ!==undefined)h+='<div class="docc '+cls2+'">'+occ+' ('+pct.toFixed(0)+'%)</div>';
    if(ev)h+='<div class="dev">'+ev+'</div>';
    h+='</div>';
  }
  grid.innerHTML=h;
}

/* CHANGES */
function buildChanges(){
  var el=document.getElementById('changesContent');
  if(history.length<2){el.innerHTML='<div class="alm"><h3>Brak danych do porownania</h3><p style="margin-top:8px">Potrzebujesz min. 2 importow.</p></div>';return;}
  var h2='<div class="acard"><h3>Historia ('+history.length+' importow)</h3>';
  for(var i=history.length-1;i>=0;i--){
    var s=history[i];var prev2=i>0?history[i-1]:null;
    var d2=calcDelta(s,prev2);
    var sign2=function(v){return v>0?'<span class="up">+'+fmtN(v)+'</span>':v<0?'<span class="dn">'+fmtN(v)+'</span>':'0';};
    h2+='<div style="padding:16px;border-bottom:1px solid #f1f5f9;'+(i===history.length-1?'background:#eff6ff':'')+'"><strong>'+s.date+(i===history.length-1?' (AKTUALNY)':'')+'</strong>';
    if(d2){h2+=' | ROTB: '+sign2(d2.totalRoomsDiff)+' | Occ: '+sign2(d2.occDiff)+' | Posilki: '+sign2(d2.mealsDiff);}
    h2+='</div>';
  }
  h2+='</div>';el.innerHTML=h2;
}

/* IMPORT */
function fSel(type,input){
  if(input.files&&input.files[0]){
    selFiles[type]=input.files[0];
    var el=document.getElementById('s'+type.charAt(0).toUpperCase()+type.slice(1));
    if(el)el.textContent='OK: '+input.files[0].name;
    document.getElementById('ic'+type.charAt(0).toUpperCase()+type.slice(1)).classList.add('has');
  }
}

async function processAll(){
  var btn=document.getElementById('procBtn');btn.disabled=true;btn.textContent='Przetwarzanie...';
  var status=document.getElementById('dataStatus');status.innerHTML='Przetwarzam...';
  try{
    var newPkg=pkgData,newHsk=hskData,newCancel=cancelData,newRotb=rotbData;
    if(selFiles.pkg){newPkg=await parsePkg(selFiles.pkg);if(newPkg.length)pkgData=newPkg;}
    if(selFiles.hsk){newHsk=await parseHsk(selFiles.hsk);if(newHsk.length)hskData=newHsk;}
    if(selFiles.cancel){newCancel=await parseCancel(selFiles.cancel);if(newCancel.length)cancelData=newCancel;}
    if(selFiles.rotb){newRotb=await parseRotb(selFiles.rotb);if(newRotb.length)rotbData=newRotb;}
    var snap={date:todStr(),ts:Date.now(),pkg:pkgData,hsk:hskData,cancel:cancelData,rotb:rotbData};
    history.push(snap);saveHistory();
    initFilters();buildDeltaBanner();buildHistList();
    status.innerHTML='<strong style="color:var(--ok)">Sukces!</strong> PKG:'+pkgData.length+' HSK:'+hskData.length+' Cancel:'+cancelData.length+' ROTB:'+rotbData.length+' | Zapisano snapshot '+todStr();
  }catch(err){status.innerHTML='<strong style="color:var(--err)">Blad:</strong> '+err.message;}
  btn.disabled=false;btn.textContent='Przetworz i zaktualizuj';
  selFiles={pkg:null,hsk:null,cancel:null,rotb:null};
}

function clearAllData(){
  if(!confirm('Usunac wszystkie dane?'))return;
  localStorage.removeItem('bm_hist');localStorage.removeItem('bm_users');
  history=[];pkgData=[];hskData=[];cancelData=[];rotbData=[];
  loadCurrentData();initFilters();buildDeltaBanner();buildHistList();
  document.getElementById('dataStatus').innerHTML='Dane wyczyszczone.';
}

function buildHistList(){
  var el=document.getElementById('histList');if(!el)return;
  if(!history.length){el.innerHTML='<p style="padding:16px;color:#94a3b8">Brak importow</p>';return;}
  var h3='<table><thead><tr><th>#</th><th>Data</th><th>PKG</th><th>HSK</th><th>Cancel</th><th>ROTB</th></tr></thead><tbody>';
  for(var i=history.length-1;i>=0;i--){
    var s2=history[i];
    h3+='<tr><td>'+(i+1)+'</td><td>'+s2.date+'</td><td>'+(s2.pkg?s2.pkg.length:0)+'</td><td>'+(s2.hsk?s2.hsk.length:0)+'</td><td>'+(s2.cancel?s2.cancel.length:0)+'</td><td>'+(s2.rotb?s2.rotb.length:0)+'</td></tr>';
  }
  h3+='</tbody></table>';el.innerHTML=h3;
}

/* ADMIN */
function buildAdmin(){
  var el=document.getElementById('adminContent');
  if(!CU||CU.role!=='admin'){el.innerHTML='<div class="alm"><h3>Brak dostepu</h3></div>';return;}
  var users=getUsers();
  var h4='<div class="acard"><h3>Uzytkownicy</h3><table class="ul"><thead><tr><th>Login</th><th>Nazwa</th><th>Rola</th><th></th></tr></thead><tbody>';
  for(var i=0;i<users.length;i++){
    var u=users[i];var rc=u.role==='admin'?'r-a':u.role==='user'?'r-u':'r-v';
    h4+='<tr><td>'+u.username+'</td><td>'+u.name+'</td><td><span class="rb '+rc+'">'+u.role+'</span></td><td>'+(u.username!=='admin'?'<button class="dub" onclick="delUser(\''+u.id+'\')">Usun</button>':'')+'</td></tr>';
  }
  h4+='</tbody></table></div>';
  h4+='<div class="acard"><h3>Dodaj uzytkownika</h3><div class="af"><div><label>Login</label><input id="nuUser"></div><div><label>Nazwa</label><input id="nuName"></div><div><label>Rola</label><select id="nuRole"><option value="user">Operator</option><option value="viewer">Podglad</option><option value="admin">Admin</option></select></div><button onclick="addUser()">Dodaj</button></div></div>';
  el.innerHTML=h4;
}

function addUser(){
  var un=document.getElementById('nuUser').value.trim();
  var nm=document.getElementById('nuName').value.trim();
  var rl=document.getElementById('nuRole').value;
  if(!un||!nm)return;
  var users=getUsers();
  for(var i=0;i<users.length;i++){if(users[i].username===un){alert('Login zajety');return;}}
  users.push({id:'u'+Date.now(),username:un,role:rl,name:nm});
  saveUsers(users);buildAdmin();
}

function delUser(id){
  var users=getUsers();var nu=[];
  for(var i=0;i<users.length;i++){if(users[i].id!==id)nu.push(users[i]);}
  saveUsers(nu);buildAdmin();
}

/* PRINT */
function printSec(id){var c=document.getElementById(id);if(!c)return;var w=window.open('','','width=900,height=600');w.document.write('<html><head><title>Print</title></head><body>'+c.parentElement.parentElement.innerHTML+'</body></html>');w.document.close();w.print();}
function printTbl(id){var c=document.getElementById(id);if(!c)return;var w=window.open('','','width=900,height=600');w.document.write('<html><head><title>Print</title><style>table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#f1f5f9}</style></head><body>'+c.innerHTML+'</body></html>');w.document.close();w.print();}

/* WEATHER */
function fetchWeather(){
  var xhr=new XMLHttpRequest();
  xhr.open('GET','https://api.open-meteo.com/v1/forecast?latitude='+LAT+'&longitude='+LON+'&current_weather=true&timezone=Europe%2FWarsaw');
  xhr.onload=function(){
    if(xhr.status===200){
      try{
        var w=JSON.parse(xhr.responseText).current_weather;
        var ic=w.weathercode<=1?'☀️':w.weathercode<=3?'⛅':w.weathercode<=50?'☁️':w.weathercode<=65?'🌧️':'🌦️';
        document.getElementById('wBadge').textContent=ic+' '+w.temperature+'°C';
      }catch(e){}
    }
  };
  xhr.send();
}

function updateClock(){
  var now=new Date();
  document.getElementById('clock').textContent=now.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
}

/* REBUILD ALL */
function rebuildAll(){
  buildKPI();buildMonthSummary();buildDashCharts();buildSubPages();
}

/* INIT */
function initDash(){
  loadHistory();loadCurrentData();initFilters();buildDeltaBanner();buildHistList();
  fetchWeather();updateClock();setInterval(updateClock,30000);
}

/* START */
checkSession();
