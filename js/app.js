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

    // Defer UI updates slightly using requestAnimationFrame
    // to allow the browser to potentially process meta tag changes first.
    requestAnimationFrame(() => {
        updateUI(app);
    });
}

// Соответствие устройств и соотношений сторон
const DEVICE_ASPECT_RATIOS = {
    "iPhone 16 Pro Max": "1320 / 2868",
    "iPhone 15 Pro Max": "1290 / 2796",
    "Google Pixel 1": "1212 / 2457",
    "iPhone 15 Pro Max - Landscape": "3036 / 1530",
    "Slide 16/9": "16 / 9",
    "App Store Screenshot 510/1012": "510 / 1012",
    "Screenshots Missing": "9 / 16", // Используем соотношение 9/16 по умолчанию
    "App Store Screenshot 460/996": "460 / 996",
    "App Store Screenshot 2160/3840": "2160 / 3840",
    "Screenshot 1176/2088 ": "1176 / 2088",
    "App Store Screenshot 1176/2088": "1176 / 2088",
    "Screenshot 1728/2304": "1728 / 2304",
    "App Store Screenshot 495/994": "495 / 994",
    "Website Screenshot 1440/950": "1440 / 950",
    "Screenshot 1728/2304": "1728 / 2304"
    // Другие устройства можно добавить по мере необходимости
};

// Соответствие устройств и радиусов скругления для скриншотов
const DEVICE_CORNER_RADIUS = {
    "Slide 16/9": "10px",
    "Website Screenshot 1440/950": "10px",
    "Screenshot 1176/2088": "0%",
    "iPhone 16 Pro Max": "7%",
    "iPhone 15 Pro Max": "7%",
    "iPhone 15 Pro Max - Landscape": "7%",
    "Google Pixel 1": "0%",
    "App Store Screenshot 460/996": "10px",
    "App Store Screenshot 392/696": "10px"
    // Другие устройства можно добавить по мере необходимости
};

// Настройки для размещения скриншота внутри рамки устройства
const DEVICE_SCREENSHOT_CONFIG = {
    "iPhone 16 Pro Max": {
        width: "90%",         //  Screenshot 1320W / Bezel 1470W * 100% = 89.79591837%
        offsetY: "0.1%",       // Смещение скриншота по вертикали
        offsetX: "0%"         // Смещение скриншота по горизонтали
    },
    "iPhone 15 Pro Max": {
        width: "84.5%", //  Screenshot 1290W / Bezel 1530W * 100% = 89.79591837
        offsetY: "0%",
        offsetX: "0%"
    },
    "iPhone 15 Pro Max - Landscape": {
        width: "92%", //  Screenshot iPhone 15 Pro Max, Bezel iPhone 15 Pro  
        offsetY: "0%",
        offsetX: "0%"
    },
    // "Screenshot 1176/2088": {
    //     width: "86%",
    //     offsetY: "0.25%",
    //     offsetX: "0%"
    // },
    // "Google Pixel 1": {
    //     width: "90%",
    //     offsetY: "-1%",
    //     offsetX: "-0.4%"
    // }
    // Добавьте другие устройства с их настройками по мере необходимости
};

// Настройки для конкретных моделей устройств и их файлов рамок
const DEVICE_BEZEL_FILES = {
    "iPhone 16 Pro Max": "iphone-16-pro-max-natural-titanium-portrait",
    "iPhone 15 Pro Max": "iphone-15-pro-max-natural-titanium-portrait",
    "iPhone 15 Pro Max - Landscape": "iphone-15-pro-max-natural-titanium-landscape",
    // "Screenshot 1176/2088": "iphone-6s-plus-space-gray-portrait",
    // "Google Pixel 1": "google-pixel-1-silver-portrait"
    // Другие устройства можно добавить по мере необходимости
};

// Делаем маппинг доступным глобально для использования в cloudinary.js
if (typeof window !== 'undefined') {
    window.DEVICE_BEZEL_FILES = DEVICE_BEZEL_FILES;
}

function updateMetaTags(app) {
    // Основные мета-теги
    document.title = app.title;
    document.querySelector('meta[name="description"]').setAttribute("content", app.shortDescription || app.fullDescription[0] || app.title);

    // Установка мета-тега для Smart App Banner
    if (app.appStoreId) {
        document.getElementById('meta-app-store').setAttribute("content", `app-id=${app.appStoreId}, app-argument=${window.location.href}`);
    }

    // Устанавливаем apple-mobile-web-app-title
    document.querySelector('meta[name="apple-mobile-web-app-title"]').setAttribute("content", app.title);

    // Получаем текущий URL страницы
    const pageUrl = window.location.href;
}

function updateUI(app) {
    // Проверяем, использует ли пользователь темный режим
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Загрузка иконки приложения с Cloudinary с учетом темного режима
    const iconUrl = getCloudinaryImageUrl(app.id, 'app-icon', 'png', prefersDarkMode);
    document.getElementById("app-icon").src = iconUrl;

    // Добавляем обработчик ошибки для иконки, чтобы использовать светлую версию, если темная не найдена
    document.getElementById("app-icon").onerror = function () {
        this.src = getCloudinaryImageUrl(app.id, 'app-icon', 'png', false);
        this.onerror = null; // Предотвращаем бесконечный цикл
    };

    document.getElementById("app-title").textContent = app.title;
    document.getElementById("app-subtitle").textContent = app.subtitle;

    document.getElementById("app-description").innerHTML = app.fullDescription
        .map(p => {
            if (!p) return '<br>';

            if (p.startsWith(' ')) { // Если строка начинается с - (дефис и пробел) — она преобразуется в HTML-элемент <li>...</li>.
                const listItem = p.substring(2);
                return `<li>${listItem}</li>`;
            }

            return `<p>${p}</p>`;
        })
        .join('');

    // Загрузка галереи скриншотов
    const screenshotsContainer = document.getElementById("screenshots-container");
    screenshotsContainer.innerHTML = ''; // Очищаем контейнер перед добавлением скриншотов

    // Определяем, какие скриншоты нужно отображать
    // Если в JSON определен массив screenshots, используем его,
    // иначе используем стандартные номера (1, 2, 3)
    let screenshotsToShow = app.screenshots || [1, 2, 3];

    // Если в массиве screenshots указан 0 или массив пустой, показываем текст "Screenshots Missing"
    if (screenshotsToShow.length === 0 || (screenshotsToShow.length === 1 && screenshotsToShow[0] === 0)) {
        const missingContainer = document.createElement("div");
        missingContainer.className = "screenshots-missing";
        missingContainer.textContent = "Screenshots Missing";
        screenshotsContainer.appendChild(missingContainer);
    } else {
        // Определяем максимальное количество скриншотов для отображения (3 для десктопа, 2 для мобильного)
        const isPortrait = window.matchMedia('(orientation: portrait)').matches;
        const maxScreenshots = isPortrait ? 2 : 3;

        // Ограничиваем количество скриншотов в зависимости от устройства
        screenshotsToShow = screenshotsToShow.slice(0, maxScreenshots);

        // Получаем тип устройства и его соотношение сторон
        const deviceModel = app.screenshotProduct || "iPhone 16 Pro Max"; // По умолчанию iPhone 16 Pro Max
        const aspectRatio = DEVICE_ASPECT_RATIOS[deviceModel] || "1530 / 3036";
        const cornerRadius = DEVICE_CORNER_RADIUS[deviceModel] || "0%";

        // Получаем настройки для размещения скриншота в устройстве
        const screenshotConfig = DEVICE_SCREENSHOT_CONFIG[deviceModel] ||
            DEVICE_SCREENSHOT_CONFIG["iPhone 16 Pro Max"]; // Используем значения по умолчанию

        // Загружаем рамку устройства заранее
        function createScreenshotElement(screenNumber, index) {
            // Список типов скриншотов, для которых не нужно отображать рамку устройства
            const noBezelScreenshotTypes = [
                "Screenshots Missing",
                "Slide 16/9",
                "Website Screenshot 1440/950",
                "App Store Screenshot 2160/3840",
                "App Store Screenshot 1176/2088",
                "App Store Screenshot 510/1012",
                "App Store Screenshot 495/994",
                "App Store Screenshot 460/996",
                "App Store Screenshot 392/696",
                "Screenshot 1728/2304",
                "Screenshot 1176/2088",
                "Google Pixel 1",
                "Screenshot 576/1024",
                "Screenshot 174/310"
            ];

            // Список типов скриншотов без рамки, но с применением скругления
            const noBezelWithRadiusTypes = [
                "Slide 16/9",
                "Website Screenshot 1440/950",
                "App Store Screenshot 460/996",
                "App Store Screenshot 392/696",
            ];

            // Проверяем, нужно ли отображать рамку устройства
            const shouldShowBezel = !noBezelScreenshotTypes.includes(deviceModel);

            // Получаем имя файла устройства из маппинга или генерируем его
            const bezelFileName = DEVICE_BEZEL_FILES[deviceModel] ||
                deviceModel.toLowerCase().replace(/ /g, '-') + '-natural-titanium-portrait';

            // Используем Cloudinary для получения рамки устройства
            const bezelUrl = shouldShowBezel ? getDeviceBezelUrl(deviceModel) : '';

            // Запасной вариант рамки устройства из Cloudinary
            const fallbackBezelUrl = shouldShowBezel ? getDeviceBezelUrl('iPhone 16 Pro Max') : '';

            // Создаем основной контейнер для скриншота
            const screenshotContainer = document.createElement("div");
            screenshotContainer.className = "screenshot-container";
            screenshotContainer.setAttribute("data-device", deviceModel);


            // Создаем элемент для скриншота
            const screenshotItem = document.createElement("div");
            screenshotItem.className = "screenshot-item";

            // Для скриншотов без рамки: применяем особые стили
            if (!shouldShowBezel) {
                // Для скриншотов без рамки просто используем соотношение самого скриншота
                // и не применяем трансформации позиционирования
                screenshotItem.style.width = "100%";
                screenshotItem.style.transform = "none";
            } else {
                // Применяем соотношение сторон из маппинга устройств
                screenshotItem.style.aspectRatio = aspectRatio;

                // Применяем настройки размещения скриншота в устройстве
                screenshotItem.style.width = screenshotConfig.width;
                screenshotItem.style.transform = `translateY(${screenshotConfig.offsetY}) translateX(${screenshotConfig.offsetX})`;
            }

            // Создаем рамку устройства только если она нужна
            let deviceBezel = null;
            if (shouldShowBezel) {
                // Сначала создаем и добавляем рамку устройства (она должна загрузиться первой)
                deviceBezel = document.createElement("div");
                deviceBezel.className = "device-bezel";

                const bezelImg = new Image();
                bezelImg.className = "device-bezel-image";
                bezelImg.alt = `${deviceModel} Frame`;
                bezelImg.src = bezelUrl;

                // Обработчик ошибки для рамки устройства
                bezelImg.onerror = function () {
                    // Пробуем загрузить стандартную рамку iPhone 16 Pro Max как запасной вариант
                    if (deviceModel !== "iPhone 16 Pro Max") {
                        this.src = fallbackBezelUrl;

                        // Если и стандартная рамка не загрузилась, скрываем элемент рамки
                        this.onerror = function () {
                            deviceBezel.style.display = 'none';
                        };
                    } else {
                        // Если не удалось загрузить стандартную рамку, скрываем элемент
                        deviceBezel.style.display = 'none';
                    }
                };

                deviceBezel.appendChild(bezelImg);
            }

            // Настраиваем соотношение сторон для скриншотов без рамки
            if (!shouldShowBezel) {
                // Используем соотношение сторон из маппинга DEVICE_ASPECT_RATIOS
                screenshotItem.style.aspectRatio = aspectRatio;
            }

            // Теперь создаем и добавляем скриншот
            const screenshotImg = new Image();
            screenshotImg.className = 'screenshot-image';
            screenshotImg.alt = `Screenshot ${screenNumber} of the app`;

            // Для скриншотов применяем разные правила скругления углов
            if (noBezelWithRadiusTypes.includes(deviceModel)) {
                // Для скриншотов без рамки, но со скруглением
                screenshotImg.style.borderRadius = DEVICE_CORNER_RADIUS[deviceModel] || "0";
            } else {
                // Для других типов: скругление только с рамкой
                screenshotImg.style.borderRadius = shouldShowBezel ? cornerRadius : "0";
            }

            // Загружаем скриншот с учетом темного режима
            const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            screenshotImg.src = getCloudinaryImageUrl(app.id, `app-screen-${screenNumber}`, 'png', prefersDarkMode);

            // Обработчик ошибки для скриншота
            screenshotImg.onerror = function () {
                // Если темная версия не загрузилась, пробуем светлую
                if (prefersDarkMode) {
                    this.src = getCloudinaryImageUrl(app.id, `app-screen-${screenNumber}`, 'png', false);
                    this.onerror = function () {
                        screenshotContainer.style.display = 'none'; // Скрываем весь контейнер, если оба варианта не загружаются
                    };
                } else {
                    screenshotContainer.style.display = 'none'; // Скрываем контейнер, если изображение не загружается
                }
            };

            // Обработчик успешной загрузки скриншота
            screenshotImg.onload = function () {
                this.style.opacity = '1'; // Показываем скриншот когда он загрузился
            };

            // Собираем структуру
            screenshotItem.appendChild(screenshotImg);
            if (shouldShowBezel) {
                screenshotContainer.appendChild(deviceBezel);
            }
            screenshotContainer.appendChild(screenshotItem);

            return screenshotContainer;
        }

        // Создаем все скриншоты и добавляем их в контейнер
        screenshotsToShow.forEach((screenNumber, index) => {
            const screenshotElement = createScreenshotElement(screenNumber, index);
            screenshotsContainer.appendChild(screenshotElement);
        });
    }

    // Проверяем статус приложения - показываем badges и footer только для приложений со статусом "availableForSale"
    const badgesContainer = document.querySelector(".badges-container");
    const footerContainer = document.querySelector(".link-footer-app-page");

    // Определяем, нужно ли отображать бейджи и футер
    const shouldShowBadgesAndFooter = app.status === "availableForSale";

    // Показываем или скрываем контейнеры
    badgesContainer.style.display = shouldShowBadgesAndFooter ? "block" : "none";
    footerContainer.style.display = shouldShowBadgesAndFooter ? "flex" : "none";

    // Устанавливаем email в футере и обновляем ссылку на Privacy Policy независимо от статуса
    document.getElementById("email-link").href = `mailto:${app.email}`;
    document.getElementById("privacy-link").href = `app-privacy.html?id=${app.id}`;

    // Если не нужно показывать бейджи, то прекращаем обработку
    if (!shouldShowBadgesAndFooter) {
        return;
    }

    // Управление отображением бейджей App Store и Google Play
    const appStoreContainer = document.getElementById("app-store-link");

    // Обработка бейджа App Store
    if (app.appStoreId && app.appStoreId.trim() !== '') {
        appStoreContainer.href = `https://itunes.apple.com/us/app/id${app.appStoreId}`;

        // Выбираем бейдж App Store из Cloudinary в зависимости от темного режима
        const appStoreBadgeUrl = getAppStoreBadgeUrl(prefersDarkMode);
        document.querySelector("#app-store-link img").src = appStoreBadgeUrl;

        // Добавляем обработчик ошибки для бейджа
        document.querySelector("#app-store-link img").onerror = function () {
            this.src = getAppStoreBadgeUrl(false);
            this.onerror = null; // Предотвращаем бесконечный цикл
        };

        appStoreContainer.style.display = "inline-block";
    } else {
        // Если appStoreId отсутствует или пустой, скрываем бейдж
        appStoreContainer.style.display = "none";
    }

    // Обработка бейджа Google Play
    const googlePlayContainer = document.getElementById("google-play-link");
    if (app.googlePlayId && app.googlePlayId.trim() !== '') {
        googlePlayContainer.href = `https://play.google.com/store/apps/details?id=${app.googlePlayId}`;

        // Устанавливаем бейдж Google Play
        const googlePlayBadgeUrl = getGooglePlayBadgeUrl();
        document.querySelector("#google-play-link img").src = googlePlayBadgeUrl;

        // Добавляем обработчик ошибки для бейджа
        document.querySelector("#google-play-link img").onerror = function () {
            googlePlayContainer.style.display = "none";
            this.onerror = null;
        };

        googlePlayContainer.style.display = "inline-block";
    } else {
        // Если googlePlayId отсутствует или пустой, скрываем бейдж
        googlePlayContainer.style.display = "none";
    }

    // Контейнер для Product Hunt бейджа
    const phContainer = document.getElementById("product-hunt-container");

    // Проверка наличия Product Hunt бейджа
    if (app.productHuntBadge) {
        const { productHuntBadgeUrl, productHuntBadgeImage, productHuntBadgeAlt } = app.productHuntBadge;
        phContainer.innerHTML = `
            <a href="${productHuntBadgeUrl}" target="_blank">
                <img src="${productHuntBadgeImage}" alt="${productHuntBadgeAlt}" />
            </a>
        `;
        phContainer.style.display = "block";
    } else {
        phContainer.style.display = "none";
    }
}

// Удаляем прямой вызов loadAppDetail() в конце файла и заменяем его на обработчик DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
    loadAppDetail();
});
