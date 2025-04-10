async function loadApps() {
    const response = await fetch("../data/apps-metadata-public.json");
    const allApps = await response.json();
    
    // Список приложений при отмеченном чекбоксе
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
    
    // Фильтруем приложения, исключая те, у которых type === "App Bundle"
    let apps = allApps.filter(app => app.type !== "App Bundle");
    
    const container = document.querySelector(".apps-grid-container");
    
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

    // Функция для отображения приложений
    function renderApps(appsToRender) {
        // Очищаем контейнер перед добавлением приложений
        container.innerHTML = '';
        
        appsToRender.forEach(app => {
            const appDiv = document.createElement("div");
            appDiv.className = "app-item";
            
            // Получаем URL иконки из Cloudinary с учетом темного режима
            const iconUrl = getCloudinaryImageUrl(app.id, 'app-icon', 'png', prefersDarkMode);

            appDiv.innerHTML = `
                <div class="apps-app-link">
                    <a href="app.html?id=${app.id}">
                        <img src="${iconUrl}" class="apps-app-icon" alt="${app.title}" 
                             onerror="if(this.getAttribute('data-tried-light') !== 'true') { 
                                 this.setAttribute('data-tried-light', 'true'); 
                                 this.src='${getCloudinaryImageUrl(app.id, 'app-icon', 'png', false)}'; 
                             }">
                        <p class="apps-app-title">${app.displayName}</p>
                    </a>
                </div>
            `;
            container.appendChild(appDiv);
        });
    }

    // Обработчик события изменения состояния чекбокса
    const checkbox = document.getElementById('show-allowed-only');
    
    // Восстанавливаем состояние чекбокса из localStorage
    const savedState = localStorage.getItem('showAllowedOnly');
    if (savedState === 'true') {
        checkbox.checked = true;
        // Применяем фильтрацию сразу
        const filteredApps = apps.filter(app => allowedAppIds.includes(app.id));
        renderApps(filteredApps);
    } else {
        // Начальное отображение всех приложений
        renderApps(apps);
    }
    
    checkbox.addEventListener('change', function() {
        // Сохраняем состояние в localStorage
        localStorage.setItem('showAllowedOnly', this.checked);
        
        if (this.checked) {
            // Показывать только избранные приложения
            const filteredApps = apps.filter(app => allowedAppIds.includes(app.id));
            renderApps(filteredApps);
        } else {
            // Показывать все приложения
            renderApps(apps);
        }
    });

    // Настраиваем наблюдение за скроллом для обновления изображений
    window.addEventListener('scroll', function() {
        const appIcons = document.querySelectorAll('.apps-app-icon');
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
}

// Вызываем функцию загрузки при загрузке страницы
loadApps();
