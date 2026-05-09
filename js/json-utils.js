/**
 * Утилиты для работы с JSON файлами
 */
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Получаем __dirname для ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_URL = 'https://sergeykushner.github.io';

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function toIsoDate(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString().slice(0, 10);
}

function createSitemapUrl({ loc, lastmod, changefreq = 'monthly', priority = '0.7' }) {
    const lastmodTag = lastmod ? `\n        <lastmod>${escapeXml(lastmod)}</lastmod>` : '';

    return `    <url>
        <loc>${escapeXml(loc)}</loc>${lastmodTag}
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
    </url>`;
}

function getSitemapItems(appsData) {
    return appsData
        .filter(app => app.type !== 'App Bundle' && app.id)
        .sort((a, b) => a.id.localeCompare(b.id));
}

function buildSitemapXml(appsData) {
    const staticUrls = [
        {
            loc: `${SITE_URL}/`,
            lastmod: '2025-01-09',
            changefreq: 'monthly',
            priority: '1.0'
        },
        {
            loc: `${SITE_URL}/apps.html`,
            lastmod: '2025-01-09',
            changefreq: 'monthly',
            priority: '0.9'
        },
        {
            loc: `${SITE_URL}/google-admob-app-privacy.html`,
            lastmod: '2025-01-09',
            changefreq: 'monthly',
            priority: '0.1'
        }
    ];

    const appUrls = getSitemapItems(appsData).flatMap(app => {
        const encodedId = encodeURIComponent(app.id);
        const appLastmod = toIsoDate(app.releaseDate) || toIsoDate(app.privacyUpdatedDate);
        const privacyLastmod = toIsoDate(app.privacyUpdatedDate) || appLastmod;

        return [
            {
                loc: `${SITE_URL}/app.html?id=${encodedId}`,
                lastmod: appLastmod,
                changefreq: 'monthly',
                priority: '0.8'
            },
            {
                loc: `${SITE_URL}/app-privacy.html?id=${encodedId}`,
                lastmod: privacyLastmod,
                changefreq: 'yearly',
                priority: '0.3'
            }
        ];
    });

    const urls = [...staticUrls, ...appUrls].map(createSitemapUrl).join('\n\n');

    return `<?xml version="1.0" encoding="UTF-8" ?>

<?xml-stylesheet type="text/xsl" href="stylesheet.xslt"?>

<urlset
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
    xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd"
    >

${urls}

</urlset>
`;
}

/**
 * Обновление публичного JSON с метаданными приложений
 * @returns {Promise<boolean>} Успешность обновления
 */
async function updatePublicJson() {
    try {
        console.log('Создание публичной версии apps-metadata.json...');

        // Пути к файлам
        const sourceFilePath = path.join(__dirname, '../data/apps-metadata.json');
        const targetFilePath = path.join(__dirname, '../data/apps-metadata-public.json');

        // Ключи, которые нужно удалить из публичной версии
        const keysToRemove = [
            "origin",
            "appStoreUnits",
            "appStoreSales",
            "appStoreProceeds",
            'saleDate',
            'salePrice',
            'salePriceSource',
            'listingFee',
            'successFee',
            'flippaLink',
            'salePriceComment',
            'gitHubLink'
        ];

        // Создаем директорию, если ее нет
        const targetDir = path.dirname(targetFilePath);
        if (!await fs.exists(targetDir)) {
            await fs.mkdir(targetDir, { recursive: true });
        }

        // Читаем исходный файл
        const appsData = JSON.parse(await fs.readFile(sourceFilePath, 'utf8'));

        // Создаем копию без приватных ключей
        const cleanedApps = appsData.map(app => {
            const cleanApp = { ...app };

            keysToRemove.forEach(key => {
                if (key in cleanApp) {
                    delete cleanApp[key];
                }
            });

            return cleanApp;
        });

        // Записываем в новый файл
        const jsonData = `${JSON.stringify(cleanedApps, null, 4)}\n`;
        await fs.writeFile(targetFilePath, jsonData, 'utf8');

        console.log(`Публичная версия успешно создана: ${targetFilePath}`);
        await updateSitemap(cleanedApps);
        return true;
    } catch (error) {
        console.error('Произошла ошибка при создании публичной версии JSON:', error);
        return false;
    }
}

/**
 * Обновление sitemap.xml на основе публичных метаданных приложений
 * @param {Array<object>|null} appsData
 * @returns {Promise<boolean>} Успешность обновления
 */
async function updateSitemap(appsData = null) {
    try {
        console.log('Обновление sitemap.xml...');

        const publicJsonPath = path.join(__dirname, '../data/apps-metadata-public.json');
        const sitemapPath = path.join(__dirname, '../sitemap.xml');
        const apps = appsData || JSON.parse(await fs.readFile(publicJsonPath, 'utf8'));
        const sitemapXml = buildSitemapXml(apps);

        await fs.writeFile(sitemapPath, sitemapXml, 'utf8');

        console.log(`sitemap.xml успешно обновлен: ${sitemapPath}`);
        return true;
    } catch (error) {
        console.error('Произошла ошибка при обновлении sitemap.xml:', error);
        return false;
    }
}

export {
    updatePublicJson,
    updateSitemap
}; 
