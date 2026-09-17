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
// Contours de l’espace de rue : bords distincts, renfoncements et carrefours.
// Les trois contours historiques sont reportés du fond détaillé sans changer
// la projection des marqueurs. Les autres sont tracés sur les vues fournies.
const GARE_OUTLINES={
 gare:[[230,98],[267,136],[365,182],[375,210],[426,246],[422,263],[575,330],[585,320],[782,468],[1045,580],[1065,570],[1180,667],[1197,652],[1210,670],[1182,722],[1169,740],[690,518],[679,525],[552,434],[534,403],[507,404],[399,313],[389,294],[338,261],[330,270],[280,231],[267,238],[167,164]],
 brichant:[[688,540],[718,559],[555,966],[518,947]],
 marais:[[494,389],[522,413],[272,584],[243,551]]
};
const STREET_OUTLINES={
 catherine:[[598,202],[610,195],[625,221],[633,238],[643,252],[657,280],[661,293],[678,322],[690,341],[700,355],[711,374],[723,389],[734,407],[749,426],[768,450],[790,470],[779,481],[758,459],[741,439],[723,418],[711,402],[696,381],[686,367],[678,346],[663,321],[650,297],[644,281],[629,255],[620,243],[615,226]],
 delfosse:[[599,182],[615,190],[588,222],[567,251],[558,277],[548,310],[534,341],[522,370],[509,396],[492,429],[477,460],[463,478],[467,489],[486,521],[502,541],[521,566],[542,592],[560,612],[577,637],[600,665],[641,704],[627,717],[586,677],[565,650],[548,627],[529,604],[507,580],[492,557],[474,535],[460,513],[445,490],[440,479],[448,457],[464,432],[480,403],[494,375],[506,349],[516,327],[528,297],[539,272],[542,251],[560,225],[581,203]],
 deschamps:[[523,351],[546,367],[564,384],[588,399],[606,410],[628,428],[650,443],[660,451],[650,463],[631,481],[614,499],[602,514],[612,532],[629,550],[648,571],[666,589],[687,572],[709,553],[732,533],[754,514],[773,499],[787,514],[767,530],[744,549],[721,570],[701,587],[678,607],[665,616],[650,604],[630,583],[610,563],[596,548],[583,528],[579,512],[589,497],[607,479],[626,461],[634,451],[613,439],[590,422],[568,410],[548,394],[530,378],[511,366]],
 souvenir:[[692,358],[704,365],[691,385],[684,400],[674,416],[662,437],[650,451],[639,444],[649,424],[661,405],[671,390],[679,374]],
 haussy:[[653,451],[668,448],[692,450],[715,461],[729,467],[747,475],[771,491],[788,506],[778,520],[757,507],[737,494],[715,483],[697,477],[677,470],[655,470],[643,463]],
 bantigny:[[776,535],[797,546],[814,555],[836,574],[855,594],[865,605],[852,621],[838,609],[826,597],[812,584],[794,575],[779,565],[766,550]],
 grandrue:[[932,314],[950,321],[936,349],[919,378],[900,406],[882,427],[861,451],[839,479],[821,499],[801,523],[783,546],[758,575],[743,595],[723,618],[702,642],[680,667],[660,692],[638,718],[618,740],[598,765],[577,789],[556,816],[542,841],[524,829],[537,806],[558,780],[579,754],[600,730],[619,708],[641,682],[661,658],[682,634],[702,609],[722,586],[741,562],[763,537],[782,514],[801,491],[822,468],[842,443],[864,418],[883,396],[901,369],[916,340]]
};
for(const s of SECTORS)s.polygon=GARE_OUTLINES[s.id]?GARE_OUTLINES[s.id].map(p=>project(GARE_TRANSFORM,p)):STREET_OUTLINES[s.id];
function sectorFor(rue){const s=String(rue||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');if(s.includes('rampe')||s.includes('placedelagare')||s==='gare')return SECTORS[0];for(const [word,id] of [['brichant',1],['marais',2],['catherine',3],['delfosse',4],['deschamps',5],['dechamps',5],['souvenir',6],['haussy',7],['bantigny',8],['grandrue',9]])if(s.includes(word))return SECTORS[id];return null}
function globalPoint(r){return sectorFor(r.rue)?.legacy?project(GARE_TRANSFORM,[r.x_pct*1402/100,r.y_pct*1122/100]):[r.x_pct*MAP_W/100,r.y_pct*MAP_H/100]}
function storedPoint(rue,p){const legacy=sectorFor(rue)?.legacy,q=legacy?unproject(GARE_TRANSFORM,p):p;return [q[0]/(legacy?1402:MAP_W)*100,q[1]/(legacy?1122:MAP_H)*100]}
