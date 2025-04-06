/**
 * Скрипт для удаления и повторной загрузки всех изображений приложений в Cloudinary
 * Для запуска: node js/cloudinary-reupload.js
 */

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

// Корневая папка в Cloudinary для всех файлов сайта
const CLOUDINARY_ROOT_FOLDER = 'website';

// Путь к директории с ассетами приложений
const appsDir = path.join(__dirname, '../assets/apps');

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

// Основная функция для перезагрузки всех ассетов
async function reuploadAllApps() {
    try {
        // Получаем список всех папок приложений
        const appFolders = await fs.readdir(appsDir);
        console.log(`Найдено ${appFolders.length} папок с приложениями`);
        
        // Создаем основную папку website, если она еще не существует
        await createFolder(CLOUDINARY_ROOT_FOLDER);
        await createFolder(`${CLOUDINARY_ROOT_FOLDER}/apps`);
        
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
        
        console.log('\nВсе приложения успешно перезагружены!');
    } catch (error) {
        console.error('Произошла ошибка при перезагрузке приложений:', error);
    }
}

// Запускаем основную функцию
reuploadAllApps(); 