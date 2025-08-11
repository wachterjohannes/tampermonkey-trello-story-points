// ==UserScript==
// @name         Trello Story Points
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Display story points from Trello card titles and show totals in list headers
// @author       You
// @match        https://trello.com/b/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('Trello Story Points: Script loaded, version 0.9');

    // Regex patterns for flexible story points parsing
    const ESTIMATE_REGEX = /\(([?\d]+(?:\.\d+)?)\)/;  // Matches (5) or (?)
    const USED_REGEX = /\[([?\d]+(?:\.\d+)?)\]/;      // Matches [3] or [?]

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
        const estimateMatch = title.match(ESTIMATE_REGEX);
        const usedMatch = title.match(USED_REGEX);
        
        // Return null if no story points found at all
        if (!estimateMatch && !usedMatch) {
            return null;
        }
        
        let estimate = 0;
        let used = 0;
        
        // Parse estimate - handle numbers and "?"
        if (estimateMatch) {
            const estimateStr = estimateMatch[1];
            if (estimateStr === '?') {
                estimate = '?';
            } else {
                estimate = parseFloat(estimateStr);
            }
        }
        
        // Parse used points - handle numbers and "?"
        if (usedMatch) {
            const usedStr = usedMatch[1];
            if (usedStr === '?') {
                used = '?';
            } else {
                used = parseFloat(usedStr);
            }
        }
        
        return { estimate, used };
    }

    // Create story points bubble element
    function createStoryPointsBubble(estimate, used = null) {
        const container = document.createElement('span');
        
        // Create estimate bubble if present
        if (estimate !== 0 && estimate !== null) {
            const bubble = document.createElement('span');
            bubble.className = 'story-points-bubble';
            bubble.textContent = estimate.toString();
            container.appendChild(bubble);
        }
        
        // Create used points bubble if present
        if (used !== 0 && used !== null) {
            const usedBubble = document.createElement('span');
            usedBubble.className = 'story-points-bubble story-points-used';
            usedBubble.textContent = used.toString();
            container.appendChild(usedBubble);
        }
        
        // Return single bubble if only one, or container if multiple
        return container.children.length === 1 ? container.firstChild : container;
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

        const titleElement = card.querySelector('[data-testid="card-name"]');
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
        if (!listHeader) {
            console.log('Trello Story Points: No list header found');
            return;
        }

        // Remove existing totals
        const existingTotals = listHeader.parentNode.querySelectorAll('.story-points-total');
        existingTotals.forEach(el => el.remove());

        const cards = list.querySelectorAll('.list-card, [data-testid="card-name"]');
        let totalEstimate = 0;
        let totalUsed = 0;
        let cardCount = 0;

        cards.forEach((card, index) => {
            const titleElement = card.querySelector('[data-testid="card-name"]');
            if (titleElement) {
                const title = titleElement.textContent.trim();
                if (index < 3) { // Only log first 3 cards to avoid spam
                    console.log(`Trello Story Points: Card ${index + 1} title: "${title}"`);
                }
                const points = parseStoryPoints(title);
                if (points) {
                    if (index < 3) {
                        console.log(`Trello Story Points: Card ${index + 1} parsed:`, points);
                    }
                    // Only add numeric values to totals, skip "?" values
                    if (points.estimate !== 0 && points.estimate !== '?' && !isNaN(points.estimate)) {
                        totalEstimate += points.estimate;
                    }
                    if (points.used !== 0 && points.used !== '?' && !isNaN(points.used)) {
                        totalUsed += points.used;
                    }
                    cardCount++;
                }
            } else if (index < 3) {
                console.log(`Trello Story Points: Card ${index + 1} has no title element`);
            }
        });

        console.log('Trello Story Points: List has', cardCount, 'cards with story points. Est:', totalEstimate, 'Used:', totalUsed);
        
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
            // Show used total if there are any used points (including 0)
            headerContainer.appendChild(usedTotal);
            
            console.log('Trello Story Points: Added totals to list header');
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
        console.log('Trello Story Points: Found', cards.length, 'cards total');
        console.log('Trello Story Points: Card selectors:', {
            '.list-card': document.querySelectorAll('.list-card').length,
            '[data-testid="trello-card"]': document.querySelectorAll('[data-testid="trello-card"]').length,
            '.card': document.querySelectorAll('.card').length,
            '[data-testid="card-name"]': document.querySelectorAll('[data-testid="card-name"]').length,
            '.list-card-title': document.querySelectorAll('.list-card-title').length
        });
        cards.forEach(addStoryPointsToCard);

        // Update totals for all lists
        const lists = document.querySelectorAll('.list, [data-testid="list"]');
        console.log('Trello Story Points: Found', lists.length, 'lists');
        lists.forEach((list, index) => {
            if (index < 3) {
                console.log(`Trello Story Points: Processing list ${index + 1}`);
            }
            updateListTotals(list);
        });
    }

    // Check if we're on a board page
    function isBoardPage() {
        const isBoard = window.location.pathname.startsWith('/b/');
        const boardElement = document.querySelector('.board-canvas, [data-testid="board"], #board, .board-wrapper');
        console.log('Trello Story Points: URL check:', isBoard, 'Board element found:', !!boardElement);
        console.log('Trello Story Points: Available selectors:', {
            '.board-canvas': !!document.querySelector('.board-canvas'),
            '[data-testid="board"]': !!document.querySelector('[data-testid="board"]'),
            '#board': !!document.querySelector('#board'),
            '.board-wrapper': !!document.querySelector('.board-wrapper'),
            '.board-main-content': !!document.querySelector('.board-main-content')
        });
        return isBoard && (boardElement !== null);
    }

    // Wait for content to load with retry logic
    function waitForContent(maxRetries = 20, retryDelay = 1000) {
        console.log('Trello Story Points: Waiting for content to load...');
        
        let attempts = 0;
        const checkContent = () => {
            attempts++;
            console.log(`Trello Story Points: Attempt ${attempts}/${maxRetries}`);
            
            // Check if we're on a board URL first
            const isBoard = window.location.pathname.startsWith('/b/');
            if (!isBoard) {
                console.log('Trello Story Points: Not a board URL, exiting');
                return;
            }
            
            // Look for any board-related elements
            const boardElements = document.querySelectorAll('.board-canvas, #board, .board-wrapper, .board-main-content');
            const cards = document.querySelectorAll('[data-testid="trello-card"]');
            const lists = document.querySelectorAll('.list, [data-testid="list"]');
            const cardNames = document.querySelectorAll('[data-testid="card-name"]');
            
            console.log(`Trello Story Points: Board elements: ${boardElements.length}, Cards: ${cards.length}, Lists: ${lists.length}, Card names: ${cardNames.length}`);
            
            // Success criteria: at least some board structure exists
            if (boardElements.length > 0 && (cards.length > 0 || cardNames.length > 0)) {
                console.log('Trello Story Points: Content loaded! Processing...');
                addStyles();
                processBoard();
                return;
            }
            
            if (attempts < maxRetries) {
                console.log(`Trello Story Points: Content not ready, retrying in ${retryDelay}ms...`);
                setTimeout(checkContent, retryDelay);
            } else {
                console.log('Trello Story Points: Max retries reached, giving up');
            }
        };
        
        checkContent();
    }

    // Initialize the script
    function init() {
        console.log('Trello Story Points: init() called');
        waitForContent();
    }

    // Wait for Trello to load, then initialize
    console.log('Trello Story Points: Document ready state:', document.readyState);
    
    if (document.readyState === 'loading') {
        console.log('Trello Story Points: Waiting for DOM content loaded');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Trello Story Points: DOM loaded, starting init');
            setTimeout(init, 5000); // Increase initial delay // Initial delay then start retry logic
        });
    } else {
        console.log('Trello Story Points: Document already loaded, starting init');
        setTimeout(init, 5000); // Increase initial delay
    }

    // Also try to reinitialize when navigating between boards
    let currentUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== currentUrl) {
            console.log('Trello Story Points: URL changed from', currentUrl, 'to', window.location.href);
            currentUrl = window.location.href;
            setTimeout(init, 5000); // Increase initial delay // Start retry logic for new board
        }
    }, 1000);

})();