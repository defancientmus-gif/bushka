export type ItemStatus = 'available' | 'reserved' | 'sold' | 'exchange' | 'lot';

export type DealMode = 'free' | 'queue' | 'best-offer';

export type Condition = 'Идеальное' | 'Хорошее' | 'Есть следы' | 'На запчасти';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'Repair';

export type Category = 'Смартфон' | 'Ноутбук' | 'Консоль' | 'Фото' | 'Аудио' | 'Комплектующие' | 'Другое';

export type DeliveryKind = 'delivery' | 'pickup' | 'meet';

export type MediaAsset = {
  id: string;
  kind: 'image' | 'video';
  src: string;
  /** Для kind==='video' — кадры немой петли (как ТГ-гифка). src = первый кадр (постер). */
  frames?: string[];
  name?: string;
};

export type Item = {
  id: string;
  title: string;
  price: string;
  costPrice?: string;
  category: Category;
  condition: Condition;
  grade: Grade;
  status: ItemStatus;
  dealMode: DealMode;
  description: string;
  defects: string;
  kit: string;
  battery: string;
  city: string;
  contact: string;
  sourceUrl: string;
  sellerName: string;
  media: MediaAsset[];
  queueCount: number;
  delivery?: DeliveryKind[];
  sellerRating?: number;
  reservedUntil?: string;
  createdAt: number;
  updatedAt: number;
};

export type Profile = {
  name: string;
  city: string;
  contact: string;
  rating: number;
  deals: number;
};

export type DraftItem = Omit<Item, 'id' | 'sellerName' | 'queueCount' | 'createdAt' | 'updatedAt'>;

export type View = 'market' | 'create' | 'profile';

export type TxnKind = 'income' | 'expense';

export type Txn = {
  id: string;
  kind: TxnKind;
  amount: number;
  note: string;
  createdAt: number;
};
