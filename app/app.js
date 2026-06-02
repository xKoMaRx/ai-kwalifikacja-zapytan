const samples = [
  {
    source: 'mail',
    subject: 'Prośba o wycenę ogrodzenia panelowego',
    body: 'Dzień dobry, potrzebuję wyceny ogrodzenia panelowego 120 mb wraz z bramą i montażem. Inwestycja w Zawierciu, termin pilny. Proszę o kontakt z działem handlowym.',
  },
  {
    source: 'form',
    subject: 'Awaria linii pakującej',
    body: 'Mamy przestój na linii pakującej. Maszyna zatrzymuje się po 10 minutach pracy i potrzebujemy technika jeszcze dziś. W załączniku numer seryjny.',
  },
  {
    source: 'website',
    subject: 'Transport palet do Niemiec',
    body: 'Szukamy przewoźnika na regularne wysyłki paletowe z magazynu w Dąbrowie Górniczej. Interesuje nas wycena oraz możliwy termin startu współpracy.',
  },
  {
    source: 'mail',
    subject: 'Zapytanie o certyfikat jakości',
    body: 'Potrzebujemy aktualnych certyfikatów materiałowych i potwierdzenia zgodności dla ostatniej partii. Prosze o przesłanie dokumentów do działu jakości.',
  },
];

const routing = [
  { keys: ['ogrod', 'bram', 'montaż', 'panel'], category: 'Sprzedaż / ogrodzenia', priority: 'Wysoki', owner: 'Handlowiec', reply: 'Dziękujemy za zapytanie. Przygotujemy ofertę i wrócimy z wyceną w ciągu 24 h.' },
  { keys: ['awari', 'lini', 'przestój', 'serwis', 'technika'], category: 'Serwis / utrzymanie ruchu', priority: 'Pilny', owner: 'Serwis techniczny', reply: 'Zgłoszenie zostało oznaczone jako pilne. Technicy sprawdzą je jako pierwsze.' },
  { keys: ['transport', 'palet', 'spedyc', 'magazyn'], category: 'Logistyka / transport', priority: 'Wysoki', owner: 'Spedycja', reply: 'Przekazujemy zapytanie do logistyki. Przygotujemy propozycję trasy i stawki.' },
  { keys: ['certyf', 'jakości', 'zgodności', 'dokument'], category: 'Jakość / dokumenty', priority: 'Średni', owner: 'Dział jakości', reply: 'Przekazujemy prośbę o dokumenty do odpowiedzialnej osoby.' },
];

const inbox = document.querySelector('#inbox');
const form = document.querySelector('#analyze-form');
const source = document.querySelector('#source');
const subject = document.querySelector('#subject');
const body = document.querySelector('#body');
const loadSample = document.querySelector('#load-sample');
const heroDemo = document.querySelector('#hero-demo');
const heroAbout = document.querySelector('#hero-about');
const heroContact = document.querySelector('#hero-contact');
const tabs = document.querySelectorAll('.tab');
const panels = {
  'demo-panel': document.querySelector('#demo-panel'),
  'about-panel': document.querySelector('#about-panel'),
  'contact-panel': document.querySelector('#contact-panel'),
};

const categoryEl = document.querySelector('#category');
const priorityEl = document.querySelector('#priority');
const customerEl = document.querySelector('#customer');
const ownerEl = document.querySelector('#owner');
const reasonEl = document.querySelector('#reason');
const replyEl = document.querySelector('#reply');
const nextStepEl = document.querySelector('#next-step');
const confidenceEl = document.querySelector('#confidence');
const confidenceBarEl = document.querySelector('#confidence-bar');
const analysisStateEl = document.querySelector('#analysis-state');
const submitButton = form.querySelector('button[type="submit"]');

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function detectCustomer(text) {
  const lower = normalize(text);
  if (/sp\.?\s*z\s*o\.?\s*o\.?|spolka|s\.?a\.?/.test(lower)) return 'Klient firmowy';
  if (lower.includes('pan ') || lower.includes('pani ')) return 'Klient indywidualny';
  return 'Nowy lead B2B';
}

function classify(text) {
  const normalized = normalize(text);
  let confidence = 0.38;
  const found = routing.find((rule) => rule.keys.some((key) => normalized.includes(key))) || {
    category: 'Ogólne zapytanie',
    priority: 'Średni',
    owner: 'Obsługa klienta',
    reply: 'Dziękujemy za wiadomość. Sprawa została przekazana do odpowiedniego działu.',
    nextStep: 'Przekazać sprawę do inboxu ogólnego i poprosić o doprecyzowanie zakresu.',
  };

  if (found.category !== 'Ogólne zapytanie') confidence += 0.32;

  const urgent = /piln|dziś|natychmiast|awari|przestój|ekspres/.test(normalized);
  if (urgent) confidence += 0.18;

  const b2bSignal = /wycena|oferta|cena|kontakt|wspolprac|zamow|zapytanie/.test(normalized);
  if (b2bSignal) confidence += 0.08;

  return {
    ...found,
    priority: urgent ? 'Pilny' : found.priority,
    customer: detectCustomer(text),
    confidence: Math.min(confidence, 0.96),
    nextStep: found.nextStep || (urgent ? 'Natychmiast przekazać do odpowiedzialnego działu i oznaczyć jako SLA 0-1h.' : 'Wysłać potwierdzenie i przekazać do właściciela procesu.'),
    reason: urgent
      ? 'W treści występują sygnały pilności, więc sprawa dostaje wyższy priorytet.'
      : `Najsilniejsze dopasowanie: ${found.category.toLowerCase()}.`,
  };
}

function renderResult(data) {
  categoryEl.textContent = data.category;
  priorityEl.textContent = data.priority;
  customerEl.textContent = data.customer;
  ownerEl.textContent = data.owner;
  reasonEl.textContent = data.reason;
  replyEl.textContent = data.reply;
  nextStepEl.textContent = data.nextStep;
  const pct = Math.round(data.confidence * 100);
  confidenceEl.textContent = `${pct}%`;
  confidenceBarEl.style.width = `${pct}%`;
  confidenceBarEl.dataset.level = String(pct);
  analysisStateEl.textContent = data.priority === 'Pilny' ? 'Wymaga reakcji' : 'Gotowe';
  analysisStateEl.style.borderColor = data.priority === 'Pilny' ? 'rgba(245, 158, 11, 0.32)' : 'rgba(34, 197, 94, 0.28)';
  analysisStateEl.style.background = data.priority === 'Pilny' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(34, 197, 94, 0.12)';
  analysisStateEl.style.color = data.priority === 'Pilny' ? '#fbbf24' : '#86efac';
}

function setPanel(panelId) {
  Object.entries(panels).forEach(([id, panel]) => {
    panel.hidden = id !== panelId;
  });
  tabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.panel === panelId));
}

function renderInbox() {
  inbox.innerHTML = '';
  samples.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `item${index === 0 ? ' is-active' : ''}`;
    button.innerHTML = `
      <div class="top">
        <strong>${item.source.toUpperCase()}</strong>
        <span class="badge">${index + 1}</span>
      </div>
      <h3>${item.subject}</h3>
      <p>${item.body}</p>
    `;
    button.addEventListener('click', () => {
      subject.value = item.subject;
      body.value = item.body;
      source.value = item.source;
      analyze(item.body + ' ' + item.subject);
      document.querySelectorAll('.item').forEach((el) => el.classList.remove('is-active'));
      button.classList.add('is-active');
    });
    inbox.appendChild(button);
  });
}

function analyze(seedText = '') {
  const text = `${subject.value} ${body.value} ${seedText}`.trim();
  if (!text) return;
  analysisStateEl.textContent = 'Analiza';
  analysisStateEl.style.borderColor = 'rgba(139, 92, 246, 0.28)';
  analysisStateEl.style.background = 'rgba(124, 58, 237, 0.12)';
  analysisStateEl.style.color = '#c4b5fd';
  submitButton.disabled = true;
  submitButton.textContent = 'Analizuję...';

  window.mockApi.analyzeInquiry({ source: source.value, subject: subject.value, body: body.value })
    .then(() => {
      renderResult(classify(text));
    })
    .finally(() => {
      submitButton.disabled = false;
      submitButton.textContent = 'Przeanalizuj';
    });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  analyze();
});

loadSample.addEventListener('click', () => {
  const sample = samples[Math.floor(Math.random() * samples.length)];
  source.value = sample.source;
  subject.value = sample.subject;
  body.value = sample.body;
  analyze(sample.body);
});

heroDemo.addEventListener('click', () => {
  setPanel('demo-panel');
  const sample = samples[0];
  source.value = sample.source;
  subject.value = sample.subject;
  body.value = sample.body;
  analyze(sample.body);
});

heroAbout.addEventListener('click', () => setPanel('about-panel'));
heroContact.addEventListener('click', () => setPanel('contact-panel'));

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setPanel(tab.dataset.panel));
});

renderInbox();
const initial = samples[0];
source.value = initial.source;
subject.value = initial.subject;
body.value = initial.body;
setPanel('demo-panel');
analyze(initial.body);
