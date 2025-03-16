// ==UserScript==
// @name         WorldGuessr Cheat
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Grabs coordinates & converts them to location & Open in OpenStreetMap
// @author       Lostt
// @match        *://www.worldguessr.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    let latestCoords = { lat: "N/A", long: "N/A" };
    let latestAddress = { road: "N/A", city: "N/A", state: "N/A", country: "N/A" };
    let menuVisible = true;
    let menu;

    function logCoordinates(lat, long) {
        if (lat && long && (lat !== latestCoords.lat || long !== latestCoords.long)) {
            latestCoords = { lat, long };
            reverseGeocode(lat, long);
        }
    }

    // 1️⃣ Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch(...args);
        const clone = response.clone();
        clone.json().then(data => {
            if (data?.lat && data?.lon) logCoordinates(data.lat, data.lon);
        }).catch(() => {});
        return response;
    };

    // 2️⃣ Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        if (urlParams.has("lat") && urlParams.has("long")) {
            logCoordinates(urlParams.get("lat"), urlParams.get("long"));
        }
        return originalOpen.apply(this, arguments);
    };

    // 3️⃣ Check iframe URLs (interval verlaagd naar 3 sec)
    function checkIframes() {
        document.querySelectorAll("iframe").forEach(iframe => {
            const urlParams = new URLSearchParams(iframe.src.split("?")[1]);
            if (urlParams.has("lat") && urlParams.has("long")) {
                logCoordinates(urlParams.get("lat"), urlParams.get("long"));
            }
        });
    }
    setInterval(checkIframes, 3000);

    async function reverseGeocode(lat, long) {
        let url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${long}`;

        try {
            let response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (WorldGuessrScript)" } });
            if (!response.ok) throw new Error("OSM API failed");
            let data = await response.json();

            latestAddress = {
                road: data.address?.road || "N/A",
                city: data.address?.city || data.address?.town || "N/A",
                state: data.address?.state || "N/A",
                country: data.address?.country || "N/A"
            };
        } catch (e) {
            console.warn("OSM failed, trying alternative API...");
            await fetchBackupAPI(lat, long);
        } finally {
            updateUI();
        }
    }

    async function fetchBackupAPI(lat, long) {
        let url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${long}&localityLanguage=en`;

        try {
            let response = await fetch(url);
            if (!response.ok) throw new Error("Backup API failed");
            let data = await response.json();

            latestAddress = {
                road: data.principalSubdivision || "N/A",
                city: data.city || "N/A",
                state: data.locality || "N/A",
                country: data.countryName || "N/A"
            };
        } catch (e) {
            console.warn("Backup API also failed.");
            latestAddress = { road: "N/A", city: "N/A", state: "N/A", country: "N/A" };
        }
    }

    function updateUI() {
        if (!menu) return;

        const mapsUrl = `https://www.openstreetmap.org/?mlat=${latestCoords.lat}&mlon=${latestCoords.long}&zoom=10`;

        menu.innerHTML = `
            <div id="wg-header">WorldGuessr Cheat</div>
            <div class="wg-section">
                <div class="wg-item"><strong>Latitude:</strong> ${latestCoords.lat}</div>
                <div class="wg-item"><strong>Longitude:</strong> ${latestCoords.long}</div>
            </div>
            <div class="wg-section">
                <div class="wg-item"><strong>Road:</strong> ${latestAddress.road}</div>
                <div class="wg-item"><strong>City:</strong> ${latestAddress.city}</div>
                <div class="wg-item"><strong>State:</strong> ${latestAddress.state}</div>
                <div class="wg-item"><strong>Country:</strong> ${latestAddress.country}</div>
            </div>
            <div class="wg-section">
                <a id="wg-maps-button" href="${mapsUrl}" target="_blank">
                    Open in Maps
                </a>
            </div>
        `;
    }

    function createMenu() {
        const oldMenu = document.getElementById("wg-menu");
        if (oldMenu) oldMenu.remove();

        menu = document.createElement("div");
        menu.id = "wg-menu";
        document.body.appendChild(menu);
        updateUI();
    }

    function toggleMenu() {
        menuVisible = !menuVisible;
        menu.style.display = menuVisible ? "block" : "none";
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "\\") toggleMenu();
    });

    GM_addStyle(`
        #wg-menu {
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(20, 20, 20, 0.95);
            color: white;
            font-family: Arial, sans-serif;
            padding: 15px;
            border: 2px solid red;
            border-radius: 8px;
            box-shadow: 0px 0px 10px red;
            z-index: 9999;
            min-width: 250px;
        }
        #wg-header {
            color: red;
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
            text-shadow: 0px 0px 8px red;
        }
        .wg-section {
            margin-top: 10px;
            padding: 5px;
            border-top: 1px solid red;
        }
        .wg-item {
            font-size: 14px;
            margin: 2px 0;
        }
        #wg-maps-button {
            display: block;
            text-align: center;
            background: red;
            color: white;
            padding: 8px;
            border-radius: 5px;
            font-weight: bold;
            text-decoration: none;
            margin-top: 10px;
            transition: transform 0.2s ease-in-out, background 0.2s ease-in-out;
        }
        #wg-maps-button:hover {
            background: darkred;
            transform: scale(1.05);
        }
    `);

    createMenu();

})();
