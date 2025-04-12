// Cloudinary конфигурация
const CLOUDINARY_CLOUD_NAME = 'dh1nrzlvo';
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`;
const CLOUDINARY_ROOT_FOLDER = 'website'; // Добавляем корневую папку
const ASSET_VERSION = 'v5'; // Новая константа версионирования

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
 * Получает URL для бейджа Google Play
 * @returns {string} URL бейджа Google Play
 */
function getGooglePlayBadgeUrl() {
    const badgeName = 'get-it-on-google-play-badge-web-color-english';
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
    window.getGooglePlayBadgeUrl = getGooglePlayBadgeUrl;
}

// Экспортируем функции для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCloudinaryImageUrl,
        getAppStoreBadgeUrl,
        getShareImageUrl,
        getDeviceBezelUrl,
        getGooglePlayBadgeUrl,
        CLOUDINARY_ROOT_FOLDER,
        CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_BASE_URL
    };
} 