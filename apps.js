async function loadApps() {
    const response = await fetch("apps.json");
    const apps = await response.json();
    const container = document.querySelector(".app-container");

    apps.forEach(app => {
        const appDiv = document.createElement("div");
        appDiv.className = "app-item";

        appDiv.innerHTML = `
            <a href="app.html?id=${app.id}" class="apps-app-link">
                <img data-src="assets/apps/${app.id}/app-icon.png" class="lazyload apps-app-icon" alt="${app.title}">
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
