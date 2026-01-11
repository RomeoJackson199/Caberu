# Downtime/Maintenance Page

This document explains how to use the downtime/maintenance page feature.

## Overview

The downtime page (`src/pages/DowntimePage.tsx`) provides a user-friendly interface to display when your website is experiencing technical difficulties or undergoing scheduled maintenance.

## Features

- **Two Display Modes**:
  - `maintenance` - For scheduled maintenance with a wrench icon and amber color scheme
  - `error` - For unexpected downtime with a server crash icon and red color scheme

- **Customizable Content**:
  - Custom title and message
  - Optional estimated restoration time
  - Configurable refresh button

- **Responsive Design**:
  - Mobile-friendly layout
  - Dark mode support
  - Gradient backgrounds matching the app's design system

- **User Actions**:
  - Try Again (refresh the page)
  - Go to Homepage

## Usage

### Testing the Pages

You can view the downtime pages at these URLs:

- **Maintenance Page**: `/maintenance`
  - Shows scheduled maintenance message
  - Displays estimated restoration time (30 minutes)
  - Amber/orange color scheme

- **Error Page**: `/downtime`
  - Shows service unavailable message
  - Red color scheme
  - Indicates technical difficulties

### Using in Your Application

#### Option 1: Route-based (Current Implementation)

Navigate users to `/downtime` or `/maintenance` when issues occur:

```typescript
// In your error handler or maintenance check
if (isUnderMaintenance) {
  navigate('/maintenance');
}

if (hasSystemError) {
  navigate('/downtime');
}
```

#### Option 2: Conditional Rendering

Replace your main app content conditionally:

```typescript
import DowntimePage from './pages/DowntimePage';

function App() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  if (isMaintenanceMode) {
    return <DowntimePage
      type="maintenance"
      estimatedTime="2 hours"
      title="Scheduled Maintenance"
      message="We're upgrading our systems to serve you better."
    />;
  }

  return <YourNormalApp />;
}
```

#### Option 3: Using Props for Customization

```typescript
<DowntimePage
  type="maintenance"
  title="We're Making Improvements"
  message="Our team is working hard to bring you new features and improvements."
  estimatedTime="1 hour"
  showRefresh={true}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'maintenance' \| 'error'` | `'maintenance'` | Display mode |
| `title` | `string` | Auto-generated | Custom page title |
| `message` | `string` | Auto-generated | Custom message |
| `estimatedTime` | `string` | `undefined` | Estimated restoration time |
| `showRefresh` | `boolean` | `true` | Show refresh button |

## Design

The page follows your application's design system:
- Uses Tailwind CSS for styling
- Implements dark mode support
- Uses Lucide React icons
- Follows the Card-based layout pattern
- Matches gradient backgrounds from other error pages

## Integration with Error Handling

You can integrate this with your error boundary or global error handler:

```typescript
// In your ErrorBoundary or error handler
class ErrorBoundary extends React.Component {
  render() {
    if (this.state.hasError) {
      return <DowntimePage type="error" />;
    }
    return this.props.children;
  }
}
```

## Server-side Implementation

For a complete maintenance mode, you might want to:

1. Set a feature flag in your database
2. Check the flag on app load
3. Redirect to downtime page if maintenance mode is active

```typescript
useEffect(() => {
  const checkMaintenanceMode = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('maintenance_mode, estimated_restoration')
      .single();

    if (data?.maintenance_mode) {
      navigate('/maintenance');
    }
  };

  checkMaintenanceMode();
}, []);
```

## Screenshots

Visit the following routes to see the pages in action:
- `/maintenance` - Amber themed maintenance page
- `/downtime` - Red themed error page

---

Created: 2026-01-11
