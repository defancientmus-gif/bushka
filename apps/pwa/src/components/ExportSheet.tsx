import { useMemo, useState } from 'react';
import type { Item } from '../types';
import { createTelegramText } from '../lib/importer';
import { useStore } from '../lib/store';
import { canShare, downloadMedia, mediaToFiles, shareItem } from '../lib/share';
import { CloseIcon, CopyIcon, DownloadIcon, SendIcon } from './icons';

type Target = 'tg' | 'avito' | 'dm';

const targets: Target[] = ['tg', 'avito', 'dm'];
const targetLabels: Record<Target, string> = { tg: 'Telegram', avito: 'Avito', dm: 'В ЛС' };

function writeClipboard(value: string) {
  return navigator.clipboard.writeText(value).catch(() => {
    const area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
    } catch {
      // clipboard unavailable
    }
    area.remove();
  });
}

export function ExportSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const { showToast } = useStore();
  const [target, setTarget] = useState<Target>('tg');
  const [busy, setBusy] = useState(false);

  const tgText = useMemo(() => createTelegramText(item), [item]);
  const dmText = useMemo(() => [item.title, item.price, item.city, item.contact].filter(Boolean).join('\n'), [item]);
  const text = target === 'dm' ? dmText : tgText;

  // Avito has no simple API for private sellers — so we hand the seller each
  // field ready to paste into Avito's own form, plus photos to upload.
  const avitoFields = useMemo(() => {
    const description = [
      item.description,
      item.battery ? `Батарея: ${item.battery}` : '',
      item.kit ? `Комплект: ${item.kit}` : '',
      item.defects ? `Недостатки: ${item.defects}` : '',
      `Состояние: ${item.condition}${item.grade ? ` · грейд ${item.grade}` : ''}`
    ].filter(Boolean).join('\n');
    return [
      { key: 'title', label: 'Заголовок', value: item.title, msg: 'Заголовок скопирован' },
      { key: 'price', label: 'Цена', value: item.price.replace(/[^\d]/g, ''), msg: 'Цена скопирована' },
      { key: 'desc', label: 'Описание', value: description, msg: 'Описание скопировано' }
    ].filter(field => field.value);
  }, [item]);

  const index = targets.indexOf(target);
  const photos = item.media;
  const hasPhotos = photos.length > 0;

  async function copyText(value: string, message: string) {
    await writeClipboard(value);
    showToast(message);
  }

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      showToast(hasPhotos ? 'Подготовка фото…' : 'Открываю «Поделиться»…');
      const files = hasPhotos ? await mediaToFiles(photos) : [];
      const result = await shareItem({ title: item.title || 'Товар на БУ.шке', text, files });
      if (result === 'shared-files') showToast('Фото и текст готовы — выберите канал');
      else if (result === 'shared-text') showToast(hasPhotos ? 'Текст готов, добавьте фото вручную' : 'Текст готов — выберите канал');
      else if (result === 'cancelled') { /* user closed the share sheet */ }
      else { await copyText(text, 'Текст скопирован'); }
    } finally {
      setBusy(false);
    }
  }

  function savePhotos() {
    downloadMedia(photos);
    showToast(photos.length > 1 ? 'Фото сохраняются' : 'Фото сохраняется');
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exportTitle"
        onClick={event => event.stopPropagation()}
      >
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <div>
            <p className="eyebrow">поделиться</p>
            <h2 id="exportTitle">{item.title || 'Товар'}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <CloseIcon size={18} />
          </button>
        </div>

        {hasPhotos ? (
          <div className="export-photos" aria-label={`${photos.length} фото`}>
            {photos.map(asset => <img key={asset.id} src={asset.src} alt="" />)}
          </div>
        ) : (
          <p className="export-note">У товара нет фото — отправится только текст.</p>
        )}

        <div className="segmented" role="tablist" aria-label="Куда отправить">
          <span className="seg-indicator" style={{ transform: `translateX(${index * 100}%)` }} aria-hidden="true" />
          {targets.map(value => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={target === value}
              className={target === value ? 'active' : ''}
              onClick={() => setTarget(value)}
            >
              {targetLabels[value]}
            </button>
          ))}
        </div>

        {target === 'avito' ? (
          <>
            <div className="avito-fields">
              {avitoFields.map(field => (
                <button key={field.key} type="button" className="avito-field" onClick={() => copyText(field.value, field.msg)}>
                  <span className="af-label">{field.label}</span>
                  <span className="af-value">{field.value}</span>
                  <CopyIcon size={16} />
                </button>
              ))}
            </div>
            {hasPhotos && (
              <button type="button" className="solid-btn wide big" onClick={savePhotos}>
                <DownloadIcon size={18} />Скачать фото для Avito
              </button>
            )}
            <p className="export-note">Нажмите на поле, чтобы скопировать. Вставьте в форму Avito, фото загрузите там же.</p>
          </>
        ) : (
          <>
            <textarea className="export-text" value={text} readOnly rows={7} aria-label="Текст объявления" />
            {canShare ? (
              <>
                <button type="button" className="solid-btn wide big" onClick={share} disabled={busy}>
                  <SendIcon size={18} />{busy ? 'Подготовка…' : hasPhotos ? 'Поделиться (фото + текст)' : 'Поделиться'}
                </button>
                <div className="sheet-actions">
                  <button type="button" className="ghost-btn grow" onClick={() => copyText(text, 'Текст скопирован')}><CopyIcon size={16} />Текст</button>
                  {hasPhotos && <button type="button" className="ghost-btn grow" onClick={savePhotos}><DownloadIcon size={16} />Фото</button>}
                </div>
                <p className="export-note">
                  {target === 'tg'
                    ? 'В окне «Поделиться» выберите канал или чат — фото и подпись отправятся вместе.'
                    : 'Выберите, кому отправить — фото и текст отправятся вместе.'}
                </p>
              </>
            ) : (
              <>
                <button type="button" className="solid-btn wide big" onClick={() => copyText(text, 'Текст скопирован')}>
                  <CopyIcon size={18} />Скопировать текст
                </button>
                {hasPhotos && (
                  <button type="button" className="ghost-btn wide" onClick={savePhotos}>
                    <DownloadIcon size={16} />Скачать фото
                  </button>
                )}
                <p className="export-note">Откройте БУ.шку на телефоне — фото отправятся в Telegram одним нажатием.</p>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
