// ==UserScript==
// @name         WorldGuessr Lat/Long, Address & Ping Display
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Haalt de coördinaten uit de svEmbed-iframe, reverse-geocodeert deze naar adresgegevens en meet de ping, en toont dit in een menu.
// @author
// @match        *://www.worldguessr.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Globale variabelen
    let latestCoords = {lat: "N/A", long: "N/A"};
    let latestAddress = {road: "N/A", city: "N/A", country: "N/A"};
    let latestPing = "N/A";

    // Reverse geocode via Nominatim om adresgegevens op te halen
    function reverseGeocode(lat, long) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${long}`;
        const startTime = performance.now();
        // Let op: Gebruik een geldige User-Agent/referer indien nodig (Nominatim heeft regels)
        fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; YourAppName/1.0; +https://example.com/)"
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data && data.address) {
                latestAddress = {
                    road: data.address.road || data.address.neighbourhood || "N/A",
                    city: data.address.city || data.address.town || data.address.village || "N/A",
                    country: data.address.country || "N/A"
                };
            } else {
                latestAddress = {road: "N/A", city: "N/A", country: "N/A"};
            }
            const endTime = performance.now();
            latestPing = Math.round(endTime - startTime) + " ms";
            updateUI();
        })
        .catch(err => {
            console.error("Reverse geocoding error:", err);
            latestAddress = {road: "N/A", city: "N/A", country: "N/A"};
            latestPing = "Error";
            updateUI();
        });
    }

    // Functie om de UI te updaten
    function updateUI() {
        document.getElementById("wg-lat").textContent = latestCoords.lat;
        document.getElementById("wg-long").textContent = latestCoords.long;
        document.getElementById("wg-address").innerHTML =
            `<strong>Road:</strong> ${latestAddress.road}<br>
             <strong>City:</strong> ${latestAddress.city}<br>
             <strong>Country:</strong> ${latestAddress.country}`;
        document.getElementById("wg-ping").textContent = latestPing;
    }

    // Functie om coördinaten uit een URL-string te extraheren
    function extractCoordinatesFromURL(urlStr) {
        try {
            let urlObj = new URL(urlStr);
            let lat = urlObj.searchParams.get("lat");
            let long = urlObj.searchParams.get("long");
            if(lat && long) {
                return {lat, long};
            }
        } catch(e) {
            // Fallback met regex
            let latMatch = urlStr.match(/lat=([-.\d]+)/);
            let longMatch = urlStr.match(/long=([-.\d]+)/);
            if(latMatch && longMatch) {
                return {lat: latMatch[1], long: longMatch[1]};
            }
        }
        return null;
    }

    // Maak een zwevend menu met alle info en een refresh-knop
    function createMenu() {
        if (document.getElementById("wg-menu")) return;
        const menu = document.createElement("div");
        menu.id = "wg-menu";
        menu.innerHTML = `
            <div id="wg-header">WorldGuessr Info</div>
            <div id="wg-coords">
                <div><strong>Latitude:</strong> <span id="wg-lat">N/A</span></div>
                <div><strong>Longitude:</strong> <span id="wg-long">N/A</span></div>
            </div>
            <div id="wg-address">
                <strong>Address:</strong><br> N/A
            </div>
            <button id="wg-refresh">🔄 Refresh</button>
        `;
        document.body.appendChild(menu);

        GM_addStyle(`
            #wg-menu {
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #fff;
                padding: 10px;
                border-radius: 8px;
                z-index: 9999;
                font-family: sans-serif;
                font-size: 14px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            }
            #wg-header {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            #wg-refresh {
                margin-top: 10px;
                padding: 5px;
                background: #28a745;
                border: none;
                color: #fff;
                border-radius: 5px;
                cursor: pointer;
                width: 100%;
                font-size: 14px;
            }
            #wg-refresh:hover {
                background: #218838;
            }
            #wg-coords, #wg-address, #wg-ping-container {
                margin-bottom: 5px;
            }
        `);

        document.getElementById("wg-refresh").addEventListener("click", checkEmbedFrame);
    }

    // Controleer of er een embed-iframe is met de juiste URL en update de coördinaten
    function checkEmbedFrame() {
        const embedFrame = document.querySelector('iframe[src*="svEmbed"]');
        if (embedFrame && embedFrame.src) {
            const coords = extractCoordinatesFromURL(embedFrame.src);
            if (coords) {
                latestCoords = coords;
                // Start de reverse geocoding-call met de nieuwe coördinaten
                reverseGeocode(coords.lat, coords.long);
                updateUI();
            }
        }
    }

    // Start het script: maak het menu en check elk seconde of er nieuwe data is
    createMenu();
    setInterval(checkEmbedFrame, 1000);
})();
