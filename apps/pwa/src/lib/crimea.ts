// Города Крыма — одна правда для поиска, распознавания объявлений и подсказок.
// БУ.шка — внутрикрымская площадка (слово Жени 19.11), поэтому города здесь свои, а не «вся Россия».
// Основа со звёздочкой ловит падежи («в Ялте», «из Керчи»), без звёздочки — только точное слово
// (короткие вроде «саки», иначе «сакура» стала бы городом).

type City = { name: string; forms: string[] };

const CITIES: City[] = [
  { name: 'Симферополь', forms: ['симферопол*', 'симф', 'симфе', 'симфа', 'симфер', 'симфик', 'симфи'] },
  { name: 'Севастополь', forms: ['севастопол*', 'севас', 'севасе', 'севаст', 'сева'] },
  { name: 'Ялта', forms: ['ялт*'] },
  { name: 'Керчь', forms: ['керч*'] },
  { name: 'Евпатория', forms: ['евпатор*', 'евпа'] },
  { name: 'Феодосия', forms: ['феодоси*', 'феодос*', 'федос*'] },
  { name: 'Джанкой', forms: ['джанко*'] },
  { name: 'Алушта', forms: ['алушт*'] },
  { name: 'Бахчисарай', forms: ['бахчисара*', 'бахчи'] },
  { name: 'Саки', forms: ['саки', 'саках', 'сак'] },
  { name: 'Судак', forms: ['судак*'] },
  { name: 'Армянск', forms: ['армянск*'] },
  { name: 'Красноперекопск', forms: ['красноперекопск*'] },
  { name: 'Белогорск', forms: ['белогорск*'] },
  { name: 'Щёлкино', forms: ['щелкин*'] },
  { name: 'Черноморское', forms: ['черноморск*'] },
  { name: 'Гвардейское', forms: ['гвардейск*'] },
  { name: 'Алупка', forms: ['алупк*'] },
  { name: 'Гурзуф', forms: ['гурзуф*'] },
  { name: 'Коктебель', forms: ['коктебел*'] },
  { name: 'Инкерман', forms: ['инкерман*'] },
  { name: 'Балаклава', forms: ['балаклав*'] },
  { name: 'Партенит', forms: ['партенит*'] },
  { name: 'Форос', forms: ['форос*'] }
];

export const CRIMEA_CITIES: string[] = CITIES.map(city => city.name);

const SHORT_NAMES = new Set(['ялта', 'ялте', 'ялты', 'ялту', 'саки', 'керч']);

function clean(word: string): string {
  return word.toLowerCase().replace(/ё/g, 'е').replace(/[^а-я]/g, '');
}

/** Одно слово → город Крыма или ''. «симфе» → Симферополь, «ялте» → Ялта. */
export function cityFromWord(raw: string): string {
  const word = clean(raw);
  if (word.length < 3) return '';
  for (const city of CITIES) {
    for (const form of city.forms) {
      if (form.endsWith('*')) {
        const base = form.slice(0, -1);
        if (word.startsWith(base) && word.length <= base.length + 3) return city.name;
      } else if (word === form) {
        return city.name;
      }
    }
  }
  return '';
}

/** Свободный текст (объявление, поле «город») → первый найденный город Крыма или ''. */
export function cityFromText(text: string): string {
  for (const word of String(text || '').split(/[^A-Za-zА-Яа-яЁё]+/)) {
    // В длинном тексте короткие разговорные формы опасны: «Сева» — это ещё и имя продавца.
    if (word.length < 5 && !SHORT_NAMES.has(clean(word))) continue;
    const city = cityFromWord(word);
    if (city) return city;
  }
  return '';
}

/** Город товара в едином написании: «г. Симф» и «симферополь» — один и тот же Симферополь. */
export function cityKey(value: string): string {
  return cityFromText(value) || String(value || '').trim();
}
