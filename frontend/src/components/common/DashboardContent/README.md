# Dashboard Content Component

## Overview

The Dashboard Content component displays comprehensive asset statistics and charts for both user and admin dashboards with enhanced status tracking.

## Features

### 📊 **Asset Status Cards**

Displays 7 key metrics in card format:

#### **Core Metrics**

- **Total Assets** - Total number of assets in the system
- **Active Assets** - Assets currently in use (Green)
- **Broken Assets** - Assets that are damaged/not working (Orange)
- **Missing Assets** - Assets that cannot be located (Red)

#### **Additional Status Metrics**

- **Transferring Assets** - Assets being transferred between locations (Blue)
- **Audited Assets** - Assets that have been audited (Purple)
- **Disposed Assets** - Assets that have been disposed of (Gray)

### 📈 **Interactive Charts**

- Asset acquisition trends over the last 6 months
- Real-time data visualization
- Responsive chart design

### 🎨 **UI Features**

- **Color-coded Cards**: Each status has a distinct color
- **Hover Effects**: Cards lift on hover for better UX
- **Responsive Design**: Adapts to different screen sizes
- **Loading States**: Shows loading indicators
- **Error Handling**: Displays error messages when needed

## Data Flow

### Backend API Response

```json
{
  "totalAssets": 150,
  "activeAssets": 120,
  "brokenAssets": 15,
  "missingAssets": 5,
  "transferringAssets": 8,
  "auditedAssets": 12,
  "disposedAssets": 3,
  "monthlyData": [
    { "month": "Jan", "count": 10 },
    { "month": "Feb", "count": 15 }
  ]
}
```

### Frontend Processing

1. **Data Fetching**: Uses DashboardContext to fetch stats
2. **Card Generation**: Creates 7 cards with different colors
3. **Chart Preparation**: Processes monthly data for visualization
4. **Responsive Layout**: Adjusts grid layout based on screen size

## Color Scheme

### Card Colors

- **Total Assets**: `#4f46e5` (Indigo)
- **Active Assets**: `#22c55e` (Green)
- **Broken Assets**: `#f97316` (Orange)
- **Missing Assets**: `#ef4444` (Red)
- **Transferring Assets**: `#3b82f6` (Blue)
- **Audited Assets**: `#8b5cf6` (Purple)
- **Disposed Assets**: `#6b7280` (Gray)

## Responsive Design

### Desktop (1200px+)

- 7 cards in a responsive grid
- Full-size cards with hover effects
- Large chart display

### Tablet (768px - 1199px)

- Smaller card sizes
- Adjusted spacing
- Maintained grid layout

### Mobile (480px - 767px)

- 2 cards per row
- Compact card design
- Optimized for touch

### Small Mobile (< 480px)

- Single column layout
- Minimal spacing
- Touch-friendly design

## Component Structure

```tsx
DashboardContent
├── Loading State
├── Error State
├── DashboardCards (7 cards)
│   ├── Total Assets Card
│   ├── Active Assets Card
│   ├── Broken Assets Card
│   ├── Missing Assets Card
│   ├── Transferring Assets Card
│   ├── Audited Assets Card
│   └── Disposed Assets Card
└── DashboardChart
    └── Monthly Acquisition Chart
```

## Usage

### Basic Implementation

```tsx
import DashboardContent from "./DashboardContent";
import { DashboardProvider } from "../../contexts/DashboardContext";

<DashboardProvider>
  <DashboardContent />
</DashboardProvider>;
```

### With Custom Styling

```tsx
<div className={styles.dashboardContent}>
  <DashboardCards cards={cardData} />
  <DashboardChart series={chartSeries} options={chartOptions} />
</div>
```

## API Integration

### Endpoint

- **URL**: `GET /api/assets/stats`
- **Authentication**: Required
- **Department Filtering**: Applied based on user role

### Data Processing

- **User Role**: Regular users see department-specific data
- **Admin Role**: Admins see system-wide data
- **Real-time Updates**: Data refreshes automatically

## Performance Optimizations

### Frontend

- **Memoized Components**: Prevents unnecessary re-renders
- **Debounced API Calls**: Reduces server load
- **Lazy Loading**: Optimizes initial load time

### Backend

- **Efficient Queries**: Optimized database queries
- **Caching**: Reduces database load
- **Department Filtering**: Limits data scope

## Accessibility

### Features

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Proper ARIA labels
- **Color Contrast**: WCAG compliant colors
- **Focus Management**: Clear focus indicators

### Best Practices

- Semantic HTML structure
- Descriptive alt text
- Proper heading hierarchy
- Touch-friendly targets

## Error Handling

### Network Errors

- Automatic retry mechanism
- User-friendly error messages
- Fallback to cached data

### Data Errors

- Graceful degradation
- Default values for missing data
- Clear error indicators

## Future Enhancements

### Planned Features

- **Interactive Cards**: Click to view detailed breakdown
- **Custom Date Ranges**: User-selectable time periods
- **Export Functionality**: Download reports as PDF/CSV
- **Real-time Updates**: WebSocket integration
- **Custom Dashboards**: User-configurable layouts

### Performance Improvements

- **Virtual Scrolling**: For large datasets
- **Progressive Loading**: Load data in chunks
- **Advanced Caching**: Redis integration
- **CDN Integration**: Faster asset delivery

## Browser Support

### Supported Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Features

- CSS Grid layout
- ES6+ JavaScript
- Modern CSS features
- Responsive design

## Testing

### Test Cases

- [ ] All 7 cards display correctly
- [ ] Data updates when assets change
- [ ] Responsive design works on all devices
- [ ] Error states display properly
- [ ] Loading states work correctly
- [ ] Chart renders with real data
- [ ] Color scheme is accessible
- [ ] Hover effects work as expected

Dashboard component is ready for production use! 🚀
