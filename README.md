# Интеграция с Cloudinary

Этот проект использует Cloudinary для хранения и доставки изображений вместо локальных файлов.

## Настройка Cloudinary

1. Зарегистрируйтесь на [Cloudinary](https://cloudinary.com/) и создайте аккаунт
2. Получите ваше cloud name из Dashboard
3. Обновите файл `cloudinary.js`, заменив значение `CLOUDINARY_CLOUD_NAME` на ваше cloud name:

```javascript
const CLOUDINARY_CLOUD_NAME = 'your-cloud-name'; // Замените на ваше имя облака
```

## Структура файлов на Cloudinary

Для правильной работы сайта, загрузите ваши изображения на Cloudinary со следующей структурой:

```
/apps/{appId}/app-icon.png
/apps/{appId}/app-icon-dark.png (опционально для темного режима)
/apps/{appId}/app-screen-1.png
/apps/{appId}/app-screen-1-dark.png (опционально для темного режима)
/apps/{appId}/app-screen-2.png
/apps/{appId}/app-screen-2-dark.png (опционально для темного режима)
/apps/{appId}/app-screen-3.png
/apps/{appId}/app-screen-3-dark.png (опционально для темного режима)
/apps/{appId}/share.jpg

/badges/download-on-the-app-store-badge-black.svg
/badges/download-on-the-app-store-badge-white.svg
```

## Загрузка файлов на Cloudinary

Вы можете загрузить файлы на Cloudinary через:
- Веб-интерфейс Cloudinary
- Cloudinary API
- Cloudinary CLI

### Пример загрузки через API

```javascript
const cloudinary = require('cloudinary').v2;

// Конфигурация
cloudinary.config({
  cloud_name: 'your-cloud-name',
  api_key: 'your-api-key',
  api_secret: 'your-api-secret'
});

// Загрузка изображения
cloudinary.uploader.upload('path/to/local/image.png', 
  { folder: 'apps/your-app-id' }, 
  function(error, result) { console.log(result); });
``` 