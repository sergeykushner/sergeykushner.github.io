async function loadApps() {
    const response = await fetch("apps.json");
    const apps = await response.json();
    const container = document.querySelector(".app-container");
    
    // Проверяем, использует ли пользователь темный режим
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    apps.forEach(app => {
        const appDiv = document.createElement("div");
        appDiv.className = "app-item";
        
        // Путь к иконке с учетом темного режима
        const iconPath = `assets/apps/${app.id}/app-icon${prefersDarkMode ? '-dark' : ''}.png`;

        appDiv.innerHTML = `
            <a href="app.html?id=${app.id}" class="apps-app-link">
                <img data-src="${iconPath}" class="lazyload apps-app-icon" alt="${app.title}" 
                     onerror="this.onerror=null; this.src='assets/apps/${app.id}/app-icon.png';">
                <p class="apps-app-title">${app.appDisplayName}</p>
            </a>
        `;
        container.appendChild(appDiv);
    });

    // Ленивая загрузка изображений
    const lazyImages = document.querySelectorAll(".lazyload");
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.src = entry.target.dataset.src;
                entry.target.classList.remove("lazyload");
            }
        });
    });

    lazyImages.forEach(img => observer.observe(img));
}

loadApps();
