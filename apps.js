async function loadApps() {
    const response = await fetch("apps.json");
    const apps = await response.json();
    const container = document.querySelector(".app-container");
    
    // Проверяем, использует ли пользователь темный режим
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Добавляем импорт скрипта с функциями Cloudinary, если его еще нет
    if (typeof getCloudinaryImageUrl !== 'function') {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'cloudinary.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    apps.forEach(app => {
        const appDiv = document.createElement("div");
        appDiv.className = "app-item";
        
        // Получаем URL иконки из Cloudinary с учетом темного режима
        const iconUrl = getCloudinaryImageUrl(app.id, 'app-icon', 'png', prefersDarkMode);

        appDiv.innerHTML = `
            <a href="app.html?id=${app.id}" class="apps-app-link">
                <img src="${iconUrl}" class="apps-app-icon" alt="${app.title}" 
                     onerror="if(this.getAttribute('data-tried-light') !== 'true') { 
                         this.setAttribute('data-tried-light', 'true'); 
                         this.src='${getCloudinaryImageUrl(app.id, 'app-icon', 'png', false)}'; 
                     }">
                <p class="apps-app-title">${app.displayName}</p>
            </a>
        `;
        container.appendChild(appDiv);
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
