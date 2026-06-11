import { useMemo, useState } from 'react';
import type { Item } from '../types';
import { createAvitoText, createTelegramText } from '../lib/importer';
import { useStore } from '../lib/store';
import { CloseIcon, CopyIcon } from './icons';

type Target = 'tg' | 'avito' | 'dm';

const targets: Target[] = ['tg', 'avito', 'dm'];
const targetLabels: Record<Target, string> = { tg: 'Telegram', avito: 'Avito', dm: 'В ЛС' };

export function ExportSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const { showToast } = useStore();
  const [target, setTarget] = useState<Target>('tg');

  const texts = useMemo<Record<Target, string>>(() => ({
    tg: createTelegramText(item),
    avito: createAvitoText(item),
    dm: [item.title, item.price, item.city, item.contact].filter(Boolean).join('\n')
  }), [item]);

  const text = texts[target];
  const index = targets.indexOf(target);

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
    showToast('Скопировано');
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
            <p className="eyebrow">экспорт</p>
            <h2 id="exportTitle">{item.title || 'Товар'}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <CloseIcon size={18} />
          </button>
        </div>

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

        <textarea className="export-text" value={text} readOnly rows={9} aria-label="Текст репоста" />

        <button type="button" className="solid-btn wide big" onClick={copy}>
          <CopyIcon size={18} />Скопировать
        </button>
      </section>
    </div>
  );
}
