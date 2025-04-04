/**
 * Административный скрипт для выполнения различных операций
 * с сайтом и данными.
 * 
 * Для запуска:
 * 1. Установите необходимые зависимости: 
 *    npm install readline-sync cloudinary dotenv fs-extra child_process
 * 2. Запустите скрипт: node src/js/admin.js
 */

const readlineSync = require('readline-sync');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config({ path: path.join(__dirname, '../../src/.env') });

// Получение пути к apps.json из переменной окружения или по умолчанию
const appsJsonPath = process.env.APPS_JSON_PATH || path.join(__dirname, '../../apps.json');

// Функция для выполнения команды и возврата результата в виде промиса
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        console.log(`Выполняется команда: ${command}`);
        
        exec(command, { cwd: path.join(__dirname, '../..') }, (error, stdout, stderr) => {
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
        console.log('Запуск генерации публичной версии apps.json...');
        await executeCommand('./src/utils/update-public-json.sh');
        console.log('Публичная версия JSON успешно обновлена!');
    } catch (error) {
        console.error('Произошла ошибка при обновлении публичного JSON:', error);
    }
}

// Функция для запуска скрипта загрузки всех изображений из assets
async function uploadAllImages() {
    try {
        console.log('Запуск загрузки всех изображений из assets...');
        await executeCommand('node src/js/cloudinary-upload.js');
        console.log('Все изображения успешно загружены!');
    } catch (error) {
        console.error('Произошла ошибка при загрузке изображений:', error);
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
        
        // Запускаем скрипт с аргументами
        const command = `node src/js/cloudinary-upload-screenshots.js "${appId}" "${screenshotsPath}"`;
        await executeCommand(command);
        
        // Спрашиваем пользователя, нужно ли обновить публичный JSON
        const updateJson = readlineSync.question('Обновить публичный JSON? (y/n): ');
        if (updateJson.toLowerCase() === 'y') {
            await updatePublicJson();
        }
        
    } catch (error) {
        console.error('Произошла ошибка при загрузке скриншотов:', error);
    }
}

// Основная функция
async function main() {
    console.log('Административный скрипт для сайта');
    console.log('=================================');
    
    // Определяем доступные операции
    const operations = [
        'Обновить публичный JSON (apps-public.json в корне проекта)',
        'Загрузить все изображения из assets',
        'Загрузить скриншоты для конкретного приложения',
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
            await uploadAllImages();
            break;
        case 2:
            await uploadAppScreenshots();
            break;
        default:
            console.log('Выход из скрипта');
            break;
    }
}

// Запускаем скрипт
main(); 