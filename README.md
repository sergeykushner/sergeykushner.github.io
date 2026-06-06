# Website

## Node Package Manager

Этот сайт использует `npm` для установки зависимостей и запуска команд.

1. Открыть терминал в корне проекта.
2. Выполнить `npm install`, чтобы установить все зависимости.
3. Запускать нужные команды через `npm run`, например `npm run admin`.

```bash
    node js/admin.js
```

## Административный скрипт

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

## Symlinks

- `apps-metadata.json` не хранится в git и локально является симлинком на `apps-metadata.json` в iCloud Documents
- `assets` не хранится в git и локально является симлинком на `assets` в iCloud Drive

## Legacy

- `pages/app.html`, `pages/apps.html` и `pages/app-privacy.html` - старые входы, которые оставлены для совместимости со старыми URL
