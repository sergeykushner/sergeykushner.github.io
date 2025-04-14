/**
 * Загружает данные о продажах из JSON файла и обрабатывает их.
 * В случае ошибки предоставляет возможность загрузить файл вручную.
 */
async function loadSalesData() {
    try {
        // Загружаем данные из JSON файла
        const response = await fetch("../data/apps-metadata.json");
        const apps = await response.json();

        // Скрываем контейнер с ошибкой, если он был показан
        document.getElementById("error-container").style.display = "none";

        // Обрабатываем данные
        processAppsData(apps);
    } catch (error) {
        console.error("Ошибка при загрузке данных:", error);
        handleDataLoadError();
    }
}

/**
 * Обрабатывает ошибку загрузки данных и настраивает ручную загрузку файла
 */
function handleDataLoadError() {
    // Показываем контейнер с ошибкой
    const errorContainer = document.getElementById("error-container");
    errorContainer.style.display = "block";

    // Настраиваем обработчик загрузки файла
    const fileInput = document.getElementById("manual-file-upload");
    fileInput.value = ""; // Сбрасываем предыдущий выбранный файл

    // Очищаем старый обработчик события, если он был
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);

    // Добавляем новый обработчик события
    newFileInput.addEventListener("change", handleFileUpload);

    // Очищаем контейнер с графиком
    const chartContainer = document.getElementById("chart-sales-container");
    chartContainer.innerHTML = "";
}

/**
 * Обрабатывает загрузку файла пользователем
 * @param {Event} event - Событие изменения input[type=file]
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const apps = JSON.parse(e.target.result);
            // Скрываем контейнер с ошибкой
            document.getElementById("error-container").style.display = "none";
            // Обрабатываем данные
            processAppsData(apps);
        } catch (parseError) {
            console.error("Ошибка при обработке файла:", parseError);
            document.getElementById("error-message").textContent =
                "Некорректный формат файла. Пожалуйста, загрузите правильный JSON файл.";
        }
    };
    reader.readAsText(file);
}

/**
 * Обрабатывает данные приложений, подсчитывает статистику и строит график
 * @param {Array} apps - Массив данных о приложениях
 */
function processAppsData(apps) {
    // Инициализируем переменные для подсчета
    const salesStats = {
        appStore: { sales: 0, proceeds: 0, units: 0 },
        flippa: { sales: 0, proceeds: 0, units: 0 }
    };

    // Счетчик общего количества приложений (исключая App Bundle и Template)
    let totalAppsCount = 0;

    // Объект для подсчета типов приложений
    const appTypeCounter = {};

    // Массив для данных графика
    const chartData = [];

    // Обрабатываем каждое приложение
    apps.forEach(app => {
        // Подсчитываем общее количество приложений (исключая App Bundle и Template)
        if (app.type !== "App Bundle" && app.type !== "") {
            totalAppsCount++;
        }

        // Подсчитываем типы приложений
        if (app.type) {
            appTypeCounter[app.type] = (appTypeCounter[app.type] || 0) + 1;
        }

        // Обрабатываем данные App Store
        processAppStoreData(app, salesStats.appStore);

        // Обрабатываем данные Flippa
        processFlippaData(app, salesStats.flippa);

        // Добавляем данные в массив для графика, если есть продажи
        addToChartDataIfHasSales(app, chartData);
    });

    // Обновляем счетчик приложений в интерфейсе
    document.querySelector("#apps-count span").textContent = totalAppsCount;

    // Обрабатываем и отображаем информацию о типах приложений
    processAppTypesInfo(appTypeCounter, apps);

    // Обновляем отображение статистики продаж
    updateStatsDisplay(
        salesStats.appStore.sales, salesStats.appStore.proceeds, salesStats.appStore.units,
        salesStats.flippa.sales, salesStats.flippa.proceeds, salesStats.flippa.units
    );

    // Сортируем данные графика по дате релиза (от новых к старым)
    chartData.sort((a, b) => {
        // Создаем объекты Date из строк
        const dateA = new Date(a.releaseDate);
        const dateB = new Date(b.releaseDate);

        // Проверяем, валидны ли даты
        const isValidDateA = !isNaN(dateA.getTime());
        const isValidDateB = !isNaN(dateB.getTime());

        // Обрабатываем случаи невалидных дат
        if (!isValidDateA && !isValidDateB) return 0;
        if (!isValidDateA) return 1;
        if (!isValidDateB) return -1;

        // Сортируем от новых к старым
        return dateB - dateA;
    });

    // Строим график продаж
    buildSalesChart(chartData);
}

/**
 * Обрабатывает данные App Store для приложения
 * @param {Object} app - Данные о приложении
 * @param {Object} stats - Объект для накопления статистики App Store
 */
function processAppStoreData(app, stats) {
    if (app.appStoreUnits) {
        stats.units += app.appStoreUnits;
    }

    if (app.appStoreSales) {
        stats.sales += app.appStoreSales;
    }

    if (app.appStoreProceeds) {
        stats.proceeds += app.appStoreProceeds;
    }
}

/**
 * Обрабатывает данные Flippa для приложения
 * @param {Object} app - Данные о приложении
 * @param {Object} stats - Объект для накопления статистики Flippa
 */
function processFlippaData(app, stats) {
    if (app.salePrice) {
        const totalFees = calculateTotalFees(app);

        stats.sales += app.salePrice;
        stats.proceeds += (app.salePrice - totalFees);
        stats.units++; // Каждая продажа на Flippa считается как 1 единица
    }
}

/**
 * Добавляет данные приложения в массив для графика, если есть продажи
 * @param {Object} app - Данные о приложении
 * @param {Array} chartData - Массив данных для графика
 */
function addToChartDataIfHasSales(app, chartData) {
    if ((app.appStoreSales || app.salePrice) && app.id) {
        const appProceeds = app.appStoreProceeds || 0;
        const salePrice = app.salePrice || 0;
        const totalFees = calculateTotalFees(app);
        const flippaNet = salePrice > 0 ? salePrice - totalFees : 0;

        chartData.push({
            id: app.id,
            displayName: app.displayName || app.id,
            appStoreProceeds: appProceeds,
            flippaProceeds: flippaNet,
            total: appProceeds + flippaNet,
            releaseDate: app.releaseDate || "",
            saleDate: app.saleDate || "",
            type: app.type || "App" // Добавляем тип приложения
        });
    }
}

/**
 * Обрабатывает и отображает информацию о типах приложений
 * @param {Object} appTypeCounter - Счетчик типов приложений
 * @param {Array} apps - Массив данных о приложениях
 */
function processAppTypesInfo(appTypeCounter, apps) {
    // Создаем копию объекта счетчика, исключая App Bundle и Template
    const filteredCounter = {};
    for (const [type, count] of Object.entries(appTypeCounter)) {
        if (type !== "App Bundle" && type !== "") {
            filteredCounter[type] = count;
        }
    }

    const typesArray = Object.entries(filteredCounter);

    // Посчитаем платформы для типа "App"
    const platformCounter = {};
    // Счетчик для приложений, которые есть и на iOS, и на Android
    let crossPlatformCount = 0;

    if (filteredCounter["App"]) {
        apps.forEach(app => {
            if (app.type === "App" && app.platform) {
                // Проверяем, является ли platform массивом
                if (Array.isArray(app.platform)) {
                    // Проверяем, есть ли в массиве и iOS, и Android
                    const hasIOS = app.platform.includes("iOS");
                    const hasAndroid = app.platform.includes("Android");

                    if (hasIOS && hasAndroid) {
                        crossPlatformCount++;
                    }

                    // Если это массив, увеличиваем счетчик для каждой платформы в массиве
                    app.platform.forEach(platform => {
                        platformCounter[platform] = (platformCounter[platform] || 0) + 1;
                    });
                } else {
                    // Если это строка, обрабатываем как раньше
                    platformCounter[app.platform] = (platformCounter[app.platform] || 0) + 1;
                }
            }
        });
    }

    // Обновляем значения в существующих HTML-элементах
    if (typesArray.length > 0) {
        // Сначала обрабатываем специальные типы
        let appCount = 0;
        let stickersCount = 0;
        let websiteCount = 0;

        // Подсчитываем количество по каждому типу
        typesArray.forEach(([type, count]) => {
            switch (type) {
                case "App":
                    appCount = count;
                    break;
                case "iMessage Stickers":
                    stickersCount = count;
                    break;
                case "Website":
                    websiteCount = count;
                    break;
            }
        });

        // Обновляем значения для типа "App"
        if (appCount > 0 && Object.keys(platformCounter).length > 0) {
            const iosCount = platformCounter["iOS"] || 0;
            const androidCount = platformCounter["Android"] || 0;

            document.getElementById("total-apps-count").textContent = appCount;
            document.getElementById("ios-count").textContent = iosCount;
            document.getElementById("android-count").textContent = androidCount;
            document.getElementById("cross-platform-count").textContent = crossPlatformCount;
        }

        // Обновляем значения для других типов
        document.getElementById("stickers-count").textContent = stickersCount;
        document.getElementById("website-count").textContent = websiteCount;
    }
}

// Функция расчета общих комиссий
function calculateTotalFees(app) {
    let totalFees = 0;

    if (app.listingFee && Array.isArray(app.listingFee)) {
        totalFees = app.listingFee.reduce((sum, fee) => sum + fee, 0);
    }

    // Проверяем successFee на число или строку и обрабатываем соответственно
    if (app.successFee !== undefined && app.successFee !== null) {
        // Преобразуем в число для обеспечения правильного расчета
        const successFeeValue = parseFloat(app.successFee);
        if (!isNaN(successFeeValue)) {
            totalFees += successFeeValue;
        }
    }

    return totalFees;
}

// Функция обновления отображения статистики
function updateStatsDisplay(
    appStoreSales, appStoreProceeds, appStoreUnits,
    flippaSales, flippaProceeds, flippaUnits
) {
    // Форматирование чисел для денежных значений (с десятичными знаками)
    const formatMoney = (num) => {
        if (num === null || num === undefined) return 0;
        return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // Форматирование чисел для количества (без десятичных знаков)
    const formatUnits = (num) => {
        if (num === null || num === undefined) return 0;
        return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // App Store статистика
    document.getElementById("sales-app-store").textContent = formatMoney(appStoreSales);
    document.getElementById("sales-proceeds-app-store").textContent = formatMoney(appStoreProceeds);
    document.getElementById("sales-units-app-store").textContent = formatUnits(appStoreUnits);

    // Flippa статистика - количество проданных приложений на площадке Flippa
    document.getElementById("sales-flippa").textContent = formatMoney(flippaSales);
    document.getElementById("sales-proceeds-flippa").textContent = formatMoney(flippaProceeds);
    document.getElementById("sales-units-flippa").textContent = formatUnits(flippaUnits);

    // Общая статистика - не показываем общие Units
    document.getElementById("sales-total").textContent = formatMoney(appStoreSales + flippaSales);
    document.getElementById("sales-proceeds-total").textContent = formatMoney(appStoreProceeds + flippaProceeds);
}

// Функция построения графика
function buildSalesChart(data) {
    const chartContainer = document.getElementById("chart-sales-container");
    chartContainer.innerHTML = "";

    // Получаем шаблон строки графика
    const rowTemplate = document.getElementById("chartRowTemplate");

    // Если шаблон не найден, выводим ошибку и прекращаем выполнение
    if (!rowTemplate) {
        console.error("Chart row template not found!");
        return;
    }

    // Проверяем, использует ли пользователь темный режим
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Находим максимальное значение для масштабирования
    const maxValue = Math.max(...data.map(item => item.total));

    // Создаем контейнер для всех строк графика
    const barsContainer = document.createElement("div");
    barsContainer.className = "chart-bars-container";
    chartContainer.appendChild(barsContainer);

    // Создаем бары для каждого приложения
    data.forEach(app => {
        // Клонируем шаблон строки
        const barContainer = rowTemplate.content.cloneNode(true).querySelector(".chart-row");

        // Получаем элементы строки
        const iconContainer = barContainer.querySelector(".chart-bar-icon");
        const iconImage = iconContainer.querySelector("img");
        const label = barContainer.querySelector(".chart-bar-label");
        const barsWrapper = barContainer.querySelector(".chart-bars-wrapper");
        const value = barContainer.querySelector(".chart-bar-value");
        const datesContainer = barContainer.querySelector(".chart-dates-container");
        const releaseDate = barContainer.querySelector(".chart-release-date");
        const saleDate = barContainer.querySelector(".chart-sale-date");

        // Заполняем данными

        // Проверяем тип приложения и устанавливаем заглушку для App Bundle
        if (app.type === "App Bundle") {
            // Для App Bundle используем заглушку (серый квадрат)
            iconContainer.classList.add("chart-app-bundle-placeholder");
            iconImage.remove(); // Удаляем изображение
        } else {
            // Для обычных приложений загружаем иконку из Cloudinary
            const iconUrl = getCloudinaryImageUrl(app.id, 'app-icon', 'png', prefersDarkMode);
            iconImage.src = iconUrl;
            iconImage.alt = app.displayName || app.id;

            // Обработчик ошибок для загрузки светлой версии, если темная недоступна
            iconImage.onerror = function () {
                if (this.getAttribute('data-tried-light') !== 'true') {
                    this.setAttribute('data-tried-light', 'true');
                    this.src = getCloudinaryImageUrl(app.id, 'app-icon', 'png', false);
                }
            };
        }

        // Имя приложения
        label.textContent = app.displayName;

        // Очищаем barsWrapper перед добавлением сегментов (сохраняя значение)
        const barValue = value;

        // Создаем сегмент для выручки Flippa (сначала Flippa потом App Store)
        if (app.flippaProceeds > 0) {
            const flippaSegment = document.createElement("div");
            flippaSegment.className = "bar-segment chart-flippa-segment";
            const widthPercent = (app.flippaProceeds / maxValue) * 100;
            flippaSegment.style.width = `${widthPercent}%`;
            // Вставляем перед значением
            barsWrapper.insertBefore(flippaSegment, barValue);
        }

        // Создаем сегмент для выручки App Store
        if (app.appStoreProceeds > 0) {
            const appStoreSegment = document.createElement("div");
            appStoreSegment.className = "bar-segment chart-app-store-segment";
            const widthPercent = (app.appStoreProceeds / maxValue) * 100;
            appStoreSegment.style.width = `${widthPercent}%`;
            // Вставляем перед значением
            barsWrapper.insertBefore(appStoreSegment, barValue);
        }

        // Устанавливаем значение
        barValue.textContent = `$${Math.round(app.total)}`;

        // Обрабатываем даты
        if (app.releaseDate) {
            // Форматируем дату для отображения
            let formattedReleaseDate = app.releaseDate;
            try {
                const date = new Date(app.releaseDate);
                if (!isNaN(date.getTime())) {
                    formattedReleaseDate = date.toISOString().split('T')[0]; // Формат yyyy-mm-dd
                }
            } catch (e) {
                // Если формат даты некорректный, оставляем как есть
            }

            releaseDate.textContent = `Release: ${formattedReleaseDate}`;
        } else {
            releaseDate.remove();
        }

        if (app.saleDate) {
            // Форматируем дату для отображения
            let formattedSaleDate = app.saleDate;
            try {
                const date = new Date(app.saleDate);
                if (!isNaN(date.getTime())) {
                    formattedSaleDate = date.toISOString().split('T')[0]; // Формат yyyy-mm-dd
                }
            } catch (e) {
                // Если формат даты некорректный, оставляем как есть
            }

            saleDate.textContent = `Sale: ${formattedSaleDate}`;
        } else {
            saleDate.remove();
        }

        // Добавляем строку в контейнер
        barsContainer.appendChild(barContainer);
    });
}

// Вызываем функцию загрузки данных при загрузке страницы
document.addEventListener("DOMContentLoaded", loadSalesData);