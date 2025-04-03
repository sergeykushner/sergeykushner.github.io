# Инструкция по работе с приватными данными

## Работа с файлом apps.json

1. Оригинальный файл с приватными данными находится в `src/data/apps.json`.
2. Публичная версия (без приватных ключей) находится в `data/apps-public.json`.
3. После изменения оригинального файла нужно запустить скрипт для обновления публичной версии:
   ```
   ./src/utils/update-public-json.sh
   ```

Приватные ключи, которые удаляются из публичной версии:
- saleDate
- salePrice
- listingFee
- successFee
- flippaLink
- salePriceComment

## Конфигурация Cloudinary

1. Файл с ключами доступа к Cloudinary находится в `src/.env`.
2. Для загрузки изображений в Cloudinary нужно:
   - Установить зависимости: `npm install cloudinary dotenv fs-extra`
   - Убедиться, что файл `.env` содержит корректные ключи
   - Запустить скрипт загрузки: `node src/js/cloudinary-upload.js`

## Загрузка скриншотов на Cloudinary

Для загрузки новых скриншотов для приложения через API:

1. Подготовьте скриншоты:
   - Поместите все скриншоты в отдельную папку на Mac
   - Для темной темы добавьте суффикс `-dark` в имена файлов

2. Установите зависимости (только один раз):
   ```bash
   ./src/python/install_dependencies.sh
   ```

3. Запустите скрипт:
   ```bash
   python3 src/python/cloudinary_upload_screenshots.py <app-id> <путь-к-скриншотам>
   ```
   
   Пример:
   ```bash
   python3 src/python/cloudinary_upload_screenshots.py time-capsule ~/Desktop/time-capsule-screenshots
   ```

4. После загрузки обновите массив `screenshots` в файле `src/data/apps.json` для вашего приложения
   с соответствующими номерами скриншотов, затем обновите публичную версию:
   ```bash
   ./src/utils/update-public-json.sh
   ```

## Структура публичных данных

Все HTML файлы находятся в директории `public/`.

Структура файлов JavaScript и CSS:
- `src/js/` - JavaScript файлы
- `src/css/` - CSS файлы
- `src/data/` - Данные (включая приватные)
- `public/data/` - Публичные данные

## Git

Файл `src/data/apps.json` добавлен в `.gitignore`, поэтому его изменения не будут отслеживаться в Git. При необходимости удалить файл из репозитория используйте команду:
```
git rm --cached src/data/apps.json
``` 