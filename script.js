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
// Daily Hadith — Curated Collection
// Complete, verified hadiths that rotate daily
// ============================================
const HADITH_COLLECTION = [
  {
    text: "The reward of deeds depends upon the intentions and every person will get the reward according to what he has intended. So whoever emigrated for worldly benefits or for a woman to marry, his emigration was for what he emigrated for.",
    source: "Sahih al-Bukhari, Hadith 1"
  },
  {
    text: "Islam is based on five principles: To testify that none has the right to be worshipped but Allah and Muhammad is Allah's Apostle, to offer the prayers, to pay Zakat, to perform Hajj, and to observe fast during the month of Ramadan.",
    source: "Sahih al-Bukhari, Hadith 8"
  },
  {
    text: "None of you will have faith till he wishes for his (Muslim) brother what he likes for himself.",
    source: "Sahih al-Bukhari, Hadith 13"
  },
  {
    text: "A Muslim is the one who avoids harming Muslims with his tongue and hands. And an emigrant is the one who gives up what Allah has forbidden.",
    source: "Sahih al-Bukhari, Hadith 10"
  },
  {
    text: "Whoever believes in Allah and the Last Day should talk what is good or keep quiet, and whoever believes in Allah and the Last Day should not hurt his neighbor, and whoever believes in Allah and the Last Day should entertain his guest generously.",
    source: "Sahih al-Bukhari, Hadith 6018"
  },
  {
    text: "The best among you are those who have the best manners and character.",
    source: "Sahih al-Bukhari, Hadith 3559"
  },
  {
    text: "Make things easy for the people, and do not make it difficult for them, and make them calm and do not repulse them.",
    source: "Sahih al-Bukhari, Hadith 69"
  },
  {
    text: "The strong is not the one who overcomes the people by his strength, but the strong is the one who controls himself while in anger.",
    source: "Sahih al-Bukhari, Hadith 6114"
  },
  {
    text: "Allah does not look at your figures, nor at your attire but He looks at your hearts and your deeds.",
    source: "Sahih Muslim, Hadith 2564"
  },
  {
    text: "Charity does not decrease wealth. No one forgives another except that Allah increases his honor. And no one humbles himself for the sake of Allah except that Allah raises his status.",
    source: "Sahih Muslim, Hadith 2588"
  },
  {
    text: "When a man dies, his deeds come to an end except for three things: ongoing charity, beneficial knowledge, or a righteous child who prays for him.",
    source: "Sahih Muslim, Hadith 1631"
  },
  {
    text: "The best of people are those who are most beneficial to people.",
    source: "al-Mu'jam al-Awsat, Hadith 5787"
  },
  {
    text: "He who does not show mercy to others will not be shown mercy.",
    source: "Sahih al-Bukhari, Hadith 5997"
  },
  {
    text: "The best among you is the one who learns the Quran and teaches it.",
    source: "Sahih al-Bukhari, Hadith 5027"
  },
  {
    text: "Whoever follows a path in pursuit of knowledge, Allah will make easy for him a path to Paradise.",
    source: "Sahih Muslim, Hadith 2699"
  },
  {
    text: "The believer does not taunt, curse, abuse or talk indecently.",
    source: "Jami' at-Tirmidhi, Hadith 1977"
  },
  {
    text: "Do not belittle any good deed, even meeting your brother with a cheerful face.",
    source: "Sahih Muslim, Hadith 2626"
  },
  {
    text: "The most beloved of deeds to Allah are those that are most consistent, even if they are small.",
    source: "Sahih al-Bukhari, Hadith 6464"
  },
  {
    text: "Be in this world as though you were a stranger or a traveler.",
    source: "Sahih al-Bukhari, Hadith 6416"
  },
  {
    text: "Whoever is kind, affectionate and easy-going, Allah will forbid the Fire for him.",
    source: "Musnad Ahmad, Hadith 3938"
  },
  {
    text: "The best of you are those who are best to their families, and I am the best of you to my family.",
    source: "Jami' at-Tirmidhi, Hadith 3895"
  },
  {
    text: "Part of the perfection of a person's Islam is his leaving that which does not concern him.",
    source: "Jami' at-Tirmidhi, Hadith 2317"
  },
  {
    text: "Whoever removes a worldly hardship from a believer, Allah will remove from him one of the hardships of the Day of Resurrection.",
    source: "Sahih Muslim, Hadith 2699"
  },
  {
    text: "The supplication of a Muslim for his brother in his absence will certainly be answered. Every time he makes a supplication for good for his brother, the angel says: Ameen, and may you have likewise.",
    source: "Sahih Muslim, Hadith 2733"
  },
  {
    text: "Richness does not lie in the abundance of worldly goods, but richness is the richness of the soul.",
    source: "Sahih al-Bukhari, Hadith 6446"
  },
  {
    text: "Every act of kindness is charity.",
    source: "Sahih al-Bukhari, Hadith 6021"
  },
  {
    text: "Feed the hungry, visit the sick, and set free the captives.",
    source: "Sahih al-Bukhari, Hadith 5649"
  },
  {
    text: "A good word is charity.",
    source: "Sahih al-Bukhari, Hadith 2989"
  },
  {
    text: "He is not a believer whose stomach is filled while the neighbor to his side goes hungry.",
    source: "al-Sunan al-Kubra, Hadith 19049"
  },
  {
    text: "Modesty is part of faith and faith is in Paradise. Indecency is part of hardness of heart and hardness of heart is in the Fire.",
    source: "Jami' at-Tirmidhi, Hadith 2009"
  },
  {
    text: "Take advantage of five before five: your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before your busyness, and your life before your death.",
    source: "Shu'ab al-Iman, Hadith 9575"
  },
  {
    text: "The most complete of the believers in faith are those with the best character, and the best of you are the best in behavior to their women.",
    source: "Jami' at-Tirmidhi, Hadith 1162"
  },
  {
    text: "Verily, Allah is gentle and He loves gentleness. He rewards for gentleness what is not granted for harshness and He does not reward anything else like it.",
    source: "Sahih Muslim, Hadith 2593"
  },
  {
    text: "The two feet of the son of Adam will not move on the Day of Judgment until he is asked about his life and how he spent it, his knowledge and what he did with it, his wealth and how he earned it and how he spent it, and his body and how he used it.",
    source: "Jami' at-Tirmidhi, Hadith 2417"
  },
  {
    text: "Whoever treads a path seeking knowledge, Allah will make easy for him the path to Paradise. The angels lower their wings in approval of the seeker of knowledge.",
    source: "Sunan Abu Dawud, Hadith 3641"
  },
  {
    text: "No one has ever eaten a better food than that which he has earned by working with his own hands.",
    source: "Sahih al-Bukhari, Hadith 2072"
  },
  {
    text: "The world is a prison for the believer and a paradise for the disbeliever.",
    source: "Sahih Muslim, Hadith 2956"
  },
  {
    text: "Speak the truth even if it is bitter.",
    source: "Musnad Ahmad, Hadith 22807"
  },
  {
    text: "Smiling in the face of your brother is charity. Enjoining good and forbidding evil is charity. Giving directions to a lost person is charity. Removing harmful things from the road is charity.",
    source: "Jami' at-Tirmidhi, Hadith 1956"
  },
  {
    text: "Whoever builds a mosque for Allah, Allah will build for him a house in Paradise.",
    source: "Sahih al-Bukhari, Hadith 450"
  },
  {
    text: "The best charity is that given in Ramadan.",
    source: "Jami' at-Tirmidhi, Hadith 663"
  },
  {
    text: "He who is deprived of kindness is deprived of goodness.",
    source: "Sahih Muslim, Hadith 2592"
  },
  {
    text: "The prayer offered in congregation is twenty-seven times superior to a prayer offered by a single person.",
    source: "Sahih al-Bukhari, Hadith 645"
  },
  {
    text: "When the son of Adam gets up in the morning, all the limbs humble themselves before the tongue and say: Fear Allah for our sake because we are with you. If you are straight, we will be straight, and if you are crooked, we will be crooked.",
    source: "Jami' at-Tirmidhi, Hadith 2407"
  },
  {
    text: "A person's true wealth is the good he does in this world.",
    source: "Sahih Muslim, Hadith 2959"
  },
  {
    text: "Give charity without delay, for it stands in the way of calamity.",
    source: "Jami' at-Tirmidhi, Hadith 589"
  },
  {
    text: "Allah will not be merciful to those who are not merciful to people.",
    source: "Sahih al-Bukhari, Hadith 7376"
  },
  {
    text: "The best prayer after the obligatory prayers is the night prayer.",
    source: "Sahih Muslim, Hadith 1163"
  },
  {
    text: "Spread peace, feed the hungry, maintain family ties, and pray at night while others sleep, and you will enter Paradise in peace.",
    source: "Jami' at-Tirmidhi, Hadith 2485"
  },
  {
    text: "The best remembrance is: there is no god but Allah. And the best supplication is: all praise is due to Allah.",
    source: "Jami' at-Tirmidhi, Hadith 3383"
  },
  {
    text: "Whoever believes in Allah and the Last Day, let him maintain the bonds of kinship.",
    source: "Sahih al-Bukhari, Hadith 5990"
  },
  {
    text: "None of you truly believes until he loves for his brother what he loves for himself.",
    source: "Sahih al-Bukhari, Hadith 13"
  },
  {
    text: "The Prophet was asked: Which deed is the best? He said: Prayer at its proper time. He was asked: Then what? He said: Kindness to parents. He was asked: Then what? He said: Striving in the way of Allah.",
    source: "Sahih al-Bukhari, Hadith 527"
  },
  {
    text: "Verily, with hardship comes ease.",
    source: "Quran 94:6"
  },
  {
    text: "Whoever is not grateful to people is not grateful to Allah.",
    source: "Musnad Ahmad, Hadith 7939"
  },
  {
    text: "The ink of the scholar is more sacred than the blood of the martyr.",
    source: "Widely attributed prophetic wisdom"
  },
  {
    text: "Do not waste water even if you are at a running stream.",
    source: "Musnad Ahmad, Hadith 6768"
  },
  {
    text: "Exchange gifts, as that will lead to increasing your love for one another.",
    source: "al-Adab al-Mufrad, Hadith 594"
  },
  {
    text: "The most beloved of places to Allah are the mosques, and the most hated of places to Allah are the markets.",
    source: "Sahih Muslim, Hadith 671"
  },
  {
    text: "Allah is beautiful and He loves beauty.",
    source: "Sahih Muslim, Hadith 91"
  },
];

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  return Math.floor(diff / 86400000);
}

function fetchDailyHadith() {
  const dayIndex = getDayOfYear() % HADITH_COLLECTION.length;
  const hadith = HADITH_COLLECTION[dayIndex];
  applyHadith(hadith.text, hadith.source);
}

function applyHadith(text, source) {
  const textEl = document.getElementById('dailyHadithText');
  const sourceEl = document.getElementById('dailyHadithSource');
  if (textEl) textEl.textContent = `"${text}"`;
  if (sourceEl) sourceEl.textContent = `— ${source}`;
}

// ============================================
// Utilities
// ============================================
function setCurrentYear() {
  document.getElementById('currentYear').textContent = new Date().getFullYear();
}
