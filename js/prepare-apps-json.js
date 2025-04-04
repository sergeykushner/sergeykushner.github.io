// Скрипт для создания публичной версии apps.json без приватных данных
const fs = require('fs');
const path = require('path');

// Пути к файлам
const sourceFilePath = path.join(__dirname, '../apps.json');
const targetFilePath = path.join(__dirname, '../apps-public.json');

// Ключи, которые нужно удалить из публичной версии
const keysToRemove = [
  'saleDate',
  'salePrice',
  'listingFee',
  'successFee',
  'flippaLink',
  'salePriceComment',
  'gitHubLink'
];

try {
  // Создаем директорию, если ее нет
  const targetDir = path.dirname(targetFilePath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Читаем исходный файл
  const appsData = JSON.parse(fs.readFileSync(sourceFilePath, 'utf8'));
  
  // Создаем копию без приватных ключей
  const cleanedApps = appsData.map(app => {
    const cleanApp = { ...app };
    
    keysToRemove.forEach(key => {
      if (key in cleanApp) {
        delete cleanApp[key];
      }
    });
    
    return cleanApp;
  });
  
  // Записываем в новый файл
  const jsonData = JSON.stringify(cleanedApps, null, 4);
  fs.writeFileSync(targetFilePath, jsonData, 'utf8');
  
  console.log(`Публичная версия успешно создана: ${targetFilePath}`);
} catch (error) {
  console.error('Произошла ошибка:', error);
} 