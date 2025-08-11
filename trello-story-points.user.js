// ==UserScript==
// @name         Trello Story Points
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Display story points from Trello card titles and show totals in list headers
// @author       You
// @match        https://trello.com/b/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Regex to extract story points from title format: "(<estimate>) Title [<used-points>]"
    const STORY_POINTS_REGEX = /\((\d+(?:\.\d+)?)\).*?\[(\d+(?:\.\d+)?)\]/;
    const ESTIMATE_ONLY_REGEX = /\((\d+(?:\.\d+)?)\)/;

    // CSS styles for story points bubbles and totals
    const styles = `
        .story-points-bubble {
            display: inline-block;
            background: #026aa7;
            color: white;
            border-radius: 12px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: bold;
            margin-right: 4px;
            min-width: 20px;
            text-align: center;
        }
        
        .story-points-used {
            background: #61bd4f;
        }
        
        .story-points-total {
            background: #f2d600;
            color: #000;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 8px;
            display: inline-block;
        }
        
        .story-points-header {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
        }
    `;

    // Add CSS styles to page
    function addStyles() {
        if (!document.getElementById('story-points-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'story-points-styles';
            styleElement.textContent = styles;
            document.head.appendChild(styleElement);
        }
    }

    // Parse story points from card title
    function parseStoryPoints(title) {
        const fullMatch = title.match(STORY_POINTS_REGEX);
        if (fullMatch) {
            return {
                estimate: parseFloat(fullMatch[1]),
                used: parseFloat(fullMatch[2])
            };
        }
        
        // Check for estimate only
        const estimateMatch = title.match(ESTIMATE_ONLY_REGEX);
        if (estimateMatch) {
            return {
                estimate: parseFloat(estimateMatch[1]),
                used: 0
            };
        }
        
        return null;
    }

    // Create story points bubble element
    function createStoryPointsBubble(estimate, used = null) {
        const bubble = document.createElement('span');
        bubble.className = 'story-points-bubble';
        bubble.textContent = estimate.toString();
        
        if (used !== null && used > 0) {
            const usedBubble = document.createElement('span');
            usedBubble.className = 'story-points-bubble story-points-used';
            usedBubble.textContent = used.toString();
            
            const container = document.createElement('span');
            container.appendChild(bubble);
            container.appendChild(usedBubble);
            return container;
        }
        
        return bubble;
    }

    // Add story points bubble to card
    function addStoryPointsToCard(card) {
        if (!card) return;
        
        // Remove existing bubbles to avoid duplicates
        const existingBubbles = card.querySelectorAll('.story-points-bubble');
        existingBubbles.forEach(bubble => {
            // Remove the container if it contains bubbles, otherwise just the bubble
            const container = bubble.parentNode;
            if (container && container.children.length === 1 && container.querySelector('.story-points-bubble')) {
                container.remove();
            } else {
                bubble.remove();
            }
        });

        const titleElement = card.querySelector('.list-card-title, [data-testid="card-name"]');
        if (!titleElement) return;

        const title = titleElement.textContent.trim();
        const points = parseStoryPoints(title);
        
        if (points) {
            const bubble = createStoryPointsBubble(points.estimate, points.used);
            
            // Find appropriate location to insert bubble
            const labelsContainer = card.querySelector('.card-labels, [data-testid="card-labels"]');
            if (labelsContainer) {
                labelsContainer.appendChild(bubble);
            } else {
                // Insert at the beginning of the card
                card.insertBefore(bubble, card.firstChild);
            }
        }
    }

    // Calculate and display totals in list header
    function updateListTotals(list) {
        if (!list) return;
        
        const listHeader = list.querySelector('.list-header-name, [data-testid="list-name"]');
        if (!listHeader) return;

        // Remove existing totals
        const existingTotals = listHeader.parentNode.querySelectorAll('.story-points-total');
        existingTotals.forEach(el => el.remove());

        const cards = list.querySelectorAll('.list-card, [data-testid="card-name"]');
        let totalEstimate = 0;
        let totalUsed = 0;
        let cardCount = 0;

        cards.forEach(card => {
            const titleElement = card.querySelector('.list-card-title, [data-testid="card-name"]');
            if (titleElement) {
                const title = titleElement.textContent.trim();
                const points = parseStoryPoints(title);
                if (points) {
                    totalEstimate += points.estimate;
                    totalUsed += points.used;
                    cardCount++;
                }
            }
        });

        if (cardCount > 0) {
            const headerContainer = listHeader.parentNode;
            if (!headerContainer.classList.contains('story-points-header')) {
                headerContainer.classList.add('story-points-header');
            }

            // Create estimate total
            const estimateTotal = document.createElement('span');
            estimateTotal.className = 'story-points-total';
            estimateTotal.textContent = `Est: ${totalEstimate}`;
            estimateTotal.title = `Total estimated story points: ${totalEstimate}`;

            // Create used total if any cards have used points
            const usedTotal = document.createElement('span');
            usedTotal.className = 'story-points-total story-points-used';
            usedTotal.textContent = `Used: ${totalUsed}`;
            usedTotal.title = `Total used story points: ${totalUsed}`;

            headerContainer.appendChild(estimateTotal);
            if (totalUsed > 0) {
                headerContainer.appendChild(usedTotal);
            }
        }
    }

    // Process all cards and lists
    function processBoard() {
        // Only proceed if we're on a board page
        if (!isBoardPage()) {
            return;
        }

        // Add story points to all cards
        const cards = document.querySelectorAll('.list-card, [data-testid="trello-card"]');
        cards.forEach(addStoryPointsToCard);

        // Update totals for all lists
        const lists = document.querySelectorAll('.list, [data-testid="list"]');
        lists.forEach(updateListTotals);
    }

    // Check if we're on a board page
    function isBoardPage() {
        return window.location.pathname.startsWith('/b/') && 
               (document.querySelector('.board-canvas, [data-testid="board"]') !== null);
    }

    // Initialize the script
    function init() {
        // Only run on board pages
        if (!isBoardPage()) {
            return;
        }

        addStyles();
        processBoard();

        // Set up MutationObserver to handle dynamic content changes
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                // Check if cards were added/removed or titles changed
                if (mutation.type === 'childList' || 
                    (mutation.type === 'characterData' && 
                     mutation.target.parentNode &&
                     (mutation.target.parentNode.matches('.list-card-title, [data-testid="card-name"]') ||
                      mutation.target.parentNode.matches('.list-header-name, [data-testid="list-name"]')))) {
                    shouldUpdate = true;
                }
            });

            if (shouldUpdate) {
                // Debounce updates to avoid excessive processing
                clearTimeout(window.storyPointsUpdateTimeout);
                window.storyPointsUpdateTimeout = setTimeout(processBoard, 300);
            }
        });

        // Observe the entire board for changes
        const boardContainer = document.querySelector('#board, [data-testid="board-wrapper"]') || document.body;
        observer.observe(boardContainer, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // Wait for Trello to load, then initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(init, 1000); // Give Trello time to render
        });
    } else {
        setTimeout(init, 1000);
    }

    // Also try to reinitialize when navigating between boards
    let currentUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            setTimeout(init, 1500); // Give more time for new board to load
        }
    }, 1000);

})();