# Deployment

## Зачем GitHub

Полноценную PWA надо проверять по HTTPS. Локально можно открыть приложение с телефона по Wi-Fi, но установка, service worker и нормальное поведение "как приложение" надежнее проверяются на публичном HTTPS-адресе.

GitHub Pages подходит для первого этапа:

- бесплатно;
- дает HTTPS;
- автоматически деплоит после push;
- не требует backend на MVP-этапе.

## Что уже подготовлено

- Vite собирает PWA с относительными путями.
- Manifest использует относительный `start_url` и `scope`.
- Service worker работает не только в корне домена, но и в GitHub Pages path.
- Workflow `.github/workflows/pages.yml` собирает `apps/pwa` и публикует `apps/pwa/dist`.

## Первый деплой

1. Создать пустой GitHub-репозиторий, например `bushka`.
2. Подключить remote:

```bash
git remote add origin https://github.com/USERNAME/bushka.git
```

3. Закоммитить и отправить:

```bash
git add .
git commit -m "Initialize Bushka PWA"
git push -u origin main
```

4. На GitHub открыть:

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

5. Дождаться workflow `Deploy PWA`.

После деплоя приложение будет доступно примерно по адресу:

```text
https://USERNAME.github.io/bushka/
```

## Установка на iPhone

1. Открыть URL в Safari.
2. Нажать "Поделиться".
3. Выбрать "На экран Домой".
4. Открывать БУ.шку как обычное приложение.

## Важное ограничение

GitHub Pages подходит только для frontend. Для аккаунтов, фото, рейтингов, сделок и публичных витрин позже нужен backend. Оптимальный следующий слой: Supabase.
