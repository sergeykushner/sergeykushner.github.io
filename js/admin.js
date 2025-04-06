/**
 * Административный скрипт для управления приложением
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const cloudinaryManager = require('./cloudinary-manager');
const { exec } = require('child_process');

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
 * Точка входа в административный скрипт
 */
async function main() {
    try {
        console.log('=== Административный скрипт ===');
        
        // Выводим главное меню
        const { operation } = await inquirer.prompt([
            {
                type: 'list',
                name: 'operation',
                message: 'Выберите операцию:',
                choices: [
                    'Загрузка изображений приложений на Cloudinary',
                    'Загрузить бейджи на Cloudinary',
                    'Загрузить рамки устройств на Cloudinary',
                    'Инвалидировать кэш изображений в Cloudinary',
                    'Перезагрузить все изображения из assets на Cloudinary',
                    'Обновить публичный JSON',
                    'Выход'
                ]
            }
        ]);
        
        switch (operation) {
            case 'Загрузка изображений приложений на Cloudinary':
                await uploadAppImagesImproved();
                break;
            case 'Загрузить бейджи на Cloudinary':
                await uploadBadges();
                break;
            case 'Загрузить рамки устройств на Cloudinary':
                await uploadBezels();
                break;
            case 'Инвалидировать кэш изображений в Cloudinary':
                await invalidateCache();
                break;
            case 'Перезагрузить все изображения из assets на Cloudinary':
                await uploadAllAssets();
                break;
            case 'Обновить публичный JSON':
                await updatePublicJson();
                break;
            case 'Выход':
                console.log('Выход из скрипта');
                process.exit(0);
                break;
        }
        
        // После выполнения операции возвращаемся в главное меню
        await main();
    } catch (error) {
        console.error('Произошла ошибка:', error);
        process.exit(1);
    }
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
 */
async function uploadBezels() {
    console.log('Загрузка рамок устройств на Cloudinary...');
    
    if (!await fs.exists(bezelsDir)) {
        console.error('Директория с рамками устройств не найдена');
        return;
    }
    
    // Получаем опции загрузки
    const { mode } = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'Выберите режим загрузки:',
            choices: [
                { name: 'Загрузить все рамки (перезаписать существующие)', value: 'all' },
                { name: 'Загрузить конкретную рамку', value: 'specific' },
                { name: 'Загрузить только новые рамки', value: 'new' }
            ]
        }
    ]);
    
    let uploadMode = UPLOAD_MODES.ALL;
    let specificFile = null;
    
    if (mode === 'all') {
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
    } else if (mode === 'specific') {
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
    } else if (mode === 'new') {
        uploadMode = UPLOAD_MODES.NEW_ONLY;
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
    const appFolders = await getAppDirectories();
    
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
        
        console.log('\n====== Итоги загрузки всех приложений ======');
        console.log(`✅ Успешно загружено: ${results.success}`);
        console.log(`⚠️ Загружено с ошибками: ${results.failed}`);
        console.log(`⏭️ Пропущено: ${results.skipped}`);
        console.log('=========================================');
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
        const rootResult = await cloudinary.api.root_folders();
        
        // Ищем нашу основную папку сайта
        const websiteFolder = rootResult.folders.find(folder => folder.path === cloudinaryManager.CLOUDINARY_ROOT_FOLDER);
        
        if (!websiteFolder) {
            console.error(`Папка ${cloudinaryManager.CLOUDINARY_ROOT_FOLDER} не найдена в Cloudinary`);
            return [];
        }
        
        // Получаем список подпапок внутри основной папки
        const subFoldersResult = await cloudinary.api.sub_folders(cloudinaryManager.CLOUDINARY_ROOT_FOLDER);
        
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
    if (!await fs.exists(appsDir)) {
        console.error('Директория apps не найдена');
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
 * Функция для выполнения команды и возврата результата в виде промиса
 * @param {string} command - Команда для выполнения
 * @returns {Promise<string>} Результат выполнения команды
 */
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        console.log(`Выполняется команда: ${command}`);
        
        exec(command, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Ошибка: ${error.message}`);
                reject(error);
                return;
            }
            
            if (stderr) {
                console.error(`Ошибка: ${stderr}`);
            }
            
            console.log(`Результат: ${stdout}`);
            resolve(stdout);
        });
    });
}

/**
 * Обновление публичного JSON с метаданными приложений
 */
async function updatePublicJson() {
    try {
        console.log('Запуск генерации публичной версии apps-metadata.json...');
        await executeCommand('./js/update-public-json.sh');
        console.log('Публичная версия JSON успешно обновлена!');
    } catch (error) {
        console.error('Произошла ошибка при обновлении публичного JSON:', error);
    }
}

// Запускаем скрипт
main().catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
});