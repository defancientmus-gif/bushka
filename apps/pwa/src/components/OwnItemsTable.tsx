import type { Item, ItemStatus } from '../types';
import { statusLabels, statusOrder } from '../lib/labels';
import { daysOld, formatMoney, isStale, marginLight, toNum } from '../lib/money';
import { PencilIcon, SendIcon, TrashIcon } from './icons';

// Desktop CRM view of the seller's stock — dense, scannable, editable inline.
export function OwnItemsTable({
  items,
  onStatusChange,
  onEdit,
  onExport,
  onDelete
}: {
  items: Item[];
  onStatusChange: (id: string, status: ItemStatus) => void;
  onEdit: (item: Item) => void;
  onExport: (item: Item) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="own-table">
      <table>
        <thead>
          <tr>
            <th>Товар</th>
            <th>Состояние</th>
            <th>АКБ</th>
            <th className="t-num">Цена</th>
            <th className="t-num">Закупка</th>
            <th className="t-num">Маржа</th>
            <th>Статус</th>
            <th aria-label="Действия" />
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const hasCost = toNum(item.costPrice) > 0;
            const margin = toNum(item.price) - toNum(item.costPrice);
            const stale = isStale(item);
            return (
              <tr key={item.id} className={stale ? 'stale' : ''}>
                <td className="t-name">
                  <span className={`grade-badge g-${item.grade}`}>{item.grade}</span>
                  <span className="t-title">{item.title || 'Без названия'}</span>
                  {stale && <span className="stale-tag">висит {daysOld(item.createdAt)} дн</span>}
                </td>
                <td>{item.condition}</td>
                <td>{item.battery || '—'}</td>
                <td className="t-num">{item.price || 'договорная'}</td>
                <td className="t-num">{hasCost ? formatMoney(toNum(item.costPrice)) : '—'}</td>
                <td className={`t-num ${hasCost ? (margin >= 0 ? 'pos' : 'neg') : ''}`}>
                  {hasCost ? <><span className={`light-dot ${marginLight(item.price, item.costPrice)}`} aria-hidden="true" />{formatMoney(margin)}</> : '—'}
                </td>
                <td>
                  <span className="status-select">
                    <select value={item.status} onChange={event => onStatusChange(item.id, event.target.value as ItemStatus)} aria-label="Статус">
                      {statusOrder.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
                    </select>
                  </span>
                </td>
                <td className="t-actions">
                  <button type="button" className="icon-btn" onClick={() => onEdit(item)} aria-label="Изменить"><PencilIcon size={15} /></button>
                  <button type="button" className="icon-btn" onClick={() => onExport(item)} aria-label="Поделиться"><SendIcon size={15} /></button>
                  <button type="button" className="icon-btn danger" onClick={() => { if (window.confirm('Удалить товар?')) onDelete(item.id); }} aria-label="Удалить"><TrashIcon size={15} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
