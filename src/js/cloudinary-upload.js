/**
 * Скрипт для загрузки ассетов приложений на Cloudinary
 * Для запуска:
 * 1. Установите необходимые зависимости: npm install cloudinary dotenv fs-extra
 * 2. Создайте файл .env с вашими учетными данными Cloudinary
 * 3. Запустите скрипт: node src/js/cloudinary-upload.js
 */

const fs = require('fs-extra');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../src/.env') });
const cloudinary = require('cloudinary').v2;

// Конфигурация Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Путь к директории с ассетами
const assetsDir = path.join(__dirname, '../../assets');

// Корневая папка в Cloudinary для всех файлов сайта
const CLOUDINARY_ROOT_FOLDER = 'website';

// Массив уже загруженных приложений (чтобы не загружать их снова)
const UPLOADED_APPS = [
  'habit-tracker',
  'pokemon-go-guide',
  'fit-advisor',
  'garden-crash',
  'girls-sp',
  'gym-assistant',
  'icecream-sp',
  'in-love',
  'lucky-diamonds',
  'margin-trading-calculator',
  'memes-sp',
  'movie-watchlist',
  'next-show',
  'nft-creator',
  'onion-sp',
  'open-sea-wallet-portfolio',
  'party-star',
  'pdf-resume-creator',
  'pears-sp',
  'period-tracker',
  'poker-1',
  'poker-2',
  'poker-dealer',
  'pomodoro-timer',
  'post-creator',
  'quit-smoking',
  'run-sunta',
  'santa-sp',
  'strawberry-sp',
  'strike-balls',
  'strikemoji',
  'template',
  'tetra-blocks-tower',
  'time-capsule',
  'truth-or-dare',
  'voice-advisor',
  'water-balance',
  'word-game-catch-letter',
  'word-game-woords',
  'xmas-abc-sp'
];

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
  
  // Создаем папку для приложения
  await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps/${appId}`);
  
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

// Функция загрузки всех приложений
async function uploadAllApps() {
  // Получаем список всех папок в директории apps
  const appsDir = path.join(assetsDir, 'apps');
  const appFolders = await fs.readdir(appsDir);
  
  // Фильтруем папки приложений (исключаем .DS_Store и уже загруженные)
  const appsToUpload = appFolders.filter(folder => {
    if (folder === '.DS_Store') return false;
    if (UPLOADED_APPS.includes(folder)) return false;
    
    // Проверяем, что это директория
    const folderPath = path.join(appsDir, folder);
    return fs.statSync(folderPath).isDirectory();
  });
  
  console.log(`Найдено ${appsToUpload.length} новых приложений для загрузки`);
  
  // Загружаем каждое приложение
  for (const appFolder of appsToUpload) {
    console.log(`\nЗагружаем ассеты для ${appFolder}...`);
    await uploadAppAssets(appFolder);
  }
}

// Основная функция для загрузки оставшихся ассетов
async function uploadRemainingAssets() {
  try {
    // Создаем корневые папки в Cloudinary
    console.log("Создаем корневые папки в Cloudinary...");
    await createFolder(CLOUDINARY_ROOT_FOLDER);
    await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps`);
    
    // Загружаем все приложения
    console.log("Загружаем оставшиеся приложения...");
    await uploadAllApps();
    
    console.log('Загрузка оставшихся ассетов успешно завершена!');
  } catch (error) {
    console.error('Ошибка при загрузке ассетов:', error);
  }
}

// Вызов основной функции
uploadRemainingAssets(); 