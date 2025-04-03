#!/bin/bash

# Определяем путь к директории скрипта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Запуск генерации публичной версии apps.json..."

# Запуск Node.js скрипта для создания публичной версии
node "$SCRIPT_DIR/prepare-apps-json.js"

echo "Готово!" 