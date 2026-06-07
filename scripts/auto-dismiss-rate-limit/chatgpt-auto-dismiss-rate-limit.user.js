// ==UserScript==
// @name         ChatGPT - Auto Dismiss Rate Limit
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically replaces the rate limit modal with a less intrusive notification.
// @author       https://github.com/ddpd/
// @homepageURL  https://github.com/ddpd/chatgpt-scripts
// @supportURL   https://github.com/ddpd/chatgpt-scripts/issues
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// @icon         https://chatgpt.com/favicon.ico
// @license      GPL-3.0-only
// @updateURL    https://raw.githubusercontent.com/ddpd/chatgpt-scripts/main/scripts/auto-dismiss-rate-limit/chatgpt-auto-dismiss-rate-limit.user.js
// @downloadURL  https://raw.githubusercontent.com/ddpd/chatgpt-scripts/main/scripts/auto-dismiss-rate-limit/chatgpt-auto-dismiss-rate-limit.user.js
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

    function showToastNotification(message) {
        const toast = document.createElement('div');
        toast.innerHTML = `⚠️ <strong>Info:</strong> ${message}`;

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#202123',
            color: '#ececf1',
            border: '1px solid #4d4d4f',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: '999999',
            fontFamily: 'inherit',
            fontSize: '14px',
            pointerEvents: 'none', // Clicks will pass through the notification
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            transform: 'translateY(10px)',
            opacity: '0'
        });

        document.body.appendChild(toast);

        // Entrance animation
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Auto-remove after 3.5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function isRateLimitModal(dialog) {
        // 1. Must have exactly one button, and it must be a primary button
        const buttons = dialog.querySelectorAll('button');
        if (buttons.length !== 1 || !buttons[0].classList.contains('btn-primary')) {
            return false;
        }

        // 2. Must NOT have any other interactive elements (links, inputs, etc.)
        const interactiveElements = dialog.querySelectorAll('a, input, textarea, select, [role="switch"], [role="checkbox"]');
        if (interactiveElements.length > 0) {
            return false;
        }

        // 3. Must have the specific text container used for this warning
        const textContainer = dialog.querySelector('.text-token-text-secondary.space-y-4');
        if (!textContainer) {
            return false;
        }

        // 4. The text container must have exactly 2 paragraphs
        const paragraphs = textContainer.querySelectorAll('p');
        if (paragraphs.length !== 2) {
            return false;
        }

        // If all structural checks pass, this is definitely the rate limit modal
        return true;
    }

    function checkAndDismissModal() {
        // Find all open dialogs on the page
        const dialogs = document.querySelectorAll('[role="dialog"], dialog, .group\\/dialog');

        for (const dialog of dialogs) {
            if (isRateLimitModal(dialog)) {
                // Target the primary action button
                const confirmBtn = dialog.querySelector('button.btn-primary');

                if (confirmBtn) {
                    // Click the button to let React handle the unmounting properly
                    confirmBtn.click();

                    showToastNotification('Rate limit modal automatically dismissed.');
                    return; // Exit after finding and clicking
                }
            }
        }
    }

    // Observe DOM changes to catch the modal as soon as it renders
    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldCheck = true;
                break;
            }
        }

        if (shouldCheck) {
            checkAndDismissModal();
        }
    });

    // Start observing the body for injected modals
    observer.observe(document.body, { childList: true, subtree: true });

})();