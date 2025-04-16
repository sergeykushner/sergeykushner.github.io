# Website instructions

## Административный скрипт

1. Установите зависимости:
   ```bash
   npm install readline-sync cloudinary dotenv fs-extra child_process
   ```

2. Запустите скрипт:
   ```bash
   node js/admin.js
   ```

## CSS Color Names Sorted by Lightness and Hue

http://davidbau.com/colors/

## Полный откат на один коммит назад (жёстко, с удалением):

```bash
git reset --hard HEAD~1
git push origin main --force
```