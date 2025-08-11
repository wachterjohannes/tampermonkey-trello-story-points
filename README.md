# Trello Story Points

A Tampermonkey userscript that automatically extracts and displays story points from Trello card titles, showing them as visual bubbles on cards and totals in list headers.

## Features

- 📊 **Visual Story Point Bubbles**: Display story points directly on Trello cards
- 📈 **List Totals**: Show estimated and used story points in list headers (respects filters)
- 🔄 **Manual & Auto Refresh**: Update button with 5-minute auto-refresh functionality
- 🎨 **Clean Flat Design**: Seamless integration with Trello's modern interface
- 🎯 **Filter Support**: Column totals automatically adjust when filtering cards
- ⚡ **Dynamic Loading**: Works with Trello's single-page application behavior
- 🔢 **Flexible Formats**: Supports decimals, zero values, and unknown (?) points

## Story Point Format

The script recognizes story points in card titles using this format:

```
(<estimate>) Card Title [<used-points>]
```

**Examples:**
- `(5) Implement user authentication [3]` - 5 estimated points, 3 used points
- `(8) Database migration` - 8 estimated points, no used points yet
- `(2) Fix login bug [2]` - 2 estimated points, 2 used points (completed)
- `(0) Meta: Planning session` - 0 estimated points (valid)
- `(?) Research task [2.5]` - Unknown estimate, 2.5 used points
- `Task without story points` - No story points (ignored)

## Screenshots

### Cards with Story Point Bubbles
Cards display blue bubbles for estimates and green bubbles for used points:
- Blue bubble: Estimated story points
- Green bubble: Used/actual story points

### List Headers with Totals
Each list shows (on a new line below the list title):
- Blue `Est: X` bubble - Total estimated story points (only counts visible/filtered cards)
- Green `Used: Y` bubble - Total used story points (always shown)

### Update Button
- Floating button in bottom-right corner showing "SP • Xmin ago"
- Click to manually refresh story points
- Auto-refreshes every 5 minutes
- Updates timestamp on each refresh

## Installation

### Prerequisites
- [Tampermonkey](https://www.tampermonkey.net/) browser extension

### Install Steps

1. **Install Tampermonkey**
   - Chrome: [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - Edge: [Microsoft Store](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. **Install the Script**
   - Click [here to install](https://raw.githubusercontent.com/wachterjohannes/tampermonkey-trello-story-points/main/trello-story-points.user.js)
   - Or manually copy the script from [`trello-story-points.user.js`](trello-story-points.user.js)

3. **Manual Installation**
   - Open Tampermonkey Dashboard
   - Click "Create a new script"
   - Replace the template with the code from this repository
   - Save (Ctrl+S)

## Usage

1. Navigate to any Trello board (`https://trello.com/b/*`)
2. Add story points to your card titles using the format: `(estimate) Title [used]`
   - Both estimate and used points are optional
   - Supports decimals: `(2.5)`, zero: `(0)`, unknown: `(?)`
3. The script will automatically:
   - Show colored bubbles inline with card titles
   - Display totals in list headers (respects Trello filters)
   - Update via manual button click or 5-minute auto-refresh

## Customization

### Colors
Edit the CSS in the script to customize colors:

```css
.story-points-bubble {
    background: linear-gradient(135deg, #026aa7 0%, #0079bf 100%); /* Estimate bubbles (blue) */
}

.story-points-used {
    background: linear-gradient(135deg, #61bd4f 0%, #70c95e 100%); /* Used points bubbles (green) */
}

.story-points-total {
    background: linear-gradient(135deg, #026aa7 0%, #0079bf 100%); /* Header estimate totals (blue) */
}

.story-points-total.story-points-used {
    background: linear-gradient(135deg, #61bd4f 0%, #70c95e 100%); /* Header used totals (green) */
}
```

### Regex Patterns
Modify the regex patterns to match different title formats:

```javascript
// Current format: (5) Title [3] - both optional
const ESTIMATE_REGEX = /\(([?\d]+(?:\.\d+)?)\)/;  // Matches (5), (2.5), (0), (?)
const USED_REGEX = /\[([?\d]+(?:\.\d+)?)\]/;      // Matches [3], [1.5], [0], [?]

// Example alternative: [5] Title {3}
const ESTIMATE_REGEX = /\[([?\d]+(?:\.\d+)?)\]/;
const USED_REGEX = /\{([?\d]+(?:\.\d+)?)\}/;
```

## Development

### Project Structure
```
trello-story-points/
├── trello-story-points.user.js    # Main userscript
└── README.md                      # This file
```

### Key Components

1. **Story Point Parsing**: Regex-based extraction from card titles with flexible format support
2. **DOM Manipulation**: Adding bubbles and totals to Trello's interface
3. **Visibility Detection**: Only counts visible cards when filtering is applied
4. **Refresh System**: Manual button + 5-minute auto-refresh with retry logic
5. **CSS Styling**: Clean flat design integration with Trello

### Browser Compatibility

- ✅ **Chrome/Chromium**: Fully tested and working
- 🔄 **Firefox**: Should work with Tampermonkey (not tested)
- 🔄 **Edge**: Should work with Tampermonkey (not tested)  
- 🔄 **Safari**: Should work with Tampermonkey (not tested)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Script Not Working
1. Ensure Tampermonkey is enabled
2. Check that the script is enabled in Tampermonkey dashboard
3. Verify you're on a Trello board URL (`trello.com/b/*`)
4. Refresh the page

### Story Points Not Appearing
1. Check your title format: `(estimate)` and/or `[used]` (both are optional)
2. Supports: numbers `(5)`, decimals `(2.5)`, zero `(0)`, unknown `(?)`
3. Click the "SP" update button to manually refresh
4. Check browser console for error messages

### Totals Not Updating
1. Column totals only count visible/filtered cards
2. Use the floating "SP" button to manually refresh
3. Auto-refresh occurs every 5 minutes
4. Totals disappear when no story points are found in visible cards

### Filter Issues
1. Column totals should adjust when filtering cards
2. Hidden cards are excluded from totals
3. Manual refresh may be needed after applying filters

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### v1.0-rc1 (Release Candidate)
- ✨ Story point parsing with flexible formats: `(estimate)` and `[used]` (both optional)
- 📊 Visual bubbles: blue for estimates, green for used points
- 📈 Column header totals that respect Trello filters (only count visible cards)
- 🔄 Manual refresh button with 5-minute auto-refresh
- 🎯 Support for decimals, zero values, and unknown (?) points
- 🎨 Clean flat design with inline bubble positioning
- ⚡ Dynamic loading with retry logic for Trello's SPA behavior
- 🔧 Comprehensive visibility detection for filtered cards