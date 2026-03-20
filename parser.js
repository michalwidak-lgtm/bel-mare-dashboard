async function exTxt(file){
  var buf=await file.arrayBuffer();
  var pdf=await pdfjsLib.getDocument({data:buf}).promise;
  var txt='';
  for(var i=1;i<=pdf.numPages;i++){
    var pg=await pdf.getPage(i);
    var c=await pg.getTextContent();
    var it=c.items;
    it.sort(function(a,b){var dy=b.transform[5]-a.transform[5];if(Math.abs(dy)>3)return dy;return a.transform[4]-b.transform[4];});
    var ly=null;
    for(var j=0;j<it.length;j++){
      var y=Math.round(it[j].transform[5]);
      if(ly!==null&&Math.abs(y-ly)>3)txt+='\n';
      else if(ly!==null)txt+=' ';
      txt+=it[j].str;ly=y;
    }
    txt+='\n';
  }
  return txt;
}
var D2P={Mon:'Pon.',Tue:'Wt.',Wed:'Sr.',Thu:'Czw.',Fri:'Pt.',Sat:'Sob.',Sun:'Niedz.',Monday:'Pon.',Tuesday:'Wt.',Wednesday:'Sr.',Thursday:'Czw.',Friday:'Pt.',Saturday:'Sob.',Sunday:'Niedz.'};
var DPL_P=['Niedz.','Pon.','Wt.','Sr.','Czw.','Pt.','Sob.'];
function si(v){var n=parseInt(String(v).replace(/[^\d-]/g,''));return isNaN(n)?0:n;}
function sf(v){var n=parseFloat(String(v).replace(/[^\d.,-]/g,'').replace(',','.'));return isNaN(n)?0:n;}

async function parsePkg(file){
  var txt=await exTxt(file);var lines=txt.split('\n');var res=[];var dc=0;
  for(var i=0;i<lines.length;i++){
    var line=lines[i].trim();if(!line)continue;
    var dm=line.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/);if(!dm)continue;
    var dd=dm[1].padStart(2,'0'),mm=dm[2].padStart(2,'0'),yy=dm[3];if(yy.length===2)yy='20'+yy;
    var ds=yy+'-'+mm+'-'+dd;
    var nums=line.match(/-?\d[\d,.]*/g);if(!nums)continue;
    var cn=[];for(var j=0;j<nums.length;j++){if(nums[j]!==dm[1]&&nums[j]!==dm[2]&&nums[j]!==dm[3]&&nums[j]!==dd&&nums[j]!==mm&&nums[j]!==yy)cn.push(nums[j]);}
    if(cn.length<6)continue;
    var dn='';var keys=Object.keys(D2P);for(var k=0;k<keys.length;k++){if(line.toLowerCase().indexOf(keys[k].toLowerCase())>=0){dn=D2P[keys[k]];break;}}
    if(!dn){var d=new Date(ds);dn=DPL_P[d.getDay()];}
    dc++;var n=[];for(var j=0;j<cn.length;j++)n.push(si(cn[j]));
    res.push({d:dc,date:ds,day:dn,occ:n[0]||0,adu:n[1]||0,ch:n[2]||0,arrP:n[3]||0,depP:n[4]||0,arrR:n[5]||0,depR:n[6]||0,bfk:n[7]||0,din:n[8]||0,lun:n[9]||0,wst:n.length>=12?n[10]||0:0,total:n[n.length-1]||0});
  }
  return res;
}

async function parseHsk(file){
  var txt=await exTxt(file);var lines=txt.split('\n');var res=[];
  for(var i=0;i<lines.length;i++){
    var line=lines[i].trim();if(!line)continue;
    var dm=line.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/);if(!dm)continue;
    var dd=dm[1].padStart(2,'0'),mm=dm[2].padStart(2,'0'),yy=dm[3];if(yy.length===2)yy='20'+yy;
    var ds=yy+'-'+mm+'-'+dd;
    var nums=line.match(/-?\d[\d,.]*/g);if(!nums)continue;
    var cn=[];for(var j=0;j<nums.length;j++){if(nums[j]!==dm[1]&&nums[j]!==dm[2]&&nums[j]!==dm[3]&&nums[j]!==dd&&nums[j]!==mm&&nums[j]!==yy)cn.push(nums[j]);}
    if(cn.length<4)continue;
    var dn='';var keys=Object.keys(D2P);for(var k=0;k<keys.length;k++){if(line.toLowerCase().indexOf(keys[k].toLowerCase())>=0){dn=D2P[keys[k]];break;}}
    if(!dn){var d=new Date(ds);dn=DPL_P[d.getDay()];}
    var n=[];for(var j=0;j<cn.length;j++)n.push(si(cn[j]));
    res.push({date:ds,day:dn,guests:n[0]||0,morn:n[1]||0,arr:n[2]||0,dep:n[3]||0,eve:n[4]||0});
  }
  return res;
}

async function parseCancel(file){
  var txt=await exTxt(file);var lines=txt.split('\n');var res=[];
  for(var i=0;i<lines.length;i++){
    var line=lines[i].trim();if(!line)continue;
    var cm=line.match(/\b(\d{5,7})\b/);if(!cm)continue;
    var ctx='';for(var j=Math.max(0,i-2);j<Math.min(lines.length,i+3);j++)ctx+=lines[j]+' ';
    var dates=ctx.match(/(\d{1,2}\.\d{1,2}\.\d{2,4})/g)||[];
    var amts=ctx.match(/[\d,]+\.\d{2}/g)||[];
    var nm=ctx.match(/([A-Z][a-z]+\s*,\s*[A-Z][a-z]+)/);
    var rts=['DEL','DELOB','APOB','APM','STDO','STDB','SUI','FAM','STBB'];
    var rt='-';for(var k=0;k<rts.length;k++){if(ctx.indexOf(rts[k])>=0){rt=rts[k];break;}}
    var rsns=['REL','TRIP','NOSHOW','RATE','OTHER','DUPL'];
    var reason='-';for(var k=0;k<rsns.length;k++){if(ctx.indexOf(rsns[k])>=0){reason=rsns[k];break;}}
    res.push({confNo:cm[1],name:nm?nm[1]:'-',roomType:rt,arrDate:dates[0]||'-',cancelDate:dates.length>1?dates[1]:dates[0]||'-',leadTime:0,rms:1,nts:0,mkt:'-',rate:'-',rateAmt:amts.length?sf(amts[0]):0,revLoss:amts.length>1?sf(amts[1]):0,deposit:amts.length>2?sf(amts[2]):0,reason:reason,reasonDesc:reason});
  }
  return res;
}

async function parseRotb(file){
  var txt=await exTxt(file);var lines=txt.split('\n');
  var mN={March:'Marzec',April:'Kwiecien',May:'Maj',June:'Czerwiec',July:'Lipiec',August:'Sierpien',September:'Wrzesien',October:'Pazdziernik',November:'Listopad',December:'Grudzien',January:'Styczen',February:'Luty'};
  var mI={March:2,April:3,May:4,June:5,July:6,August:7,September:8,October:9,November:10,December:11,January:0,February:1};
  var res=[],cur=null,days=[];
  for(var i=0;i<lines.length;i++){
    var line=lines[i].trim();if(!line)continue;
    var keys=Object.keys(mN);
    for(var k=0;k<keys.length;k++){
      if(line.indexOf(keys[k])>=0){
        if(cur)res.push({month:cur.month,monthIdx:cur.monthIdx,year:cur.year,totalRooms:cur.totalRooms,occPct:cur.occPct,lyOccPct:cur.lyOccPct,revenue:cur.revenue,adr:cur.adr,daily:days.slice()});
        var yr=mI[keys[k]]<=1?2027:2026;
        cur={month:mN[keys[k]]+' '+yr,monthIdx:mI[keys[k]],year:yr,totalRooms:0,occPct:0,lyOccPct:0,revenue:0,adr:0};days=[];break;
      }
    }
    var pcts=line.match(/([\d.]+)%/g);
    if(pcts&&pcts.length>=2&&cur){
      var nums=line.match(/[\d,.]+/g);
      if(nums&&nums.length>=2){
        cur.totalRooms=si(nums[1]||nums[0]);
        var pv=[];for(var j=0;j<pcts.length;j++)pv.push(sf(pcts[j]));
        if(pv.length>=4){cur.occPct=pv[2];cur.lyOccPct=pv[3];}
        else if(pv.length>=2){cur.occPct=pv[0];cur.lyOccPct=pv[1];}
        var big=[];for(var j=0;j<nums.length;j++){if(sf(nums[j])>1000)big.push(nums[j]);}
        if(big.length>=2){cur.revenue=sf(big[big.length-2]);cur.adr=sf(big[big.length-1]);}
      }
    }
    if(/^\d{1,3}$/.test(line)&&cur)days.push(si(line));
  }
  if(cur)res.push({month:cur.month,monthIdx:cur.monthIdx,year:cur.year,totalRooms:cur.totalRooms,occPct:cur.occPct,lyOccPct:cur.lyOccPct,revenue:cur.revenue,adr:cur.adr,daily:days.slice()});
  return res;
}
