// =========================================================
//  admin.js — Admin Panel
//  Firebase Auth + Firestore CRUD
// =========================================================
import { db, auth, storage } from './firebase-config.js';
import {
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
    orderBy, query, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import {
    ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

// ─── DOM refs ─────────────────────────────────────────────
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const navItems = document.querySelectorAll('[data-page]');
const pages = document.querySelectorAll('.page');
const toast = document.getElementById('toast');
const modalOverlay = document.getElementById('modalOverlay');
const modal = modalOverlay?.querySelector('.modal');
const credentialModalOverlay = document.getElementById('credentialModalOverlay');
const credentialModal = credentialModalOverlay?.querySelector('.modal');

// ─── Auth state ───────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        dashboard.classList.add('visible');
        loadProjects();
        loadCredentials();
        loadBio();
        loadContact();
    } else {
        loginScreen.style.display = 'flex';
        dashboard.classList.remove('visible');
    }
});

// ─── Login ────────────────────────────────────────────────
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'A entrar...';
    loginError.classList.remove('show');

    try {
        await signInWithEmailAndPassword(
            auth,
            document.getElementById('loginEmail').value.trim(),
            document.getElementById('loginPassword').value
        );
    } catch (err) {
        loginError.textContent = 'Email ou senha incorretos.';
        loginError.classList.add('show');
        btn.disabled = false; btn.textContent = 'Entrar';
    }
});

logoutBtn?.addEventListener('click', () => signOut(auth));

// ─── Navigation ───────────────────────────────────────────
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.dataset.page;
        navItems.forEach(n => n.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));
        item.classList.add('active');
        document.getElementById(`page-${target}`)?.classList.add('active');
    });
});

// ─── Toast ────────────────────────────────────────────────
function showToast(msg, type = '') {
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─── Modal helpers ────────────────────────────────────────
function openModal(title) {
    document.getElementById('modalTitle').textContent = title;
    modal.querySelector('form').reset();
    document.getElementById('editProjectId').value = '';
    resetUploadZone();
    modalOverlay.classList.add('open');
}

function closeModal() { modalOverlay.classList.remove('open'); }

document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal);
modalOverlay?.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

// ─── IMAGE UPLOAD ZONE ────────────────────────────────────
const uploadZone = document.getElementById('uploadZone');
const uploadInput = document.getElementById('projectImageFile');
const uploadInner = document.getElementById('uploadZoneInner');
const uploadPreview = document.getElementById('uploadPreview');
const uploadPreviewImg = document.getElementById('uploadPreviewImg');
const uploadRemove = document.getElementById('uploadRemove');
const uploadProgress = document.getElementById('uploadProgress');
const uploadProgressBar = document.getElementById('uploadProgressBar');
let pendingFile = null; // file selected but not yet uploaded

function resetUploadZone() {
    pendingFile = null;
    uploadInput.value = '';
    uploadInner.style.display = '';
    uploadPreview.style.display = 'none';
    uploadProgress.style.display = 'none';
    uploadProgressBar.style.width = '0%';
    document.getElementById('projectImage').value = '';
}

function showUploadPreview(src) {
    uploadInner.style.display = 'none';
    uploadPreviewImg.src = src;
    uploadPreview.style.display = 'block';
}

function handleFileSelected(file) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('Formato inválido. Usa PNG, JPG ou WEBP.', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Imagem demasiado grande. Máximo 5MB.', 'error');
        return;
    }
    pendingFile = file;
    const reader = new FileReader();
    reader.onload = e => showUploadPreview(e.target.result);
    reader.readAsDataURL(file);
}

// Click to open file picker
uploadZone?.addEventListener('click', (e) => {
    if (e.target === uploadRemove) return;
    uploadInput.click();
});

uploadInput?.addEventListener('change', () => {
    if (uploadInput.files[0]) handleFileSelected(uploadInput.files[0]);
});

// Drag & drop
uploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFileSelected(e.dataTransfer.files[0]);
});

// Remove / reset
uploadRemove?.addEventListener('click', (e) => { e.stopPropagation(); resetUploadZone(); });

// Upload file to Firebase Storage, returns download URL
async function uploadImage(file) {
    const ext = file.name.split('.').pop();
    const path = `projects/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadProgress.style.display = 'block';
        task.on('state_changed',
            (snap) => {
                const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
                uploadProgressBar.style.width = pct + '%';
            },
            (err) => reject(err),
            async () => {
                const url = await getDownloadURL(task.snapshot.ref);
                uploadProgress.style.display = 'none';
                resolve(url);
            }
        );
    });
}

// ─── PROJECTS ─────────────────────────────────────────────
let projectsCache = [];

async function loadProjects() {
    const list = document.getElementById('projectsList');
    if (!list) return;
    list.innerHTML = '<div style="color:var(--text-2);padding:1rem">A carregar...</div>';

    try {
        const q = query(collection(db, 'projects'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        projectsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderProjectsList();
    } catch (err) {
        list.innerHTML = '<div class="empty-list"><p>Erro ao carregar projetos.</p></div>';
    }
}

function renderProjectsList() {
    const list = document.getElementById('projectsList');
    if (!list) return;

    if (projectsCache.length === 0) {
        list.innerHTML = `
      <div class="empty-list">
        <div class="icon">📂</div>
        <p>Nenhum projeto ainda. Adiciona o primeiro!</p>
      </div>`;
        return;
    }

    list.innerHTML = projectsCache.map(p => `
    <div class="project-row" data-id="${p.id}">
      <div class="project-row-thumb">
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="" loading="lazy">` : ''}
      </div>
      <div class="project-row-info">
        <div class="project-row-title">${p.title || '(sem título)'}</div>
        <div class="project-row-tags">${(p.tags || []).join(', ')}</div>
      </div>
      <div class="project-row-actions">
        <button class="btn btn-outline btn-sm" onclick="editProject('${p.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProject('${p.id}')">Apagar</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('addProjectBtn')?.addEventListener('click', () => {
    document.getElementById('projectOrder').value = projectsCache.length;
    openModal('Adicionar Projeto');
});

// Save project (add or edit)
document.getElementById('projectForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'A guardar...';

    const id = document.getElementById('editProjectId').value;
    const tags = document.getElementById('projectTags').value
        .split(',').map(t => t.trim()).filter(Boolean);


    try {
        // If a new file was selected, upload it first
        let imageUrl = document.getElementById('projectImage').value;
        if (pendingFile) {
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.textContent = 'A fazer upload...';
            imageUrl = await uploadImage(pendingFile);
            pendingFile = null;
        }

        const data = {
            title: document.getElementById('projectTitle').value.trim(),
            description: document.getElementById('projectDesc').value.trim(),
            tags,
            imageUrl,
            liveUrl: document.getElementById('projectLive').value.trim(),
            githubUrl: document.getElementById('projectGithub').value.trim(),
            order: parseInt(document.getElementById('projectOrder').value) || 0,
            updatedAt: serverTimestamp(),
        };

        if (id) {
            await updateDoc(doc(db, 'projects', id), data);
            showToast('Projeto atualizado! ✓', 'success');
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'projects'), data);
            showToast('Projeto adicionado! ✓', 'success');
        }
        closeModal();
        await loadProjects();
    } catch (err) {
        showToast('Erro ao guardar. Verifica a tua config Firebase.', 'error');
        console.error(err);
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar';
    }
});

// Reset upload zone on edit too
window.editProject = (id) => {
    const p = projectsCache.find(x => x.id === id);
    if (!p) return;

    document.getElementById('editProjectId').value = id;
    document.getElementById('projectTitle').value = p.title || '';
    document.getElementById('projectDesc').value = p.description || '';
    document.getElementById('projectTags').value = (p.tags || []).join(', ');
    document.getElementById('projectLive').value = p.liveUrl || '';
    document.getElementById('projectGithub').value = p.githubUrl || '';
    document.getElementById('projectOrder').value = p.order ?? 0;

    // Show existing image preview if available
    resetUploadZone();
    if (p.imageUrl) {
        document.getElementById('projectImage').value = p.imageUrl;
        showUploadPreview(p.imageUrl);
    }

    openModal('Editar Projeto');
};

window.deleteProject = async (id) => {
    if (!confirm('Tens a certeza que queres apagar este projeto?')) return;
    try {
        await deleteDoc(doc(db, 'projects', id));
        projectsCache = projectsCache.filter(p => p.id !== id);
        renderProjectsList();
        showToast('Projeto apagado.', 'success');
    } catch (err) {
        showToast('Erro ao apagar.', 'error');
    }
};

// ─── BIO ──────────────────────────────────────────────────
async function loadBio() {
    const bioField = document.getElementById('bioText');
    if (!bioField) return;

    try {
        const snap = await getDoc(doc(db, 'settings', 'bio'));
        if (snap.exists()) bioField.value = snap.data().bio || '';
    } catch { }
}

document.getElementById('bioForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'A guardar...';

    try {
        await setDoc(doc(db, 'settings', 'bio'), {
            bio: document.getElementById('bioText').value.trim(),
            updatedAt: serverTimestamp()
        });
        showToast('Bio atualizada! ✓', 'success');
    } catch {
        showToast('Erro ao guardar bio.', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar Bio';
    }
});

// ─── CONTACT ──────────────────────────────────────────────
async function loadContact() {
    try {
        const snap = await getDoc(doc(db, 'settings', 'contact'));
        if (!snap.exists()) return;
        const c = snap.data();
        const fields = ['contactEmail', 'contactGithub', 'contactLinkedin', 'contactInstagram', 'contactTwitter'];
        const keys = ['email', 'github', 'linkedin', 'instagram', 'twitter'];
        fields.forEach((f, i) => {
            const el = document.getElementById(f);
            if (el) el.value = c[keys[i]] || '';
        });
    } catch { }
}

document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'A guardar...';

    try {
        await setDoc(doc(db, 'settings', 'contact'), {
            email: document.getElementById('contactEmail').value.trim(),
            github: document.getElementById('contactGithub').value.trim(),
            linkedin: document.getElementById('contactLinkedin').value.trim(),
            instagram: document.getElementById('contactInstagram').value.trim(),
            twitter: document.getElementById('contactTwitter').value.trim(),
            updatedAt: serverTimestamp()
        });
        showToast('Contactos atualizados! ✓', 'success');
    } catch {
        showToast('Erro ao guardar contactos.', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar Contactos';
    }
});

// ─── CREDENTIALS CRUD ─────────────────────────────────────
let credentialsCache = [];

async function loadCredentials() {
    const list = document.getElementById('credentialsList');
    if (!list) return;
    list.innerHTML = '<div style="color:var(--text-2);padding:1rem">A carregar...</div>';

    try {
        const q = query(collection(db, 'credentials'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        credentialsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCredentialsList();
    } catch (err) {
        console.error(err);
        list.innerHTML = '<div style="color:var(--text-2);padding:1rem">Erro ao carregar formações.</div>';
    }
}

function renderCredentialsList() {
    const list = document.getElementById('credentialsList');
    if (!list) return;

    if (credentialsCache.length === 0) {
        list.innerHTML = `
            <div class="empty-list">
                <div class="icon">🎓</div>
                <p>Nenhuma formação adicionada ainda.</p>
            </div>`;
        return;
    }

    list.innerHTML = `
        <div class="projects-list">
            ${credentialsCache.map(c => `
                <div class="project-row">
                    <div class="project-row-info">
                        <div class="project-row-title">${c.title}</div>
                        <div class="project-row-tags">${c.type} • ${c.organization} • ${c.date}</div>
                    </div>
                    <div class="project-row-actions">
                        <button class="btn btn-outline btn-sm" onclick="editCredential('${c.id}')">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteCredential('${c.id}')">✕</button>
                    </div>
                </div>
            `).join('')}
        </div>`;
}

// Credentials Modal Logic
function openCredentialModal(title) {
    document.getElementById('credentialModalTitle').textContent = title;
    document.getElementById('credentialForm').reset();
    document.getElementById('editCredentialId').value = '';
    credentialModalOverlay.classList.add('open');
}

function closeCredentialModal() {
    credentialModalOverlay.classList.remove('open');
}

document.getElementById('addCredentialBtn')?.addEventListener('click', () => {
    openCredentialModal('Adicionar Formação');
});

document.getElementById('credentialModalCloseBtn')?.addEventListener('click', closeCredentialModal);
document.getElementById('credentialModalCancelBtn')?.addEventListener('click', closeCredentialModal);
credentialModalOverlay?.addEventListener('click', (e) => {
    if (e.target === credentialModalOverlay) closeCredentialModal();
});

document.getElementById('credentialForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'A guardar...';

    const id = document.getElementById('editCredentialId').value;
    const data = {
        type: document.getElementById('credType').value,
        title: document.getElementById('credTitle').value.trim(),
        organization: document.getElementById('credOrg').value.trim(),
        date: document.getElementById('credDate').value.trim(),
        updatedAt: serverTimestamp()
    };

    try {
        if (id) {
            await updateDoc(doc(db, 'credentials', id), data);
            showToast('Formação atualizada! ✓', 'success');
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'credentials'), data);
            showToast('Formação adicionada! ✓', 'success');
        }
        closeCredentialModal();
        await loadCredentials();
    } catch (err) {
        console.error(err);
        showToast('Erro ao guardar formação.', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar';
    }
});

window.editCredential = (id) => {
    const c = credentialsCache.find(x => x.id === id);
    if (!c) return;
    document.getElementById('editCredentialId').value = id;
    document.getElementById('credType').value = c.type;
    document.getElementById('credTitle').value = c.title;
    document.getElementById('credOrg').value = c.organization;
    document.getElementById('credDate').value = c.date;
    openCredentialModal('Editar Formação');
};

window.deleteCredential = async (id) => {
    if (!confirm('Apagar esta formação?')) return;
    try {
        await deleteDoc(doc(db, 'credentials', id));
        credentialsCache = credentialsCache.filter(c => c.id !== id);
        renderCredentialsList();
        showToast('Formação removida.', 'success');
    } catch (err) {
        showToast('Erro ao apagar.', 'error');
    }
};

