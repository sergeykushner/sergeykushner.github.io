/**
 * Утилиты для работы с JSON файлами
 */
const fs = require('fs-extra');
const path = require('path');

/**
 * Обновление публичного JSON с метаданными приложений
 * @returns {Promise<boolean>} Успешность обновления
 */
async function updatePublicJson() {
    try {
        console.log('Создание публичной версии apps-metadata.json...');
        
        // Пути к файлам
        const sourceFilePath = path.join(__dirname, '../data/apps-metadata.json');
        const targetFilePath = path.join(__dirname, '../data/apps-metadata-public.json');

        // Ключи, которые нужно удалить из публичной версии
        const keysToRemove = [
            "appStoreUnits",
            "appStoreUnitsSales",
            'saleDate',
            'salePrice',
            'listingFee',
            'successFee',
            'flippaLink',
            'salePriceComment',
            'gitHubLink'
        ];

        // Создаем директорию, если ее нет
        const targetDir = path.dirname(targetFilePath);
        if (!await fs.exists(targetDir)) {
            await fs.mkdir(targetDir, { recursive: true });
        }

        // Читаем исходный файл
        const appsData = JSON.parse(await fs.readFile(sourceFilePath, 'utf8'));
        
        // Создаем копию без приватных ключей
        const cleanedApps = appsData.map(app => {
            const cleanApp = { ...app };
            
            keysToRemove.forEach(key => {
                if (key in cleanApp) {
                    delete cleanApp[key];
                }
            });
            
            return cleanApp;
        });
        
        // Записываем в новый файл
        const jsonData = JSON.stringify(cleanedApps, null, 4);
        await fs.writeFile(targetFilePath, jsonData, 'utf8');
        
        console.log(`Публичная версия успешно создана: ${targetFilePath}`);
        return true;
    } catch (error) {
        console.error('Произошла ошибка при создании публичной версии JSON:', error);
        return false;
    }
}

module.exports = {
    updatePublicJson
}; 