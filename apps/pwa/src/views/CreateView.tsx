import { useMemo, useState } from 'react';
import type { DraftItem, Item, ItemStatus } from '../types';
import { useStore } from '../lib/store';
import { emptyDraft, parseImport, supportedCategories, supportedConditions, supportedGrades } from '../lib/importer';
import { filesToMedia } from '../lib/media';
import { dealModeLabels, dealModeOrder, statusLabels, statusOrder } from '../lib/labels';
import { Field } from '../components/Field';
import { ItemCard } from '../components/ItemCard';
import { BoltIcon, CameraIcon, ChevronIcon, ClipboardIcon } from '../components/icons';

function makeDraft(city: string, contact: string): DraftItem {
  return { ...emptyDraft(), city, contact };
}

export function CreateView({ onExport, onCreated }: { onExport: (item: Item) => void; onCreated: () => void }) {
  const { profile, addItem, showToast } = useStore();
  const [draft, setDraft] = useState<DraftItem>(() => makeDraft(profile.city, profile.contact));
  const [importValue, setImportValue] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);

  function update<K extends keyof DraftItem>(key: K, value: DraftItem[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  function handleImport() {
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
    showToast(parsed.sourceUrl ? 'Заполнил из ссылки' : 'Разобрал текст');
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        showToast('Буфер пуст');
        return;
      }
      setImportValue(text);
      showToast('Вставлено из буфера');
    } catch {
      showToast('Нет доступа к буферу');
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBusyPhoto(true);
    showToast('Обрабатываю фото');
    const media = await filesToMedia(files);
    update('media', media);
    setBusyPhoto(false);
    showToast(`${media.length} фото готово`);
  }

  const preview = useMemo<Item>(() => ({
    ...draft,
    id: 'preview',
    title: draft.title.trim(),
    price: draft.price.trim(),
    description: draft.description.trim(),
    sellerName: profile.name,
    queueCount: 0,
    createdAt: 0,
    updatedAt: 0
  }), [draft, profile.name]);

  function save() {
    if (!draft.contact.trim()) setShowDetails(true);
    if (addItem(draft, profile.name)) {
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
        <h1>Новый</h1>
        <span className={`status-pill ${draft.status}`}>{statusLabels[draft.status]}</span>
      </header>

      <div className="import-hero">
        <div className="import-hero-top">
          <span className="hero-icon"><BoltIcon size={18} /></span>
          <div>
            <strong>Перенос с площадки</strong>
            <small>Ссылка Avito / t.me или текст поста — соберу карточку сам</small>
          </div>
        </div>
        <textarea
          value={importValue}
          onChange={event => setImportValue(event.target.value)}
          rows={3}
          placeholder="Вставь ссылку или текст объявления…"
        />
        <div className="import-hero-actions">
          <button type="button" className="ghost-btn" onClick={handlePaste}><ClipboardIcon size={16} />Вставить</button>
          <button type="button" className="solid-btn" onClick={handleImport}><BoltIcon size={16} />Разобрать</button>
        </div>
      </div>

      <div className="photo-loader">
        <input id="media" type="file" accept="image/*" multiple onChange={event => handleFiles(event.currentTarget.files)} />
        <div className="photo-row">
          {draft.media.slice(0, 4).map(asset => <img key={asset.id} src={asset.src} alt="" />)}
          {Array.from({ length: Math.max(0, 4 - draft.media.length) }).map((_, i) => (
            <span className="photo-empty" key={`empty-${i}`} style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <label className="upload-btn" htmlFor="media">
          <CameraIcon size={18} />
          {busyPhoto ? 'Загрузка…' : `Фото · ${draft.media.length}/8`}
        </label>
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
              <input value={draft.battery} onChange={event => update('battery', event.target.value)} placeholder="86%" />
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

      <div className="preview-wrap">
        <p className="preview-label">Как увидит покупатель</p>
        <ItemCard item={preview} variant="preview" onExport={() => onExport(preview)} />
      </div>

      <button type="button" className="solid-btn wide big" onClick={save}>Сохранить в склад</button>
    </section>
  );
}
