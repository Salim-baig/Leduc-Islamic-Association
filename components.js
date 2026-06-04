function getNavbar(activePage) {
  const pages = [
    { name: 'Home', href: 'index.html' },
    { name: 'Prayer Times', href: 'prayer-times.html' },
    { name: 'About', href: 'about.html' },
    { name: 'Services', href: 'services.html' },
    { name: 'Events', href: 'events.html' },
    { name: 'Contact', href: 'contact.html' },
  ];

  const links = pages.map(p =>
    `<li><a href="${p.href}" class="nav-link${p.name === activePage ? ' active' : ''}">${p.name}</a></li>`
  ).join('');

  return `
  <nav class="navbar" id="navbar">
    <div class="nav-container">
      <a href="index.html" class="nav-logo">
        <div class="logo-icon"><i class="fas fa-mosque"></i></div>
        <div class="logo-text">
          <span class="logo-main">Leduc Islamic Association</span>
          <span class="logo-sub">Serving the Community with Faith</span>
        </div>
      </a>
      <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-menu" id="navMenu">
        ${links}
        <li><a href="donate.html" class="nav-link nav-donate${activePage === 'Donate' ? ' active' : ''}">Donate</a></li>
        <li><a href="admin-login.html" class="nav-link nav-admin" title="Admin Login"><i class="fas fa-user-shield"></i></a></li>
      </ul>
    </div>
  </nav>`;
}

function getFooter() {
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-about">
          <div class="footer-logo">
            <i class="fas fa-mosque"></i>
            <span>Leduc Islamic Association</span>
          </div>
          <p>Serving the Muslim community of Leduc and surrounding areas with faith, education, and service.</p>
          <div class="social-links">
            <a href="https://www.facebook.com/Leduc.Islamic.Centre" target="_blank" rel="noopener" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
          </div>
        </div>
        <div class="footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="prayer-times.html">Prayer Times</a></li>
            <li><a href="about.html">About</a></li>
            <li><a href="services.html">Services</a></li>
            <li><a href="events.html">Events</a></li>
            <li><a href="contact.html">Contact</a></li>
          </ul>
        </div>
        <div class="footer-contact">
          <h4>Contact Info</h4>
          <ul>
            <li><i class="fas fa-phone"></i> (587) 274-2525</li>
            <li><i class="fas fa-envelope"></i> Leducislamicassociation@gmail.com</li>
            <li><a href="https://maps.google.com/?q=5210+50+Ave+Leduc+AB+T9E+6V2" target="_blank" rel="noopener"><i class="fas fa-location-dot"></i> #4 5210-50 Ave, Leduc, AB T9E 6V2</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; <span id="currentYear"></span> Leduc Islamic Association. All rights reserved.</p>
      </div>
    </div>
  </footer>`;
}

function getPageHead(title) {
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Leduc Islamic Association</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Open+Sans:wght@300;400;500;600;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">`;
}

function loadComponents(activePage) {
  const navPlaceholder = document.getElementById('nav-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (navPlaceholder) navPlaceholder.innerHTML = getNavbar(activePage);
  if (footerPlaceholder) footerPlaceholder.innerHTML = getFooter();
  document.getElementById('currentYear').textContent = new Date().getFullYear();
  initNavbar();
  initMobileMenu();
}

function initNavbar() {
  const navbar = document.getElementById('navbar');
  const isHome = document.querySelector('.hero') !== null;
  if (!isHome) navbar.classList.add('scrolled');
  window.addEventListener('scroll', () => {
    if (isHome) {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
  });
}

async function applyJumahTimes() {
  try {
    const { loadJumahSettings, isFirebaseConfigured } = await import('./firebase-config.js');
    if (!isFirebaseConfigured()) return;
    const data = await loadJumahSettings();
    if (data && data.prayerTime) {
      document.querySelectorAll('.jumah-dynamic-time').forEach(el => {
        el.textContent = data.prayerTime;
      });
      if (data.khutbahTime) {
        document.querySelectorAll('.khutbah-dynamic-time').forEach(el => {
          el.textContent = data.khutbahTime;
          el.closest('.khutbah-row')?.style.removeProperty('display');
        });
      }
    }
  } catch {
    // Firebase not configured — keep default times
  }
}

async function loadPublicSiteSettings() {
  try {
    const { loadPublicSettings, isFirebaseConfigured } = await import('./firebase-config.js');
    if (!isFirebaseConfigured()) return null;
    return await loadPublicSettings();
  } catch {
    return null;
  }
}

function initMobileMenu() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    menu.classList.toggle('active');
  });
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('active');
      toggle.classList.remove('active');
    });
  });
}
