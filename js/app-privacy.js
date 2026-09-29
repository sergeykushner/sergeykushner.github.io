/**
 * Загружает и отображает политику конфиденциальности для выбранного приложения
 */
async function loadPrivacyData() {
    // Получаем id приложения из параметров URL
    const urlParams = new URLSearchParams(window.location.search);
    const appId = urlParams.get("id");

    // Загружаем публичные метаданные приложений
    const response = await fetch("/data/apps-metadata-public.json");
    const apps = await response.json();
    const app = apps.find(a => a.id === appId);

    if (!app) {
        document.body.innerHTML = "<h2>App not found</h2>";
        return;
    }

    // Обновляем метаданные страницы
    document.title = `${app.title} - Privacy Policy`;
    document.getElementById("meta-description").setAttribute("content", `Privacy Policy for the ${app.title} app.`);
    document.getElementById("canonical-link").setAttribute("href", `https://sergeykushner.github.io/app-privacy.html?id=${encodeURIComponent(app.id)}`);

    // Обновляем контент политики
    document.getElementById("app-privacy-title").textContent = `${app.displayName} Privacy Policy`;
    document.getElementById("app-privacy-updated-date").textContent = `Updated ${app.privacyUpdatedDate}`;
    document.getElementById("app-name").textContent = app.displayName;
    if ("privacyContent" in app) {
        const content = document.getElementById("app-privacy-main-content");
        const paragraphs = app.privacyContent;
        if (!Array.isArray(paragraphs) || paragraphs.length === 0 ||
            !paragraphs.every(paragraph => typeof paragraph === "string" && paragraph.trim())) {
            content.textContent = "This app's privacy policy is temporarily unavailable. Please contact me by email.";
        } else {
            content.replaceChildren(...paragraphs.map(paragraph => {
                const element = document.createElement("p");
                const linkPattern = /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g;
                let offset = 0;

                // Превращаем ссылки из JSON в элементы страницы, сохраняя остальной текст безопасным.
                for (const match of paragraph.matchAll(linkPattern)) {
                    element.append(document.createTextNode(paragraph.slice(offset, match.index)));
                    const link = document.createElement("a");
                    link.href = match[2];
                    link.textContent = match[1];
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    element.append(link);
                    offset = match.index + match[0].length;
                }
                element.append(document.createTextNode(paragraph.slice(offset)));
                return element;
            }));
        }
    }
    document.getElementById("email-link").href = `mailto:${app.email}`;
    document.getElementById("email-link").textContent = "email me";
}

// Загружаем данные при загрузке страницы
loadPrivacyData(); 
