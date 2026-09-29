const fields={emplacement:$('#f_emplacement'),nom:$('#f_nom'),rue:$('#f_rue'),dimension:$('#f_dimension'),statut:$('#f_statut'),x_pct:$('#f_x'),y_pct:$('#f_y')};
let dirty=false;window.isSaving=false;window.adminToken=null;
function markDirty(){dirty=true;$('#dirty').textContent='Modifications non sauvegardées sur Google.';statusEl.textContent='Modifications locales — cliquez sur Sauvegarder sur Google.'}
window.hasDraft=()=>dirty;
function resetEditor(){dirty=false;$('#dirty').textContent='Aucune modification en attente.';$('#editor').classList.add('hidden');$('#empty').classList.remove('hidden')}
function fillCoordinates(r){const p=displayedCoordinates(r);fields.x_pct.value=p[0].toFixed(6);fields.y_pct.value=p[1].toFixed(6)}
function fillForm(r){if(!window.isUnlocked)return;$('#empty').classList.add('hidden');$('#editor').classList.remove('hidden');Object.entries(fields).forEach(([k,el])=>{if(!['x_pct','y_pct'].includes(k))el.value=r[k]||''});fillCoordinates(r)}
window.resetSelection=()=>{$('#editor').classList.add('hidden');$('#empty').classList.remove('hidden')};
function applyForm(){if(selected===null)return true;if(!$('#editor').reportValidity())return false;const next={};Object.entries(fields).forEach(([k,el])=>next[k]=['x_pct','y_pct'].includes(k)?Number(el.value):el.value.trim());const old=rows[selected],shown=displayedCoordinates(old);let p=fromDisplayed(next.rue,next.x_pct,next.y_pct);if(old.rue===next.rue&&Math.abs(shown[0]-next.x_pct)<.000001&&Math.abs(shown[1]-next.y_pct)<.000001)p=[old.x_pct,old.y_pct];next.x_pct=p[0];next.y_pct=p[1];if(!validRow(next)){statusEl.textContent='Position hors du repère de ce secteur. Choisissez une position dans sa zone.';return false}if(rows.some((r,i)=>i!==selected&&r.emplacement.toUpperCase()===next.emplacement.toUpperCase())){statusEl.textContent='Ce numéro existe déjà.';return false}if(Object.keys(next).some(k=>next[k]!==rows[selected][k])){rows[selected]=next;markDirty();render()}return true}
window.commitSelected=applyForm;
function getPublicMode(){const local=localStorage.getItem('brocante_construction_mode');if(local!==null)return local==='true';const cfg=rows.find(r=>r.emplacement==='__SITE_MODE__');if(cfg)return cfg.statut==='construction';return window.BROCANTE_CONFIG?.constructionMode!==false}
function setPublicMode(isConst){localStorage.setItem('brocante_construction_mode',isConst?'true':'false');let cfg=rows.find(r=>r.emplacement==='__SITE_MODE__');if(!cfg){cfg={emplacement:'__SITE_MODE__',nom:'',rue:'',dimension:'',statut:isConst?'construction':'normal',x_pct:-999,y_pct:-999};rows.push(cfg)}else{cfg.statut=isConst?'construction':'normal'}updateAdminToggleUI();markDirty()}
function updateAdminToggleUI(){const isConst=getPublicMode();[$('#toggleConstruction'),$('#togglePublicMode')].forEach(btn=>{if(!btn)return;btn.textContent=isConst?'Mode public : 🚧 En construction':'Mode public : ✅ Normal';btn.className='button toggle-construction '+(isConst?'is-construction':'is-normal')});const hint=$('#publicModeHint');if(hint){hint.textContent=isConst?'Actuellement : le public voit le bandeau « En construction ».':'Actuellement : le site public est ouvert avec recherche et emplacements.'}}
window.updateAdminToggleUI=updateAdminToggleUI;
window.sectorEditMode=false;
let isPlacingStallMode=false;
let isDrawingNewOutline=false;

function updateSectorCodeBox(){const secId=sectorEl.value||(CLEAN_VIEWS[mapMode]?mapMode:(mapMode==='gare'?'gare':'gare'));if(!secId)return;const box=$('#sectorCodeBox');if(!box)return;const sec=SECTORS.find(s=>s.id===secId);const raw=(mapMode==='gare'&&GARE_OUTLINES[secId])||CLEAR_OUTLINES[secId]||sec?.path||sec?.polygon;if(raw&&Array.isArray(raw)){const validPts=raw.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));box.value=`${secId}: `+JSON.stringify(validPts.map(p=>[Number(p[0].toFixed(1)),Number(p[1].toFixed(1))]))}}
window.updateSectorCodeBox=updateSectorCodeBox;
function syncSectorOutlinesToRows(){const jsonStr=window.getCompactSectorOutlinesJSON?window.getCompactSectorOutlinesJSON():JSON.stringify(CLEAR_OUTLINES);localStorage.setItem('brocante_sector_outlines',jsonStr);let cfg=rows.find(r=>r.emplacement==='__SECTOR_OUTLINES__');if(!cfg){cfg={emplacement:'__SECTOR_OUTLINES__',nom:'',rue:'',dimension:'',statut:'',x_pct:0,y_pct:0};rows.push(cfg)}cfg.nom=jsonStr.slice(0,200);cfg.rue=jsonStr.slice(200,400);cfg.dimension=jsonStr.slice(400,600);cfg.statut=jsonStr.slice(600,800);markDirty()}
window.syncSectorOutlinesToRows=syncSectorOutlinesToRows;

function setupSectorEditor(){
  const secSec=$('#sectorEditSection'),secCtrl=$('#sectorEditControls'),toggleBtn=$('#toggleSectorEdit'),addBtn=$('#addSectorPoint'),removeBtn=$('#removeSectorPoint'),copyBtn=$('#copySectorCode'),saveOutlinesBtn=$('#saveSectorOutlinesBtn'),redrawBtn=$('#redrawSectorBtn');
  if(!secSec||!toggleBtn)return;
  function updateVis(){const active=window.isUnlocked;secSec.classList.toggle('hidden',!active)}
  sectorEl.addEventListener('change',()=>{updateVis();if(window.sectorEditMode){updateSectorCodeBox();drawZones()}});
  toggleBtn.onclick=()=>{window.sectorEditMode=!window.sectorEditMode;if(window.sectorEditMode&&!sectorEl.value){sectorEl.value='gare';}toggleBtn.textContent=window.sectorEditMode?'✅ Masquer les poignées d’édition':'✏️ Éditer le tracé de ce secteur';secCtrl.classList.toggle('hidden',!window.sectorEditMode);if(window.sectorEditMode)updateSectorCodeBox();drawZones()};

  if(redrawBtn){
    redrawBtn.onclick=()=>{
      if(!window.isUnlocked||!window.sectorEditMode)return;
      const secId=sectorEl.value||'gare';
      isDrawingNewOutline=!isDrawingNewOutline;
      if(isDrawingNewOutline){
        redrawBtn.textContent='✅ Valider le nouveau tracé';
        redrawBtn.classList.remove('primary');
        redrawBtn.classList.add('success');
        CLEAR_OUTLINES[secId]=[];
        const sec=SECTORS.find(s=>s.id===secId);
        if(sec)sec.polygon=[];
        statusEl.textContent='📍 Cliquez sur les coins de la rue sur la carte... (Cliquez sur Valider pour terminer)';
        view.style.cursor='crosshair';
      }else{
        redrawBtn.textContent='✏️ Redessiner à la volée (Clics successifs)';
        redrawBtn.classList.remove('success');
        redrawBtn.classList.add('primary');
        view.style.cursor='default';
        statusEl.textContent='Nouveau tracé validé. N’oubliez pas de sauvegarder sur Google.';
        syncSectorOutlinesToRows();
      }
      drawZones();
      updateSectorCodeBox();
    };
  }

  if(addBtn)addBtn.onclick=()=>{let secId=sectorEl.value||'gare';if(!sectorEl.value)sectorEl.value='gare';let pts=(mapMode==='gare'&&GARE_OUTLINES[secId])||CLEAR_OUTLINES[secId];if(!pts||!pts.length){const sec=SECTORS.find(s=>s.id===secId);if(sec&&sec.polygon){pts=sec.polygon;if(mapMode==='gare')GARE_OUTLINES[secId]=pts;else CLEAR_OUTLINES[secId]=pts}}if(!pts)pts=[];if(pts.length){const last=pts[pts.length-1];pts.push([Number((last[0]+15).toFixed(1)),Number((last[1]+15).toFixed(1))])}else{pts.push([400,300],[450,300],[425,350])}const sec=SECTORS.find(s=>s.id===secId);if(sec){sec.polygon=(mapMode==='gare'&&GARE_OUTLINES[secId])||CLEAR_OUTLINES[secId]}drawZones();updateSectorCodeBox();syncSectorOutlinesToRows()};
  if(removeBtn)removeBtn.onclick=()=>{let secId=sectorEl.value||'gare';if(!sectorEl.value)sectorEl.value='gare';const pts=(mapMode==='gare'&&GARE_OUTLINES[secId])||CLEAR_OUTLINES[secId];if(!pts||pts.length<=3)return;pts.pop();const sec=SECTORS.find(s=>s.id===secId);if(sec){sec.polygon=(mapMode==='gare'&&GARE_OUTLINES[secId])||CLEAR_OUTLINES[secId]}drawZones();updateSectorCodeBox();syncSectorOutlinesToRows()};
  if(copyBtn)copyBtn.onclick=()=>{const box=$('#sectorCodeBox');if(!box||!box.value)return;navigator.clipboard.writeText(box.value);statusEl.textContent='Code du tracé copié dans le presse-papiers !'};
  if(saveOutlinesBtn)saveOutlinesBtn.onclick=()=>{syncSectorOutlinesToRows();if($('#saveFile'))$('#saveFile').click()};
  updateVis();
}

function setupQuickStatusButtons(){
  const bLibre=$('#btnSetLibre'),bReserve=$('#btnSetReserve'),bBloque=$('#btnSetBloque');
  if(bLibre)bLibre.onclick=()=>{if(selected===null)return;fields.statut.value='Libre';applyForm()};
  if(bReserve)bReserve.onclick=()=>{if(selected===null)return;fields.statut.value='Réservé';applyForm()};
  if(bBloque)bBloque.onclick=()=>{if(selected===null)return;fields.statut.value='Bloqué';applyForm()};
}

function controls(){
  for(const id of ['#saveFile','#add','#clickAddStall','#importFile'])if($(id))$(id).disabled=!window.isUnlocked||window.isSaving;
  $('#logout').classList.toggle('hidden',!window.isUnlocked);
  $('#login').classList.toggle('hidden',window.isUnlocked);
  $('#reload').disabled=window.isSaving;
  $('#editor').querySelectorAll('input,button').forEach(el=>el.disabled=window.isSaving);
  updateAdminToggleUI();
  setupSectorEditor();
  setupQuickStatusButtons();
}

window.isRowStallMode=false;
window.rowStallP1=null;
window.rowStallConfig=null;
window.isPlacingStallMode=false;
window.isDrawingNewOutline=false;

const clickAddBtn=$('#clickAddStall');
if(clickAddBtn){
  clickAddBtn.onclick=()=>{
    if(!window.isUnlocked||window.isSaving)return;
    window.isPlacingStallMode=!window.isPlacingStallMode;
    window.isRowStallMode=false;
    clickAddBtn.textContent=window.isPlacingStallMode?'❌ Annuler la pose sur la carte':'📍 Poser un emplacement sur la carte (1 Clic)';
    clickAddBtn.classList.toggle('danger',window.isPlacingStallMode);
    view.style.cursor=window.isPlacingStallMode?'crosshair':'default';
    if(window.isPlacingStallMode)statusEl.textContent='Cliquez à l’endroit exact sur la carte pour poser le nouvel emplacement.';
  };
}

const clickAddRowBtn=$('#clickAddRowStalls');
if(clickAddRowBtn){
  clickAddRowBtn.onclick=()=>{
    if(!window.isUnlocked||window.isSaving)return;
    if(window.isRowStallMode){
      window.isRowStallMode=false;window.rowStallP1=null;
      clickAddRowBtn.textContent='⚡ Générer une rangée d\'emplacements (Ligne)';
      clickAddRowBtn.classList.remove('danger');
      view.style.cursor='default';
      statusEl.textContent='Génération de rangée annulée.';
      return;
    }
    const prefix=prompt('Préfixe des emplacements de la rue (ex: A, B, G, R) :','A');
    if(prefix===null)return;
    const startNumStr=prompt('Numéro de départ (ex: 1) :','1');
    if(!startNumStr)return;
    const countStr=prompt('Nombre d\'emplacements à générer dans la rue (ex: 15) :','10');
    if(!countStr)return;
    const sideStr=prompt('Côté du trottoir (1 = Trottoir Droit, 2 = Trottoir Gauche, 3 = Exactement sur la ligne) :','1');
    const startNum=parseInt(startNumStr,10)||1;
    const count=parseInt(countStr,10)||10;
    let sideOffset=15;
    if(sideStr==='2')sideOffset=-15;
    else if(sideStr==='3')sideOffset=0;

    window.rowStallConfig={prefix:prefix.trim(),startNum,count,sideOffset};
    window.rowStallP1=null;
    window.isRowStallMode=true;
    window.isPlacingStallMode=false;
    clickAddRowBtn.textContent='❌ Annuler la rangée';
    clickAddRowBtn.classList.add('danger');
    view.style.cursor='crosshair';
    statusEl.textContent=`📍 ÉTAPE 1/2 : Cliquez sur le DEBUT du trottoir pour les emplacements ${prefix}${startNum} à ${prefix}${startNum+count-1}...`;
  };
}

view.addEventListener('click',e=>{
  if(!window.isUnlocked)return;
  if(e.target.closest('.panel')||e.target.closest('.controls')||e.target.closest('.marker'))return;
  const rect=view.getBoundingClientRect();
  const mapX=(e.clientX-rect.left-tx)/sc;
  const mapY=(e.clientY-rect.top-ty)/sc;

  if(window.isDrawingNewOutline&&window.sectorEditMode){
    const secId=sectorEl.value||'gare';
    const px=Number(mapX.toFixed(1)),py=Number(mapY.toFixed(1));
    if(!CLEAR_OUTLINES[secId])CLEAR_OUTLINES[secId]=[];
    CLEAR_OUTLINES[secId].push([px,py]);
    const sec=SECTORS.find(s=>s.id===secId);
    if(sec)sec.polygon=CLEAR_OUTLINES[secId];
    drawZones();
    updateSectorCodeBox();
    return;
  }

  if(window.isRowStallMode&&window.rowStallConfig){
    const x_pct=Math.max(0,Math.min(100,(mapX/map.naturalWidth)*100));
    const y_pct=Math.max(0,Math.min(100,(mapY/map.naturalHeight)*100));
    const targetSectorId=sectorEl.value||'gare';
    const sec=SECTORS.find(s=>s.id===targetSectorId);
    const defaultRue=sec?sec.name:'Place de la Gare';

    if(!window.rowStallP1){
      window.rowStallP1={x:x_pct,y:y_pct,px:mapX,py:mapY};
      statusEl.textContent=`📍 ÉTAPE 2/2 : Cliquez sur la FIN du trottoir pour placer les ${window.rowStallConfig.count} emplacements alignés...`;
      return;
    }else{
      const p1=window.rowStallP1,p2={x:x_pct,y:y_pct,px:mapX,py:mapY};
      const {prefix,startNum,count,sideOffset}=window.rowStallConfig;
      const dx=p2.px-p1.px,dy=p2.py-p1.py;
      const dist=Math.hypot(dx,dy)||1;
      const angleRad=Math.atan2(dy,dx);
      const angleDeg=Number((angleRad*180/Math.PI).toFixed(1));
      const nx=-dy/dist,ny=dx/dist;

      for(let k=0;k<count;k++){
        const t=count===1?0:k/(count-1);
        const px=p1.px+dx*t+nx*sideOffset;
        const py=p1.py+dy*t+ny*sideOffset;
        const dispX=Number(((px/map.naturalWidth)*100).toFixed(4));
        const dispY=Number(((py/map.naturalHeight)*100).toFixed(4));
        const stallId=prefix+(startNum+k);

        let finalPos=[dispX,dispY];
        if(typeof window.fromDisplayed==='function'){
          finalPos=window.fromDisplayed(defaultRue,dispX,dispY);
        }

        const existingIdx=rows.findIndex(r=>r.emplacement.toUpperCase()===stallId.toUpperCase());
        const newStall={
          emplacement:stallId,
          x_pct:Number(finalPos[0].toFixed(4)),
          y_pct:Number(finalPos[1].toFixed(4)),
          nom:'',
          rue:defaultRue,
          dimension:'',
          statut:'',
          angle:angleDeg
        };

        if(existingIdx>=0){
          rows[existingIdx]=newStall;
        }else{
          rows.push(newStall);
        }
      }
      render();
      markDirty();
      window.isRowStallMode=false;
      window.rowStallP1=null;
      window.rowStallConfig=null;
      if(clickAddRowBtn){
        clickAddRowBtn.textContent='⚡ Générer une rangée d\'emplacements (Ligne)';
        clickAddRowBtn.classList.remove('danger');
      }
      view.style.cursor='default';
      statusEl.textContent=`✅ Rangée de ${count} emplacements (${prefix}${startNum} → ${prefix}${startNum+count-1}) alignée le long de la rue !`;
      return;
    }
  }

  if(window.isPlacingStallMode){
    const x_pct=Math.max(0,Math.min(100,(mapX/map.naturalWidth)*100));
    const y_pct=Math.max(0,Math.min(100,(mapY/map.naturalHeight)*100));
    const targetSectorId=sectorEl.value||'gare';
    const sec=SECTORS.find(s=>s.id===targetSectorId);
    const defaultRue=sec?sec.name:'Place de la Gare';
    let defaultId='G'+(rows.filter(r=>!['__SITE_MODE__','__SECTOR_OUTLINES__'].includes(r.emplacement)).length+1);
    const empId=prompt('Numéro du nouvel emplacement à poser ici (ex: G66, B12) :',defaultId);
    if(!empId||!empId.trim()){
      window.isPlacingStallMode=false;
      if(clickAddBtn){clickAddBtn.textContent='📍 Poser un emplacement sur la carte (1 Clic)';clickAddBtn.classList.remove('danger');}
      view.style.cursor='default';
      return;
    }
    const cleanId=empId.trim();
    let finalPos=[x_pct,y_pct];
    if(typeof window.fromDisplayed==='function'){
      finalPos=window.fromDisplayed(defaultRue,x_pct,y_pct);
    }
    rows.push({emplacement:cleanId,x_pct:Number(finalPos[0].toFixed(4)),y_pct:Number(finalPos[1].toFixed(4)),nom:'',rue:defaultRue,dimension:'',statut:''});
    selected=rows.length-1;
    render();
    fillForm(rows[selected]);
    markDirty();
    window.isPlacingStallMode=false;
    if(clickAddBtn){clickAddBtn.textContent='📍 Poser un emplacement sur la carte (1 Clic)';clickAddBtn.classList.remove('danger');}
    view.style.cursor='default';
    statusEl.textContent=`Emplacement ${cleanId} posé sur la carte ! N’oubliez pas de sauvegarder.`;
  }
});

$('#editor').onsubmit=e=>{e.preventDefault();if(window.isUnlocked&&!window.isSaving)applyForm()};
$('#editor').oninput=()=>{if(window.isUnlocked)markDirty()};
$('#login').onsubmit=async e=>{e.preventDefault();const button=$('#login button');button.disabled=true;try{const auth=await CloudApi.login($('#password').value);window.adminToken=auth.token;const data=await CloudApi.read(auth.token);rows=data.rows.map(cleanRow);cloudVersion=data.version;selected=null;window.isUnlocked=true;$('#password').value='';resetEditor();render();controls();$('#empty').textContent='Cliquez sur un marqueur, puis déplacez-le ou modifiez ses champs.';statusEl.textContent='Connecté — données Google chargées.'}catch(err){statusEl.textContent=err.message}finally{button.disabled=false}};
$('#add').onclick=()=>{if(!window.isUnlocked||window.isSaving||!applyForm())return;const sec=SECTORS.find(s=>s.id===sectorEl.value);if(!sec){statusEl.textContent='Choisissez d’abord le secteur du nouvel emplacement.';return}let n=1,id;do{id='N'+n++}while(rows.some(r=>r.emplacement===id));const p=storedPoint(sec.name,sec.center);rows.push({emplacement:id,x_pct:p[0],y_pct:p[1],nom:'',rue:sec.name,dimension:'',statut:''});selected=rows.length-1;render();fillForm(rows[selected]);markDirty()};
$('#remove').onclick=()=>{if(!window.isUnlocked||window.isSaving||selected===null||!confirm(`Supprimer ${rows[selected].emplacement} ?`))return;rows.splice(selected,1);selected=null;render();resetEditor();markDirty()};
$('#saveFile').onclick=async()=>{if(!window.isUnlocked||!cloudVersion||!applyForm())return;window.isSaving=true;controls();statusEl.textContent='Sauvegarde sur Google…';try{const data=await CloudApi.save(window.adminToken,rows,cloudVersion);rows=data.rows.map(cleanRow);cloudVersion=data.version;selected=null;resetEditor();render();statusEl.textContent='Sauvegardé sur Google. Le public s’actualise sous 30 secondes.'}catch(err){statusEl.textContent='Sauvegarde non confirmée : '+err.message}finally{window.isSaving=false;controls()}};
$('#logout').onclick=async()=>{if(dirty&&!confirm('Quitter sans sauvegarder ?'))return;try{await CloudApi.logout(window.adminToken)}catch(e){}window.adminToken=null;window.isUnlocked=false;selected=null;resetEditor();controls();await loadData()};
$('#exportFile').onclick=()=>{if(window.isUnlocked&&!applyForm())return;const exportRows=rows.filter(r=>r.emplacement!=='__SITE_MODE__');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(exportRows,null,2)+'\n'],{type:'application/json'}));a.download='emplacements.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('#importFile').onchange=async e=>{if(!window.isUnlocked)return;try{const data=JSON.parse(await e.target.files[0].text());if(!Array.isArray(data)||data.length>5000)throw Error('Format invalide.');const next=data.map(cleanRow);if(next.some(r=>!validRow(r))||new Set(next.map(r=>r.emplacement.toUpperCase())).size!==next.length)throw Error('Numéros ou positions invalides/dupliqués.');if(!confirm(`Remplacer la liste locale par ${next.length} emplacements ? Google ne sera modifié qu’après sauvegarde.`))return;rows=next;selected=null;render();resetEditor();markDirty()}catch(err){statusEl.textContent='Import refusé : '+err.message}finally{e.target.value=''}};
if($('#toggleConstruction'))$('#toggleConstruction').onclick=()=>setPublicMode(!getPublicMode());
if($('#togglePublicMode'))$('#togglePublicMode').onclick=()=>setPublicMode(!getPublicMode());
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});controls();
