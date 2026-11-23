import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

async function runSmokeTests() {
  console.log('--- Starting Client Page Smoke Tests ---');

  const vite = await createServer({
    root: process.cwd(),
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    // 1. Load context providers & React Router
    const { MemoryRouter } = await vite.ssrLoadModule('react-router-dom');
    const { ThemeProvider } = await vite.ssrLoadModule('/src/context/ThemeContext.jsx');
    const { ToastProvider } = await vite.ssrLoadModule('/src/context/ToastContext.jsx');
    const { AuthProvider } = await vite.ssrLoadModule('/src/context/AuthContext.jsx');
    const { FavouritesProvider } = await vite.ssrLoadModule('/src/context/FavouritesContext.jsx');
    const { CompareProvider } = await vite.ssrLoadModule('/src/context/CompareContext.jsx');

    // 2. Load pages & components
    const { HomePage } = await vite.ssrLoadModule('/src/pages/HomePage.jsx');
    const { BrowsePage } = await vite.ssrLoadModule('/src/pages/BrowsePage.jsx');
    const { VehicleDetailPage } = await vite.ssrLoadModule('/src/pages/VehicleDetailPage.jsx');
    const { FavouritesPage } = await vite.ssrLoadModule('/src/pages/FavouritesPage.jsx');
    const { ComparePage } = await vite.ssrLoadModule('/src/pages/ComparePage.jsx');
    const { VehicleImage } = await vite.ssrLoadModule('/src/components/vehicle/VehicleImage.jsx');

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const renderWithProviders = (Component, initialEntries = ['/']) => {
      return renderToString(
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(
            ThemeProvider,
            null,
            React.createElement(
              ToastProvider,
              null,
              React.createElement(
                AuthProvider,
                null,
                React.createElement(
                  FavouritesProvider,
                  null,
                  React.createElement(
                    CompareProvider,
                    null,
                    React.createElement(
                      MemoryRouter,
                      { initialEntries },
                      React.createElement(Component, null)
                    )
                  )
                )
              )
            )
          )
        )
      );
    };

    // Test 1: Home Page
    console.log('Testing Home Page render...');
    const homeHtml = renderWithProviders(HomePage, ['/']);
    if (!homeHtml) throw new Error('Home page render returned empty');
    console.log('✓ Home Page rendered successfully.');

    // Test 2: Browse Page
    console.log('Testing Browse Page render...');
    const browseHtml = renderWithProviders(BrowsePage, ['/browse']);
    if (!browseHtml) throw new Error('Browse page render returned empty');
    console.log('✓ Browse Page rendered successfully.');

    // Test 3: Vehicle Detail Page (with sample listing query cache)
    console.log('Testing Vehicle Detail Page render...');
    queryClient.setQueryData(['listing-detail', 'sample-123'], {
      _id: 'sample-123',
      id: 'sample-123',
      purpose: 'sale',
      moderationStatus: 'approved',
      sale: { status: 'active', askingPrice: 120000000 },
      vehicleRef: {
        brand: 'Hyundai',
        model: 'Creta',
        variant: 'SX (O)',
        manufacturingYear: 2022,
        fuelType: 'Petrol',
        transmission: 'Automatic',
        images: [{ url: '/placeholder.svg' }],
      },
      seller: { name: 'Seller Sally' },
    });
    const detailHtml = renderWithProviders(VehicleDetailPage, ['/listings/sample-123']);
    if (!detailHtml) throw new Error('Vehicle Detail page render returned empty');
    console.log('✓ Vehicle Detail Page rendered successfully.');

    // Test 4: Favourites Page
    console.log('Testing Favourites Page render...');
    const favHtml = renderWithProviders(FavouritesPage, ['/favourites']);
    if (!favHtml) throw new Error('Favourites page render returned empty');
    console.log('✓ Favourites Page rendered successfully.');

    // Test 5: Compare Page
    console.log('Testing Compare Page render...');
    const compareHtml = renderWithProviders(ComparePage, ['/compare?ids=sample-123']);
    if (!compareHtml) throw new Error('Compare page render returned empty');
    console.log('✓ Compare Page rendered successfully.');

    // Test 6: VehicleImage Component (with real URL, empty URL, and body-type placeholder fallback)
    console.log('Testing VehicleImage Component render...');
    const vehicleImageReal = renderToString(
      React.createElement(VehicleImage, { src: '/uploads/images/sample.jpg', alt: 'Test Car' })
    );
    if (!vehicleImageReal.includes('src="/uploads/images/sample.jpg"')) {
      throw new Error('VehicleImage did not render real src correctly');
    }
    const vehicleImagePlaceholder = renderToString(
      React.createElement(VehicleImage, { src: null, alt: 'Test Fallback', bodyType: 'SUV' })
    );
    if (!vehicleImagePlaceholder.includes('placeholder-suv.svg')) {
      throw new Error('VehicleImage did not render placeholder SUV fallback');
    }
    console.log('✓ VehicleImage component rendered and resolved fallback successfully.');

    console.log('--- All Smoke Tests Passed Cleanly! ---');
  } finally {
    await vite.close();
  }
}

runSmokeTests().catch(err => {
  console.error('Smoke Test Failed:', err);
  process.exit(1);
});
