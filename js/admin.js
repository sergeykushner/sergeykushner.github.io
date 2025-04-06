/**
 * Административный скрипт для выполнения различных операций
 * с сайтом и данными.
 * 
 * Для запуска:
 * 1. Установите необходимые зависимости: 
 *    npm install readline-sync cloudinary dotenv fs-extra child_process
 * 2. Запустите скрипт: node js/admin.js
 */

const readlineSync = require('readline-sync');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;

// Конфигурация Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Корневая папка в Cloudinary для всех файлов сайта
const CLOUDINARY_ROOT_FOLDER = 'website';

// Путь к директории с ассетами приложений
const appsDir = path.join(__dirname, '../assets/apps');

// Функция для выполнения команды и возврата результата в виде промиса
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

// Функция для запуска скрипта обновления публичного JSON
async function updatePublicJson() {
    try {
        console.log('Запуск генерации публичной версии apps-metadata.json...');
        await executeCommand('./js/update-public-json.sh');
        console.log('Публичная версия JSON успешно обновлена!');
    } catch (error) {
        console.error('Произошла ошибка при обновлении публичного JSON:', error);
    }
}

// Функция для удаления папки приложения в Cloudinary
async function deleteAppFolder(appId) {
    const folderPath = `${CLOUDINARY_ROOT_FOLDER}/apps/${appId}`;
    console.log(`Удаление папки ${folderPath} из Cloudinary...`);
    
    try {
        // Сначала получаем список всех ресурсов в папке
        const resources = await cloudinary.search
            .expression(`folder:${folderPath}`)
            .max_results(500)
            .execute();
        
        // Удаляем все ресурсы
        if (resources.total_count > 0) {
            console.log(`Найдено ${resources.total_count} ресурсов для удаления`);
            
            for (const resource of resources.resources) {
                await cloudinary.uploader.destroy(resource.public_id);
                console.log(`Удален ресурс: ${resource.public_id}`);
            }
        } else {
            console.log(`В папке ${folderPath} не найдено ресурсов для удаления`);
        }
        
        // Теперь удаляем саму папку
        try {
            await cloudinary.api.delete_folder(folderPath);
            console.log(`Папка ${folderPath} успешно удалена`);
        } catch (folderError) {
            // Если папки нет, это не ошибка
            console.log(`Папка ${folderPath} уже удалена или не существует`);
        }
        
        return true;
    } catch (error) {
        console.error(`Ошибка при удалении папки ${folderPath}:`, error);
        return false;
    }
}

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

// Функция для загрузки ассетов для приложения
async function uploadAppAssets(appId) {
    const appDir = path.join(appsDir, appId);
    
    if (!await fs.exists(appDir)) {
        console.log(`Директория для приложения ${appId} не найдена`);
        return;
    }
    
    // Создаем папку для приложения
    await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps`);
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
    
    console.log(`Все файлы для приложения ${appId} успешно загружены`);
}

// Функция для загрузки бейджей
async function uploadBadges() {
    const badgesDir = path.join(__dirname, '../assets/badges');
    
    if (!await fs.exists(badgesDir)) {
        console.log('Директория badges не найдена');
        return;
    }
    
    // Создаем папку для бейджей
    await createFolder(`${CLOUDINARY_ROOT_FOLDER}/badges`);
    
    const files = await fs.readdir(badgesDir);
    
    for (const file of files) {
        if (file === '.DS_Store') continue; // Пропускаем системные файлы

        const filePath = path.join(badgesDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
            const fileName = path.parse(file).name;
            await uploadFile(filePath, `badges/${fileName}`);
        }
    }
    
    console.log('Все бейджи успешно загружены');
}

// Функция для загрузки рамок устройств
async function uploadDeviceBezels() {
    const bezelsDir = path.join(__dirname, '../assets/product-bezels');
    
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

// Функция для перезагрузки всех изображений из assets
async function reuploadAllImages() {
    try {
        console.log('Перезагрузка всех изображений из assets...');
        
        // Создаем основную папку website, если она еще не существует
        await createFolder(CLOUDINARY_ROOT_FOLDER);

        // Загружаем бейджи App Store
        await uploadBadges();
        
        // Загружаем рамки устройств
        await uploadDeviceBezels();
        
        // Получаем список всех папок приложений
        const appFolders = await fs.readdir(appsDir);
        console.log(`Найдено ${appFolders.length} папок с приложениями`);
        
        // Для каждого приложения удаляем и заново загружаем ассеты
        for (const appFolder of appFolders) {
            if (appFolder === '.DS_Store') continue; // Пропускаем системные файлы
            
            // Проверяем, что это директория
            const folderPath = path.join(appsDir, appFolder);
            const stats = await fs.stat(folderPath);
            if (!stats.isDirectory()) continue;
            
            console.log(`\nПерезагрузка ассетов для приложения ${appFolder}...`);
            
            // Сначала удаляем папку с изображениями приложения
            await deleteAppFolder(appFolder);
            
            // Затем загружаем ассеты заново
            await uploadAppAssets(appFolder);
        }
        
        console.log('\nВсе изображения успешно перезагружены!');
    } catch (error) {
        console.error('Произошла ошибка при перезагрузке изображений:', error);
    }
}

// Функция для запуска скрипта загрузки скриншотов для конкретного приложения
async function uploadAppScreenshots() {
    try {
        // Получаем от пользователя ID приложения
        const appId = readlineSync.question('Введите ID приложения (например, time-capsule): ');
        if (!appId) {
            console.error('Ошибка: ID приложения не может быть пустым');
            return;
        }
        
        // Получаем от пользователя путь к папке со скриншотами
        let screenshotsPath = readlineSync.question('Введите путь к папке со скриншотами: ');
        
        // Удаляем кавычки, если пользователь их добавил
        screenshotsPath = screenshotsPath.trim().replace(/^["']|["']$/g, '');
        
        if (!screenshotsPath) {
            console.error('Ошибка: Путь к папке со скриншотами не может быть пустым');
            return;
        }
        
        // Расширяем тильду в пути, если она есть (для macOS/Linux)
        if (screenshotsPath.startsWith('~')) {
            screenshotsPath = path.join(process.env.HOME, screenshotsPath.slice(1));
        }
        
        // Проверяем существование директории со скриншотами
        if (!await fs.exists(screenshotsPath)) {
            console.error(`Ошибка: Директория ${screenshotsPath} не найдена`);
            return;
        }
        
        console.log(`\nЗагрузка скриншотов для приложения: ${appId}`);
        console.log(`Из папки: ${screenshotsPath}\n`);
        
        // Запрашиваем подтверждение
        const confirm = readlineSync.question('Продолжить? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('Операция отменена');
            return;
        }
        
        // Создаем папку для приложения, если она еще не существует
        await createFolder(CLOUDINARY_ROOT_FOLDER);
        await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps`);
        await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps/${appId}`);
        
        // Получаем список файлов в директории
        const files = await fs.readdir(screenshotsPath);
        
        // Фильтруем только изображения
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return imageExtensions.includes(ext);
        });
        
        console.log(`Найдено ${imageFiles.length} изображений для загрузки`);
        
        // Сортируем файлы по имени
        imageFiles.sort();
        
        // Загружаем каждое изображение, сохраняя оригинальное имя файла
        for (const file of imageFiles) {
            const filePath = path.join(screenshotsPath, file);
            // Используем имя файла без расширения как имя в Cloudinary
            const fileNameWithoutExt = path.basename(file, path.extname(file));
            
            await uploadFile(filePath, `apps/${appId}/${fileNameWithoutExt}`);
        }
        
        console.log('\nВсе скриншоты успешно загружены!');
        
        // Спрашиваем пользователя, нужно ли обновить публичный JSON
        const updateJson = readlineSync.question('Обновить публичный JSON? (y/n): ');
        if (updateJson.toLowerCase() === 'y') {
            await updatePublicJson();
        }
        
    } catch (error) {
        console.error('Произошла ошибка при загрузке скриншотов:', error);
    }
}

// Функция для перезагрузки только выбранных приложений
async function reuploadSelectedApps() {
    try {
        // Получаем список всех папок приложений
        const appFolders = await fs.readdir(appsDir);
        const appOptions = appFolders
            .filter(folder => folder !== '.DS_Store')
            .filter(async (folder) => {
                // Проверяем, что это директория
                const folderPath = path.join(appsDir, folder);
                const stats = await fs.stat(folderPath);
                return stats.isDirectory();
            });
        
        console.log('Выберите приложения для перезагрузки:');
        console.log('Используйте пробел для выбора/отмены, Enter для подтверждения.');
        
        // Используем multiselect для выбора нескольких приложений
        const selectedApps = readlineSync.keyInSelect(appOptions, 'Выберите приложения (0 - для всех):', 
            { 
                cancel: 'Отмена',
                guide: true
            });
        
        // Если пользователь выбрал 0 (все) или отменил операцию
        if (selectedApps === -1) {
            console.log('Операция отменена');
            return;
        }
        
        let appsToReupload = [];
        
        if (selectedApps === 0) { // Выбраны все приложения
            appsToReupload = appOptions;
        } else {
            appsToReupload = [appOptions[selectedApps]];
        }
        
        console.log(`\nБудут перезагружены следующие приложения (${appsToReupload.length}): ${appsToReupload.join(', ')}`);
        
        // Запрашиваем подтверждение
        const confirm = readlineSync.question('Продолжить? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('Операция отменена');
            return;
        }
        
        // Создаем основную папку website, если она еще не существует
        await createFolder(CLOUDINARY_ROOT_FOLDER);
        await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps`);
        
        // Для каждого выбранного приложения удаляем и заново загружаем ассеты
        for (const appId of appsToReupload) {
            console.log(`\nПерезагрузка ассетов для приложения ${appId}...`);
            
            // Сначала удаляем папку с изображениями приложения
            await deleteAppFolder(appId);
            
            // Затем загружаем ассеты заново
            await uploadAppAssets(appId);
        }
        
        console.log('\nВыбранные приложения успешно перезагружены!');
        
        // Спрашиваем пользователя, нужно ли обновить публичный JSON
        const updateJson = readlineSync.question('Обновить публичный JSON? (y/n): ');
        if (updateJson.toLowerCase() === 'y') {
            await updatePublicJson();
        }
        
    } catch (error) {
        console.error('Произошла ошибка при перезагрузке приложений:', error);
    }
}

// Функция для инвалидации кеша Cloudinary
async function invalidateCloudinaryCache() {
    try {
        // Получаем список папок
        const folders = await listFolders();
        
        if (folders.length === 0) {
            console.error('Не удалось получить список папок');
            return;
        }
        
        // Запрашиваем у пользователя выбор папки
        const folderIndex = readlineSync.keyInSelect(
            folders.map(folder => folder.name),
            'Выберите папку для инвалидации кеша:'
        );
        
        // Если пользователь отменил операцию
        if (folderIndex === -1) {
            console.log('Операция отменена');
            return;
        }
        
        const selectedFolder = folders[folderIndex];
        
        // Запрашиваем подтверждение
        console.log(`\nВы собираетесь инвалидировать кеш для папки: ${selectedFolder.path}`);
        const confirm = readlineSync.question('Продолжить? (y/n): ');
        
        if (confirm.toLowerCase() !== 'y') {
            console.log('Операция отменена');
            return;
        }
        
        // Запускаем инвалидацию
        if (selectedFolder.path === 'all') {
            await invalidateByFolder('all');
        } else {
            await invalidateByFolder(selectedFolder.path);
        }
    } catch (error) {
        console.error('Произошла ошибка при инвалидации кеша:', error);
    }
}

// Функция для получения списка папок в Cloudinary
async function listFolders() {
    try {
        // Получаем список корневых папок
        const rootResult = await cloudinary.api.root_folders();
        
        // Ищем нашу основную папку сайта
        const websiteFolder = rootResult.folders.find(folder => folder.path === CLOUDINARY_ROOT_FOLDER);
        
        if (!websiteFolder) {
            console.error(`Папка ${CLOUDINARY_ROOT_FOLDER} не найдена в Cloudinary`);
            return [];
        }
        
        // Получаем список подпапок внутри основной папки
        const subFoldersResult = await cloudinary.api.sub_folders(CLOUDINARY_ROOT_FOLDER);
        
        console.log('Доступные папки:');
        console.log(`0. Все папки (${CLOUDINARY_ROOT_FOLDER}/*)`);
        console.log(`1. Корневая папка (${CLOUDINARY_ROOT_FOLDER})`);
        
        subFoldersResult.folders.forEach((folder, index) => {
            console.log(`${index + 2}. ${folder.path}`);
        });
        
        return [
            { path: 'all', name: 'Все папки' },
            { path: CLOUDINARY_ROOT_FOLDER, name: 'Корневая папка' },
            ...subFoldersResult.folders
        ];
    } catch (error) {
        console.error('Ошибка при получении списка папок:', error);
        return [];
    }
}

// Функция для инвалидации ресурсов в папке
async function invalidateByFolder(folderPath) {
    try {
        // Если выбраны все папки, используем корневую папку сайта
        const prefix = folderPath === 'all' ? CLOUDINARY_ROOT_FOLDER : folderPath;
        
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

// Основная функция
async function main() {
    console.log('Административный скрипт для сайта');
    console.log('=================================');
    
    // Определяем доступные операции
    const operations = [
        'Обновить публичный JSON (data/apps-metadata-public.json)',
        'Перезагрузить все изображения из assets',
        'Перезагрузить только выбранные приложения',
        'Загрузить скриншоты для конкретного приложения',
        'Инвалидировать кеш Cloudinary',
        'Выход'
    ];
    
    // Используем readline-sync для создания меню
    const index = readlineSync.keyInSelect(operations, 'Выберите операцию:');
    
    // Обрабатываем выбор пользователя
    switch (index) {
        case 0:
            await updatePublicJson();
            break;
        case 1:
            await reuploadAllImages();
            break;
        case 2:
            await reuploadSelectedApps();
            break;
        case 3:
            await uploadAppScreenshots();
            break;
        case 4:
            await invalidateCloudinaryCache();
            break;
        default:
            console.log('Выход из скрипта');
            break;
    }
}

// Запускаем скрипт
main(); 