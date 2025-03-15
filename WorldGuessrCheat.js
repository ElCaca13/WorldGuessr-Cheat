// ==UserScript==
// @name         WorldGuessr Cheat
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Grabs coördinates and transfers them into a location
// @author       Lostt
// @match        *://www.worldguessr.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    let latestCoords = { lat: "N/A", long: "N/A" };
    let latestAddress = { road: "N/A", city: "N/A", state: "N/A", country: "N/A" };
    let latestPing = "N/A";
    let menuVisible = true;
    let menu;

    function extractCoordinatesFromURL(urlStr) {
        try {
            const urlObj = new URL(urlStr);
            const lat = urlObj.searchParams.get("lat");
            const long = urlObj.searchParams.get("long");
            if (lat && long) return { lat, long };
        } catch (e) {
            const latMatch = urlStr.match(/lat=([-.\d]+)/);
            const longMatch = urlStr.match(/long=([-.\d]+)/);
            if (latMatch && longMatch) return { lat: latMatch[1], long: longMatch[1] };
        }
        return null;
    }

    function reverseGeocode(lat, long) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${long}`;
        const startTime = performance.now();
        fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (WorldGuessrScript)" } })
            .then(response => response.json())
            .then(data => {
                if (data && data.address) {
                    latestAddress = {
                        road: data.address.road || data.address.neighbourhood || "N/A",
                        city: data.address.city || data.address.town || data.address.village || "N/A",
                        state: data.address.state || "N/A",
                        country: data.address.country || "N/A"
                    };
                } else {
                    latestAddress = { road: "N/A", city: "N/A", state: "N/A", country: "N/A" };
                }
                latestPing = Math.round(performance.now() - startTime) + " ms";
                updateUI();
            })
            .catch(() => {
                latestAddress = { road: "N/A", city: "N/A", state: "N/A", country: "N/A" };
                latestPing = "Error";
                updateUI();
            });
    }

    function updateUI() {
        if (!menu) return;

        const mapsUrl = `https://www.google.com/maps?q=${latestCoords.lat},${latestCoords.long}&z=6`;

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
                <div class="wg-item"><strong>Ping:</strong> ${latestPing}</div>
            </div>
            <div class="wg-section">
                <a id="wg-maps-button" href="${mapsUrl}" target="_blank">
                    Open in Google Maps
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

    setInterval(() => {
        const iframe = document.querySelector("iframe");
        if (iframe) {
            const coords = extractCoordinatesFromURL(iframe.src);
            if (coords && (coords.lat !== latestCoords.lat || coords.long !== latestCoords.long)) {
                latestCoords = coords;
                reverseGeocode(coords.lat, coords.long);
            }
        }
    }, 1000);
})();
