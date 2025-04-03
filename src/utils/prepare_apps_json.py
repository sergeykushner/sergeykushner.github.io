#!/usr/bin/env python3
import json
import os

# Пути к файлам
source_file_path = os.path.join(os.path.dirname(__file__), '../data/apps.json')
target_file_path = os.path.join(os.path.dirname(__file__), '../../apps-public.json')

# Ключи, которые нужно удалить из публичной версии
keys_to_remove = [
    'saleDate',
    'salePrice',
    'listingFee',
    'successFee',
    'flippaLink',
    'salePriceComment',
    'gitHubLink'
]

try:
    # Создаем директорию, если ее нет
    target_dir = os.path.dirname(target_file_path)
    os.makedirs(target_dir, exist_ok=True)
    
    # Читаем исходный файл
    with open(source_file_path, 'r', encoding='utf-8') as f:
        apps_data = json.load(f)
    
    # Создаем копию без приватных ключей
    cleaned_apps = []
    for app in apps_data:
        clean_app = app.copy()
        for key in keys_to_remove:
            if key in clean_app:
                del clean_app[key]
        cleaned_apps.append(clean_app)
    
    # Записываем в новый файл
    with open(target_file_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_apps, f, indent=4, ensure_ascii=False)
    
    print(f'Публичная версия успешно создана: {target_file_path}')
except Exception as e:
    print(f'Произошла ошибка: {e}') 