async function loadAppDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const appId = urlParams.get("id");
    
    const response = await fetch("../data/apps-metadata-public.json");
    const apps = await response.json();
    const app = apps.find(a => a.id === appId);
    
    if (!app) {
        document.body.innerHTML = "<h2>App not found</h2>";
        return;
    }

    updateMetaTags(app);
    updateUI(app);
}

// Соответствие устройств и соотношений сторон
const DEVICE_ASPECT_RATIOS = {
    "iPhone 16 Pro Max": "1320 / 2868",
    "iPhone 15 Pro Max": "1530 / 3036",
    // Другие устройства можно добавить по мере необходимости
};

// Соответствие устройств и радиусов скругления для скриншотов
const DEVICE_CORNER_RADIUS = {
    "iPhone 16 Pro Max": "20px",
    "iPhone 15 Pro Max": "40px",
    // Другие устройства можно добавить по мере необходимости
};

// Настройки для размещения скриншота внутри рамки устройства
const DEVICE_SCREENSHOT_CONFIG = {
    "iPhone 16 Pro Max": {
        width: "89.79591837%",         // Ширина скриншота относительно рамки
        offsetY: "0%",       // Смещение скриншота по вертикали
        offsetX: "0%"         // Смещение скриншота по горизонтали
    },
    "iPhone 15 Pro Max": {
        width: "87%",
        offsetY: "-1%",
        offsetX: "0%"
    }
    // Добавьте другие устройства с их настройками по мере необходимости
};

function updateMetaTags(app) {
    document.title = app.title;
    document.querySelector('meta[name="description"]').setAttribute("content", app.metaDescription);
    document.querySelector('meta[property="og:title"]').setAttribute("content", app.title);
    document.querySelector('meta[property="og:description"]').setAttribute("content", app.metaDescription);
    const appUrl = `https://sergeykushner.github.io/pages/app.html?id=${app.id}`;
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
    if (app.productHuntBadge) {
        phContainer.innerHTML = app.productHuntBadge;
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
    
    // Получаем тип устройства и его соотношение сторон
    const deviceModel = app.screenshotProduct || "iPhone 16 Pro Max"; // По умолчанию iPhone 16 Pro Max
    const aspectRatio = DEVICE_ASPECT_RATIOS[deviceModel] || "1530 / 3036";
    const cornerRadius = DEVICE_CORNER_RADIUS[deviceModel] || "40px";
    
    // Получаем настройки для размещения скриншота в устройстве
    const screenshotConfig = DEVICE_SCREENSHOT_CONFIG[deviceModel] || 
        DEVICE_SCREENSHOT_CONFIG["iPhone 16 Pro Max"]; // Используем значения по умолчанию
    
    // Создаем плейсхолдеры для всех скриншотов сразу
    for (let i = 0; i < maxScreenshots; i++) {
        const screenshotContainer = document.createElement("div");
        screenshotContainer.className = "screenshot-container";
        screenshotContainer.setAttribute("data-device", deviceModel);
        
        // Создаем элемент для скриншота
        const screenshotDiv = document.createElement("div");
        screenshotDiv.className = "screenshot-item";
        
        // Применяем соотношение сторон из маппинга устройств
        screenshotDiv.style.aspectRatio = aspectRatio;
        
        // Применяем настройки размещения скриншота в устройстве
        screenshotDiv.style.width = screenshotConfig.width;
        screenshotDiv.style.transform = `translateY(${screenshotConfig.offsetY}) translateX(${screenshotConfig.offsetX})`;
        
        // Создаем контейнер для изображения устройства
        const deviceContainer = document.createElement("div");
        deviceContainer.className = "device-bezel";
        deviceContainer.id = `device-bezel-${i + 1}`;
        deviceContainer.setAttribute("data-device", deviceModel);
        
        // Добавляем изображение устройства
        const deviceBezel = document.createElement("img");
        deviceBezel.className = "device-bezel-image";
        deviceBezel.alt = `${deviceModel} Frame`;
        
        // Имя файла устройства (например, iphone-16-pro-max-natural-titanium-portrait.png)
        const bezelFileName = deviceModel.toLowerCase().replace(/ /g, '-') + '-natural-titanium-portrait.png';
        deviceBezel.src = `../assets/product-bezels/${bezelFileName}`;
        
        // Обработчик ошибки загрузки рамки устройства
        deviceBezel.onerror = function() {
            // Пробуем загрузить стандартную рамку iPhone 16 Pro Max как запасной вариант
            if (deviceModel !== "iPhone 16 Pro Max") {
                this.src = '../assets/product-bezels/iphone-16-pro-max-natural-titanium-portrait.png';
                
                // Если и стандартная рамка не загрузилась, скрываем контейнер рамки
                this.onerror = function() {
                    deviceContainer.style.display = 'none';
                };
            } else {
                // Если не удалось загрузить стандартную рамку, просто скрываем контейнер
                deviceContainer.style.display = 'none';
            }
        };
        
        // Структура: скриншот внутри контейнера
        deviceContainer.appendChild(deviceBezel);
        screenshotContainer.appendChild(screenshotDiv);
        screenshotContainer.appendChild(deviceContainer);
        screenshotsContainer.appendChild(screenshotContainer);
    }
    
    // Загружаем все изображения асинхронно
    screenshotsToShow.forEach((screenNumber, index) => {
        const img = new Image();
        
        // Получаем URL скриншота из Cloudinary с учетом темного режима
        img.src = getCloudinaryImageUrl(app.id, `app-screen-${screenNumber}`, 'png', prefersDarkMode);
        img.alt = `Screenshot ${screenNumber} of the app`;
        
        // Добавляем класс для анимации появления и применяем радиус скругления
        img.classList.add('screenshot-image');
        img.style.borderRadius = cornerRadius;
        
        // Применяем настройки размещения скриншота в устройстве для изображения
        img.style.width = '100%'; // Изображение заполняет весь контейнер
        img.style.height = '100%';
        
        // Обработчик ошибки для использования светлой версии, если темная не найдена
        img.onerror = function() {
            this.src = getCloudinaryImageUrl(app.id, `app-screen-${screenNumber}`, 'png', false);
            
            // Если и светлая версия не найдена, скрываем элементы
            this.onerror = function() {
                const screenshotDiv = document.querySelectorAll('.screenshot-item')[index];
                if (screenshotDiv) {
                    screenshotDiv.style.display = 'none';
                }
                
                // Также скрываем и рамку устройства
                const deviceBezel = document.getElementById(`device-bezel-${index + 1}`);
                if (deviceBezel) {
                    deviceBezel.style.display = 'none';
                }
            };
        };
        
        // Сразу добавляем изображение к соответствующему контейнеру для скриншота
        const screenshotDiv = document.querySelectorAll('.screenshot-item')[index];
        if (screenshotDiv) {
            screenshotDiv.appendChild(img);
        }
        
        // Обработчик загрузки изображения
        img.onload = function() {
            // Отображаем рамку устройства после загрузки скриншота
            const deviceBezel = document.getElementById(`device-bezel-${index + 1}`);
            if (deviceBezel) {
                const bezelImg = deviceBezel.querySelector('img');
                if (bezelImg) {
                    bezelImg.style.display = 'block';
                }
            }
            
            // Показываем изображение скриншота
            img.style.opacity = '1';
        };
    });
    
    // Устанавливаем email в футере
    document.getElementById("email-link").href = `mailto:${app.email}`;
    
    // Обновляем ссылку на страницу Privacy Policy
    document.getElementById("privacy-link").href = `app-privacy.html?id=${app.id}`;
}

// Вызов функции загрузки при загрузке страницы
loadAppDetail();
