/**
 * Скрипт для работы с Cloudinary: загрузка скриншотов и инвалидация кеша
 * Для запуска:
 * 1. Установите необходимые зависимости: npm install cloudinary dotenv fs-extra readline-sync
 * 2. Проверьте, что файл .env содержит ваши учетные данные Cloudinary
 * 3. Запустите скрипт: 
 *    - Интерактивно: node js/cloudinary-tools.js
 *    - С аргументами для загрузки: node js/cloudinary-tools.js upload <app-id> <path-to-screenshots>
 *    - С аргументами для инвалидации: node js/cloudinary-tools.js invalidate [folder-name]
 * 
 * Примеры: 
 * - node js/cloudinary-tools.js upload time-capsule ~/Desktop/time-capsule-screenshots
 * - node js/cloudinary-tools.js invalidate apps/time-capsule
 * - node js/cloudinary-tools.js invalidate all
 */

const fs = require('fs-extra');
const path = require('path');
const readlineSync = require('readline-sync');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;

// Конфигурация Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Корневая папка в Cloudinary для всех файлов сайта
const CLOUDINARY_ROOT_FOLDER = 'website';

// ============================== ЗАГРУЗКА СКРИНШОТОВ ==============================

// Функция для получения ввода пользователя или использования аргументов командной строки
function getInputOrArgs() {
    // Получаем аргументы командной строки
    const args = process.argv.slice(2);
    
    // Если предоставлены оба аргумента, используем их
    if (args.length >= 3 && args[0] === 'upload') {
        const appId = args[1];
        let screenshotsPath = args[2];
        
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
      use_filename: true,
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
    
    // Загружаем каждое изображение, сохраняя оригинальное имя файла
    for (const file of imageFiles) {
      const filePath = path.join(screenshotsPath, file);
      // Используем имя файла без расширения как имя в Cloudinary
      const fileNameWithoutExt = path.basename(file, path.extname(file));
      
      await uploadFile(filePath, `apps/${appId}/${fileNameWithoutExt}`);
    }
    
    console.log('\nВсе скриншоты успешно загружены!');
    console.log(`\nИзображения загружены с их оригинальными именами.`);
    
  } catch (error) {
    console.error('Ошибка при загрузке скриншотов:', error);
  }
}

// ============================== ИНВАЛИДАЦИЯ КЕША ==============================

// Функция для получения списка папок
async function listFolders() {
  try {
    // Получаем список корневых папок
    const rootResult = await cloudinary.api.root_folders();
    
    // Ищем нашу основную папку сайта
    const websiteFolder = rootResult.folders.find(folder => folder.path === CLOUDINARY_ROOT_FOLDER);
    
    if (!websiteFolder) {
      console.error(`Папка ${CLOUDINARY_ROOT_FOLDER} не найдена в Cloudinary`);
      return [];
    }
    
    // Получаем список подпапок внутри основной папки
    const subFoldersResult = await cloudinary.api.sub_folders(CLOUDINARY_ROOT_FOLDER);
    
    console.log('Доступные папки:');
    console.log(`0. Все папки (${CLOUDINARY_ROOT_FOLDER}/*)`);
    console.log(`1. Корневая папка (${CLOUDINARY_ROOT_FOLDER})`);
    
    subFoldersResult.folders.forEach((folder, index) => {
      console.log(`${index + 2}. ${folder.path}`);
    });
    
    return [
      { path: 'all', name: 'Все папки' },
      { path: CLOUDINARY_ROOT_FOLDER, name: 'Корневая папка' },
      ...subFoldersResult.folders
    ];
  } catch (error) {
    console.error('Ошибка при получении списка папок:', error);
    return [];
  }
}

// Функция для инвалидации ресурсов в папке
async function invalidateByFolder(folderPath) {
  try {
    // Если выбраны все папки, используем корневую папку сайта
    const prefix = folderPath === 'all' ? CLOUDINARY_ROOT_FOLDER : folderPath;
    
    console.log(`Начинаю инвалидацию ресурсов в папке: ${prefix}`);
    
    // Получаем список ресурсов в папке
    const resources = await cloudinary.api.resources({
      type: 'upload',
      prefix: prefix,
      max_results: 500
    });
    
    // Инвалидируем каждый ресурс
    let invalidated = 0;
    for (const resource of resources.resources) {
      try {
        await cloudinary.uploader.explicit(resource.public_id, {
          type: 'upload',
          invalidate: true
        });
        console.log(`Инвалидирован: ${resource.public_id}`);
        invalidated++;
      } catch (err) {
        console.error(`Ошибка при инвалидации ${resource.public_id}:`, err);
      }
    }
    
    console.log(`Инвалидировано ${invalidated} из ${resources.resources.length} ресурсов в папке ${prefix}`);
    return invalidated;
  } catch (error) {
    console.error(`Ошибка при инвалидации папки ${folderPath}:`, error);
    return 0;
  }
}

// Функция для инвалидации ресурсов во всех папках
async function invalidateAll() {
  try {
    console.log('Инвалидация ресурсов во всех папках...');
    await invalidateByFolder('all');
  } catch (error) {
    console.error('Ошибка при инвалидации всех ресурсов:', error);
  }
}

// Функция для запуска интерактивной инвалидации кеша
async function invalidateCache() {
  try {
    console.log('Инвалидация кешированных ресурсов Cloudinary');
    console.log('--------------------------------------------');
    
    // Получаем список папок
    const folders = await listFolders();
    
    if (folders.length === 0) {
      console.error('Не удалось получить список папок');
      return;
    }
    
    // Запрашиваем у пользователя выбор папки
    const folderIndex = readlineSync.keyInSelect(
      folders.map(folder => folder.name),
      'Выберите папку для инвалидации кеша:'
    );
    
    // Если пользователь отменил операцию
    if (folderIndex === -1) {
      console.log('Операция отменена');
      return;
    }
    
    const selectedFolder = folders[folderIndex];
    
    // Запрашиваем подтверждение
    console.log(`\nВы собираетесь инвалидировать кеш для папки: ${selectedFolder.path}`);
    const confirm = readlineSync.question('Продолжить? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('Операция отменена');
      return;
    }
    
    // Запускаем инвалидацию
    if (selectedFolder.path === 'all') {
      await invalidateAll();
    } else {
      await invalidateByFolder(selectedFolder.path);
    }
    
  } catch (error) {
    console.error('Произошла ошибка при инвалидации кеша:', error);
  }
}

// Функция для обработки аргументов командной строки при инвалидации
async function handleInvalidateArgs() {
  // Получаем аргументы командной строки
  const args = process.argv.slice(2);
  
  // Проверяем, что команда - invalidate
  if (args.length < 1 || args[0] !== 'invalidate') {
    return false;
  }
  
  // Если указан аргумент all или не указан второй аргумент, инвалидируем все
  if (args.length === 1 || args[1] === 'all') {
    await invalidateAll();
    return true;
  }
  
  // Иначе инвалидируем указанную папку
  const folderPath = args[1];
  await invalidateByFolder(folderPath);
  return true;
}

// ============================== ОСНОВНАЯ ЛОГИКА ==============================

// Функция загрузки скриншотов
async function handleUpload() {
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
    if (process.argv.length < 5 || process.argv[2] !== 'upload') {
      const confirm = readlineSync.question('Продолжить? (y/n): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('Операция отменена');
        process.exit(0);
      }
    }
    
    // Запускаем загрузку
    await uploadAppScreenshots(appId, screenshotsPath);
  } catch (error) {
    console.error('Произошла ошибка при загрузке скриншотов:', error);
    process.exit(1);
  }
}

// Запускаем основную функцию
async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Проверяем команду
    if (args.length > 0) {
      // Если команда invalidate
      if (args[0] === 'invalidate') {
        await handleInvalidateArgs();
        return;
      }
      
      // Если команда upload
      if (args[0] === 'upload') {
        await handleUpload();
        return;
      }
    }
    
    // Показываем меню выбора действия
    console.log('Cloudinary Tools');
    console.log('===============');
    
    const actions = [
      'Загрузить скриншоты',
      'Инвалидировать кеш'
    ];
    
    const actionIndex = readlineSync.keyInSelect(actions, 'Выберите действие:');
    
    switch (actionIndex) {
      case 0:
        await handleUpload();
        break;
      case 1:
        await invalidateCache();
        break;
      default:
        console.log('Операция отменена');
        break;
    }
  } catch (error) {
    console.error('Произошла ошибка:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
main(); 