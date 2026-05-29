# Website instructions

## Административный скрипт

1. Установите зависимости:
   ```bash
   npm install readline-sync cloudinary dotenv fs-extra child_process
   ```

2. Запустите скрипт:
   ```bash
   node js/admin.js
   ```

## apps-metadata.json и iCloud symlink

- `apps-metadata.json` используется как симлинк на оригинальный файл в iCloud Documents.
- Локально в проекте симлинк должен указывать на исходный JSON в iCloud, чтобы сайт и утилиты работали с одним источником данных.
- Создание симлинка:
```bash
cd ~/Developer/sergeykushner.github.io/data
ln -s /Users/sergeykushner/Documents/apps-metadata.json apps-metadata.json
```

## assets и iCloud symlink

- `assets` не хранится в git и локально является симлинком на iCloud Drive:
  `/Users/sergeykushner/Library/Mobile Documents/com~apple~CloudDocs/Developer/website/assets`.
- Если симлинк нужно восстановить:
```bash
cd ~/Developer/sergeykushner.github.io
ln -s "/Users/sergeykushner/Library/Mobile Documents/com~apple~CloudDocs/Developer/website/assets" assets
```
