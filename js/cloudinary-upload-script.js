/**
 * Скрипт для загрузки ресурсов на Cloudinary из командной строки
 * 
 * Использование:
 * node js/cloudinary-upload-script.js bezels        # Загрузить все рамки устройств
 * node js/cloudinary-upload-script.js app <app-id>  # Загрузить все ресурсы приложения
 * node js/cloudinary-upload-script.js screenshots <app-id>  # Загрузить скриншоты для приложения
 */

const path = require('path');
const fs = require('fs-extra');
const cloudinaryManager = require('./cloudinary-manager');

// Пути к директориям с ресурсами
const appsDir = path.join(__dirname, '../assets/apps');
const badgesDir = path.join(__dirname, '../assets/badges');
const bezelsDir = path.join(__dirname, '../assets/product-bezels');

// Константы для режимов загрузки
const UPLOAD_MODES = {
    ALL: 0,        // Загрузить все (перезаписать существующие)
    SPECIFIC: 1,   // Загрузить конкретный файл
    NEW_ONLY: 2    // Загрузить только новые файлы
};

// Валидные опции для команд
const VALID_OPTIONS = {
    bezels: ['all', 'new'],
    screenshots: ['all', 'new']
};

/**
 * Обработка аргументов командной строки
 */
async function processArgs() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        showHelp();
        return;
    }
    
    const command = args[0].toLowerCase();
    
    switch (command) {
        case 'bezels':
            await uploadBezels(args[1] || 'all');
            break;
        case 'screenshots':
            if (args.length < 2) {
                console.error('Не указан ID приложения');
                showHelp();
                return;
            }
            await uploadScreenshots(args[1], args[2] || 'all');
            break;
        case 'app':
            if (args.length < 2) {
                console.error('Не указан ID приложения');
                showHelp();
                return;
            }
            await uploadAppAssets(args[1]);
            break;
        case 'badges':
            await uploadBadges();
            break;
        case 'all':
            await uploadAllAssets();
            break;
        case 'help':
        case '--help':
        case '-h':
            showHelp();
            break;
        default:
            console.error(`Неизвестная команда: ${command}`);
            showHelp();
            break;
    }
}

/**
 * Вывод справки
 */
function showHelp() {
    console.log(`
Скрипт для загрузки ресурсов на Cloudinary

Использование:
  node js/cloudinary-upload-script.js <команда> [опции]

Команды:
  all                           Перезагрузить все изображения из assets 
                               (бейджи, рамки устройств, все приложения)
  
  app <app-id>                  Загрузить все изображения конкретного приложения
                               (иконки, превью, скриншоты)
  
  bezels [all|new|<имя файла>]   Загрузить рамки устройств 
                                 (all - все, new - только новые, <имя файла> - конкретный файл)
  
  screenshots <app-id> [all|new] Загрузить скриншоты для приложения
                                 (all - все, new - только новые)
  
  badges                         Загрузить все бейджи

  help                           Показать эту справку
    `);
}

/**
 * Проверка существования директории
 * @param {string} dirPath - Путь к директории
 * @param {string} dirName - Название директории для вывода сообщения
 * @returns {Promise<boolean>} Результат проверки
 */
async function checkDirectoryExists(dirPath, dirName) {
    if (!await fs.exists(dirPath)) {
        console.error(`Директория ${dirName} не найдена: ${dirPath}`);
        return false;
    }
    return true;
}

/**
 * Обработка опции загрузки
 * @param {string} option - Опция загрузки (all, new, или имя файла)
 * @param {string} command - Команда (bezels, screenshots)
 * @returns {number} Режим загрузки (0 - все, 1 - конкретный файл, 2 - только новые)
 */
function parseUploadOption(option, command) {
    if (VALID_OPTIONS[command] && VALID_OPTIONS[command].includes(option)) {
        return option === 'all' ? UPLOAD_MODES.ALL : UPLOAD_MODES.NEW_ONLY;
    }
    
    // Если опция не входит в список валидных, считаем её именем файла
    return UPLOAD_MODES.SPECIFIC;
}

/**
 * Загрузка рамок устройств
 * @param {string} option - Опция загрузки (all, new, или имя файла)
 */
async function uploadBezels(option = 'all') {
    console.log('Загрузка рамок устройств на Cloudinary...');
    
    if (!await checkDirectoryExists(bezelsDir, 'рамок устройств')) {
        return;
    }
    
    const mode = parseUploadOption(option, 'bezels');
    let specificFile = null;
    
    if (mode === UPLOAD_MODES.ALL) {
        console.log('Режим: загрузка всех рамок устройств');
    } else if (mode === UPLOAD_MODES.NEW_ONLY) {
        console.log('Режим: загрузка только новых рамок устройств');
    } else {
        // Проверяем, существует ли файл с таким именем
        const files = await fs.readdir(bezelsDir);
        const imageFiles = cloudinaryManager.filterImageFiles(files);
        
        const matchingFiles = imageFiles.filter(file => 
            file.toLowerCase().includes(option.toLowerCase())
        );
        
        if (matchingFiles.length === 0) {
            console.error(`Файл с именем, содержащим "${option}", не найден`);
            return;
        }
        
        if (matchingFiles.length > 1) {
            console.log(`Найдено несколько файлов, содержащих "${option}":`);
            matchingFiles.forEach((file, index) => {
                console.log(`${index + 1}. ${file}`);
            });
            console.log('Будет загружен первый файл из списка');
        }
        
        specificFile = matchingFiles[0];
        console.log(`Режим: загрузка конкретной рамки устройства: ${specificFile}`);
    }
    
    const count = await cloudinaryManager.uploadDeviceBezels(bezelsDir, mode, specificFile);
    console.log(`Загрузка рамок устройств завершена. Загружено: ${count}`);
}

/**
 * Загрузка скриншотов для приложения
 * @param {string} appId - ID приложения
 * @param {string} option - Опция загрузки (all, new)
 */
async function uploadScreenshots(appId, option = 'all') {
    console.log(`Загрузка скриншотов для приложения ${appId}...`);
    
    const screenshotsPath = path.join(appsDir, appId, 'screenshots');
    
    if (!await checkDirectoryExists(screenshotsPath, 'скриншотов')) {
        return;
    }
    
    const mode = parseUploadOption(option, 'screenshots');
    
    if (mode === UPLOAD_MODES.SPECIFIC) {
        console.error(`Неизвестная опция: ${option}`);
        console.log('Допустимые опции: all, new');
        return;
    }
    
    if (mode === UPLOAD_MODES.ALL) {
        console.log('Режим: загрузка всех скриншотов');
    } else if (mode === UPLOAD_MODES.NEW_ONLY) {
        console.log('Режим: загрузка только новых скриншотов');
    }
    
    const count = await cloudinaryManager.uploadAppScreenshots(appId, screenshotsPath, mode);
    console.log(`Загрузка скриншотов для приложения ${appId} завершена. Загружено: ${count}`);
}

/**
 * Загрузка бейджей
 */
async function uploadBadges() {
    console.log('Загрузка бейджей на Cloudinary...');
    
    if (!await checkDirectoryExists(badgesDir, 'бейджей')) {
        return;
    }
    
    const success = await cloudinaryManager.uploadBadges(badgesDir);
    
    if (success) {
        console.log('Загрузка бейджей завершена успешно');
    } else {
        console.error('При загрузке бейджей произошли ошибки');
    }
}

/**
 * Загрузка всех ресурсов из папки assets
 */
async function uploadAllAssets() {
    console.log('Перезагрузка всех изображений из папки assets...');
    
    // Создаем основную папку website, если она еще не существует
    await cloudinaryManager.createFolder(cloudinaryManager.CLOUDINARY_ROOT_FOLDER);

    // Загружаем бейджи
    console.log('\n=== Загрузка бейджей ===');
    await uploadBadges();
    
    // Загружаем рамки устройств
    console.log('\n=== Загрузка рамок устройств ===');
    await uploadBezels('all');
    
    // Получаем список всех папок приложений
    console.log('\n=== Загрузка ресурсов приложений ===');
    try {
        // Получаем список директорий приложений
        const appDirs = await getAppDirectories();
        
        console.log(`Найдено ${appDirs.length} папок с приложениями`);
        
        // Для каждого приложения удаляем и заново загружаем ассеты
        for (const appFolder of appDirs) {
            console.log(`\nПерезагрузка ассетов для приложения ${appFolder}...`);
            await uploadAppAssets(appFolder);
        }
        
        console.log('\nВсе изображения успешно перезагружены!');
    } catch (error) {
        console.error('Произошла ошибка при перезагрузке изображений:', error);
    }
}

/**
 * Получение списка директорий приложений
 * @returns {Promise<Array<string>>} Список имен директорий приложений
 */
async function getAppDirectories() {
    if (!await checkDirectoryExists(appsDir, 'приложений')) {
        return [];
    }
    
    const appFolders = await fs.readdir(appsDir);
    const appDirs = [];
    
    // Фильтруем только директории и пропускаем системные файлы
    for (const folder of appFolders) {
        if (folder === '.DS_Store') continue;
        
        const folderPath = path.join(appsDir, folder);
        const stats = await fs.stat(folderPath);
        
        if (stats.isDirectory()) {
            appDirs.push(folder);
        }
    }
    
    return appDirs;
}

/**
 * Загрузка ресурсов для конкретного приложения
 * @param {string} appId - ID приложения
 */
async function uploadAppAssets(appId) {
    console.log(`Загрузка всех изображений для приложения ${appId}...`);
    
    const appPath = path.join(appsDir, appId);
    
    if (!await checkDirectoryExists(appPath, 'приложения')) {
        return;
    }
    
    // Сначала удаляем существующие ресурсы приложения
    console.log(`Удаление существующих ресурсов для приложения ${appId}...`);
    await cloudinaryManager.deleteAppFolder(appId);
    
    // Затем загружаем ассеты заново
    console.log(`Загрузка всех ресурсов для приложения ${appId}...`);
    const success = await cloudinaryManager.uploadAppAssets(appId, appsDir);
    
    if (success) {
        console.log(`Все изображения для приложения ${appId} успешно загружены`);
    } else {
        console.error(`При загрузке изображений для приложения ${appId} произошли ошибки`);
    }
}

// Запускаем обработку аргументов
processArgs().catch(error => {
    console.error('Произошла ошибка:', error);
    process.exit(1);
}); 