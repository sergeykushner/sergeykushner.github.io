# Website

## Node Package Manager

Этот сайт использует `npm` для установки зависимостей и запуска команд.

1. Открыть терминал в корне проекта.
2. Выполнить `npm install`, чтобы установить все зависимости.
3. Запускать нужные команды через `npm run`, например `npm run admin`.

## Локальный запуск сайта

В терминале из корня проекта выполните:

```bash
python3 -m http.server 8000
```

Откройте сайт по адресу [http://localhost:8000](http://localhost:8000). Например, каталог приложений доступен по адресу [http://localhost:8000/apps.html](http://localhost:8000/apps.html).

Чтобы остановить сервер, вернитесь в терминал, где он запущен, и нажмите `Ctrl+C`.

## Административный скрипт

```bash
    node js/admin.js
```

Скрипт умеет:
- запускать локальный сервер;
- обновлять публичный JSON;
- обновлять `sitemap.xml`;
- загружать приложения в Cloudinary;
- загружать одно изображение для приложения;
- загружать бейджи;
- загружать рамки устройств;
- инвалидировать кэш в Cloudinary;
- обновлять версию ассетов;
- проверять CSS;
- автоматически сортировать CSS с помощью `stylelint` (`.stylelintrc.json`, `package.json`).

## Apps Metadata

`Tools/apps_metadata.py` - скрипт для точечной работы с одной app-записью в приватном `data/apps-metadata.json` по `bundleId` текущего Xcode-проекта.

## Symlinks

- `apps-metadata.json` не хранится в git и локально является симлинком на `/Users/sergeykushner/Library/Mobile Documents/com~apple~CloudDocs/Developer/sergeykushner.github.io/data/apps-metadata.json`
- `.env` не хранится в git и локально является симлинком на `/Users/sergeykushner/Library/Mobile Documents/com~apple~CloudDocs/Developer/sergeykushner.github.io/.env`
- `assets` не хранится в git и локально является симлинком на `/Users/sergeykushner/Library/Mobile Documents/com~apple~CloudDocs/Developer/sergeykushner.github.io/assets`
