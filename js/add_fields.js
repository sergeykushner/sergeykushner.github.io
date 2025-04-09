const fs = require('fs');
const filePath = 'apps-metadata.json';

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Ошибка при чтении файла:', err);
    return;
  }

  try {
    const apps = JSON.parse(data);

    apps.forEach(app => {
      if (app.platform) {
        const entries = Object.entries(app);
        const newEntries = [];

        for (let i = 0; i < entries.length; i++) {
          const [key, value] = entries[i];
          newEntries.push([key, value]);

          if (key === 'platform') {
            newEntries.push(['origin', 'reskinned']);
            newEntries.push(['status', 'sold']);
          }
        }

        const newApp = Object.fromEntries(newEntries);

        Object.keys(app).forEach(key => delete app[key]);
        Object.assign(app, newApp);
      }
    });

    fs.writeFile(filePath, JSON.stringify(apps, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Ошибка при записи файла:', err);
        return;
      }
      console.log('Файл успешно обновлен!');
    });

  } catch (error) {
    console.error('Ошибка при обработке JSON:', error);
  }
});
