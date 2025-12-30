# forceCalendar UI

World-class calendar UI components powered by [@forcecalendar/core](https://www.npmjs.com/package/@forcecalendar/core).

## Overview

forceCalendar UI provides enterprise-grade calendar components built as Web Components, making them framework-agnostic and compatible with any JavaScript environment - including sandboxed environments like Salesforce Lightning Web Components.

## Features

- **Powered by NPM Package** - Uses @forcecalendar/core for all calendar logic
- **Multiple Views** - Month, Week, and Day views
- **Web Components** - Works with React, Vue, Angular, or vanilla JS
- **Enterprise Design** - Clean, professional, optimized for business use
- **High Performance** - Leverages spatial indexing for instant rendering
- **Salesforce Ready** - Works in LWC and other sandboxed environments

## Installation

```bash
npm install @forcecalendar/core @forcecalendar/ui
```

## Quick Start

### HTML
```html
<!DOCTYPE html>
<html>
<head>
    <script type="module">
        import '@forcecalendar/ui';
    </script>
</head>
<body>
    <force-calendar-view></force-calendar-view>
</body>
</html>
```

### JavaScript
```javascript
import { CalendarView } from '@forcecalendar/ui';

// The component auto-registers as a web component
const calendar = document.createElement('force-calendar-view');
document.body.appendChild(calendar);
```

## Demo

```bash
npm install
npx http-server . -p 8080
# Open http://localhost:8080/demo.html
```

## License

MIT