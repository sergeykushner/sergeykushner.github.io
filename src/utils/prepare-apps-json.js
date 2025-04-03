// Скрипт для создания публичной версии apps.json без приватных данных
const fs = require('fs');
const path = require('path');

// Пути к файлам
const sourceFilePath = path.join(__dirname, '../data/apps.json');
const targetFilePath = path.join(__dirname, '../../public/data/apps-public.json');
const rootTargetFilePath = path.join(__dirname, '../../data/apps-public.json');

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
  
  // Создаем корневую директорию data, если ее нет
  const rootTargetDir = path.dirname(rootTargetFilePath);
  if (!fs.existsSync(rootTargetDir)) {
    fs.mkdirSync(rootTargetDir, { recursive: true });
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
  
  // Также копируем в корневую директорию data
  fs.writeFileSync(rootTargetFilePath, jsonData, 'utf8');
  
  console.log(`Публичная версия успешно создана: ${targetFilePath}`);
  console.log(`Копия сохранена в: ${rootTargetFilePath}`);
} catch (error) {
  console.error('Произошла ошибка:', error);
} 