# OptixFlowConfig Component

The `OptixFlowConfig` component provides an SSR-safe way to set default OptixFlow configuration for all `Img` components in your application.

## Why Use OptixFlowConfig?

Previously, setting default OptixFlow configuration required calling `setDefaultOptixFlowConfig()` directly, which could cause SSR errors:

```tsx
// ❌ This can cause SSR errors
setDefaultOptixFlowConfig({ apiKey: 'your-key' });
```

The `OptixFlowConfig` component solves this by:
- Using React's `useEffect` to ensure configuration is only set on the client
- Providing a declarative, component-based approach
- Avoiding hydration mismatches in SSR environments

## Basic Usage

### As a Standalone Component

Place the component at your app's root level:

```tsx
import { OptixFlowConfig } from '@page-speed/img';

function App() {
  return (
    <>
      <OptixFlowConfig config={{
        apiKey: 'your-optixflow-api-key',
        compressionLevel: 80
      }} />

      {/* Your app components */}
      <YourApp />
    </>
  );
}
```

### As a Wrapper Component

You can also use it to wrap your app:

```tsx
import { OptixFlowConfig } from '@page-speed/img';

function App() {
  return (
    <OptixFlowConfig config={{
      apiKey: 'your-optixflow-api-key',
      compressionLevel: 80
    }}>
      {/* All Img components inside will use these defaults */}
      <YourApp />
    </OptixFlowConfig>
  );
}
```

## Next.js Integration

For Next.js apps, add it to your `_app.tsx`:

```tsx
// pages/_app.tsx
import { OptixFlowConfig } from '@page-speed/img';
import type { AppProps } from 'next/app';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <OptixFlowConfig config={{
      apiKey: process.env.NEXT_PUBLIC_OPTIXFLOW_API_KEY,
      compressionLevel: 75
    }}>
      <Component {...pageProps} />
    </OptixFlowConfig>
  );
}
```

## Rails/CDN Integration

For Rails applications using CDN imports (like customer-sites):

### Option 1: Set via Window Global (Existing Method)

```erb
<% if optix_flow_api_key.present? %>
  <script>
    window.PageSpeedImgDefaults = {
      optixFlowConfig: {
        apiKey: "<%= j optix_flow_api_key %>",
        compressionLevel: <%= compression_level || 'undefined' %>
      }
    };
  </script>
<% end %>
```

### Option 2: Use OptixFlowConfig Component (SSR-Safe)

```erb
<div id="root"></div>

<script type="module">
  import { OptixFlowConfig, Img } from 'https://cdn.example.com/page-speed-img/index.js';
  import React from 'https://cdn.example.com/react/index.js';
  import ReactDOM from 'https://cdn.example.com/react-dom/index.js';

  const App = () => {
    return React.createElement(
      OptixFlowConfig,
      {
        config: {
          apiKey: '<%= j optix_flow_api_key %>',
          compressionLevel: <%= compression_level || 80 %>
        }
      },
      React.createElement(YourApp)
    );
  };

  ReactDOM.render(React.createElement(App), document.getElementById('root'));
</script>
```

## Configuration Options

The `config` prop accepts all OptixFlow configuration options:

```typescript
interface OptixFlowConfig {
  apiKey?: string;           // Your OptixFlow API key
  compressionLevel?: number; // Image compression level (0-100)
  // ... other OptixFlow options
}
```

## Override Default Configuration

Individual `Img` components can still override the default configuration:

```tsx
// This uses the default config set by OptixFlowConfig
<Img src="default.jpg" alt="Uses defaults" />

// This overrides with custom config
<Img
  src="custom.jpg"
  alt="Custom compression"
  optixFlowConfig={{
    compressionLevel: 95 // Higher quality for this specific image
  }}
/>
```

## Server-Side Rendering (SSR)

The component is fully SSR-compatible:

```tsx
// pages/index.tsx (Next.js SSR/SSG)
import { OptixFlowConfig, Img } from '@page-speed/img';

export default function Page() {
  return (
    <>
      {/* Safe to use in SSR - configuration only applied on client */}
      <OptixFlowConfig config={{ apiKey: 'your-key' }} />

      {/* Images will use the config once hydrated */}
      <Img src="photo.jpg" alt="Photo" />
    </>
  );
}

export async function getServerSideProps() {
  // SSR logic here
  return { props: {} };
}
```

## Testing

When testing components that use OptixFlowConfig:

```tsx
import { render } from '@testing-library/react';
import { OptixFlowConfig, Img } from '@page-speed/img';

test('renders with OptixFlow config', () => {
  const { getByAltText } = render(
    <OptixFlowConfig config={{ apiKey: 'test-key' }}>
      <Img src="test.jpg" alt="Test image" />
    </OptixFlowConfig>
  );

  expect(getByAltText('Test image')).toBeInTheDocument();
});
```

## Migration Guide

If you're currently using `setDefaultOptixFlowConfig`:

```tsx
// Before (can cause SSR errors)
import { setDefaultOptixFlowConfig } from '@page-speed/img';

function App() {
  setDefaultOptixFlowConfig({ apiKey: 'your-key' });
  return <YourApp />;
}

// After (SSR-safe)
import { OptixFlowConfig } from '@page-speed/img';

function App() {
  return (
    <OptixFlowConfig config={{ apiKey: 'your-key' }}>
      <YourApp />
    </OptixFlowConfig>
  );
}
```

## Best Practices

1. **Place at root level**: Add OptixFlowConfig at the highest level of your app to ensure all Img components can access the configuration.

2. **Set once**: Only include one OptixFlowConfig component in your app. Multiple instances will override each other.

3. **Environment variables**: Use environment variables for API keys:
   ```tsx
   <OptixFlowConfig config={{
     apiKey: process.env.REACT_APP_OPTIXFLOW_KEY
   }} />
   ```

4. **TypeScript**: The component is fully typed for better IDE support and type safety.

5. **Performance**: The component has minimal overhead and doesn't cause unnecessary re-renders.

## Troubleshooting

### Config not being applied

Ensure OptixFlowConfig is rendered before any Img components that need the configuration.

### SSR hydration warnings

If you see hydration warnings, make sure you're not calling `setDefaultOptixFlowConfig` directly. Use the OptixFlowConfig component instead.

### Multiple configurations

If you need different configurations for different parts of your app, use the `optixFlowConfig` prop on individual Img components rather than trying to nest multiple OptixFlowConfig components.