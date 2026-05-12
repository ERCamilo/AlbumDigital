/**
 * Lógica del Constructor Visual de Álbumes
 */

let albumData = {
    global: { transition: 'gift', progress: true },
    screens: [
        { name: 'Pantalla de Ejemplo', opts: { emoji: '🎉', color: 'pink' }, sections: [] }
    ]
};

const screensList = document.getElementById('screens-list');
const btnAddScreen = document.getElementById('btn-add-screen');
const selectGlobalTransition = document.getElementById('global-transition');
const checkGlobalProgress = document.getElementById('global-progress');
const btnExport = document.getElementById('btn-export');
const reviewPanel = document.getElementById('review-panel');
const moduleModal = document.getElementById('module-modal');
const modulePickerGrid = document.getElementById('module-picker-grid');
const editorToast = document.getElementById('editor-toast');

let hasInitData = false;
let activeModuleScreenIdx = null;
let selectedTarget = { kind: 'review' };
let undoStack = [];
let redoStack = [];
let lastSnapshot = '';
let historyPaused = false;
let toastTimer = null;

const MODULE_TYPES = [
    { type: 'foto', icon: '🖼️', title: 'Foto', desc: 'Una imagen destacada con texto y animación.' },
    { type: 'video', icon: '🎬', title: 'Video', desc: 'Un clip dentro del álbum, ideal para recuerdos cortos.' },
    { type: 'collage', icon: '▦', title: 'Collage', desc: 'Varias fotos en diseños visuales listos para usar.' },
    { type: 'mensaje', icon: '💌', title: 'Mensaje', desc: 'Una dedicatoria o carta emocional.' },
    { type: 'musica', icon: '🎵', title: 'Música', desc: 'Un reproductor dedicado dentro de la pantalla.' },
    { type: 'deseos', icon: '✨', title: 'Deseos', desc: 'Lista de buenos deseos con pequeños iconos.' },
    { type: 'estadisticas', icon: '📊', title: 'Estadísticas', desc: 'Números divertidos, logros o momentos.' },
    { type: 'inicio', icon: '🎉', title: 'Portada', desc: 'Hero inicial con foto, nombre y mensaje.' },
    { type: 'cierre', icon: '❤️', title: 'Cierre', desc: 'Pantalla final para despedir el álbum.' }
];

const ANIMATIONS = ['pop', 'zoom', 'flip', 'elastic', 'fade-blur', 'stagger', 'scatter'];
const COLLAGE_LAYOUTS = ['3t', '3l', '4', '5m', 'scatter', 'carousel'];
const SCREEN_COLORS = ['pink', 'yellow', 'teal', 'blue', 'green', 'purple'];

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function moduleMeta(type) {
    return MODULE_TYPES.find(m => m.type === type) || { type, icon: '▣', title: type || 'Módulo', desc: '' };
}

function sectionSummary(sec) {
    const d = sec.data || {};
    if (d.texto) return d.texto;
    if (d.title) return d.title;
    if (d.nombre) return d.nombre;
    if (sec.src && typeof sec.src === 'string') return sec.src.split('/').pop();
    if (Array.isArray(sec.src)) return `${sec.src.length} archivo(s)`;
    return 'Sin descripción';
}

function getActiveScreenIndex() {
    if (typeof selectedTarget.sIdx === 'number' && albumData.screens?.[selectedTarget.sIdx]) {
        return selectedTarget.sIdx;
    }
    return 0;
}

window.getActiveScreenIndex = getActiveScreenIndex;

function mediaPathKey(path = '') {
    return String(path).replaceAll('\\', '/').replace(/^\.?\//, '');
}

function getGalleryPreviewUrl(path = '') {
    const normalized = mediaPathKey(path);
    const all = [
        ...(galleryFiles?.images || []),
        ...(galleryFiles?.videos || []),
        ...(galleryFiles?.audios || [])
    ];
    return all.find(item => item.path === normalized)?.url || path;
}

function firstMediaInScreen(screen) {
    for (const sec of screen.sections || []) {
        if (sec.data?.foto) return sec.data.foto;
        if (typeof sec.src === 'string' && /^(fotos|videos)\//.test(sec.src)) return sec.src;
        if (Array.isArray(sec.src)) {
            const found = sec.src.find(src => typeof src === 'string' && src.startsWith('fotos/'));
            if (found) return found;
        }
    }
    return '';
}

function renderScreenThumb(screen) {
    const media = firstMediaInScreen(screen);
    if (media && media.startsWith('fotos/')) {
        return `<span class="screen-thumb"><img src="${escapeHtml(getGalleryPreviewUrl(media))}" alt=""></span>`;
    }
    if (media && media.startsWith('videos/')) {
        return `<span class="screen-thumb">▶</span>`;
    }
    return `<span class="screen-thumb">${escapeHtml(screen.opts?.emoji || '📄')}</span>`;
}

function inspectorPreviewCardForScreen(screen) {
    const media = firstMediaInScreen(screen);
    const label = screen.sections?.length ? `${screen.sections.length} módulo(s)` : 'Sin módulos todavía';
    let preview = `<div class="inspector-preview-media">${escapeHtml(screen.opts?.emoji || '📄')}</div>`;

    if (media && media.startsWith('fotos/')) {
        preview = `<div class="inspector-preview-media"><img src="${escapeHtml(getGalleryPreviewUrl(media))}" alt=""></div>`;
    } else if (media && media.startsWith('videos/')) {
        preview = `<div class="inspector-preview-media"><video src="${escapeHtml(getGalleryPreviewUrl(media))}" muted playsinline></video></div>`;
    }

    return `
        <div class="inspector-preview-card">
            ${preview}
            <div class="inspector-preview-copy">
                <strong>${escapeHtml(screen.name || 'Pantalla sin título')}</strong>
                <span>${escapeHtml(label)}</span>
            </div>
        </div>
    `;
}

function inspectorPreviewCardForSection(sec) {
    const d = sec.data || {};
    const meta = moduleMeta(sec.type);
    const fallback = `<div class="inspector-preview-media">${meta.icon}</div>`;
    let preview = fallback;
    let detail = sectionSummary(sec);

    if (['foto', 'gif'].includes(sec.type) && sec.src) {
        preview = `<div class="inspector-preview-media"><img src="${escapeHtml(getGalleryPreviewUrl(sec.src))}" alt=""></div>`;
    } else if (sec.type === 'video' && sec.src) {
        preview = `<div class="inspector-preview-media"><video src="${escapeHtml(getGalleryPreviewUrl(sec.src))}" muted playsinline></video></div>`;
    } else if (sec.type === 'collage' && Array.isArray(sec.src) && sec.src.length) {
        const images = sec.src.slice(0, 4).map(src => `<img src="${escapeHtml(getGalleryPreviewUrl(src))}" alt="">`).join('');
        preview = `<div class="inspector-preview-media"><div class="inspector-preview-grid">${images}</div></div>`;
        detail = `${sec.src.length} imagen(es)`;
    } else if (sec.type === 'inicio' && d.foto) {
        preview = `<div class="inspector-preview-media"><img src="${escapeHtml(getGalleryPreviewUrl(d.foto))}" alt=""></div>`;
        detail = d.nombre || d.mensaje || detail;
    } else if (sec.type === 'musica' && d.src) {
        detail = d.title || d.src;
    }

    return `
        <div class="inspector-preview-card">
            ${preview}
            <div class="inspector-preview-copy">
                <strong>${escapeHtml(meta.title)}</strong>
                <span>${escapeHtml(detail)}</span>
            </div>
        </div>
    `;
}

function backgroundPreviewStyle(bg = {}) {
    const parts = [];
    if (bg.type === 'image' && bg.image) {
        parts.push(`background-image:linear-gradient(rgba(15,10,35,.28),rgba(15,10,35,.28)),url('${escapeHtml(getGalleryPreviewUrl(bg.image))}')`);
    } else if (bg.type === 'gradient' && bg.gradient) {
        parts.push(`background-image:${escapeHtml(bg.gradient)}`);
    }
    if (bg.color) parts.push(`background-color:${escapeHtml(bg.color)}`);
    return parts.join(';');
}

function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
}

function showEditorToast(message) {
    if (!editorToast) return;
    editorToast.textContent = message;
    editorToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => editorToast.classList.remove('show'), 1800);
}

function updateHistoryButtons() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

function resetHistory() {
    undoStack = [];
    redoStack = [];
    lastSnapshot = JSON.stringify(albumData);
    updateHistoryButtons();
}

function captureHistory() {
    if (historyPaused) return;
    const current = JSON.stringify(albumData);
    if (!lastSnapshot) {
        lastSnapshot = current;
        updateHistoryButtons();
        return;
    }
    if (current !== lastSnapshot) {
        undoStack.push(lastSnapshot);
        if (undoStack.length > 50) undoStack.shift();
        redoStack = [];
        lastSnapshot = current;
    }
    updateHistoryButtons();
}

function applyHistorySnapshot(snapshot, message) {
    historyPaused = true;
    albumData = JSON.parse(snapshot);
    selectedTarget = { kind: 'review' };
    renderSidebar();
    updatePreview();
    renderInspectorPanel();
    localStorage.setItem('albumBuilderDraft', JSON.stringify(albumData));
    lastSnapshot = JSON.stringify(albumData);
    historyPaused = false;
    updateHistoryButtons();
    showEditorToast(message);
}

btnAddScreen.addEventListener('click', () => window.addScreen());

// --- ACCIONES RÁPIDAS DEL HEADER ---
(function setupQuickActions() {
    const actions = document.querySelector('.sidebar-header-actions');
    if (!actions) return;

    const undoBtn = document.createElement('button');
    undoBtn.id = 'btn-undo';
    undoBtn.className = 'pill-btn';
    undoBtn.type = 'button';
    undoBtn.title = 'Deshacer último cambio';
    undoBtn.textContent = '↶';
    undoBtn.onclick = () => window.undoEdit();

    const redoBtn = document.createElement('button');
    redoBtn.id = 'btn-redo';
    redoBtn.className = 'pill-btn';
    redoBtn.type = 'button';
    redoBtn.title = 'Rehacer cambio';
    redoBtn.textContent = '↷';
    redoBtn.onclick = () => window.redoEdit();

    actions.prepend(redoBtn);
    actions.prepend(undoBtn);
    updateHistoryButtons();
})();

window.undoEdit = () => {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.stringify(albumData));
    const previous = undoStack.pop();
    applyHistorySnapshot(previous, 'Cambio deshecho');
};

window.redoEdit = () => {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.stringify(albumData));
    const next = redoStack.pop();
    applyHistorySnapshot(next, 'Cambio rehecho');
};

// --- 1. COMUNICACIÓN IFRAME Y CACHÉ LOCAL ---

window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'ALBUM_INIT_DATA' && !hasInitData) {
        hasInitData = true;

        // Usamos siempre los datos limpios del visor. Un borrador viejo puede ocultar módulos
        // si quedó guardado durante cambios incompletos de diseño.
        albumData = e.data.data;
        renderSidebar();
        updatePreview();
        resetHistory();
    } else if (e.data && e.data.type === 'ALBUM_SELECT_TARGET') {
        const { sIdx, secIdx } = e.data;
        if (typeof secIdx === 'number') {
            selectSection(sIdx, secIdx);
        } else if (typeof sIdx === 'number') {
            selectScreen(sIdx);
        }
    }
});

window.updatePreview = function () {
    const frame = document.getElementById('preview-frame');
    if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'ALBUM_UPDATE_DATA', data: buildPreviewAlbumData() }, '*');
    }
};

function dispatchChange() {
    renderSidebar();
    updatePreview();
    renderInspectorPanel();
    captureHistory();
    // Guardar automáticamente cada cambio en LocalStorage
    localStorage.setItem('albumBuilderDraft', JSON.stringify(albumData));
}

// Envía cambios sin reconstruir el DOM del menú lateral (evita perder el focus del input)
function softDispatch() {
    updatePreview();
    renderInspectorPanel();
    captureHistory();
    localStorage.setItem('albumBuilderDraft', JSON.stringify(albumData));
}

// --- 2. RENDERIZADO DEL PANEL IZQUIERDO (SIDEBAR) ---

function renderSidebar() {
    selectGlobalTransition.value = albumData.global.transition || 'gift';
    checkGlobalProgress.checked = albumData.global.progress !== false;

    screensList.innerHTML = '';

    albumData.screens.forEach((screen, sIdx) => {
        const item = document.createElement('div');
        item.className = 'screen-item';
        if (selectedTarget.sIdx === sIdx) item.classList.add('open');
        if (selectedTarget.kind === 'screen' && selectedTarget.sIdx === sIdx) item.classList.add('selected');

        const header = document.createElement('div');
        header.className = 'screen-header';
        header.innerHTML = `
            <div class="screen-title" onclick="selectScreen(${sIdx}, event)">
                <strong class="screen-card-title">${sIdx + 1}. ${escapeHtml(screen.name || 'Sin título')}</strong>
                <span class="screen-meta-row">
                    ${renderScreenThumb(screen)}
                    <span class="screen-copy">
                        <span>${(screen.sections || []).length} módulo(s)</span>
                    </span>
                </span>
            </div>
            <div class="screen-actions">
                <button class="btn-icon" title="Editar" onclick="toggleScreen(${sIdx}, event)">⚙️</button>
                <button class="btn-icon" title="Duplicar pantalla" onclick="duplicateScreen(${sIdx}, event)">⧉</button>
                <button class="btn-icon danger" title="Eliminar Pantalla" onclick="deleteScreen(${sIdx}, event)">🗑️</button>
            </div>
        `;

        const body = document.createElement('div');
        body.className = 'screen-body';
        body.innerHTML = `
            <div id="sections-list-${sIdx}"></div>
            
            <button class="add-btn" style="margin-top: 12px; padding: 10px;" onclick="openModulePicker(${sIdx})">
                <span>➕</span> Añadir módulo
            </button>
        `;

        // Drag and drop for screens
        item.setAttribute('draggable', 'true');
        item.dataset.screenIndex = sIdx;
        item.ondragstart = (e) => { e.dataTransfer.setData('sourceScreen', sIdx); e.target.style.opacity = '0.5'; };
        item.ondragend = (e) => { e.target.style.opacity = ''; document.querySelectorAll('.screen-item').forEach(el => el.style.border = ''); };
        item.ondragover = (e) => { e.preventDefault(); e.currentTarget.style.border = '2px dashed #3b82f6'; };
        item.ondragleave = (e) => { e.currentTarget.style.border = ''; };
        item.ondrop = (e) => {
            e.preventDefault();
            e.currentTarget.style.border = '';
            const fromIdx = parseInt(e.dataTransfer.getData('sourceScreen'));
            const toIdx = sIdx;
            if (fromIdx === toIdx || isNaN(fromIdx)) return;

            // Reordenar array de pantallas
            const arr = albumData.screens;
            const [movedItem] = arr.splice(fromIdx, 1);
            arr.splice(toIdx, 0, movedItem);

            dispatchChange(); // Requiere rebuild completo por el reordenamiento del DOM
        };

        item.appendChild(header);
        item.appendChild(body);
        screensList.appendChild(item);

        const secContainer = body.querySelector(`#sections-list-${sIdx}`);
        if (screen.sections) {
            screen.sections.forEach((sec, secIdx) => {
                secContainer.appendChild(renderSectionItem(sIdx, secIdx, sec));
            });
        }
    });

    renderInspectorPanel();
}

function renderSectionItem(sIdx, secIdx, sec) {
    const sItem = document.createElement('div');
    sItem.className = 'section-item';
    if (selectedTarget.kind === 'section' && selectedTarget.sIdx === sIdx && selectedTarget.secIdx === secIdx) {
        sItem.classList.add('selected');
    }
    sItem.style.display = 'block';

    // Drag and drop for sections (modules)
    sItem.setAttribute('draggable', 'true');
    sItem.ondragstart = (e) => {
        e.dataTransfer.setData('sourceSection', secIdx);
        e.dataTransfer.setData('sourceScreenParent', sIdx);
        e.target.style.opacity = '0.5';
    };
    sItem.ondragend = (e) => { e.target.style.opacity = ''; document.querySelectorAll('.section-item').forEach(el => el.style.border = ''); };
    sItem.ondragover = (e) => { e.preventDefault(); e.currentTarget.style.border = '2px dashed #f59e0b'; };
    sItem.ondragleave = (e) => { e.currentTarget.style.border = ''; };
    sItem.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Avoid triggering screen drop if nested
        e.currentTarget.style.border = '';
        const fromSecIdx = parseInt(e.dataTransfer.getData('sourceSection'));
        const fromScreenIdx = parseInt(e.dataTransfer.getData('sourceScreenParent'));
        const toSecIdx = secIdx;

        // Allow dropping only within the same screen for now
        if (fromScreenIdx !== sIdx || fromSecIdx === toSecIdx || isNaN(fromSecIdx)) return;

        // Reordenar array de secciones
        const arr = albumData.screens[sIdx].sections;
        const [movedItem] = arr.splice(fromSecIdx, 1);
        arr.splice(toSecIdx, 0, movedItem);

        dispatchChange();
    };

    const meta = moduleMeta(sec.type);
    sItem.innerHTML = `
        <div class="section-row" onclick="selectSection(${sIdx}, ${secIdx}, event)">
            <div class="section-main">
                <span style="font-size: 14px; cursor: grab; color: #cbd5e1;">☰</span>
                <span class="section-type">${meta.icon} ${meta.title}</span>
                <span class="section-summary">${escapeHtml(sectionSummary(sec))}</span>
            </div>
            <div style="display:flex; gap:4px;">
                <button class="btn-icon" style="width:24px;height:24px;font-size:10px;" title="Duplicar módulo" onclick="duplicateSection(${sIdx}, ${secIdx}, event)">⧉</button>
                <button class="btn-icon danger" style="width:24px;height:24px;font-size:10px;" onclick="deleteSection(${sIdx}, ${secIdx}, event)">❌</button>
            </div>
        </div>
    `;
    return sItem;
}

// --- 3. GENERADOR DE FORMULARIOS POR TIPO DE SECCIÓN ---
function getSectionForm(sIdx, secIdx, sec) {
    let html = '';
    const d = sec.data || {};

    if (['foto', 'video', 'gif'].includes(sec.type)) {
        const typeTab = sec.type === 'video' ? 'videos' : 'images';
        html += `<div class="control-group"><label>URL Archivo (Ruta/Src)</label>
                 <div class="input-with-gallery">
                    <input type="text" value="${sec.src || ''}" id="sc-s-${sIdx}-${secIdx}" onchange="updateSectionSrc(${sIdx},${secIdx},this.value)">
                    <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => { document.getElementById('sc-s-${sIdx}-${secIdx}').value = val; updateSectionSrc(${sIdx},${secIdx},val); }, '${typeTab}')" title="Abrir Galería">🔍</button>
                 </div></div>`;
    }
    if (sec.type === 'collage') {
        const srcs = sec.src || [];
        html += `<label>Rutas de Imágenes</label>`;
        srcs.forEach((url, i) => {
            html += `
            <div class="control-group" style="display:flex; gap:8px;">
               <input type="text" value="${url}" id="col-${sIdx}-${secIdx}-${i}" placeholder="Ej: fotos/carpeta/foto1.png" onchange="updateSectionSrcArray(${sIdx},${secIdx},${i},this.value)" style="flex:1;">
               <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => { document.getElementById('col-${sIdx}-${secIdx}-${i}').value = val; updateSectionSrcArray(${sIdx},${secIdx},${i},val); }, 'images')" title="Abrir Galería">🔍</button>
               <button class="btn-icon danger" style="padding:0; width:36px; height:36px; border-radius:4px; font-size:12px;" onclick="removeCollageImage(${sIdx}, ${secIdx}, ${i})">❌</button>
            </div>`;
        });
        html += `<button class="btn-icon" style="width:100%; margin-bottom:10px; background:#e2e8f0; border-radius:4px" onclick="addCollageImage(${sIdx},${secIdx})">➕ Añadir Imagen al Collage</button>`;

        const layouts = ['3t', '3l', '4', '5m', 'scatter', 'carousel'];
        html += `<div class="control-group"><label>Diseño del Collage</label>
        <select onchange="updateSectionData(${sIdx},${secIdx},'layout',this.value)">
           ${layouts.map(a => `<option value="${a}" ${d.layout === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select></div>`;
    }

    if (['foto', 'video', 'gif', 'collage'].includes(sec.type)) {
        html += `<div class="control-group"><label>Texto Principal</label><input type="text" value="${d.texto || ''}" onchange="updateSectionData(${sIdx},${secIdx},'texto',this.value)" placeholder="Opcional..."></div>`;
    }
    if (['foto', 'collage'].includes(sec.type)) {
        html += `<div class="control-group"><label>Subtexto</label><input type="text" value="${d.subtexto || ''}" onchange="updateSectionData(${sIdx},${secIdx},'subtexto',this.value)" placeholder="Opcional..."></div>`;
    }

    if (sec.type === 'mensaje') {
        html += `<div class="control-group"><label>Emoji Decorativo</label><input type="text" value="${d.emoji || ''}" onchange="updateSectionData(${sIdx},${secIdx},'emoji',this.value)"></div>`;
        html += `<div class="control-group"><label>Texto del Mensaje</label><textarea style="width:100%;height:80px;padding:8px" onchange="updateSectionData(${sIdx},${secIdx},'texto',this.value)">${d.texto || ''}</textarea></div>`;
        html += `<div class="control-group"><label>Firma</label><input type="text" value="${d.firma || ''}" onchange="updateSectionData(${sIdx},${secIdx},'firma',this.value)"></div>`;
    }

    if (sec.type === 'musica') {
        html += `<div class="control-group"><label>Ruta del Archivo (.mp3)</label>
                 <div class="input-with-gallery">
                    <input type="text" value="${d.src || ''}" id="sc-m-${sIdx}-${secIdx}" onchange="updateSectionData(${sIdx},${secIdx},'src',this.value)">
                    <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => { document.getElementById('sc-m-${sIdx}-${secIdx}').value = val; updateSectionData(${sIdx},${secIdx},'src',val); }, 'audios')" title="Abrir Galería">🔍</button>
                 </div></div>`;
        html += `<div class="control-group"><label>Título</label><input type="text" value="${d.title || ''}" onchange="updateSectionData(${sIdx},${secIdx},'title',this.value)"></div>`;
        html += `<div class="control-group"><label>Artista / Subtítulo</label><input type="text" value="${d.artist || ''}" onchange="updateSectionData(${sIdx},${secIdx},'artist',this.value)"></div>`;
    }

    // JSON Avanzado para arrays u objetos grandes
    if (['inicio', 'cierre', 'deseos', 'estadisticas'].includes(sec.type)) {
        const payload = Array.isArray(sec.data) ? sec.data : d;
        html += `<div class="control-group">
            <label style="color:#d97706">✏️ Datos Avanzados (Formato JSON estricto)</label>
            <textarea style="width:100%;height:150px;font-family:monospace;font-size:11px;padding:8px" onchange="updateSectionDataJSON(${sIdx},${secIdx},this.value)">${JSON.stringify(payload, null, 2)}</textarea>
        </div>`;
    } else {
        const anims = ['pop', 'zoom', 'flip', 'elastic', 'fade-blur', 'stagger', 'scatter'];
        html += `<div class="control-group"><label>Animación al Entrar</label>
        <select onchange="updateSectionData(${sIdx},${secIdx},'animacion',this.value)">
           <option value="">Ninguna</option>
           ${anims.map(a => `<option value="${a}" ${d.animacion === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select></div>`;
    }

    return html;
}

// --- 4. ACCIONES Y EVENTOS ---
window.updateScreenMusic = (sIdx, prop, val) => {
    if (!albumData.screens[sIdx].opts) albumData.screens[sIdx].opts = {};
    if (!albumData.screens[sIdx].opts.music) albumData.screens[sIdx].opts.music = {};

    albumData.screens[sIdx].opts.music[prop] = val;

    // Si la ruta está vacía, desactivamos la música para esta pantalla
    if (prop === 'src' && (!val || !val.trim())) {
        delete albumData.screens[sIdx].opts.music;
    }
    softDispatch();
};

selectGlobalTransition.addEventListener('change', e => { albumData.global.transition = e.target.value; updatePreview(); });
checkGlobalProgress.addEventListener('change', e => { albumData.global.progress = e.target.checked; updatePreview(); });

window.toggleScreen = (i, e) => {
    e?.stopPropagation();
    const items = document.querySelectorAll('.screen-item');
    const wasOpen = items[i].classList.contains('open');

    // Comportamiento de acordeón: cerramos todos y abrimos el seleccionado
    items.forEach(it => it.classList.remove('open'));
    if (!wasOpen) items[i].classList.add('open');

    // Avisar al iframe que cambie a esta página
    const frame = document.getElementById('preview-frame');
    if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'ALBUM_GOTO_SCREEN', index: i }, '*');
    }
};

window.selectScreen = (i, e) => {
    e?.stopPropagation();
    selectedTarget = { kind: 'screen', sIdx: i };
    const items = document.querySelectorAll('.screen-item');
    items.forEach(it => it.classList.remove('selected'));
    if (items[i]) items[i].classList.add('selected', 'open');
    const frame = document.getElementById('preview-frame');
    if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'ALBUM_GOTO_SCREEN', index: i }, '*');
    }
    renderInspectorPanel();
};

window.selectSection = (sIdx, secIdx, e) => {
    e?.stopPropagation();
    selectedTarget = { kind: 'section', sIdx, secIdx };
    document.querySelectorAll('.section-item, .screen-item').forEach(el => el.classList.remove('selected'));
    const screen = document.querySelectorAll('.screen-item')[sIdx];
    if (screen) {
        screen.classList.add('open');
        const section = screen.querySelectorAll('.section-item')[secIdx];
        if (section) section.classList.add('selected');
    }
    const frame = document.getElementById('preview-frame');
    if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'ALBUM_GOTO_SCREEN', index: sIdx }, '*');
    }
    renderInspectorPanel();
};

window.toggleLegacySectionForm = (button, e) => {
    e.stopPropagation();
    const form = button.closest('.section-item')?.lastElementChild;
    if (!form) return;
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

window.updateScreenProp = (i, prop, val) => { albumData.screens[i][prop] = val; softDispatch(); };
window.updateScreenOpts = (i, prop, val) => { if (!albumData.screens[i].opts) albumData.screens[i].opts = {}; albumData.screens[i].opts[prop] = val; softDispatch(); };

// Setters de Secciones
window.updateSectionData = (sIdx, secIdx, prop, val) => {
    if (!albumData.screens[sIdx].sections[secIdx].data) albumData.screens[sIdx].sections[secIdx].data = {};
    albumData.screens[sIdx].sections[secIdx].data[prop] = val;
    softDispatch();
};
window.updateSectionDataJSON = (sIdx, secIdx, val) => {
    try {
        albumData.screens[sIdx].sections[secIdx].data = JSON.parse(val);
        softDispatch();
    } catch (e) {
        alert("JSON Inválido. Asegúrate de usar comillas dobles en las claves.");
    }
};
window.updateSectionSrc = (sIdx, secIdx, val) => { albumData.screens[sIdx].sections[secIdx].src = val; softDispatch(); };
window.updateSectionSrcArray = (sIdx, secIdx, i, val) => { albumData.screens[sIdx].sections[secIdx].src[i] = val; softDispatch(); };

window.updateSelectedScreenProp = (prop, val) => {
    if (selectedTarget.kind !== 'screen') return;
    albumData.screens[selectedTarget.sIdx][prop] = val;
    dispatchChange();
};

window.updateSelectedScreenOpt = (prop, val) => {
    if (selectedTarget.kind !== 'screen') return;
    const screen = albumData.screens[selectedTarget.sIdx];
    if (!screen.opts) screen.opts = {};
    screen.opts[prop] = val;
    dispatchChange();
};

window.updateSelectedScreenMusic = (prop, val) => {
    if (selectedTarget.kind !== 'screen') return;
    const screen = albumData.screens[selectedTarget.sIdx];
    if (!screen.opts) screen.opts = {};
    if (!screen.opts.music) screen.opts.music = {};
    screen.opts.music[prop] = val;
    if (prop === 'src' && (!val || !val.trim())) delete screen.opts.music;
    dispatchChange();
};

window.updateSelectedScreenBackground = (prop, val) => {
    if (selectedTarget.kind !== 'screen') return;
    const screen = albumData.screens[selectedTarget.sIdx];
    if (!screen.opts) screen.opts = {};
    if (!screen.opts.background) screen.opts.background = {};
    screen.opts.background[prop] = val;
    if (prop === 'image' && val) screen.opts.background.type = 'image';
    if (prop === 'gradient' && val && screen.opts.background.type !== 'image') screen.opts.background.type = 'gradient';
    if (prop === 'color' && val && !screen.opts.background.type) screen.opts.background.type = 'color';
    dispatchChange();
};

window.updateSelectedScreenParticles = (prop, val) => {
    if (selectedTarget.kind !== 'screen') return;
    const screen = albumData.screens[selectedTarget.sIdx];
    if (!screen.opts) screen.opts = {};
    if (!screen.opts.particles) screen.opts.particles = {};
    screen.opts.particles[prop] = val;
    dispatchChange();
};

window.updateSelectedSectionSrc = (val) => {
    if (selectedTarget.kind !== 'section') return;
    albumData.screens[selectedTarget.sIdx].sections[selectedTarget.secIdx].src = val;
    dispatchChange();
};

window.updateSelectedSectionSrcArray = (idx, val) => {
    if (selectedTarget.kind !== 'section') return;
    const sec = albumData.screens[selectedTarget.sIdx].sections[selectedTarget.secIdx];
    if (!Array.isArray(sec.src)) sec.src = [];
    sec.src[idx] = val;
    dispatchChange();
};

window.updateSelectedSectionData = (prop, val) => {
    if (selectedTarget.kind !== 'section') return;
    const sec = albumData.screens[selectedTarget.sIdx].sections[selectedTarget.secIdx];
    if (!sec.data || Array.isArray(sec.data)) sec.data = {};
    sec.data[prop] = val;
    dispatchChange();
};

window.updateSelectedSectionJSON = (val) => {
    if (selectedTarget.kind !== 'section') return;
    try {
        albumData.screens[selectedTarget.sIdx].sections[selectedTarget.secIdx].data = JSON.parse(val);
        dispatchChange();
    } catch (e) {
        alert("JSON inválido. Revisa comillas, comas y llaves.");
    }
};

window.addSelectedCollageImage = () => {
    if (selectedTarget.kind !== 'section') return;
    const sec = albumData.screens[selectedTarget.sIdx].sections[selectedTarget.secIdx];
    if (!Array.isArray(sec.src)) sec.src = [];
    sec.src.push('');
    dispatchChange();
};

window.removeSelectedCollageImage = (idx) => {
    if (selectedTarget.kind !== 'section') return;
    const sec = albumData.screens[selectedTarget.sIdx].sections[selectedTarget.secIdx];
    if (!Array.isArray(sec.src)) return;
    sec.src.splice(idx, 1);
    dispatchChange();
};

window.updateSelectedListItem = (idx, prop, val) => {
    if (selectedTarget.kind !== 'section') return;
    const sec = albumData.screens[selectedTarget.sIdx].sections[selectedTarget.secIdx];
    if (!Array.isArray(sec.data)) sec.data = [];
    if (!sec.data[idx]) sec.data[idx] = {};
    sec.data[idx][prop] = val;
    dispatchChange();
};

window.addSelectedListItem = () => {
    if (selectedTarget.kind !== 'section') return;
    const sec = albumData.screens[selectedTarget.sIdx].sections[selectedTarget.secIdx];
    if (!Array.isArray(sec.data)) sec.data = [];
    if (sec.type === 'estadisticas') {
        sec.data.push({ numero: '1', etiqueta: 'nuevo dato' });
    } else {
        sec.data.push({ icono: '✨', texto: 'Nuevo deseo' });
    }
    dispatchChange();
};

window.removeSelectedListItem = (idx) => {
    if (selectedTarget.kind !== 'section') return;
    const sec = albumData.screens[selectedTarget.sIdx].sections[selectedTarget.secIdx];
    if (!Array.isArray(sec.data)) return;
    sec.data.splice(idx, 1);
    dispatchChange();
};

window.reRenderSectionForm = (sIdx, secIdx) => {
    const screens = document.querySelectorAll('.screen-item');
    if (screens[sIdx]) {
        const sectionsList = screens[sIdx].querySelector(`#sections-list-${sIdx}`);
        if (sectionsList) {
            const sectionItems = sectionsList.querySelectorAll('.section-item');
            if (sectionItems[secIdx]) {
                const formContainer = sectionItems[secIdx].querySelector('div[style*="display:none"]');
                // Puede que el form esté visible o no, preservamos su estado de display
                const currentDisplay = formContainer ? formContainer.style.display : 'none';

                const sec = albumData.screens[sIdx].sections[secIdx];
                const newItem = renderSectionItem(sIdx, secIdx, sec);
                sectionsList.replaceChild(newItem, sectionItems[secIdx]);

                // Keep the panel open if it was open
                if (currentDisplay !== 'none') {
                    const newForm = newItem.querySelector('div[style*="display:none"]');
                    if (newForm) newForm.style.display = currentDisplay;
                }
            }
        }
    }
}

window.addCollageImage = (sIdx, secIdx) => {
    if (!Array.isArray(albumData.screens[sIdx].sections[secIdx].src)) albumData.screens[sIdx].sections[secIdx].src = [];
    albumData.screens[sIdx].sections[secIdx].src.push('fotos/solo/foto1.png');

    // Solo reescribimos el formulario local, no el item entero
    const curIdx = albumData.screens[sIdx].sections[secIdx].src.length - 1;
    const url = albumData.screens[sIdx].sections[secIdx].src[curIdx];

    // Instead of reRenderSectionForm, append just the input to avoid focus loss
    const screens = document.querySelectorAll('.screen-item');
    if (screens[sIdx]) {
        const sectionsList = screens[sIdx].querySelector(`#sections-list-${sIdx}`);
        if (sectionsList) {
            const sectionItems = sectionsList.querySelectorAll('.section-item');
            if (sectionItems[secIdx]) {
                const formContainer = sectionItems[secIdx].lastElementChild;
                if (formContainer) {
                    // Find the "Añadir Imagen" button to insert before it
                    const addButton = formContainer.querySelector('button[onclick*="addCollageImage"]');
                    if (addButton) {
                        const newRow = document.createElement('div');
                        newRow.className = 'control-group';
                        newRow.style.cssText = 'display:flex; gap:8px;';
                        newRow.innerHTML = `
                            <input type="text" value="${url}" id="col-${sIdx}-${secIdx}-${curIdx}" placeholder="Ej: fotos/carpeta/foto1.png" onchange="updateSectionSrcArray(${sIdx},${secIdx},${curIdx},this.value)" style="flex:1;">
                            <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => { document.getElementById('col-${sIdx}-${secIdx}-${curIdx}').value = val; updateSectionSrcArray(${sIdx},${secIdx},${curIdx},val); }, 'images')" title="Abrir Galería">🔍</button>
                            <button class="btn-icon danger" style="padding:0; width:36px; height:36px; border-radius:4px; font-size:12px;" onclick="removeCollageImage(${sIdx}, ${secIdx}, ${curIdx})">❌</button>
                        `;
                        formContainer.insertBefore(newRow, addButton);
                    }
                }
            }
        }
    }
    softDispatch();
};

window.removeCollageImage = (sIdx, secIdx, imageIdx) => {
    if (Array.isArray(albumData.screens[sIdx].sections[secIdx].src)) {
        albumData.screens[sIdx].sections[secIdx].src.splice(imageIdx, 1);

        // Remove the DOM element surgically
        const screens = document.querySelectorAll('.screen-item');
        if (screens[sIdx]) {
            const sectionsList = screens[sIdx].querySelector(`#sections-list-${sIdx}`);
            if (sectionsList) {
                const sectionItems = sectionsList.querySelectorAll('.section-item');
                if (sectionItems[secIdx]) {
                    const formContainer = sectionItems[secIdx].lastElementChild;
                    if (formContainer) {
                        // Find all rows, skip the actual label 
                        const rows = formContainer.querySelectorAll('div[style*="display:flex; gap:8px;"]');
                        if (rows[imageIdx]) {
                            rows[imageIdx].remove();
                            // Re-bind the IDs and onclick handlers of subsequent rows to match the new indices
                            const remainingRows = formContainer.querySelectorAll('div[style*="display:flex; gap:8px;"]');
                            remainingRows.forEach((row, newIdx) => {
                                const input = row.querySelector('input');
                                const btnDel = row.querySelector('.danger');
                                const btnGal = row.querySelector('button[title="Abrir Galería"]');

                                input.id = `col-${sIdx}-${secIdx}-${newIdx}`;
                                input.onchange = function () { updateSectionSrcArray(sIdx, secIdx, newIdx, this.value) };
                                btnDel.onclick = function () { removeCollageImage(sIdx, secIdx, newIdx) };
                                btnGal.onclick = function () { openGallery(val => { document.getElementById(`col-${sIdx}-${secIdx}-${newIdx}`).value = val; updateSectionSrcArray(sIdx, secIdx, newIdx, val); }, 'images') };
                            });
                        }
                    }
                }
            }
        }
        softDispatch();
    }
};

window.addScreen = () => {
    albumData.screens.push({ name: 'Pantalla Nueva', opts: { emoji: '✨', color: 'pink' }, sections: [] });
    dispatchChange();
    setTimeout(() => { document.querySelectorAll('.screen-item')[albumData.screens.length - 1].classList.add('open'); screensList.scrollTo({ top: screensList.scrollHeight, behavior: 'smooth' }); }, 50);
};

window.duplicateScreen = (i, e) => {
    e.stopPropagation();
    const copy = cloneData(albumData.screens[i]);
    copy.name = `${copy.name || 'Pantalla'} copia`;
    albumData.screens.splice(i + 1, 0, copy);
    selectedTarget = { kind: 'screen', sIdx: i + 1 };
    dispatchChange();
    showEditorToast('Pantalla duplicada');
};

window.deleteScreen = (i, e) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta pantalla y su contenido?')) {
        albumData.screens.splice(i, 1);
        selectedTarget = { kind: 'review' };
        dispatchChange();
    }
};

window.duplicateSection = (sIdx, secIdx, e) => {
    e.stopPropagation();
    const source = albumData.screens[sIdx].sections[secIdx];
    const copy = cloneData(source);
    if (copy.data && !Array.isArray(copy.data) && copy.data.texto) {
        copy.data.texto = `${copy.data.texto} copia`;
    }
    albumData.screens[sIdx].sections.splice(secIdx + 1, 0, copy);
    selectedTarget = { kind: 'section', sIdx, secIdx: secIdx + 1 };
    dispatchChange();
    showEditorToast('Módulo duplicado');
};

window.deleteSection = (sIdx, secIdx, e) => {
    e.stopPropagation();
    if (confirm('¿Quitar módulo de la pantalla?')) {
        albumData.screens[sIdx].sections.splice(secIdx, 1);
        if (selectedTarget.kind === 'section' && selectedTarget.sIdx === sIdx && selectedTarget.secIdx === secIdx) {
            selectedTarget = { kind: 'screen', sIdx };
        }

        // Remove from DOM to keep state
        const sContainer = document.querySelectorAll('.screen-item')[sIdx].querySelector(`#sections-list-${sIdx}`);
        if (sContainer && sContainer.children[secIdx]) {
            sContainer.removeChild(sContainer.children[secIdx]);
            // Re-render the remaining children to fix secIdx bounds
            const items = Array.from(sContainer.children);
            sContainer.innerHTML = '';
            albumData.screens[sIdx].sections.forEach((s, idx) => {
                sContainer.appendChild(renderSectionItem(sIdx, idx, s));
            });
        }
        softDispatch();
    }
};

window.clearCacheAndRestart = () => {
    if (confirm('⚠️ ¿Estás seguro de que deseas borrar tu progreso no exportado y reiniciar el editor?\n\nEsta acción eliminará el autoguardado actual y cargará los datos de fábrica.')) {
        localStorage.removeItem('albumBuilderDraft');
        location.reload();
    }
};

// --- Inyectar Botón de Limpiar Caché en la UI principal ---
(function () {
    const parent = btnExport.parentNode;
    const btnClear = document.createElement('button');
    btnClear.className = 'pill-btn';
    btnClear.type = 'button';
    btnClear.title = 'Descartar borrador local';
    btnClear.style.cssText = 'border-color:#fecaca;color:#dc2626;background:#fff;';
    btnClear.innerHTML = 'Reiniciar';
    btnClear.onclick = window.clearCacheAndRestart;
    parent.insertBefore(btnClear, btnExport);
})();

function buildDefaultSection(type) {
    let newData = { type };

    // Default mock data so it doesn't crash the UI when inserted
    if (type === 'foto') newData = { type, src: 'fotos/solo/foto0.png', data: { texto: 'Mi Foto', animacion: 'zoom' } };
    else if (type === 'video') newData = { type, src: 'videos/video0.mp4', data: { texto: 'Nuevo video', animacion: 'flip', silencio: true } };
    else if (type === 'mensaje') newData = { type, data: { emoji: '💌', texto: 'Texto del mensaje...', firma: 'Firma' } };
    else if (type === 'musica') newData = { type, data: { src: 'mp3/Arena_Ardiente.mp3', title: 'Canción Nueva', volume: 0.8, loop: true } };
    else if (type === 'collage') newData = { type, src: ['fotos/solo/foto0.png', 'fotos/solo/foto1.png', 'fotos/solo/foto2.jpeg'], data: { layout: '3t', texto: 'Nuevo Collage' } };
    else if (type === 'inicio') newData = { type, data: { foto: 'fotos/solo/foto0.png', nombre: 'Nombre', mensaje: 'Mensaje', emoji: '🎉', tag: 'Hoy es un día especial' } };
    else if (type === 'cierre') newData = { type, data: { titulo: '¡Te quiero mucho!', subtitulo: 'Por muchos más momentos así', emoji: '❤️' } };
    else if (type === 'deseos') newData = { type, data: [{ icono: '✨', texto: 'Que todos tus sueños se sigan cumpliendo' }] };
    else if (type === 'estadisticas') newData = { type, data: [{ numero: '100%', etiqueta: 'momentos especiales' }] };
    else newData.data = {};

    return newData;
}

function insertSection(sIdx, type) {
    const newData = buildDefaultSection(type);

    if (!albumData.screens[sIdx].sections) albumData.screens[sIdx].sections = [];
    albumData.screens[sIdx].sections.push(newData);

    // Injecting the new HTML node directly to save layout context
    const secIdx = albumData.screens[sIdx].sections.length - 1;
    const secContainer = document.querySelectorAll('.screen-item')[sIdx].querySelector(`#sections-list-${sIdx}`);
    if (secContainer) {
        const newItem = renderSectionItem(sIdx, secIdx, newData);
        secContainer.appendChild(newItem);
        // Despliega automáticamente el nuevo panel
        const childForm = newItem.querySelector('div[style*="display:none"]');
        if (childForm) childForm.style.display = 'block';
    }

    softDispatch();
}

window.addSection = (sIdx, type = null) => {
    if (type) {
        insertSection(sIdx, type);
        return;
    }
    openModulePicker(sIdx);
};

window.openModulePicker = (sIdx) => {
    activeModuleScreenIdx = sIdx;
    modulePickerGrid.innerHTML = MODULE_TYPES.map(m => `
        <button type="button" class="module-card" onclick="selectModuleType('${m.type}')">
            <span class="module-icon">${m.icon}</span>
            <span class="module-title">${m.title}</span>
            <span class="module-desc">${m.desc}</span>
        </button>
    `).join('');
    moduleModal.classList.add('active');
};

window.closeModulePicker = () => {
    moduleModal.classList.remove('active');
    activeModuleScreenIdx = null;
};

window.selectModuleType = (type) => {
    if (activeModuleScreenIdx === null) return;
    insertSection(activeModuleScreenIdx, type);
    closeModulePicker();
};

window.setPreviewSize = (mode) => {
    const frame = document.querySelector('.preview-frame');
    const buttons = document.querySelectorAll('.preview-toolbar .pill-btn, .appbar-center .pill-btn');
    frame.classList.toggle('compact', mode === 'compact');
    buttons.forEach(btn => btn.classList.remove('active'));
    [...buttons]
        .filter(btn => btn.textContent.trim() === (mode === 'compact' ? 'Compacto' : 'Móvil'))
        .forEach(btn => btn.classList.add('active'));
};

window.selectReview = () => {
    selectedTarget = { kind: 'review' };
    document.querySelectorAll('.section-item, .screen-item').forEach(el => el.classList.remove('selected'));
    renderInspectorPanel();
};

function collectReferencedAssets() {
    const refs = [];
    const addRef = (value) => {
        if (typeof value === 'string' && /^(fotos|videos|mp3)\//.test(value)) refs.push(value);
    };

    (albumData.screens || []).forEach(screen => {
        addRef(screen?.opts?.music?.src);
        (screen.sections || []).forEach(sec => {
            addRef(sec.src);
            if (Array.isArray(sec.src)) sec.src.forEach(addRef);
            if (sec.data) {
                addRef(sec.data.src);
                addRef(sec.data.foto);
            }
        });
    });

    return [...new Set(refs)];
}

function getLoadedGalleryPaths() {
    const all = [
        ...(galleryFiles?.images || []),
        ...(galleryFiles?.videos || []),
        ...(galleryFiles?.audios || [])
    ];
    return new Set(all.map(item => item.path));
}

function buildPreviewAlbumData() {
    const data = cloneData(albumData);
    const toPreviewUrl = (value) => typeof value === 'string' ? getGalleryPreviewUrl(value) : value;

    (data.screens || []).forEach(screen => {
        if (screen?.opts?.background?.image) screen.opts.background.image = toPreviewUrl(screen.opts.background.image);
        if (screen?.opts?.music?.src) screen.opts.music.src = toPreviewUrl(screen.opts.music.src);
        (screen.sections || []).forEach(sec => {
            if (typeof sec.src === 'string') sec.src = toPreviewUrl(sec.src);
            if (Array.isArray(sec.src)) sec.src = sec.src.map(toPreviewUrl);
            if (sec.data) {
                if (sec.data.src) sec.data.src = toPreviewUrl(sec.data.src);
                if (sec.data.foto) sec.data.foto = toPreviewUrl(sec.data.foto);
            }
        });
    });

    return data;
}

function inferGalleryTypeFromPath(path) {
    if (path.startsWith('videos/') || /\.(mp4|webm|mov)$/i.test(path)) return 'videos';
    if (path.startsWith('mp3/') || /\.(mp3|wav|ogg|m4a)$/i.test(path)) return 'audios';
    return 'images';
}

function replaceAssetReference(oldPath, newPath) {
    const replaceValue = (value) => value === oldPath ? newPath : value;

    (albumData.screens || []).forEach(screen => {
        if (screen?.opts?.music?.src) screen.opts.music.src = replaceValue(screen.opts.music.src);
        (screen.sections || []).forEach(sec => {
            if (typeof sec.src === 'string') sec.src = replaceValue(sec.src);
            if (Array.isArray(sec.src)) sec.src = sec.src.map(replaceValue);
            if (sec.data) {
                if (sec.data.src) sec.data.src = replaceValue(sec.data.src);
                if (sec.data.foto) sec.data.foto = replaceValue(sec.data.foto);
            }
        });
    });

    selectedTarget = { kind: 'review' };
    dispatchChange();
}

window.replaceMissingAsset = (oldPath) => {
    const galleryType = inferGalleryTypeFromPath(oldPath);
    openGallery((newPath) => replaceAssetReference(oldPath, newPath), galleryType);
    if (gallerySearch) {
        gallerySearch.value = oldPath.split('/').pop().replace(/\.[^.]+$/, '');
        renderGalleryGrid();
    }
};

function renderInspectorPanel() {
    if (!reviewPanel) return;

    if (selectedTarget.kind === 'screen' && albumData.screens?.[selectedTarget.sIdx]) {
        renderScreenInspector(selectedTarget.sIdx);
        return;
    }

    if (
        selectedTarget.kind === 'section' &&
        albumData.screens?.[selectedTarget.sIdx]?.sections?.[selectedTarget.secIdx]
    ) {
        renderSectionInspector(selectedTarget.sIdx, selectedTarget.secIdx);
        return;
    }

    renderReviewPanel();
}

function renderScreenInspector(sIdx) {
    const screen = albumData.screens[sIdx];
    const opts = screen.opts || {};
    const music = opts.music || {};
    const bg = opts.background || {};
    const particles = opts.particles || {};

    reviewPanel.innerHTML = `
        <div class="inspector-form">
            <span class="eyebrow">Pantalla ${sIdx + 1}</span>
            <h3>${escapeHtml(screen.name || 'Pantalla sin título')}</h3>
            <p class="muted">Edita la identidad, color y música de fondo de esta pantalla.</p>
            ${inspectorPreviewCardForScreen(screen)}

            <div class="control-group">
                <label>Nombre de la pantalla</label>
                <input type="text" value="${escapeHtml(screen.name || '')}" onchange="updateSelectedScreenProp('name', this.value)">
            </div>

            <div class="field-row">
                <div class="control-group">
                    <label>Emoji</label>
                    <input type="text" value="${escapeHtml(opts.emoji || '')}" onchange="updateSelectedScreenOpt('emoji', this.value)">
                </div>
                <div class="control-group">
                    <label>Tema</label>
                    <select onchange="updateSelectedScreenOpt('color', this.value)">
                        ${SCREEN_COLORS.map(c => `<option value="${c}" ${opts.color === c ? 'selected' : ''}>${c.toUpperCase()}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="review-card" style="margin-top:6px;">
                <h4>Fondo de pantalla <span class="status-chip ${bg.type ? 'ok' : 'warn'}">${bg.type || 'Global'}</span></h4>
                <div class="background-preview" style="${backgroundPreviewStyle(bg)}"></div>
                <div class="control-group">
                    <label>Tipo de fondo</label>
                    <select onchange="updateSelectedScreenBackground('type', this.value)">
                        <option value="" ${!bg.type ? 'selected' : ''}>Usar fondo global</option>
                        <option value="color" ${bg.type === 'color' ? 'selected' : ''}>Color sólido</option>
                        <option value="gradient" ${bg.type === 'gradient' ? 'selected' : ''}>Degradado</option>
                        <option value="image" ${bg.type === 'image' ? 'selected' : ''}>Imagen</option>
                    </select>
                </div>
                <div class="field-row">
                    <div class="control-group">
                        <label>Color</label>
                        <input type="color" value="${escapeHtml(bg.color || '#0f172a')}" onchange="updateSelectedScreenBackground('color', this.value)">
                    </div>
                    <div class="control-group">
                        <label>Degradado CSS</label>
                        <input type="text" value="${escapeHtml(bg.gradient || 'linear-gradient(135deg, #0f172a, #3b0764)')}" onchange="updateSelectedScreenBackground('gradient', this.value)">
                    </div>
                </div>
                <div class="control-group">
                    <label>Imagen de fondo</label>
                    <div class="input-with-gallery">
                        <input type="text" value="${escapeHtml(bg.image || '')}" onchange="updateSelectedScreenBackground('image', this.value)" placeholder="fotos/fondo.png">
                        <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => updateSelectedScreenBackground('image', val), 'images')" title="Abrir Galería">🔍</button>
                    </div>
                    <p class="muted" style="margin:6px 0 0;">Al elegir una imagen, el tipo de fondo cambia automáticamente a Imagen.</p>
                </div>
            </div>

            <div class="review-card" style="margin-top:6px;">
                <h4>Iconos cayendo <span class="status-chip ${particles.enabled === false ? 'warn' : 'ok'}">${particles.enabled === false ? 'Apagado' : 'Activo'}</span></h4>
                <label class="checkbox-label" style="margin-bottom:12px;">
                    <input type="checkbox" ${particles.enabled === false ? '' : 'checked'} onchange="updateSelectedScreenParticles('enabled', this.checked)">
                    Mostrar iconos en esta pantalla
                </label>
                <div class="control-group">
                    <label>Iconos</label>
                    <input type="text" value="${escapeHtml(particles.icons || '💖 ✨ ⭐ 🎊 🎈 💫 🎉 🌸')}" onchange="updateSelectedScreenParticles('icons', this.value)" placeholder="💖 ✨ ⭐ 🎊">
                </div>
                <div class="field-row">
                    <div class="control-group">
                        <label>Cantidad</label>
                        <input type="number" min="0" max="120" value="${particles.count ?? 30}" onchange="updateSelectedScreenParticles('count', parseInt(this.value, 10))">
                    </div>
                    <div class="control-group">
                        <label>Velocidad</label>
                        <input type="number" min="0.1" max="3" step="0.1" value="${particles.speed ?? 1}" onchange="updateSelectedScreenParticles('speed', parseFloat(this.value))">
                    </div>
                </div>
                <div class="control-group">
                    <label>Opacidad</label>
                    <input type="number" min="0.02" max="1" step="0.05" value="${particles.opacity ?? 0.35}" onchange="updateSelectedScreenParticles('opacity', parseFloat(this.value))">
                </div>
            </div>

            <div class="review-card" style="margin-top:6px;">
                <h4>Música de fondo <span class="status-chip ${music.src ? 'ok' : 'warn'}">${music.src ? 'Activa' : 'Opcional'}</span></h4>
                <div class="control-group">
                    <label>Ruta MP3</label>
                    <div class="input-with-gallery">
                        <input type="text" value="${escapeHtml(music.src || '')}" onchange="updateSelectedScreenMusic('src', this.value)" placeholder="mp3/cancion.mp3">
                        <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => updateSelectedScreenMusic('src', val), 'audios')" title="Abrir Galería">🔍</button>
                    </div>
                </div>
                <div class="field-row">
                    <div class="control-group">
                        <label>Título</label>
                        <input type="text" value="${escapeHtml(music.title || '')}" onchange="updateSelectedScreenMusic('title', this.value)">
                    </div>
                    <div class="control-group">
                        <label>Volumen</label>
                        <input type="number" min="0" max="1" step="0.1" value="${music.volume ?? 0.5}" onchange="updateSelectedScreenMusic('volume', parseFloat(this.value))">
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderSectionInspector(sIdx, secIdx) {
    const sec = albumData.screens[sIdx].sections[secIdx];
    const d = sec.data || {};
    const meta = moduleMeta(sec.type);

    reviewPanel.innerHTML = `
        <div class="inspector-form">
            <span class="eyebrow">${escapeHtml(albumData.screens[sIdx].name || `Pantalla ${sIdx + 1}`)}</span>
            <h3>${meta.icon} ${escapeHtml(meta.title)}</h3>
            <p class="muted">${escapeHtml(meta.desc || 'Ajusta este módulo del álbum.')}</p>
            ${inspectorPreviewCardForSection(sec)}
            ${sectionInspectorFields(sec, d)}
        </div>
    `;
}

function sectionInspectorFields(sec, d) {
    const commonAnim = `
        <div class="control-group">
            <label>Animación</label>
            <select onchange="updateSelectedSectionData('animacion', this.value)">
                <option value="">Ninguna</option>
                ${ANIMATIONS.map(a => `<option value="${a}" ${d.animacion === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
        </div>
    `;

    if (['foto', 'gif'].includes(sec.type)) {
        return `
            ${singleAssetField(sec.src || '', 'images')}
            <div class="control-group">
                <label>Texto principal</label>
                <input type="text" value="${escapeHtml(d.texto || '')}" onchange="updateSelectedSectionData('texto', this.value)">
            </div>
            <div class="control-group">
                <label>Subtexto</label>
                <input type="text" value="${escapeHtml(d.subtexto || '')}" onchange="updateSelectedSectionData('subtexto', this.value)">
            </div>
            ${commonAnim}
        `;
    }

    if (sec.type === 'video') {
        return `
            ${singleAssetField(sec.src || '', 'videos')}
            <div class="control-group">
                <label>Texto principal</label>
                <input type="text" value="${escapeHtml(d.texto || '')}" onchange="updateSelectedSectionData('texto', this.value)">
            </div>
            ${commonAnim}
        `;
    }

    if (sec.type === 'collage') {
        const srcs = Array.isArray(sec.src) ? sec.src : [];
        return `
            <div class="control-group">
                <label>Diseño del collage</label>
                <select onchange="updateSelectedSectionData('layout', this.value)">
                    ${COLLAGE_LAYOUTS.map(l => `<option value="${l}" ${d.layout === l ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
            </div>
            <div class="control-group">
                <label>Imágenes</label>
                ${srcs.map((src, idx) => `
                    <div class="asset-row">
                        <input type="text" value="${escapeHtml(src || '')}" onchange="updateSelectedSectionSrcArray(${idx}, this.value)">
                        <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => updateSelectedSectionSrcArray(${idx}, val), 'images')" title="Abrir Galería">🔍</button>
                        <button type="button" class="btn-icon danger" onclick="removeSelectedCollageImage(${idx})" title="Quitar">✕</button>
                    </div>
                `).join('')}
                <button type="button" class="secondary-btn" onclick="addSelectedCollageImage()">Añadir imagen</button>
            </div>
            <div class="control-group">
                <label>Texto principal</label>
                <input type="text" value="${escapeHtml(d.texto || '')}" onchange="updateSelectedSectionData('texto', this.value)">
            </div>
            <div class="control-group">
                <label>Subtexto</label>
                <input type="text" value="${escapeHtml(d.subtexto || '')}" onchange="updateSelectedSectionData('subtexto', this.value)">
            </div>
            ${commonAnim}
        `;
    }

    if (sec.type === 'mensaje') {
        return `
            <div class="control-group">
                <label>Emoji</label>
                <input type="text" value="${escapeHtml(d.emoji || '')}" onchange="updateSelectedSectionData('emoji', this.value)">
            </div>
            <div class="control-group">
                <label>Mensaje</label>
                <textarea class="inspector-textarea" onchange="updateSelectedSectionData('texto', this.value)">${escapeHtml(d.texto || '')}</textarea>
            </div>
            <div class="control-group">
                <label>Firma</label>
                <input type="text" value="${escapeHtml(d.firma || '')}" onchange="updateSelectedSectionData('firma', this.value)">
            </div>
            ${commonAnim}
        `;
    }

    if (sec.type === 'musica') {
        return `
            <div class="control-group">
                <label>Archivo MP3</label>
                <div class="input-with-gallery">
                    <input type="text" value="${escapeHtml(d.src || '')}" onchange="updateSelectedSectionData('src', this.value)">
                    <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => updateSelectedSectionData('src', val), 'audios')" title="Abrir Galería">🔍</button>
                </div>
            </div>
            <div class="control-group">
                <label>Título</label>
                <input type="text" value="${escapeHtml(d.title || '')}" onchange="updateSelectedSectionData('title', this.value)">
            </div>
            <div class="control-group">
                <label>Artista / subtítulo</label>
                <input type="text" value="${escapeHtml(d.artist || '')}" onchange="updateSelectedSectionData('artist', this.value)">
            </div>
            <div class="control-group">
                <label>Volumen</label>
                <input type="number" min="0" max="1" step="0.1" value="${d.volume ?? 1}" onchange="updateSelectedSectionData('volume', parseFloat(this.value))">
            </div>
        `;
    }

    if (sec.type === 'inicio') {
        return `
            <div class="control-group">
                <label>Foto principal</label>
                <div class="input-with-gallery">
                    <input type="text" value="${escapeHtml(d.foto || '')}" onchange="updateSelectedSectionData('foto', this.value)">
                    <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => updateSelectedSectionData('foto', val), 'images')" title="Abrir Galería">🔍</button>
                </div>
            </div>
            <div class="control-group">
                <label>Nombre</label>
                <input type="text" value="${escapeHtml(d.nombre || '')}" onchange="updateSelectedSectionData('nombre', this.value)">
            </div>
            <div class="control-group">
                <label>Mensaje</label>
                <textarea class="inspector-textarea" onchange="updateSelectedSectionData('mensaje', this.value)">${escapeHtml(d.mensaje || '')}</textarea>
            </div>
            <div class="field-row">
                <div class="control-group">
                    <label>Emoji</label>
                    <input type="text" value="${escapeHtml(d.emoji || '')}" onchange="updateSelectedSectionData('emoji', this.value)">
                </div>
                <div class="control-group">
                    <label>Etiqueta</label>
                    <input type="text" value="${escapeHtml(d.tag || '')}" onchange="updateSelectedSectionData('tag', this.value)">
                </div>
            </div>
        `;
    }

    if (sec.type === 'cierre') {
        return `
            <div class="control-group">
                <label>Título</label>
                <input type="text" value="${escapeHtml(d.titulo || '')}" onchange="updateSelectedSectionData('titulo', this.value)">
            </div>
            <div class="control-group">
                <label>Subtítulo</label>
                <input type="text" value="${escapeHtml(d.subtitulo || '')}" onchange="updateSelectedSectionData('subtitulo', this.value)">
            </div>
            <div class="control-group">
                <label>Emoji</label>
                <input type="text" value="${escapeHtml(d.emoji || '')}" onchange="updateSelectedSectionData('emoji', this.value)">
            </div>
        `;
    }

    if (sec.type === 'deseos') {
        const items = Array.isArray(sec.data) ? sec.data : [];
        return `
            <div class="control-group">
                <label>Deseos</label>
                ${items.map((item, idx) => `
                    <div class="review-card" style="margin-bottom:10px;">
                        <div class="field-row">
                            <div class="control-group" style="margin-bottom:8px;">
                                <label>Icono</label>
                                <input type="text" value="${escapeHtml(item.icono || '')}" onchange="updateSelectedListItem(${idx}, 'icono', this.value)">
                            </div>
                            <div class="control-group" style="margin-bottom:8px;">
                                <label>Acción</label>
                                <button type="button" class="secondary-btn" style="width:100%; color:#dc2626; border-color:#fecaca;" onclick="removeSelectedListItem(${idx})">Quitar</button>
                            </div>
                        </div>
                        <div class="control-group" style="margin-bottom:0;">
                            <label>Texto</label>
                            <input type="text" value="${escapeHtml(item.texto || '')}" onchange="updateSelectedListItem(${idx}, 'texto', this.value)">
                        </div>
                    </div>
                `).join('')}
                <button type="button" class="secondary-btn" onclick="addSelectedListItem()">Añadir deseo</button>
            </div>
        `;
    }

    if (sec.type === 'estadisticas') {
        const items = Array.isArray(sec.data) ? sec.data : [];
        return `
            <div class="control-group">
                <label>Estadísticas</label>
                ${items.map((item, idx) => `
                    <div class="review-card" style="margin-bottom:10px;">
                        <div class="field-row">
                            <div class="control-group" style="margin-bottom:8px;">
                                <label>Número</label>
                                <input type="text" value="${escapeHtml(item.numero || '')}" onchange="updateSelectedListItem(${idx}, 'numero', this.value)">
                            </div>
                            <div class="control-group" style="margin-bottom:8px;">
                                <label>Acción</label>
                                <button type="button" class="secondary-btn" style="width:100%; color:#dc2626; border-color:#fecaca;" onclick="removeSelectedListItem(${idx})">Quitar</button>
                            </div>
                        </div>
                        <div class="control-group" style="margin-bottom:0;">
                            <label>Etiqueta</label>
                            <input type="text" value="${escapeHtml(item.etiqueta || '')}" onchange="updateSelectedListItem(${idx}, 'etiqueta', this.value)">
                        </div>
                    </div>
                `).join('')}
                <button type="button" class="secondary-btn" onclick="addSelectedListItem()">Añadir estadística</button>
            </div>
        `;
    }

    return `
        <div class="review-card">
            <h4>Editor JSON <span class="status-chip warn">Avanzado</span></h4>
            <p class="muted">Este módulo aún no tiene formulario visual completo.</p>
            <textarea class="inspector-textarea" style="min-height:220px;font-family:ui-monospace, SFMono-Regular, Consolas, monospace;" onchange="updateSelectedSectionJSON(this.value)">${escapeHtml(JSON.stringify(sec.data || {}, null, 2))}</textarea>
        </div>
    `;
}

function singleAssetField(value, galleryType) {
    return `
        <div class="control-group">
            <label>Archivo</label>
            <div class="input-with-gallery">
                <input type="text" value="${escapeHtml(value || '')}" onchange="updateSelectedSectionSrc(this.value)">
                <button type="button" class="btn-icon" style="background:#e2e8f0;" onclick="openGallery(val => updateSelectedSectionSrc(val), '${galleryType}')" title="Abrir Galería">🔍</button>
            </div>
        </div>
    `;
}

function renderReviewPanel() {

    const screens = albumData.screens || [];
    const sections = screens.flatMap(s => s.sections || []);
    const assets = collectReferencedAssets();
    const loadedPaths = getLoadedGalleryPaths();
    const hasGalleryIndex = loadedPaths.size > 0;
    const missingAssets = hasGalleryIndex ? assets.filter(path => !loadedPaths.has(path)) : [];
    const emptyScreens = screens.filter(s => !s.sections || s.sections.length === 0).length;
    const advancedSections = sections.filter(s => !['inicio', 'cierre', 'deseos', 'estadisticas', 'foto', 'gif', 'video', 'collage', 'mensaje', 'musica'].includes(s.type)).length;

    reviewPanel.innerHTML = `
        <div class="review-card">
            <h4>Medios <span class="status-chip ${missingAssets.length ? 'warn' : assets.length ? 'ok' : 'warn'}">${hasGalleryIndex ? `${missingAssets.length} faltantes` : `${assets.length} rutas`}</span></h4>
            <ul class="review-list">
                <li>${assets.length ? `${assets.length} ruta(s) referenciadas.` : 'Aún no hay medios referenciados.'}</li>
                <li>${hasGalleryIndex ? `${loadedPaths.size} archivo(s) cargados en la galería.` : 'Importa la carpeta del proyecto para validar archivos faltantes.'}</li>
                ${missingAssets.slice(0, 5).map(path => `
                    <li style="color:#b45309;">
                        Falta: ${escapeHtml(path)}
                        <button type="button" class="secondary-btn" style="margin-top:6px; padding:5px 8px; font-size:11px;" onclick='replaceMissingAsset(${JSON.stringify(path)})'>Reemplazar</button>
                    </li>
                `).join('')}
                ${missingAssets.length > 5 ? `<li style="color:#b45309;">Y ${missingAssets.length - 5} más.</li>` : ''}
            </ul>
        </div>
        <div class="review-card">
            <h4>Estructura <span class="status-chip ${emptyScreens ? 'warn' : 'ok'}">${screens.length} pantallas</span></h4>
            <ul class="review-list">
                <li>${sections.length} módulos en total.</li>
                <li>${emptyScreens ? `${emptyScreens} pantalla(s) vacía(s).` : 'Todas las pantallas tienen contenido.'}</li>
            </ul>
        </div>
        <div class="review-card">
            <h4>Datos privados <span class="status-chip ok">Separado</span></h4>
            <ul class="review-list">
                <li>El contenido vive en album-data.js.</li>
                <li>Fotos, videos, música y datos están ignorados por Git.</li>
            </ul>
        </div>
        <div class="review-card">
            <h4>Edición avanzada <span class="status-chip ${advancedSections ? 'warn' : 'ok'}">${advancedSections}</span></h4>
            <ul class="review-list">
                <li>${advancedSections ? 'Hay módulos que aún dependen de JSON manual.' : 'Los módulos conocidos tienen inspector visual.'}</li>
                <li>Próximo paso: mejorar galería y empaquetado final.</li>
            </ul>
        </div>
    `;
}

// --- 5. EXPORTADOR ---
btnExport.addEventListener('click', async () => {
    btnExport.textContent = "⏳ Generando...";
    try {
        const jsonText = JSON.stringify(albumData, null, 2);
        const dataContent = [
            '// Datos privados del album. Este archivo esta ignorado por Git.',
            '// Colocalo junto a index.html para que el visor cargue este album.',
            `window.albumData = ${jsonText};`,
            ''
        ].join('\n');

        const blob = new Blob([dataContent], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'album-data.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        alert("No se pudo exportar album-data.js. Puedes abrir la consola (F12) y copiar el objeto 'albumData' manualmente.");
        console.error("Error Exportando:", err);
    } finally {
        btnExport.textContent = "Exportar Datos";
    }
});

// --- 6. GALERÍA DE MEDIOS LOCALES (WEBKITDIRECTORY & FILESYSTEM API) ---
let galleryFiles = { images: [], videos: [], audios: [] };
let activeGalleryInput = null; // Guardará el callback para actualizar el valor cuando se seleccione un archivo
let currentGalleryTab = 'images';

const dirPicker = document.getElementById('dir-picker');
const btnImportDir = document.getElementById('btn-import-dir');
const btnRestoreDir = document.getElementById('btn-restore-dir');
const legacyPickerContainer = document.getElementById('legacy-picker-container');
const galleryModal = document.getElementById('gallery-modal');
const galleryGrid = document.getElementById('gallery-grid');
const galleryStatus = document.getElementById('gallery-status');
const gallerySearch = document.getElementById('gallery-search');

function clearGalleryFiles() {
    Object.values(galleryFiles).flat().forEach(item => {
        if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
    });
    galleryFiles = { images: [], videos: [], audios: [] };
}

function inferMediaBucket(file, path) {
    const type = file.type || '';
    const normalized = mediaPathKey(path);
    if (type.startsWith('image/') || /\.(avif|gif|jpe?g|png|webp|bmp|svg)$/i.test(normalized)) return 'images';
    if (type.startsWith('video/') || /\.(mp4|m4v|mov|webm|ogv)$/i.test(normalized)) return 'videos';
    if (type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(normalized)) return 'audios';
    return '';
}

// Helper for IndexedDB to store Directory Handles
const idb = {
    db: null,
    async init() {
        return new Promise((resolve) => {
            const req = indexedDB.open('AlbumBuilderDB', 1);
            req.onupgradeneeded = (e) => e.target.result.createObjectStore('settings');
            req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            req.onerror = () => resolve();
        });
    },
    async set(key, val) {
        if (!this.db) return;
        return new Promise(resolve => {
            const tx = this.db.transaction('settings', 'readwrite');
            tx.objectStore('settings').put(val, key);
            tx.oncomplete = () => resolve();
        });
    },
    async get(key) {
        if (!this.db) return null;
        return new Promise(resolve => {
            const tx = this.db.transaction('settings', 'readonly');
            const req = tx.objectStore('settings').get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    }
};

async function processFileExt(file, path) {
    const normalizedPath = mediaPathKey(path);
    if (file.name.startsWith('.') || normalizedPath.includes('/.')) return;
    const bucket = inferMediaBucket(file, normalizedPath);
    if (!bucket) return;

    const url = URL.createObjectURL(file);
    const item = { name: file.name, path: normalizedPath, url: url, file: file };

    galleryFiles[bucket].push(item);
}

function finishGalleryLoad() {
    Object.values(galleryFiles).forEach(items => items.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true })));
    const total = galleryFiles.images.length + galleryFiles.videos.length + galleryFiles.audios.length;
    galleryStatus.textContent = `${total} archivos cargados (Fotos: ${galleryFiles.images.length}, Videos: ${galleryFiles.videos.length}, Audios: ${galleryFiles.audios.length})`;
    updatePreview();
    renderInspectorPanel();
    alert(`✅ ¡Directorio escaneado con éxito!\n\nSe encontraron ${total} archivos multimedia.\nAhora puedes usar los botones "🔍 Galería" para insertarlos visualmente.`);

    // Cambiar la visual del botón para indicar que hay algo cargado
    const labelElem = document.querySelector('.folder-picker-btn');
    if (labelElem) {
        labelElem.innerHTML = `<span>📂</span> Directorio Cargado (${total} archivos)`;
        labelElem.style.background = '#059669';
    }
}

// Fallback legacy (webkitdirectory)
dirPicker.addEventListener('change', async (e) => {
    clearGalleryFiles();
    const files = Array.from(e.target.files);

    for (const file of files) {
        const path = file.webkitRelativePath.split('/').slice(1).join('/'); // Remover nombre de la carpeta raíz
        if (path) await processFileExt(file, path);
    }
    finishGalleryLoad();
});

// Modern File System API Recursion
async function scanDirectoryHandle(dirHandle, basePath = '') {
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            const file = await entry.getFile();
            await processFileExt(file, basePath + entry.name);
        } else if (entry.kind === 'directory') {
            await scanDirectoryHandle(entry, basePath + entry.name + '/');
        }
    }
}

window.openGallery = (onSelectCallback, explicitType = null) => {
    activeGalleryInput = onSelectCallback;
    if (explicitType) currentGalleryTab = explicitType;
    galleryModal.classList.add('active');
    if (gallerySearch && !gallerySearch.value) gallerySearch.placeholder = `Buscar en ${currentGalleryTab}...`;
    renderGalleryGrid();

    // Auto cambiar de pestaña según el tipo solicitado visualmente
    document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.gallery-tab[onclick*="${currentGalleryTab}"]`);
    if (activeTab) activeTab.classList.add('active');
};

window.closeGallery = () => {
    galleryModal.classList.remove('active');
    activeGalleryInput = null;
    if (gallerySearch) gallerySearch.value = '';
};

window.switchGalleryTab = (tab, evt = null) => {
    currentGalleryTab = tab;
    document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
    const target = evt?.currentTarget || document.querySelector(`.gallery-tab[onclick*="${currentGalleryTab}"]`);
    if (target) target.classList.add('active');
    if (gallerySearch) gallerySearch.placeholder = `Buscar en ${currentGalleryTab}...`;
    renderGalleryGrid();
};

function renderGalleryGrid() {
    galleryGrid.innerHTML = '';
    const query = (gallerySearch?.value || '').trim().toLowerCase();
    const items = (galleryFiles[currentGalleryTab] || []).filter(item => {
        if (!query) return true;
        return item.name.toLowerCase().includes(query) || item.path.toLowerCase().includes(query);
    });
    const totalInTab = (galleryFiles[currentGalleryTab] || []).length;
    if (galleryStatus) {
        galleryStatus.textContent = `${items.length}/${totalInTab} visibles · Fotos ${galleryFiles.images.length} · Videos ${galleryFiles.videos.length} · Música ${galleryFiles.audios.length}`;
    }

    if (items.length === 0) {
        const message = totalInTab === 0
            ? `No se encontraron ${currentGalleryTab} en la carpeta importada.`
            : `No hay resultados para "${escapeHtml(query)}".`;
        galleryGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px;">${message}<br><span style="font-size:12px;color:#64748b;">Importa la carpeta raíz o cambia la búsqueda.</span></div>`;
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.title = item.path;

        if (currentGalleryTab === 'images') {
            div.innerHTML = `<img src="${item.url}" loading="lazy"><div class="item-label">${item.name}</div>`;
        } else if (currentGalleryTab === 'videos') {
            div.innerHTML = `<video src="${item.url}" muted onmouseenter="this.play()" onmouseleave="this.pause()"></video><div class="item-label">${item.name}</div>`;
        } else {
            div.innerHTML = `<div class="audio-icon">🎵<audio src="${item.url}" controls preload="metadata" onclick="event.stopPropagation()"></audio></div><div class="item-label">${item.name}</div>`;
        }

        div.onclick = () => {
            if (activeGalleryInput) {
                // Inyectamos el webkitRelativePath limpio (ej: 'fotos/solo/foto.png')
                activeGalleryInput(item.path);
                closeGallery();
                renderInspectorPanel();
            }
        };

        galleryGrid.appendChild(div);
    });
}

window.renderGalleryGrid = renderGalleryGrid;

// --- INITIALIZATION ---
async function initFileSystem() {
    await idb.init();

    // Check if modern API is supported
    if (!window.showDirectoryPicker) {
        btnImportDir.style.display = 'none';
        legacyPickerContainer.style.display = 'inline-flex';
        return;
    }

    // Check if we have a saved handle
    const savedHandle = await idb.get('projectDir');
    if (savedHandle) {
        btnRestoreDir.style.display = 'block';
        btnRestoreDir.innerHTML = `<span>🔄</span> Restaurar Carpeta Anterior (${savedHandle.name})`;
    }

    btnImportDir.addEventListener('click', async () => {
        try {
            const dirHandle = await showDirectoryPicker();
            await idb.set('projectDir', dirHandle);

            clearGalleryFiles();
            galleryStatus.textContent = 'Escaneando directorio...';

            await scanDirectoryHandle(dirHandle);
            finishGalleryLoad();

            btnRestoreDir.style.display = 'block';
            btnRestoreDir.innerHTML = `<span>🔄</span> Restaurar Carpeta Anterior (${dirHandle.name})`;
        } catch (e) {
            console.error(e);
        }
    });

    btnRestoreDir.addEventListener('click', async () => {
        try {
            const dirHandle = await idb.get('projectDir');
            if (!dirHandle) return;

            // Request permission again (browsers usually require this after reload)
            const perm = await dirHandle.requestPermission({ mode: 'read' });
            if (perm !== 'granted') throw new Error("Permiso denegado por el usuario.");

            clearGalleryFiles();
            galleryStatus.textContent = 'Restaurando directorio...';

            await scanDirectoryHandle(dirHandle);
            finishGalleryLoad();

        } catch (e) {
            alert("No se pudo restaurar la carpeta (puede haber sido movida o permisos insuficientes). Elige una nueva.");
            console.error(e);
            btnRestoreDir.style.display = 'none';
            await idb.set('projectDir', null);
        }
    });
}

// Inicializar el guardado local del directorio
initFileSystem();

