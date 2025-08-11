# Trello Story Points

A Tampermonkey userscript that automatically extracts and displays story points from Trello card titles, showing them as visual bubbles on cards and totals in list headers.

## Features

- 📊 **Visual Story Point Bubbles**: Display story points directly on Trello cards
- 📈 **List Totals**: Show estimated and used story points in list headers
- 🔄 **Real-time Updates**: Automatically updates when cards are moved or titles change
- 🎨 **Clean Design**: Integrates seamlessly with Trello's interface
- ⚡ **Dynamic Loading**: Works with Trello's single-page application behavior

## Story Point Format

The script recognizes story points in card titles using this format:

```
(<estimate>) Card Title [<used-points>]
```

**Examples:**
- `(5) Implement user authentication [3]` - 5 estimated points, 3 used points
- `(8) Database migration` - 8 estimated points, no used points yet
- `(2) Fix login bug [2]` - 2 estimated points, 2 used points (completed)

## Screenshots

### Cards with Story Point Bubbles
Cards display blue bubbles for estimates and green bubbles for used points:
- Blue bubble: Estimated story points
- Green bubble: Used/actual story points

### List Headers with Totals
Each list shows:
- `Est: X` - Total estimated story points
- `Used: Y` - Total used story points (only shown if > 0)

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
3. The script will automatically:
   - Show colored bubbles on cards
   - Display totals in list headers
   - Update when you move or edit cards

## Customization

### Colors
Edit the CSS in the script to customize colors:

```css
.story-points-bubble {
    background: #026aa7; /* Estimate bubble color (blue) */
}

.story-points-used {
    background: #61bd4f; /* Used points bubble color (green) */
}

.story-points-total {
    background: #f2d600; /* Header totals background (yellow) */
}
```

### Regex Pattern
Modify the regex patterns to match different title formats:

```javascript
// Current format: (5) Title [3]
const STORY_POINTS_REGEX = /\((\d+(?:\.\d+)?)\).*?\[(\d+(?:\.\d+)?)\]/;

// Example alternative: [5] Title {3}
const STORY_POINTS_REGEX = /\[(\d+(?:\.\d+)?)\].*?\{(\d+(?:\.\d+)?)\}/;
```

## Development

### Project Structure
```
trello-story-points/
├── trello-story-points.user.js    # Main userscript
└── README.md                      # This file
```

### Key Components

1. **Story Point Parsing**: Regex-based extraction from card titles
2. **DOM Manipulation**: Adding bubbles and totals to Trello's interface
3. **MutationObserver**: Handling dynamic content updates
4. **CSS Styling**: Clean integration with Trello's design

### Browser Compatibility

Tested and working on:
- ✅ Chrome
- ✅ Firefox
- ✅ Edge
- ✅ Safari (with Tampermonkey)

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
1. Check your title format matches: `(number) Title [number]`
2. Numbers can be decimals: `(2.5) Title [1.5]`
3. Both brackets are required for full functionality

### Totals Not Updating
1. The script uses a 300ms debounce for performance
2. Try refreshing the page if totals seem stuck
3. Check browser console for any error messages

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release
- Story point bubble display
- List header totals
- Real-time updates with MutationObserver
- Support for estimate-only and estimate+used formats