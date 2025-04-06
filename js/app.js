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
    "iPhone 15 Pro Max": "1290 / 2796",
    "Google Pixel 1": "1212 / 2457",
    "iPhone 15 Pro Max - Landscape": "3036 / 1530",
    // Другие устройства можно добавить по мере необходимости
};

// Соответствие устройств и радиусов скругления для скриншотов
const DEVICE_CORNER_RADIUS = {
    "iPhone 16 Pro Max": "7%",
    "iPhone 15 Pro Max": "7%",
    // Другие устройства можно добавить по мере необходимости
};

// Настройки для размещения скриншота внутри рамки устройства
const DEVICE_SCREENSHOT_CONFIG = {
    "iPhone 16 Pro Max": {
        width: "90%",         //  Screenshot 1320W / Bezel 1470W * 100% = 89.79591837%
        offsetY: "0%",       // Смещение скриншота по вертикали
        offsetX: "0%"         // Смещение скриншота по горизонтали
    },
    "iPhone 15 Pro Max": {
        width: "85%", //  Screenshot 1290W / Bezel 1530W * 100% = 89.79591837
        offsetY: "0%",
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
    
    // Загружаем рамку устройства заранее
    function createScreenshotElement(screenNumber, index) {
        // Имя файла устройства (например, iphone-16-pro-max-natural-titanium-portrait.png)
        const bezelFileName = deviceModel.toLowerCase().replace(/ /g, '-') + '-natural-titanium-portrait.png';
        
        // Используем Cloudinary для получения рамки устройства
        const bezelFilePath = getDeviceBezelUrl(deviceModel);
        
        // Запасной вариант рамки устройства из Cloudinary
        const fallbackBezelPath = getDeviceBezelUrl('iPhone 16 Pro Max');
        
        // Создаем основной контейнер для скриншота
        const screenshotContainer = document.createElement("div");
        screenshotContainer.className = "screenshot-container";
        screenshotContainer.setAttribute("data-device", deviceModel);
        
        // Создаем элемент для скриншота
        const screenshotItem = document.createElement("div");
        screenshotItem.className = "screenshot-item";
        
        // Применяем соотношение сторон из маппинга устройств
        screenshotItem.style.aspectRatio = aspectRatio;
        
        // Применяем настройки размещения скриншота в устройстве
        screenshotItem.style.width = screenshotConfig.width;
        screenshotItem.style.transform = `translateY(${screenshotConfig.offsetY}) translateX(${screenshotConfig.offsetX})`;
        
        // Сначала создаем и добавляем рамку устройства (она должна загрузиться первой)
        const deviceBezel = document.createElement("div");
        deviceBezel.className = "device-bezel";
        
        const bezelImg = new Image();
        bezelImg.className = "device-bezel-image";
        bezelImg.alt = `${deviceModel} Frame`;
        bezelImg.src = bezelFilePath;
        
        // Обработчик ошибки для рамки устройства
        bezelImg.onerror = function() {
            // Пробуем загрузить стандартную рамку iPhone 16 Pro Max как запасной вариант
            if (deviceModel !== "iPhone 16 Pro Max") {
                this.src = fallbackBezelPath;
                
                // Если и стандартная рамка не загрузилась, скрываем элемент рамки
                this.onerror = function() {
                    deviceBezel.style.display = 'none';
                };
            } else {
                // Если не удалось загрузить стандартную рамку, скрываем элемент
                deviceBezel.style.display = 'none';
            }
        };
        
        // Теперь создаем и добавляем скриншот
        const screenshotImg = new Image();
        screenshotImg.className = 'screenshot-image';
        screenshotImg.alt = `Screenshot ${screenNumber} of the app`;
        screenshotImg.style.borderRadius = cornerRadius;
        
        // Загружаем скриншот с учетом темного режима
        const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        screenshotImg.src = getCloudinaryImageUrl(app.id, `app-screen-${screenNumber}`, 'png', prefersDarkMode);
        
        // Обработчик ошибки для скриншота
        screenshotImg.onerror = function() {
            // Если темная версия не загрузилась, пробуем светлую
            if (prefersDarkMode) {
                this.src = getCloudinaryImageUrl(app.id, `app-screen-${screenNumber}`, 'png', false);
                this.onerror = function() {
                    screenshotContainer.style.display = 'none'; // Скрываем весь контейнер, если оба варианта не загружаются
                };
            } else {
                screenshotContainer.style.display = 'none'; // Скрываем контейнер, если изображение не загружается
            }
        };
        
        // Обработчик успешной загрузки скриншота
        screenshotImg.onload = function() {
            this.style.opacity = '1'; // Показываем скриншот когда он загрузился
        };
        
        // Собираем структуру
        deviceBezel.appendChild(bezelImg);
        screenshotItem.appendChild(screenshotImg);
        screenshotContainer.appendChild(deviceBezel);
        screenshotContainer.appendChild(screenshotItem);
        
        return screenshotContainer;
    }
    
    // Создаем все скриншоты и добавляем их в контейнер
    screenshotsToShow.forEach((screenNumber, index) => {
        const screenshotElement = createScreenshotElement(screenNumber, index);
        screenshotsContainer.appendChild(screenshotElement);
    });
    
    // Всегда создаем три контейнера в режиме landscape для сохранения макета
    if (!isPortrait && screenshotsToShow.length < 3) {
        // Добавляем пустые плейсхолдеры для сохранения макета
        for (let i = screenshotsToShow.length; i < 3; i++) {
            const placeholderContainer = document.createElement("div");
            placeholderContainer.className = "screenshot-container";
            placeholderContainer.style.visibility = "hidden"; // Делаем невидимым, но сохраняем в потоке
            screenshotsContainer.appendChild(placeholderContainer);
        }
    }
    
    // Устанавливаем email в футере
    document.getElementById("email-link").href = `mailto:${app.email}`;
    
    // Обновляем ссылку на страницу Privacy Policy
    document.getElementById("privacy-link").href = `app-privacy.html?id=${app.id}`;
}

// Вызов функции загрузки при загрузке страницы
loadAppDetail();
