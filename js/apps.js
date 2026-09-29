// --- Список приложений, которые показываются при включённом чекбоксе ---
const allowedAppIds = [
    "4-layers",
    "ai-writer",
    "assets",
    "avoid-collision",
    "birthdays",
    "brown-noise",
    "calories-tracker",
    "care-symbols",
    "charger-animations",
    "cipheroji",
    "cross-route-tracker",
    "cyber-blackjack",
    "cyber-roulette",
    "dice-poker",
    "expense-tracker",
    "fasting",
    "fuel-tracker",
    "habit-tracker",
    "lucky-diamonds",
    "margin-trading-calculator",
    "movie-watchlist",
    "next-show",
    "nft-creator",
    "open-sea-wallet-portfolio",
    "pdf-resume-creator",
    "period-tracker",
    "poker-dealer",
    "pomodoro-timer",
    "post-creator",
    "quit-smoking",
    "run-sunta",
    "tetra-blocks-tower",
    "time-capsule",
    "truth-or-dare",
    "water-balance",
    "word-game-catch-letter",
    "word-game-woords"
];

/**
 * Фильтрует приложения, исключая бандлы
 * @param {Array} apps
 * @returns {Array}
 */
function filterOutBundles(apps) {
    // Неполные шаблонные записи не имеют названия и не должны отображаться как приложения.
    return apps.filter(app => app.type !== "App Bundle" && app.id && app.displayName);
}

/**
 * Рендерит список приложений в контейнер
 * @param {Array} appsToRender
 * @param {HTMLElement} container
 * @param {HTMLTemplateElement} template
 * @param {boolean} prefersDarkMode
 */
function renderApps(appsToRender, container, template, prefersDarkMode) {
    container.innerHTML = '';
    appsToRender.forEach(app => {
        // Клонируем шаблон для каждого приложения
        const appNode = template.content.cloneNode(true);
        const link = appNode.querySelector('a');
        const img = appNode.querySelector('.app-icon-apps-page');
        const title = appNode.querySelector('.apps-page-app-title');
        // Заполняем элементы данными
        link.href = `/app.html?id=${app.id}`;
        title.textContent = app.displayName;
        // Получаем URL иконки из Cloudinary с учетом темного режима
        const iconUrl = getCloudinaryImageUrl(app.id, 'app-icon', 'png', prefersDarkMode);
        img.alt = app.title || app.displayName;
        // Если тёмной иконки нет, пробуем обычную; при её отсутствии показываем заглушку.
        img.onerror = function () {
            if (prefersDarkMode) {
                this.onerror = function () { replaceMissingAppIcon(this); };
                this.src = getCloudinaryImageUrl(app.id, 'app-icon', 'png', false);
            } else {
                replaceMissingAppIcon(this);
            }
        };
        img.src = iconUrl;
        container.appendChild(appNode);
    });
}

/**
 * Основная функция загрузки и инициализации страницы приложений
 */
async function loadApps() {
    // Загружаем метаданные приложений
    const response = await fetch("/data/apps-metadata-public.json");
    const allApps = await response.json();
    const apps = filterOutBundles(allApps);
    // Получаем ссылки на DOM-элементы
    const container = document.querySelector(".main-grid-container-apps-page");
    const template = document.getElementById("appTemplate");
    // Проверяем, использует ли пользователь темный режим
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Добавляем импорт скрипта с функциями Cloudinary, если его еще нет
    if (typeof getCloudinaryImageUrl !== 'function') {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = '/js/cloudinary.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }
    // Просто показываем все приложения без фильтрации
    renderApps(apps, container, template, prefersDarkMode);
}

// Инициализация после загрузки DOM
// (DOMContentLoaded гарантирует, что шаблон и контейнер уже в DOM)
document.addEventListener('DOMContentLoaded', loadApps);
