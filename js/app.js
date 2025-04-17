// --- Глобальные константы и маппинги устройств ---
/**
 * Соотношения сторон для скриншотов разных устройств
 */
const SCREENSHOT_ASPECT_RATIOS = {
    "iPhone 16 Pro Max": "1320 / 2868",
    "iPhone 15 Pro Max": "1290 / 2796",
    "Google Pixel 1": "1212 / 2457",
    "iPhone 15 Pro Max - Landscape": "3036 / 1530",
    "Slide 16/9": "16 / 9",
    "App Store Screenshot 510/1012": "510 / 1012",
    "Screenshots Missing": "9 / 16",
    "App Store Screenshot 460/996": "460 / 996",
    "App Store Screenshot 2160/3840": "2160 / 3840",
    "Screenshot 1176/2088 ": "1176 / 2088",
    "App Store Screenshot 1176/2088": "1176 / 2088",
    "Screenshot 1728/2304": "1728 / 2304",
    "App Store Screenshot 495/994": "495 / 994",
    "Website Screenshot 1440/950": "1440 / 950"
};

/**
 * Радиусы скругления для скриншотов разных устройств
 */
const SCREENSHOT_CORNER_RADIUS = {
    "Slide 16/9": "10px",
    "Website Screenshot 1440/950": "10px",
    "Screenshot 1176/2088": "0%",
    "iPhone 16 Pro Max": "7%",
    "iPhone 15 Pro Max": "7%",
    "iPhone 15 Pro Max - Landscape": "7%",
    "Google Pixel 1": "0%",
    "App Store Screenshot 460/996": "10px",
    "App Store Screenshot 392/696": "10px"
};

/**
 * Настройки размещения скриншота внутри рамки устройства
 */
const DEVICE_SCREENSHOT_CONFIG = {
    "iPhone 16 Pro Max": {
        width: "90%",
        offsetY: "0.1%",
        offsetX: "0%"
    },
    "iPhone 15 Pro Max": {
        width: "84.5%",
        offsetY: "0%",
        offsetX: "0%"
    },
    "iPhone 15 Pro Max - Landscape": {
        width: "92%",
        offsetY: "0%",
        offsetX: "0%"
    }
};

/**
 * Маппинг моделей устройств и файлов рамок
 */
const DEVICE_BEZEL_FILES = {
    "iPhone 16 Pro Max": "iphone-16-pro-max-natural-titanium-portrait",
    "iPhone 15 Pro Max": "iphone-15-pro-max-natural-titanium-portrait",
    "iPhone 15 Pro Max - Landscape": "iphone-15-pro-max-natural-titanium-landscape"
};

// Делаем маппинг доступным глобально для использования в cloudinary.js
if (typeof window !== 'undefined') {
    window.DEVICE_BEZEL_FILES = DEVICE_BEZEL_FILES;
}

/**
 * Обновляет мета-теги страницы под текущее приложение
 * @param {object} app
 */
function updateMetaTags(app) {
    document.title = app.title;
    document.querySelector('meta[name="description"]').setAttribute("content", app.shortDescription || app.fullDescription[0] || app.title);
    if (app.appStoreId) {
        document.getElementById('meta-app-store').setAttribute("content", `app-id=${app.appStoreId}, app-argument=${window.location.href}`);
    }
    document.querySelector('meta[name="apple-mobile-web-app-title"]').setAttribute("content", app.title);
}

/**
 * Генерирует HTML для описания приложения
 * @param {string[]} fullDescription
 * @returns {string}
 */
function renderDescription(fullDescription) {
    return fullDescription.map(p => {
        if (!p) return '<br>';
        if (p.startsWith(' ')) {
            const listItem = p.substring(2);
            return `<li>${listItem}</li>`;
        }
        return `<p>${p}</p>`;
    }).join('');
}

/**
 * Создаёт DOM-элемент скриншота с рамкой или без
 */
function createScreenshotElement(app, deviceModel, aspectRatio, cornerRadius, screenshotConfig, screenNumber, index) {
    // Типы скриншотов без рамки
    const noBezelScreenshotTypes = [
        "Screenshots Missing", "Slide 16/9", "Website Screenshot 1440/950", "App Store Screenshot 2160/3840",
        "App Store Screenshot 1176/2088", "App Store Screenshot 510/1012", "App Store Screenshot 495/994",
        "App Store Screenshot 460/996", "App Store Screenshot 392/696", "Screenshot 1728/2304", "Screenshot 1176/2088",
        "Google Pixel 1", "Screenshot 576/1024", "Screenshot 174/310"
    ];
    // Типы скриншотов без рамки, но со скруглением
    const noBezelWithRadiusTypes = [
        "Slide 16/9", "Website Screenshot 1440/950", "App Store Screenshot 460/996", "App Store Screenshot 392/696"
    ];
    const shouldShowBezel = !noBezelScreenshotTypes.includes(deviceModel);
    const bezelFileName = DEVICE_BEZEL_FILES[deviceModel] || deviceModel.toLowerCase().replace(/ /g, '-') + '-natural-titanium-portrait';
    const bezelUrl = shouldShowBezel ? getDeviceBezelUrl(deviceModel) : '';
    const fallbackBezelUrl = shouldShowBezel ? getDeviceBezelUrl('iPhone 16 Pro Max') : '';
    // Контейнер для скриншота
    const screenshotContainer = document.createElement("div");
    screenshotContainer.className = "screenshot-container";
    screenshotContainer.setAttribute("data-device", deviceModel);
    // Элемент скриншота
    const screenshotItem = document.createElement("div");
    screenshotItem.className = "screenshot-item";
    if (!shouldShowBezel) {
        screenshotItem.style.width = "100%";
        screenshotItem.style.transform = "none";
    } else {
        screenshotItem.style.aspectRatio = aspectRatio;
        screenshotItem.style.width = screenshotConfig.width;
        screenshotItem.style.transform = `translateY(${screenshotConfig.offsetY}) translateX(${screenshotConfig.offsetX})`;
    }
    // Рамка устройства
    let deviceBezel = null;
    if (shouldShowBezel) {
        deviceBezel = document.createElement("div");
        deviceBezel.className = "device-bezel";
        const bezelImg = new Image();
        bezelImg.className = "device-bezel-image";
        bezelImg.alt = `${deviceModel} Frame`;
        bezelImg.src = bezelUrl;
        bezelImg.onerror = function () {
            if (deviceModel !== "iPhone 16 Pro Max") {
                this.src = fallbackBezelUrl;
                this.onerror = function () { deviceBezel.style.display = 'none'; };
            } else {
                deviceBezel.style.display = 'none';
            }
        };
        deviceBezel.appendChild(bezelImg);
    }
    if (!shouldShowBezel) {
        screenshotItem.style.aspectRatio = aspectRatio;
    }
    // Сам скриншот
    const screenshotImg = new Image();
    screenshotImg.className = 'screenshot-image';
    screenshotImg.alt = `Screenshot ${screenNumber} of the app`;
    if (noBezelWithRadiusTypes.includes(deviceModel)) {
        screenshotImg.style.borderRadius = SCREENSHOT_CORNER_RADIUS[deviceModel] || "0";
    } else {
        screenshotImg.style.borderRadius = shouldShowBezel ? cornerRadius : "0";
    }
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    screenshotImg.src = getCloudinaryImageUrl(app.id, `app-screen-${screenNumber}`, 'png', prefersDarkMode);
    screenshotImg.onerror = function () {
        if (prefersDarkMode) {
            this.src = getCloudinaryImageUrl(app.id, `app-screen-${screenNumber}`, 'png', false);
            this.onerror = function () { screenshotContainer.style.display = 'none'; };
        } else {
            screenshotContainer.style.display = 'none';
        }
    };
    screenshotImg.onload = function () { this.style.opacity = '1'; };
    screenshotItem.appendChild(screenshotImg);
    if (shouldShowBezel) {
        screenshotContainer.appendChild(deviceBezel);
    }
    screenshotContainer.appendChild(screenshotItem);
    return screenshotContainer;
}

/**
 * Рендерит галерею скриншотов приложения
 */
function renderScreenshots(app, screenshotsToShow, deviceModel, aspectRatio, cornerRadius, screenshotConfig) {
    const screenshotsContainer = document.getElementById("screenshots-container");
    screenshotsContainer.innerHTML = '';
    screenshotsToShow.forEach((screenNumber, index) => {
        const screenshotElement = createScreenshotElement(app, deviceModel, aspectRatio, cornerRadius, screenshotConfig, screenNumber, index);
        screenshotsContainer.appendChild(screenshotElement);
    });
}

/**
 * Рендерит бейджи магазинов и Product Hunt
 */
function renderBadges(app, prefersDarkMode) {
    // App Store
    const appStoreContainer = document.getElementById("app-store-link");
    if (app.appStoreId && app.appStoreId.trim() !== '') {
        appStoreContainer.href = `https://itunes.apple.com/us/app/id${app.appStoreId}`;
        const appStoreBadgeUrl = getAppStoreBadgeUrl(prefersDarkMode);
        document.querySelector("#app-store-link img").src = appStoreBadgeUrl;
        document.querySelector("#app-store-link img").onerror = function () {
            this.src = getAppStoreBadgeUrl(false);
            this.onerror = null;
        };
        appStoreContainer.style.display = "inline-block";
    } else {
        appStoreContainer.style.display = "none";
    }
    // Google Play
    const googlePlayContainer = document.getElementById("google-play-link");
    if (app.googlePlayId && app.googlePlayId.trim() !== '') {
        googlePlayContainer.href = `https://play.google.com/store/apps/details?id=${app.googlePlayId}`;
        const googlePlayBadgeUrl = getGooglePlayBadgeUrl();
        document.querySelector("#google-play-link img").src = googlePlayBadgeUrl;
        document.querySelector("#google-play-link img").onerror = function () {
            googlePlayContainer.style.display = "none";
            this.onerror = null;
        };
        googlePlayContainer.style.display = "inline-block";
    } else {
        googlePlayContainer.style.display = "none";
    }
    // Product Hunt
    const phContainer = document.getElementById("product-hunt-container");
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

/**
 * Основная функция обновления UI приложения
 */
function updateUI(app) {
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Иконка приложения
    const iconUrl = getCloudinaryImageUrl(app.id, 'app-icon', 'png', prefersDarkMode);
    const appIcon = document.getElementById("app-icon");
    appIcon.src = iconUrl;
    appIcon.onerror = function () {
        this.src = getCloudinaryImageUrl(app.id, 'app-icon', 'png', false);
        this.onerror = null;
    };
    document.getElementById("app-title").textContent = app.title;
    document.getElementById("app-subtitle").textContent = app.subtitle;
    document.getElementById("app-description").innerHTML = renderDescription(app.fullDescription);
    // Галерея скриншотов
    let screenshotsToShow = app.screenshots || [1, 2, 3];
    if (screenshotsToShow.length === 0 || (screenshotsToShow.length === 1 && screenshotsToShow[0] === 0)) {
        const missingContainer = document.createElement("div");
        missingContainer.className = "screenshots-missing";
        missingContainer.textContent = "Screenshots Missing";
        document.getElementById("screenshots-container").innerHTML = '';
        document.getElementById("screenshots-container").appendChild(missingContainer);
    } else {
        const isPortrait = window.matchMedia('(orientation: portrait)').matches;
        const maxScreenshots = isPortrait ? 2 : 3;
        screenshotsToShow = screenshotsToShow.slice(0, maxScreenshots);
        const deviceModel = app.screenshotProduct || "iPhone 16 Pro Max";
        const aspectRatio = SCREENSHOT_ASPECT_RATIOS[deviceModel] || "1530 / 3036";
        const cornerRadius = SCREENSHOT_CORNER_RADIUS[deviceModel] || "0%";
        const screenshotConfig = DEVICE_SCREENSHOT_CONFIG[deviceModel] || DEVICE_SCREENSHOT_CONFIG["iPhone 16 Pro Max"];
        renderScreenshots(app, screenshotsToShow, deviceModel, aspectRatio, cornerRadius, screenshotConfig);
    }
    // Бейджи и футер
    const badgesContainer = document.querySelector(".badges-container");
    const footerContainer = document.querySelector(".link-footer-app-page");
    const shouldShowBadgesAndFooter = app.status === "availableForSale";
    badgesContainer.style.display = shouldShowBadgesAndFooter ? "block" : "none";
    footerContainer.style.display = shouldShowBadgesAndFooter ? "flex" : "none";
    document.getElementById("email-link").href = `mailto:${app.email}`;
    document.getElementById("privacy-link").href = `app-privacy.html?id=${app.id}`;
    if (shouldShowBadgesAndFooter) {
        renderBadges(app, prefersDarkMode);
    }
}

/**
 * Основная функция загрузки и инициализации страницы приложения
 */
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
    requestAnimationFrame(() => {
        updateUI(app);
    });
}

// Инициализация после загрузки DOM
// (DOMContentLoaded гарантирует, что шаблон и контейнер уже в DOM)
document.addEventListener('DOMContentLoaded', loadAppDetail);
