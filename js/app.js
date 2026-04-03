// Simple client-side "online drive" demo using Telegram Bot API
// Data model: tree of nodes { id, name, type: 'folder'|'file', children?, file_id?, message_id?, mime? }

const TELEGRAM_BOT_TOKEN = '8682832569:AAH5BMFULHIjn8nj7BsNH6fhtIUSZyZ_tbE';
const TELEGRAM_CHAT_ID = '7725414998';
const LS_KEY = 'online_drive_data_v1';
let drive = null;
let currentFolderId = 'root';

function uid(prefix = ''){ return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

function save(){ localStorage.setItem(LS_KEY, JSON.stringify(drive)); }
function load(){ const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; }

function makeSample(){ return {
  id: 'root', name: 'My Drive', type: 'folder', children: [
    { id: uid('f_'), name: 'Dokumen', type: 'folder', children: [] },
    { id: uid('f_'), name: 'Foto', type: 'folder', children: [] }
  ]}; }

function init(){
  drive = load();
  if(!drive || drive.type !== 'folder' || !Array.isArray(drive.children)){
    drive = makeSample();
    save();
  }
  currentFolderId = 'root';
  renderAll();
}

function ensureFolder(node){
  if(!node || node.type !== 'folder') return null;
  if(!Array.isArray(node.children)) node.children = [];
  return node;
}

function findNode(id, node = drive){ if(!node) return null; if(node.id === id) return node; if(node.type === 'folder'){
  if(!Array.isArray(node.children)) node.children = [];
  for(const c of node.children){ const found = findNode(id, c); if(found) return found; }
} return null; }

function findParent(targetId, node = drive){ if(!node || node.type !== 'folder') return null; for(const c of node.children){ if(c.id === targetId) return node; const deeper = findParent(targetId, c); if(deeper) return deeper; } return null; }

function renderSidebar(){ const el = document.getElementById('sidebarTree'); el.innerHTML = '';
  function renderNode(node, container, depth=0){
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center gap-1 sm:gap-2 py-1 text-xs sm:text-sm';
    wrapper.style.paddingLeft = (depth*10) + 'px';

    const label = document.createElement('button');
    label.className = 'text-left flex-1 truncate';
    label.textContent = node.name;
    label.onclick = ()=>{ currentFolderId = node.id; renderAll(); };
    wrapper.appendChild(label);

    if(node.id !== 'root'){
      const rename = document.createElement('button'); rename.className='text-xs text-gray-500'; rename.textContent='✎';
      rename.onclick = (e)=>{ e.stopPropagation(); renameNode(node.id); };
      wrapper.appendChild(rename);

      const del = document.createElement('button'); del.className='text-xs text-red-500'; del.textContent='🗑';
      del.onclick = (e)=>{ e.stopPropagation(); deleteNode(node.id); };
      wrapper.appendChild(del);
    }

    container.appendChild(wrapper);

    if(node.type === 'folder'){
      for(const c of node.children){ if(c.type === 'folder') renderNode(c, container, depth+1); }
    }
  }
  renderNode(drive, el, 0);
}

function renderBreadcrumb(){ const bc = document.getElementById('breadcrumb'); bc.innerHTML = '';
  const path = []; let node = findNode(currentFolderId);
  while(node){ path.unshift(node); node = findParent(node.id); if(node && node.id === 'root' && path[0].id === 'root') break; }
  if(path.length === 0){ path.push(drive); }
  path.forEach((p, i)=>{
    const span = document.createElement('button');
    span.className = 'text-xs sm:text-sm text-blue-600 hover:text-blue-800 px-1';
    span.textContent = p.name + (i < path.length-1 ? ' / ' : '');
    span.onclick = ()=>{ currentFolderId = p.id; renderAll(); };
    bc.appendChild(span);
  });
}

function renderMain(){ const container = document.getElementById('mainContent'); container.innerHTML = '';
  const folder = findNode(currentFolderId);
  if(!folder || folder.type !== 'folder') return;
  // list folders first
  const grid = document.createElement('div'); grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4';
  folder.children.forEach(child => {
    const card = document.createElement('div'); card.className = 'p-2 sm:p-3 border rounded hover:shadow cursor-pointer text-sm sm:text-base';
    card.setAttribute('data-id', child.id);
    if(child.type === 'folder'){
      card.innerHTML = `<div class=\"text-2xl sm:text-4xl\">📁</div><div class=\"font-medium mt-2 break-words\">${child.name}</div>`;
      // Add download button if folder has ZIP
      if(child.zip_message_id){
        const actions = document.createElement('div'); actions.className='mt-2 flex gap-1 sm:gap-2 flex-wrap';
        const btnDown = document.createElement('button'); btnDown.className='text-xs bg-blue-500 text-white px-2 py-1 rounded flex-1 sm:flex-initial'; btnDown.textContent='Download ZIP';
        btnDown.onclick = (e)=>{ e.stopPropagation(); downloadZipFolder(child.id); };
        const btnDel = document.createElement('button'); btnDel.className='text-xs bg-red-500 text-white px-2 py-1 rounded flex-1 sm:flex-initial'; btnDel.textContent='Delete';
        btnDel.onclick = (e)=>{ e.stopPropagation(); deleteNode(child.id); };
        card.appendChild(actions);
        actions.appendChild(btnDown); actions.appendChild(btnDel);
        card.onclick = ()=>{ currentFolderId = child.id; renderAll(); };
      } else {
        card.onclick = ()=>{ currentFolderId = child.id; renderAll(); };
      }
    } else {
      card.innerHTML = `<div class=\"text-2xl sm:text-4xl\">📄</div><div class=\"font-medium mt-2 break-words\">${child.name}</div><div class=\"text-xs text-gray-500 mt-2\">${child.mime || ''}</div>`;
      // actions
      const actions = document.createElement('div'); actions.className='mt-2 flex gap-1 sm:gap-2 flex-wrap';
      const btnDown = document.createElement('button'); btnDown.className='text-xs bg-blue-500 text-white px-2 py-1 rounded flex-1 sm:flex-initial'; btnDown.textContent='Download';
      btnDown.onclick = (e)=>{ e.stopPropagation(); downloadFile(child.id); };
      const btnDel = document.createElement('button'); btnDel.className='text-xs bg-red-500 text-white px-2 py-1 rounded flex-1 sm:flex-initial'; btnDel.textContent='Delete';
      btnDel.onclick = (e)=>{ e.stopPropagation(); deleteNode(child.id); };
      card.appendChild(actions);
      actions.appendChild(btnDown); actions.appendChild(btnDel);
      card.onclick = ()=>{ openPreview(child.id); };
    }
    grid.appendChild(card);
  });
  container.appendChild(grid);
}

function renderAll(){ renderSidebar(); renderBreadcrumb(); renderMain(); }

function createFolder(){ const name = prompt('Nama folder baru:'); if(!name) return; let parent = ensureFolder(findNode(currentFolderId)); if(!parent) parent = ensureFolder(drive); if(!parent) return;
  parent.children.push({ id: uid('f_'), name, type: 'folder', children: [] }); save(); renderAll(); }

function renameNode(id){ const node = findNode(id); if(!node) return; const newName = prompt('Nama baru:', node.name); if(!newName) return; node.name = newName; save(); renderAll(); }

function deleteNode(id){ if(id === 'root'){ alert('Tidak bisa menghapus root'); return; }
  const parent = findParent(id); if(!parent) return; const idx = parent.children.findIndex(c=>c.id===id); if(idx===-1) return; const node = parent.children[idx];
  if(node.type === 'file' && node.message_id){
    // Hapus file dari Telegram
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage?chat_id=${TELEGRAM_CHAT_ID}&message_id=${node.message_id}`, {
      method: 'POST'
    }).then(res => res.json()).then(data => {
      if(!data.ok){
        console.warn('Gagal hapus dari Telegram: ' + data.description);
      }
    }).catch(err => console.warn('Error hapus Telegram: ' + err));
  } else if(node.type === 'folder' && node.zip_message_id){
    // Hapus ZIP folder dari Telegram
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage?chat_id=${TELEGRAM_CHAT_ID}&message_id=${node.zip_message_id}`, {
      method: 'POST'
    }).then(res => res.json()).then(data => {
      if(!data.ok){
        console.warn('Gagal hapus ZIP dari Telegram: ' + data.description);
      }
    }).catch(err => console.warn('Error hapus ZIP Telegram: ' + err));
  }
  if(!confirm('Hapus "'+node.name+'"?')) return; parent.children.splice(idx,1); if(currentFolderId===id) currentFolderId = 'root'; save(); renderAll(); }

function uploadFile(file, targetFolderId){
  showProgress('Mengupload ' + file.name);
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    updateProgress(progress);
    if (progress >= 100) {
      clearInterval(interval);
      const formData = new FormData();
      formData.append('chat_id', TELEGRAM_CHAT_ID);
      formData.append('document', file);
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: formData
      }).then(res => res.json()).then(data => {
        if (data.ok) {
          const file_id = data.result.document.file_id;
          const message_id = data.result.message_id;
          let parent = ensureFolder(findNode(targetFolderId || currentFolderId));
      if(!parent) parent = ensureFolder(drive);
      if(!parent){ hideProgress(); alert('Folder target tidak ditemukan'); return; }
      parent.children.push({ id: uid('file_'), name: file.name, type: 'file', file_id, message_id, mime: file.type });
      save();
      renderAll();
          hideProgress();
        } else {
          alert('Upload gagal: ' + data.description);
          hideProgress();
        }
      }).catch(err => {
        alert('Error: ' + err);
        hideProgress();
      });
    }
  }, 100);
}

function uploadFolder(files, targetFolderId){
  const fileList = Array.from(files);
  if(fileList.length === 0) return;
  
  // Get folder name from first file path
  const firstPath = fileList[0].webkitRelativePath;
  const folderName = firstPath.split('/')[0];
  const zipFileName = folderName + '.zip';
  
  showProgress(`Mengompres folder ${folderName}...`);
  
  const zip = new JSZip();
  
  // Add all files to zip
  fileList.forEach(file => {
    zip.file(file.webkitRelativePath, file);
  });
  
  // Generate zip file with high compression
  zip.generateAsync({type: 'blob', compression: 'DEFLATE', compressionOptions: {level: 9}}).then(blob => {
    
    // Check file size (Telegram limit is ~50MB)
    const fileSizeMB = blob.size / (1024 * 1024);
    if(fileSizeMB > 50){
      hideProgress();
      alert(`File terlalu besar (${fileSizeMB.toFixed(2)}MB). Maksimal 50MB untuk Telegram. Coba folder yang lebih kecil.`);
      return;
    }
    
    showProgress(`Mengupload ${zipFileName}...`);
    
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('document', blob, zipFileName);
    
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData
    }).then(res => res.json()).then(data => {
      if (data.ok) {
        const file_id = data.result.document.file_id;
        const message_id = data.result.message_id;
        let parent = ensureFolder(findNode(targetFolderId || currentFolderId));
        if(!parent) parent = ensureFolder(drive);
        if(!parent){ hideProgress(); alert('Folder target tidak ditemukan'); return; }
        
        // Create folder node to represent structure
        let folderNode = parent.children.find(c => c.name === folderName && c.type === 'folder');
        if(!folderNode){
          folderNode = { id: uid('f_'), name: folderName, type: 'folder', children: [], zip_file_id: file_id, zip_message_id: message_id };
          parent.children.push(folderNode);
        }
        
        // Store individual files as metadata (not uploaded, just for reference)
        fileList.forEach(file => {
          const parts = file.webkitRelativePath.split('/').slice(1); // Remove folder name
          let current = folderNode;
          
          // Create folder structure
          for(let i = 0; i < parts.length - 1; i++){
            let subfolder = current.children.find(c => c.name === parts[i] && c.type === 'folder');
            if(!subfolder){
              subfolder = { id: uid('f_'), name: parts[i], type: 'folder', children: [] };
              current.children.push(subfolder);
            }
            current = subfolder;
          }
          
          // Add file entry
          const fileName = parts[parts.length - 1];
          current.children.push({ id: uid('file_'), name: fileName, type: 'file', mime: file.type });
        });
        
        save();
        renderAll();
        hideProgress();
        alert(`Folder ${folderName} berhasil dikompres dan diupload ke Telegram!`);
      } else {
        hideProgress();
        alert('Upload gagal: ' + (data.description || 'Unknown error'));
      }
    }).catch(err => {
      hideProgress();
      alert('Error upload: ' + err.message);
    });
  }).catch(err => {
    hideProgress();
    alert('Error kompresi: ' + err.message);
  });
}

function downloadFile(id){ const node = findNode(id); if(!node || node.type !== 'file') return; showProgress('Mendownload ' + node.name); let progress = 0; const interval = setInterval(() => { progress += 20; updateProgress(progress); if (progress >= 100) { clearInterval(interval); fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${node.file_id}`).then(res => res.json()).then(data => { if (data.ok) { const file_path = data.result.file_path; const url = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file_path}`; fetch(url).then(res => res.blob()).then(blob => { const downloadUrl = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = downloadUrl; a.download = node.name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(downloadUrl); hideProgress(); }); } else { alert('Download gagal: ' + data.description); hideProgress(); } }).catch(err => { alert('Error: ' + err); hideProgress(); }); } }, 100); }

function downloadZipFolder(id){ const node = findNode(id); if(!node || node.type !== 'folder' || !node.zip_file_id) return; showProgress('Mendownload ' + node.name + '.zip'); let progress = 0; const interval = setInterval(() => { progress += 20; updateProgress(progress); if (progress >= 100) { clearInterval(interval); fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${node.zip_file_id}`).then(res => res.json()).then(data => { if (data.ok) { const file_path = data.result.file_path; const url = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file_path}`; fetch(url).then(res => res.blob()).then(blob => { const downloadUrl = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = downloadUrl; a.download = node.name + '.zip'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(downloadUrl); hideProgress(); }); } else { alert('Download gagal: ' + data.description); hideProgress(); } }).catch(err => { alert('Error: ' + err); hideProgress(); }); } }, 100); }

function openPreview(id){
  const node = findNode(id);
  if(!node || node.type !== 'file') return;
  const modal = document.getElementById('previewModal');
  const body = document.getElementById('previewBody');
  if(!modal || !body) return;
  body.innerHTML = '<p>Loading...</p>';
  modal.classList.remove('hidden');

  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${node.file_id}`)
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        const file_path = data.result.file_path;
        const url = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file_path}`;
        fetch(url)
          .then(res => res.blob())
          .then(blob => {
            const objectUrl = URL.createObjectURL(blob);
            body.innerHTML = '';
            if(node.mime && node.mime.startsWith('image/')){
              const img = document.createElement('img');
              img.src = objectUrl;
              img.className = 'max-h-[60vh] sm:max-h-[70vh] w-auto';
              body.appendChild(img);
            } else if(node.mime && node.mime.startsWith('video/')){
              const vid = document.createElement('video');
              vid.src = objectUrl;
              vid.controls = true;
              vid.className = 'max-h-[60vh] sm:max-h-[70vh] w-full';
              body.appendChild(vid);
            } else {
              body.textContent = 'Preview tidak tersedia untuk jenis file ini.';
            }
          });
      } else {
        body.textContent = 'Gagal memuat preview: ' + data.description;
      }
    })
    .catch(err => {
      body.textContent = 'Error: ' + err;
    });
}

function closePreview(){
  const modal = document.getElementById('previewModal');
  const body = document.getElementById('previewBody');
  if(modal) modal.classList.add('hidden');
  if(body) body.innerHTML = '';
}

function showProgress(text) {
  document.getElementById('progressContainer').classList.remove('hidden');
  document.getElementById('progressText').textContent = text;
  document.getElementById('progressBar').style.width = '0%';
}

function updateProgress(percent) {
  document.getElementById('progressBar').style.width = percent + '%';
}

function hideProgress() {
  document.getElementById('progressContainer').classList.add('hidden');
}

// wire UI
window.addEventListener('DOMContentLoaded', ()=>{
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarToggleClose = document.getElementById('sidebarToggleClose');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
  if(sidebarToggle) sidebarToggle.onclick = ()=>{ sidebar.classList.remove('hidden'); sidebarOverlay.classList.remove('hidden'); };
  if(sidebarToggleClose) sidebarToggleClose.onclick = ()=>{ sidebar.classList.add('hidden'); sidebarOverlay.classList.add('hidden'); };
  
  // Close sidebar when clicking on a folder
  const originalRenderAll = renderAll;
  window.renderAll = function(){
    if(window.innerWidth < 1024){
      sidebar.classList.add('hidden');
      sidebarOverlay.classList.add('hidden');
    }
    originalRenderAll();
  };
  
  document.getElementById('btnNewFolder').onclick = createFolder;
  document.getElementById('fileInput').addEventListener('change', (e)=>{
    const f = e.target.files[0]; if(!f) return; uploadFile(f); e.target.value = '';
  });
  document.getElementById('folderInput').addEventListener('change', (e)=>{
    const files = e.target.files; if(files.length === 0) return; uploadFolder(files); e.target.value = '';
  });
  document.getElementById('btnRefresh').onclick = ()=>{ drive = load() || drive; renderAll(); };
  document.getElementById('search').addEventListener('input', (e)=>{ const q = e.target.value.toLowerCase(); if(!q){ renderAll(); return; }
    const results = [];
    function walk(node){ if(node.name.toLowerCase().includes(q)) results.push(node); if(node.type === 'folder') node.children.forEach(walk); }
    walk(drive);
    const container = document.getElementById('mainContent'); container.innerHTML = '';
    const list = document.createElement('div'); list.className = 'space-y-1 sm:space-y-2'; results.forEach(r=>{
      const row = document.createElement('div'); row.className='p-2 sm:p-3 border rounded flex items-center justify-between text-xs sm:text-sm'; row.textContent = (r.type==='folder'? '📁 ':'📄 ') + r.name;
      list.appendChild(row);
    }); container.appendChild(list);
  });
  // preview modal wiring
  const previewCloseBtn = document.getElementById('previewClose');
  if(previewCloseBtn) previewCloseBtn.onclick = closePreview;
  const previewModal = document.getElementById('previewModal');
  if(previewModal) previewModal.addEventListener('click', (e)=>{ if(e.target.id === 'previewModal') closePreview(); });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closePreview(); });

  init();
});