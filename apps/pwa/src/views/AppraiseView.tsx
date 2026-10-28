import { useEffect, useMemo, useRef, useState } from 'react';
import type { DraftItem, MediaAsset } from '../types';
import type { PhoneModel } from '../data/phonePrices';
import { PRICES_UPDATED } from '../data/phonePrices';
import { useStore } from '../lib/store';
import { filesToMedia } from '../lib/media';
import { loadCookieChoice } from '../lib/legal';
import { formatMoney, toNum } from '../lib/money';
import {
  appraise,
  customModel,
  defectLabels,
  defectOrder,
  findModels,
  lookLabels,
  lookOrder,
  parsePhone,
  storageLabel,
  storageOptions,
  type Defect,
  type Look
} from '../lib/appraise';
import { CameraIcon, ChevronIcon, CloseIcon, CopyIcon, ScaleIcon } from '../components/icons';

const lookToCondition: Record<Look, DraftItem['condition']> = { mint: 'Идеальное', good: 'Хорошее', worn: 'Есть следы', rough: 'Есть следы' };
const range = (low: number, high: number) => `${low.toLocaleString('ru-RU')} – ${formatMoney(high)}`;
const lookToGrade: Record<Look, DraftItem['grade']> = { mint: 'A', good: 'B', worn: 'C', rough: 'D' };

export function AppraiseView({ onSell, onBack }: { onSell: (draft: Partial<DraftItem>) => void; onBack: () => void }) {
  const { showToast } = useStore();
  const [query, setQuery] = useState('');
  const [model, setModel] = useState<PhoneModel | null>(null);
  const [storage, setStorage] = useState(0);
  const [look, setLook] = useState<Look>('good');
  const [battery, setBattery] = useState('');
  const [box, setBox] = useState(false);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [customPrice, setCustomPrice] = useState('');
  const [photo, setPhoto] = useState<MediaAsset | null>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);
  const [resultVisible, setResultVisible] = useState(true);
  const suggestions = useMemo(() => (query.trim() ? findModels(query, 4) : []), [query]);

  // Печатаешь как говоришь продавцу: «13 про макс 256 акб 86 разбит экран» — остальное подхватится само.
  function typeQuery(value: string) {
    setQuery(value);
    const parsed = parsePhone(value);
    if (parsed.model) pickModel(parsed.model, parsed.storage);
    else setModel(null);
    if (parsed.battery != null) setBattery(String(parsed.battery));
    if (parsed.defects.length) setDefects(current => Array.from(new Set([...current, ...parsed.defects])));
    if (parsed.box) setBox(true);
    if (parsed.look) setLook(parsed.look);
  }

  function pickModel(next: PhoneModel, wanted: number | null = null) {
    setModel(next);
    const sizes = storageOptions(next);
    setStorage(current => {
      const target = wanted ?? current;
      return sizes.includes(target) ? target : sizes[0];
    });
  }

  function toggleDefect(defect: Defect) {
    setDefects(current => (current.includes(defect) ? current.filter(d => d !== defect) : [...current, defect]));
  }

  async function addPhoto(files: FileList | null) {
    if (!files?.length) return;
    const [asset] = await filesToMedia(Array.from(files).slice(0, 1), 1);
    if (asset) setPhoto(asset);
  }

  const customSell = toNum(customPrice);
  const active: PhoneModel | null = model ?? (query.trim() && customSell >= 1000 ? customModel(query, customSell) : null);
  const batteryNum = battery.trim() ? Math.min(100, toNum(battery)) : null;
  const result = useMemo(
    () => (active ? appraise({ model: active, storage: active.id === 'custom' ? 0 : storage, look, battery: batteryNum && batteryNum >= 50 ? batteryNum : null, box, defects }) : null),
    [active, storage, look, batteryNum, box, defects]
  );

  // Пока висит выбор cookie, липкая полоска уступает ему место.
  const [cookiePending, setCookiePending] = useState(() => loadCookieChoice() == null);
  useEffect(() => {
    const sync = () => setCookiePending(loadCookieChoice() == null);
    window.addEventListener('bushka:cookies', sync);
    return () => window.removeEventListener('bushka:cookies', sync);
  }, []);

  const hasResult = result != null;
  useEffect(() => {
    const node = resultRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setResultVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasResult]);

  async function copyPitch() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.pitch);
      showToast('Фраза скопирована');
    } catch {
      showToast('Не удалось скопировать');
    }
  }

  function sell() {
    if (!active || !result) return;
    const title = active.id === 'custom' ? active.name : `${active.name} ${storageLabel(storage)}`;
    const issues = defects.filter(d => d !== 'locked').map(d => defectLabels[d]);
    onSell({
      title,
      category: 'Смартфон',
      price: String(Math.round((result.sellLow + result.sellHigh) / 2 / 500) * 500),
      costPrice: String(result.buyHigh),
      condition: result.partsOnly ? 'На запчасти' : lookToCondition[look],
      grade: result.partsOnly ? 'Repair' : lookToGrade[look],
      battery: batteryNum ? `${batteryNum}%` : '',
      kit: box ? 'Коробка' : '',
      defects: issues.join(', '),
      media: photo ? [photo] : []
    });
    showToast('Перенёс в «Создать» · проверьте и сохраните');
  }

  const light = result ? (result.profit / Math.max(1, result.buyHigh) >= 0.12 ? 'green' : result.profit > 0 ? 'yellow' : 'red') : null;

  return (
    <section className="view appraise-view">
      <button type="button" className="legal-back" onClick={onBack}>
        <ChevronIcon size={18} />Профиль
      </button>

      <header className="view-head">
        <p className="eyebrow">оценщик в карман</p>
        <h1>Сколько дать?</h1>
      </header>

      <div className="import-hero">
        <div className="import-hero-top">
          <span className="hero-icon"><ScaleIcon size={18} /></span>
          <div>
            <strong>Какой телефон?</strong>
            <small>Пишите как говорите: «13 про макс 256 акб 86 разбит экран» — модель, память и дефекты подхватятся сами.</small>
          </div>
        </div>
        <div className="appraise-input">
          <input
            value={query}
            onChange={event => typeQuery(event.target.value)}
            placeholder="iPhone 13 Pro 256…"
            autoComplete="off"
            enterKeyHint="done"
            aria-label="Модель телефона"
          />
          {query && (
            <button type="button" className="appraise-clear" onClick={() => { setQuery(''); setModel(null); setDefects([]); setBattery(''); setBox(false); setCustomPrice(''); }} aria-label="Очистить">
              <CloseIcon size={16} />
            </button>
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="chip-wrap">
            {suggestions.map(option => (
              <button key={option.id} type="button" className={`pick-chip ${model?.id === option.id ? 'active' : ''}`} onClick={() => { setQuery(option.name); pickModel(option); }}>
                {option.name}
              </button>
            ))}
          </div>
        )}
        {query.trim() && !suggestions.length && (
          <label className="appraise-custom">
            <span>Такой модели пока нет в таблице. За сколько такие уходят в хорошем виде?</span>
            <input value={customPrice} onChange={event => setCustomPrice(event.target.value)} inputMode="numeric" placeholder="например, 20 000" />
          </label>
        )}

        <div className="appraise-photo">
          <input id="appraise-photo" type="file" accept="image/*" capture="environment" onChange={event => addPhoto(event.currentTarget.files)} />
          {photo ? (
            <span className="appraise-thumb">
              <img src={photo.src} alt="Фото телефона" />
              <button type="button" onClick={() => setPhoto(null)} aria-label="Убрать фото"><CloseIcon size={13} /></button>
            </span>
          ) : null}
          <label htmlFor="appraise-photo" className="ghost-btn">
            <CameraIcon size={16} />{photo ? 'Переснять' : 'Сфоткать аппарат'}
          </label>
          <small>Фото остаётся в телефоне и пойдёт в объявление, если решите выставить.</small>
        </div>
      </div>

      {model && storageOptions(model).length > 1 && (
        <>
          <p className="section-label">Память</p>
          <div className="chip-wrap">
            {storageOptions(model).map(size => (
              <button key={size} type="button" className={`pick-chip ${storage === size ? 'active' : ''}`} onClick={() => setStorage(size)}>{storageLabel(size)}</button>
            ))}
          </div>
        </>
      )}

      <p className="section-label">Корпус</p>
      <div className="chip-wrap">
        {lookOrder.map(option => (
          <button key={option} type="button" className={`pick-chip ${look === option ? 'active' : ''}`} onClick={() => setLook(option)}>{lookLabels[option]}</button>
        ))}
      </div>

      <div className="appraise-row">
        <label className="field">
          <span className="field-label">АКБ, %</span>
          <input value={battery} onChange={event => setBattery(event.target.value.replace(/[^\d]/g, '').slice(0, 3))} inputMode="numeric" placeholder="86" />
        </label>
        <button type="button" className={`pick-chip box-chip ${box ? 'active' : ''}`} onClick={() => setBox(value => !value)}>
          {box ? 'С коробкой' : 'Без коробки'}
        </button>
      </div>

      <p className="section-label">Что не так</p>
      <div className="chip-wrap">
        {defectOrder.map(defect => (
          <button key={defect} type="button" className={`pick-chip ${defects.includes(defect) ? 'active warn' : ''}`} onClick={() => toggleDefect(defect)}>{defectLabels[defect]}</button>
        ))}
      </div>

      {result && active ? (
        <div ref={resultRef} className={`appraise-result ${result.partsOnly ? 'parts' : ''}`} aria-live="polite">
          <p className="appraise-model">{active.id === 'custom' ? active.name : `${active.name} · ${storageLabel(storage)}`}{result.partsOnly && <em>на запчасти</em>}</p>
          <div className="appraise-fork">
            <div>
              <span>Берём</span>
              <strong>{range(result.buyLow, result.buyHigh)}</strong>
              <small>выше {formatMoney(result.buyHigh)} не поднимаемся</small>
            </div>
            <div>
              <span>Продаём</span>
              <strong>{range(result.sellLow, result.sellHigh)}</strong>
              <small>{result.repairs ? `после ремонта на ${formatMoney(result.repairs)}` : 'как есть, без ремонта'}</small>
            </div>
          </div>
          <p className={`navar-line ${light ?? ''}`}>
            <i className={`light-dot ${light ?? ''}`} aria-hidden="true" />
            Прибыль ≈ {formatMoney(result.profit)}
          </p>

          {result.reasons.length > 0 && (
            <ul className="appraise-reasons">
              {result.reasons.map(reason => (
                <li key={reason.text}>
                  <span>{reason.text}</span>
                  <b className={reason.delta < 0 ? 'neg' : 'pos'}>{reason.delta > 0 ? '+' : '−'}{formatMoney(Math.abs(reason.delta))}</b>
                </li>
              ))}
            </ul>
          )}

          <button type="button" className="appraise-pitch" onClick={copyPitch}>
            <span>Сказать продавцу</span>
            «{result.pitch}»
            <CopyIcon size={15} />
          </button>

          <button type="button" className="solid-btn wide big" onClick={sell}>Купил — выставить на продажу</button>
        </div>
      ) : (
        <div className="empty-state">
          <p>Начните с модели</p>
          <small>Вилка «берём → продаём» появится сразу, без кнопки «посчитать»</small>
        </div>
      )}

      {/* Карточка ответа ушла из виду, пока уточняешь дефекты, — вилка всё равно перед глазами. */}
      {result && !resultVisible && !cookiePending && (
        <button type="button" className="appraise-sticky" onClick={() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
          <span>Берём до <b>{formatMoney(result.buyHigh)}</b></span>
          <span>продаём ~<b>{formatMoney(Math.round((result.sellLow + result.sellHigh) / 1000) * 500)}</b></span>
        </button>
      )}

      <p className="export-note">Цены — ориентир на {PRICES_UPDATED} по Симферополю. Таблицу легко поправить под свой рынок.</p>
    </section>
  );
}
