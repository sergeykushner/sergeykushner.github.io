/**
 * Скрипт для загрузки ассетов приложений на Cloudinary
 * Для запуска:
 * 1. Установите необходимые зависимости: npm install cloudinary dotenv fs-extra
 * 2. Создайте файл .env с вашими учетными данными Cloudinary
 * 3. Запустите скрипт: node cloudinary-upload.js
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs-extra');
const path = require('path');

// Конфигурация Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Путь к директории с ассетами
const assetsDir = path.join(__dirname, 'assets');

// Функция для загрузки одного файла
async function uploadFile(filePath, cloudinaryPath) {
  console.log(`Загрузка ${filePath} на Cloudinary как ${cloudinaryPath}...`);
  
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: cloudinaryPath,
      overwrite: true
    });
    console.log(`Успешно загружено: ${result.secure_url}`);
    return result;
  } catch (error) {
    console.error(`Ошибка при загрузке ${filePath}:`, error);
    return null;
  }
}

// Функция для загрузки всех бейджей
async function uploadBadges() {
  const badgesDir = path.join(assetsDir, 'badges');
  const badges = await fs.readdir(badgesDir);
  
  for (const badge of badges) {
    if (badge === '.DS_Store') continue; // Пропускаем системные файлы

    const filePath = path.join(badgesDir, badge);
    const stat = await fs.stat(filePath);
    
    if (stat.isFile()) {
      const fileName = path.parse(badge).name;
      await uploadFile(filePath, `badges/${fileName}`);
    }
  }
}

// Функция для загрузки ассетов для приложения
async function uploadAppAssets(appId) {
  const appDir = path.join(assetsDir, 'apps', appId);
  
  if (!await fs.exists(appDir)) {
    console.log(`Директория для приложения ${appId} не найдена`);
    return;
  }
  
  const files = await fs.readdir(appDir);
  
  for (const file of files) {
    if (file === '.DS_Store') continue; // Пропускаем системные файлы

    const filePath = path.join(appDir, file);
    const stat = await fs.stat(filePath);
    
    if (stat.isFile()) {
      const fileName = path.parse(file).name;
      await uploadFile(filePath, `apps/${appId}/${fileName}`);
    }
  }
}

// Основная функция для загрузки выбранных ассетов
async function uploadSelectedAssets() {
  try {
    // Загрузка всех бейджей
    console.log("Загружаем бейджи...");
    await uploadBadges();
    
    // Загрузка ассетов для habit-tracker
    console.log("Загружаем ассеты для habit-tracker...");
    await uploadAppAssets('habit-tracker');
    
    console.log('Загрузка выбранных ассетов успешно завершена!');
  } catch (error) {
    console.error('Ошибка при загрузке ассетов:', error);
  }
}

// Вызов основной функции
uploadSelectedAssets(); 