// ==UserScript==
// @name         ChatGPT Images - Open Exact Chat
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Middle click images to open exact source chat in new tab (SPA compatible, Language Agnostic)
// @author       https://github.com/ddpd/
// @homepageURL  https://github.com/ddpd/chatgpt-scripts
// @supportURL   https://github.com/ddpd/chatgpt-scripts/issues
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// @icon         https://chatgpt.com/favicon.ico
// @license      GPL-3.0-only
// @updateURL    https://raw.githubusercontent.com/ddpd/chatgpt-scripts/main/scripts/open-exact-chat/chatgpt-images-open-exact-chat.user.js
// @downloadURL  https://raw.githubusercontent.com/ddpd/chatgpt-scripts/main/scripts/open-exact-chat/chatgpt-images-open-exact-chat.user.js
// ==/UserScript==

// Copyright (C) 2026 ddpd
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License version 3
// as published by the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.
// If not, see <https://www.gnu.org/licenses/>.

(function () {
    "use strict";

    // Safely extract IDs from React Fiber to avoid circular structure errors
    function extractIdsFromReact(target) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let cid = null;
        let mid = null;

        let currentDom = target;
        while (currentDom) {
            const fiberKey = Object.keys(currentDom).find(k => k.startsWith("__reactFiber$"));
            if (fiberKey) {
                let fiber = currentDom[fiberKey];
                let depth = 0;

                // Traverse up the React component tree (max 20 levels)
                while (fiber && depth < 20) {
                    const props = fiber.memoizedProps;
                    if (props) {
                        // Breadth-First Search (BFS) through component properties
                        const queue = [props];
                        const visited = new Set();

                        while (queue.length > 0) {
                            const obj = queue.shift();
                            if (!obj || typeof obj !== 'object') continue;
                            if (visited.has(obj)) continue; // Prevent infinite loops
                            visited.add(obj);

                            for (const k in obj) {
                                const val = obj[k];
                                if (typeof val === 'string' && uuidRegex.test(val)) {
                                    const keyLower = k.toLowerCase();
                                    if (keyLower === 'conversationid' || keyLower === 'conversation_id') {
                                        cid = val;
                                    } else if (keyLower === 'messageid' || keyLower === 'message_id') {
                                        mid = val;
                                    } else if (k === 'id' && obj.conversation_id) {
                                        mid = val;
                                    }
                                } else if (typeof val === 'object' && val !== null) {
                                    // Skip deep React internal elements to maintain performance
                                    if (!val.$$typeof) {
                                        queue.push(val);
                                    }
                                }
                            }
                        }
                    }
                    // Stop searching if the conversation ID is found
                    if (cid) return { cid, mid };

                    fiber = fiber.return;
                    depth++;
                }
            }
            currentDom = currentDom.parentElement;
        }
        return null;
    }

    function findExactChatUrl(target) {
        // METHOD 1: Check if clicked directly on a link or a button containing a link
        const aTag = target.closest('a[href*="/c/"]');
        if (aTag && aTag.href.includes('?message=')) return aTag.href;

        // METHOD 2: Look for a chat link within the same container (e.g., image card)
        const container = target.closest('.group, .relative, [data-testid]');
        if (container) {
            const localLink = container.querySelector('a[href*="?message="]');
            if (localLink) return localLink.href;
        }

        // METHOD 3: If a modal with an image is open, grab its specific link
        const allMessageLinks = document.querySelectorAll('a[href*="?message="]');
        if (allMessageLinks.length === 1) {
            return allMessageLinks[0].href;
        }

        // METHOD 4: Extract data directly from React memory (best for image grids)
        const reactData = extractIdsFromReact(target);
        if (reactData && reactData.cid) {
            let url = `https://chatgpt.com/c/${reactData.cid}`;
            if (reactData.mid) {
                url += `?message=${reactData.mid}`;
            }
            return url;
        }

        return null;
    }

    function handleImageClick(event, target) {
        const url = findExactChatUrl(target);

        if (url) {
            // Prevent default action so the current page doesn't navigate away
            event.preventDefault();
            event.stopPropagation();

            console.log("[ChatGPT Images] Opening exact URL:", url);
            window.open(url, "_blank", "noopener,noreferrer");
        }
        // If no URL is found, we silently ignore the click (it might have been a normal button)
    }

    // Handle Middle Click
    document.addEventListener("auxclick", (event) => {
        if (event.button !== 1) return;
        // Execute only if the user is on the /images route
        if (!location.pathname.startsWith('/images')) return;

        // Generic structural selector (Language Agnostic)
        const target = event.target.closest('img, button, [data-testid]');
        if (target) {
            handleImageClick(event, target);
        }
    }, true);

    // Handle Ctrl + Left Click
    document.addEventListener("click", (event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        // Execute only if the user is on the /images route
        if (!location.pathname.startsWith('/images')) return;

        // Generic structural selector (Language Agnostic)
        const target = event.target.closest('img, button, [data-testid]');
        if (target) {
            handleImageClick(event, target);
        }
    }, true);

})();