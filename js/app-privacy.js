async function loadPrivacyData() {
    const urlParams = new URLSearchParams(window.location.search);
    const appId = urlParams.get("id");
    
    const response = await fetch("../data/apps-metadata-public.json");
    const apps = await response.json();
    const app = apps.find(a => a.id === appId);
    
    if (!app) {
        document.body.innerHTML = "<h2>App not found</h2>";
        return;
    }

    // Update metadata
    document.title = `${app.title} - Privacy Policy`;
    document.getElementById("meta-description").setAttribute("content", `Privacy Policy for the ${app.title} app.`);
    document.getElementById("canonical-link").setAttribute("href", `https://sergeykushner.github.io/pages/app-privacy.html?id=${app.id}`);
    
    // Update content
    document.getElementById("app-privacy-title").textContent = `${app.displayName} Privacy Policy`;
    document.getElementById("app-privacy-updated").textContent = `Updated ${app.privacyUpdatedDate}`;
    document.getElementById("app-name").textContent = app.displayName;
    document.getElementById("email-link").href = `mailto:${app.email}`;
    document.getElementById("email-link").textContent = "email me";
}

// Load data on page load
loadPrivacyData(); 