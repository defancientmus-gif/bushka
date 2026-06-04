import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { DraftItem, Item, ItemStatus, Profile } from './types';
import { seedItems, defaultProfile } from './data/seed';
import { loadItems, loadProfile, saveItems, saveProfile } from './lib/storage';
import {
  createAvitoText,
  createTelegramText,
  emptyDraft,
  parseImport,
  supportedCategories,
  supportedConditions,
  supportedGrades
} from './lib/importer';

const statusLabels: Record<ItemStatus, string> = {
  available: 'В наличии',
  reserved: 'Бронь',
  sold: 'Продано',
  exchange: 'Обмен',
  lot: 'Лот'
};

const dealModeLabels: Record<DraftItem['dealMode'], string> = {
  free: 'Свободная продажа',
  queue: 'Живая очередь',
  'best-offer': 'Лучшее предложение'
};

const statusOrder: ItemStatus[] = ['available', 'reserved', 'sold', 'exchange', 'lot'];

function createInitialDraft(profile: Profile): DraftItem {
  return {
    ...emptyDraft(),
    city: profile.city,
    contact: profile.contact
  };
}

export function App() {
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [items, setItems] = useState<Item[]>(() => loadItems());
  const [draft, setDraft] = useState<DraftItem>(() => createInitialDraft(loadProfile()));
  const [importValue, setImportValue] = useState('');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [exportItem, setExportItem] = useState<Item | null>(null);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...items, ...seedItems].filter(item => {
      const haystack = `${item.title} ${item.price} ${item.description} ${item.category} ${item.city} ${item.contact}`.toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [items, query]);

  const ownCount = items.length;
  const livePreview = useMemo(() => itemFromDraft(draft, profile), [draft, profile]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 1700);
  }

  function updateDraft<K extends keyof DraftItem>(key: K, value: DraftItem[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  function patchDraft(next: Partial<DraftItem>) {
    setDraft(current => ({ ...current, ...next }));
  }

  function commitItems(nextItems: Item[]) {
    setItems(nextItems);
    saveItems(nextItems);
  }

  function handleImport() {
    if (!importValue.trim()) {
      showToast('Нечего разбирать');
      return;
    }

    const parsed = parseImport(importValue);
    const status = /(^|\s)(лот|опт|партия)(\s|$)/i.test(importValue) ? 'lot' : draft.status;

    patchDraft({
      ...parsed,
      status,
      city: parsed.city || draft.city || profile.city,
      contact: parsed.contact || draft.contact || profile.contact
    });
    showToast(parsed.sourceUrl ? 'Заполнил из ссылки' : 'Разобрал текст');
  }

  async function handleFiles(files: FileList | null) {
    const chosen = Array.from(files || []).slice(0, 8);
    if (!chosen.length) return;

    showToast('Загружаю фото');
    const media = await Promise.all(chosen.map(fileToMedia));
    updateDraft('media', media);
    showToast(`${media.length} фото готово`);
  }

  function publishItem() {
    const item = itemFromDraft(draft, profile);

    if (!item.title.trim()) {
      showToast('Название нужно');
      return;
    }

    if (!item.contact.trim()) {
      showToast('Контакт нужен');
      return;
    }

    const nextItems = [item, ...items].slice(0, 80);
    commitItems(nextItems);
    setDraft(createInitialDraft(profile));
    setImportValue('');
    showToast('Товар в складе');
  }

  function updateStatus(itemId: string, status: ItemStatus) {
    const nextItems = items.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        status,
        reservedUntil: status === 'reserved' ? item.reservedUntil || defaultReserveTime() : '',
        updatedAt: Date.now()
      };
    });
    commitItems(nextItems);
    showToast(statusLabels[status]);
  }

  function addQueueRequest(item: Item) {
    if (item.id.startsWith('seed-')) {
      showToast('Запрос отправлен');
      return;
    }

    const nextItems = items.map(current => (
      current.id === item.id
        ? { ...current, queueCount: current.queueCount + 1, updatedAt: Date.now() }
        : current
    ));
    commitItems(nextItems);
    showToast('Запрос не бронирует товар');
  }

  function deleteItem(itemId: string) {
    if (!window.confirm('Удалить товар?')) return;
    commitItems(items.filter(item => item.id !== itemId));
    showToast('Удалено');
  }

  function handleProfileSave() {
    saveProfile(profile);
    setDraft(current => ({
      ...current,
      city: current.city || profile.city,
      contact: current.contact || profile.contact
    }));
    showToast('ЛК сохранен');
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    showToast(successMessage);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#new-item" aria-label="БУ.шка">
          <span className="brand-mark">бу</span>
          <span>БУ.шка</span>
        </a>
        <nav className="top-actions" aria-label="Разделы">
          <a href="#profile">ЛК</a>
          <a href="#stock">Склад</a>
        </nav>
      </header>

      <main className="workspace">
        <section className="composer" id="new-item" aria-labelledby="newItemTitle">
          <div className="section-head">
            <div>
              <p className="eyebrow">товар</p>
              <h1 id="newItemTitle">Новый пост</h1>
            </div>
            <span className={`status-pill ${draft.status}`}>{statusLabels[draft.status]}</span>
          </div>

          <div className="import-panel">
            <label htmlFor="importText">Импорт</label>
            <textarea
              id="importText"
              rows={3}
              value={importValue}
              onChange={event => setImportValue(event.target.value)}
              placeholder="Ссылка Avito, t.me, пост или текст"
            />
            <button className="secondary" type="button" onClick={handleImport}>Разобрать</button>
          </div>

          <div className="photo-loader">
            <input
              id="media"
              type="file"
              accept="image/*"
              multiple
              onChange={event => handleFiles(event.currentTarget.files)}
            />
            <div className="upload-stage" aria-hidden="true">
              <div className="photo-grid">
                {Array.from({ length: 4 }).map((_, index) => (
                  <span className="photo-slot" style={{ '--delay': `${index * 70}ms` } as CSSProperties} key={index} />
                ))}
              </div>
              <div className="photo-preview">
                {draft.media.slice(0, 4).map(asset => (
                  <img src={asset.src} alt="" key={asset.id} />
                ))}
              </div>
            </div>
            <div className="upload-footer">
              <span>{draft.media.length} / 8</span>
              <label className="upload-button" htmlFor="media">
                <span className="camera-icon" aria-hidden="true" />
                Фото
              </label>
            </div>
          </div>

          <div className="form-grid">
            <Field label="Название">
              <input value={draft.title} onChange={event => updateDraft('title', event.target.value)} placeholder="iPhone 13 mini 128" />
            </Field>
            <Field label="Цена">
              <input value={draft.price} onChange={event => updateDraft('price', event.target.value)} inputMode="numeric" placeholder="35 000 ₽" />
            </Field>
            <Field label="Категория">
              <select value={draft.category} onChange={event => updateDraft('category', event.target.value as DraftItem['category'])}>
                {supportedCategories().map(category => <option key={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="Состояние">
              <select value={draft.condition} onChange={event => updateDraft('condition', event.target.value as DraftItem['condition'])}>
                {supportedConditions().map(condition => <option key={condition}>{condition}</option>)}
              </select>
            </Field>
            <Field label="Грейд">
              <select value={draft.grade} onChange={event => updateDraft('grade', event.target.value as DraftItem['grade'])}>
                {supportedGrades().map(grade => <option key={grade}>{grade}</option>)}
              </select>
            </Field>
            <Field label="Статус">
              <select value={draft.status} onChange={event => updateDraft('status', event.target.value as ItemStatus)}>
                {statusOrder.map(status => <option value={status} key={status}>{statusLabels[status]}</option>)}
              </select>
            </Field>
            <Field label="Режим сделки" wide>
              <select value={draft.dealMode} onChange={event => updateDraft('dealMode', event.target.value as DraftItem['dealMode'])}>
                {Object.entries(dealModeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Город">
              <input value={draft.city} onChange={event => updateDraft('city', event.target.value)} placeholder="Симферополь" />
            </Field>
            <Field label="Контакт">
              <input value={draft.contact} onChange={event => updateDraft('contact', event.target.value)} placeholder="@username" />
            </Field>
            <Field label="Батарея">
              <input value={draft.battery} onChange={event => updateDraft('battery', event.target.value)} placeholder="86%" />
            </Field>
            <Field label="Комплект">
              <input value={draft.kit} onChange={event => updateDraft('kit', event.target.value)} placeholder="Коробка, зарядка" />
            </Field>
            <Field label="Дефекты" wide>
              <input value={draft.defects} onChange={event => updateDraft('defects', event.target.value)} placeholder="Скол, Face ID, клавиатура" />
            </Field>
            <Field label="Исходная ссылка" wide>
              <input value={draft.sourceUrl} onChange={event => updateDraft('sourceUrl', event.target.value)} placeholder="Avito или Telegram" />
            </Field>
            <Field label="Описание" wide>
              <textarea value={draft.description} onChange={event => updateDraft('description', event.target.value)} rows={7} placeholder="Комплект, нюансы, причина продажи, условия обмена" />
            </Field>
          </div>

          <ItemCard item={livePreview} isPreview onExport={() => setExportItem(livePreview)} />

          <button className="primary" type="button" onClick={publishItem}>Сохранить в склад</button>
        </section>

        <section className="side-panel">
          <section className="profile" id="profile" aria-labelledby="profileTitle">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">продавец</p>
                <h2 id="profileTitle">ЛК</h2>
              </div>
              <span className="rating">{profile.rating.toFixed(1)}</span>
            </div>
            <div className="profile-fields">
              <Field label="Имя">
                <input value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} />
              </Field>
              <Field label="Город">
                <input value={profile.city} onChange={event => setProfile({ ...profile, city: event.target.value })} />
              </Field>
              <Field label="Контакт" wide>
                <input value={profile.contact} onChange={event => setProfile({ ...profile, contact: event.target.value })} />
              </Field>
            </div>
            <div className="stats">
              <span><b>{ownCount}</b> товаров</span>
              <span><b>{profile.deals}</b> сделок</span>
              <span><b>{profile.rating.toFixed(1)}</b> рейтинг</span>
            </div>
            <button className="secondary" type="button" onClick={handleProfileSave}>Сохранить ЛК</button>
          </section>

          <section className="stock" id="stock" aria-labelledby="stockTitle">
            <div className="stock-head">
              <div>
                <p className="eyebrow">витрина</p>
                <h2 id="stockTitle">Склад</h2>
              </div>
              <input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Поиск" />
            </div>
            <div className="feed">
              {visibleItems.map(item => {
                const isOwn = !item.id.startsWith('seed-');
                return (
                  <ItemCard
                    item={item}
                    key={item.id}
                    isOwn={isOwn}
                    onQueue={() => addQueueRequest(item)}
                    onExport={() => setExportItem(item)}
                    onDelete={() => deleteItem(item.id)}
                    onStatusChange={status => updateStatus(item.id, status)}
                  />
                );
              })}
              {!visibleItems.length && <div className="empty">Пусто</div>}
            </div>
          </section>
        </section>
      </main>

      {exportItem && (
        <ExportSheet
          item={exportItem}
          onClose={() => setExportItem(null)}
          onCopy={copyText}
        />
      )}

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ItemCard({
  item,
  isPreview,
  isOwn,
  onQueue,
  onExport,
  onDelete,
  onStatusChange
}: {
  item: Item;
  isPreview?: boolean;
  isOwn?: boolean;
  onQueue?: () => void;
  onExport: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: ItemStatus) => void;
}) {
  const media = item.media[0];

  return (
    <article className={`item-card ${isPreview ? 'preview' : ''}`}>
      <div className={`item-media ${media ? '' : visualClass(item.category)}`}>
        {media ? <img src={media.src} alt="" /> : <span className="visual-shape" aria-hidden="true" />}
        <span className={`status-pill ${item.status}`}>{statusLabels[item.status]}</span>
      </div>
      <div className="item-body">
        <div className="item-title">
          <h3>{item.title || 'Без названия'}</h3>
          <strong>{item.price || 'договорная'}</strong>
        </div>
        <div className="chips">
          <span>{item.condition}</span>
          <span>{item.grade}</span>
          <span>{dealModeLabels[item.dealMode]}</span>
        </div>
        {item.description && <p>{item.description}</p>}
        {(item.battery || item.kit || item.defects) && (
          <dl className="specs">
            {item.battery && <><dt>Батарея</dt><dd>{item.battery}</dd></>}
            {item.kit && <><dt>Комплект</dt><dd>{item.kit}</dd></>}
            {item.defects && <><dt>Нюансы</dt><dd>{item.defects}</dd></>}
          </dl>
        )}
        {item.status === 'reserved' && item.reservedUntil && (
          <p className="reserve-note">Бронь до {item.reservedUntil}</p>
        )}
        <div className="item-meta">
          <span>{[item.sellerName, item.city].filter(Boolean).join(', ')}</span>
          <span>{item.queueCount ? `${item.queueCount} запросов` : 'запросов нет'}</span>
        </div>

        {!isPreview && (
          <div className="card-actions">
            {isOwn ? (
              <>
                <select value={item.status} onChange={event => onStatusChange?.(event.target.value as ItemStatus)} aria-label="Статус товара">
                  {statusOrder.map(status => <option value={status} key={status}>{statusLabels[status]}</option>)}
                </select>
                <button type="button" className="secondary small" onClick={onExport}>Репост</button>
                <button type="button" className="danger small" onClick={onDelete}>Удалить</button>
              </>
            ) : (
              <>
                <button type="button" className="secondary small" onClick={onQueue}>Запрос</button>
                <ContactLink contact={item.contact} />
              </>
            )}
          </div>
        )}

        {isPreview && (
          <div className="card-actions">
            <button type="button" className="secondary small" onClick={onExport}>Текст репоста</button>
          </div>
        )}
      </div>
    </article>
  );
}

function ContactLink({ contact }: { contact: string }) {
  if (contact.startsWith('@')) {
    return <a className="contact small" href={`https://t.me/${contact.slice(1)}`} target="_blank" rel="noreferrer">TG</a>;
  }
  if (/^(?:\+7|8)/.test(contact)) {
    return <a className="contact small" href={`tel:${contact.replace(/[^\d+]/g, '')}`}>Тел.</a>;
  }
  if (/^https?:\/\//i.test(contact)) {
    return <a className="contact small" href={contact} target="_blank" rel="noreferrer">Ссылка</a>;
  }
  return <span className="contact small">{contact || 'Контакт'}</span>;
}

function ExportSheet({
  item,
  onClose,
  onCopy
}: {
  item: Item;
  onClose: () => void;
  onCopy: (text: string, successMessage: string) => void;
}) {
  const telegramText = createTelegramText(item);
  const avitoText = createAvitoText(item);
  const shortText = [item.title, item.price, item.city, item.contact].filter(Boolean).join('\n');

  return (
    <div className="sheet-backdrop" role="presentation">
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="exportTitle">
        <div className="sheet-head">
          <div>
            <p className="eyebrow">экспорт</p>
            <h2 id="exportTitle">Репост</h2>
          </div>
          <button type="button" className="icon-close" onClick={onClose} aria-label="Закрыть" />
        </div>
        <div className="export-actions">
          <button type="button" className="primary" onClick={() => onCopy(telegramText, 'Скопировано для TG')}>Telegram</button>
          <button type="button" className="secondary" onClick={() => onCopy(avitoText, 'Скопировано для Avito')}>Avito</button>
          <button type="button" className="secondary" onClick={() => onCopy(shortText, 'Короткий текст скопирован')}>ЛС</button>
        </div>
        <textarea value={telegramText} readOnly rows={10} />
      </section>
    </div>
  );
}

function itemFromDraft(draft: DraftItem, profile: Profile): Item {
  const timestamp = Date.now();
  return {
    ...draft,
    id: `item-${timestamp}`,
    title: draft.title.trim(),
    price: draft.price.trim(),
    description: draft.description.trim(),
    sellerName: profile.name || defaultProfile.name,
    city: draft.city || profile.city,
    contact: draft.contact || profile.contact,
    queueCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function defaultReserveTime() {
  const date = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function visualClass(category: Item['category']) {
  if (category === 'Смартфон') return 'phone';
  if (category === 'Консоль') return 'console';
  if (category === 'Фото') return 'camera';
  if (category === 'Аудио') return 'audio';
  return 'laptop';
}

function fileToMedia(file: File) {
  return new Promise<Item['media'][number]>(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const max = 1200;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({
          id: `${file.name}-${Date.now()}`,
          kind: 'image',
          name: file.name,
          src: canvas.toDataURL('image/jpeg', 0.82)
        });
      };
      image.onerror = () => resolve({
        id: `${file.name}-${Date.now()}`,
        kind: 'image',
        name: file.name,
        src: String(reader.result || '')
      });
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
