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
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

/**
 * Корневая папка для всех ресурсов на Cloudinary
 */
const CLOUDINARY_ROOT_FOLDER = 'website';

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
                console.log(`Создание вложенной папки: ${currentPath}`);
                
                try {
                    await cloudinary.api.create_folder(currentPath);
                    console.log(`Создана вложенная папка: ${currentPath}`);
                } catch (subError) {
                    // Если папка уже существует, продолжаем
                    if (subError.error && subError.error.message.includes('Folder already exists')) {
                        console.log(`Вложенная папка ${currentPath} уже существует`);
                    } else {
                        console.error(`Ошибка при создании вложенной папки ${currentPath}:`, subError.message);
                        // Продолжаем создание других папок
                    }
                }
            }
            return true;
        } else {
            // Создаем одиночную папку
            console.log(`Создание папки: ${folderName}`);
            await cloudinary.api.create_folder(folderName);
            console.log(`Создана папка: ${folderName}`);
            return true;
        }
    } catch (error) {
        // Если папка уже существует, не считаем это ошибкой
        if (error.error && error.error.message.includes('Folder already exists')) {
            console.log(`Папка ${folderName} уже существует`);
            return true;
        }
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
 * @returns {Promise<boolean>} Успешность загрузки
 */
async function uploadBadges(badgesDir) {
    try {
        // Создаем папку для бейджей
        const badgesFolder = `${CLOUDINARY_ROOT_FOLDER}/badges`;
        await createFolder(badgesFolder);
        
        // Получаем список файлов бейджей
        const badgeFiles = await fs.readdir(badgesDir);
        const imageFiles = filterImageFiles(badgeFiles);
        
        console.log(`Найдено ${imageFiles.length} файлов бейджей для загрузки`);
        
        // Загружаем каждый бейдж
        let uploadedCount = 0;
        for (const file of imageFiles) {
            const filePath = path.join(badgesDir, file);
            const fileName = path.parse(file).name;
            const publicId = `${badgesFolder}/${fileName}`;
            
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
        
        // Если не в режиме "только новые", сначала удаляем все существующие файлы из папки
        if (mode !== 2) {
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
        
        // Загружаем каждую рамку
        let uploadedCount = 0;
        for (const file of imageFiles) {
            const filePath = path.join(bezelsDir, file);
            const fileName = path.parse(file).name;
            const publicId = `${bezelsFolder}/${fileName}`;
            
            // Если режим "только новые" и файл уже существует, пропускаем
            if (mode === 2 && existingFiles.includes(fileName)) {
                console.log(`Пропуск существующего файла: ${file}`);
                continue;
            }
            
            const result = await uploadFile(filePath, publicId);
            if (result) {
                uploadedCount++;
                console.log(`Загружена рамка: ${file}`);
            }
        }
        
        console.log(`Загружено ${uploadedCount} из ${imageFiles.length} рамок устройств`);
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
 * Загрузка ассетов приложения на Cloudinary
 * @param {string} appId - ID приложения
 * @param {string} appsDir - Путь к локальной директории с приложениями
 * @returns {Promise<boolean>} Успешность загрузки
 */
async function uploadAppAssets(appId, appsDir) {
    try {
        const appSourceDir = path.join(appsDir, appId);
        const appDestFolder = `${CLOUDINARY_ROOT_FOLDER}/apps/${appId}`;
        
        // Создаем папку для приложения
        await createFolder(CLOUDINARY_ROOT_FOLDER);
        await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps`);
        await createFolder(appDestFolder);
        
        // Загружаем иконку
        const iconPath = path.join(appSourceDir, 'icon.png');
        if (await fs.exists(iconPath)) {
            await uploadFile(iconPath, `${appDestFolder}/icon`);
            console.log(`Загружена иконка для ${appId}`);
        } else {
            console.warn(`Иконка для ${appId} не найдена`);
        }
        
        // Загружаем превью
        const previewPath = path.join(appSourceDir, 'preview.png');
        if (await fs.exists(previewPath)) {
            await uploadFile(previewPath, `${appDestFolder}/preview`);
            console.log(`Загружено превью для ${appId}`);
        } else {
            console.warn(`Превью для ${appId} не найдено`);
        }
        
        // Загружаем скриншоты
        const screenshotsDir = path.join(appSourceDir, 'screenshots');
        if (await fs.exists(screenshotsDir)) {
            await uploadAppScreenshots(appId, screenshotsDir, 0); // Режим 0 - загрузить все
        } else {
            console.warn(`Скриншоты для ${appId} не найдены`);
        }
        
        return true;
    } catch (error) {
        console.error(`Ошибка при загрузке ассетов для ${appId}:`, error.message);
        return false;
    }
}

/**
 * Загрузка скриншотов приложения на Cloudinary
 * @param {string} appId - ID приложения
 * @param {string} screenshotsDir - Путь к локальной директории со скриншотами
 * @param {number} mode - Режим загрузки (0: все, 2: только новые)
 * @returns {Promise<number>} Количество загруженных файлов
 */
async function uploadAppScreenshots(appId, screenshotsDir, mode = 0) {
    try {
        // Создаем папку для скриншотов
        const appFolder = `${CLOUDINARY_ROOT_FOLDER}/apps/${appId}`;
        const screenshotsFolder = `${appFolder}/screenshots`;
        
        await createFolder(CLOUDINARY_ROOT_FOLDER);
        await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps`);
        await createFolder(appFolder);
        await createFolder(screenshotsFolder);
        
        // Получаем список файлов скриншотов
        const screenshotFiles = await fs.readdir(screenshotsDir);
        const imageFiles = filterImageFiles(screenshotFiles);
        
        console.log(`Найдено ${imageFiles.length} файлов скриншотов для загрузки`);
        
        // Если загружаем только новые файлы, получаем список существующих
        let existingFiles = [];
        if (mode === 2) {
            const resources = await getExistingResources(screenshotsFolder);
            existingFiles = resources.map(res => {
                const parts = res.public_id.split('/');
                return parts[parts.length - 1];
            });
            console.log(`Найдено ${existingFiles.length} существующих скриншотов на Cloudinary`);
        }
        
        // Загружаем каждый скриншот
        let uploadedCount = 0;
        for (const file of imageFiles) {
            const filePath = path.join(screenshotsDir, file);
            const fileName = path.parse(file).name;
            const publicId = `${screenshotsFolder}/${fileName}`;
            
            // Если режим "только новые" и файл уже существует, пропускаем
            if (mode === 2 && existingFiles.includes(fileName)) {
                console.log(`Пропуск существующего скриншота: ${file}`);
                continue;
            }
            
            const result = await uploadFile(filePath, publicId);
            if (result) {
                uploadedCount++;
                console.log(`Загружен скриншот: ${file}`);
            }
        }
        
        console.log(`Загружено ${uploadedCount} из ${imageFiles.length} скриншотов для ${appId}`);
        return uploadedCount;
    } catch (error) {
        console.error(`Ошибка при загрузке скриншотов для ${appId}:`, error.message);
        return 0;
    }
}

module.exports = {
    CLOUDINARY_ROOT_FOLDER,
    filterImageFiles,
    createFolder,
    deleteFolder,
    deleteFile,
    deleteFolderContents,
    uploadFile,
    uploadBadges,
    uploadDeviceBezels,
    deleteAppFolder,
    uploadAppAssets,
    uploadAppScreenshots
};