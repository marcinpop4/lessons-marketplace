# Currency Handling Guidelines

## Core Principles

1. **Store and Calculate in Cents**: All monetary values should be stored and processed in cents (integer values) to avoid floating-point precision issues.

2. **Display in Dollars**: Format monetary values as dollars (or other currencies) only at the display/UI layer.

## Implementation Rules

### Shared Models & Backend

- ✅ All monetary properties should be named with a `InCents` suffix (e.g., `rateInCents`, `costInCents`)
- ✅ All monetary values must be plain integers (whole numbers) in cents
- ✅ All calculations should be performed using the cent values
- ✅ Use `Math.round()` when dividing cent values to ensure integer results
- ❌ Never convert to dollars for calculations
- ❌ Avoid storing dollar values directly in the database
- ❌ Don't use floating point types for monetary values

### Frontend/Client

- ✅ Convert cents to dollars only for display purposes
- ✅ Create utility functions for formatting (e.g., `formatCurrency`)
- ✅ Keep the original cent values in state/props when possible
- ❌ Don't perform calculations with converted dollar values

## Example Pattern

### Model Definition
```typescript
class Product {
  name: string;
  priceInCents: number; // Integer value in cents
  
  // Optional helper for display only
  getFormattedPrice(locale = 'en-US', currency = 'USD'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(this.priceInCents / 100);
  }
}
```

### Frontend Usage
```typescript
// Component example
function ProductDisplay({ product }) {
  // Format for display
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(product.priceInCents / 100);
  
  return <div>{product.name}: {formattedPrice}</div>;
}
```

## Benefits

- Avoids floating-point precision errors
- Ensures consistent calculation results
- Makes auditing financial calculations easier
- Reduces bugs related to currency handling 