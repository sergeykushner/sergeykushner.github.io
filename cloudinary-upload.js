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

// Корневая папка в Cloudinary для всех файлов сайта
const CLOUDINARY_ROOT_FOLDER = 'website';

// Функция для создания папки в Cloudinary
async function createFolder(folderPath) {
  console.log(`Создание папки ${folderPath} в Cloudinary...`);
  try {
    const result = await cloudinary.api.create_folder(folderPath);
    console.log(`Папка ${folderPath} создана успешно`);
    return result;
  } catch (error) {
    // Если папка уже существует, это не ошибка
    if (error.error && error.error.message === 'Folder already exists') {
      console.log(`Папка ${folderPath} уже существует`);
      return { success: true };
    }
    console.error(`Ошибка при создании папки ${folderPath}:`, error);
    return null;
  }
}

// Создаем все необходимые папки перед загрузкой
async function createFolders() {
  // Создаем корневую папку
  await createFolder(CLOUDINARY_ROOT_FOLDER);
  
  // Создаем подпапки
  await createFolder(`${CLOUDINARY_ROOT_FOLDER}/badges`);
  await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps`);
  await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps/habit-tracker`);
}

// Функция для удаления всех файлов из папки в Cloudinary
async function clearFolder(folderPath) {
  console.log(`Очистка папки ${folderPath} в Cloudinary...`);
  try {
    // Получаем список всех файлов в папке
    const result = await cloudinary.api.resources({ 
      type: 'upload',
      prefix: `${folderPath}/`,
      max_results: 500
    });
    
    if (result.resources && result.resources.length > 0) {
      console.log(`Найдено ${result.resources.length} файлов для удаления`);
      
      // Удаляем каждый файл
      for (const resource of result.resources) {
        const publicId = resource.public_id;
        console.log(`Удаление файла: ${publicId}`);
        await cloudinary.uploader.destroy(publicId);
      }
      
      console.log(`Все файлы в папке ${folderPath} удалены`);
    } else {
      console.log(`Папка ${folderPath} пуста или не существует`);
    }
    
    return true;
  } catch (error) {
    console.error(`Ошибка при очистке папки ${folderPath}:`, error);
    return false;
  }
}

// Очистка всех папок перед загрузкой
async function clearAllFolders() {
  // Очищаем папки в обратном порядке (от самых вложенных к корневым)
  await clearFolder(`${CLOUDINARY_ROOT_FOLDER}/apps/habit-tracker`);
  await clearFolder(`${CLOUDINARY_ROOT_FOLDER}/apps`);
  await clearFolder(`${CLOUDINARY_ROOT_FOLDER}/badges`);
  await clearFolder(CLOUDINARY_ROOT_FOLDER);
}

// Функция для загрузки одного файла
async function uploadFile(filePath, cloudinaryPath) {
  // Разделяем путь на папку и имя файла
  const lastSlashIndex = cloudinaryPath.lastIndexOf('/');
  const folder = lastSlashIndex !== -1 
    ? `${CLOUDINARY_ROOT_FOLDER}/${cloudinaryPath.substring(0, lastSlashIndex)}` 
    : CLOUDINARY_ROOT_FOLDER;
  const fileName = lastSlashIndex !== -1 
    ? cloudinaryPath.substring(lastSlashIndex + 1) 
    : cloudinaryPath;
  
  console.log(`Загрузка ${filePath} на Cloudinary в папку ${folder} с именем ${fileName}...`);
  
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      public_id: fileName,
      overwrite: true,
      use_filename: false,
      unique_filename: false
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
    // Очищаем существующие файлы
    console.log("Очищаем существующие файлы...");
    await clearAllFolders();
    
    // Создаем папки в Cloudinary
    console.log("Создаем папки в Cloudinary...");
    await createFolders();
    
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