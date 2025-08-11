// ==UserScript==
// @name         Trello Story Points
// @namespace    http://tampermonkey.net/
// @version      0.11
// @description  Display story points from Trello card titles and show totals in list headers
// @author       You
// @match        https://trello.com/b/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('Trello Story Points: Script loaded, version 0.11');

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
        
        .story-points-update-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #026aa7;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 9999;
            transition: background-color 0.2s;
        }
        
        .story-points-update-button:hover {
            background: #0079bf;
        }
        
        .story-points-update-button:active {
            background: #005a8b;
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

    // Format time ago string
    function formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}min ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    // Create or update the floating update button
    function createUpdateButton() {
        let button = document.getElementById('story-points-update-button');
        
        if (!button) {
            button = document.createElement('button');
            button.id = 'story-points-update-button';
            button.className = 'story-points-update-button';
            button.title = 'Click to refresh story points';
            document.body.appendChild(button);
            
            button.addEventListener('click', () => {
                console.log('Trello Story Points: Manual refresh triggered');
                processBoard();
            });

            // Set up automatic refresh every 5 minutes
            setInterval(() => {
                console.log('Trello Story Points: Auto-refresh triggered (5min interval)');
                processBoard();
            }, 5 * 60 * 1000); // 5 minutes
        }
        
        // Initialize the last update time
        window.storyPointsLastUpdate = new Date();
        
        function updateButtonText() {
            const lastUpdate = window.storyPointsLastUpdate || new Date();
            const timeAgo = formatTimeAgo(lastUpdate);
            button.textContent = `SP • ${timeAgo}`;
            button.title = `Story Points updated ${timeAgo}\nClick to refresh\nAuto-refresh every 5 minutes`;
        }
        
        // Update button text immediately and then every minute
        updateButtonText();
        setInterval(updateButtonText, 60000);
        
        // Store the update function globally so we can call it from processBoard
        window.storyPointsUpdateButton = updateButtonText;
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
    function addStoryPointsToCard(card, titleElement = null) {
        if (!card) return;
        
        // Find title element if not provided
        if (!titleElement) {
            titleElement = card.querySelector('[data-testid="card-name"]');
        }
        if (!titleElement) return;

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
            // Try more selectors for list headers
            const alternateSelectors = [
                'h2', '.list-header h2', '[data-testid="list-header"]', 
                '.list-header-name-assist', '.js-list-name-input'
            ];
            
            for (const selector of alternateSelectors) {
                const header = list.querySelector(selector);
                if (header) {
                    console.log(`Trello Story Points: Found list header with selector: ${selector}`);
                    return updateListTotals(list); // Retry with found header
                }
            }
            
            console.log('Trello Story Points: No list header found with any selector');
            return;
        }

        // Remove existing totals
        const existingTotals = listHeader.parentNode.querySelectorAll('.story-points-total');
        existingTotals.forEach(el => el.remove());

        const cards = list.querySelectorAll('.list-card, [data-testid="card-name"]');
        let totalEstimate = 0;
        let totalUsed = 0;
        let cardCount = 0;

        // Find card names within this specific list
        const cardNamesInList = list.querySelectorAll('[data-testid="card-name"]');
        console.log(`Trello Story Points: List has ${cardNamesInList.length} card names`);
        
        cardNamesInList.forEach((titleElement, index) => {
            const title = titleElement.textContent.trim();
            if (index < 3) { // Only log first 3 cards to avoid spam
                console.log(`Trello Story Points: List card ${index + 1} title: "${title}"`);
            }
            const points = parseStoryPoints(title);
            if (points) {
                if (index < 3) {
                    console.log(`Trello Story Points: List card ${index + 1} parsed:`, points);
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

        // Find all card name elements (these are the actual titles)
        const cardNames = document.querySelectorAll('[data-testid="card-name"]');
        console.log('Trello Story Points: Found', cardNames.length, 'card names total');
        
        // Debug first few card names
        cardNames.forEach((cardName, index) => {
            if (index < 3) {
                console.log(`Trello Story Points: Card ${index + 1} title: "${cardName.textContent.trim()}"`);
                const points = parseStoryPoints(cardName.textContent.trim());
                console.log(`Trello Story Points: Card ${index + 1} parsed:`, points);
            }
            
            // Add bubbles to card names (find parent card and add bubble)
            const card = cardName.closest('[data-testid="trello-card"]');
            if (card) {
                addStoryPointsToCard(card, cardName);
            }
        });

        // Update totals for all lists
        const lists = document.querySelectorAll('.list, [data-testid="list"]');
        console.log('Trello Story Points: Found', lists.length, 'lists');
        lists.forEach((list, index) => {
            if (index < 3) {
                console.log(`Trello Story Points: Processing list ${index + 1}`);
            }
            updateListTotals(list);
        });

        // Update the button timestamp
        if (window.storyPointsUpdateButton) {
            window.storyPointsLastUpdate = new Date();
            window.storyPointsUpdateButton();
        }
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
                createUpdateButton();
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