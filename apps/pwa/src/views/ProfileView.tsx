import { useMemo, useState, type ChangeEvent } from 'react';
import type { Item, TxnKind } from '../types';
import { useStore } from '../lib/store';
import { StatRing } from '../components/StatRing';
import { Field } from '../components/Field';
import { ItemCard, contactHref } from '../components/ItemCard';
import { CloseIcon, DownloadIcon, SendIcon, UploadIcon } from '../components/icons';
import { downloadBackup, importBackup } from '../lib/backup';
import { useOnline } from '../lib/hooks';
import { pluralize } from '../lib/format';
import { formatMoney, toNum } from '../lib/money';
import { applyTheme, loadTheme, saveTheme, type Theme } from '../lib/theme';
import { APP_BUILD, APP_CHANNEL, APP_VERSION } from '../lib/version';

type Side = 'buy' | 'sell';

export function ProfileView({ onExport, onEdit }: { onExport: (item: Item) => void; onEdit: (item: Item) => void }) {
  const { profile, items, seed, favorites, txns, updateProfile, saveProfile, updateStatus, deleteItem, toggleFavorite, isFavorite, addTxn, deleteTxn, showToast } = useStore();
  const online = useOnline();
  const [side, setSide] = useState<Side>(() => (items.length ? 'sell' : 'buy'));
  const [addKind, setAddKind] = useState<TxnKind | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [theme, setThemeState] = useState<Theme>(() => loadTheme());

  function pickTheme(next: Theme) {
    setThemeState(next);
    saveTheme(next);
    applyTheme(next);
  }

  function saveCopy() {
    downloadBackup();
    showToast('Копия склада сохранена');
  }

  async function loadCopy(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (await importBackup(file)) {
      showToast('Загружено — обновляю');
      window.setTimeout(() => window.location.reload(), 600);
    } else {
      showToast('Не удалось прочитать файл');
    }
  }

  async function feedback() {
    const text = 'Отзыв о БУ.шке — что понравилось / что неудобно: ';
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Отзыв о БУ.шке', text });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Шаблон скопирован — черкни создателю');
    } catch {
      showToast('Расскажи создателю, что улучшить');
    }
  }

  const favItems = useMemo(
    () => [...items, ...seed].filter(item => favorites.includes(item.id)),
    [items, seed, favorites]
  );

  const money = useMemo(() => {
    const soldItems = items.filter(item => item.status === 'sold');
    const salesRevenue = soldItems.reduce((sum, item) => sum + toNum(item.price), 0);
    const salesCost = soldItems.reduce((sum, item) => sum + toNum(item.costPrice), 0);
    const manualIncome = txns.filter(t => t.kind === 'income').reduce((sum, t) => sum + t.amount, 0);
    const manualExpense = txns.filter(t => t.kind === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const income = salesRevenue + manualIncome;
    const expense = salesCost + manualExpense;
    const stockMargin = items
      .filter(item => item.status === 'available' || item.status === 'lot')
      .reduce((sum, item) => sum + Math.max(0, toNum(item.price) - toNum(item.costPrice)), 0);
    return { income, expense, profit: income - expense, stockMargin };
  }, [items, txns]);

  const sold = items.filter(item => item.status === 'sold').length;

  function buy(item: Item) {
    const href = contactHref(item.contact);
    if (href) {
      window.open(href, '_blank', 'noopener');
      showToast('Открываю продавца — скажи «беру»');
    } else {
      showToast('Продавец не оставил контакт');
    }
  }

  function openAdd(kind: TxnKind) {
    setAddKind(current => (current === kind ? null : kind));
    setAmount('');
    setNote('');
  }

  function submitTxn() {
    if (!addKind) return;
    const value = toNum(amount);
    if (value <= 0) {
      showToast('Введи сумму');
      return;
    }
    addTxn(addKind, value, note);
    setAddKind(null);
    setAmount('');
    setNote('');
  }

  return (
    <section className="view profile-view">
      <header className="view-head">
        <p className="eyebrow">кабинет</p>
        <h1>Профиль</h1>
      </header>

      <div className="profile-card">
        <div className="avatar">{(profile.name || 'Б').trim().charAt(0).toUpperCase()}</div>
        <div className="profile-id">
          <strong>{profile.name || 'Без имени'}</strong>
          <span>{profile.city || 'Город не указан'}</span>
        </div>
        <span className={`net-dot ${online ? 'on' : 'off'}`}>{online ? 'online' : 'офлайн'}</span>
      </div>

      <div className="segmented two" role="tablist" aria-label="Сторона">
        <span className="seg-indicator" style={{ transform: `translateX(${side === 'buy' ? 0 : 100}%)` }} aria-hidden="true" />
        <button type="button" role="tab" aria-selected={side === 'buy'} className={side === 'buy' ? 'active' : ''} onClick={() => setSide('buy')}>Покупаю</button>
        <button type="button" role="tab" aria-selected={side === 'sell'} className={side === 'sell' ? 'active' : ''} onClick={() => setSide('sell')}>Продаю</button>
      </div>

      {side === 'buy' ? (
        <>
          <div className="rings">
            <StatRing value={favItems.length} max={Math.max(6, favItems.length)} display={String(favItems.length)} label="в избранном" />
            <StatRing value={profile.rating} max={5} display={profile.rating.toFixed(1)} label="рейтинг" />
            <StatRing value={0} max={3} display="0" label="заданий" />
          </div>

          <p className="section-label">Избранное</p>
          <div className="feed-grid">
            {favItems.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                index={index}
                variant="market"
                favorite={isFavorite(item.id)}
                onBuy={() => buy(item)}
                onFavorite={() => toggleFavorite(item.id)}
                onExport={() => onExport(item)}
              />
            ))}
            {!favItems.length && (
              <div className="empty-state">
                <p>Пока пусто</p>
                <small>Лайкай лоты на Рынке — они соберутся здесь</small>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="rings">
            <StatRing value={items.length} max={Math.max(10, items.length)} display={String(items.length)} label={pluralize(items.length, 'товар', 'товара', 'товаров')} />
            <StatRing value={profile.rating} max={5} display={profile.rating.toFixed(1)} label="рейтинг" />
            <StatRing value={profile.deals} max={Math.max(10, profile.deals)} display={String(profile.deals)} label={pluralize(profile.deals, 'сделка', 'сделки', 'сделок')} />
          </div>

          <p className="section-label">Деньги</p>
          <div className="money-card">
            <div className="money-hero">
              <span>Прибыль</span>
              <strong className={money.profit >= 0 ? 'pos' : 'neg'}>{formatMoney(money.profit)}</strong>
            </div>
            <div className="money-split">
              <div><span>Доход</span><b>{formatMoney(money.income)}</b></div>
              <div><span>Расход</span><b>{formatMoney(money.expense)}</b></div>
            </div>
            {money.stockMargin > 0 && <p className="money-pot">В наличии заложено прибыли: {formatMoney(money.stockMargin)}</p>}
          </div>

          <div className="money-add">
            <button type="button" className={`ghost-btn grow ${addKind === 'income' ? 'on' : ''}`} onClick={() => openAdd('income')}>+ Доход</button>
            <button type="button" className={`ghost-btn grow ${addKind === 'expense' ? 'on' : ''}`} onClick={() => openAdd('expense')}>− Расход</button>
          </div>
          {addKind && (
            <div className="txn-form">
              <input inputMode="numeric" placeholder="Сумма ₽" value={amount} onChange={event => setAmount(event.target.value)} autoFocus />
              <input placeholder="За что (необяз.)" value={note} onChange={event => setNote(event.target.value)} />
              <button type="button" className="solid-btn" onClick={submitTxn}>OK</button>
            </div>
          )}
          {txns.length > 0 && (
            <ul className="txn-list">
              {txns.slice(0, 8).map(txn => (
                <li key={txn.id} className={`txn ${txn.kind}`}>
                  <span className="txn-amount">{txn.kind === 'income' ? '+' : '−'} {formatMoney(txn.amount)}</span>
                  <span className="txn-note">{txn.note || (txn.kind === 'income' ? 'доход' : 'расход')}</span>
                  <button type="button" className="txn-del" onClick={() => deleteTxn(txn.id)} aria-label="Удалить операцию"><CloseIcon size={14} /></button>
                </li>
              ))}
            </ul>
          )}

          <p className="section-label">Профиль продавца</p>
          <div className="form-grid">
            <Field label="Имя или магазин" wide>
              <input value={profile.name} onChange={event => updateProfile({ name: event.target.value })} placeholder="Как тебя зовут покупателю" />
            </Field>
            <Field label="Город">
              <input value={profile.city} onChange={event => updateProfile({ city: event.target.value })} placeholder="Симферополь" />
            </Field>
            <Field label="Контакт">
              <input value={profile.contact} onChange={event => updateProfile({ contact: event.target.value })} placeholder="@username" />
            </Field>
          </div>
          <button type="button" className="solid-btn wide big" onClick={saveProfile}>Сохранить профиль</button>

          <p className="section-label">Мои товары · в наличии {items.length - sold}, продано {sold}</p>
          <div className="feed-grid">
            {items.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                index={index}
                variant="own"
                onStatusChange={status => updateStatus(item.id, status)}
                onEdit={() => onEdit(item)}
                onDelete={() => deleteItem(item.id)}
                onExport={() => onExport(item)}
              />
            ))}
            {!items.length && (
              <div className="empty-state">
                <p>Склад пуст</p>
                <small>Во вкладке «Создать» выставишь первый товар за минуту</small>
              </div>
            )}
          </div>
        </>
      )}

      <p className="section-label">Оформление</p>
      <div className="segmented two" role="tablist" aria-label="Тема">
        <span className="seg-indicator" style={{ transform: `translateX(${theme === 'light' ? 0 : 100}%)` }} aria-hidden="true" />
        <button type="button" role="tab" aria-selected={theme === 'light'} className={theme === 'light' ? 'active' : ''} onClick={() => pickTheme('light')}>Дневная</button>
        <button type="button" role="tab" aria-selected={theme === 'emerald'} className={theme === 'emerald' ? 'active' : ''} onClick={() => pickTheme('emerald')}>Изумруд · золото</button>
      </div>

      <p className="section-label">Данные</p>
      <div className="money-add">
        <button type="button" className="ghost-btn grow" onClick={saveCopy}><DownloadIcon size={16} />Сохранить копию</button>
        <label className="ghost-btn grow file-btn">
          <UploadIcon size={16} />Загрузить
          <input type="file" accept="application/json" onChange={loadCopy} />
        </label>
      </div>
      <p className="export-note" style={{ textAlign: 'left' }}>Склад хранится в браузере. Сохрани копию — не потеряешь товары при чистке и перенесёшь на другой телефон.</p>

      <button type="button" className="ghost-btn wide" onClick={feedback}><SendIcon size={16} />Поделиться отзывом</button>

      <div className="profile-foot">
        <span className="version-tag">БУ.шка · {APP_VERSION} · {APP_CHANNEL} · сборка {APP_BUILD}</span>
        <small>Данные хранятся локально на этом устройстве</small>
      </div>
    </section>
  );
}
