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

    let latestCoords = {lat: "N/A", long: "N/A"};
    let latestAddress = {road: "N/A", city: "N/A", country: "N/A"};
    let latestPing = "N/A";

    function extractCoordinatesFromURL(urlStr) {
        try {
            const urlObj = new URL(urlStr);
            const lat = urlObj.searchParams.get("lat");
            const long = urlObj.searchParams.get("long");
            if (lat && long) return {lat, long};
        } catch(e) {
            const latMatch = urlStr.match(/lat=([-.\d]+)/);
            const longMatch = urlStr.match(/long=([-.\d]+)/);
            if (latMatch && longMatch) {
                return {lat: latMatch[1], long: longMatch[1]};
            }
        }
        return null;
    }

    function reverseGeocode(lat, long) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${long}`;
        const startTime = performance.now();
        fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; WorldGuessrAutoScript/1.0; +https://example.com/)"
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

    function updateUI() {
        document.getElementById("wg-lat").textContent = latestCoords.lat;
        document.getElementById("wg-long").textContent = latestCoords.long;
        document.getElementById("wg-address").innerHTML =
            `<strong>Address:</strong><br>
             Road: ${latestAddress.road}<br>
             City: ${latestAddress.city}<br>
             Country: ${latestAddress.country}`;
        document.getElementById("wg-ping").textContent = latestPing;
    }

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
            <div id="wg-ping-container">
                <strong>Ping:</strong> <span id="wg-ping">N/A</span>
            </div>
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

    function checkEmbedFrame() {
        const embedFrame = document.querySelector('iframe[src*="svEmbed"]');
        if (embedFrame && embedFrame.src) {
            const coords = extractCoordinatesFromURL(embedFrame.src);
            if (coords) {
                latestCoords = coords;
                reverseGeocode(coords.lat, coords.long);
                updateUI();
            }
        }
    }

    createMenu();
    setInterval(checkEmbedFrame, 1000);
})();
