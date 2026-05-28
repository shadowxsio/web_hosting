/* ==========================================================================
   INTERACTIVE CV CONTROLLER
   ========================================================================== */

// Dictionnaire de traductions pour l'interface statique
const TRANSLATIONS = {
  fr: {
    back_to_portfolio: "Courses",
    download_pdf: "Télécharger PDF",
    section_profile: "Profil",
    section_skills: "Compétences",
    section_experiences: "Expériences",
    section_certifications: "Certifications",
    section_education: "Formation",
    section_languages: "Langues"
  },
  en: {
    back_to_portfolio: "Runs",
    download_pdf: "Download PDF",
    section_profile: "Profile",
    section_skills: "Skills",
    section_experiences: "Experience",
    section_certifications: "Certifications",
    section_education: "Education",
    section_languages: "Languages"
  }
};

// Variable globale pour stocker les données du CV une fois chargées
let cvData = null;
let currentLanguage = 'fr';

document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
  loadCVData();
  setupEventListeners();
});

/**
 * Initialise la langue selon le localStorage ou les préférences du navigateur
 */
function initLanguage() {
  const savedLang = localStorage.getItem('cv_lang');
  if (savedLang === 'fr' || savedLang === 'en') {
    currentLanguage = savedLang;
  } else {
    // Détection de la langue du navigateur
    const browserLang = navigator.language || navigator.userLanguage;
    currentLanguage = browserLang.startsWith('fr') ? 'fr' : 'en';
  }
  updateLangButtonUI();
}

/**
 * Configure les écouteurs d'événements pour les boutons d'action
 */
function setupEventListeners() {
  // Bouton de changement de langue
  const langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    langToggle.addEventListener('click', () => {
      currentLanguage = currentLanguage === 'fr' ? 'en' : 'fr';
      localStorage.setItem('cv_lang', currentLanguage);
      updateLangButtonUI();
      if (cvData) {
        renderCV(currentLanguage);
      }
    });
  }

  // Bouton de téléchargement / impression PDF
  const printBtn = document.getElementById('print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

/**
 * Met à jour le libellé visuel du bouton de langue
 */
function updateLangButtonUI() {
  const langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    const textSpan = langToggle.querySelector('.btn-text');
    if (textSpan) {
      // Affiche la langue opposée vers laquelle on va basculer
      textSpan.textContent = currentLanguage === 'fr' ? 'EN' : 'FR';
    }
  }
}

/**
 * Charge asynchronement le fichier YAML de données
 */
async function loadCVData() {
  try {
    const response = await fetch('cv_bilingual.json');
    if (!response.ok) {
      throw new Error(`Erreur lors du chargement : ${response.statusText}`);
    }
    cvData = await response.json();
    renderCV(currentLanguage);
  } catch (error) {
    console.error("Impossible de charger les données du CV :", error);
    document.body.innerHTML = `
      <div style="text-align:center; padding:5rem; font-family:sans-serif; color:var(--color-text-primary);">
        <h2>Erreur de chargement</h2>
        <p>Impossible de lire le fichier de configuration du CV. Veuillez vérifier la console.</p>
        <p>${error.message}</p>
      </div>
    `;
  }
}

/**
 * Traduit les éléments statiques HTML portant l'attribut data-i18n
 */
function translateStaticUI(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      el.textContent = TRANSLATIONS[lang][key];
    }
  });
  
  // Met à jour la langue du document HTML pour le SEO et les lecteurs d'écran
  document.documentElement.lang = lang;
}

/**
 * Rendu dynamique global du CV selon la langue choisie
 */
function renderCV(lang) {
  if (!cvData) return;
  
  // 1. Traduction des éléments d'interface statiques
  translateStaticUI(lang);

  // 2. Rendu du profil
  renderProfile(cvData.profile, lang);

  // 3. Rendu des compétences
  renderSkills(cvData.skills, lang);

  // 4. Rendu des expériences professionnelles
  renderExperiences(cvData.experiences, lang);

  // 5. Rendu des certifications
  renderCertifications(cvData.certifications, lang);

  // 6. Rendu des formations
  renderEducation(cvData.education, lang);

  // 7. Rendu des langues parlées
  renderLanguages(cvData.languages, lang);
}

/**
 * Helper pour obtenir un champ localisé (ou fallback sur la valeur par défaut)
 */
function getLocVal(field, lang) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lang] || field['fr'] || field['en'] || '';
}

/**
 * Injecte les données du profil
 */
function renderProfile(profile, lang) {
  if (!profile) return;
  
  // Nom & Titre
  document.getElementById('cv-name').textContent = getLocVal(profile.name, lang);
  document.getElementById('cv-title').textContent = getLocVal(profile.title, lang);
  
  // Sous-titres / Badges
  const subtitlesContainer = document.getElementById('cv-subtitles');
  subtitlesContainer.innerHTML = '';
  const badges = profile.subtitles ? (profile.subtitles[lang] || profile.subtitles) : [];
  if (Array.isArray(badges)) {
    badges.forEach(badgeText => {
      const span = document.createElement('span');
      span.className = 'subtitle-badge';
      span.textContent = badgeText;
      subtitlesContainer.appendChild(span);
    });
  }

  // Contacts
  const phoneEl = document.getElementById('contact-phone');
  phoneEl.href = `tel:${profile.phone.replace(/\s+/g, '')}`;
  phoneEl.querySelector('span').textContent = profile.phone;

  const emailEl = document.getElementById('contact-email');
  emailEl.href = `mailto:${profile.email}`;
  emailEl.querySelector('span').textContent = profile.email;

  document.getElementById('contact-location').querySelector('span').textContent = getLocVal(profile.location, lang);

  const linkedinEl = document.getElementById('contact-linkedin');
  linkedinEl.href = `https://${profile.linkedin}`;
  linkedinEl.querySelector('span').textContent = profile.linkedin;

  const githubEl = document.getElementById('contact-github');
  githubEl.href = `https://${profile.github}`;
  githubEl.querySelector('span').textContent = profile.github;

  // Résumé / Bio
  document.getElementById('profile-summary').textContent = getLocVal(profile.summary, lang);
}

/**
 * Injecte la liste des compétences
 */
function renderSkills(skills, lang) {
  const container = document.getElementById('skills-container');
  container.innerHTML = '';
  
  if (!skills) return;

  skills.forEach(skillGroup => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'skill-category';

    const title = document.createElement('h3');
    title.className = 'skill-category-title';
    title.textContent = getLocVal(skillGroup.category, lang);
    categoryDiv.appendChild(title);

    const listDiv = document.createElement('div');
    listDiv.className = 'skills-list';

    skillGroup.items.forEach(skillName => {
      const tag = document.createElement('span');
      tag.className = 'skill-tag';
      tag.textContent = getLocVal(skillName, lang);
      listDiv.appendChild(tag);
    });

    categoryDiv.appendChild(listDiv);
    container.appendChild(categoryDiv);
  });
}

/**
 * Injecte la frise chronologique des expériences
 */
function renderExperiences(experiences, lang) {
  const container = document.getElementById('experiences-container');
  container.innerHTML = '';

  if (!experiences) return;

  experiences.forEach(exp => {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    // Puce interactive
    const dot = document.createElement('div');
    dot.className = 'timeline-dot';
    item.appendChild(dot);

    // En-tête de poste
    const header = document.createElement('div');
    header.className = 'job-header';

    const titleCompany = document.createElement('h3');
    titleCompany.className = 'job-title-company';
    titleCompany.innerHTML = `${getLocVal(exp.role, lang)} <span class="job-company">| ${exp.company}</span>`;
    header.appendChild(titleCompany);

    // Métadonnées (Période & Lieu)
    const meta = document.createElement('div');
    meta.className = 'job-meta';

    const period = document.createElement('span');
    period.className = 'job-period';
    period.textContent = getLocVal(exp.period, lang);
    meta.appendChild(period);

    const location = document.createElement('span');
    location.className = 'job-location';
    location.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${getLocVal(exp.location, lang)}`;
    meta.appendChild(location);

    header.appendChild(meta);
    item.appendChild(header);

    // Puces de réalisations
    const bulletsList = document.createElement('ul');
    bulletsList.className = 'job-bullets';

    exp.bullets.forEach(bullet => {
      const li = document.createElement('li');
      li.textContent = getLocVal(bullet, lang);
      bulletsList.appendChild(li);
    });
    item.appendChild(bulletsList);

    // Environnement Technique
    if (exp.env) {
      const envDiv = document.createElement('div');
      envDiv.className = 'job-env';
      envDiv.innerHTML = `<strong>Env. :</strong> ${exp.env}`;
      item.appendChild(envDiv);
    }

    container.appendChild(item);
  });
}

/**
 * Injecte la liste des certifications
 */
function renderCertifications(certs, lang) {
  const container = document.getElementById('certifications-container');
  container.innerHTML = '';

  if (!certs) return;

  certs.forEach(cert => {
    const item = document.createElement('div');
    item.className = 'cert-item';

    const title = document.createElement('span');
    title.className = 'cert-title';
    title.textContent = getLocVal(cert.title, lang);
    item.appendChild(title);

    const sub = document.createElement('span');
    sub.className = 'cert-issuer-period';
    sub.textContent = `${getLocVal(cert.issuer, lang)} • ${getLocVal(cert.period, lang)}`;
    item.appendChild(sub);

    container.appendChild(item);
  });
}

/**
 * Injecte l'historique de formation
 */
function renderEducation(eduList, lang) {
  const container = document.getElementById('education-container');
  container.innerHTML = '';

  if (!eduList) return;

  eduList.forEach(edu => {
    const item = document.createElement('div');
    item.className = 'edu-item';

    const degree = document.createElement('h3');
    degree.className = 'edu-degree';
    degree.textContent = getLocVal(edu.degree, lang);
    item.appendChild(degree);

    const school = document.createElement('span');
    school.className = 'edu-school';
    school.textContent = getLocVal(edu.school, lang);
    item.appendChild(school);

    const period = document.createElement('span');
    period.className = 'edu-period';
    period.textContent = getLocVal(edu.period, lang);
    item.appendChild(period);

    container.appendChild(item);
  });
}

/**
 * Injecte la maîtrise des langues
 */
function renderLanguages(langs, lang) {
  const container = document.getElementById('languages-container');
  container.innerHTML = '';

  if (!langs) return;

  langs.forEach(l => {
    const item = document.createElement('div');
    item.className = 'lang-item';

    const name = document.createElement('span');
    name.className = 'lang-name';
    name.textContent = getLocVal(l.name, lang);
    item.appendChild(name);

    const level = document.createElement('span');
    level.className = 'lang-level';
    level.textContent = getLocVal(l.level, lang);
    item.appendChild(level);

    container.appendChild(item);
  });
}
