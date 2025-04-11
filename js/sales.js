// Функция для загрузки и обработки данных
async function loadSalesData() {
    try {
        // Загружаем данные из JSON файла
        const response = await fetch("../data/apps-metadata.json");
        const apps = await response.json();

        // Инициализируем переменные для подсчета
        let appStoreSales = 0;
        let appStoreProceeds = 0;
        let appStoreUnits = 0;
        let flippaSales = 0;
        let flippaProceeds = 0;
        let flippaUnits = 0;

        // Массив для данных графика
        const chartData = [];

        // Обрабатываем каждое приложение
        apps.forEach(app => {
            // Данные App Store
            if (app.appStoreUnits) {
                appStoreUnits += app.appStoreUnits;
            }
            
            if (app.appStoreSales) {
                appStoreSales += app.appStoreSales;
            }
            
            if (app.appStoreProceeds) {
                appStoreProceeds += app.appStoreProceeds;
            }

            // Данные Flippa
            if (app.salePrice) {
                let totalFees = 0;
                
                // Расчет комиссий
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
                
                flippaSales += app.salePrice;
                flippaProceeds += (app.salePrice - totalFees);
                flippaUnits++; // Каждая продажа на Flippa считается как 1 единица
            }

            // Добавляем данные в массив для графика, если есть продажи
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
                    type: app.type || "App" // Добавляем тип приложения
                });
            }
        });

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

        // Обновляем данные в интерфейсе
        updateStatsDisplay(
            appStoreSales, appStoreProceeds, appStoreUnits,
            flippaSales, flippaProceeds, flippaUnits
        );

        // Строим график со всеми приложениями
        buildSalesChart(chartData);
    } catch (error) {
        console.error("Ошибка при загрузке или обработке данных:", error);
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
    document.getElementById("app-store-sales").textContent = formatMoney(appStoreSales);
    document.getElementById("app-store-proceeds").textContent = formatMoney(appStoreProceeds);
    document.getElementById("app-store-units").textContent = formatUnits(appStoreUnits);

    // Flippa статистика - количество проданных приложений
    document.getElementById("flippa-sales").textContent = formatMoney(flippaSales);
    document.getElementById("flippa-proceeds").textContent = formatMoney(flippaProceeds);
    document.getElementById("flippa-units").textContent = formatUnits(flippaUnits);

    // Общая статистика - не показываем общие Units
    document.getElementById("total-sales").textContent = formatMoney(appStoreSales + flippaSales);
    document.getElementById("total-proceeds").textContent = formatMoney(appStoreProceeds + flippaProceeds);
    // document.getElementById("total-units").textContent = formatUnits(appStoreUnits + flippaUnits);
}

// Функция построения графика
function buildSalesChart(data) {
    const chartContainer = document.getElementById("sales-chart-container");
    chartContainer.innerHTML = "";
    
    // Проверяем, использует ли пользователь темный режим
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Получаем CSS переменные для цветов сегментов
    const appStoreColor = getComputedStyle(document.documentElement).getPropertyValue('--app-store-segment-color') || '#4299E1';
    const flippaColor = getComputedStyle(document.documentElement).getPropertyValue('--flippa-segment-color') || '#48BB78';
    
    // Находим максимальное значение для масштабирования
    const maxValue = Math.max(...data.map(item => item.total));
    
    // Создаем контейнер для баров
    const barsContainer = document.createElement("div");
    barsContainer.className = "bars-container";
    
    // Создаем бары для каждого приложения
    data.forEach(app => {
        // Создаем контейнер для строки
        const barContainer = document.createElement("div");
        barContainer.className = "chart-row";
        
        // Добавляем иконку приложения
        const iconContainer = document.createElement("div");
        iconContainer.className = "bar-icon";
        
        // Создаем элемент изображения
        const iconImage = document.createElement("img");
        
        // Проверяем тип приложения и устанавливаем заглушку для App Bundle
        if (app.type === "App Bundle") {
            // Для App Bundle используем заглушку (серый квадрат)
            iconContainer.classList.add("app-bundle-placeholder");
        } else {
            // Для обычных приложений загружаем иконку из Cloudinary
            const iconUrl = getCloudinaryImageUrl(app.id, 'app-icon', 'png', prefersDarkMode);
            iconImage.src = iconUrl;
            iconImage.alt = app.displayName || app.id;
            
            // Обработчик ошибок для загрузки светлой версии, если темная недоступна
            iconImage.onerror = function() {
                if (this.getAttribute('data-tried-light') !== 'true') {
                    this.setAttribute('data-tried-light', 'true');
                    this.src = getCloudinaryImageUrl(app.id, 'app-icon', 'png', false);
                }
            };
            
            iconContainer.appendChild(iconImage);
        }
        
        barContainer.appendChild(iconContainer);
        
        // Добавляем название приложения
        const label = document.createElement("div");
        label.className = "bar-label";
        label.textContent = app.displayName;
        barContainer.appendChild(label);
        
        // Создаем контейнер для баров
        const barsWrapper = document.createElement("div");
        barsWrapper.className = "bars-wrapper";
        
        // Создаем сегмент для выручки Flippa (сначала Flippa потом App Store)
        if (app.flippaProceeds > 0) {
            const flippaSegment = document.createElement("div");
            flippaSegment.className = "bar-segment flippa-segment";
            const widthPercent = (app.flippaProceeds / maxValue) * 100;
            flippaSegment.style.width = `${widthPercent}%`;
            barsWrapper.appendChild(flippaSegment);
        }
        
        // Создаем сегмент для выручки App Store
        if (app.appStoreProceeds > 0) {
            const appStoreSegment = document.createElement("div");
            appStoreSegment.className = "bar-segment app-store-segment";
            const widthPercent = (app.appStoreProceeds / maxValue) * 100;
            appStoreSegment.style.width = `${widthPercent}%`;
            barsWrapper.appendChild(appStoreSegment);
        }
        
        barContainer.appendChild(barsWrapper);
        
        // Добавляем значение
        const value = document.createElement("div");
        value.className = "bar-value";
        value.textContent = `$${Math.round(app.total)}`;
        barContainer.appendChild(value);
        
        // Добавляем дату релиза
        if (app.releaseDate) {
            const dateElement = document.createElement("div");
            dateElement.className = "release-date";
            
            // Форматируем дату для отображения
            let formattedDate = app.releaseDate;
            try {
                const date = new Date(app.releaseDate);
                if (!isNaN(date.getTime())) {
                    formattedDate = date.toLocaleDateString();
                }
            } catch (e) {
                // Если формат даты некорректный, оставляем как есть
            }
            
            dateElement.textContent = formattedDate;
            barContainer.appendChild(dateElement);
        }
        
        // Добавляем строку в контейнер
        barsContainer.appendChild(barContainer);
    });
    
    // Добавляем контейнер с барами в контейнер графика
    chartContainer.appendChild(barsContainer);
}

// Вызываем функцию загрузки данных при загрузке страницы
document.addEventListener("DOMContentLoaded", loadSalesData); 
