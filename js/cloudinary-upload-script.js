/**
 * Скрипт для загрузки ресурсов на Cloudinary из командной строки
 * 
 * Использование:
 * node js/cloudinary-upload-script.js bezels        # Загрузить все рамки устройств
 * node js/cloudinary-upload-script.js app <app-id>  # Загрузка ресурсов приложения
 * node js/cloudinary-upload-script.js badges        # Загрузить бейджи
 * node js/cloudinary-upload-script.js all           # Загрузить все ресурсы
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
        case 'app':
            if (args.length < 2) {
                console.error('Не указан ID приложения');
                showHelp();
                return;
            }
            await uploadSmartAppAssets(args[1]);
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
  all                           Перезагрузить все изображения из assets на Cloudinary
                               (бейджи, рамки устройств, все приложения)
  
  app <app-id>                  Загрузка всех изображений приложения
                               (обнаруживает скриншоты в любом месте, поддерживает структуру папок)
  
  bezels [all|new|<имя файла>]   Загрузить рамки устройств 
                                 (all - все, new - только новые, <имя файла> - конкретный файл)
  
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
 * @returns {number} Режим загрузки (0 - все, 1 - конкретный файл, 2 - только новые)
 */
function parseUploadOption(option) {
    if (option === 'all') {
        return UPLOAD_MODES.ALL;
    } else if (option === 'new') {
        return UPLOAD_MODES.NEW_ONLY;
    } else {
        return UPLOAD_MODES.SPECIFIC;
    }
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
    
    const mode = parseUploadOption(option);
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
 * Загрузка бейджей
 */
async function uploadBadges() {
    console.log('Загрузка бейджей на Cloudinary...');
    
    if (!await checkDirectoryExists(badgesDir, 'бейджей')) {
        return;
    }
    
    const success = await cloudinaryManager.uploadBadges(badgesDir, true);
    
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
    await cloudinaryManager.uploadBadges(badgesDir, true);
    
    // Загружаем рамки устройств
    console.log('\n=== Загрузка рамок устройств ===');
    await cloudinaryManager.uploadDeviceBezels(bezelsDir, UPLOAD_MODES.ALL);
    
    // Получаем список всех папок приложений
    console.log('\n=== Загрузка ресурсов приложений ===');
    try {
        // Получаем список директорий приложений
        const appDirs = await getAppDirectories();
        
        console.log(`Найдено ${appDirs.length} папок с приложениями`);
        
        // Для каждого приложения загружаем ассеты
        for (const appFolder of appDirs) {
            console.log(`\nПерезагрузка ассетов для приложения ${appFolder}...`);
            const result = await cloudinaryManager.smartUploadAppAssets(appFolder, appsDir, true);
            if (result.failed > 0) {
                console.warn(`⚠️ Загрузка приложения ${appFolder} выполнена с ошибками: ${result.failed} ошибок из ${result.total} файлов`);
            } else {
                console.log(`✅ Загрузка приложения ${appFolder} успешно завершена: ${result.success} файлов`);
            }
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
 * Загрузка ресурсов приложения
 * @param {string} appId - ID приложения
 */
async function uploadSmartAppAssets(appId) {
    console.log(`Умная загрузка ресурсов для приложения ${appId}...`);
    
    const appPath = path.join(appsDir, appId);
    
    if (!await checkDirectoryExists(appPath, 'приложения')) {
        return;
    }
    
    try {
        const result = await cloudinaryManager.smartUploadAppAssets(appId, appsDir, true);
        
        console.log(`\n=== Итоги загрузки для ${appId} ===`);
        console.log(`✅ Успешно загружено файлов: ${result.success}`);
        console.log(`❌ Ошибок загрузки: ${result.failed}`);
        
        if (result.errors && result.errors.length > 0) {
            console.error('\nСписок ошибок:');
            result.errors.forEach((error, index) => {
                console.error(`${index + 1}. ${error}`);
            });
        }
    } catch (error) {
        console.error(`При умной загрузке изображений для приложения ${appId} произошла ошибка:`, error);
    }
}

// Запускаем обработку аргументов
processArgs().catch(error => {
    console.error('Произошла ошибка:', error);
    process.exit(1);
}); 