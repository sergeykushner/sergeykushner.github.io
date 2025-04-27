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
    return apps.filter(app => app.type !== "App Bundle");
}

/**
 * Фильтрует только разрешённые приложения
 * @param {Array} apps
 * @returns {Array}
 */
function filterAllowedApps(apps) {
    return apps.filter(app => allowedAppIds.includes(app.id));
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
        link.href = `app.html?id=${app.id}`;
        title.textContent = app.displayName;
        // Получаем URL иконки из Cloudinary с учетом темного режима
        const iconUrl = getCloudinaryImageUrl(app.id, 'app-icon', 'png', prefersDarkMode);
        img.src = iconUrl;
        img.alt = app.title || app.displayName;
        // Добавляем обработчик ошибки загрузки для запасного варианта
        img.onerror = function () {
            if (this.getAttribute('data-tried-light') !== 'true') {
                this.setAttribute('data-tried-light', 'true');
                this.src = getCloudinaryImageUrl(app.id, 'app-icon', 'png', false);
            }
        };
        container.appendChild(appNode);
    });
}

/**
 * Обновляет отображение приложений в зависимости от состояния чекбокса
 */
function updateAppsView(apps, container, template, prefersDarkMode) {
    const showAllowedOnly = document.getElementById('show-allowed-only').checked;
    const appsToRender = showAllowedOnly ? filterAllowedApps(apps) : apps;
    renderApps(appsToRender, container, template, prefersDarkMode);
}

/**
 * Основная функция загрузки и инициализации страницы приложений
 */
async function loadApps() {
    // Загружаем метаданные приложений
    const response = await fetch("../data/apps-metadata-public.json");
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
            script.src = '../js/cloudinary.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }
    // Восстанавливаем состояние чекбокса из localStorage
    const checkbox = document.getElementById('show-allowed-only');
    const savedState = localStorage.getItem('showAllowedOnly');
    checkbox.checked = savedState === 'true';
    updateAppsView(apps, container, template, prefersDarkMode);
    // Обработчик события изменения состояния чекбокса
    checkbox.addEventListener('change', function () {
        localStorage.setItem('showAllowedOnly', this.checked);
        updateAppsView(apps, container, template, prefersDarkMode);
    });
    // Настраиваем наблюдение за скроллом для обновления изображений
    window.addEventListener('scroll', function () {
        const appIcons = document.querySelectorAll('.app-icon-apps-page');
        appIcons.forEach(img => {
            // Проверяем, видно ли изображение
            const rect = img.getBoundingClientRect();
            const isVisible = (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
            if (isVisible && img.naturalWidth === 0 && img.getAttribute('data-tried-light') === 'true') {
                // Если изображение видимо, но не загружено даже после попытки загрузить светлую версию
                img.style.display = 'none'; // Скрываем сломанное изображение
            }
        });
    }, { passive: true });
    // Показываем футер после загрузки и рендера
    const footer = document.querySelector('.footer-apps-page');
    if (footer) {
        footer.classList.remove('footer-apps-page--hidden');
    }
}

// Инициализация после загрузки DOM
// (DOMContentLoaded гарантирует, что шаблон и контейнер уже в DOM)
document.addEventListener('DOMContentLoaded', loadApps);
