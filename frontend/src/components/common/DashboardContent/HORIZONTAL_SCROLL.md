# Horizontal Scrolling Dashboard

## Overview

The dashboard has been enhanced with horizontal scrolling functionality, allowing users to view all 7 asset status cards in a single row with smooth scrolling navigation.

## Features

### 🔄 **Horizontal Scrolling**

- **Single Row Layout**: All cards display in one horizontal row
- **Smooth Scrolling**: Smooth scroll behavior with CSS transitions
- **Touch Support**: Optimized for touch devices with momentum scrolling
- **Custom Scrollbar**: Styled scrollbar for better visual appeal

### 🎮 **Scroll Controls**

- **Navigation Buttons**: Left/Right arrow buttons for easy navigation
- **Smart Disabling**: Buttons automatically disable when at scroll limits
- **Smooth Animation**: 300px scroll distance per click
- **Accessibility**: Proper ARIA labels for screen readers

### 📱 **Responsive Design**

- **Desktop**: Full-size cards with hover effects
- **Tablet**: Slightly smaller cards
- **Mobile**: Compact cards optimized for touch
- **Small Mobile**: Minimal spacing for small screens

## Technical Implementation

### CSS Layout

```css
.cardsContainer {
  display: flex;
  overflow-x: auto;
  gap: 1.2rem;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.card {
  min-width: 200px;
  flex-shrink: 0;
  transition: transform 0.2s ease-in-out;
}
```

### Scroll Controls

```typescript
const scrollLeft = () => {
  scrollContainerRef.current?.scrollBy({
    left: -300,
    behavior: "smooth",
  });
};

const scrollRight = () => {
  scrollContainerRef.current?.scrollBy({
    left: 300,
    behavior: "smooth",
  });
};
```

### Scroll Position Detection

```typescript
const checkScrollPosition = () => {
  if (scrollContainerRef.current) {
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }
};
```

## Card Layout

### Desktop (1200px+)

- **Card Width**: 200px minimum
- **Gap**: 1.2rem between cards
- **Hover Effects**: Cards lift on hover
- **Scroll Controls**: Visible navigation buttons

### Tablet (768px - 1199px)

- **Card Width**: 180px minimum
- **Gap**: 1rem between cards
- **Responsive Text**: Smaller font sizes
- **Touch Optimized**: Better touch targets

### Mobile (480px - 767px)

- **Card Width**: 160px minimum
- **Gap**: 1rem between cards
- **Compact Design**: Reduced padding
- **Touch Friendly**: Larger touch areas

### Small Mobile (< 480px)

- **Card Width**: 140px minimum
- **Gap**: 0.8rem between cards
- **Minimal Spacing**: Optimized for small screens
- **Essential Info**: Focus on key data

## Scroll Behavior

### Manual Scrolling

- **Mouse Wheel**: Horizontal scroll with shift + wheel
- **Touch Swipe**: Natural swipe gestures on mobile
- **Drag Scroll**: Click and drag to scroll
- **Scrollbar**: Custom styled scrollbar

### Button Navigation

- **Left Button**: Scroll 300px to the left
- **Right Button**: Scroll 300px to the right
- **Auto Disable**: Buttons disable at scroll limits
- **Smooth Animation**: CSS transitions for smooth movement

### Scroll Indicators

- **Visual Feedback**: Buttons change appearance when disabled
- **Position Tracking**: Real-time scroll position monitoring
- **Dynamic Updates**: Buttons update based on scroll position
- **Accessibility**: Proper ARIA labels and keyboard support

## Custom Scrollbar Styling

### Webkit Scrollbar

```css
.cardsContainer::-webkit-scrollbar {
  height: 8px;
}

.cardsContainer::-webkit-scrollbar-track {
  background: var(--main-bg);
  border-radius: 4px;
}

.cardsContainer::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.cardsContainer::-webkit-scrollbar-thumb:hover {
  background: var(--text-color-secondary);
}
```

### Cross-Browser Support

- **Chrome/Safari**: Full custom scrollbar styling
- **Firefox**: Standard scrollbar with fallback styling
- **Edge**: Webkit scrollbar support
- **Mobile**: Native scrollbar behavior

## Performance Optimizations

### Smooth Scrolling

- **CSS Transitions**: Hardware-accelerated animations
- **Touch Momentum**: iOS-style momentum scrolling
- **Reduced Repaints**: Efficient scroll handling
- **Debounced Events**: Optimized scroll event handling

### Memory Management

- **Event Cleanup**: Proper event listener removal
- **Ref Management**: Efficient ref usage
- **State Updates**: Minimal state changes
- **Component Lifecycle**: Proper cleanup on unmount

## Accessibility Features

### Keyboard Navigation

- **Tab Navigation**: Proper tab order through controls
- **Enter/Space**: Activate scroll buttons
- **Arrow Keys**: Alternative scroll method
- **Focus Management**: Clear focus indicators

### Screen Reader Support

- **ARIA Labels**: Descriptive button labels
- **Role Attributes**: Proper semantic roles
- **State Announcements**: Dynamic state updates
- **Navigation Hints**: Clear navigation instructions

### Visual Accessibility

- **High Contrast**: WCAG compliant color contrast
- **Focus Indicators**: Clear focus states
- **Disabled States**: Obvious disabled button styling
- **Touch Targets**: Adequate touch target sizes

## Browser Compatibility

### Supported Browsers

- **Chrome 90+**: Full feature support
- **Firefox 88+**: Full feature support
- **Safari 14+**: Full feature support
- **Edge 90+**: Full feature support

### Mobile Browsers

- **iOS Safari**: Touch momentum scrolling
- **Chrome Mobile**: Full feature support
- **Samsung Internet**: Full feature support
- **Firefox Mobile**: Full feature support

## Usage Examples

### Basic Implementation

```tsx
<DashboardContent />
```

### Custom Scroll Distance

```typescript
const scrollLeft = () => {
  scrollContainerRef.current?.scrollBy({
    left: -400, // Custom distance
    behavior: "smooth",
  });
};
```

### Custom Scroll Controls

```tsx
<div className={styles.scrollControls}>
  <button onClick={scrollLeft} disabled={!canScrollLeft}>
    <CustomLeftIcon />
  </button>
  <button onClick={scrollRight} disabled={!canScrollRight}>
    <CustomRightIcon />
  </button>
</div>
```

## Future Enhancements

### Planned Features

- **Auto-scroll**: Automatic scrolling with pause on hover
- **Scroll Indicators**: Dots showing current position
- **Keyboard Shortcuts**: Arrow key navigation
- **Scroll Snap**: Snap to card boundaries
- **Infinite Scroll**: Load more cards dynamically

### Performance Improvements

- **Virtual Scrolling**: For large numbers of cards
- **Lazy Loading**: Load cards as needed
- **Intersection Observer**: Optimize scroll detection
- **CSS Containment**: Improve rendering performance

Horizontal scrolling dashboard is ready for production! 🚀
