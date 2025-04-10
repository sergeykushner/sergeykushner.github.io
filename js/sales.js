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
                
                if (app.successFee) {
                    totalFees += app.successFee;
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
                    total: appProceeds + flippaNet
                });
            }
        });

        // Сортируем данные графика по общей выручке
        chartData.sort((a, b) => b.total - a.total);

        // Обновляем данные в интерфейсе
        updateStatsDisplay(
            appStoreSales, appStoreProceeds, appStoreUnits,
            flippaSales, flippaProceeds, flippaUnits
        );

        // Строим график со всеми приложениями (убираем ограничение 15)
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
    
    if (app.successFee) {
        totalFees += app.successFee;
    }
    
    return totalFees;
}

// Функция обновления отображения статистики
function updateStatsDisplay(
    appStoreSales, appStoreProceeds, appStoreUnits,
    flippaSales, flippaProceeds, flippaUnits
) {
    // Форматирование чисел
    const formatNumber = (num) => {
        if (num === null || num === undefined) return 0;
        return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // App Store статистика
    document.getElementById("app-store-sales").textContent = formatNumber(appStoreSales);
    document.getElementById("app-store-proceeds").textContent = formatNumber(appStoreProceeds);
    document.getElementById("app-store-units").textContent = formatNumber(appStoreUnits);

    // Flippa статистика
    document.getElementById("flippa-sales").textContent = formatNumber(flippaSales);
    document.getElementById("flippa-proceeds").textContent = formatNumber(flippaProceeds);
    document.getElementById("flippa-units").textContent = formatNumber(flippaUnits);

    // Общая статистика
    document.getElementById("total-sales").textContent = formatNumber(appStoreSales + flippaSales);
    document.getElementById("total-proceeds").textContent = formatNumber(appStoreProceeds + flippaProceeds);
    document.getElementById("total-units").textContent = formatNumber(appStoreUnits + flippaUnits);
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
    
    // Устанавливаем ширину столбца в зависимости от количества приложений
    const barWidth = data.length > 30 ? 20 : 30; // Уменьшаем ширину, если приложений много
    
    // Устанавливаем ширину контейнера графика в зависимости от количества элементов
    const containerWidth = data.length * (barWidth + 20); // 20px для отступов между столбцами
    
    // Создаем контейнер для баров
    const barsContainer = document.createElement("div");
    barsContainer.style.display = "flex";
    barsContainer.style.alignItems = "flex-end";
    barsContainer.style.justifyContent = "flex-start"; // Изменяем на flex-start для лучшего отображения
    barsContainer.style.height = "100%";
    barsContainer.style.paddingBottom = "30px"; // Место для подписей
    barsContainer.style.width = `${containerWidth}px`; // Устанавливаем ширину контейнера
    
    // Создаем бары для каждого приложения
    data.forEach(app => {
        // Создаем контейнер для бара
        const barContainer = document.createElement("div");
        barContainer.className = "chart-bar";
        barContainer.style.marginRight = "15px"; // Фиксированный отступ справа
        
        // Добавляем иконку приложения
        const iconContainer = document.createElement("div");
        iconContainer.className = "bar-icon";
        
        // Создаем элемент изображения
        const iconImage = document.createElement("img");
        
        // Получаем URL иконки из Cloudinary
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
        barContainer.appendChild(iconContainer);
        
        // Создаем сегмент для выручки App Store
        if (app.appStoreProceeds > 0) {
            const appStoreSegment = document.createElement("div");
            appStoreSegment.className = "bar-segment app-store-segment";
            appStoreSegment.style.backgroundColor = appStoreColor;
            appStoreSegment.style.width = `${barWidth}px`; // Устанавливаем ширину сегмента
            const height = (app.appStoreProceeds / maxValue) * 300; // Максимальная высота 300px
            appStoreSegment.style.height = `${height}px`;
            barContainer.appendChild(appStoreSegment);
        }
        
        // Создаем сегмент для выручки Flippa
        if (app.flippaProceeds > 0) {
            const flippaSegment = document.createElement("div");
            flippaSegment.className = "bar-segment flippa-segment";
            flippaSegment.style.backgroundColor = flippaColor;
            flippaSegment.style.width = `${barWidth}px`; // Устанавливаем ширину сегмента
            const height = (app.flippaProceeds / maxValue) * 300; // Максимальная высота 300px
            flippaSegment.style.height = `${height}px`;
            barContainer.appendChild(flippaSegment);
        }
        
        // Добавляем подпись с названием приложения
        const label = document.createElement("div");
        label.className = "bar-label";
        label.textContent = app.displayName;
        label.style.maxWidth = `${barWidth * 3}px`; // Ограничиваем ширину метки
        label.style.overflow = "hidden";
        label.style.textOverflow = "ellipsis";
        barContainer.appendChild(label);
        
        // Добавляем значение
        const value = document.createElement("div");
        value.className = "bar-value";
        value.textContent = `$${Math.round(app.total)}`;
        barContainer.appendChild(value);
        
        // Добавляем бар в контейнер
        barsContainer.appendChild(barContainer);
    });
    
    // Добавляем контейнер с барами в контейнер графика
    chartContainer.appendChild(barsContainer);
}

// Вызываем функцию загрузки данных при загрузке страницы
document.addEventListener("DOMContentLoaded", loadSalesData); 
