async function loadAppDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const appId = urlParams.get("id");
    
    const response = await fetch("../../apps.json");
    const apps = await response.json();
    const app = apps.find(a => a.id === appId);
    
    if (!app) {
        document.body.innerHTML = "<h2>App not found</h2>";
        return;
    }

    updateMetaTags(app);
    updateUI(app);
}

function updateMetaTags(app) {
    document.title = app.title;
    document.querySelector('meta[name="description"]').setAttribute("content", app.metaDescription);
    document.querySelector('meta[property="og:title"]').setAttribute("content", app.title);
    document.querySelector('meta[property="og:description"]').setAttribute("content", app.metaDescription);
    const appUrl = `https://sergeykushner.github.io/app.html?id=${app.id}`;
    document.getElementById('meta-og-url').setAttribute('content', appUrl);
    
    // Установка мета-тега для App Store с аргументом
    document.getElementById('meta-app-store').setAttribute("content", `app-id=${app.appStoreId}, app-argument=myURL`);
    
    const shareImageUrl = `https://sergeykushner.github.io/assets/apps/${app.id}/share.jpg`;
    document.getElementById('meta-og-image').setAttribute('content', shareImageUrl);
}

function updateUI(app) {
    // Проверяем, использует ли пользователь темный режим
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Загрузка иконки приложения с учетом темного режима
    const iconPath = `assets/apps/${app.id}/app-icon${prefersDarkMode ? '-dark' : ''}.png`;
    document.getElementById("app-icon").src = iconPath;
    
    // Добавляем обработчик ошибки для иконки, чтобы использовать светлую версию, если темная не найдена
    document.getElementById("app-icon").onerror = function() {
        this.src = `assets/apps/${app.id}/app-icon.png`;
        this.onerror = null; // Предотвращаем бесконечный цикл
    };
    
    document.getElementById("app-title").textContent = app.title;
    document.getElementById("app-subtitle").textContent = app.subtitle;

    document.getElementById("app-description").innerHTML = app.fullDescription
    .map(p => p ? (p.startsWith('- ') ? `<li>${p.substring(2)}</li>` : `<p>${p}</p>`) : '<br>')
    .join('');

    document.getElementById("app-store-link").href = `https://itunes.apple.com/us/app/id${app.appStoreId}`;
    
    // Выбираем бейдж App Store в зависимости от темного режима
    const appStoreBadgePath = prefersDarkMode 
        ? "../../assets/badges/download-on-the-app-store-badge-white.svg" 
        : "../../assets/badges/download-on-the-app-store-badge-black.svg";
    document.querySelector("#app-store-link img").src = appStoreBadgePath;
    
    // Добавляем обработчик ошибки для бейджа, чтобы использовать светлую версию, если темная не найдена
    document.querySelector("#app-store-link img").onerror = function() {
        this.src = "../../assets/badges/download-on-the-app-store-badge-black.svg";
        this.onerror = null; // Предотвращаем бесконечный цикл
    };
    
    // Контейнер для Product Hunt бейджа
    const phContainer = document.getElementById("product-hunt-container");
    
    // Проверка наличия Product Hunt бейджа
    if (app.productHunt) {
        phContainer.innerHTML = app.productHunt;
        phContainer.style.display = "block";
    } else {
        phContainer.style.display = "none";
    }
    
    // Загрузка скриншота с учетом темного режима
    const screenshotPath = `assets/apps/${app.id}/hero-device-group${prefersDarkMode ? '-dark' : ''}.png`;
    document.getElementById("screenshot").src = screenshotPath;
    
    // Добавляем обработчик ошибки для скриншота, чтобы использовать светлую версию, если темная не найдена
    document.getElementById("screenshot").onerror = function() {
        this.src = `assets/apps/${app.id}/hero-device-group.png`;
        this.onerror = null; // Предотвращаем бесконечный цикл
    };
    
    // Устанавливаем email в футере
    document.getElementById("email-link").href = `mailto:${app.email}`;
    
    // Обновляем ссылку на страницу Privacy Policy
    document.getElementById("privacy-link").href = `privacy.html?id=${app.id}`;
}

// Вызов функции загрузки при загрузке страницы
loadAppDetail();
