// ==UserScript==
// @name         Trello Story Points
// @namespace    https://asapo.at
// @version      0.14
// @description  Display story points from Trello card titles and show totals in list headers
// @author       @wachterjohannes
// @match        https://trello.com/b/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('Trello Story Points: Script loaded, version 0.14');

    // Regex patterns for flexible story points parsing
    const ESTIMATE_REGEX = /\(([?\d]+(?:\.\d+)?)\)/;  // Matches (5) or (?)
    const USED_REGEX = /\[([?\d]+(?:\.\d+)?)\]/;      // Matches [3] or [?]

    // CSS styles for story points bubbles and totals
    const styles = `
        .story-points-bubble {
            display: inline-block;
            background: linear-gradient(135deg, #026aa7 0%, #0079bf 100%);
            color: white;
            border-radius: 10px;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: 600;
            margin: 4px 4px 4px 0;
            min-width: 16px;
            max-width: 28px;
            text-align: center;
            box-shadow: 0 1px 2px rgba(2, 106, 167, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            position: relative;
            line-height: 1.2;
        }
        
        .story-points-bubble::before {
            content: '';
            position: absolute;
            top: 1px;
            left: 50%;
            transform: translateX(-50%);
            width: 60%;
            height: 1px;
            background: rgba(255, 255, 255, 0.4);
            border-radius: 1px;
        }
        
        .story-points-used {
            background: linear-gradient(135deg, #61bd4f 0%, #70c95e 100%);
            box-shadow: 0 1px 3px rgba(97, 189, 79, 0.3);
        }
        
        .story-points-total {
            background: linear-gradient(135deg, #f2d600 0%, #ffd700 100%);
            color: #2c3e50;
            padding: 5px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            margin: 2px 6px;
            display: inline-block;
            box-shadow: 0 2px 4px rgba(242, 214, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.3);
            text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);
        }
        
        .story-points-total.story-points-used {
            background: linear-gradient(135deg, #61bd4f 0%, #70c95e 100%);
            color: white;
            text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
        }
        
        .story-points-header {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        
        .story-points-header-totals {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 4px;
        }
        
        .story-points-update-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #026aa7 0%, #0079bf 100%);
            color: white;
            border: none;
            border-radius: 20px;
            padding: 10px 16px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(2, 106, 167, 0.3);
            z-index: 9999;
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .story-points-update-button:hover {
            background: linear-gradient(135deg, #0079bf 0%, #026aa7 100%);
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(2, 106, 167, 0.4);
        }
        
        .story-points-update-button:active {
            background: linear-gradient(135deg, #005a8b 0%, #026aa7 100%);
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(2, 106, 167, 0.3);
        }
        
        /* Add subtle animation for newly added bubbles */
        @keyframes storyPointsFadeIn {
            from {
                opacity: 0;
                transform: scale(0.8);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        .story-points-bubble {
            animation: storyPointsFadeIn 0.3s ease-out;
        }
        
        /* Improved positioning within cards */
        [data-testid="trello-card"] .story-points-bubble {
            position: absolute;
            top: 6px;
            right: 6px;
            z-index: 10;
        }
        
        /* Container for multiple bubbles */
        .story-points-container {
            position: absolute;
            top: 6px;
            right: 6px;
            display: flex;
            flex-direction: row-reverse;
            gap: 2px;
            z-index: 10;
        }
        
        .story-points-container .story-points-bubble {
            position: static;
            margin: 0;
        }
        
        /* Better integration with Trello's card labels */
        .card-labels .story-points-bubble,
        [data-testid="card-labels"] .story-points-bubble {
            position: static;
            margin: 2px 4px 2px 0;
            align-self: flex-start;
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
        
        let estimate = null;
        let used = null;
        
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
        const container = document.createElement('div');
        container.className = 'story-points-container';
        
        // Create estimate bubble if present (include 0 values)
        if (estimate !== null && estimate !== undefined) {
            const bubble = document.createElement('span');
            bubble.className = 'story-points-bubble';
            bubble.textContent = estimate.toString();
            container.appendChild(bubble);
        }
        
        // Create used points bubble if present (include 0 values)
        if (used !== null && used !== undefined) {
            const usedBubble = document.createElement('span');
            usedBubble.className = 'story-points-bubble story-points-used';
            usedBubble.textContent = used.toString();
            container.appendChild(usedBubble);
        }
        
        // Return container (even for single bubble to maintain consistent positioning)
        return container;
    }

    // Add story points bubble to card
    function addStoryPointsToCard(card, titleElement = null) {
        if (!card) return;
        
        // Find title element if not provided
        if (!titleElement) {
            titleElement = card.querySelector('[data-testid="card-name"]');
        }
        if (!titleElement) return;

        // Remove existing containers to avoid duplicates
        const existingContainers = card.querySelectorAll('.story-points-container');
        existingContainers.forEach(container => container.remove());

        const title = titleElement.textContent.trim();
        const points = parseStoryPoints(title);
        
        if (points) {
            const container = createStoryPointsBubble(points.estimate, points.used);
            
            // Position container absolutely in the top-right corner of the card
            card.style.position = 'relative'; // Ensure card has relative positioning
            card.appendChild(container);
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

        // Remove existing totals containers
        const existingTotals = listHeader.parentNode.querySelectorAll('.story-points-header-totals');
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
                // Only add numeric values to totals, skip "?" values (but include 0)
                if (points.estimate !== null && points.estimate !== '?' && !isNaN(points.estimate)) {
                    totalEstimate += points.estimate;
                }
                if (points.used !== null && points.used !== '?' && !isNaN(points.used)) {
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

            // Create or find the totals container
            let totalsContainer = headerContainer.querySelector('.story-points-header-totals');
            if (!totalsContainer) {
                totalsContainer = document.createElement('div');
                totalsContainer.className = 'story-points-header-totals';
                headerContainer.appendChild(totalsContainer);
            } else {
                // Clear existing totals
                totalsContainer.innerHTML = '';
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

            totalsContainer.appendChild(estimateTotal);
            // Show used total if there are any used points (including 0)
            totalsContainer.appendChild(usedTotal);
            
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