// Cloudinary конфигурация
const CLOUDINARY_CLOUD_NAME = 'your-cloud-name';
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`;

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
    const fileName = `${imageName}${darkModeSuffix}.${extension}`;
    
    // Структура пути в Cloudinary: /apps/{appId}/{fileName}
    return `${CLOUDINARY_BASE_URL}/image/upload/v1/apps/${appId}/${fileName}`;
}

/**
 * Получает URL для шэринг-изображения приложения
 * @param {string} appId - ID приложения
 * @returns {string} URL изображения для шэринга
 */
function getShareImageUrl(appId) {
    return `${CLOUDINARY_BASE_URL}/image/upload/v1/apps/${appId}/share.jpg`;
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
    
    return `${CLOUDINARY_BASE_URL}/image/upload/v1/badges/${badgeName}.svg`;
} 