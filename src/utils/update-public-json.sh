#!/bin/bash

# Определяем путь к директории скрипта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Запуск генерации публичной версии apps.json..."

# Запуск Python-скрипта для создания публичной версии
python3 "$SCRIPT_DIR/prepare_apps_json.py"

echo "Готово!" 