// ===== PDF TEXT EXTRACTION =====
async function exTxt(file){
  const buf=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  let txt='';
  for(let i=1;i<=pdf.numPages;i++){
    const pg=await pdf.getPage(i);
    const c=await pg.getTextContent();
    const it=c.items;
    it.sort((a,b)=>{
      const dy=b.transform[5]-a.transform[5];
      if(Math.abs(dy)>3)return dy;
      return a.transform[4]-b.transform[4];
    });
    let ly=null;
    it.forEach(item=>{
      const y=Math.round(item.transform[5]);
      if(ly!==null&&Math.abs(y-ly)>3)txt+='\n';
      else if(ly!==null)txt+=' ';
      txt+=item.str;ly=y;
    });
    txt+='\n';
  }
  return txt;
}

const D2P={Mon:'Pon.',Tue:'Wt.',Wed:'Śr.',Thu:'Czw.',Fri:'Pt.',Sat:'Sob.',Sun:'Niedz.',Monday:'Pon.',Tuesday:'Wt.',Wednesday:'Śr.',Thursday:'Czw.',Friday:'Pt.',Saturday:'Sob.',Sunday:'Niedz.'};
const DPL_P=['Niedz.','Pon.','Wt.','Śr.','Czw.','Pt.','Sob.'];

function si(v){const n=parseInt(String(v).replace(/[^\d-]/g,''));return isNaN(n)?0:n;}
function sf(v){const n=parseFloat(String(v).replace(/[^\d.,-]/g,'').replace(',','.'));return isNaN(n)?0:n;}

// ===== PARSE PACKAGE FORECAST =====
async function parsePkg(file){
  const txt=await exTxt(file);
  const lines=txt.split('\n').map(l=>l.trim()).filter(l=>l);
  const res=[];let dc=0;
  for(const line of lines){
    const dm=line.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
    if(!dm)continue;
    let dd=dm[1].padStart(2,'0'),mm=dm[2].padStart(2,'0'),yy=dm[3];
    if(yy.length===2)yy='20'+yy;
    const ds=yy+'-'+mm+'-'+dd;
    const nums=line.match(/-?\d[\d,.]*/g);
    if(!nums)continue;
    const cn=nums.filter(n=>n!==dm[1]&&n!==dm[2]&&n!==dm[3]&&n!==dd&&n!==mm&&n!==yy);
    if(cn.length<6)continue;
    let dn='';
    for(const[e,p]of Object.entries(D2P))if(line.toLowerCase().includes(e.toLowerCase())){dn=p;break;}
    if(!dn){const d=new Date(ds);dn=DPL_P[d.getDay()];}
    dc++;const n=cn.map(v=>si(v));
    res.push({d:dc,date:ds,day:dn,occ:n[0]||0,adu:n[1]||0,ch:n[2]||0,arrP:n[3]||0,depP:n[4]||0,arrR:n[5]||0,depR:n[6]||0,bfk:n[7]||0,din:n[8]||0,lun:n[9]||0,wst:n.length>=12?n[10]||0:0,total:n[n.length-1]||0});
  }
  return res;
}

// ===== PARSE HOUSEKEEPING =====
async function parseHsk(file){
  const txt=await exTxt(file);
  const lines=txt.split('\n').map(l=>l.trim()).filter(l=>l);
  const res=[];
  for(const line of lines){
    const dm=line.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
    if(!dm)continue;
    let dd=dm[1].padStart(2,'0'),mm=dm[2].padStart(2,'0'),yy=dm[3];
    if(yy.length===2)yy='20'+yy;
    const ds=yy+'-'+mm+'-'+dd;
    const nums=line.match(/-?\d[\d,.]*/g);
    if(!nums)continue;
    const cn=nums.filter(n=>n!==dm[1]&&n!==dm[2]&&n!==dm[3]&&n!==dd&&n!==mm&&n!==yy);
    if(cn.length<4)continue;
    let dn='';
    for(const[e,p]of Object.entries(D2P))if(line.toLowerCase().includes(e.toLowerCase())){dn=p;break;}
    if(!dn){const d=new Date(ds);dn=DPL_P[d.getDay()];}
    const n=cn.map(v=>si(v));
    res.push({date:ds,day:dn,guests:n[0]||0,morn:n[1]||0,arr:n[2]||0,dep:n[3]||0,eve:n[4]||0});
  }
  return res;
}

// ===== PARSE CANCELLATIONS =====
async function parseCancel(file){
  const txt=await exTxt(file);
  const lines=txt.split('\n');
  const res=[];
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();if(!line)continue;
    const confMatch=line.match(/\b(\d{5,7})\b/);
    if(!confMatch)continue;
    const ctx=lines.slice(Math.max(0,i-2),i+3).join(' ');
    const dates=ctx.match(/(\d{1,2}\.\d{1,2}\.\d{2,4})/g)||[];
    const amts=ctx.match(/[\d,]+\.\d{2}/g)||[];
    const nameMatch=ctx.match(/([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s*,\s*[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/);
    const roomTypes=['DEL','DELOB','APOB','APM','STDO','STDB','SUI','FAM','STBB','JUN'];
    let rt='-';for(const t of roomTypes)if(ctx.includes(t)){rt=t;break;}
    const reasons=['REL','TRIP','NOSHOW','RATE','OTHER','DUPL'];
    let reason='-';for(const r of reasons)if(ctx.includes(r)){reason=r;break;}
    res.push({confNo:confMatch[1],name:nameMatch?nameMatch[1]:'-',roomType:rt,arrDate:dates[0]||'-',cancelDate:dates.length>1?dates[1]:dates[0]||'-',leadTime:0,rms:1,nts:0,mkt:'-',rate:'-',rateAmt:amts.length?sf(amts[0]):0,revLoss:amts.length>1?sf(amts[1]):0,deposit:amts.length>2?sf(amts[2]):0,reason,reasonDesc:reason});
  }
  return res;
}

// ===== PARSE ROOMS ON THE BOOKS =====
async function parseRotb(file){
  const txt=await exTxt(file);
  const lines=txt.split('\n').map(l=>l.trim()).filter(l=>l);
  const mNames={March:'Marzec',April:'Kwiecień',May:'Maj',June:'Czerwiec',July:'Lipiec',August:'Sierpień',September:'Wrzesień',October:'Październik',November:'Listopad',December:'Grudzień',January:'Styczeń',February:'Luty'};
  const mIdx={March:2,April:3,May:4,June:5,July:6,August:7,September:8,October:9,November:10,December:11,January:0,February:1};
  const res=[];let cur=null,days=[];
  for(const line of lines){
    for(const[en,pl]of Object.entries(mNames)){
      if(line.includes(en)){
        if(cur)res.push({...cur,daily:[...days]});
        const yr=mIdx[en]<=1?2027:2026;
        cur={month:pl+' '+yr,monthIdx:mIdx[en],year:yr,totalRooms:0,occPct:0,lyOccPct:0,revenue:0,adr:0};
        days=[];break;
      }
    }
    const pcts=line.match(/([\d.]+)%/g);
    if(pcts&&pcts.length>=2&&cur){
      const nums=line.match(/[\d,.]+/g);
      if(nums&&nums.length>=2){
        cur.totalRooms=si(nums[1]||nums[0]);
        const pv=pcts.map(p=>sf(p));
        if(pv.length>=4){cur.occPct=pv[2];cur.lyOccPct=pv[3];}
        else if(pv.length>=2){cur.occPct=pv[0];cur.lyOccPct=pv[1];}
        const big=nums.filter(n=>sf(n)>1000);
        if(big.length>=2){cur.revenue=sf(big[big.length-2]);cur.adr=sf(big[big.length-1]);}
      }
    }
    if(/^\d{1,3}$/.test(line)&&cur)days.push(si(line));
  }
  if(cur)res.push({...cur,daily:[...days]});
  return res;
}
