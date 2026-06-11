import type { Category, DealMode, ItemStatus } from '../types';

export const statusLabels: Record<ItemStatus, string> = {
  available: 'В наличии',
  reserved: 'Бронь',
  sold: 'Продано',
  exchange: 'Обмен',
  lot: 'Лот'
};

export const statusOrder: ItemStatus[] = ['available', 'reserved', 'sold', 'exchange', 'lot'];

export const dealModeLabels: Record<DealMode, string> = {
  free: 'Свободная',
  queue: 'Очередь',
  'best-offer': 'Торг'
};

export const dealModeOrder: DealMode[] = ['free', 'queue', 'best-offer'];

export const categoryGlyph: Record<Category, string> = {
  'Смартфон': 'phone',
  'Ноутбук': 'laptop',
  'Консоль': 'console',
  'Фото': 'camera',
  'Аудио': 'audio',
  'Комплектующие': 'chip',
  'Другое': 'box'
};
