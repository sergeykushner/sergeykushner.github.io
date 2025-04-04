async function loadAppDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const appId = urlParams.get("id");
    
    const response = await fetch("./apps-public.json");
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
    
    // Используем Cloudinary для изображения шаринга
    const shareImageUrl = getShareImageUrl(app.id);
    document.getElementById('meta-og-image').setAttribute('content', shareImageUrl);
}

function updateUI(app) {
    // Проверяем, использует ли пользователь темный режим
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Загрузка иконки приложения с Cloudinary с учетом темного режима
    const iconUrl = getCloudinaryImageUrl(app.id, 'app-icon', 'png', prefersDarkMode);
    document.getElementById("app-icon").src = iconUrl;
    
    // Добавляем обработчик ошибки для иконки, чтобы использовать светлую версию, если темная не найдена
    document.getElementById("app-icon").onerror = function() {
        this.src = getCloudinaryImageUrl(app.id, 'app-icon', 'png', false);
        this.onerror = null; // Предотвращаем бесконечный цикл
    };
    
    document.getElementById("app-title").textContent = app.title;
    document.getElementById("app-subtitle").textContent = app.subtitle;

    document.getElementById("app-description").innerHTML = app.fullDescription
    .map(p => p ? (p.startsWith('- ') ? `<li>${p.substring(2)}</li>` : `<p>${p}</p>`) : '<br>')
    .join('');

    document.getElementById("app-store-link").href = `https://itunes.apple.com/us/app/id${app.appStoreId}`;
    
    // Выбираем бейдж App Store из Cloudinary в зависимости от темного режима
    const appStoreBadgeUrl = getAppStoreBadgeUrl(prefersDarkMode);
    document.querySelector("#app-store-link img").src = appStoreBadgeUrl;
    
    // Добавляем обработчик ошибки для бейджа, чтобы использовать светлую версию, если темная не найдена
    document.querySelector("#app-store-link img").onerror = function() {
        this.src = getAppStoreBadgeUrl(false);
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
    
    // Загрузка галереи скриншотов
    const screenshotsContainer = document.getElementById("screenshots-container");
    screenshotsContainer.innerHTML = ''; // Очищаем контейнер перед добавлением скриншотов
    
    // Определяем, какие скриншоты нужно отображать
    // Если в JSON определен массив screenshots, используем его,
    // иначе используем стандартные номера (1, 2, 3)
    let screenshotsToShow = app.screenshots || [1, 2, 3];
    
    // Определяем максимальное количество скриншотов для отображения (3 для десктопа, 2 для мобильного)
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    const maxScreenshots = isPortrait ? 2 : 3;
    
    // Ограничиваем количество скриншотов в зависимости от устройства
    screenshotsToShow = screenshotsToShow.slice(0, maxScreenshots);
    
    // Создаем плейсхолдеры для всех скриншотов сразу
    for (let i = 0; i < maxScreenshots; i++) {
        const screenshotDiv = document.createElement("div");
        screenshotDiv.className = "screenshot-item";
        
        // Применяем соотношение сторон из JSON, если оно указано
        const aspectRatio = app.screenshotAspectRatio || '1530 / 3036';
        screenshotDiv.style.aspectRatio = aspectRatio;
        
        // Добавляем скелетон-плейсхолдер
        const skeleton = document.createElement("div");
        skeleton.className = "screenshot-skeleton";
        skeleton.id = `screenshot-placeholder-${i + 1}`;
        
        screenshotDiv.appendChild(skeleton);
        screenshotsContainer.appendChild(screenshotDiv);
    }
    
    // Загружаем все изображения асинхронно
    screenshotsToShow.forEach((screenNumber, index) => {
        const img = new Image();
        
        // Получаем URL скриншота из Cloudinary с учетом темного режима
        img.src = getCloudinaryImageUrl(app.id, `app-screen-${screenNumber}`, 'png', prefersDarkMode);
        img.alt = `Screenshot ${screenNumber} of the app`;
        
        // Добавляем класс для анимации появления
        img.classList.add('screenshot-image');
        
        // Обработчик ошибки для использования светлой версии, если темная не найдена
        img.onerror = function() {
            this.src = getCloudinaryImageUrl(app.id, `app-screen-${screenNumber}`, 'png', false);
            
            // Если и светлая версия не найдена, скрываем скелетон
            this.onerror = function() {
                const placeholder = document.getElementById(`screenshot-placeholder-${index + 1}`);
                if (placeholder) {
                    placeholder.parentNode.style.display = 'none';
                }
            };
        };
        
        // Обработчик загрузки изображения
        img.onload = function() {
            const placeholder = document.getElementById(`screenshot-placeholder-${index + 1}`);
            if (placeholder) {
                // Задержка для плавности (небольшая, чтобы не заставлять ждать пользователя)
                setTimeout(() => {
                    // Плавное исчезновение скелетона
                    placeholder.style.opacity = '0';
                    
                    // После завершения анимации fade-out скелетона
                    setTimeout(() => {
                        // Заменяем плейсхолдер на загруженное изображение
                        placeholder.parentNode.replaceChild(img, placeholder);
                        
                        // Плавное появление изображения
                        setTimeout(() => {
                            img.style.opacity = '1';
                        }, 50);
                    }, 200);
                }, 100 * index); // Стаггерированная анимация для разных скриншотов
            }
        };
    });
    
    // Устанавливаем email в футере
    document.getElementById("email-link").href = `mailto:${app.email}`;
    
    // Обновляем ссылку на страницу Privacy Policy
    document.getElementById("privacy-link").href = `app-privacy.html?id=${app.id}`;
}

// Вызов функции загрузки при загрузке страницы
loadAppDetail();
