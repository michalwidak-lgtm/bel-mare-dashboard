/* ===== BEL MARE APP v3.2 ===== */
var TR=360,LAT=54.1139,LON=15.7744;
var MPL=['Styczen','Luty','Marzec','Kwiecien','Maj','Czerwiec','Lipiec','Sierpien','Wrzesien','Pazdziernik','Listopad','Grudzien'];
var EV26={'2026-04-03':'Wielki Piatek','2026-04-05':'Wielkanoc','2026-04-06':'Pon.Wielkanocny','2026-05-01':'1 Maja','2026-05-03':'3 Maja','2026-06-04':'Boze Cialo','2026-06-27':'Wakacje','2026-08-15':'15 Sierpnia','2026-08-31':'Koniec wakacji','2026-11-01':'Wszystkich Sw.','2026-11-11':'Niepodleglosc','2026-12-24':'Wigilia','2026-12-25':'Boze Narodzenie','2026-12-31':'Sylwester','2027-01-01':'Nowy Rok','2027-01-06':'Trzech Kroli'};
var DEFUSERS=[{id:'admin',username:'admin',role:'admin',name:'Administrator'},{id:'op1',username:'operacja',role:'user',name:'Dzial Operacyjny'},{id:'rec1',username:'recepcja',role:'viewer',name:'Recepcja'}];
var TITLES={'dashboard':'Dashboard','calendar':'Kalendarz','occupancy':'Oblozenie','rotb':'Rooms on the Books','meals':'Posilki','hsk':'Housekeeping','arrivals':'Przyjazdy / Wyjazdy','cancellations':'Anulacje','changes':'Zmiany','import':'Import','admin':'Admin'};

var CU=null,CH={},calM=2,calY=2026;
var pkgData=[],hskData=[],cancelData=[],rotbData=[];
var fPkg=[],fHsk=[];
var selFiles={pkg:null,hsk:null,cancel:null,rotb:null};
var hist=[];

function fmtD(s){if(!s)return'';var p=s.split('-');return p[2]+'.'+p[1]+'.'+p[0];}
function fmtN(n){return(n||0).toLocaleString('pl-PL');}
function fmtPLN(n){return(n||0).toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})+' zl';}
function todStr(){return new Date().toISOString().slice(0,10);}
function dataRange(){if(!pkgData.length)return{min:'',max:''};var d=pkgData.map(function(r){return r.date;}).sort();return{min:d[0],max:d[d.length-1]};}
function occColor(o){var p=o/TR*100;return p>=90?'#ef4444':p>=70?'#f59e0b':p>=40?'#3b82f6':'#10b981';}
function occColorArr(a){var c=[];for(var i=0;i<a.length;i++)c.push(occColor(a[i]));return c;}

/* HISTORY */
function loadHistory(){try{hist=JSON.parse(localStorage.getItem('bm_hist')||'[]');}catch(e){hist=[];}}
function saveHistory(){if(hist.length>30)hist=hist.slice(-30);try{localStorage.setItem('bm_hist',JSON.stringify(hist));}catch(e){}}
function lastSnap(){return hist.length?hist[hist.length-1]:null;}
function prevSnap(){return hist.length>1?hist[hist.length-2]:null;}

function loadCurrentData(){
  var s=lastSnap();
  if(s){if(s.pkg&&s.pkg.length)pkgData=s.pkg;if(s.hsk&&s.hsk.length)hskData=s.hsk;if(s.cancel)cancelData=s.cancel;if(s.rotb&&s.rotb.length)rotbData=s.rotb;}
  if(!pkgData.length)pkgData=JSON.parse(JSON.stringify(S_PKG));
  if(!hskData.length)hskData=JSON.parse(JSON.stringify(S_HSK));
  if(!cancelData.length)cancelData=JSON.parse(JSON.stringify(S_CANCEL));
  if(!rotbData.length)rotbData=JSON.parse(JSON.stringify(S_ROTB));
}

/* DELTA */
function calcDelta(cur,prev){
  if(!prev||!cur)return null;
  var d={prevDate:prev.date||'?',curDate:cur.date||'?'};
  var cr=cur.rotb||[],pr=prev.rotb||[];
  var sc=0,sp=0,rc=0,rp=0;
  for(var i=0;i<cr.length;i++){sc+=cr[i].totalRooms;rc+=cr[i].revenue;}
  for(var i=0;i<pr.length;i++){sp+=pr[i].totalRooms;rp+=pr[i].revenue;}
  d.totalRoomsDiff=sc-sp;d.totalRevDiff=rc-rp;
  var oc=0,op=0,mc=0,mp=0;
  var cp=cur.pkg||[],pp=prev.pkg||[];
  for(var i=0;i<cp.length;i++){oc+=cp[i].occ;mc+=cp[i].bfk+cp[i].din+cp[i].lun+(cp[i].wst||0);}
  for(var i=0;i<pp.length;i++){op+=pp[i].occ;mp+=pp[i].bfk+pp[i].din+pp[i].lun+(pp[i].wst||0);}
  d.occDiff=oc-op;d.mealsDiff=mc-mp;d.cancelDiff=(cur.cancel||[]).length-(prev.cancel||[]).length;
  return d;
}

function buildDeltaBanner(){
  var el=document.getElementById('deltaBanner');var d=calcDelta(lastSnap(),prevSnap());
  if(!d){el.innerHTML='';return;}
  var sg=function(v){return v>0?'+'+fmtN(v):fmtN(v);};
  var cl=function(v){return v>0?'up':v<0?'dn':'';};
  el.innerHTML='<div class="delta-banner"><h3>Zmiany: '+d.prevDate+' &rarr; '+d.curDate+'</h3><div class="dg">'+
    '<div class="di"><div class="dl">ROTB</div><div class="dv '+cl(d.totalRoomsDiff)+'">'+sg(d.totalRoomsDiff)+'</div></div>'+
    '<div class="di"><div class="dl">Revenue</div><div class="dv '+cl(d.totalRevDiff)+'">'+(d.totalRevDiff>0?'+':'')+fmtPLN(d.totalRevDiff)+'</div></div>'+
    '<div class="di"><div class="dl">Occ</div><div class="dv '+cl(d.occDiff)+'">'+sg(d.occDiff)+'</div></div>'+
    '<div class="di"><div class="dl">Posilki</div><div class="dv '+cl(d.mealsDiff)+'">'+sg(d.mealsDiff)+'</div></div>'+
    '<div class="di"><div class="dl">Anulacje</div><div class="dv">'+(d.cancelDiff>0?'+':'')+d.cancelDiff+'</div></div>'+
    '</div></div>';
}

/* AUTH */
function getUsers(){var u=localStorage.getItem('bm_users');if(!u){localStorage.setItem('bm_users',JSON.stringify(DEFUSERS));return JSON.parse(JSON.stringify(DEFUSERS));}return JSON.parse(u);}
function saveUsers(u){localStorage.setItem('bm_users',JSON.stringify(u));}

function handleLogin(){
  var u=document.getElementById('loginUser').value.trim().toLowerCase();
  var e=document.getElementById('loginError');
  if(!u){e.textContent='Wpisz login';return;}
  var users=getUsers();var f=null;
  for(var i=0;i<users.length;i++){if(users[i].username.toLowerCase()===u){f=users[i];break;}}
  if(!f){e.textContent='Nieznany login. Dostepne: admin, operacja, recepcja';return;}
  CU=f;sessionStorage.setItem('bm_cu',JSON.stringify(f));
  document.getElementById('loginOverlay').classList.add('hidden');
  initAfterLogin();
}

function handleLogout(){
  sessionStorage.removeItem('bm_cu');CU=null;
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.getElementById('loginUser').value='';
  document.getElementById('loginError').textContent='';
}

function checkSession(){
  var s=sessionStorage.getItem('bm_cu');
  if(s){CU=JSON.parse(s);document.getElementById('loginOverlay').classList.add('hidden');initAfterLogin();}
}

function initAfterLogin(){
  document.getElementById('uName').textContent=CU.name;
  document.getElementById('uRole').textContent=CU.role==='admin'?'Administrator':CU.role==='user'?'Operator':'Podglad';
  document.getElementById('uAv').textContent=CU.name.charAt(0);
  document.getElementById('navAdmin').style.display=CU.role==='admin'?'flex':'none';
  initDash();
}

/* NAV */
function setupNav(){
  var items=document.querySelectorAll('.ni[data-p]');
  for(var i=0;i<items.length;i++){
    items[i].addEventListener('click',function(){
      var p=this.getAttribute('data-p');if(!p)return;
      var pages=document.querySelectorAll('.page');for(var j=0;j<pages.length;j++)pages[j].classList.remove('active');
      var ns=document.querySelectorAll('.ni');for(var j=0;j<ns.length;j++)ns[j].classList.remove('active');
      var tgt=document.getElementById('page-'+p);
      if(tgt)tgt.classList.add('active');
      this.classList.add('active');
      document.getElementById('pageTitle').textContent=TITLES[p]||p;
      document.getElementById('sidebar').classList.remove('open');
      if(p==='calendar')buildCal();
      if(p==='admin')buildAdmin();
      if(p==='changes')buildChanges();
    });
  }
}

/* FILTER */
function initFilters(){
  var r=dataRange();if(!r.min)return;
  document.getElementById('fFrom').value=r.min;
  document.getElementById('fTo').value=r.max;
  applyFilter();
}

function applyFilter(){
  var from=document.getElementById('fFrom').value,to=document.getElementById('fTo').value;
  if(!from||!to)return;
  fPkg=[];for(var i=0;i<pkgData.length;i++){if(pkgData[i].date>=from&&pkgData[i].date<=to)fPkg.push(pkgData[i]);}
  fHsk=[];for(var i=0;i<hskData.length;i++){if(hskData[i].date>=from&&hskData[i].date<=to)fHsk.push(hskData[i]);}
  document.getElementById('fInfo').textContent=fPkg.length+' dni ('+fmtD(from)+' - '+fmtD(to)+')';
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
  document.getElementById('fFrom').value=f;document.getElementById('fTo').value=to;
  applyFilter();
}

/* KPI */
function buildKPI(){
  var d=fPkg,h=fHsk;
  if(!d.length){document.getElementById('kpiGrid').innerHTML='<p style="color:#94a3b8;grid-column:1/-1;text-align:center;padding:40px">Brak danych - zaimportuj PDF</p>';return;}
  var td=todStr(),t=null;for(var i=0;i<d.length;i++){if(d[i].date===td){t=d[i];break;}}if(!t)t=d[0];
  var th=null;for(var i=0;i<h.length;i++){if(h[i].date===td){th=h[i];break;}}if(!th&&h.length)th=h[0];if(!th)th={morn:0,arr:0,dep:0};
  var tl=0;for(var i=0;i<cancelData.length;i++)tl+=cancelData[i].revLoss||0;
  var tr2=0,tv=0;for(var i=0;i<rotbData.length;i++){tr2+=rotbData[i].totalRooms;tv+=rotbData[i].revenue;}
  var ht=(th.morn||0)+(th.arr||0)+(th.dep||0);
  document.getElementById('kpiGrid').innerHTML=
    '<div class="kc blue"><div class="kt">PRZYJAZDY</div><div class="ks">Arr. Rooms</div><div class="kv">'+t.arrR+'</div><div class="kd">'+t.arrP+' osob - '+fmtD(t.date)+'</div></div>'+
    '<div class="kc blue"><div class="kt">WYJAZDY</div><div class="ks">Dep. Rooms</div><div class="kv">'+t.depR+'</div><div class="kd">'+t.depP+' osob</div></div>'+
    '<div class="kc green"><div class="kt">POKOJE DZIS</div><div class="ks">Rooms tonight</div><div class="kv">'+t.occ+'</div><div class="kd">'+(t.occ/TR*100).toFixed(1)+'% z '+TR+'</div></div>'+
    '<div class="kc purple"><div class="kt">GOSCIE</div><div class="ks">Adults+Children</div><div class="kv">'+(t.adu+t.ch)+'</div><div class="kd">'+t.adu+' dor. / '+t.ch+' dz.</div></div>'+
    '<div class="kc orange"><div class="kt">POSILKI</div><div class="ks">BFK+LUN+DIN</div><div class="kv">'+(t.bfk+t.lun+t.din)+'</div><div class="kd">Sn:'+t.bfk+' Ob:'+t.lun+' Kol:'+t.din+'</div></div>'+
    '<div class="kc red"><div class="kt">HSK</div><div class="ks">Do sprzatania</div><div class="kv">'+ht+'</div><div class="kd">Por:'+th.morn+' Prz:'+th.arr+' Wyj:'+th.dep+'</div></div>'+
    '<div class="kc teal"><div class="kt">ROTB TOTAL</div><div class="kv">'+fmtN(tr2)+'</div><div class="kd">Rev: '+(tv/1e6).toFixed(2)+'M zl</div></div>'+
    '<div class="kc pink"><div class="kt">ANULACJE</div><div class="kv">'+cancelData.length+'</div><div class="kd">'+fmtPLN(tl)+'</div></div>';
}

function buildMonthSummary(){
  var el=document.getElementById('monthSummary');if(!rotbData.length){el.innerHTML='';return;}
  var peak=rotbData[0];for(var i=1;i<rotbData.length;i++){if(rotbData[i].totalRooms>peak.totalRooms)peak=rotbData[i];}
  var h='';
  for(var i=0;i<rotbData.length;i++){
    var m=rotbData[i];var ld=(m.occPct-m.lyOccPct).toFixed(1);
    h+='<div class="ms-card'+(m===peak?' peak':'')+(m.totalRooms===0?' empty':'')+'"><h4>'+m.month+'</h4><div class="big">'+fmtN(m.totalRooms)+'</div><div class="meta">Occ: <strong>'+m.occPct+'%</strong> <span class="'+(ld>=0?'up':'dn')+'">('+( ld>=0?'+':'')+ld+'pp)</span><br>Rev: <strong>'+(m.revenue>0?fmtPLN(m.revenue):'-')+'</strong><br>ADR: <strong>'+(m.adr>0?fmtPLN(m.adr):'-')+'</strong></div></div>';
  }
  el.innerHTML=h;
}

/* CHARTS */
function dc(id){if(CH[id]){CH[id].destroy();delete CH[id];}}

function buildDashCharts(){
  var d=fPkg;if(!d.length)return;
  var lb=[];for(var i=0;i<d.length;i++)lb.push(d[i].date.slice(5).replace('-','.'));
  var oD=[],lmD=[];for(var i=0;i<d.length;i++){oD.push(d[i].occ);lmD.push(TR);}
  dc('chOcc');CH.chOcc=new Chart(document.getElementById('chOcc'),{type:'line',data:{labels:lb,datasets:[{label:'Pokoje',data:oD,borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.1)',fill:true,tension:.3,pointRadius:2},{label:'360',data:lmD,borderColor:'#ef4444',borderDash:[5,5],pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{display:false}},scales:{y:{beginAtZero:true,max:TR+20}}}});

  var bD=[],dD=[],luD=[],wD=[];for(var i=0;i<d.length;i++){bD.push(d[i].bfk);dD.push(d[i].din);luD.push(d[i].lun);wD.push(d[i].wst||0);}
  dc('chMeals');CH.chMeals=new Chart(document.getElementById('chMeals'),{type:'bar',data:{labels:lb,datasets:[{label:'Sniadania',data:bD,backgroundColor:'#f59e0b'},{label:'Kolacje',data:dD,backgroundColor:'#8b5cf6'},{label:'Obiady',data:luD,backgroundColor:'#10b981'},{label:'Wstawki',data:wD,backgroundColor:'#ec4899'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{display:false}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}}}});

  var aD=[],cD=[];for(var i=0;i<d.length;i++){aD.push(d[i].adu);cD.push(d[i].ch);}
  dc('chGuests');CH.chGuests=new Chart(document.getElementById('chGuests'),{type:'line',data:{labels:lb,datasets:[{label:'Dorosli',data:aD,borderColor:'#2563eb',fill:true,backgroundColor:'rgba(37,99,235,.08)',tension:.3,pointRadius:2},{label:'Dzieci',data:cD,borderColor:'#f59e0b',fill:true,backgroundColor:'rgba(245,158,11,.08)',tension:.3,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{display:false}},scales:{y:{beginAtZero:true}}}});

  if(rotbData.length){
    var ml=[],oP=[],lyP=[],rD=[];
    for(var i=0;i<rotbData.length;i++){ml.push(rotbData[i].month);oP.push(rotbData[i].occPct);lyP.push(rotbData[i].lyOccPct);rD.push(rotbData[i].totalRooms);}
    dc('chRotbD');CH.chRotbD=new Chart(document.getElementById('chRotbD'),{type:'bar',data:{labels:ml,datasets:[{label:'Occ%',data:oP,backgroundColor:'rgba(37,99,235,.7)'},{label:'LY%',data:lyP,backgroundColor:'rgba(239,68,68,.3)'},{type:'line',label:'Pokoje',data:rD,borderColor:'#10b981',yAxisID:'y1',tension:.3,pointRadius:4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{display:false}},scales:{y:{beginAtZero:true,max:100},y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false}}}}});
  }
}

/* SUB PAGES */
function buildSubPages(){
  var d=fPkg,h=fHsk,td=todStr();if(!d.length)return;
  var lb=[];for(var i=0;i<d.length;i++)lb.push(d[i].date.slice(5).replace('-','.'));

  /* OCC CHART */
  var occR=[],occP=[];for(var i=0;i<d.length;i++){occR.push(d[i].occ);occP.push(parseFloat((d[i].occ/TR*100).toFixed(1)));}
  var mx=Math.max.apply(null,occR);var maxY=Math.ceil(mx*1.15/50)*50;if(maxY<50)maxY=50;
  dc('chOccD');CH.chOccD=new Chart(document.getElementById('chOccD'),{type:'bar',data:{labels:lb,datasets:[{label:'Pokoje',data:occR,backgroundColor:occColorArr(occR),yAxisID:'y',order:2},{type:'line',label:'% occ',data:occP,borderColor:'#ef4444',borderWidth:2,yAxisID:'y1',pointRadius:3,tension:.3,fill:false,order:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{display:function(ctx){return ctx.datasetIndex===0;},anchor:'end',align:'top',font:{size:10,weight:'bold'},color:'#1e293b',formatter:function(v){return v;}}},scales:{y:{beginAtZero:true,max:maxY,ticks:{stepSize:50},title:{display:true,text:'Pokoje'}},y1:{position:'right',min:0,max:Math.min(110,Math.ceil(mx/TR*100*1.3)),grid:{drawOnChartArea:false},ticks:{callback:function(v){return v+'%';}},title:{display:true,text:'%'}}}},plugins:[ChartDataLabels]});

  /* OCC TABLE */
  var t='<table class="occ-tbl"><colgroup><col style="width:82px"><col style="width:54px"><col style="width:60px"><col style="width:110px"><col style="width:60px"><col style="width:60px"><col style="width:58px"><col style="width:58px"></colgroup>';
  t+='<thead><tr><th style="text-align:left">Data</th><th>Dzien</th><th>Pokoje</th><th>Oblozenie</th><th>Dorosli</th><th>Dzieci</th><th>Prz.</th><th>Wyj.</th></tr></thead><tbody>';
  var sO=0,sA=0,sC=0,sAr=0,sD2=0;
  for(var i=0;i<d.length;i++){
    var r=d[i];var pct=r.occ/TR*100;var bc=pct>=90?'hi':pct>=70?'mh':pct>=40?'md':'lo';var bw=Math.min(pct,100);
    var c=r.date===td?'today':(r.day==='Sob.'||r.day==='Niedz.')?'wknd':'';
    t+='<tr class="'+c+'"><td style="text-align:left">'+fmtD(r.date)+'</td><td>'+r.day+'</td><td><strong>'+r.occ+'</strong></td><td>'+pct.toFixed(1)+'%<span class="occ-bar '+bc+'" style="width:'+bw+'px"></span></td><td>'+r.adu+'</td><td>'+r.ch+'</td><td>'+r.arrR+'</td><td>'+r.depR+'</td></tr>';
    sO+=r.occ;sA+=r.adu;sC+=r.ch;sAr+=r.arrR;sD2+=r.depR;
  }
  var aO=d.length?(sO/d.length):0;
  t+='<tr style="font-weight:700;background:#f1f5f9"><td colspan="2" style="text-align:left">RAZEM/SR.</td><td>'+aO.toFixed(0)+'</td><td>'+(aO/TR*100).toFixed(1)+'%</td><td>'+fmtN(sA)+'</td><td>'+fmtN(sC)+'</td><td>'+fmtN(sAr)+'</td><td>'+fmtN(sD2)+'</td></tr>';
  t+='</tbody></table>';document.getElementById('tblOcc').innerHTML=t;

  /* MEALS */
  var bD=[],dD=[],luD=[],wD=[];for(var i=0;i<d.length;i++){bD.push(d[i].bfk);dD.push(d[i].din);luD.push(d[i].lun);wD.push(d[i].wst||0);}
  dc('chMD');CH.chMD=new Chart(document.getElementById('chMD'),{type:'line',data:{labels:lb,datasets:[{label:'Sniadania',data:bD,borderColor:'#f59e0b',tension:.3,pointRadius:2},{label:'Kolacje',data:dD,borderColor:'#8b5cf6',tension:.3,pointRadius:2},{label:'Obiady',data:luD,borderColor:'#10b981',tension:.3,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{display:false}},scales:{y:{beginAtZero:true}}}});
  var totD=[];for(var i=0;i<d.length;i++)totD.push(d[i].bfk+d[i].din+d[i].lun+(d[i].wst||0));
  dc('chMT');CH.chMT=new Chart(document.getElementById('chMT'),{type:'bar',data:{labels:lb,datasets:[{label:'Lacznie',data:totD,backgroundColor:'rgba(99,102,241,.6)'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{display:false}},scales:{y:{beginAtZero:true}}}});
  t='<table><thead><tr><th>Data</th><th>Dzien</th><th>Sniadania</th><th>Kolacje</th><th>Obiady</th><th>Wstawki</th><th>Razem</th></tr></thead><tbody>';
  for(var i=0;i<d.length;i++){var r=d[i];var tot=r.bfk+r.din+r.lun+(r.wst||0);var c=r.date===td?'today':(r.day==='Sob.'||r.day==='Niedz.')?'wknd':'';t+='<tr class="'+c+'"><td>'+fmtD(r.date)+'</td><td>'+r.day+'</td><td class="num">'+r.bfk+'</td><td class="num">'+r.din+'</td><td class="num">'+r.lun+'</td><td class="num">'+(r.wst||0)+'</td><td class="num"><strong>'+tot+'</strong></td></tr>';}
  t+='</tbody></table>';document.getElementById('tblMeals').innerHTML=t;

  /* HSK */
  if(h.length){
    var hl=[];for(var i=0;i<h.length;i++)hl.push(h[i].date.slice(5).replace('-','.'));
    var mD=[],aD2=[],dpD=[],eD=[];for(var i=0;i<h.length;i++){mD.push(h[i].morn);aD2.push(h[i].arr);dpD.push(h[i].dep);eD.push(h[i].eve);}
    dc('chHD');CH.chHD=new Chart(document.getElementById('chHD'),{type:'bar',data:{labels:hl,datasets:[{label:'Poranne',data:mD,backgroundColor:'#60a5fa'},{label:'Przyjazdy',data:aD2,backgroundColor:'#34d399'},{label:'Wyjazdy',data:dpD,backgroundColor:'#f87171'},{type:'line',label:'Wieczorne',data:eD,borderColor:'#8b5cf6',pointRadius:2,tension:.3,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{display:false}},scales:{y:{beginAtZero:true}}}});
    t='<table><thead><tr><th>Data</th><th>Dzien</th><th>Goscie</th><th>Poranne</th><th>Przyjazdy</th><th>Wyjazdy</th><th>Wieczorne</th><th>Suma</th></tr></thead><tbody>';
    for(var i=0;i<h.length;i++){var r=h[i];var c=r.date===td?'today':(r.day==='Sob.'||r.day==='Niedz.')?'wknd':'';t+='<tr class="'+c+'"><td>'+fmtD(r.date)+'</td><td>'+r.day+'</td><td class="num">'+r.guests+'</td><td class="num">'+r.morn+'</td><td class="num">'+r.arr+'</td><td class="num">'+r.dep+'</td><td class="num">'+r.eve+'</td><td class="num"><strong>'+(r.morn+r.arr+r.dep)+'</strong></td></tr>';}
    t+='</tbody></table>';document.getElementById('tblHsk').innerHTML=t;
  }

  /* ARRIVALS */
  var arD=[],dpD2=[];for(var i=0;i<d.length;i++){arD.push(d[i].arrR);dpD2.push(-d[i].depR);}
  dc('chArr');CH.chArr=new Chart(document.getElementById('chArr'),{type:'bar',data:{labels:lb,datasets:[{label:'Przyjazdy',data:arD,backgroundColor:'#34d399'},{label:'Wyjazdy',data:dpD2,backgroundColor:'#f87171'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{display:false}}}});
  t='<table><thead><tr><th>Data</th><th>Dzien</th><th>Prz.Pok</th><th>Prz.Os</th><th>Wyj.Pok</th><th>Wyj.Os</th><th>Bilans</th></tr></thead><tbody>';
  for(var i=0;i<d.length;i++){var r=d[i];var b=r.arrR-r.depR;var c=r.date===td?'today':(r.day==='Sob.'||r.day==='Niedz.')?'wknd':'';t+='<tr class="'+c+'"><td>'+fmtD(r.date)+'</td><td>'+r.day+'</td><td class="num">'+r.arrR+'</td><td class="num">'+r.arrP+'</td><td class="num">'+r.depR+'</td><td class="num">'+r.depP+'</td><td class="num" style="color:'+(b>0?'var(--ok)':b<0?'var(--err)':'inherit')+';font-weight:600">'+(b>0?'+':'')+b+'</td></tr>';}
  t+='</tbody></table>';document.getElementById('tblArr').innerHTML=t;

  /* CANCEL */
  var cd=cancelData;var tL=0,tN=0,tDp=0;
  for(var i=0;i<cd.length;i++){tL+=cd[i].revLoss||0;tN+=cd[i].nts||0;tDp+=cd[i].deposit||0;}
  var reasons={},sources={};
  for(var i=0;i<cd.length;i++){var rr=cd[i].reason||'?';reasons[rr]=(reasons[rr]||0)+(cd[i].revLoss||0);var sr=cd[i].mkt||'?';sources[sr]=(sources[sr]||0)+1;}
  var aLT=0;for(var i=0;i<cd.length;i++)aLT+=cd[i].leadTime||0;aLT=cd.length?(aLT/cd.length):0;
  var aNR=tN>0?(tL/tN):0;
  document.getElementById('cancelKpi').innerHTML=
    '<div class="kc red"><div class="kt">ANULACJE</div><div class="kv">'+cd.length+'</div><div class="kd">'+tN+' pokojonocy</div></div>'+
    '<div class="kc orange"><div class="kt">UTRACONY PRZYCHOD</div><div class="kv">'+fmtPLN(tL)+'</div></div>'+
    '<div class="kc blue"><div class="kt">ZALICZKI</div><div class="kv">'+fmtPLN(tDp)+'</div></div>'+
    '<div class="kc purple"><div class="kt">SR. LEAD TIME</div><div class="kv">'+aLT.toFixed(1)+' dni</div></div>'+
    '<div class="kc teal"><div class="kt">SR. STAWKA/NOC</div><div class="kv">'+fmtPLN(aNR)+'</div></div>';

  var rK=Object.keys(reasons),rV=[];for(var i=0;i<rK.length;i++)rV.push(reasons[rK[i]]);
  var sK=Object.keys(sources),sV=[];for(var i=0;i<sK.length;i++)sV.push(sources[sK[i]]);
  var rC=['#ef4444','#f59e0b','#3b82f6','#8b5cf6','#ec4899'];
  dc('chCancelReason');
  if(rK.length)CH.chCancelReason=new Chart(document.getElementById('chCancelReason'),{type:'bar',data:{labels:rK,datasets:[{label:'PLN',data:rV,backgroundColor:rC.slice(0,rK.length)}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},datalabels:{anchor:'end',align:'right',font:{size:11,weight:'bold'},formatter:function(v){return fmtN(v)+' zl';}}}},plugins:[ChartDataLabels]});
  dc('chCancelSource');
  if(sK.length)CH.chCancelSource=new Chart(document.getElementById('chCancelSource'),{type:'doughnut',data:{labels:sK,datasets:[{data:sV,backgroundColor:rC.slice(0,sK.length)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{font:{size:13,weight:'bold'},color:'#fff',formatter:function(v,ctx){return ctx.chart.data.labels[ctx.dataIndex]+': '+v;}}}}});

  t='<table><thead><tr><th>#</th><th>Nr</th><th>Nazwisko</th><th>Typ</th><th>Przyjazd</th><th>Anulacja</th><th>Lead</th><th>Noce</th><th>Zrodlo</th><th>Stawka/noc</th><th>Rev Loss</th><th>Powod</th></tr></thead><tbody>';
  for(var i=0;i<cd.length;i++){var c2=cd[i];t+='<tr><td>'+(i+1)+'</td><td>'+c2.confNo+'</td><td>'+c2.name+'</td><td><span class="pill pill-b">'+c2.roomType+'</span></td><td>'+c2.arrDate+'</td><td>'+c2.cancelDate+'</td><td class="num">'+c2.leadTime+'</td><td class="num">'+c2.nts+'</td><td>'+c2.mkt+'</td><td class="num">'+fmtPLN(c2.rateAmt)+'</td><td class="num" style="color:var(--err);font-weight:600">'+fmtPLN(c2.revLoss)+'</td><td><span class="pill pill-o">'+c2.reason+'</span> '+c2.reasonDesc+'</td></tr>';}
  if(cd.length)t+='<tr style="font-weight:700;background:#f1f5f9"><td colspan="7">RAZEM</td><td class="num">'+tN+'</td><td colspan="2"></td><td class="num" style="color:var(--err)">'+fmtPLN(tL)+'</td><td></td></tr>';
  t+='</tbody></table>';document.getElementById('tblCancel').innerHTML=t;

  buildRotbPage();
}

/* ROTB PAGE */
function buildRotbPage(){
  var d=rotbData;if(!d.length)return;
  var tR=0,tV=0;for(var i=0;i<d.length;i++){tR+=d[i].totalRooms;tV+=d[i].revenue;}
  var aArr=[];for(var i=0;i<d.length;i++){if(d[i].adr>0)aArr.push(d[i].adr);}
  var adr=aArr.length?aArr.reduce(function(a,b){return a+b;},0)/aArr.length:0;
  var pk=d[0];for(var i=1;i<d.length;i++){if(d[i].totalRooms>pk.totalRooms)pk=d[i];}
  document.getElementById('rotbKpi').innerHTML=
    '<div class="kc blue"><div class="kt">RAZEM OTB</div><div class="kv">'+fmtN(tR)+'</div></div>'+
    '<div class="kc green"><div class="kt">REVENUE</div><div class="kv">'+(tV/1e6).toFixed(2)+'M</div><div class="kd">'+fmtPLN(tV)+'</div></div>'+
    '<div class="kc orange"><div class="kt">SR. ADR</div><div class="kv">'+adr.toFixed(0)+' zl</div></div>'+
    '<div class="kc red"><div class="kt">PEAK</div><div class="kv">'+fmtN(pk.totalRooms)+'</div><div class="kd">'+pk.month+'</div></div>';
  var cards='';
  for(var i=0;i<d.length;i++){var m=d[i];var ld=(m.occPct-m.lyOccPct).toFixed(1);cards+='<div class="ms-card'+(m===pk?' peak':'')+'"><h4>'+m.month+'</h4><div class="big">'+fmtN(m.totalRooms)+'</div><div class="meta">Occ: <strong>'+m.occPct+'%</strong> <span class="'+(ld>=0?'up':'dn')+'">('+( ld>=0?'+':'')+ld+'pp)</span><br>Rev: <strong>'+(m.revenue>0?fmtPLN(m.revenue):'-')+'</strong></div></div>';}
  document.getElementById('rotbCards').innerHTML=cards;

  var ml=[],oP=[],lyP=[],rD=[],rvD=[],adD=[];
  for(var i=0;i<d.length;i++){ml.push(d[i].month);oP.push(d[i].occPct);lyP.push(d[i].lyOccPct);rD.push(d[i].totalRooms);rvD.push(d[i].revenue);adD.push(d[i].adr);}
  dc('chRotb');CH.chRotb=new Chart(document.getElementById('chRotb'),{type:'bar',data:{labels:ml,datasets:[{label:'Occ%',data:oP,backgroundColor:'rgba(37,99,235,.7)'},{label:'LY%',data:lyP,backgroundColor:'rgba(239,68,68,.3)'},{type:'line',label:'Pokoje',data:rD,borderColor:'#10b981',yAxisID:'y1',tension:.3,pointRadius:4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{display:false}},scales:{y:{beginAtZero:true,max:100},y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false}}}}});
  dc('chRev');CH.chRev=new Chart(document.getElementById('chRev'),{type:'bar',data:{labels:ml,datasets:[{label:'Revenue',data:rvD,backgroundColor:'rgba(16,185,129,.6)'},{type:'line',label:'ADR',data:adD,borderColor:'#f59e0b',yAxisID:'y1',tension:.3,pointRadius:4,fill:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},datalabels:{display:false}},scales:{y:{beginAtZero:true},y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false}}}}});

  var t2='<table><thead><tr><th>Miesiac</th><th>Pokoje</th><th>Occ%</th><th>LY%</th><th>D pp</th><th>Revenue</th><th>ADR</th></tr></thead><tbody>';
  for(var i=0;i<d.length;i++){var m2=d[i];var df=(m2.occPct-m2.lyOccPct).toFixed(1);t2+='<tr><td><strong>'+m2.month+'</strong></td><td class="num">'+fmtN(m2.totalRooms)+'</td><td class="num">'+m2.occPct+'%</td><td class="num">'+m2.lyOccPct+'%</td><td class="num" style="color:'+(df>=0?'var(--ok)':'var(--err)')+'">'+(df>=0?'+':'')+df+'</td><td class="num">'+fmtPLN(m2.revenue)+'</td><td class="num">'+(m2.adr>0?fmtPLN(m2.adr):'-')+'</td></tr>';}
  t2+='<tr style="font-weight:700;background:#f1f5f9"><td>RAZEM</td><td class="num">'+fmtN(tR)+'</td><td colspan="3"></td><td class="num">'+fmtPLN(tV)+'</td><td></td></tr></tbody></table>';
  document.getElementById('tblRotb').innerHTML=t2;
}

/* CALENDAR */
function buildCal(){
  document.getElementById('calLabel').textContent=MPL[calM]+' '+calY;
  var grid=document.getElementById('calGrid');var html='';
  var dn=['Pon','Wt','Sr','Czw','Pt','Sob','Nie'];
  for(var i=0;i<7;i++)html+='<div class="calh">'+dn[i]+'</div>';
  var first=new Date(calY,calM,1);var sd=(first.getDay()+6)%7;
  var dim=new Date(calY,calM+1,0).getDate();var td=todStr();
  var oMap={};for(var i=0;i<pkgData.length;i++)oMap[pkgData[i].date]=pkgData[i].occ;
  var rm=null;for(var i=0;i<rotbData.length;i++){if(rotbData[i].monthIdx===calM&&rotbData[i].year===calY){rm=rotbData[i];break;}}
  for(var i=0;i<sd;i++)html+='<div class="cald om"></div>';
  for(var day=1;day<=dim;day++){
    var ds=calY+'-'+String(calM+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    var it=ds===td;var occ=oMap[ds];var pct,cls;
    if(occ!==undefined){pct=occ/TR*100;cls=pct>=90?'hi':pct>=70?'mh':pct>=40?'md':'lo';}
    else if(rm&&rm.occPct>0){pct=rm.occPct;occ=Math.round(TR*pct/100);cls=pct>=90?'hi':pct>=70?'mh':pct>=40?'md':'lo';}
    else{pct=0;cls='no';}
    var ev=EV26[ds];
    html+='<div class="cald'+(it?' tod':'')+'"><div class="dnum">'+day+'</div>';
    if(occ!==undefined&&occ>0)html+='<div class="docc '+cls+'">'+occ+' ('+pct.toFixed(0)+'%)</div>';
    else if(cls!=='no')html+='<div class="docc '+cls+'">~'+occ+' ('+pct.toFixed(0)+'%)</div>';
    if(ev)html+='<div class="dev">'+ev+'</div>';
    html+='</div>';
  }
  grid.innerHTML=html;
}

/* CHANGES */
function buildChanges(){
  var el=document.getElementById('changesContent');
  if(hist.length<2){el.innerHTML='<div class="alm"><h3>Brak danych do porownania</h3><p style="margin-top:8px">Potrzebujesz min. 2 importow.</p></div>';return;}
  var h2='<div class="acard"><h3>Historia ('+hist.length+' importow)</h3>';
  for(var i=hist.length-1;i>=0;i--){
    var s=hist[i];var prev=i>0?hist[i-1]:null;var d2=calcDelta(s,prev);
    h2+='<div style="padding:16px;border-bottom:1px solid #f1f5f9;'+(i===hist.length-1?'background:#eff6ff':'')+'"><strong>'+s.date+(i===hist.length-1?' (AKTUALNY)':'')+'</strong>';
    if(d2)h2+=' | ROTB: '+(d2.totalRoomsDiff>0?'+':'')+fmtN(d2.totalRoomsDiff)+' | Occ: '+(d2.occDiff>0?'+':'')+fmtN(d2.occDiff);
    h2+='</div>';
  }
  h2+='</div>';el.innerHTML=h2;
}

/* IMPORT */
function fSel(type,input){
  if(input.files&&input.files[0]){selFiles[type]=input.files[0];
    var k=type.charAt(0).toUpperCase()+type.slice(1);
    var el=document.getElementById('s'+k);if(el)el.textContent='OK: '+input.files[0].name;
    document.getElementById('ic'+k).classList.add('has');
  }
}

async function processAll(){
  var btn=document.getElementById('procBtn');btn.disabled=true;btn.textContent='Przetwarzanie...';
  var status=document.getElementById('dataStatus');status.innerHTML='Przetwarzam...';
  try{
    if(selFiles.pkg){var r=await parsePkg(selFiles.pkg);if(r.length){pkgData=r;console.log('PKG:',r.length);}}
    if(selFiles.hsk){var r=await parseHsk(selFiles.hsk);if(r.length){hskData=r;console.log('HSK:',r.length);}}
    if(selFiles.cancel){var r=await parseCancel(selFiles.cancel);if(r.length){cancelData=r;console.log('CANCEL:',r.length);}}
    if(selFiles.rotb){var r=await parseRotb(selFiles.rotb);if(r.length){rotbData=r;console.log('ROTB:',r.length);}}
    var snap={date:todStr(),ts:Date.now(),pkg:pkgData,hsk:hskData,cancel:cancelData,rotb:rotbData};
    hist.push(snap);saveHistory();
    initFilters();buildDeltaBanner();buildHistList();
    status.innerHTML='<strong style="color:var(--ok)">Sukces!</strong> PKG:'+pkgData.length+' HSK:'+hskData.length+' Cancel:'+cancelData.length+' ROTB:'+rotbData.length;
  }catch(err){console.error(err);status.innerHTML='<strong style="color:var(--err)">Blad:</strong> '+err.message;}
  btn.disabled=false;btn.textContent='Przetworz i zaktualizuj';
  selFiles={pkg:null,hsk:null,cancel:null,rotb:null};
}

function clearAllData(){
  if(!confirm('Usunac wszystkie dane?'))return;
  localStorage.removeItem('bm_hist');localStorage.removeItem('bm_users');
  hist=[];pkgData=[];hskData=[];cancelData=[];rotbData=[];
  loadCurrentData();initFilters();buildDeltaBanner();buildHistList();
}

function buildHistList(){
  var el=document.getElementById('histList');if(!el)return;
  if(!hist.length){el.innerHTML='<p style="padding:16px;color:#94a3b8">Brak importow</p>';return;}
  var h='<table><thead><tr><th>#</th><th>Data</th><th>PKG</th><th>HSK</th><th>Cancel</th><th>ROTB</th></tr></thead><tbody>';
  for(var i=hist.length-1;i>=0;i--){var s=hist[i];h+='<tr><td>'+(i+1)+'</td><td>'+s.date+'</td><td>'+(s.pkg?s.pkg.length:0)+'</td><td>'+(s.hsk?s.hsk.length:0)+'</td><td>'+(s.cancel?s.cancel.length:0)+'</td><td>'+(s.rotb?s.rotb.length:0)+'</td></tr>';}
  h+='</tbody></table>';el.innerHTML=h;
}

/* ADMIN */
function buildAdmin(){
  var el=document.getElementById('adminContent');
  if(!CU||CU.role!=='admin'){el.innerHTML='<div class="alm"><h3>Brak dostepu</h3></div>';return;}
  var users=getUsers();
  var h='<div class="acard"><h3>Uzytkownicy</h3><table class="ul"><thead><tr><th>Login</th><th>Nazwa</th><th>Rola</th></tr></thead><tbody>';
  for(var i=0;i<users.length;i++){var u=users[i];var rc=u.role==='admin'?'r-a':u.role==='user'?'r-u':'r-v';h+='<tr><td>'+u.username+'</td><td>'+u.name+'</td><td><span class="rb '+rc+'">'+u.role+'</span></td></tr>';}
  h+='</tbody></table></div>';el.innerHTML=h;
}

/* WEATHER */
function fetchWeather(){
  fetch('https://api.open-meteo.com/v1/forecast?latitude='+LAT+'&longitude='+LON+'&current=temperature_2m,weather_code&timezone=Europe%2FWarsaw')
  .then(function(r){return r.json();})
  .then(function(data){if(data&&data.current){document.getElementById('wBadge').textContent=data.current.temperature_2m+'°C Miedzyzdroje';}})
  .catch(function(){document.getElementById('wBadge').textContent='Pogoda niedostepna';});
}

function updateClock(){document.getElementById('clock').textContent=new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});}

function rebuildAll(){buildKPI();buildMonthSummary();buildDashCharts();buildSubPages();}

function initDash(){loadHistory();loadCurrentData();initFilters();buildDeltaBanner();buildHistList();fetchWeather();updateClock();setInterval(updateClock,30000);}

/* ===== EVENT LISTENERS ===== */
document.addEventListener('DOMContentLoaded',function(){
  /* Login */
  document.getElementById('loginBtn').addEventListener('click',handleLogin);
  document.getElementById('loginUser').addEventListener('keydown',function(e){if(e.key==='Enter')handleLogin();});
  document.getElementById('logoutBtn').addEventListener('click',handleLogout);

  /* Hamburger */
  document.getElementById('hamBtn').addEventListener('click',function(){document.getElementById('sidebar').classList.toggle('open');});

  /* Calendar nav */
  document.getElementById('calPrev').addEventListener('click',function(){calM--;if(calM<0){calM=11;calY--;}buildCal();});
  document.getElementById('calNext').addEventListener('click',function(){calM++;if(calM>11){calM=0;calY++;}buildCal();});

  /* Filter */
  document.getElementById('fFrom').addEventListener('change',applyFilter);
  document.getElementById('fTo').addEventListener('change',applyFilter);

  /* Preset buttons */
  var pBtns=document.querySelectorAll('[data-pre]');
  for(var i=0;i<pBtns.length;i++){pBtns[i].addEventListener('click',function(){preset(this.getAttribute('data-pre'));});}

  /* Import file selectors */
  document.getElementById('fPkg').addEventListener('change',function(){fSel('pkg',this);});
  document.getElementById('fHsk').addEventListener('change',function(){fSel('hsk',this);});
  document.getElementById('fCancel').addEventListener('change',function(){fSel('cancel',this);});
  document.getElementById('fRotb').addEventListener('change',function(){fSel('rotb',this);});

  /* Process & Clear */
  document.getElementById('procBtn').addEventListener('click',processAll);
  document.getElementById('clearBtn').addEventListener('click',clearAllData);

  /* Nav */
  setupNav();

  /* Start */
  checkSession();
});
