import { useMemo, useState, type ClipboardEvent } from 'react';
import type { DraftItem, Item, ItemStatus, MediaAsset } from '../types';
import { useStore } from '../lib/store';
import { emptyDraft, parseImport, supportedCategories, supportedConditions, supportedGrades } from '../lib/importer';
import { extractImageUrls, filesToMedia, urlToMedia, videoToAsset } from '../lib/media';
import { delVideo } from '../lib/videostore';
import { dealModeLabels, dealModeOrder, statusLabels, statusOrder } from '../lib/labels';
import { batteryLabel, normalizePrice } from '../lib/money';
import { Field } from '../components/Field';
import { ItemCard } from '../components/ItemCard';
import { MediaStrip } from '../components/MediaStrip';
import { BoltIcon, CameraIcon, ChevronIcon, ClipboardIcon } from '../components/icons';

function makeDraft(city: string, contact: string): DraftItem {
  return { ...emptyDraft(), city, contact };
}

function fromItem(item: Item): DraftItem {
  const { id, sellerName, queueCount, createdAt, updatedAt, ...draft } = item;
  void id; void sellerName; void queueCount; void createdAt; void updatedAt;
  return draft;
}

export function CreateView({ editItem, onExport, onCreated }: { editItem?: Item | null; onExport: (item: Item) => void; onCreated: () => void }) {
  const { profile, addItem, updateItem, showToast } = useStore();
  const editing = editItem ?? null;
  const [draft, setDraft] = useState<DraftItem>(() => (editing ? fromItem(editing) : makeDraft(profile.city, profile.contact)));
  const [importValue, setImportValue] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);

  function update<K extends keyof DraftItem>(key: K, value: DraftItem[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  function appendMedia(assets: MediaAsset[]) {
    if (!assets.length) return;
    setDraft(current => ({ ...current, media: [...current.media, ...assets].slice(0, 8) }));
  }

  function removeMedia(id: string) {
    setDraft(current => ({ ...current, media: current.media.filter(asset => asset.id !== id) }));
    void delVideo(id); // если это был ролик — убираем его blob из IndexedDB
  }

  function reorderMedia(from: number, to: number) {
    setDraft(current => {
      const next = current.media.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...current, media: next };
    });
  }

  async function handleImport() {
    if (!importValue.trim()) {
      showToast('Нечего разбирать');
      return;
    }
    const parsed = parseImport(importValue);
    const status: ItemStatus = /(^|\s)(лот|опт|партия)(\s|$)/i.test(importValue) ? 'lot' : draft.status;
    setDraft(current => ({
      ...current,
      ...parsed,
      status,
      city: parsed.city || current.city || profile.city,
      contact: parsed.contact || current.contact || profile.contact
    }));
    if (parsed.sourceUrl || (parsed.grade && parsed.grade !== 'B')) setShowDetails(true);

    // Best-effort: pull any direct image links from the pasted text.
    const urls = extractImageUrls(importValue);
    if (urls.length) {
      showToast('Разобрал · тяну фото…');
      const loaded = (await Promise.all(urls.map(urlToMedia))).filter((asset): asset is MediaAsset => asset != null);
      if (loaded.length) {
        appendMedia(loaded);
        showToast(`Разобрал · ${loaded.length} фото`);
        return;
      }
    }
    showToast(parsed.sourceUrl ? 'Текст готов · фото вставь или добавь' : 'Разобрал текст');
  }

  async function loadClipboardMedia(): Promise<boolean> {
    if (typeof navigator.clipboard?.read !== 'function') return false;
    const items = await navigator.clipboard.read();
    const mediaFiles: File[] = [];
    let text = '';
    for (const item of items) {
      const videoType = item.types.find(type => type.startsWith('video/'));
      const imageType = item.types.find(type => type.startsWith('image/'));
      if (videoType) {
        const blob = await item.getType(videoType);
        mediaFiles.push(new File([blob], 'clip', { type: blob.type }));
      } else if (imageType) {
        const blob = await item.getType(imageType);
        mediaFiles.push(new File([blob], 'paste.png', { type: blob.type }));
      } else if (item.types.includes('text/plain')) {
        text = await (await item.getType('text/plain')).text();
      }
    }
    if (mediaFiles.length) await handleFiles(mediaFiles); // фото и видео — единым путём
    if (text.trim()) {
      setImportValue(text);
      if (!mediaFiles.length) showToast('Текст вставлен');
    } else if (!mediaFiles.length) {
      showToast('В буфере пусто');
    }
    return true;
  }

  async function handlePaste() {
    try {
      if (await loadClipboardMedia()) return;
    } catch {
      // rich clipboard blocked — fall back to plain text below
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        showToast('Буфер пуст');
        return;
      }
      setImportValue(text);
      showToast('Текст вставлен');
    } catch {
      showToast('Разреши доступ к буферу или вставь вручную');
    }
  }

  async function handleTextareaPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && (item.type.startsWith('image/') || item.type.startsWith('video/'))) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (!files.length) return;
    event.preventDefault();
    await handleFiles(files); // фото и видео — единым путём (с петлёй и тостами)
  }

  async function handleFiles(files: FileList | File[] | null) {
    if (!files || !files.length) return;
    const list = Array.from(files);
    const videos = list.filter(file => file.type.startsWith('video/'));
    const images = list.filter(file => file.type.startsWith('image/'));
    setBusyPhoto(true);
    showToast(videos.length ? 'Собираю петлю из видео…' : 'Обрабатываю фото');

    const collected: MediaAsset[] = [];
    let failed = 0;
    try {
      if (images.length) collected.push(...await filesToMedia(images));
      for (const file of videos) {
        const clip = await videoToAsset(file);
        if (clip) collected.push(clip);
        else failed++;
      }
    } catch {
      failed += videos.length;
    } finally {
      setBusyPhoto(false);
    }
    if (collected.length) appendMedia(collected);

    const clips = collected.filter(asset => asset.kind === 'video').length;
    const photos = collected.length - clips;
    if (clips) showToast(`Петля готова${photos ? ` · ${photos} фото` : ''}`);
    else if (photos) showToast(`${photos} фото готово`);
    else if (failed) showToast('Видео не отдало кадры — в камере iPhone поставь «Наиболее совместимый»');
  }

  const preview = useMemo<Item>(() => ({
    ...draft,
    id: 'preview',
    title: draft.title.trim(),
    price: normalizePrice(draft.price), // превью как на витрине: «35 000 ₽»
    battery: batteryLabel(draft.battery), // «86» → «86%»
    description: draft.description.trim(),
    sellerName: profile.name,
    queueCount: 0,
    createdAt: 0,
    updatedAt: 0
  }), [draft, profile.name]);

  function save() {
    if (!draft.contact.trim()) setShowDetails(true);
    const ok = editing ? updateItem(editing.id, draft) : addItem(draft, profile.name);
    if (ok) {
      setDraft(makeDraft(profile.city, profile.contact));
      setImportValue('');
      setShowDetails(false);
      onCreated();
    }
  }

  return (
    <section className="view create-view">
      <header className="view-head">
        <p className="eyebrow">товар</p>
        <h1>{editing ? 'Изменить' : 'Новый'}</h1>
        <span className={`status-pill ${draft.status}`}>{statusLabels[draft.status]}</span>
      </header>

      <div className="create-dash">
        <div className="create-main">

      <div className="import-hero">
        <div className="import-hero-top">
          <span className="hero-icon"><BoltIcon size={18} /></span>
          <div>
            <strong>Перенос с площадки</strong>
            <small>Ссылка или текст — соберу описание и цену. Скрин, фото или короткое видео — вставь прямо сюда, подхвачу.</small>
          </div>
        </div>
        <textarea
          value={importValue}
          onChange={event => setImportValue(event.target.value)}
          onPaste={handleTextareaPaste}
          rows={3}
          placeholder="Вставь ссылку, текст или скрин объявления…"
        />
        <div className="import-hero-actions">
          <button type="button" className="ghost-btn" onClick={handlePaste}><ClipboardIcon size={16} />Вставить</button>
          <button type="button" className="solid-btn" onClick={handleImport}><BoltIcon size={16} />Разобрать</button>
        </div>
      </div>

      <div className="photo-loader">
        <input id="media" type="file" accept="image/*,video/*" multiple onChange={event => handleFiles(event.currentTarget.files)} />
        {draft.media.length > 0 && (
          <MediaStrip media={draft.media} onReorder={reorderMedia} onRemove={removeMedia} />
        )}
        <label className="upload-btn" htmlFor="media">
          <CameraIcon size={18} />
          {busyPhoto ? 'Собираю…' : `Фото / видео · ${draft.media.length}/8`}
        </label>
        {draft.media.length > 1 && <p className="strip-hint">Листай — посмотреть; зажми и тащи — поменять порядок или убрать. Первое фото — обложка.</p>}
      </div>

      <div className="form-grid">
        <Field label="Название" wide>
          <input value={draft.title} onChange={event => update('title', event.target.value)} placeholder="iPhone 13 mini 128" />
        </Field>
        <Field label="Цена">
          <input value={draft.price} onChange={event => update('price', event.target.value)} inputMode="numeric" placeholder="35 000 ₽" />
        </Field>
        <Field label="Статус">
          <select value={draft.status} onChange={event => update('status', event.target.value as ItemStatus)}>
            {statusOrder.map(status => <option value={status} key={status}>{statusLabels[status]}</option>)}
          </select>
        </Field>
        <Field label="Категория">
          <select value={draft.category} onChange={event => update('category', event.target.value as DraftItem['category'])}>
            {supportedCategories().map(category => <option key={category}>{category}</option>)}
          </select>
        </Field>
        <Field label="Состояние">
          <select value={draft.condition} onChange={event => update('condition', event.target.value as DraftItem['condition'])}>
            {supportedConditions().map(condition => <option key={condition}>{condition}</option>)}
          </select>
        </Field>
      </div>

      <button
        type="button"
        className={`details-toggle ${showDetails ? 'open' : ''}`}
        onClick={() => setShowDetails(value => !value)}
        aria-expanded={showDetails}
      >
        <span>Детали и характеристики</span>
        <ChevronIcon size={18} />
      </button>

      <div className={`details ${showDetails ? 'open' : ''}`}>
        <div className="details-inner">
          <div className="form-grid">
            <Field label="Закупка" hint="для себя">
              <input value={draft.costPrice ?? ''} onChange={event => update('costPrice', event.target.value)} inputMode="numeric" placeholder="за сколько взял" />
            </Field>
            <Field label="Грейд">
              <select value={draft.grade} onChange={event => update('grade', event.target.value as DraftItem['grade'])}>
                {supportedGrades().map(grade => <option key={grade}>{grade}</option>)}
              </select>
            </Field>
            <Field label="Режим сделки">
              <select value={draft.dealMode} onChange={event => update('dealMode', event.target.value as DraftItem['dealMode'])}>
                {dealModeOrder.map(mode => <option value={mode} key={mode}>{dealModeLabels[mode]}</option>)}
              </select>
            </Field>
            <Field label="Город">
              <input value={draft.city} onChange={event => update('city', event.target.value)} placeholder="Симферополь" />
            </Field>
            <Field label="Контакт">
              <input value={draft.contact} onChange={event => update('contact', event.target.value)} placeholder="@username" />
            </Field>
            <Field label="Батарея">
              <input value={draft.battery} onChange={event => update('battery', event.target.value)} onBlur={event => update('battery', batteryLabel(event.target.value))} inputMode="numeric" placeholder="86%" />
            </Field>
            <Field label="Комплект">
              <input value={draft.kit} onChange={event => update('kit', event.target.value)} placeholder="Коробка, зарядка" />
            </Field>
            <Field label="Дефекты" wide>
              <input value={draft.defects} onChange={event => update('defects', event.target.value)} placeholder="Скол, Face ID" />
            </Field>
            <Field label="Исходная ссылка" wide>
              <input value={draft.sourceUrl} onChange={event => update('sourceUrl', event.target.value)} placeholder="Avito или Telegram" />
            </Field>
            <Field label="Описание" wide>
              <textarea value={draft.description} onChange={event => update('description', event.target.value)} rows={5} placeholder="Комплект, нюансы, причина продажи" />
            </Field>
          </div>
        </div>
      </div>

        </div>

        <aside className="create-side">
      <div className="preview-wrap">
        <p className="preview-label">Как увидит покупатель</p>
        <ItemCard item={preview} variant="preview" onExport={() => onExport(preview)} />
      </div>

      <button type="button" className="solid-btn wide big" onClick={save}>{editing ? 'Сохранить изменения' : 'Сохранить в склад'}</button>
        </aside>
      </div>
    </section>
  );
}
