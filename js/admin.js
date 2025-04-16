/**
 * Административный скрипт для управления приложением
 */

import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import cloudinary from 'cloudinary';

// Настройка для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Импортируем локальные модули
import * as cloudinaryManager from './cloudinary-manager.js';
import * as jsonUtils from './json-utils.js';

// Получаем константу IMAGE_EXTENSIONS из cloudinaryManager для фильтрации файлов
const { CLOUDINARY_ROOT_FOLDER, IMAGE_EXTENSIONS, filterImageFiles } = cloudinaryManager;

// Пути к директориям с ресурсами
const appsDir = path.join(__dirname, '../assets/apps');
const badgesDir = path.join(__dirname, '../assets/badges');
const bezelsDir = path.join(__dirname, '../assets/product-bezels');

// Пути к файлам, где хранится версия
const cloudinaryManagerPath = path.join(__dirname, './cloudinary-manager.js');
const cloudinaryPath = path.join(__dirname, './cloudinary.js');

// Константы для режимов загрузки
const UPLOAD_MODES = {
    ALL: 0,        // Загрузить все (перезаписать существующие)
    SPECIFIC: 1,   // Загрузить конкретный файл
    NEW_ONLY: 2    // Загрузить только новые файлы
};

/**
 * Точка входа в административный скрипт
 */
async function main() {
    // Обработка аргументов командной строки, если есть
    if (process.argv.length > 2) {
        await processCommandLineArgs();
        return;
    }

    try {
        console.log('\n✨ Административный скрипт ✨\n');

        // Выводим главное меню
        const { operation } = await inquirer.prompt([
            {
                type: 'list',
                name: 'operation',
                message: 'Выберите операцию:',
                choices: [
                    'Обновление публичного JSON',
                    'Загрузка изображений приложений на Cloudinary',
                    'Загрузка бейджей на Cloudinary',
                    'Загрузка рамок устройств на Cloudinary',
                    'Инвалидация кэша изображений в Cloudinary',
                    'Перезагрузка всех изображений из assets на Cloudinary',
                    'Обновление версии ассетов',
                    'Выход'
                ]
            }
        ]);

        switch (operation) {
            case 'Загрузка изображений приложений на Cloudinary':
                await uploadAppImagesImproved();
                break;
            case 'Загрузка бейджей на Cloudinary':
                await uploadBadges();
                break;
            case 'Загрузка рамок устройств на Cloudinary':
                await uploadBezels();
                break;
            case 'Инвалидация кэша изображений в Cloudinary':
                await invalidateCache();
                break;
            case 'Перезагрузка всех изображений из assets на Cloudinary':
                await uploadAllAssets();
                break;
            case 'Обновление публичного JSON':
                await updatePublicJson();
                break;
            case 'Обновление версии ассетов':
                await updateAssetVersion();
                break;
            case 'Выход':
                console.log('Выход из скрипта');
                process.exit(0);
        }

        // После выполнения операции возвращаемся в главное меню
        await main();
    } catch (error) {
        console.error('Произошла ошибка:', error);
        process.exit(1);
    }
}

/**
 * Обработка аргументов командной строки для прямого запуска определенных операций
 */
async function processCommandLineArgs() {
    const args = process.argv.slice(2);
    const command = args[0].toLowerCase();

    try {
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
            case 'image':
                if (args.length < 3) {
                    console.error('Не указан ID приложения или имя файла изображения');
                    showHelp();
                    return;
                }
                await uploadSingleAppImage(args[1], args[2]);
                break;
            case 'share':
                if (args.length < 2) {
                    console.error('Не указан ID приложения');
                    showHelp();
                    return;
                }
                await uploadShareImage(args[1]);
                break;
            case 'badges':
                await uploadBadges();
                break;
            case 'all':
                await uploadAllAssets();
                break;
            case 'update-json':
                await updatePublicJson();
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
    } catch (error) {
        console.error('Произошла ошибка:', error);
        process.exit(1);
    }
}

/**
 * Вывод справки по командной строке
 */
function showHelp() {
    console.log(`
Административный скрипт для управления ресурсами

Использование:
  node js/admin.js <команда> [опции]

Команды:
  all                           Перезагрузить все изображения из assets на Cloudinary
                               (бейджи, рамки устройств, все приложения)
  
  app <app-id>                  Загрузка всех изображений приложения
                               (обнаруживает скриншоты в любом месте, поддерживает структуру папок)
  
  image <app-id> <image-file>   Загрузка одного конкретного изображения для приложения
                               (image-file - имя файла в директории приложения)
  
  share <app-id>                Загрузка изображения share.png для Open Graph (если файл существует)
                               (изображение должно быть размером не менее 1200x630px)
  
  bezels [all|new|<имя файла>]   Загрузить рамки устройств 
                                 (all - все, new - только новые, <имя файла> - конкретный файл)
  
  badges                         Загрузить все бейджи

  update-json                    Обновить публичный JSON

  help                           Показать эту справку
    `);
}

/**
 * Загрузка бейджей на Cloudinary
 */
async function uploadBadges() {
    console.log('Загрузка бейджей на Cloudinary...');

    if (!await fs.exists(badgesDir)) {
        console.error('Директория с бейджами не найдена');
        return;
    }

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Все существующие бейджи будут перезаписаны. Продолжить?',
            default: false
        }
    ]);

    if (!confirm) {
        console.log('Операция отменена');
        return;
    }

    const success = await cloudinaryManager.uploadBadges(badgesDir);

    if (success) {
        console.log('Бейджи успешно загружены');
    } else {
        console.error('При загрузке бейджей произошли ошибки');
    }
}

/**
 * Загрузка рамок устройств на Cloudinary
 * @param {string} option - Опция загрузки (all, new, или имя файла)
 */
async function uploadBezels(option) {
    console.log('Загрузка рамок устройств на Cloudinary...');

    if (!await fs.exists(bezelsDir)) {
        console.error('Директория с рамками устройств не найдена');
        return;
    }

    // Если option уже передан через командную строку, используем его
    let uploadMode = UPLOAD_MODES.ALL; // По умолчанию - все
    let specificFile = null;

    if (!option) {
        // Получаем опции загрузки через интерактивное меню
        const { mode } = await inquirer.prompt([
            {
                type: 'list',
                name: 'mode',
                message: 'Выберите режим загрузки:',
                choices: [
                    { name: 'Загрузить все рамки (перезаписать существующие)', value: 'all' },
                    { name: 'Загрузить конкретную рамку', value: 'specific' },
                    { name: 'Загрузить только новые рамки', value: 'new' },
                    { name: '⬅️ Вернуться в главное меню', value: 'back' }
                ]
            }
        ]);

        option = mode;
    }

    // Проверяем, выбрана ли опция возврата в главное меню
    if (option === 'back') {
        console.log('Возврат в главное меню...');
        return;
    }

    if (option === 'all') {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Все существующие рамки будут перезаписаны. Продолжить?',
                default: false
            }
        ]);

        if (!confirm) {
            console.log('Операция отменена');
            return;
        }
    } else if (option === 'specific') {
        // Получаем список файлов с рамками
        const files = await fs.readdir(bezelsDir);
        const imageFiles = cloudinaryManager.filterImageFiles(files);

        if (imageFiles.length === 0) {
            console.error('В директории нет файлов с рамками устройств');
            return;
        }

        // Сортируем файлы по имени
        imageFiles.sort();

        const { selectedFile } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedFile',
                message: 'Выберите файл для загрузки:',
                choices: imageFiles
            }
        ]);

        specificFile = selectedFile;
        uploadMode = UPLOAD_MODES.SPECIFIC;
    } else if (option === 'new') {
        uploadMode = UPLOAD_MODES.NEW_ONLY;
    } else if (option !== 'all' && option !== 'new') {
        // Считаем, что передано имя файла или часть имени
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
        uploadMode = UPLOAD_MODES.SPECIFIC;
    }

    const count = await cloudinaryManager.uploadDeviceBezels(bezelsDir, uploadMode, specificFile);
    console.log(`Загрузка рамок устройств завершена. Загружено: ${count}`);
}

/**
 * Загрузка изображений приложений на Cloudinary с использованием улучшенного метода
 */
async function uploadAppImagesImproved() {
    console.log('Загрузка изображений приложений на Cloudinary...');

    // Получаем список папок приложений
    const appFolders = await cloudinaryManager.getAppDirectories(appsDir);

    if (appFolders.length === 0) {
        console.error('Нет доступных приложений');
        return;
    }

    // Предлагаем выбрать конкретное приложение или все приложения
    const { appSelectionMode } = await inquirer.prompt([
        {
            type: 'list',
            name: 'appSelectionMode',
            message: 'Выберите режим загрузки:',
            choices: [
                { name: 'Загрузить изображения для конкретного приложения', value: 'single' },
                { name: 'Загрузить одно конкретное изображение для приложения', value: 'single_image' },
                { name: 'Загрузить изображения для всех приложений', value: 'all' },
                { name: '⬅️ Вернуться в главное меню', value: 'back' }
            ]
        }
    ]);

    // Проверяем, выбрана ли опция возврата в главное меню
    if (appSelectionMode === 'back') {
        console.log('Возврат в главное меню...');
        return;
    }

    if (appSelectionMode === 'all') {
        const { confirmAll } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmAll',
                message: 'Будут загружены изображения для ВСЕХ приложений. Продолжить?',
                default: false
            }
        ]);

        if (!confirmAll) {
            console.log('Операция отменена');
            return;
        }

        // Загрузка всех приложений
        console.log(`Запуск загрузки для ${appFolders.length} приложений...`);

        const results = {
            success: 0,
            failed: 0,
            skipped: 0,
            details: {}
        };

        for (const appId of appFolders) {
            console.log(`\n📱 Загрузка приложения: ${appId}`);

            try {
                const result = await cloudinaryManager.smartUploadAppAssets(appId, appsDir, true);

                if (result.errors && result.errors.length > 0) {
                    console.warn(`⚠️ Загрузка приложения ${appId} выполнена с ошибками`);
                    results.details[appId] = 'partial';
                    results.failed++;
                } else {
                    console.log(`✅ Загрузка приложения ${appId} успешно завершена`);
                    results.details[appId] = 'success';
                    results.success++;
                }
            } catch (error) {
                console.error(`❌ Не удалось загрузить приложение ${appId}:`, error.message);
                results.details[appId] = 'failed';
                results.failed++;
            }
        }

        console.log('\n📊 Итоги загрузки всех приложений 📊');
        console.log(`✅ Успешно загружено: ${results.success}`);
        console.log(`⚠️ Загружено с ошибками: ${results.failed}`);
        console.log(`⏭️ Пропущено: ${results.skipped}`);
        console.log('-----------------------------------------');
    } else if (appSelectionMode === 'single_image') {
        // Выбираем приложение
        const { selectedApp } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedApp',
                message: 'Выберите приложение:',
                choices: [...appFolders, '⬅️ Вернуться в главное меню']
            }
        ]);

        // Проверяем, выбрана ли опция возврата
        if (selectedApp === '⬅️ Вернуться в главное меню') {
            console.log('Возврат в главное меню...');
            return;
        }

        // Получаем список изображений для выбранного приложения
        const appSourceDir = path.join(appsDir, selectedApp);

        if (!await fs.exists(appSourceDir)) {
            console.error(`Директория приложения не найдена: ${appSourceDir}`);
            return;
        }

        // Получаем файлы из корневой директории приложения
        const files = await fs.readdir(appSourceDir);

        // Фильтруем только изображения
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return IMAGE_EXTENSIONS.includes(ext) && file !== '.DS_Store';
        });

        if (imageFiles.length === 0) {
            console.error(`Изображения не найдены в директории приложения: ${appSourceDir}`);
            return;
        }

        // Сортируем файлы
        imageFiles.sort();

        // Выбираем конкретное изображение
        const { selectedImage } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedImage',
                message: 'Выберите изображение для загрузки:',
                choices: [...imageFiles, '⬅️ Вернуться в главное меню']
            }
        ]);

        // Проверяем, выбрана ли опция возврата
        if (selectedImage === '⬅️ Вернуться в главное меню') {
            console.log('Возврат в главное меню...');
            return;
        }

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Загрузить изображение ${selectedImage} для приложения ${selectedApp}?`,
                default: true
            }
        ]);

        if (!confirm) {
            console.log('Операция отменена');
            return;
        }

        console.log(`Загрузка изображения ${selectedImage} для приложения ${selectedApp}...`);

        try {
            const filePath = path.join(appSourceDir, selectedImage);
            const fileName = path.parse(selectedImage).name;
            const appDestFolder = `${cloudinaryManager.CLOUDINARY_ROOT_FOLDER}/apps/${selectedApp}`;

            // Создаем папку для приложения, если ее нет
            await cloudinaryManager.createFolder(appDestFolder);

            // Загружаем файл
            const result = await cloudinaryManager.uploadFile(filePath, `${appDestFolder}/${fileName}`);

            if (result) {
                console.log(`✅ Изображение ${selectedImage} успешно загружено для приложения ${selectedApp}`);
            } else {
                console.error(`❌ Ошибка при загрузке изображения ${selectedImage}`);
            }
        } catch (error) {
            console.error('Ошибка при загрузке изображения:', error);
        }
    } else {
        // Выбираем приложение или возвращаемся назад
        const { selectedApp } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedApp',
                message: 'Выберите приложение:',
                choices: [...appFolders, '⬅️ Вернуться в главное меню']
            }
        ]);

        // Проверяем, выбрана ли опция возврата в главное меню
        if (selectedApp === '⬅️ Вернуться в главное меню') {
            console.log('Возврат в главное меню...');
            return;
        }

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Запустить загрузку для приложения ${selectedApp}?`,
                default: true
            }
        ]);

        if (!confirm) {
            console.log('Операция отменена');
            return;
        }

        console.log(`Запуск загрузки для приложения ${selectedApp}...`);

        try {
            await cloudinaryManager.smartUploadAppAssets(selectedApp, appsDir, true);
            console.log('\nЗагрузка изображений завершена!');
        } catch (error) {
            console.error('Ошибка при загрузке изображений:', error);
        }
    }
}

/**
 * Инвалидация кэша изображений в Cloudinary
 */
async function invalidateCache() {
    console.log('Инвалидация кэша изображений в Cloudinary...');

    // Получаем список папок
    const folders = await listCloudinaryFolders();

    if (folders.length === 0) {
        console.error('Не удалось получить список папок');
        return;
    }

    // Выбираем папку для инвалидации
    const { selectedFolder } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedFolder',
            message: 'Выберите папку для инвалидации кэша:',
            choices: [
                ...folders.map(folder => ({
                    name: `${folder.name} (${folder.path})`,
                    value: folder.path
                })),
                { name: '⬅️ Вернуться в главное меню', value: 'back' }
            ]
        }
    ]);

    // Если выбран вариант возврата, возвращаемся в главное меню
    if (selectedFolder === 'back') {
        console.log('Возврат в главное меню...');
        return;
    }

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `Вы уверены, что хотите инвалидировать кэш для ${selectedFolder}?`,
            default: false
        }
    ]);

    if (!confirm) {
        console.log('Операция отменена');
        return;
    }

    const count = await invalidateByFolder(selectedFolder);
    console.log(`Инвалидация кэша завершена. Обработано ${count} ресурсов.`);
}

/**
 * Получение списка доступных папок в Cloudinary
 * @returns {Promise<Array<object>>} Список папок
 */
async function listCloudinaryFolders() {
    try {
        // Получаем список корневых папок
        const rootResult = await cloudinary.v2.api.root_folders();

        // Ищем нашу основную папку сайта
        const websiteFolder = rootResult.folders.find(folder => folder.path === cloudinaryManager.CLOUDINARY_ROOT_FOLDER);

        if (!websiteFolder) {
            console.error(`Папка ${cloudinaryManager.CLOUDINARY_ROOT_FOLDER} не найдена в Cloudinary`);
            return [];
        }

        // Получаем список подпапок внутри основной папки
        const subFoldersResult = await cloudinary.v2.api.sub_folders(cloudinaryManager.CLOUDINARY_ROOT_FOLDER);

        return [
            { path: 'all', name: 'Все папки' },
            { path: cloudinaryManager.CLOUDINARY_ROOT_FOLDER, name: 'Корневая папка' },
            ...subFoldersResult.folders
        ];
    } catch (error) {
        console.error('Ошибка при получении списка папок:', error);
        return [];
    }
}

/**
 * Инвалидация ресурсов в указанной папке
 * @param {string} folderPath - Путь к папке
 * @returns {Promise<number>} Количество инвалидированных ресурсов
 */
async function invalidateByFolder(folderPath) {
    try {
        // Если выбраны все папки, используем корневую папку сайта
        const prefix = folderPath === 'all' ? cloudinaryManager.CLOUDINARY_ROOT_FOLDER : folderPath;

        console.log(`Начинаю инвалидацию ресурсов в папке: ${prefix}`);

        // Получаем список ресурсов в папке
        const resources = await cloudinary.v2.api.resources({
            type: 'upload',
            prefix: prefix,
            max_results: 500
        });

        // Инвалидируем каждый ресурс
        let invalidated = 0;
        for (const resource of resources.resources) {
            try {
                await cloudinary.v2.uploader.explicit(resource.public_id, {
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

/**
 * Загрузка всех ресурсов из папки assets
 */
async function uploadAllAssets() {
    console.log('Перезагрузка всех изображений из папки assets...');

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Все существующие изображения будут перезаписаны. Продолжить?',
            default: false
        }
    ]);

    if (!confirm) {
        console.log('Операция отменена');
        return;
    }

    // Создаем основную папку website, если она еще не существует
    await cloudinaryManager.createFolder(cloudinaryManager.CLOUDINARY_ROOT_FOLDER);

    // Загружаем бейджи
    console.log('\n🏷️ Загрузка бейджей...');
    await cloudinaryManager.uploadBadges(badgesDir, true);

    // Загружаем рамки устройств
    console.log('\n🖼️ Загрузка рамок устройств...');
    await cloudinaryManager.uploadDeviceBezels(bezelsDir, UPLOAD_MODES.ALL);

    // Получаем список всех папок приложений
    console.log('\n📱 Загрузка ресурсов приложений...');
    try {
        // Получаем список директорий приложений
        const appDirs = await cloudinaryManager.getAppDirectories(appsDir);

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
 * Загрузка ресурсов для конкретного приложения
 * @param {string} appId - ID приложения
 */
async function uploadSmartAppAssets(appId) {
    console.log(`Умная загрузка ресурсов для приложения ${appId}...`);

    const appPath = path.join(appsDir, appId);

    if (!await fs.exists(appPath)) {
        console.error(`Директория приложения не найдена: ${appPath}`);
        return;
    }

    try {
        const result = await cloudinaryManager.smartUploadAppAssets(appId, appsDir, true);

        console.log(`\n📊 Итоги загрузки для ${appId} 📊`);
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

/**
 * Обновление публичного JSON с метаданными приложений
 */
async function updatePublicJson() {
    try {
        console.log('Запуск генерации публичной версии apps-metadata.json...');
        const success = await jsonUtils.updatePublicJson();

        if (success) {
            console.log('Публичная версия JSON успешно обновлена!');
        } else {
            console.error('Произошла ошибка при обновлении публичного JSON');
        }
    } catch (error) {
        console.error('Произошла ошибка при обновлении публичного JSON:', error);
    }
}

/**
 * Обновление версии ассетов в файлах cloudinary.js и cloudinary-manager.js
 */
async function updateAssetVersion() {
    try {
        console.log('🔄 Обновление версии ассетов...');

        // Проверяем существование файлов
        if (!await fs.pathExists(cloudinaryManagerPath)) {
            console.error(`❌ Файл ${cloudinaryManagerPath} не найден`);
            return false;
        }

        if (!await fs.pathExists(cloudinaryPath)) {
            console.error(`❌ Файл ${cloudinaryPath} не найден`);
            return false;
        }

        // Читаем текущую версию из cloudinary-manager.js
        const managerContent = await fs.readFile(cloudinaryManagerPath, 'utf-8');

        // Ищем версию с помощью регулярного выражения
        const versionMatch = managerContent.match(/const\s+ASSET_VERSION\s*=\s*['"](v\d+)['"]/);

        if (!versionMatch || !versionMatch[1]) {
            console.error('❌ Не удалось определить текущую версию ассетов в cloudinary-manager.js');
            console.log('Формат должен быть: const ASSET_VERSION = \'vX\', где X - число');
            return false;
        }

        const currentVersion = versionMatch[1];
        const currentVersionNumber = parseInt(currentVersion.substring(1));
        const nextVersionNumber = currentVersionNumber + 1;
        const nextVersion = `v${nextVersionNumber}`;

        console.log(`📌 Текущая версия: ${currentVersion}`);

        const { newVersion } = await inquirer.prompt([
            {
                type: 'input',
                name: 'newVersion',
                message: `Введите новую версию (предложено: ${nextVersion}):`,
                default: nextVersion,
                validate: (input) => {
                    // Простая валидация формата v[число]
                    return /^v\d+$/.test(input) ? true : 'Версия должна быть в формате v1, v2, ...';
                }
            }
        ]);

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Обновить версию с ${currentVersion} на ${newVersion} в файлах cloudinary.js и cloudinary-manager.js?`,
                default: true
            }
        ]);

        if (!confirm) {
            console.log('⏹️ Операция отменена');
            return false;
        }

        // Обновляем файл cloudinary-manager.js
        try {
            let newManagerContent = managerContent;

            // Пробуем заменить версию в правильном формате
            const managerReplaced = newManagerContent.replace(
                /const\s+ASSET_VERSION\s*=\s*['"]v\d+['"]/g,
                `const ASSET_VERSION = '${newVersion}'`
            );

            // Проверяем, была ли выполнена замена
            if (managerReplaced === managerContent) {
                console.warn('⚠️ Замена в cloudinary-manager.js не выполнена. Пробуем альтернативный метод...');

                // Альтернативный метод замены (запасной вариант)
                const lines = managerContent.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('ASSET_VERSION') && lines[i].includes('=')) {
                        lines[i] = `const ASSET_VERSION = '${newVersion}'; // Обновлено ${new Date().toISOString()}`;
                        break;
                    }
                }
                newManagerContent = lines.join('\n');
            } else {
                newManagerContent = managerReplaced;
            }

            await fs.writeFile(cloudinaryManagerPath, newManagerContent, 'utf-8');
            console.log(`✅ Файл ${path.basename(cloudinaryManagerPath)} обновлен до версии ${newVersion}`);
        } catch (err) {
            console.error(`❌ Ошибка при обновлении файла ${path.basename(cloudinaryManagerPath)}:`, err);
            return false;
        }

        // Обновляем файл cloudinary.js
        try {
            const cloudinaryContent = await fs.readFile(cloudinaryPath, 'utf-8');

            let newCloudinaryContent = cloudinaryContent;

            // Пробуем заменить версию в правильном формате
            const cloudinaryReplaced = newCloudinaryContent.replace(
                /const\s+ASSET_VERSION\s*=\s*['"]v\d+['"]/g,
                `const ASSET_VERSION = '${newVersion}'`
            );

            // Проверяем, была ли выполнена замена
            if (cloudinaryReplaced === cloudinaryContent) {
                console.warn('⚠️ Замена в cloudinary.js не выполнена. Пробуем альтернативный метод...');

                // Альтернативный метод замены (запасной вариант)
                const lines = cloudinaryContent.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('ASSET_VERSION') && lines[i].includes('=')) {
                        lines[i] = `const ASSET_VERSION = '${newVersion}'; // Обновлено ${new Date().toISOString()}`;
                        break;
                    }
                }
                newCloudinaryContent = lines.join('\n');
            } else {
                newCloudinaryContent = cloudinaryReplaced;
            }

            await fs.writeFile(cloudinaryPath, newCloudinaryContent, 'utf-8');
            console.log(`✅ Файл ${path.basename(cloudinaryPath)} обновлен до версии ${newVersion}`);
        } catch (err) {
            console.error(`❌ Ошибка при обновлении файла ${path.basename(cloudinaryPath)}:`, err);
            return false;
        }

        console.log('🎉 Версия ассетов успешно обновлена!');
        return true;
    } catch (error) {
        console.error('❌ Ошибка при обновлении версии ассетов:', error);
        return false;
    }
}

/**
 * Загрузка одного конкретного изображения для приложения
 * @param {string} appId - ID приложения
 * @param {string} imageName - Имя файла изображения
 */
async function uploadSingleAppImage(appId, imageName) {
    console.log(`Загрузка изображения ${imageName} для приложения ${appId}...`);

    const appSourceDir = path.join(appsDir, appId);

    if (!await fs.exists(appSourceDir)) {
        console.error(`Директория приложения не найдена: ${appSourceDir}`);
        return false;
    }

    const filePath = path.join(appSourceDir, imageName);

    if (!await fs.exists(filePath)) {
        console.error(`Файл изображения не найден: ${filePath}`);
        return false;
    }

    try {
        const fileName = path.parse(imageName).name;
        const appDestFolder = `${cloudinaryManager.CLOUDINARY_ROOT_FOLDER}/apps/${appId}`;

        // Создаем папку для приложения, если ее нет
        await cloudinaryManager.createFolder(appDestFolder);

        // Загружаем файл
        const result = await cloudinaryManager.uploadFile(filePath, `${appDestFolder}/${fileName}`);

        if (result) {
            console.log(`✅ Изображение ${imageName} успешно загружено для приложения ${appId}`);
            return true;
        } else {
            console.error(`❌ Ошибка при загрузке изображения ${imageName}`);
            return false;
        }
    } catch (error) {
        console.error(`Ошибка при загрузке изображения ${imageName}:`, error);
        return false;
    }
}

/**
 * Загрузка специального изображения share.png для Open Graph
 * @param {string} appId - ID приложения
 * @returns {Promise<boolean>} Успешность загрузки
 */
async function uploadShareImage(appId) {
    console.log(`Загрузка share-изображения для Open Graph для приложения ${appId}...`);

    const appSourceDir = path.join(appsDir, appId);

    if (!await fs.exists(appSourceDir)) {
        console.error(`Директория приложения не найдена: ${appSourceDir}`);
        return false;
    }

    // Проверяем наличие файла share.png
    const shareFilePath = path.join(appSourceDir, 'share.png');

    if (!await fs.exists(shareFilePath)) {
        console.error(`Файл share.png не найден в директории приложения: ${appSourceDir}`);
        console.log(`Для корректного отображения Open Graph создайте файл share.png размером не менее 1200x630px`);
        return false;
    }

    try {
        const appDestFolder = `${cloudinaryManager.CLOUDINARY_ROOT_FOLDER}/apps/${appId}`;

        // Создаем папку для приложения, если ее нет
        await cloudinaryManager.createFolder(appDestFolder);

        // Загружаем файл
        const result = await cloudinaryManager.uploadFile(shareFilePath, `${appDestFolder}/share`);

        if (result) {
            console.log(`✅ Share-изображение успешно загружено для приложения ${appId}`);
            console.log(`URL: ${result.secure_url}`);
            return true;
        } else {
            console.error(`❌ Ошибка при загрузке share-изображения`);
            return false;
        }
    } catch (error) {
        console.error(`Ошибка при загрузке share-изображения:`, error);
        return false;
    }
}

// Запускаем скрипт
main().catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
});