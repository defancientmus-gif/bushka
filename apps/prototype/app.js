const itemsStorageKey = 'bushka:user-items:v2';
const profileStorageKey = 'bushka:profile:v1';

const elements = {
  importInput: document.getElementById('importInput'),
  importButton: document.getElementById('importButton'),
  importState: document.getElementById('importState'),
  composer: document.getElementById('composer'),
  dropzone: document.getElementById('dropzone'),
  photoInput: document.getElementById('photoInput'),
  previewStrip: document.getElementById('previewStrip'),
  photoState: document.getElementById('photoState'),
  title: document.getElementById('title'),
  price: document.getElementById('price'),
  condition: document.getElementById('condition'),
  about: document.getElementById('about'),
  contact: document.getElementById('contact'),
  category: document.getElementById('category'),
  livePreview: document.getElementById('livePreview'),
  publishButton: document.getElementById('publishButton'),
  profile: document.getElementById('profile'),
  profileName: document.getElementById('profileName'),
  profileCity: document.getElementById('profileCity'),
  profileContact: document.getElementById('profileContact'),
  profileState: document.getElementById('profileState'),
  profilePostCount: document.getElementById('profilePostCount'),
  saveProfileButton: document.getElementById('saveProfileButton'),
  feed: document.getElementById('feed'),
  searchInput: document.getElementById('searchInput'),
  toast: document.getElementById('toast'),
  scrollToComposer: document.getElementById('scrollToComposer'),
  scrollToProfile: document.getElementById('scrollToProfile')
};

const seedItems = [
  {
    id: 'seed-1',
    title: 'MacBook Air M1 13',
    price: '54 000 ₽',
    condition: 'Хорошее',
    about: '8/256, без скрытых дефектов, комплект.',
    contact: '@anton',
    category: 'Ноутбук',
    seller: 'Антон'
  },
  {
    id: 'seed-2',
    title: 'iPhone 13 mini 128',
    price: '35 500 ₽',
    condition: 'Есть следы',
    about: 'Аккум 86%, чек, коробка.',
    contact: '@kate',
    category: 'Смартфон',
    seller: 'Катя'
  },
  {
    id: 'seed-3',
    title: 'Nintendo Switch OLED',
    price: '24 900 ₽',
    condition: 'Идеальное',
    about: 'Пара игр, док, зарядка.',
    contact: '@marat',
    category: 'Консоль',
    seller: 'Марат'
  }
];

let userItems = loadItems();
let profile = loadProfile();
let currentMedia = [];

function loadItems() {
  try {
    return (JSON.parse(localStorage.getItem(itemsStorageKey)) || []).map(item => ({
      ...item,
      owner: true,
      media: item.media || item.images || []
    }));
  } catch {
    return [];
  }
}

function saveItems() {
  try {
    localStorage.setItem(itemsStorageKey, JSON.stringify(userItems.slice(0, 20)));
  } catch {
    showToast('Много фото');
  }
}

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(profileStorageKey)) || { name: 'Вы', city: '', contact: '' };
  } catch {
    return { name: 'Вы', city: '', contact: '' };
  }
}

function saveProfile() {
  profile = {
    name: normalizeSpace(elements.profileName.value) || 'Вы',
    city: normalizeSpace(elements.profileCity.value),
    contact: normalizeSpace(elements.profileContact.value)
  };
  localStorage.setItem(profileStorageKey, JSON.stringify(profile));
  elements.profileState.textContent = 'сохранено';
  showToast('ЛК сохранён');
  updatePreview();
  renderFeed();
}

function initProfile() {
  elements.profileName.value = profile.name || '';
  elements.profileCity.value = profile.city || '';
  elements.profileContact.value = profile.contact || '';
  updateProfileStats();
}

function updateProfileStats() {
  elements.profilePostCount.textContent = String(userItems.length);
}

function showToast(text) {
  elements.toast.textContent = text;
  elements.toast.classList.add('show');
  window.setTimeout(() => elements.toast.classList.remove('show'), 1500);
}

function normalizeSpace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanImportText(value) {
  return String(value || '')
    .replace(/[\u200b-\u200d\ufeff\u2060]/g, '')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function stripTags(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ');
}

function isTelegramLink(value) {
  return /(?:https?:\/\/)?(?:t\.me|telegram\.me)\//i.test(value || '');
}

function isAvitoLink(value) {
  return /(?:https?:\/\/)?(?:[\w-]+\.)*avito\.ru\//i.test(value || '')
    || /(?:https?:\/\/)?avito\.onelink\.me\//i.test(value || '');
}

function isSingleLink(value) {
  const cleaned = cleanImportText(value);
  return /^https?:\/\/\S+$/i.test(cleaned)
    || /^(?:t\.me|telegram\.me|(?:[\w-]+\.)*avito\.ru|avito\.onelink\.me)\//i.test(cleaned);
}

function extractSupportedLink(value) {
  const text = cleanImportText(value);
  const matches = text.match(/(?:https?:\/\/)?(?:(?:t\.me|telegram\.me|avito\.onelink\.me)\/|(?:[\w-]+\.)*avito\.ru\/)[^\s<>"'`]+/ig) || [];
  return matches
    .map(cleanPastedLink)
    .find(link => isTelegramLink(link) || isAvitoLink(link)) || '';
}

function cleanPastedLink(value) {
  return String(value || '')
    .trim()
    .replace(/^[<(]+/, '')
    .replace(/[>)\].,;!?]+$/g, '');
}

async function importPost() {
  const raw = cleanImportText(elements.importInput.value);
  const supportedLink = extractSupportedLink(raw);

  if (!raw) {
    showToast('Нечего разбирать');
    return;
  }

  setImportLoading(true);

  try {
    let parsed;
    let remoteMedia = [];
    let toastText = 'Разобрал';

    if (supportedLink && isTelegramLink(supportedLink)) {
      const data = await fetchImport('telegram', supportedLink);
      parsed = mergeRemoteData(data, parsePostText([data.title, data.text].filter(Boolean).join('\n')));
      remoteMedia = normalizeRemoteMedia(data);
      elements.importState.textContent = 'telegram';
    } else if (supportedLink && isAvitoLink(supportedLink)) {
      const data = await fetchImport('avito', supportedLink);
      parsed = mergeRemoteData(data, parsePostText([data.title, data.price, data.text, data.contact].filter(Boolean).join('\n')));
      remoteMedia = normalizeRemoteMedia(data);
      elements.importState.textContent = data.partial ? 'avito ссылка' : 'avito';
      toastText = data.partial ? 'Заполнил из ссылки' : 'Разобрал';
    } else if (isSingleLink(raw)) {
      elements.importState.textContent = 'ссылка';
      showToast('Источник не поддержан');
      return;
    } else {
      parsed = parsePostText(raw);
      elements.importState.textContent = 'текст';
    }

    fillForm(parsed);
    setRemoteMedia(remoteMedia);
    showToast(toastText);
  } catch {
    if (supportedLink || isSingleLink(raw)) {
      elements.importState.textContent = 'не достал';
      showToast('Ссылку не достал');
    } else {
      fillForm(parsePostText(raw));
      elements.importState.textContent = 'текст';
      showToast('Разобрал текст');
    }
  } finally {
    setImportLoading(false);
    updatePreview();
  }
}

async function fetchImport(source, url) {
  const response = await fetch(`./api/${source}?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    throw new Error(`${source}-unavailable`);
  }
  return response.json();
}

function mergeRemoteData(data, parsed) {
  return {
    ...parsed,
    title: data.title || parsed.title,
    price: data.price || parsed.price,
    about: data.text || parsed.about,
    contact: data.contact || parsed.contact,
    category: data.category || parsed.category || detectCategory(`${data.title} ${data.text}`),
    condition: data.condition || parsed.condition || detectCondition(data.text)
  };
}

function normalizeRemoteMedia(data) {
  const media = Array.isArray(data.media)
    ? data.media
    : (data.images || []).map(src => ({ kind: 'image', src }));

  return media
    .filter(item => item && (item.src || item.videoSrc))
    .slice(0, 8)
    .map(item => ({
      kind: item.kind === 'video' ? 'video' : 'image',
      src: item.src || item.poster || item.videoSrc,
      poster: item.poster || item.src || '',
      videoSrc: item.videoSrc || ''
    }));
}

function setRemoteMedia(media) {
  if (!media.length) {
    currentMedia = [];
    elements.previewStrip.innerHTML = '';
    elements.photoState.textContent = '0 / 8';
    return;
  }

  currentMedia = media;
  renderThumbs(currentMedia);
  const videoCount = currentMedia.filter(item => item.kind === 'video').length;
  elements.photoState.textContent = videoCount ? `${currentMedia.length} / 8, видео` : `${currentMedia.length} / 8`;
}

function setImportLoading(value) {
  elements.importButton.classList.toggle('is-loading', value);
  elements.importButton.disabled = value;
  if (value) {
    elements.importState.textContent = 'импорт';
  }
}

function parsePostText(raw) {
  const text = stripTags(raw)
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();

  const lines = text
    .split('\n')
    .map(line => normalizeSpace(line.replace(/[•●▪️✅🔥⭐️]/g, '')))
    .filter(Boolean);

  const pricePattern = /(?:^|[^\d])(\d{1,3}(?:[ \u00a0.,]\d{3})+|\d{4,7})\s*(?:₽|р\b|руб\.?|rub\b)/i;
  const priceMatch = lines.map(line => line.match(pricePattern)).find(Boolean) || text.replace(/\n/g, ' ').match(pricePattern);
  const contactMatch = text.match(/@[a-zA-Z0-9_]{3,}|(?:\+7|8)[\s( -]*\d{3}[\s) -]*\d{3}[\s-]*\d{2}[\s-]*\d{2}|https?:\/\/(?:t\.me|avito\.ru|www\.avito\.ru)\/\S+/i);
  const category = detectCategory(text);
  const condition = detectCondition(text);

  const titleLine = lines.find(line => {
    const lower = line.toLowerCase();
    return line.length > 3
      && !isTelegramLink(line)
      && !isAvitoLink(line)
      && !/^https?:\/\/\S+/i.test(line)
      && !/@[a-z0-9_]{3,}/i.test(line)
      && !/^\+?\d[\d\s()/-]{7,}$/.test(line)
      && !/(цена|руб|₽|контакт|писать|телеграм|telegram|avito|авито)/i.test(lower);
  }) || '';

  const title = cleanupTitle(titleLine, category);
  const price = priceMatch ? `${priceMatch[1].replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽` : '';
  const contact = cleanupContact(contactMatch ? contactMatch[0] : '');
  const descriptionLines = lines.filter(line => line !== titleLine && !line.includes(contact) && !/(цена|₽|руб\.?)/i.test(line));
  const about = descriptionLines.join('. ').replace(/\.\s*\./g, '.').slice(0, 520);

  return { title, price, contact, about, condition, category };
}

function cleanupTitle(value, category) {
  const title = normalizeSpace(value)
    .replace(/^(продам|продаю|обменяю|обмен)\s+/i, '')
    .replace(/\s*[-–—]\s*\d[\d\s.,]+(?:₽|р|руб).*$/i, '')
    .slice(0, 90);

  return title || '';
}

function cleanupContact(value) {
  const contact = normalizeSpace(value);
  if (/t\.me\//i.test(contact)) {
    return `@${contact.split('/').filter(Boolean).pop()}`;
  }
  return contact;
}

function detectCategory(text) {
  const lower = text.toLowerCase();
  if (/(iphone|айфон|samsung|pixel|xiaomi|смартфон|телефон)/i.test(lower)) return 'Смартфон';
  if (/(macbook|thinkpad|ноут|laptop|air|probook|xps)/i.test(lower)) return 'Ноутбук';
  if (/(playstation|ps5|ps4|xbox|switch|консол)/i.test(lower)) return 'Консоль';
  if (/(sony|canon|nikon|fujifilm|камера|объектив|фото)/i.test(lower)) return 'Фото';
  if (/(airpods|наушник|колонка|audio|акустик)/i.test(lower)) return 'Аудио';
  return 'Другое';
}

function detectCondition(text) {
  const lower = text.toLowerCase();
  if (/(новый|новая|новое|идеал|без следов|как новый)/i.test(lower)) return 'Идеальное';
  if (/(скол|трещ|царап|коц|дефект|потерт|следы)/i.test(lower)) return 'Есть следы';
  if (/(запчаст|не включ|разбит|утоплен)/i.test(lower)) return 'На запчасти';
  return 'Хорошее';
}

function fillForm(data) {
  if (data.title) elements.title.value = data.title;
  if (data.price) elements.price.value = data.price;
  if (data.about) elements.about.value = data.about;
  if (data.contact) elements.contact.value = data.contact;
  if (data.condition) elements.condition.value = data.condition;
  if (data.category) elements.category.value = data.category;
}

async function handlePhotos(files) {
  const chosen = Array.from(files || []).slice(0, 8);
  if (!chosen.length) return;

  elements.dropzone.classList.add('is-uploading');
  elements.photoState.textContent = 'загрузка';
  elements.previewStrip.innerHTML = '';

  const media = [];
  for (const file of chosen) {
    media.push({ kind: 'image', src: await compressImage(file) });
  }

  currentMedia = media;

  window.setTimeout(() => renderThumbs(currentMedia), 280);
  window.setTimeout(() => {
    elements.dropzone.classList.remove('is-uploading');
    elements.photoState.textContent = `${currentMedia.length} / 8`;
    updatePreview();
  }, 980);
}

function compressImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', .78));
      };
      image.onerror = () => resolve(reader.result);
      image.src = reader.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function renderThumbs(media) {
  elements.previewStrip.innerHTML = '';
  media.slice(0, 4).forEach((item, index) => {
    const thumb = document.createElement('div');
    thumb.className = item.kind === 'video' ? 'thumb video' : 'thumb';
    thumb.style.animationDelay = `${index * 70}ms`;

    if (item.kind === 'video' && isVideoSource(item.src)) {
      const video = document.createElement('video');
      video.src = item.src;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      thumb.appendChild(video);
    } else if (item.src) {
      const image = document.createElement('img');
      image.src = item.src;
      image.alt = '';
      thumb.appendChild(image);
    }

    elements.previewStrip.appendChild(thumb);
  });
}

function getDraft() {
  const contact = normalizeSpace(elements.contact.value) || profile.contact || '';
  return {
    id: `item-${Date.now()}`,
    title: normalizeSpace(elements.title.value),
    price: normalizeSpace(elements.price.value) || 'договорная',
    condition: elements.condition.value,
    about: normalizeSpace(elements.about.value),
    contact,
    category: elements.category.value,
    seller: profile.name || 'Вы',
    city: profile.city || '',
    media: currentMedia,
    owner: true,
    createdAt: Date.now()
  };
}

function publishItem() {
  const item = getDraft();

  if (!item.title) {
    showToast('Название нужно');
    elements.title.focus();
    return;
  }

  if (!item.contact) {
    showToast('Контакт нужен');
    elements.contact.focus();
    return;
  }

  userItems = [item, ...userItems].slice(0, 20);
  saveItems();
  renderFeed();
  clearDraft();
  showToast('Опубликовано');
  document.getElementById('feedTitle').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deleteItem(id) {
  if (!window.confirm('Удалить пост?')) {
    return;
  }
  userItems = userItems.filter(item => item.id !== id);
  saveItems();
  renderFeed();
  showToast('Удалено');
}

function clearDraft() {
  elements.importInput.value = '';
  elements.title.value = '';
  elements.price.value = '';
  elements.about.value = '';
  elements.contact.value = '';
  elements.condition.value = 'Хорошее';
  elements.category.value = 'Ноутбук';
  elements.importState.textContent = 'черновик';
  currentMedia = [];
  elements.previewStrip.innerHTML = '';
  elements.photoState.textContent = '0 / 8';
  updatePreview();
}

function updatePreview() {
  const draft = getDraft();
  const hasRealData = Boolean(
    normalizeSpace(elements.title.value)
    || normalizeSpace(elements.price.value)
    || normalizeSpace(elements.about.value)
    || normalizeSpace(elements.contact.value)
    || currentMedia.length
  );

  if (!hasRealData) {
    elements.livePreview.classList.remove('has-data');
    elements.livePreview.innerHTML = '';
    return;
  }

  elements.livePreview.classList.add('has-data');
  elements.livePreview.innerHTML = renderItem(draft, true, false);
}

function renderFeed() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const items = [...userItems, ...seedItems].filter(item => {
    const haystack = `${item.title} ${item.price} ${item.about} ${item.category} ${item.contact}`.toLowerCase();
    return !query || haystack.includes(query);
  });

  elements.feed.innerHTML = items.length
    ? items.map(item => `<article class="item">${renderItem(item, false, Boolean(item.owner))}</article>`).join('')
    : '<div class="empty">Пусто</div>';
  updateProfileStats();
}

function renderItem(item, preview = false, canDelete = false) {
  const media = item.media || item.images || [];
  const firstMedia = media[0];
  const visual = categoryClass(item.category);
  const itemMedia = renderMedia(firstMedia, item.condition, visual);
  const contact = contactLink(item.contact);
  const deleteButton = canDelete ? `<button class="delete-button" type="button" data-delete-id="${escapeAttr(item.id)}">Удалить</button>` : '';

  return `
    ${itemMedia}
    <div class="item-body">
      <div class="item-title">
        <h3>${escapeHtml(item.title || 'Без названия')}</h3>
        <span class="price">${escapeHtml(item.price || 'договорная')}</span>
      </div>
      ${item.about ? `<p class="desc">${escapeHtml(item.about)}</p>` : ''}
      <div class="meta">
        <span class="seller">${escapeHtml(preview ? 'превью' : sellerLine(item))}</span>
        <span class="item-actions">${contact}${deleteButton}</span>
      </div>
    </div>
  `;
}

function renderMedia(media, condition, visual) {
  const badge = `<span class="badge">${escapeHtml(condition || 'товар')}</span>`;
  if (!media) {
    return `<div class="item-media visual ${visual}">${badge}</div>`;
  }

  if (media.kind === 'video') {
    const poster = media.poster || media.src || '';
    const videoSrc = media.videoSrc || (isVideoSource(media.src) ? media.src : '');
    if (videoSrc) {
      return `<div class="item-media video-media"><video src="${escapeAttr(videoSrc)}" ${poster ? `poster="${escapeAttr(poster)}"` : ''} controls playsinline preload="metadata"></video>${badge}</div>`;
    }
    if (poster) {
      return `<div class="item-media video-media"><img src="${escapeAttr(poster)}" alt=""><span class="play-mark" aria-hidden="true"></span>${badge}</div>`;
    }
  }

  if (media.src) {
    return `<div class="item-media"><img src="${escapeAttr(media.src)}" alt="">${badge}</div>`;
  }

  return `<div class="item-media visual ${visual}">${badge}</div>`;
}

function sellerLine(item) {
  return [item.seller || 'Продавец', item.city].filter(Boolean).join(', ');
}

function categoryClass(category) {
  if (category === 'Смартфон') return 'phone';
  if (category === 'Консоль') return 'console';
  if (category === 'Фото') return 'camera';
  return '';
}

function isVideoSource(src) {
  return /\.(mp4|webm|mov)(?:\?|$)/i.test(src || '');
}

function contactLink(contact) {
  const value = normalizeSpace(contact);
  if (!value) return '<span></span>';

  if (value.startsWith('@')) {
    return `<a class="contact-button" href="https://t.me/${escapeAttr(value.slice(1))}" target="_blank" rel="noreferrer">TG</a>`;
  }

  if (/^(?:\+7|8)/.test(value)) {
    return `<a class="contact-button" href="tel:${escapeAttr(value.replace(/[^\d+]/g, ''))}">Тел.</a>`;
  }

  if (/avito\.ru/i.test(value)) {
    return `<a class="contact-button" href="${escapeAttr(value)}" target="_blank" rel="noreferrer">Avito</a>`;
  }

  if (/^https?:\/\//i.test(value)) {
    return `<a class="contact-button" href="${escapeAttr(value)}" target="_blank" rel="noreferrer">Ссылка</a>`;
  }

  return `<span class="contact-button">${escapeHtml(value)}</span>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function bindEvents() {
  elements.importButton.addEventListener('click', importPost);
  elements.publishButton.addEventListener('click', publishItem);
  elements.saveProfileButton.addEventListener('click', saveProfile);
  elements.searchInput.addEventListener('input', renderFeed);
  elements.scrollToComposer.addEventListener('click', () => {
    elements.composer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    elements.importInput.focus();
  });
  elements.scrollToProfile.addEventListener('click', () => {
    elements.profile.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  elements.feed.addEventListener('click', event => {
    const button = event.target.closest('[data-delete-id]');
    if (button) {
      deleteItem(button.dataset.deleteId);
    }
  });

  [elements.title, elements.price, elements.about, elements.contact, elements.condition, elements.category].forEach(input => {
    input.addEventListener('input', updatePreview);
    input.addEventListener('change', updatePreview);
  });

  [elements.profileName, elements.profileCity, elements.profileContact].forEach(input => {
    input.addEventListener('input', () => {
      elements.profileState.textContent = 'изменён';
    });
  });

  elements.photoInput.addEventListener('change', event => handlePhotos(event.target.files));
  elements.dropzone.addEventListener('dragover', event => {
    event.preventDefault();
    elements.dropzone.classList.add('dragover');
  });
  elements.dropzone.addEventListener('dragleave', () => elements.dropzone.classList.remove('dragover'));
  elements.dropzone.addEventListener('drop', event => {
    event.preventDefault();
    elements.dropzone.classList.remove('dragover');
    handlePhotos(event.dataTransfer.files);
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

initProfile();
bindEvents();
renderFeed();
updatePreview();
