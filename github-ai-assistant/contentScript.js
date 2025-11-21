"use strict";
// contentScript.ts
(async function () {
    // Prevent duplicate injection
    if (document.getElementById('github-ai-assistant-root'))
        return;
    console.log("GitHub AI Assistant: Injecting sidebar...");
    // Create Shadow Host
    const host = document.createElement('div');
    host.id = 'github-ai-assistant-root';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    // Load CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = chrome.runtime.getURL('sidebar/sidebar.css');
    shadow.appendChild(cssLink);
    // Load HTML
    try {
        const htmlUrl = chrome.runtime.getURL('sidebar/sidebar.html');
        const response = await fetch(htmlUrl);
        const html = await response.text();
        // Create a container for the HTML to avoid overwriting the link tag if we used innerHTML directly on shadow
        const container = document.createElement('div');
        container.innerHTML = html;
        shadow.appendChild(container);
        // Load Logic
        const scriptUrl = chrome.runtime.getURL('sidebar/sidebar.js');
        const { initSidebar } = await import(scriptUrl);
        initSidebar(shadow);
        // Listen for background messages
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "TOGGLE_SIDEBAR") {
                const sidebarContainer = shadow.querySelector('#github-ai-sidebar');
                if (sidebarContainer) {
                    // Toggle between collapsed and fully visible, or completely hide?
                    // User expectation is usually show/hide. 
                    // But we have a collapse button.
                    // Let's just toggle the 'collapsed' class if it's there, or if user wants to hide it completely?
                    // Let's stick to the existing collapse logic for now, but if the user clicks the extension icon,
                    // maybe they want to bring it back if they closed it?
                    // Since we don't have a "close" button (only collapse), let's treat the extension icon as a toggle for "hidden vs visible"
                    // OR just toggle the collapsed state.
                    // Let's try toggling the host visibility first.
                    if (host.style.display === 'none') {
                        host.style.display = 'block';
                    }
                    else {
                        // If it's already visible, maybe they want to collapse/expand?
                        // Let's just toggle collapse to be safe.
                        sidebarContainer.classList.toggle('collapsed');
                    }
                }
            }
            return false; // Indicate we will not send a response asynchronously
        });
    }
    catch (err) {
        console.error("GitHub AI Assistant: Error loading sidebar resources", err);
    }
})();
//# sourceMappingURL=contentScript.js.map