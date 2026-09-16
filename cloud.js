/* Transport iframe Apps Script : lecture/écriture confirmées, sans CORS ni JSONP. */
window.CloudApi = (() => {
  const config = window.BROCANTE_CONFIG || {};
  let ready, peer, peerOrigin, frame, pending = new Map();
  const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
  const channel = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const googleOrigin = origin => /^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin) || origin === 'https://script.google.com';
  function connect() {
    if (ready) return ready;
    ready = new Promise((resolve, reject) => {
      if (!config.apiUrl) { reject(new Error('Connexion Google non configurée : renseignez config.js.')); return; }
      if (location.origin === 'null') { reject(new Error('La version connectée doit être ouverte sur GitHub Pages ou un serveur local, pas par double-clic.')); return; }
      let url;
      try { url = new URL(config.apiUrl); if (url.origin !== 'https://script.google.com' || !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname)) throw Error(); }
      catch { reject(new Error('URL Google Apps Script /exec invalide.')); return; }
      url.searchParams.set('origin', location.origin); url.searchParams.set('channel', channel);
      const timer = setTimeout(() => { reject(new Error('Google ne répond pas : vérifiez le déploiement /exec et ALLOWED_ORIGINS.')); }, 25000);
      function message(e) {
        const m = e.data;
        if (!googleOrigin(e.origin) || !m || m.channel !== channel || m.type !== 'brocante') return;
        if (m.ready && !peer) { peer = e.source; peerOrigin = e.origin; clearTimeout(timer); resolve(); return; }
        if (e.source !== peer || e.origin !== peerOrigin) return;
        const job = pending.get(m.id); if (!job) return;
        clearTimeout(job.timer); pending.delete(m.id);
        m.ok ? job.resolve(m.result) : job.reject(new Error(m.error || 'Erreur Google.'));
      }
      window.addEventListener('message', message);
      frame = document.createElement('iframe'); frame.hidden = true; frame.title = 'Connexion Google'; frame.src = url.href; document.body.appendChild(frame);
    });
    return ready;
  }
  async function call(action, payload = {}) {
    await connect();
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Réponse Google non reçue. Ne supposez pas que la sauvegarde a réussi : rechargez les données avant de réessayer.')); }, 30000);
      pending.set(id, { resolve, reject, timer });
      peer.postMessage({type:'brocante',channel,id,action,payload}, peerOrigin);
    });
  }
  return {configured:!!config.apiUrl, read:token=>call('read',{token}), login:password=>call('login',{password}), save:(token,rows,version)=>call('save',{token,rows,version}), logout:token=>call('logout',{token})};
})();
