/**
 * Административный скрипт для управления приложением
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const cloudinary = require('cloudinary').v2;
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
                    'Загрузить бейджи на Cloudinary',
                    'Загрузить рамки устройств на Cloudinary',
                    'Загрузить изображения приложений',
                    'Инвалидировать кэш изображений в Cloudinary',
                    'Перезагрузить все изображения из assets',
                    'Выход'
                ]
            }
        ]);
        
        switch (operation) {
            case 'Загрузить бейджи на Cloudinary':
                await uploadBadges();
                break;
            case 'Загрузить рамки устройств на Cloudinary':
                await uploadBezels();
                break;
            case 'Загрузить изображения приложений':
                await uploadAppImages();
                break;
            case 'Инвалидировать кэш изображений в Cloudinary':
                await invalidateCache();
                break;
            case 'Перезагрузить все изображения из assets':
                await uploadAllAssets();
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
 * Загрузка изображений приложений на Cloudinary
 */
async function uploadAppImages() {
    console.log('Загрузка изображений приложений на Cloudinary...');
    
    // Выводим подменю для выбора операции
    const { subOperation } = await inquirer.prompt([
        {
            type: 'list',
            name: 'subOperation',
            message: 'Выберите операцию:',
            choices: [
                'Загрузить все изображения для приложения (перезаписать существующие)',
                'Загрузить только скриншоты для приложения (перезаписать существующие)',
                'Загрузить только новые скриншоты для приложения',
                'Назад'
            ]
        }
    ]);
    
    if (subOperation === 'Назад') {
        return;
    }
    
    // Получаем список папок приложений
    const appFolders = await getAppDirectories();
    
    if (appFolders.length === 0) {
        console.error('Нет доступных приложений');
        return;
    }
    
    // Выбираем приложение
    const { selectedApp } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedApp',
            message: 'Выберите приложение:',
            choices: appFolders
        }
    ]);
    
    // Проверяем существование папки с изображениями приложения
    const appDir = path.join(appsDir, selectedApp);
    
    if (!await fs.exists(appDir)) {
        console.error(`Директория для приложения ${selectedApp} не найдена`);
        return;
    }
    
    // Выполняем выбранную операцию
    switch (subOperation) {
        case 'Загрузить все изображения для приложения (перезаписать существующие)':
            const { confirmAll } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirmAll',
                    message: `Все существующие изображения для приложения ${selectedApp} будут удалены и заменены новыми. Продолжить?`,
                    default: false
                }
            ]);
            
            if (!confirmAll) {
                console.log('Операция отменена');
                return;
            }
            
            console.log(`Удаление существующих ресурсов для приложения ${selectedApp}...`);
            await cloudinaryManager.deleteAppFolder(selectedApp);
            
            console.log(`Загрузка всех ресурсов для приложения ${selectedApp}...`);
            const success = await cloudinaryManager.uploadAppAssets(selectedApp, appsDir);
            
            if (success) {
                console.log(`Все изображения для приложения ${selectedApp} успешно загружены`);
            } else {
                console.error(`При загрузке изображений для приложения ${selectedApp} произошли ошибки`);
            }
            break;
            
        case 'Загрузить только скриншоты для приложения (перезаписать существующие)':
        case 'Загрузить только новые скриншоты для приложения':
            const mode = subOperation.includes('новые') ? UPLOAD_MODES.NEW_ONLY : UPLOAD_MODES.ALL;
            const screenshotsDir = path.join(appDir, 'screenshots');
            
            if (!await fs.exists(screenshotsDir)) {
                console.error(`Директория скриншотов для приложения ${selectedApp} не найдена`);
                return;
            }
            
            if (mode === UPLOAD_MODES.ALL) {
                const { confirmScreenshots } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirmScreenshots',
                        message: `Все существующие скриншоты для приложения ${selectedApp} будут перезаписаны. Продолжить?`,
                        default: false
                    }
                ]);
                
                if (!confirmScreenshots) {
                    console.log('Операция отменена');
                    return;
                }
            }
            
            console.log(`Загрузка скриншотов для приложения ${selectedApp}...`);
            const count = await cloudinaryManager.uploadAppScreenshots(selectedApp, screenshotsDir, mode);
            console.log(`Загрузка скриншотов завершена. Загружено: ${count}`);
            break;
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
            choices: folders.map(folder => ({
                name: `${folder.name} (${folder.path})`,
                value: folder.path
            }))
        }
    ]);
    
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
    await cloudinaryManager.uploadBadges(badgesDir);
    
    // Загружаем рамки устройств
    console.log('\n=== Загрузка рамок устройств ===');
    await cloudinaryManager.uploadDeviceBezels(bezelsDir, UPLOAD_MODES.ALL);
    
    // Получаем список всех папок приложений
    console.log('\n=== Загрузка ресурсов приложений ===');
    try {
        // Получаем список директорий приложений
        const appDirs = await getAppDirectories();
        
        console.log(`Найдено ${appDirs.length} папок с приложениями`);
        
        // Для каждого приложения удаляем и заново загружаем ассеты
        for (const appFolder of appDirs) {
            console.log(`\nПерезагрузка ассетов для приложения ${appFolder}...`);
            
            // Сначала удаляем папку с изображениями приложения
            await cloudinaryManager.deleteAppFolder(appFolder);
            
            // Затем загружаем ассеты заново
            await cloudinaryManager.uploadAppAssets(appFolder, appsDir);
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

// Запускаем скрипт
main().catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
});