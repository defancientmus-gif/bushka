# Roadmap

## Stage 0: Prototype

- HTML/PWA-прототип.
- Локальное хранение.
- Импорт текста, Telegram, Avito fallback.
- Фото и превью.
- ЛК.

Статус: сохранено в `apps/prototype`.

## Stage 1: Mobile PWA MVP

- React + TypeScript + Vite.
- Mobile-first интерфейс.
- Склад продавца.
- Статусы товара.
- Репост-тексты для Telegram и Avito.
- Локальное хранение.
- Адаптивная десктоп-раскладка.

Статус: в работе в `apps/pwa`.

## Stage 2: Backend

- Supabase Auth.
- Таблицы: users, profiles, items, media, leads, reservations, reviews.
- Фото в Supabase Storage.
- Публичные витрины продавцов.

## Stage 3: Telegram

- Бот для публикации в канал/чат.
- Импорт из публичных Telegram-постов.
- Статусные обновления: бронь/продано.
- Deep-link из поста в карточку БУ.шки.

## Stage 4: Trust

- Сделки.
- Очередь.
- Бронь с таймером.
- Жалобы и споры.
- Рейтинг без продажи звезд.

## Stage 5: Avito

- Подготовка объявления.
- Хранение Avito-ссылки.
- Импорт через fallback.
- Скрин -> OCR/AI.
- Для проф. продавцов: XML/feed/API, если доступно.

## Stage 6: Reseller Tools

- Лоты.
- Массовая загрузка.
- Закупочная цена и маржа в приватных полях.
- Экспорт склада.
- Подписки на нужные товары.
