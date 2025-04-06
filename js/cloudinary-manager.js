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
 * @param {boolean} cleanExisting - Удалить существующие файлы перед загрузкой
 * @returns {Promise<boolean>} Успешность загрузки
 */
async function uploadBadges(badgesDir, cleanExisting = true) {
    try {
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
        
        // Создаем базовые папки
        await createFolder(CLOUDINARY_ROOT_FOLDER);
        await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps`);
        await createFolder(appDestFolder);
        
        // Получаем список всех файлов в директории приложения (включая поддиректории)
        const allFiles = await getAllFiles(appSourceDir);
        
        // Фильтруем только изображения
        const imageFiles = allFiles.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return IMAGE_EXTENSIONS.includes(ext);
        });
        
        console.log(`Найдено ${imageFiles.length} файлов изображений для загрузки`);
        
        // Результаты загрузки
        const result = {
            appIcon: false,
            preview: false,
            screenshots: {
                light: [],
                dark: []
            },
            otherImages: [],
            errors: []
        };
        
        // Загружаем иконку приложения
        const iconFiles = imageFiles.filter(file => 
            (path.basename(file) === 'icon.png' || path.basename(file) === 'app-icon.png') && 
            path.dirname(file) === appSourceDir
        );
        
        if (iconFiles.length > 0) {
            const iconFile = iconFiles[0];
            const uploadResult = await uploadFile(
                iconFile, 
                `${appDestFolder}/icon`,
                { transformation: [{ width: 128, height: 128, crop: 'fill' }] }
            );
            
            if (uploadResult) {
                console.log(`✅ Загружена иконка приложения: ${path.basename(iconFile)}`);
                result.appIcon = uploadResult.secure_url;
            } else {
                console.error(`❌ Ошибка при загрузке иконки приложения: ${path.basename(iconFile)}`);
                result.errors.push(`Ошибка при загрузке иконки: ${path.basename(iconFile)}`);
            }
        } else {
            console.warn(`⚠️ Иконка приложения не найдена для ${appId}`);
        }
        
        // Загружаем превью приложения
        const previewFiles = imageFiles.filter(file => 
            path.basename(file) === 'preview.png' && 
            path.dirname(file) === appSourceDir
        );
        
        if (previewFiles.length > 0) {
            const previewFile = previewFiles[0];
            const uploadResult = await uploadFile(previewFile, `${appDestFolder}/preview`);
            
            if (uploadResult) {
                console.log(`✅ Загружено превью приложения: ${path.basename(previewFile)}`);
                result.preview = uploadResult.secure_url;
            } else {
                console.error(`❌ Ошибка при загрузке превью приложения: ${path.basename(previewFile)}`);
                result.errors.push(`Ошибка при загрузке превью: ${path.basename(previewFile)}`);
            }
        } else {
            console.warn(`⚠️ Превью приложения не найдено для ${appId}`);
        }
        
        // Находим все скриншоты
        const screenshotFiles = imageFiles.filter(file => {
            const fileName = path.basename(file);
            return fileName.startsWith('app-screen') && 
                  (path.dirname(file) === appSourceDir || 
                   path.dirname(file) === path.join(appSourceDir, 'screenshots'));
        });
        
        if (screenshotFiles.length > 0) {
            console.log(`Найдено ${screenshotFiles.length} скриншотов для загрузки`);
            
            // Создаем папку screenshots, если нужно
            const screenshotsInSubdir = screenshotFiles.some(file => 
                path.dirname(file) === path.join(appSourceDir, 'screenshots')
            );
            
            // Сортируем скриншоты по имени файла (чтобы сохранить порядок)
            screenshotFiles.sort((a, b) => {
                return path.basename(a).localeCompare(path.basename(b));
            });
            
            // Загружаем каждый скриншот
            for (const screenshotFile of screenshotFiles) {
                const fileName = path.basename(screenshotFile, path.extname(screenshotFile));
                const isDarkMode = fileName.includes('-dark');
                const publicId = screenshotsInSubdir
                    ? `${appDestFolder}/screenshots/${fileName}`
                    : `${appDestFolder}/${fileName}`;
                
                const uploadResult = await uploadFile(screenshotFile, publicId);
                
                if (uploadResult) {
                    console.log(`✅ Загружен скриншот: ${fileName}`);
                    
                    if (isDarkMode) {
                        result.screenshots.dark.push({
                            name: fileName,
                            url: uploadResult.secure_url
                        });
                    } else {
                        result.screenshots.light.push({
                            name: fileName,
                            url: uploadResult.secure_url
                        });
                    }
                } else {
                    console.error(`❌ Ошибка при загрузке скриншота: ${fileName}`);
                    result.errors.push(`Ошибка при загрузке скриншота: ${fileName}`);
                }
            }
        } else {
            console.warn(`⚠️ Скриншоты не найдены для ${appId}`);
        }
        
        // Загружаем прочие изображения, если они есть
        const otherImages = imageFiles.filter(file => {
            const fileName = path.basename(file);
            return !fileName.startsWith('app-screen') && 
                   fileName !== 'icon.png' && 
                   fileName !== 'app-icon.png' &&
                   fileName !== 'preview.png';
        });
        
        if (otherImages.length > 0) {
            console.log(`Найдено ${otherImages.length} дополнительных изображений для загрузки`);
            
            for (const imageFile of otherImages) {
                const relativePath = path.relative(appSourceDir, imageFile);
                const fileDir = path.dirname(relativePath);
                const fileName = path.basename(imageFile, path.extname(imageFile));
                
                // Создаем подпапки, если нужно
                let publicId;
                if (fileDir === '.') {
                    publicId = `${appDestFolder}/${fileName}`;
                } else {
                    // Заменяем обратные слэши на прямые для Windows
                    const dirPath = fileDir.replace(/\\/g, '/');
                    await createFolder(`${appDestFolder}/${dirPath}`);
                    publicId = `${appDestFolder}/${dirPath}/${fileName}`;
                }
                
                const uploadResult = await uploadFile(imageFile, publicId);
                
                if (uploadResult) {
                    console.log(`✅ Загружено дополнительное изображение: ${relativePath}`);
                    result.otherImages.push({
                        name: relativePath,
                        url: uploadResult.secure_url
                    });
                } else {
                    console.error(`❌ Ошибка при загрузке дополнительного изображения: ${relativePath}`);
                    result.errors.push(`Ошибка при загрузке дополнительного изображения: ${relativePath}`);
                }
            }
        }
        
        // Итоговая статистика
        const totalFiles = (result.appIcon ? 1 : 0) + 
                          (result.preview ? 1 : 0) + 
                          result.screenshots.light.length + 
                          result.screenshots.dark.length + 
                          result.otherImages.length;
        
        console.log(`\n=== Итоги загрузки для ${appId} ===`);
        console.log(`✅ Успешно загружено файлов: ${totalFiles}`);
        console.log(`❌ Ошибок загрузки: ${result.errors.length}`);
        console.log(`📱 Скриншотов (светлая тема): ${result.screenshots.light.length}`);
        console.log(`🌙 Скриншотов (темная тема): ${result.screenshots.dark.length}`);
        console.log(`🖼️ Дополнительных изображений: ${result.otherImages.length}`);
        
        return result;
    } catch (error) {
        console.error(`Ошибка при загрузке ассетов для ${appId}:`, error.message);
        return {
            success: false,
            error: error.message,
            appIcon: false,
            preview: false,
            screenshots: { light: [], dark: [] },
            otherImages: [],
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

module.exports = {
    CLOUDINARY_ROOT_FOLDER,
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
    getAllFiles
};