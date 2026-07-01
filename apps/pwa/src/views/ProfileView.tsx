import { useMemo, useState, type ChangeEvent } from 'react';
import type { Item, TxnKind } from '../types';
import { useStore } from '../lib/store';
import { Field } from '../components/Field';
import { ItemCard, contactHref } from '../components/ItemCard';
import { OwnItemsTable } from '../components/OwnItemsTable';
import { ChevronIcon, CloseIcon, DownloadIcon, GearIcon, PencilIcon, PlusIcon, SendIcon, UploadIcon } from '../components/icons';
import { downloadBackup, importBackup } from '../lib/backup';
import { useCountUp, useOnline } from '../lib/hooks';
import { pluralize } from '../lib/format';
import { formatMoney, isStale, isToday, marginLight, saleStreak, toNum } from '../lib/money';
import { applyTheme, loadTheme, saveTheme, type Theme } from '../lib/theme';
import { APP_CHANNEL, APP_TAG, APP_VERSION } from '../lib/version';

type Side = 'buy' | 'sell';
type Panel = 'edit' | 'goods' | 'ops' | 'settings';

export function ProfileView({ onExport, onEdit }: { onExport: (item: Item) => void; onEdit: (item: Item) => void }) {
  const { profile, items, seed, favorites, txns, updateProfile, saveProfile, updateStatus, deleteItem, toggleFavorite, isFavorite, addTxn, deleteTxn, showToast } = useStore();
  const online = useOnline();
  const [side, setSide] = useState<Side>(() => (items.length ? 'sell' : 'buy'));
  const [open, setOpen] = useState<Panel | null>(null);
  const [addKind, setAddKind] = useState<TxnKind | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [theme, setThemeState] = useState<Theme>(() => loadTheme());

  function switchSide(next: Side) {
    setSide(next);
    setOpen(null);
  }

  function toggle(panel: Panel) {
    setOpen(current => (current === panel ? null : panel));
  }

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
      showToast('Загружено, обновляем');
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
      showToast('Шаблон скопирован — напишите нам');
    } catch {
      showToast('Напишите нам, что улучшить');
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
    const profit = (salesRevenue + manualIncome) - (salesCost + manualExpense);
    const soldToday = soldItems.filter(item => isToday(item.updatedAt));
    const todayMargin = soldToday.reduce((sum, item) => sum + (toNum(item.price) - toNum(item.costPrice)), 0);
    const inStock = items.filter(item => item.status !== 'sold').reduce((sum, item) => sum + toNum(item.costPrice), 0);
    const staleItems = items.filter(isStale);
    const sleeping = staleItems.reduce((sum, item) => sum + toNum(item.costPrice), 0);
    const streak = saleStreak(soldItems.map(item => item.updatedAt));
    const greenCount = items.filter(item => item.status !== 'sold' && marginLight(item.price, item.costPrice) === 'green').length;
    return { profit, todayMargin, todayCount: soldToday.length, inStock, sleeping, staleCount: staleItems.length, streak, greenCount };
  }, [items, txns]);

  const liveToday = useCountUp(money.todayMargin);
  const liveProfit = useCountUp(money.profit);
  const liveStock = useCountUp(money.inStock);

  const sold = items.filter(item => item.status === 'sold').length;
  const forSale = items.length - sold;

  // Одна живая фраза — продукт выбирает по приоритету. Не сводка, а голос.
  function sellPhrase() {
    if (money.sleeping > 0) return `${formatMoney(money.sleeping)} в товарах, которые долго не продаются (${money.staleCount}) — пересмотрите цену`;
    if (money.streak >= 2) return `Серия ${money.streak} ${pluralize(money.streak, 'день', 'дня', 'дней')} · сегодня ${money.todayCount} ${pluralize(money.todayCount, 'сделка', 'сделки', 'сделок')}`;
    if (money.todayCount > 0) return `Сегодня ${money.todayCount} · прибыль ${formatMoney(money.todayMargin)}`;
    if (forSale > 0) return `${forSale} в продаже — ожидайте покупателя или добавьте товар`;
    return 'Добавьте первый товар — это займёт минуту';
  }
  function buyPhrase() {
    if (favItems.length > 0) return `${favItems.length} ${pluralize(favItems.length, 'лот', 'лота', 'лотов')} в избранном`;
    return 'Добавляйте товары в избранное на Рынке';
  }

  function buy(item: Item) {
    const href = contactHref(item.contact);
    if (href) {
      window.open(href, '_blank', 'noopener');
      showToast('Открываю контакт продавца');
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
      showToast('Введите сумму');
      return;
    }
    addTxn(addKind, value, note);
    setAddKind(null);
    setAmount('');
    setNote('');
  }

  const settings = (
    <>
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
      <p className="export-note" style={{ textAlign: 'left' }}>Склад хранится в браузере. Сохраняйте копию — так вы не потеряете товары при очистке браузера и перенесёте их на другой телефон. Это рабочий файл приложения, открывать его не нужно — восстановить всё можно кнопкой «Загрузить».</p>

      <button type="button" className="ghost-btn wide" onClick={feedback}><SendIcon size={16} />Поделиться отзывом</button>
    </>
  );

  return (
    <section className="view profile-view breath">
      {/* ТЫ — лицо. Тап раскрывает правку. */}
      <button type="button" className={`you-card ${open === 'edit' ? 'is-open' : ''}`} onClick={() => toggle('edit')}>
        <div className="avatar">{(profile.name || 'Б').trim().charAt(0).toUpperCase()}</div>
        <div className="profile-id">
          <strong>{profile.name || 'Без имени'}</strong>
          <span className="you-meta">
            {profile.city || 'Город не указан'}
            <i className={`live-dot ${online ? 'on' : 'off'}`} aria-hidden="true" />
            {online ? 'в сети' : 'не в сети'}
          </span>
        </div>
        <span className="you-edit" aria-hidden="true"><PencilIcon size={15} /></span>
      </button>

      {open === 'edit' && (
        <div className="reveal">
          <div className="form-grid">
            <Field label="Имя или магазин" wide>
              <input value={profile.name} onChange={event => updateProfile({ name: event.target.value })} placeholder="Ваше имя или магазин" />
            </Field>
            <Field label="Город">
              <input value={profile.city} onChange={event => updateProfile({ city: event.target.value })} placeholder="Симферополь" />
            </Field>
            <Field label="Контакт">
              <input value={profile.contact} onChange={event => updateProfile({ contact: event.target.value })} placeholder="@username" />
            </Field>
          </div>
          <button type="button" className="solid-btn wide big" onClick={() => { saveProfile(); setOpen(null); }}>Сохранить</button>
        </div>
      )}

      <div className="segmented two" role="tablist" aria-label="Сторона">
        <span className="seg-indicator" style={{ transform: `translateX(${side === 'buy' ? 0 : 100}%)` }} aria-hidden="true" />
        <button type="button" role="tab" aria-selected={side === 'buy'} className={side === 'buy' ? 'active' : ''} onClick={() => switchSide('buy')}>Покупаю</button>
        <button type="button" role="tab" aria-selected={side === 'sell'} className={side === 'sell' ? 'active' : ''} onClick={() => switchSide('sell')}>Продаю</button>
      </div>

      {side === 'sell' ? (
        <>
          {/* ОДНО ЖИВОЕ ЧИСЛО */}
          <div className="hero-num">
            <span className="hero-label">Прибыль за сегодня</span>
            <strong className={`hero-big ${money.todayMargin > 0 ? 'pos' : ''}`}>{formatMoney(liveToday)}</strong>
            <span className="hero-sub">всего {formatMoney(liveProfit)} · в товаре {formatMoney(liveStock)}</span>
          </div>

          {/* ОДНА ЖИВАЯ ФРАЗА */}
          <p className="live-phrase">{sellPhrase()}</p>

          {/* Тихие двери — всё остальное в один тап */}
          <div className="door-row">
            <button type="button" className={`door grow ${open === 'goods' ? 'is-open' : ''}`} onClick={() => toggle('goods')}>
              <span>Мои товары</span>
              <i className="door-n">{items.length}</i>
              <ChevronIcon size={16} className="door-chev" />
            </button>
            <button type="button" className={`door ${open === 'ops' ? 'is-open' : ''}`} onClick={() => toggle('ops')}>
              <PlusIcon size={15} />операция
            </button>
            <button type="button" className={`door cog ${open === 'settings' ? 'is-open' : ''}`} onClick={() => toggle('settings')} aria-label="Настройки">
              <GearIcon size={18} />
            </button>
          </div>

          {open === 'ops' && (
            <div className="reveal">
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
            </div>
          )}

          {open === 'goods' && (
            <div className="reveal">
              {items.length ? (
                <>
                  <p className="section-label">в наличии {forSale} · продано {sold}</p>
                  <div className="own-cards">
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
                    </div>
                  </div>
                  <OwnItemsTable
                    items={items}
                    onStatusChange={updateStatus}
                    onEdit={onEdit}
                    onExport={onExport}
                    onDelete={deleteItem}
                  />
                </>
              ) : (
                <div className="empty-state">
                  <p>Склад пуст</p>
                  <small>Добавьте первый товар во вкладке «Создать» — это займёт минуту</small>
                </div>
              )}
            </div>
          )}

          {open === 'settings' && <div className="reveal">{settings}</div>}
        </>
      ) : (
        <>
          {/* ОДНО ЖИВОЕ ЧИСЛО — покупателю */}
          <div className="hero-num">
            <span className="hero-label">В избранном</span>
            <strong className="hero-big">{favItems.length}</strong>
            <span className="hero-sub">{favItems.length ? `${pluralize(favItems.length, 'лот', 'лота', 'лотов')} в избранном` : 'пока пусто'}</span>
          </div>

          <p className="live-phrase">{buyPhrase()}</p>

          <div className="door-row end">
            <button type="button" className={`door cog ${open === 'settings' ? 'is-open' : ''}`} onClick={() => toggle('settings')} aria-label="Настройки">
              <GearIcon size={18} />
            </button>
          </div>

          {open === 'settings' && <div className="reveal">{settings}</div>}

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
                <small>Добавляйте товары в избранное на Рынке</small>
              </div>
            )}
          </div>
        </>
      )}

      <div className="profile-foot">
        <span className="version-tag">БУ.шка · {APP_VERSION} · {APP_CHANNEL} · {APP_TAG}</span>
        <small>Данные хранятся локально на этом устройстве</small>
      </div>
    </section>
  );
}
