import type { Category, Item } from '../types';
import type { Profile } from '../types';

export const defaultProfile: Profile = {
  name: 'Вы',
  city: 'Симферополь',
  contact: '@seller',
  rating: 4.8,
  deals: 0
};

const HOUR = 3600000;

function lot(
  partial: Partial<Item> & {
    id: string;
    title: string;
    price: string;
    category: Category;
    sellerName: string;
    contact: string;
    city: string;
  }
): Item {
  return {
    condition: 'Хорошее',
    grade: 'B',
    status: 'available',
    dealMode: 'free',
    description: '',
    defects: '',
    kit: '',
    battery: '',
    sourceUrl: '',
    media: [],
    queueCount: 0,
    delivery: ['pickup', 'meet'],
    sellerRating: 4.7,
    createdAt: Date.now() - HOUR,
    updatedAt: Date.now() - HOUR,
    ...partial
  } as Item;
}

// A generous mock "market" — the couch-shopping feed. Real cross-user data
// will come from the backend later; the shape already matches.
export const seedItems: Item[] = [
  lot({
    id: 'seed-iphone13',
    title: 'iPhone 13 128 синий',
    price: '38 000 ₽',
    category: 'Смартфон',
    condition: 'Хорошее',
    grade: 'B',
    description: 'Чистый аккаунт, без блокировок. Менялся экран в сервисе.',
    battery: '87%',
    kit: 'Коробка, кабель',
    defects: 'Микроцарапины на рамке',
    city: 'Симферополь',
    sellerName: 'Антон',
    contact: '@anton',
    sellerRating: 4.9,
    delivery: ['pickup', 'meet'],
    queueCount: 3
  }),
  lot({
    id: 'seed-macbook',
    title: 'MacBook Air M1 13',
    price: '54 000 ₽',
    category: 'Ноутбук',
    description: '8/256, без скрытых дефектов, циклы 120. Чистый аккаунт.',
    battery: '92%',
    kit: 'Ноутбук, зарядка',
    defects: 'Лёгкие следы на крышке',
    city: 'Краснодар',
    sellerName: 'Reseller_KRD',
    contact: '@krd_tech',
    sellerRating: 4.8,
    delivery: ['delivery', 'pickup'],
    queueCount: 2
  }),
  lot({
    id: 'seed-ps5',
    title: 'PlayStation 5 Slim',
    price: '46 000 ₽',
    category: 'Консоль',
    condition: 'Идеальное',
    grade: 'A',
    description: 'Дисковая, на гарантии до осени. Один геймпад.',
    kit: 'Коробка, геймпад, провода',
    city: 'Москва',
    sellerName: 'GameHub',
    contact: '@gamehub_msk',
    sellerRating: 5,
    delivery: ['delivery', 'pickup', 'meet'],
    queueCount: 6
  }),
  lot({
    id: 'seed-airpods',
    title: 'AirPods Pro 2 USB-C',
    price: '12 500 ₽',
    category: 'Аудио',
    condition: 'Идеальное',
    grade: 'A',
    description: 'Полный комплект, оригинал, проверка по серийнику.',
    kit: 'Полный комплект',
    city: 'Симферополь',
    sellerName: 'Марина',
    contact: '@marina_audio',
    sellerRating: 4.6,
    delivery: ['meet'],
    queueCount: 1
  }),
  lot({
    id: 'seed-camera',
    title: 'Sony A6400 kit 16-50',
    price: '61 000 ₽',
    category: 'Фото',
    description: 'Пробег 12к кадров, матрица чистая. Идеал для блога.',
    kit: 'Тушка, объектив, 2 АКБ',
    defects: 'Потёртость на хвате',
    city: 'Санкт-Петербург',
    sellerName: 'Foto_Den',
    contact: '@foto_den',
    sellerRating: 4.9,
    delivery: ['delivery', 'meet'],
    queueCount: 4
  }),
  lot({
    id: 'seed-rtx',
    title: 'Видеокарта RTX 3070',
    price: '29 000 ₽',
    category: 'Комплектующие',
    description: 'Не майнила, из домашней сборки. Тесты при встрече.',
    kit: 'Карта, коробка',
    city: 'Казань',
    sellerName: 'PC_Master',
    contact: '@pc_master_kzn',
    sellerRating: 4.7,
    delivery: ['pickup', 'meet'],
    queueCount: 2
  }),
  lot({
    id: 'seed-samsung',
    title: 'Samsung S23 256',
    price: '41 000 ₽',
    category: 'Смартфон',
    condition: 'Хорошее',
    grade: 'B',
    description: 'Зелёный, ёмкость АКБ в норме. Снят с эксплуатации.',
    battery: '94%',
    kit: 'Коробка, кабель',
    city: 'Сочи',
    sellerName: 'Гор',
    contact: '@gor_sochi',
    sellerRating: 4.5,
    delivery: ['delivery', 'pickup'],
    queueCount: 2
  }),
  lot({
    id: 'seed-thinkpad',
    title: 'ThinkPad X1 Carbon',
    price: '47 000 ₽',
    category: 'Ноутбук',
    description: 'i7/16/512, рабочая лошадка. Батарея держит 6 часов.',
    battery: '88%',
    kit: 'Ноутбук, зарядка',
    defects: 'Стёрта пара клавиш',
    city: 'Екатеринбург',
    sellerName: 'IT_Skupka',
    contact: '@it_skupka',
    sellerRating: 4.8,
    delivery: ['delivery'],
    queueCount: 1
  }),
  lot({
    id: 'seed-switch',
    title: 'Nintendo Switch OLED',
    price: '21 000 ₽',
    category: 'Консоль',
    condition: 'Хорошее',
    grade: 'A',
    description: 'Прошитая, набор игр на карте 128 Гб в подарок.',
    kit: 'Док, джойконы, карта',
    city: 'Москва',
    sellerName: 'RetroPlay',
    contact: '@retroplay',
    sellerRating: 4.7,
    delivery: ['delivery', 'meet'],
    queueCount: 3
  }),
  lot({
    id: 'seed-ipad',
    title: 'iPad Air 4 64',
    price: '27 000 ₽',
    category: 'Смартфон',
    condition: 'Хорошее',
    grade: 'B',
    description: 'Голубой, без вмятин. Подойдёт под учёбу и рисование.',
    kit: 'Планшет, кабель',
    defects: 'Скол на углу стекла',
    city: 'Симферополь',
    sellerName: 'Лена',
    contact: '@lena_sale',
    sellerRating: 4.4,
    delivery: ['meet'],
    queueCount: 0
  }),
  lot({
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
    sellerName: 'IPRO opt',
    contact: '@ipro',
    sellerRating: 4.6,
    delivery: ['delivery', 'pickup'],
    queueCount: 5
  }),
  lot({
    id: 'seed-marshall',
    title: 'Колонка Marshall Emberton',
    price: '8 900 ₽',
    category: 'Аудио',
    condition: 'Хорошее',
    grade: 'B',
    description: 'Звук без нареканий, держит заряд весь день.',
    kit: 'Колонка, кабель',
    city: 'Краснодар',
    sellerName: 'Звук24',
    contact: '@zvuk24',
    sellerRating: 4.8,
    delivery: ['delivery', 'pickup', 'meet'],
    queueCount: 1
  })
];
