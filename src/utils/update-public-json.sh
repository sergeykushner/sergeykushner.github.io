#!/bin/bash

# Скрипт для обновления публичной версии apps.json

# Путь к директории скрипта
SCRIPT_DIR=$(dirname "$0")

# Запускаем Python-скрипт для создания публичной версии
python3 "$SCRIPT_DIR/prepare_apps_json.py"

echo "Публичная версия файла apps.json обновлена" 