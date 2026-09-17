// Repère commun, sans modifier les coordonnées historiques de la feuille.
const MAP_W=979,MAP_H=940;
function affine(src,dst){const [p,q,r]=src,[a,b,c]=dst,det=(q[0]-p[0])*(r[1]-p[1])-(r[0]-p[0])*(q[1]-p[1]);const u=((b[0]-a[0])*(r[1]-p[1])-(c[0]-a[0])*(q[1]-p[1]))/det,v=((c[0]-a[0])*(q[0]-p[0])-(b[0]-a[0])*(r[0]-p[0]))/det,s=((b[1]-a[1])*(r[1]-p[1])-(c[1]-a[1])*(q[1]-p[1]))/det,t=((c[1]-a[1])*(q[0]-p[0])-(b[1]-a[1])*(r[0]-p[0]))/det;return [u,s,v,t,a[0]-u*p[0]-v*p[1],a[1]-s*p[0]-t*p[1]]}
function project(m,p){return [m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]]}
function unproject(m,p){const d=m[0]*m[3]-m[1]*m[2],x=p[0]-m[4],y=p[1]-m[5];return [(m[3]*x-m[2]*y)/d,(-m[1]*x+m[0]*y)/d]}
const GARE_TRANSFORM=affine([[230,98],[1185,713],[535,946]],[[612,94],[939,316],[700,356]]);
const SOUTH_TRANSFORM=affine([[733,72],[800,180],[338,580]],[[782,508],[801,580],[533,833]]);
const SECTORS=[
 {id:'gare',name:'Place de la Gare',color:'#a855f7',legacy:true,path:[[613,95],[680,157],[727,203],[800,251],[941,316]],width:24,center:[730,207]},
 {id:'brichant',name:'Rue Brichant',color:'#f97316',legacy:true,path:[[752,265],[734,300],[711,343],[700,356]],width:15,center:[728,310]},
 {id:'marais',name:'Marais Sainte-Catherine',color:'#22d3ee',legacy:true,path:[[560,277],[638,249]],width:14,center:[599,263]},
 {id:'catherine',name:'Rue Sainte-Catherine',color:'#facc15',path:[[604,197],[647,279],[691,362],[724,414],[782,476]],width:15,center:[698,373]},
 {id:'delfosse',name:'Rue Delfosse',color:'#38bdf8',path:[[607,187],[550,254],[500,388],[451,480],[510,570],[576,650],[633,709]],width:14,center:[494,403]},
 {id:'deschamps',name:'Rue Deschamps',color:'#fb7185',path:[[518,362],[601,420],[645,452],[591,512],[620,561],[666,602],[780,511]],width:14,center:[627,453]},
 {id:'souvenir',name:'Square du Souvenir',color:'#4ade80',path:[[699,356],[671,395],[645,451]],width:19,center:[671,398]},
 {id:'haussy',name:'Avenue de Haussy',color:'#e879f9',path:[[645,452],[702,464],[752,489],[780,511]],width:23,center:[712,477]},
 {id:'bantigny',name:'Place Édouard Bantigny',color:'#fbbf24',path:[[773,550],[817,575],[852,609]],width:30,center:[817,580]},
 {id:'grandrue',name:'Grand-Rue',color:'#a3e635',path:[[942,316],[897,395],[822,486],[779,531],[731,590],[659,670],[590,754],[533,833]],width:16,center:[760,552],note:'Du carrefour avenue Albert Ier jusqu’en haut de la rampe de la Gare.'}
];
function sectorFor(rue){const s=String(rue||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');if(s.includes('rampe')||s.includes('placedelagare')||s==='gare')return SECTORS[0];for(const [word,id] of [['brichant',1],['marais',2],['catherine',3],['delfosse',4],['deschamps',5],['dechamps',5],['souvenir',6],['haussy',7],['bantigny',8],['grandrue',9]])if(s.includes(word))return SECTORS[id];return null}
function globalPoint(r){return sectorFor(r.rue)?.legacy?project(GARE_TRANSFORM,[r.x_pct*1402/100,r.y_pct*1122/100]):[r.x_pct*MAP_W/100,r.y_pct*MAP_H/100]}
function storedPoint(rue,p){const legacy=sectorFor(rue)?.legacy,q=legacy?unproject(GARE_TRANSFORM,p):p;return [q[0]/(legacy?1402:MAP_W)*100,q[1]/(legacy?1122:MAP_H)*100]}
