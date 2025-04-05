// Cloudinary конфигурация
const CLOUDINARY_CLOUD_NAME = 'dh1nrzlvo';
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`;
const CLOUDINARY_ROOT_FOLDER = 'website'; // Добавляем корневую папку

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
    return `${CLOUDINARY_BASE_URL}/image/upload/${transformations}v2/${CLOUDINARY_ROOT_FOLDER}/apps/${appId}/${fileName}`;
}

/**
 * Получает URL для шэринг-изображения приложения
 * @param {string} appId - ID приложения
 * @returns {string} URL изображения для шэринга
 */
function getShareImageUrl(appId) {
    return `${CLOUDINARY_BASE_URL}/image/upload/v1/${CLOUDINARY_ROOT_FOLDER}/apps/${appId}/share`;
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
    
    return `${CLOUDINARY_BASE_URL}/image/upload/v1/${CLOUDINARY_ROOT_FOLDER}/badges/${badgeName}`;
}

/**
 * Получает URL для рамки устройства из Cloudinary
 * @param {string} deviceModel - Модель устройства (например, 'iPhone 16 Pro Max')
 * @returns {string} URL рамки устройства
 */
function getDeviceBezelUrl(deviceModel) {
    // Преобразуем имя модели устройства в имя файла
    const fileName = deviceModel.toLowerCase().replace(/ /g, '-') + '-natural-titanium-portrait';
    
    // Структура пути в Cloudinary: /website/product-bezels/{fileName}
    return `${CLOUDINARY_BASE_URL}/image/upload/v2/${CLOUDINARY_ROOT_FOLDER}/product-bezels/${fileName}`;
}

/**
 * NODE.JS ФУНКЦИИ ДЛЯ ЗАГРУЗКИ ФАЙЛОВ НА CLOUDINARY
 * Для запуска:
 * 1. Установите необходимые зависимости: npm install cloudinary dotenv fs-extra
 * 2. Создайте файл .env с вашими учетными данными Cloudinary
 * 3. Запустите скрипт: node js/cloudinary.js
 */

// Следующий код выполняется только в Node.js среде
if (typeof require !== 'undefined') {
    const fs = require('fs-extra');
    const path = require('path');
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
    const cloudinary = require('cloudinary').v2;

    // Конфигурация Cloudinary
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Путь к директории с ассетами
    const assetsDir = path.join(__dirname, '../assets');

    // Массив уже загруженных приложений (чтобы не загружать их снова)
    const UPLOADED_APPS = [
        'habit-tracker',
        'pokemon-go-guide',
        'fit-advisor',
        'garden-crash',
        'girls-sp',
        'gym-assistant',
        'icecream-sp',
        'in-love',
        'lucky-diamonds',
        'margin-trading-calculator',
        'memes-sp',
        'movie-watchlist',
        'next-show',
        'nft-creator',
        'onion-sp',
        'open-sea-wallet-portfolio',
        'party-star',
        'pdf-resume-creator',
        'pears-sp',
        'period-tracker',
        'poker-1',
        'poker-2',
        'poker-dealer',
        'pomodoro-timer',
        'post-creator',
        'quit-smoking',
        'run-sunta',
        'santa-sp',
        'strawberry-sp',
        'strike-balls',
        'strikemoji',
        'template',
        'tetra-blocks-tower',
        'time-capsule',
        'truth-or-dare',
        'voice-advisor',
        'water-balance',
        'word-game-catch-letter',
        'word-game-woords',
        'xmas-abc-sp'
    ];

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

    // Функция для загрузки всех бейджей
    async function uploadBadges() {
        const badgesDir = path.join(assetsDir, 'badges');
        const badges = await fs.readdir(badgesDir);
        
        for (const badge of badges) {
            if (badge === '.DS_Store') continue; // Пропускаем системные файлы

            const filePath = path.join(badgesDir, badge);
            const stat = await fs.stat(filePath);
            
            if (stat.isFile()) {
                const fileName = path.parse(badge).name;
                await uploadFile(filePath, `badges/${fileName}`);
            }
        }
    }

    // Функция для загрузки ассетов для приложения
    async function uploadAppAssets(appId) {
        const appDir = path.join(assetsDir, 'apps', appId);
        
        if (!await fs.exists(appDir)) {
            console.log(`Директория для приложения ${appId} не найдена`);
            return;
        }
        
        // Создаем папку для приложения
        await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps/${appId}`);
        
        const files = await fs.readdir(appDir);
        
        for (const file of files) {
            if (file === '.DS_Store') continue; // Пропускаем системные файлы

            const filePath = path.join(appDir, file);
            const stat = await fs.stat(filePath);
            
            if (stat.isFile()) {
                const fileName = path.parse(file).name;
                await uploadFile(filePath, `apps/${appId}/${fileName}`);
            }
        }
    }

    // Функция для загрузки рамок устройств
    async function uploadDeviceBezels() {
        const bezelsDir = path.join(assetsDir, 'product-bezels');
        
        if (!await fs.exists(bezelsDir)) {
            console.log('Директория product-bezels не найдена');
            return;
        }
        
        // Создаем папку для рамок устройств
        await createFolder(`${CLOUDINARY_ROOT_FOLDER}/product-bezels`);
        
        const files = await fs.readdir(bezelsDir);
        
        for (const file of files) {
            if (file === '.DS_Store') continue; // Пропускаем системные файлы
            
            const filePath = path.join(bezelsDir, file);
            const stat = await fs.stat(filePath);
            
            if (stat.isFile()) {
                const fileName = path.parse(file).name;
                console.log(`Загрузка рамки устройства: ${fileName}`);
                await uploadFile(filePath, `product-bezels/${fileName}`);
            }
        }
        
        console.log('Все рамки устройств успешно загружены');
    }

    // Функция для обработки аргументов командной строки
    function parseArgs() {
        const args = process.argv.slice(2);
        return args;
    }

    // Main function
    async function main() {
        try {
            // Получаем аргументы командной строки
            const args = parseArgs();
            const command = args[0] || 'all';
            
            // Проверяем команду
            if (command === 'bezels') {
                // Загружаем только рамки устройств
                console.log("Загрузка только рамок устройств...");
                await createFolder(CLOUDINARY_ROOT_FOLDER);
                await createFolder(`${CLOUDINARY_ROOT_FOLDER}/product-bezels`);
                await uploadDeviceBezels();
                console.log("Загрузка рамок устройств завершена!");
                return;
            }
            
            // Если команда all или не указана, загружаем всё
            // Создаем основную папку website, если она еще не существует
            await createFolder(CLOUDINARY_ROOT_FOLDER);
            
            // Загружаем бейджи App Store
            await uploadBadges();
            
            // Загружаем рамки устройств
            await uploadDeviceBezels();
            
            // Загружаем ассеты для всех приложений из конфигурации
            const appsDir = path.join(assetsDir, 'apps');
            const appFolders = await fs.readdir(appsDir);
            
            console.log(`Найдено ${appFolders.length} папок с приложениями`);
            
            for (const appFolder of appFolders) {
                if (appFolder === '.DS_Store') continue; // Пропускаем системные файлы
                
                if (UPLOADED_APPS.includes(appFolder)) {
                    console.log(`Приложение ${appFolder} уже загружено, пропускаем...`);
                    continue;
                }
                
                console.log(`Загрузка ассетов для приложения ${appFolder}...`);
                await uploadAppAssets(appFolder);
            }
            
            console.log('Все файлы успешно загружены!');
            
        } catch (error) {
            console.error('Произошла ошибка при загрузке файлов:', error);
        }
    }

    // Если файл запущен напрямую (не импортирован)
    if (require.main === module) {
        main();
    }
}

if (typeof window !== 'undefined') {
    // Экспортируем функции для использования в браузере
    window.getCloudinaryImageUrl = getCloudinaryImageUrl;
    window.getAppStoreBadgeUrl = getAppStoreBadgeUrl;
    window.getShareImageUrl = getShareImageUrl;
    window.getDeviceBezelUrl = getDeviceBezelUrl;
} 