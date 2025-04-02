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
    
    // Структура пути в Cloudinary: /website/apps/{appId}/{fileName}
    return `${CLOUDINARY_BASE_URL}/image/upload/v1/${CLOUDINARY_ROOT_FOLDER}/apps/${appId}/${fileName}`;
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