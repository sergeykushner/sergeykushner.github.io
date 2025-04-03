#!/usr/bin/env python3
"""
Скрипт для загрузки скриншотов конкретного приложения на Cloudinary.

Для запуска:
1. Установите необходимые зависимости: pip install cloudinary python-dotenv
2. Проверьте, что файл .env содержит ваши учетные данные Cloudinary
3. Запустите скрипт: python3 src/python/cloudinary_upload_screenshots.py

Скрипт запросит ID приложения и путь к папке со скриншотами в интерактивном режиме.
"""

import os
import sys
import glob
from pathlib import Path
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
import cloudinary.api

# Запрашиваем у пользователя ID приложения и путь к скриншотам
def get_user_input():
    print("Загрузка скриншотов на Cloudinary")
    print("=================================")
    
    app_id = input("Введите ID приложения (например, time-capsule): ")
    screenshots_path = input("Введите путь к папке со скриншотами: ")
    
    # Удаляем кавычки, если пользователь их добавил
    screenshots_path = screenshots_path.strip('"\'')
    app_id = app_id.strip('"\'')
    
    # Проверяем наличие обязательных параметров
    if not app_id:
        print("Ошибка: ID приложения не может быть пустым")
        sys.exit(1)
    
    if not screenshots_path:
        print("Ошибка: Путь к папке со скриншотами не может быть пустым")
        sys.exit(1)
    
    # Проверяем существование директории со скриншотами
    if not os.path.exists(screenshots_path):
        print(f"Ошибка: Директория {screenshots_path} не найдена")
        sys.exit(1)
    
    # Расширяем тильду в пути, если она есть
    screenshots_path = os.path.expanduser(screenshots_path)
    
    return app_id, screenshots_path

# Загружаем переменные окружения из .env файла
env_path = os.path.join(os.path.dirname(__file__), '../../src/.env')
load_dotenv(env_path)

# Конфигурация Cloudinary
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET')
)

# Корневая папка в Cloudinary для всех файлов сайта
CLOUDINARY_ROOT_FOLDER = 'website'

def create_folder(folder_path):
    """Создание папки в Cloudinary."""
    print(f"Создание папки {folder_path} в Cloudinary...")
    try:
        result = cloudinary.api.create_folder(folder_path)
        print(f"Папка {folder_path} создана успешно")
        return result
    except Exception as e:
        # Если папка уже существует, это не ошибка
        if "already exists" in str(e):
            print(f"Папка {folder_path} уже существует")
            return {"success": True}
        print(f"Ошибка при создании папки {folder_path}: {e}")
        return None

def upload_file(file_path, cloudinary_path):
    """Загрузка одного файла в Cloudinary."""
    # Разделяем путь на папку и имя файла
    if '/' in cloudinary_path:
        folder = f"{CLOUDINARY_ROOT_FOLDER}/{os.path.dirname(cloudinary_path)}"
        file_name = os.path.basename(cloudinary_path)
    else:
        folder = CLOUDINARY_ROOT_FOLDER
        file_name = cloudinary_path
    
    print(f"Загрузка {file_path} на Cloudinary в папку {folder} с именем {file_name}...")
    
    try:
        result = cloudinary.uploader.upload(
            file_path,
            folder=folder,
            public_id=file_name,
            overwrite=True,
            use_filename=False,
            unique_filename=False
        )
        print(f"Успешно загружено: {result['secure_url']}")
        return result
    except Exception as e:
        print(f"Ошибка при загрузке {file_path}: {e}")
        return None

def upload_app_screenshots(app_id, screenshots_path):
    """Загрузка всех скриншотов приложения."""
    try:
        # Создаем папки для приложения, если они еще не существуют
        create_folder(CLOUDINARY_ROOT_FOLDER)
        create_folder(f"{CLOUDINARY_ROOT_FOLDER}/apps")
        create_folder(f"{CLOUDINARY_ROOT_FOLDER}/apps/{app_id}")
        
        # Получаем список файлов изображений в директории
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif']
        image_files = []
        
        for ext in image_extensions:
            image_files.extend(glob.glob(os.path.join(screenshots_path, f"*{ext}")))
            image_files.extend(glob.glob(os.path.join(screenshots_path, f"*{ext.upper()}")))
        
        print(f"Найдено {len(image_files)} изображений для загрузки")
        
        # Сортируем файлы по имени
        image_files.sort()
        
        # Отделяем обычные скриншоты от темных
        regular_screenshots = []
        dark_screenshots = []
        
        for file_path in image_files:
            file_name = os.path.basename(file_path).lower()
            if 'dark' in file_name:
                dark_screenshots.append(file_path)
            else:
                regular_screenshots.append(file_path)
        
        # Загружаем каждый скриншот
        for i, file_path in enumerate(regular_screenshots):
            screen_number = i + 1
            cloudinary_file_name = f"app-screen-{screen_number}"
            upload_file(file_path, f"apps/{app_id}/{cloudinary_file_name}")
        
        for i, file_path in enumerate(dark_screenshots):
            screen_number = i + 1
            cloudinary_file_name = f"app-screen-{screen_number}-dark"
            upload_file(file_path, f"apps/{app_id}/{cloudinary_file_name}")
        
        print("\nВсе скриншоты успешно загружены!")
        print(f"\nЧтобы использовать эти скриншоты, обновите значение screenshots в apps.json для приложения {app_id}:")
        print(f"\nНапример: [{', '.join(str(i+1) for i in range(len(regular_screenshots)))}]")
        
    except Exception as e:
        print(f"Ошибка при загрузке скриншотов: {e}")

# Запускаем загрузку скриншотов
if __name__ == "__main__":
    # Запрашиваем у пользователя параметры
    app_id, screenshots_path = get_user_input()
    print(f"\nЗагрузка скриншотов для приложения: {app_id}")
    print(f"Из папки: {screenshots_path}\n")
    
    # Запрашиваем подтверждение
    confirm = input("Продолжить? (y/n): ")
    if confirm.lower() != 'y':
        print("Операция отменена")
        sys.exit(0)
        
    # Запускаем загрузку
    upload_app_screenshots(app_id, screenshots_path) 