/**
 * Скрипт для загрузки скриншотов конкретного приложения на Cloudinary
 * Для запуска:
 * 1. Установите необходимые зависимости: npm install cloudinary dotenv fs-extra readline-sync
 * 2. Проверьте, что файл .env содержит ваши учетные данные Cloudinary
 * 3. Запустите скрипт: 
 *    - Интерактивно: node js/cloudinary-upload-screenshots.js
 *    - С аргументами: node js/cloudinary-upload-screenshots.js <app-id> <path-to-screenshots>
 * 
 * Пример: node js/cloudinary-upload-screenshots.js time-capsule ~/Desktop/time-capsule-screenshots
 */

const fs = require('fs-extra');
const path = require('path');
const readlineSync = require('readline-sync');
require('dotenv').config({ path: path.join(__dirname, '../src/.env') });
const cloudinary = require('cloudinary').v2;

// Функция для получения ввода пользователя или использования аргументов командной строки
function getInputOrArgs() {
    // Получаем аргументы командной строки
    const args = process.argv.slice(2);
    
    // Если предоставлены оба аргумента, используем их
    if (args.length >= 2) {
        const appId = args[0];
        let screenshotsPath = args[1];
        
        // Удаляем кавычки, если пользователь их добавил
        screenshotsPath = screenshotsPath.trim().replace(/^["']|["']$/g, '');
        
        // Расширяем тильду в пути, если она есть (для macOS/Linux)
        if (screenshotsPath.startsWith('~')) {
            screenshotsPath = path.join(process.env.HOME, screenshotsPath.slice(1));
        }
        
        console.log(`\nИспользуются аргументы командной строки`);
        console.log(`Приложение: ${appId}`);
        console.log(`Путь к скриншотам: ${screenshotsPath}\n`);
        
        return { appId, screenshotsPath };
    }
    
    // Иначе запрашиваем у пользователя
    console.log('Загрузка скриншотов на Cloudinary');
    console.log('=================================');
    
    const appId = readlineSync.question('Введите ID приложения (например, time-capsule): ');
    let screenshotsPath = readlineSync.question('Введите путь к папке со скриншотами: ');
    
    // Удаляем кавычки, если пользователь их добавил
    screenshotsPath = screenshotsPath.trim().replace(/^["']|["']$/g, '');
    
    // Проверяем наличие обязательных параметров
    if (!appId) {
        console.error('Ошибка: ID приложения не может быть пустым');
        process.exit(1);
    }
    
    if (!screenshotsPath) {
        console.error('Ошибка: Путь к папке со скриншотами не может быть пустым');
        process.exit(1);
    }
    
    // Расширяем тильду в пути, если она есть (для macOS/Linux)
    if (screenshotsPath.startsWith('~')) {
        screenshotsPath = path.join(process.env.HOME, screenshotsPath.slice(1));
    }
    
    return { appId, screenshotsPath };
}

// Конфигурация Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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

// Функция для загрузки всех скриншотов приложения
async function uploadAppScreenshots(appId, screenshotsPath) {
  try {
    // Создаем папку для приложения, если она еще не существует
    await createFolder(CLOUDINARY_ROOT_FOLDER);
    await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps`);
    await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps/${appId}`);
    
    // Получаем список файлов в директории
    const files = await fs.readdir(screenshotsPath);
    
    // Фильтруем только изображения
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });
    
    console.log(`Найдено ${imageFiles.length} изображений для загрузки`);
    
    // Сортируем файлы по имени
    imageFiles.sort();
    
    // Отделяем обычные скриншоты от темных
    const regularScreenshots = [];
    const darkScreenshots = [];
    
    for (const file of imageFiles) {
      if (file.toLowerCase().includes('dark')) {
        darkScreenshots.push(file);
      } else {
        regularScreenshots.push(file);
      }
    }
    
    // Загружаем каждый обычный скриншот
    for (let i = 0; i < regularScreenshots.length; i++) {
      const file = regularScreenshots[i];
      const filePath = path.join(screenshotsPath, file);
      const screenNumber = i + 1;
      const cloudinaryFileName = `app-screen-${screenNumber}`;
      
      await uploadFile(filePath, `apps/${appId}/${cloudinaryFileName}`);
    }
    
    // Загружаем каждый темный скриншот
    for (let i = 0; i < darkScreenshots.length; i++) {
      const file = darkScreenshots[i];
      const filePath = path.join(screenshotsPath, file);
      const screenNumber = i + 1;
      const cloudinaryFileName = `app-screen-${screenNumber}-dark`;
      
      await uploadFile(filePath, `apps/${appId}/${cloudinaryFileName}`);
    }
    
    console.log('\nВсе скриншоты успешно загружены!');
    console.log(`\nЧтобы использовать эти скриншоты, обновите значение screenshots в apps.json для приложения ${appId}:`);
    console.log(`\nНапример: [${Array.from({length: regularScreenshots.length}, (_, i) => i + 1).join(', ')}]`);
    
  } catch (error) {
    console.error('Ошибка при загрузке скриншотов:', error);
  }
}

// Запускаем основную функцию
async function main() {
  try {
    // Запрашиваем у пользователя параметры или используем аргументы командной строки
    const { appId, screenshotsPath } = getInputOrArgs();
    
    console.log(`\nЗагрузка скриншотов для приложения: ${appId}`);
    console.log(`Из папки: ${screenshotsPath}\n`);
    
    // Проверяем существование директории со скриншотами
    if (!await fs.exists(screenshotsPath)) {
      console.error(`Директория ${screenshotsPath} не найдена`);
      process.exit(1);
    }
    
    // Запрашиваем подтверждение, если скрипт запущен в интерактивном режиме
    if (process.argv.length < 4) {
      const confirm = readlineSync.question('Продолжить? (y/n): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('Операция отменена');
        process.exit(0);
      }
    }
    
    // Запускаем загрузку
    await uploadAppScreenshots(appId, screenshotsPath);
  } catch (error) {
    console.error('Произошла ошибка:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
main(); 