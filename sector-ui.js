let mapMode='ensemble';
const sectorEl=$('#sector');

// Transformations affines pour chaque vue
const BANTIGNY_TRANSFORM=affine([[279,72],[1185,830],[120,250]],[[530,492],[595,564],[514,518]].map(p=>project(PLAN_TRANSFORM,p)));
const CLEAN_VIEWS={
  haussy:{file:'haussy-sans-voitures.png',name:'Avenue de Haussy',matrix:affine([[150/1032,120/830],[930/1032,670/830],[650/1032,320/830]],[[407,381],[529,475],[489,400]].map(p=>project(PLAN_TRANSFORM,p)))},
  souvenir:{file:'souvenir-sans-voitures.png',name:'Square du Souvenir',matrix:affine([[110/518,605/697],[390/518,20/697],[300/518,565/697]],[[407,381],[472,290],[445,390]].map(p=>project(PLAN_TRANSFORM,p)))},
  deschamps:{file:'deschamps-sans-voitures.png',name:'Rue Deschamps',matrix:affine([[487/1024,79/724],[813/1024,318/724],[931/1024,709.5/724]],[[288.1,272.0],[409.4,378.3],[456.2,542.6]].map(p=>project(PLAN_TRANSFORM,p)))},
  deschamps_plan:{file:'deschamps-plan.png',name:'Rue Deschamps (Plan)',matrix:affine([[487/1024,79/724],[813/1024,318/724],[931/1024,709.5/724]],[[288.1,272.0],[409.4,378.3],[456.2,542.6]].map(p=>project(PLAN_TRANSFORM,p)))},
  delfosse:{file:'delfosse-sans-voitures.png',name:'Rue Delfosse',matrix:affine([[546/1024,90/724],[364/1024,350/724],[523/1024,557/724]],[[431.3,146.6],[297.1,336.5],[414.1,487.9]].map(p=>project(PLAN_TRANSFORM,p)))}
};

function globalToMap(p){
  const cv=CLEAN_VIEWS[mapMode];
  if(cv){const q=unproject(cv.matrix,p);return [q[0]*map.naturalWidth,q[1]*map.naturalHeight]}
  if(mapMode==='bantigny')return unproject(BANTIGNY_TRANSFORM,p);
  if(mapMode==='gare')return unproject(GARE_TRANSFORM,p);
  if(mapMode==='sud')return unproject(SOUTH_TRANSFORM,p);
  return unproject(PLAN_TRANSFORM,p);
}

function mapToGlobal(p){
  const cv=CLEAN_VIEWS[mapMode];
  if(cv)return project(cv.matrix,[p[0]/map.naturalWidth,p[1]/map.naturalHeight]);
  if(mapMode==='bantigny')return project(BANTIGNY_TRANSFORM,p);
  if(mapMode==='gare')return project(GARE_TRANSFORM,p);
  if(mapMode==='sud')return project(SOUTH_TRANSFORM,p);
  return project(PLAN_TRANSFORM,p);
}

function pointOnMap(r){return globalToMap(globalPoint(r))}
function displayedCoordinates(r){const p=pointOnMap(r);return [p[0]/map.naturalWidth*100,p[1]/map.naturalHeight*100]}
function fromDisplayed(rue,x,y){return storedPoint(rue,mapToGlobal([x/100*map.naturalWidth,y/100*map.naturalHeight]))}

function commit(){return !window.ADMIN_MODE||(!window.isSaving&&(selected===null||!window.isUnlocked||!window.commitSelected||commitSelected()))}

function switchMap(mode){
  const cv=CLEAN_VIEWS[mode];
  let file='plan-clair.png',alt='Plan clair des dix secteurs de la brocante';
  if(cv){file=cv.file;alt=cv.name+' sans voitures, avec délimitation du secteur'}
  else if(mode==='bantigny'){file='place-bantigny-sans-voitures.png';alt='Place Édouard Bantigny sans voitures, avec délimitation du secteur'}
  else if(mode==='gare'){file='zone-gare-reference.png';alt='Vue détaillée de la Gare'}
  else if(mode==='sud'){file='plan-sud.png';alt='Grand-Rue et place Bantigny, partie sud'}

  const sameFile=map.getAttribute('src')===file;
  mapMode=mode;
  if(!sameFile){
    map.src=file;
    map.alt=alt;
    return true;
  }
  return false;
}

function getSectorTarget(id,mode){
  if(!id)return null;
  if(mode==='gare')return GARE_OUTLINES[id]||null;
  const s=SECTORS.find(x=>x.id===id);
  if(s){
    if(mode==='ensemble'&&CLEAN_ROUTES[id])return CLEAN_ROUTES[id];
    if(s.polygon)return s.polygon.map(p=>globalToMap(p));
    if(s.route||s.path)return (s.route||s.path).map(p=>globalToMap(s.route?project(PLAN_TRANSFORM,p):p));
  }
  if(mode==='bantigny'||CLEAN_VIEWS[mode]){
    return [[0,0],[map.naturalWidth||1000,map.naturalHeight||800]];
  }
  return null;
}

function getVisibleBounds(){
  const legendVisible=legend&&getComputedStyle(legend).display!=='none';
  const left=legendVisible?legend.offsetLeft+legend.offsetWidth+24:24;
  const panel=$('.panel');
  const panelVisible=panel&&getComputedStyle(panel).display!=='none';
  const right=(window.ADMIN_MODE&&view.clientWidth>700&&panelVisible)?panel.offsetWidth+36:24;
  const top=32;
  const bottom=(window.ADMIN_MODE&&view.clientWidth<=700&&panelVisible)?panel.offsetHeight+80:96;
  const w=Math.max(100,view.clientWidth-left-right);
  const h=Math.max(100,view.clientHeight-top-bottom);
  return {left,right,top,bottom,w,h};
}

fit=function(){
  if(!map.naturalWidth)return;
  const b=getVisibleBounds();
  const pts=getSectorTarget(sectorEl.value,mapMode);
  if(pts&&pts.length){
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
    const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    const pad=70;
    sc=Math.min(max,b.w/(x1-x0+pad),b.h/(y1-y0+pad));
    if(mapMode==='ensemble')sc=Math.min(sc,2.5);
    else if(mapMode==='gare')sc=Math.min(sc,1.8);
    min=Math.min(view.clientWidth/map.naturalWidth,view.clientHeight/map.naturalHeight)*0.65;
    tx=b.left+b.w/2-(x0+x1)/2*sc;
    ty=b.top+b.h/2-(y0+y1)/2*sc;
  }else{
    sc=Math.min(b.w/map.naturalWidth,b.h/map.naturalHeight);
    min=sc*0.65;
    tx=b.left+(b.w-map.naturalWidth*sc)/2;
    ty=b.top+(b.h-map.naturalHeight*sc)/2;
  }
  transform();
};
window.onresize=fit;

function drawZones(){
  const svg=$('#zones'),ns='http://www.w3.org/2000/svg';
  svg.innerHTML='';
  svg.setAttribute('width',map.naturalWidth);
  svg.setAttribute('height',map.naturalHeight);
  svg.setAttribute('viewBox',`0 0 ${map.naturalWidth} ${map.naturalHeight}`);
  svg.style.overflow='hidden';
  if(legend){
    legend.querySelectorAll('button').forEach(b=>{
      b.classList.toggle('active',b.dataset.sector===sectorEl.value);
      b.setAttribute('aria-pressed',String(b.dataset.sector===sectorEl.value));
    });
  }
  if(!map.naturalWidth)return;
  for(const s of SECTORS){
    const active=!sectorEl.value||sectorEl.value===s.id;
    const g=document.createElementNS(ns,'g');
    const outline = (mapMode==='ensemble'&&CLEAR_OUTLINES[s.id]) || (s.polygon ? s.polygon.map(p=>globalToMap(p)) : null);
    if(outline && outline.length){
      const d = outline.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')+' Z';
      const halo=document.createElementNS(ns,'path');
      halo.setAttribute('d',d);
      halo.setAttribute('fill','none');
      halo.setAttribute('stroke','#fff');
      halo.setAttribute('stroke-width',sectorEl.value&&active?'3.5':'0');
      halo.setAttribute('stroke-opacity',sectorEl.value&&active?'.85':'0');
      halo.setAttribute('stroke-linejoin','round');
      halo.classList.add('sector-halo');

      const poly=document.createElementNS(ns,'path');
      poly.setAttribute('d',d);
      poly.dataset.sector=s.id;
      poly.setAttribute('fill',s.color);
      poly.setAttribute('fill-opacity',sectorEl.value&&active?'.28':'0');
      poly.setAttribute('stroke','#38bdf8');
      poly.setAttribute('stroke-width',sectorEl.value&&active?'1.5':'0');
      poly.setAttribute('stroke-opacity',sectorEl.value&&active?'.85':'0');
      poly.setAttribute('stroke-linejoin','round');
      poly.classList.add('sector-poly');

      g.style.pointerEvents=sectorEl.value&&active?'all':'stroke';
      g.append(halo,poly);
    }else{
      const points=(s.route||s.path).map(p=>globalToMap(s.route?project(PLAN_TRANSFORM,p):p));
      const width=s.routeWidth||s.width;
      const d=points.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
      const halo=document.createElementNS(ns,'path');
      const band=document.createElementNS(ns,'path');
      for(const p of [halo,band]){
        p.setAttribute('d',d);
        p.setAttribute('fill','none');
        p.setAttribute('stroke-linecap','round');
        p.setAttribute('stroke-linejoin','round');
      }
      halo.classList.add('sector-halo');
      halo.setAttribute('stroke','#fff');
      halo.setAttribute('stroke-width',sectorEl.value&&active?'4':'0');
      halo.setAttribute('stroke-opacity',sectorEl.value&&active?'.85':'0');
      band.classList.add('sector-band');
      band.dataset.sector=s.id;
      band.setAttribute('stroke','#38bdf8');
      band.setAttribute('stroke-width',sectorEl.value&&active?'2':'0');
      band.setAttribute('stroke-opacity',sectorEl.value&&active?'.85':'0');
      g.style.pointerEvents='stroke';
      g.append(halo,band);
    }
    const title=document.createElementNS(ns,'title');
    title.textContent=s.name;
    g.append(title);
    g.setAttribute('role','button');
    g.setAttribute('tabindex','0');
    g.setAttribute('aria-label',s.name);
    g.onclick=e=>{e.stopPropagation();chooseSector(s.id)};
    g.onpointerdown=e=>e.stopPropagation();
    g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseSector(s.id)}};

    if(window.ADMIN_MODE && window.sectorEditMode && sectorEl.value===s.id){
      const pts = (mapMode==='ensemble'&&CLEAR_OUTLINES[s.id]) || (outline&&outline.length?outline:null);
      if(pts){
        pts.forEach((p,idx)=>{
          const circle=document.createElementNS(ns,'circle');
          circle.setAttribute('cx',p[0].toFixed(1));
          circle.setAttribute('cy',p[1].toFixed(1));
          circle.setAttribute('r','8');
          circle.setAttribute('fill','#38bdf8');
          circle.setAttribute('stroke','#ffffff');
          circle.setAttribute('stroke-width','2.5');
          circle.style.cursor='move';
          circle.style.pointerEvents='all';
          circle.onpointerdown=e=>{
            e.stopPropagation();
            e.preventDefault();
            try{circle.setPointerCapture(e.pointerId)}catch(_){}
            const move=ev=>{
              const rect=view.getBoundingClientRect();
              const mapX=(ev.clientX-rect.left-tx)/sc;
              const mapY=(ev.clientY-rect.top-ty)/sc;
              if(mapMode==='ensemble'&&CLEAR_OUTLINES[s.id]){
                CLEAR_OUTLINES[s.id][idx]=[Number(mapX.toFixed(1)),Number(mapY.toFixed(1))];
                s.polygon=CLEAR_OUTLINES[s.id].map(pt=>project(PLAN_TRANSFORM,pt));
              }else if(s.path){
                s.path[idx]=[Number(mapX.toFixed(1)),Number(mapY.toFixed(1))];
              }
              drawZones();
              if(window.updateSectorCodeBox)window.updateSectorCodeBox();
            };
            const up=()=>{
              window.removeEventListener('pointermove',move);
              window.removeEventListener('pointerup',up);
              window.removeEventListener('pointercancel',up);
            };
            window.addEventListener('pointermove',move);
            window.addEventListener('pointerup',up);
            window.addEventListener('pointercancel',up);
          };
          g.append(circle);
        });
      }
    }

    svg.append(g);
  }
}

render=function(){
  markers.innerHTML='';
  if(!window.ADMIN_MODE&&typeof isConstructionMode==='function'&&isConstructionMode()){
    markers.classList.add('hidden');
    drawZones();
    return;
  }
  markers.classList.remove('hidden');
  rows.forEach((r,i)=>{
    if(r.emplacement==='__SITE_MODE__')return;
    const sec=sectorFor(r.rue),p=pointOnMap(r),m=document.createElement('button');
    m.type='button';
    m.className='marker'+(window.ADMIN_MODE?' admin-marker':'')+(i===selected?' selected':'');
    m.dataset.index=i;
    m.hidden=!!sectorEl.value&&sec?.id!==sectorEl.value||p[0]<0||p[1]<0||p[0]>map.naturalWidth||p[1]>map.naturalHeight;
    m.style.left=p[0]+'px';
    m.style.top=p[1]+'px';
    m.style.backgroundColor=i===selected?'#ef4444':sec?.color||'#7c3aed';
    m.textContent=r.emplacement;
    m.setAttribute('aria-label',`${r.emplacement} — ${sec?.name||r.rue}`);
    const tip=document.createElement('span');
    tip.className='tip';
    tip.textContent=r.emplacement+' — '+(sec?.name||r.rue);
    m.append(tip);
    m.onpointerdown=e=>markerDown(e,i);
    m.onclick=e=>{e.stopPropagation();selectRow(i)};
    markers.append(m);
  });
  drawZones();
};

selectRow=function(i,center=false){
  if(!commit())return;
  const r=rows[i],sec=sectorFor(r.rue);
  if(sectorEl.value&&sectorEl.value!==sec?.id){
    sectorEl.value=sec?.id||'';
    sectorEl.dataset.previous=sectorEl.value;
  }
  const p=pointOnMap(r);
  if(p[0]<0||p[1]<0||p[0]>map.naturalWidth||p[1]>map.naturalHeight){
    let targetMode='ensemble';
    if(sec?.id==='bantigny')targetMode='bantigny';
    else if(CLEAN_VIEWS[sec?.id])targetMode=sec.id;
    else if(sec?.legacy)targetMode='gare';
    switchMap(targetMode);
    map.addEventListener('load',()=>selectRow(i,center),{once:true});
    return;
  }
  selected=i;
  render();
  if(center){
    sc=Math.max(sc,Math.min(max,3.2));
    const b=getVisibleBounds();
    tx=b.left+b.w/2-p[0]*sc;
    ty=b.top+b.h/2-p[1]*sc;
    transform();
  }
  if(window.ADMIN_MODE){fillForm(r);return}
  $('#info').style.display='block';
  $('#iid').textContent=r.emplacement;
  $('#irue').textContent=sec?.name||r.rue;
  $('#inom').textContent=r.nom?'Exposant : '+r.nom:'';
  $('#idim').textContent=r.dimension?'Dimension : '+r.dimension:'';
  $('#istat').textContent=r.statut?'Statut : '+r.statut:'';
};

markerDown=function(e,i){
  e.stopPropagation();
  selectRow(i);
  if(!window.ADMIN_MODE||!window.isUnlocked||window.isSaving||selected!==i)return;
  e.preventDefault();
  const move=ev=>{
    const rect=view.getBoundingClientRect(),q=storedPoint(rows[i].rue,mapToGlobal([(ev.clientX-rect.left-tx)/sc,(ev.clientY-rect.top-ty)/sc]));
    if(q.some(n=>!Number.isFinite(n)||n<0||n>100))return;
    rows[i].x_pct=q[0];
    rows[i].y_pct=q[1];
    const p=pointOnMap(rows[i]),m=markers.children[i];
    m.style.left=p[0]+'px';
    m.style.top=p[1]+'px';
    fillCoordinates(rows[i]);
    markDirty();
  };
  const up=()=>{
    window.removeEventListener('pointermove',move);
    window.removeEventListener('pointerup',up);
    window.removeEventListener('pointercancel',up);
  };
  window.addEventListener('pointermove',move);
  window.addEventListener('pointerup',up);
  window.addEventListener('pointercancel',up);
};

function chooseSector(id){
  if(!commit()){sectorEl.value=sectorEl.dataset.previous||'';return}
  sectorEl.value=id;
  sectorEl.dataset.previous=id;
  selected=null;
  if(window.resetSelection)resetSelection();
  if($('#info'))$('#info').style.display='none';

  const sec=SECTORS.find(s=>s.id===id);
  let targetMode='ensemble';
  if(id==='bantigny')targetMode='bantigny';
  else if(CLEAN_VIEWS[id])targetMode=id;
  else if(sec?.legacy)targetMode='gare';

  const changed=switchMap(targetMode);
  $('#sectorNote').textContent=sec?sec.name+(sec.note?' · '+sec.note:''):'10 secteurs · Choisissez un secteur pour voir ses emplacements';
  render();

  if(!changed&&map.complete&&map.naturalWidth){
    fit();
  }
}

// Initialisation des options de secteurs
SECTORS.forEach(s=>{
  const o=document.createElement('option');
  o.value=s.id;
  o.textContent=s.name;
  sectorEl.append(o);
});
sectorEl.onchange=()=>chooseSector(sectorEl.value);

// Options de vues détaillées dans le sélecteur
const bantignyOption=document.createElement('option');
bantignyOption.value='bantigny';
bantignyOption.textContent='Détail place Bantigny';
$('#baseMap').append(bantignyOption);

for(const [id,v] of Object.entries(CLEAN_VIEWS)){
  const o=document.createElement('option');
  o.value=id;
  o.textContent='Détail '+v.name;
  $('#baseMap').append(o);
}

$('#baseMap').onchange=e=>{
  if(!commit()){e.target.value=mapMode;return}
  switchMap(e.target.value);
  if(window.ADMIN_MODE&&selected!==null)map.addEventListener('load',()=>fillCoordinates(rows[selected]),{once:true});
};

map.onload=()=>{
  $('#baseMap').value=mapMode;
  render();
  fit();
  if(window.ADMIN_MODE&&selected!==null)fillCoordinates(rows[selected]);
};

$('#fit').onclick=()=>{if(commit())chooseSector('')};

view.onwheel=e=>{
  if(e.target.closest('.panel'))return;
  e.preventDefault();
  const r=view.getBoundingClientRect();
  zoom(e.deltaY<0?1.12:.89,e.clientX-r.left,e.clientY-r.top);
};

// Légende latérale des secteurs
const legend=document.createElement('nav');
legend.className='sector-legend';
legend.setAttribute('aria-label','Choisir un secteur');
const legendTitle=document.createElement('strong');
legendTitle.textContent='Les secteurs';
legend.append(legendTitle);
for(const s of SECTORS){
  const b=document.createElement('button');
  b.type='button';
  b.dataset.sector=s.id;
  b.style.setProperty('--sector-color',s.color);
  b.textContent=s.name;
  b.onclick=()=>chooseSector(s.id);
  legend.append(b);
}
legend.onpointerdown=e=>e.stopPropagation();
view.append(legend);

switchMap('ensemble');
if(map.complete&&map.naturalWidth){
  render();
  fit();
}
