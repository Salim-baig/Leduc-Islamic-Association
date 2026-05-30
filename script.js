// Navigation is now handled by components.js

// ============================================
// Prayer Times - Fetch from OIAC via proxy, fallback to Aladhan API
// ============================================
async function fetchPrayerTimes() {
  try {
    await fetchFromAladhan();
  } catch {
    console.log('Aladhan API failed, trying OIAC');
    try { await fetchFromOIAC(); } catch { /* silent */ }
  }
}

async function fetchFromOIAC() {
  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.oiacedmonton.ca/prayertimes');
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error('Proxy fetch failed');

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const today = new Date();
  const day = today.getDate();

  const rows = doc.querySelectorAll('table tr, .prayer-row, tr');
  let found = false;

  for (const row of rows) {
    const cells = row.querySelectorAll('td, th');
    if (cells.length >= 7) {
      const cellDay = parseInt(cells[0]?.textContent?.trim());
      if (cellDay === day) {
        const times = Array.from(cells).map(c => c.textContent.trim());
        applyOIACTimes(times);
        found = true;
        break;
      }
    }
  }

  if (!found) {
    const allText = doc.body?.textContent || '';
    const timePattern = /(\d{1,2}:\d{2})\s*(AM|PM)/gi;
    const matches = [...allText.matchAll(timePattern)];

    if (matches.length >= 6) {
      applyExtractedTimes(matches);
    } else {
      throw new Error('Could not parse OIAC prayer times');
    }
  }

  updateDates();
  updateNextPrayer();
}

function applyOIACTimes(times) {
  const fields = [
    { adhan: 'fajrAdhan', iqamah: 'fajrIqamah' },
    { adhan: 'sunrise', iqamah: null },
    { adhan: 'dhuhrAdhan', iqamah: 'dhuhrIqamah' },
    { adhan: 'asrAdhan', iqamah: 'asrIqamah' },
    { adhan: 'maghribAdhan', iqamah: 'maghribIqamah' },
    { adhan: 'ishaAdhan', iqamah: 'ishaIqamah' }
  ];

  let timeIndex = 1;
  for (const field of fields) {
    if (timeIndex < times.length) {
      const timeText = times[timeIndex];
      const timeParts = timeText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/gi);
      if (timeParts && timeParts[0]) {
        document.getElementById(field.adhan).textContent = timeParts[0].trim();
        if (field.iqamah && timeParts[1]) {
          document.getElementById(field.iqamah).textContent = timeParts[1].trim();
        }
      }
      timeIndex++;
    }
  }
}

function applyExtractedTimes(matches) {
  const ids = ['fajrAdhan', 'sunrise', 'dhuhrAdhan', 'asrAdhan', 'maghribAdhan', 'ishaAdhan'];
  for (let i = 0; i < Math.min(ids.length, matches.length); i++) {
    document.getElementById(ids[i]).textContent = matches[i][0];
  }
}

async function fetchFromAladhan() {
  const lat = 53.2654;
  const lng = -113.5477;
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

  const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=2`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.code === 200) {
    const timings = data.data.timings;
    const hijri = data.data.date.hijri;

    document.getElementById('fajrAdhan').textContent = formatTime(timings.Fajr);
    document.getElementById('sunrise').textContent = formatTime(timings.Sunrise);
    document.getElementById('dhuhrAdhan').textContent = formatTime(timings.Dhuhr);
    document.getElementById('asrAdhan').textContent = formatTime(timings.Asr);
    document.getElementById('maghribAdhan').textContent = formatTime(timings.Maghrib);
    document.getElementById('ishaAdhan').textContent = formatTime(timings.Isha);

    document.getElementById('fajrIqamah').textContent = addMinutes(timings.Fajr, 20);
    document.getElementById('dhuhrIqamah').textContent = addMinutes(timings.Dhuhr, 15);
    document.getElementById('asrIqamah').textContent = addMinutes(timings.Asr, 15);
    document.getElementById('maghribIqamah').textContent = addMinutes(timings.Maghrib, 5);
    document.getElementById('ishaIqamah').textContent = addMinutes(timings.Isha, 10);

    document.getElementById('islamicDate').textContent =
      `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;

    updateNextPrayer();
  }

  updateDates();
}

function cleanTime(time24) {
  const match = time24.match(/(\d{1,2}):(\d{2})/);
  return match ? { hours: parseInt(match[1]), minutes: parseInt(match[2]) } : null;
}

function formatTime(time24) {
  const t = cleanTime(time24);
  if (!t) return '--:--';
  const period = t.hours >= 12 ? 'PM' : 'AM';
  const hours12 = t.hours % 12 || 12;
  return `${hours12}:${String(t.minutes).padStart(2, '0')} ${period}`;
}

function addMinutes(time24, mins) {
  const t = cleanTime(time24);
  if (!t) return '--:--';
  const date = new Date(2000, 0, 1, t.hours, t.minutes + mins);
  return formatTime(`${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`);
}

function updateDates() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('gregorianDate').textContent = now.toLocaleDateString('en-US', options);
}

function updateNextPrayer() {
  const now = new Date();
  const prayers = [
    { name: 'Fajr', el: 'fajrAdhan' },
    { name: 'Dhuhr', el: 'dhuhrAdhan' },
    { name: 'Asr', el: 'asrAdhan' },
    { name: 'Maghrib', el: 'maghribAdhan' },
    { name: 'Isha', el: 'ishaAdhan' }
  ];

  document.querySelectorAll('.prayer-card').forEach(c => c.classList.remove('active'));

  for (const prayer of prayers) {
    const timeText = document.getElementById(prayer.el)?.textContent;
    if (!timeText || timeText === '--:--') continue;

    const prayerTime = parseTimeString(timeText);
    if (prayerTime && prayerTime > now) {
      const diff = prayerTime - now;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      const nextEl = document.getElementById('nextPrayer');
      if (nextEl) {
        const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        nextEl.textContent = `Next Prayer: ${prayer.name} in ${timeStr}`;
      }

      const card = document.querySelector(`[data-prayer="${prayer.name.toLowerCase()}"]`);
      if (card) card.classList.add('active');
      return;
    }
  }

  const nextEl = document.getElementById('nextPrayer');
  if (nextEl) nextEl.textContent = 'Next Prayer: Fajr (tomorrow)';
}

function parseTimeString(str) {
  const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
}

// ============================================
// Scroll Animations
// ============================================
function initScrollAnimations() {
  const elements = document.querySelectorAll(
    '.service-card, .event-card, .value-item, .prayer-card, .donate-card, .contact-item'
  );

  elements.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}

// ============================================
// Contact Form
// ============================================
function initContactForm() {
  const form = document.getElementById('contactForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;

    const mailtoLink = `mailto:Leducislamicassociation@gmail.com?subject=${encodeURIComponent(subject || 'Website Contact')}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
    window.location.href = mailtoLink;

    form.reset();
  });
}

// ============================================
// Daily Hadith from Alim.org
// ============================================
const HADITH_COLLECTION = [
  { vol: 1, book: 1, num: 1 },
  { vol: 1, book: 2, num: 8 },
  { vol: 1, book: 2, num: 13 },
  { vol: 1, book: 2, num: 15 },
  { vol: 1, book: 2, num: 21 },
  { vol: 1, book: 3, num: 56 },
  { vol: 1, book: 3, num: 71 },
  { vol: 1, book: 4, num: 141 },
  { vol: 1, book: 8, num: 350 },
  { vol: 1, book: 10, num: 505 },
  { vol: 1, book: 11, num: 584 },
  { vol: 1, book: 12, num: 707 },
  { vol: 2, book: 13, num: 1 },
  { vol: 2, book: 18, num: 1 },
  { vol: 2, book: 24, num: 1 },
  { vol: 2, book: 24, num: 7 },
  { vol: 2, book: 26, num: 1 },
  { vol: 3, book: 34, num: 1 },
  { vol: 3, book: 36, num: 1 },
  { vol: 3, book: 43, num: 1 },
  { vol: 3, book: 43, num: 13 },
  { vol: 3, book: 46, num: 1 },
  { vol: 4, book: 52, num: 44 },
  { vol: 4, book: 54, num: 1 },
  { vol: 4, book: 55, num: 1 },
  { vol: 4, book: 56, num: 1 },
  { vol: 5, book: 58, num: 1 },
  { vol: 7, book: 62, num: 1 },
  { vol: 7, book: 64, num: 1 },
  { vol: 7, book: 65, num: 1 },
  { vol: 7, book: 70, num: 1 },
  { vol: 7, book: 72, num: 1 },
  { vol: 8, book: 73, num: 1 },
  { vol: 8, book: 73, num: 13 },
  { vol: 8, book: 73, num: 18 },
  { vol: 8, book: 73, num: 27 },
  { vol: 8, book: 73, num: 56 },
  { vol: 8, book: 74, num: 1 },
  { vol: 8, book: 75, num: 1 },
  { vol: 8, book: 76, num: 1 },
  { vol: 8, book: 76, num: 35 },
  { vol: 8, book: 76, num: 77 },
  { vol: 8, book: 77, num: 1 },
  { vol: 8, book: 78, num: 1 },
  { vol: 8, book: 80, num: 1 },
  { vol: 9, book: 83, num: 1 },
  { vol: 9, book: 85, num: 1 },
  { vol: 9, book: 87, num: 1 },
  { vol: 9, book: 89, num: 1 },
  { vol: 9, book: 90, num: 1 },
  { vol: 9, book: 92, num: 1 },
  { vol: 9, book: 93, num: 1 },
  { vol: 9, book: 97, num: 7373 },
];

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  return Math.floor(diff / 86400000);
}

async function fetchDailyHadith() {
  const cached = getDailyHadithCache();
  if (cached) {
    applyHadith(cached.text, cached.source);
    return;
  }

  const dayIndex = getDayOfYear() % HADITH_COLLECTION.length;
  const hadith = HADITH_COLLECTION[dayIndex];
  const url = `https://www.alim.org/hadith/sahih-bukhari/${hadith.vol}/${hadith.book}/${hadith.num}`;

  try {
    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Fetch failed');

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let hadithText = '';
    const paragraphs = doc.querySelectorAll('p');
    for (const p of paragraphs) {
      const text = p.textContent.trim();
      if (text.toLowerCase().includes('narrated') && text.length > 40) {
        hadithText = text;
        break;
      }
    }

    if (!hadithText) {
      const allText = doc.body?.textContent || '';
      const narratedMatch = allText.match(/Narrated[^.]*\.[^.]*\./i);
      if (narratedMatch) {
        hadithText = narratedMatch[0].trim();
      }
    }

    if (hadithText) {
      if (hadithText.length > 300) {
        hadithText = hadithText.substring(0, 297) + '...';
      }
      const source = `Sahih al-Bukhari, Vol. ${hadith.vol}, Book ${hadith.book}, Hadith ${hadith.num}`;
      saveDailyHadithCache(hadithText, source);
      applyHadith(hadithText, source);
    }
  } catch {
    // Keep default hadith on failure
  }
}

function applyHadith(text, source) {
  const textEl = document.getElementById('dailyHadithText');
  const sourceEl = document.getElementById('dailyHadithSource');
  if (textEl) textEl.textContent = `"${text.replace(/^"|"$/g, '')}"`;
  if (sourceEl) sourceEl.textContent = `— ${source}`;
}

function getDailyHadithCache() {
  try {
    const data = JSON.parse(localStorage.getItem('dailyHadith'));
    if (data && data.date === new Date().toDateString()) return data;
  } catch { /* ignore */ }
  return null;
}

function saveDailyHadithCache(text, source) {
  try {
    localStorage.setItem('dailyHadith', JSON.stringify({
      text, source, date: new Date().toDateString()
    }));
  } catch { /* ignore */ }
}

// ============================================
// Utilities
// ============================================
function setCurrentYear() {
  document.getElementById('currentYear').textContent = new Date().getFullYear();
}
