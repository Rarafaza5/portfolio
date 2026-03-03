// =========================================================
//  main.js — Public Portfolio
//  Loads data from Firestore and renders it into the DOM
// =========================================================
import { db } from './firebase-config.js';
import {
    collection, getDocs, doc, getDoc, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ─── NAV scroll effect ────────────────────────────────────
const nav = document.getElementById('nav');
const toggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
});

toggle?.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
});

navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
    });
});

// ─── Intersection Observer for reveal animations ──────────
const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ─── Load Projects ────────────────────────────────────────
async function loadProjects() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    try {
        const q = query(collection(db, 'projects'), orderBy('order', 'asc'));
        const snap = await getDocs(q);

        if (snap.empty) {
            grid.innerHTML = `
        <div class="projects-empty">
          <div class="icon">🛠️</div>
          <h3>A trabalhar em algo incrível</h3>
          <p>Em breve aqui.</p>
        </div>`;
            return;
        }

        grid.innerHTML = '';
        snap.docs.forEach((docSnap, i) => {
            const p = docSnap.data();
            const card = document.createElement('article');
            card.className = 'project-card';
            card.dataset.id = docSnap.id;

            const tags = (p.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
            const thumb = p.imageUrl
                ? `<img src="${p.imageUrl}" alt="${p.title}" loading="lazy">`
                : `<div class="project-thumb-placeholder">✦</div>`;

            const liveLink = p.liveUrl
                ? `<a href="${p.liveUrl}" target="_blank" rel="noopener" class="project-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>Live
           </a>` : '';

            const ghLink = p.githubUrl
                ? `<a href="${p.githubUrl}" target="_blank" rel="noopener" class="project-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>GitHub
           </a>` : '';

            card.innerHTML = `
        <div class="project-thumb">${thumb}</div>
        <div class="project-body">
          <div class="project-tags">${tags}</div>
          <h3 class="project-title">${p.title || ''}</h3>
          <p class="project-desc">${p.description || ''}</p>
          <div class="project-links">${liveLink}${ghLink}</div>
        </div>`;

            // staggered reveal
            setTimeout(() => {
                observer.observe(card);
            }, i * 80);

            grid.appendChild(card);
        });

    } catch (err) {
        console.error('Error loading projects:', err);
        grid.innerHTML = `<div class="projects-empty"><p>Não foi possível carregar os projetos.</p></div>`;
    }
}

// ─── Load Bio ──────────────────────────────────────────────
async function loadBio() {
    const bioEl = document.getElementById('aboutBio');
    if (!bioEl) return;

    try {
        const snap = await getDoc(doc(db, 'settings', 'bio'));
        if (snap.exists() && snap.data().bio) {
            bioEl.textContent = snap.data().bio;
            bioEl.classList.remove('about-bio-placeholder');
        }
    } catch (err) {
        console.error('Error loading bio:', err);
    }
}

// ─── Load Contact ──────────────────────────────────────────
async function loadContact() {
    try {
        const snap = await getDoc(doc(db, 'settings', 'contact'));
        if (!snap.exists()) return;
        const c = snap.data();

        const emailLink = document.getElementById('contactEmail');
        if (emailLink && c.email) {
            emailLink.href = `mailto:${c.email}`;
            emailLink.textContent = c.email;
        }

        renderSocial('socialGithub', c.github, 'GitHub', '🐙', c.github);
        renderSocial('socialLinkedin', c.linkedin, 'LinkedIn', '💼', c.linkedin);
        renderSocial('socialInstagram', c.instagram, 'Instagram', '📸', c.instagram);
        renderSocial('socialTwitter', c.twitter, 'Twitter / X', '𝕏', c.twitter);

    } catch (err) {
        console.error('Error loading contact:', err);
    }
}

function renderSocial(id, url, name, icon, handle) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!url) { el.closest('.social-item')?.remove(); return; }

    const handleEl = el.querySelector('.social-handle');
    const item = el.closest('.social-item') || el;
    item.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
    if (handleEl) handleEl.textContent = handle?.replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '') || name;
}

// ─── Load Credentials ─────────────────────────────────────
async function loadCredentials() {
    const grid = document.getElementById('credentialsGrid');
    if (!grid) return;

    try {
        const q = query(collection(db, 'credentials'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);

        if (snap.empty) {
            grid.closest('section').style.display = 'none';
            return;
        }

        grid.innerHTML = '';
        snap.docs.forEach((docSnap, i) => {
            const c = docSnap.data();
            const item = document.createElement('div');
            item.className = 'credential-item reveal';

            item.innerHTML = `
                <div class="credential-type">${c.type || 'Certificado'}</div>
                <h3 class="credential-title">${c.title || ''}</h3>
                <div class="credential-org">${c.organization || ''}</div>
                <div class="credential-date">${c.date || ''}</div>
            `;

            // staggered reveal
            setTimeout(() => {
                observer.observe(item);
            }, i * 80);

            grid.appendChild(item);
        });

    } catch (err) {
        console.error('Error loading credentials:', err);
        grid.innerHTML = `<p style="color:var(--text-2)">Não foi possível carregar os certificados.</p>`;
    }
}

// ─── Year in footer ────────────────────────────────────────
const yearEl = document.getElementById('footerYear');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ─── Init ──────────────────────────────────────────────────
loadProjects();
loadCredentials();
loadBio();
loadContact();
