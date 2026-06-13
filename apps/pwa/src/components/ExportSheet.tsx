import { useMemo, useState } from 'react';
import type { Item } from '../types';
import { createAvitoText, createTelegramText } from '../lib/importer';
import { useStore } from '../lib/store';
import { canShare, downloadMedia, mediaToFiles, shareItem } from '../lib/share';
import { CloseIcon, CopyIcon, DownloadIcon, SendIcon } from './icons';

type Target = 'tg' | 'avito' | 'dm';

const targets: Target[] = ['tg', 'avito', 'dm'];
const targetLabels: Record<Target, string> = { tg: 'Telegram', avito: 'Avito', dm: 'В ЛС' };

export function ExportSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const { showToast } = useStore();
  const [target, setTarget] = useState<Target>('tg');
  const [busy, setBusy] = useState(false);

  const texts = useMemo<Record<Target, string>>(() => ({
    tg: createTelegramText(item),
    avito: createAvitoText(item),
    dm: [item.title, item.price, item.city, item.contact].filter(Boolean).join('\n')
  }), [item]);

  const text = texts[target];
  const index = targets.indexOf(target);
  const photos = item.media;
  const hasPhotos = photos.length > 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
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
    }
    showToast('Текст скопирован');
  }

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      showToast(hasPhotos ? 'Готовлю фото…' : 'Открываю «Поделиться»…');
      const files = hasPhotos ? await mediaToFiles(photos) : [];
      const result = await shareItem({ title: item.title || 'Товар на БУ.шке', text, files });
      if (result === 'shared-files') showToast('Фото и текст ушли — выбери Telegram');
      else if (result === 'shared-text') showToast(hasPhotos ? 'Текст ушёл, фото добавь вручную' : 'Текст ушёл — выбери Telegram');
      else if (result === 'cancelled') { /* user closed the share sheet */ }
      else { await copy(); }
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
            <p className="eyebrow">репост</p>
            <h2 id="exportTitle">{item.title || 'Товар'}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <CloseIcon size={18} />
          </button>
        </div>

        {hasPhotos ? (
          <div className="export-photos" aria-label={`${photos.length} фото уйдут в репост`}>
            {photos.map(asset => <img key={asset.id} src={asset.src} alt="" />)}
          </div>
        ) : (
          <p className="export-note">У лота нет фото — уйдёт только текст.</p>
        )}

        <div className="segmented" role="tablist" aria-label="Куда репостим">
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

        <textarea className="export-text" value={text} readOnly rows={7} aria-label="Текст репоста" />

        {canShare ? (
          <>
            <button type="button" className="solid-btn wide big" onClick={share} disabled={busy}>
              <SendIcon size={18} />{busy ? 'Готовлю…' : hasPhotos ? 'Поделиться (фото + текст)' : 'Поделиться'}
            </button>
            <div className="sheet-actions">
              <button type="button" className="ghost-btn grow" onClick={copy}><CopyIcon size={16} />Текст</button>
              {hasPhotos && <button type="button" className="ghost-btn grow" onClick={savePhotos}><DownloadIcon size={16} />Фото</button>}
            </div>
            <p className="export-note">В окне «Поделиться» выбери Telegram — фото и подпись уйдут вместе.</p>
          </>
        ) : (
          <>
            <button type="button" className="solid-btn wide big" onClick={copy}>
              <CopyIcon size={18} />Скопировать текст
            </button>
            {hasPhotos && (
              <button type="button" className="ghost-btn wide" onClick={savePhotos}>
                <DownloadIcon size={16} />Скачать фото
              </button>
            )}
            <p className="export-note">Открой БУ.шку на телефоне — там фото уйдут в Telegram одним тапом.</p>
          </>
        )}
      </section>
    </div>
  );
}
