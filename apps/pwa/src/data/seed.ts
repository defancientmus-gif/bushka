import type { Item, Profile } from '../types';

export const defaultProfile: Profile = {
  name: 'Вы',
  city: 'Симферополь',
  contact: '@seller',
  rating: 4.8,
  deals: 0
};

export const seedItems: Item[] = [
  {
    id: 'seed-macbook',
    title: 'MacBook Air M1 13',
    price: '54 000 ₽',
    category: 'Ноутбук',
    condition: 'Хорошее',
    grade: 'B',
    status: 'available',
    dealMode: 'free',
    description: '8/256, без скрытых дефектов, комплект, чистый аккаунт.',
    defects: 'Легкие следы на крышке',
    kit: 'Ноутбук, зарядка',
    battery: '89%',
    city: 'Симферополь',
    contact: '@anton',
    sourceUrl: '',
    sellerName: 'Антон',
    media: [],
    queueCount: 2,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'seed-iphone-lot',
    title: 'Лот iPhone под восстановление',
    price: '68 000 ₽',
    category: 'Смартфон',
    condition: 'Есть следы',
    grade: 'Repair',
    status: 'lot',
    dealMode: 'best-offer',
    description: '5 устройств разного состояния. Только опт, без розницы.',
    defects: 'Часть без Face ID, часть под замену батареи',
    kit: 'Только аппараты',
    battery: 'Разная',
    city: 'Симферополь',
    contact: '@ipro',
    sourceUrl: '',
    sellerName: 'IPRO opt',
    media: [],
    queueCount: 5,
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now() - 43200000
  }
];
