const cloudinary = require('cloudinary').v2;
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Конфигурация Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Разрешенные расширения изображений
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

/**
 * Корневая папка для всех ресурсов на Cloudinary
 */
const CLOUDINARY_ROOT_FOLDER = 'website';

/**
 * Корневая папка для всех ресурсов на Cloudinary
 */
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME; 
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`;
const ASSET_VERSION = 'v2'; // Новая константа версионирования

/**
 * Фильтрация файлов изображений из списка файлов
 * @param {Array<string>} files - Список файлов
 * @returns {Array<string>} Отфильтрованный список файлов изображений
 */
function filterImageFiles(files) {
    return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return IMAGE_EXTENSIONS.includes(ext) && file !== '.DS_Store';
    });
}

/**
 * Получение существующих ресурсов из папки Cloudinary
 * @param {string} folderPath - Путь к папке в Cloudinary
 * @returns {Promise<Array<object>>} Массив объектов с информацией о ресурсах
 */
async function getExistingResources(folderPath) {
    try {
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: folderPath,
            max_results: 500
        });
        return result.resources;
    } catch (error) {
        console.error(`Ошибка при получении ресурсов из папки ${folderPath}:`, error.message);
        return [];
    }
}

/**
 * Создание папки в Cloudinary
 * @param {string} folderName - Имя папки
 * @returns {Promise<boolean>} Успешность создания папки
 */
async function createFolder(folderName) {
    try {
        // Проверяем, содержит ли имя папки вложенные пути
        if (folderName.includes('/')) {
            // Разбиваем путь на компоненты
            const parts = folderName.split('/');
            let currentPath = '';
            
            // Создаем каждую папку по пути
            for (const part of parts) {
                if (!part) continue; // Пропускаем пустые части (например, если путь начинается с /)
                
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                
                try {
                    await cloudinary.api.create_folder(currentPath);
                } catch (subError) {
                    // Если папка уже существует, продолжаем без вывода сообщений
                    if (!subError.error || !subError.error.message.includes('Folder already exists')) {
                        console.error(`Ошибка при создании папки ${currentPath}:`, subError.message);
                    }
                }
            }
            return true;
        } else {
            // Создаем одиночную папку
            try {
                await cloudinary.api.create_folder(folderName);
                return true;
            } catch (error) {
                // Если папка уже существует, не считаем это ошибкой
                if (error.error && error.error.message.includes('Folder already exists')) {
                    return true;
                }
                console.error(`Ошибка при создании папки ${folderName}:`, error.message);
                return false;
            }
        }
    } catch (error) {
        console.error(`Ошибка при создании папки ${folderName}:`, error.message);
        return false;
    }
}

/**
 * Удаление папки в Cloudinary вместе со всем содержимым
 * @param {string} folderName - Имя папки
 * @returns {Promise<boolean>} Успешность удаления папки
 */
async function deleteFolder(folderName) {
    try {
        await cloudinary.api.delete_folder(folderName);
        console.log(`Удалена папка: ${folderName}`);
        return true;
    } catch (error) {
        console.error(`Ошибка при удалении папки ${folderName}:`, error.message);
        return false;
    }
}

/**
 * Удаление файла в Cloudinary
 * @param {string} publicId - Публичный ID файла
 * @returns {Promise<boolean>} Успешность удаления файла
 */
async function deleteFile(publicId) {
    try {
        await cloudinary.uploader.destroy(publicId);
        return true;
    } catch (error) {
        console.error(`Ошибка при удалении файла ${publicId}:`, error.message);
        return false;
    }
}

/**
 * Удаление всех ресурсов из папки
 * @param {string} folderPath - Путь к папке в Cloudinary
 * @returns {Promise<boolean>} Успешность удаления ресурсов
 */
async function deleteFolderContents(folderPath) {
    try {
        const resources = await getExistingResources(folderPath);
        
        if (resources.length === 0) {
            console.log(`Папка ${folderPath} пуста или не существует`);
            return true;
        }
        
        console.log(`Удаление ${resources.length} ресурсов из папки ${folderPath}...`);
        
        for (const resource of resources) {
            await deleteFile(resource.public_id);
        }
        
        console.log(`Удалено ${resources.length} ресурсов из папки ${folderPath}`);
        return true;
    } catch (error) {
        console.error(`Ошибка при удалении ресурсов из папки ${folderPath}:`, error.message);
        return false;
    }
}

/**
 * Загрузка файла на Cloudinary
 * @param {string} filePath - Путь к локальному файлу
 * @param {string} publicId - Публичный ID для файла на Cloudinary
 * @param {object} options - Дополнительные опции загрузки
 * @returns {Promise<object|null>} Результат загрузки или null в случае ошибки
 */
async function uploadFile(filePath, publicId, options = {}) {
    try {
        console.log(`Загрузка файла ${filePath} с publicId ${publicId}...`);
        
        // Извлекаем путь к папке из publicId
        const lastSlashIndex = publicId.lastIndexOf('/');
        const folderPath = lastSlashIndex !== -1 ? publicId.substring(0, lastSlashIndex) : '';
        const actualPublicId = lastSlashIndex !== -1 ? publicId.substring(lastSlashIndex + 1) : publicId;
        
        // Если есть путь к папке, создаем папку перед загрузкой
        if (folderPath) {
            await createFolder(folderPath);
        }
        
        const uploadOptions = {
            public_id: actualPublicId,
            overwrite: true,
            ...options
        };
        
        // Если есть путь к папке, добавляем его в опции
        if (folderPath) {
            uploadOptions.folder = folderPath;
        }
        
        const result = await cloudinary.uploader.upload(filePath, uploadOptions);
        
        console.log(`Успешно загружен файл. URL: ${result.secure_url}, PublicId: ${result.public_id}`);
        return result;
    } catch (error) {
        console.error(`Ошибка при загрузке файла ${filePath}:`, error.message);
        return null;
    }
}

/**
 * Загрузка бейджей на Cloudinary
 * @param {string} badgesDir - Путь к локальной директории с бейджами
 * @param {boolean} cleanExisting - Удалить существующие файлы перед загрузкой
 * @returns {Promise<boolean>} Успешность загрузки
 */
async function uploadBadges(badgesDir, cleanExisting = true) {
    try {
        console.log(`Проверка директории бейджей: ${badgesDir}`);
        console.log(`Директория существует: ${await fs.exists(badgesDir)}`);
        
        // Создаем папку для бейджей
        const badgesFolder = `${CLOUDINARY_ROOT_FOLDER}/badges`;
        await createFolder(badgesFolder);
        
        // Если нужно, удаляем существующие файлы
        if (cleanExisting) {
            console.log('Удаление существующих бейджей...');
            await deleteFolderContents(badgesFolder);
        }
        
        // Получаем список файлов бейджей
        const badgeFiles = await fs.readdir(badgesDir);
        console.log(`Всего файлов в директории: ${badgeFiles.length}`);
        console.log(`Файлы в директории: ${badgeFiles.join(', ')}`);
        
        const imageFiles = filterImageFiles(badgeFiles);
        
        console.log(`Найдено ${imageFiles.length} файлов бейджей для загрузки`);
        console.log(`Отфильтрованные файлы: ${imageFiles.join(', ')}`);
        
        // Загружаем каждый бейдж
        let uploadedCount = 0;
        for (const file of imageFiles) {
            const filePath = path.join(badgesDir, file);
            const fileName = path.parse(file).name;
            const publicId = `${badgesFolder}/${fileName}`;
            
            console.log(`Загрузка файла: ${filePath}`);
            console.log(`Файл существует: ${await fs.exists(filePath)}`);
            
            const result = await uploadFile(filePath, publicId);
            if (result) {
                uploadedCount++;
                console.log(`Загружен бейдж: ${file}`);
            }
        }
        
        console.log(`Загружено ${uploadedCount} из ${imageFiles.length} бейджей`);
        return true;
    } catch (error) {
        console.error('Ошибка при загрузке бейджей:', error.message);
        return false;
    }
}

/**
 * Загрузка рамок устройств на Cloudinary
 * @param {string} bezelsDir - Путь к локальной директории с рамками
 * @param {number} mode - Режим загрузки (0: все, 1: конкретный файл, 2: только новые)
 * @param {string|null} specificFile - Имя конкретного файла для загрузки (при mode=1)
 * @returns {Promise<number>} Количество загруженных файлов
 */
async function uploadDeviceBezels(bezelsDir, mode = 0, specificFile = null) {
    try {
        // Создаем папку для рамок устройств
        const bezelsFolder = `${CLOUDINARY_ROOT_FOLDER}/product-bezels`;
        await createFolder(bezelsFolder);
        
        // Удаляем существующие файлы ТОЛЬКО если выбран режим "все" (mode === 0)
        if (mode === 0) {
            console.log('Удаление существующих рамок устройств...');
            await deleteFolderContents(bezelsFolder);
        }
        
        // Если загружаем конкретный файл
        if (mode === 1 && specificFile) {
            const filePath = path.join(bezelsDir, specificFile);
            const fileName = path.parse(specificFile).name;
            const publicId = `${bezelsFolder}/${fileName}`;
            
            const result = await uploadFile(filePath, publicId);
            console.log(result ? `Файл ${specificFile} успешно загружен` : `Ошибка при загрузке файла ${specificFile}`);
            return result ? 1 : 0;
        }
        
        // Получаем список файлов рамок
        const bezelFiles = await fs.readdir(bezelsDir);
        const imageFiles = filterImageFiles(bezelFiles);
        
        console.log(`Найдено ${imageFiles.length} файлов рамок для загрузки`);
        
        // Если загружаем только новые файлы, получаем список существующих
        let existingFiles = [];
        if (mode === 2) {
            const resources = await getExistingResources(bezelsFolder);
            existingFiles = resources.map(res => {
                const parts = res.public_id.split('/');
                return parts[parts.length - 1];
            });
            console.log(`Найдено ${existingFiles.length} существующих файлов на Cloudinary`);
        }
        
        // Загружаем каждую рамку (в режимах 0 - все или 2 - только новые)
        let uploadedCount = 0;
        for (const file of imageFiles) {
            // Пропускаем загрузку, если это режим "только новые" и файл существует
            if (mode === 2) {
                const fileNameWithoutExt = path.parse(file).name;
                if (existingFiles.includes(fileNameWithoutExt)) {
                    console.log(`Пропуск существующего файла: ${file}`);
                    continue;
                }
            }
            
            // Загружаем файл, если это режим "все" (0) или файл новый (в режиме 2)
            if (mode === 0 || mode === 2) {
                const filePath = path.join(bezelsDir, file);
                const fileName = path.parse(file).name;
                const publicId = `${bezelsFolder}/${fileName}`;
                
                const result = await uploadFile(filePath, publicId);
                if (result) {
                    uploadedCount++;
                    console.log(`Загружена рамка: ${file}`);
                }
            }
        }
        
        console.log(`Загружено ${uploadedCount} рамок устройств`);
        return uploadedCount;
    } catch (error) {
        console.error('Ошибка при загрузке рамок устройств:', error.message);
        return 0;
    }
}

/**
 * Удаление папки приложения в Cloudinary
 * @param {string} appId - ID приложения
 * @returns {Promise<boolean>} Успешность удаления
 */
async function deleteAppFolder(appId) {
    const appFolder = `${CLOUDINARY_ROOT_FOLDER}/apps/${appId}`;
    return await deleteFolderContents(appFolder);
}

/**
 * Загрузка ассетов приложения на Cloudinary с детектированием структуры директории
 * @param {string} appId - ID приложения
 * @param {string} appsDir - Путь к локальной директории с приложениями
 * @param {boolean} cleanExisting - Удалять существующие ресурсы перед загрузкой
 * @param {object} options - Дополнительные опции загрузки
 * @returns {Promise<object>} Результат загрузки с информацией о загруженных файлах
 */
async function smartUploadAppAssets(appId, appsDir, cleanExisting = true, options = {}) {
    try {
        console.log(`Загрузка ассетов для приложения ${appId}...`);
        
        const appSourceDir = path.join(appsDir, appId);
        const appDestFolder = `${CLOUDINARY_ROOT_FOLDER}/apps/${appId}`;
        
        // Проверяем существование директории приложения
        if (!await fs.exists(appSourceDir)) {
            throw new Error(`Директория приложения не найдена: ${appSourceDir}`);
        }
        
        // Если нужно, удаляем существующую папку приложения
        if (cleanExisting) {
            console.log(`Удаление существующих ресурсов для приложения ${appId}...`);
            await deleteAppFolder(appId);
        }
        
        // Создаем базовую папку приложения один раз для всех файлов
        await createFolder(appDestFolder);
        
        // Получаем только файлы из корневой директории приложения (без поддиректорий)
        const files = await fs.readdir(appSourceDir);
        
        // Фильтруем только изображения
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return IMAGE_EXTENSIONS.includes(ext) && file !== '.DS_Store';
        });
        
        console.log(`Найдено ${imageFiles.length} файлов изображений в корневой папке для загрузки`);
        
        // Результаты загрузки
        const result = {
            total: 0,
            failed: 0,
            success: 0,
            errors: []
        };
        
        // Создаем объект uploadOptions с указанием папки, для избежания повторного создания
        const uploadOptions = {
            folder: appDestFolder,
            overwrite: true,
            ...options
        };
        
        // Загружаем каждое изображение с сохранением исходного имени
        for (const file of imageFiles) {
            const filePath = path.join(appSourceDir, file);
            const fileName = path.parse(file).name;
            
            // Загружаем файл напрямую с указанием папки
            try {
                const result = await cloudinary.uploader.upload(filePath, {
                    public_id: fileName,
                    ...uploadOptions
                });
                
                console.log(`✅ Загружен файл: ${file}`);
                result.success++;
            } catch (error) {
                console.error(`❌ Ошибка при загрузке файла: ${file}`, error.message);
                result.errors.push(`Ошибка при загрузке файла: ${file}`);
                result.failed++;
            }
            
            result.total++;
        }
        
        // Итоговая статистика
        console.log(`\n=== Итоги загрузки для ${appId} ===`);
        console.log(`✅ Успешно загружено файлов: ${result.success}`);
        console.log(`❌ Ошибок загрузки: ${result.failed}`);
        
        if (result.errors.length > 0) {
            console.error('\nСписок ошибок:');
            result.errors.forEach((error, index) => {
                console.error(`${index + 1}. ${error}`);
            });
        }
        
        return result;
    } catch (error) {
        console.error(`Ошибка при загрузке ассетов для ${appId}:`, error.message);
        return {
            success: 0,
            failed: 0,
            total: 0,
            errors: [error.message]
        };
    }
}

/**
 * Рекурсивное получение всех файлов в директории и поддиректориях
 * @param {string} dir - Путь к директории
 * @returns {Promise<Array<string>>} Список путей ко всем файлам
 */
async function getAllFiles(dir) {
    const files = await fs.readdir(dir);
    const result = [];
    
    for (const file of files) {
        if (file === '.DS_Store') continue;
        
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
            const subFiles = await getAllFiles(filePath);
            result.push(...subFiles);
        } else {
            result.push(filePath);
        }
    }
    
    return result;
}

/**
 * Получение списка директорий приложений
 * @param {string} appsDir - Путь к директории приложений
 * @returns {Promise<Array<string>>} Список имен директорий приложений
 */
async function getAppDirectories(appsDir) {
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
 * Генерирует URL для изображения из Cloudinary
 * @param {string} appId - ID приложения
 * @param {string} imageName - Имя изображения (например, 'app-icon', 'app-screen-1')
 * @param {string} extension - Расширение файла (например, 'png', 'jpg')
 * @param {boolean} isDarkMode - Флаг темного режима
 * @returns {string} Полный URL к изображению в Cloudinary
 */
function getCloudinaryImageUrl(appId, imageName, extension = 'png', isDarkMode = false) {
    // Добавляем суффикс темного режима, если нужно
    const darkModeSuffix = isDarkMode ? '-dark' : '';
    const fileName = `${imageName}${darkModeSuffix}`;
    
    // Добавляем трансформации для иконок приложений (128px)
    let transformations = '';
    if (imageName === 'app-icon') {
        transformations = 'w_128,h_128,c_fill/';
    }
    
    // Структура пути в Cloudinary: /website/apps/{appId}/{fileName}
    return `${CLOUDINARY_BASE_URL}/image/upload/${transformations}${ASSET_VERSION}/${CLOUDINARY_ROOT_FOLDER}/apps/${appId}/${fileName}`;
}

/**
 * Получает URL для шэринг-изображения приложения
 * @param {string} appId - ID приложения
 * @returns {string} URL изображения для шэринга
 */
function getShareImageUrl(appId) {
    return `${CLOUDINARY_BASE_URL}/image/upload/${ASSET_VERSION}/${CLOUDINARY_ROOT_FOLDER}/apps/${appId}/share`;
}

/**
 * Получает URL для бейджа App Store
 * @param {boolean} isDarkMode - Флаг темного режима
 * @returns {string} URL бейджа App Store
 */
function getAppStoreBadgeUrl(isDarkMode = false) {
    const badgeName = isDarkMode 
        ? 'download-on-the-app-store-badge-white' 
        : 'download-on-the-app-store-badge-black';
    
    return `${CLOUDINARY_BASE_URL}/image/upload/${ASSET_VERSION}/${CLOUDINARY_ROOT_FOLDER}/badges/${badgeName}`;
}

/**
 * Получает URL для рамки устройства из Cloudinary
 * @param {string} deviceModel - Модель устройства (например, 'iPhone 16 Pro Max')
 * @returns {string} URL рамки устройства
 */
function getDeviceBezelUrl(deviceModel) {
    // Получаем имя файла из маппинга app.js или генерируем его из имени устройства
    // Маппинг определен в app.js в объекте DEVICE_BEZEL_FILES
    let fileName;
    
    // Если функция вызывается из браузера и доступен глобальный объект window.DEVICE_BEZEL_FILES
    if (typeof window !== 'undefined' && window.DEVICE_BEZEL_FILES) {
        fileName = window.DEVICE_BEZEL_FILES[deviceModel];
    }
    
    // Если имя файла не найдено, генерируем его из модели устройства
    if (!fileName) {
        fileName = deviceModel.toLowerCase().replace(/ /g, '-') + '-natural-titanium-portrait';
    }
    
    // Структура пути в Cloudinary: /website/product-bezels/{fileName}.png
    // Указываем расширение .png, так как файлы загружаются как png
    return `${CLOUDINARY_BASE_URL}/image/upload/${ASSET_VERSION}/${CLOUDINARY_ROOT_FOLDER}/product-bezels/${fileName}.png`;
}

// Экспортируем функции для использования в браузере
if (typeof window !== 'undefined') {
    window.getCloudinaryImageUrl = getCloudinaryImageUrl;
    window.getAppStoreBadgeUrl = getAppStoreBadgeUrl;
    window.getShareImageUrl = getShareImageUrl;
    window.getDeviceBezelUrl = getDeviceBezelUrl;
}

module.exports = {
    CLOUDINARY_ROOT_FOLDER,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_BASE_URL,
    ASSET_VERSION,
    filterImageFiles,
    getExistingResources,
    createFolder,
    deleteFolder,
    deleteFile,
    deleteFolderContents,
    uploadFile,
    uploadBadges,
    uploadDeviceBezels,
    deleteAppFolder,
    smartUploadAppAssets,
    getAllFiles,
    getAppDirectories,
    getCloudinaryImageUrl,
    getAppStoreBadgeUrl,
    getShareImageUrl,
    getDeviceBezelUrl
};