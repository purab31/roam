import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { FavouritesProvider } from './context/FavouritesContext';
import { CompareProvider } from './context/CompareContext';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { CompareTray } from './components/discovery/CompareTray';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { CapabilityRoute } from './components/auth/CapabilityRoute';

// Core Public & Account Pages (Eagerly Loaded)
import { HomePage } from './pages/HomePage';
import { BrowsePage } from './pages/BrowsePage';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
import { FavouritesPage } from './pages/FavouritesPage';
import { ComparePage } from './pages/ComparePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { MyVehiclesPage } from './pages/dashboard/MyVehiclesPage';
import { MyListingsPage } from './pages/dashboard/MyListingsPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';

// Code-Split Heavy Pages (React.lazy)
const DesignSystemPage = React.lazy(() =>
  import('./pages/DesignSystemPage').then(m => ({ default: m.DesignSystemPage }))
);
const ListingWizardPage = React.lazy(() =>
  import('./pages/listing/ListingWizardPage').then(m => ({ default: m.ListingWizardPage }))
);
const NegotiationThreadPage = React.lazy(() =>
  import('./pages/negotiation/NegotiationThreadPage').then(m => ({ default: m.NegotiationThreadPage }))
);
const DealerDirectoryPage = React.lazy(() =>
  import('./pages/dealer/DealerDirectoryPage').then(m => ({ default: m.DealerDirectoryPage }))
);
const DealerProfilePage = React.lazy(() =>
  import('./pages/dealer/DealerProfilePage').then(m => ({ default: m.DealerProfilePage }))
);
const DealerRegistrationPage = React.lazy(() =>
  import('./pages/dealer/DealerRegistrationPage').then(m => ({ default: m.DealerRegistrationPage }))
);
const DealerVerificationStatusPage = React.lazy(() =>
  import('./pages/dealer/DealerVerificationStatusPage').then(m => ({
    default: m.DealerVerificationStatusPage,
  }))
);
const DealerInventoryPage = React.lazy(() =>
  import('./pages/dashboard/dealer/DealerInventoryPage').then(m => ({
    default: m.DealerInventoryPage,
  }))
);
const BulkUploadPage = React.lazy(() =>
  import('./pages/dashboard/dealer/BulkUploadPage').then(m => ({ default: m.BulkUploadPage }))
);
const DiscoverOwnerListingsPage = React.lazy(() =>
  import('./pages/dashboard/dealer/DiscoverOwnerListingsPage').then(m => ({
    default: m.DiscoverOwnerListingsPage,
  }))
);
const DealerOffersSentPage = React.lazy(() =>
  import('./pages/dashboard/dealer/DealerOffersSentPage').then(m => ({
    default: m.DealerOffersSentPage,
  }))
);

// Admin Pages (Code-Split)
const AdminDealersPage = React.lazy(() =>
  import('./pages/admin/AdminDealersPage').then(m => ({ default: m.AdminDealersPage }))
);
const AdminDashboardPage = React.lazy(() =>
  import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage }))
);
const AdminListingsPage = React.lazy(() =>
  import('./pages/admin/AdminListingsPage').then(m => ({ default: m.AdminListingsPage }))
);
const AdminUsersPage = React.lazy(() =>
  import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage }))
);
const AdminReportsPage = React.lazy(() =>
  import('./pages/admin/AdminReportsPage').then(m => ({ default: m.AdminReportsPage }))
);
const AdminOffersPage = React.lazy(() =>
  import('./pages/admin/AdminOffersPage').then(m => ({ default: m.AdminOffersPage }))
);
const AdminBookingsPage = React.lazy(() =>
  import('./pages/admin/AdminBookingsPage').then(m => ({ default: m.AdminBookingsPage }))
);
const AdminSettingsPage = React.lazy(() =>
  import('./pages/admin/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage }))
);
const AdminAuditLogPage = React.lazy(() =>
  import('./pages/admin/AdminAuditLogPage').then(m => ({ default: m.AdminAuditLogPage }))
);

// Sprint 6: Rentals & Bookings (Code-Split)
const BookingPage = React.lazy(() =>
  import('./pages/booking/BookingPage').then(m => ({ default: m.BookingPage }))
);
const RentalRequestsPage = React.lazy(() =>
  import('./pages/dashboard/RentalRequestsPage').then(m => ({ default: m.RentalRequestsPage }))
);
const MyBookingsPage = React.lazy(() =>
  import('./pages/dashboard/MyBookingsPage').then(m => ({ default: m.MyBookingsPage }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <FavouritesProvider>
                <CompareProvider>
                  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Suspense
                      fallback={
                        <div className="min-h-screen flex items-center justify-center bg-bg text-text">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                      }
                    >
                      <Routes>
                      {/* Public Discovery Routes (Sprint 3) */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/browse" element={<BrowsePage />} />
                      <Route path="/listings/:id" element={<VehicleDetailPage />} />

                      {/* Sprint 9: Compare (UI 8.4) & Favourites (UI 7.10) */}
                      <Route path="/compare" element={<ComparePage />} />
                      <Route
                        path="/favourites"
                        element={
                          <ProtectedRoute>
                            <FavouritesPage />
                          </ProtectedRoute>
                        }
                      />

                {/* Sprint 6: Booking Flow (UI 8.6) */}
                <Route
                  path="/listings/:id/book"
                  element={
                    <ProtectedRoute>
                      <BookingPage />
                    </ProtectedRoute>
                  }
                />

                {/* Sprint 5: Public Dealer Directory & Profile */}
                <Route path="/dealers" element={<DealerDirectoryPage />} />
                <Route path="/dealers/:id" element={<DealerProfilePage />} />

                {/* Sprint 5: Dealer Onboarding & Verification */}
                <Route
                  path="/dealer/register"
                  element={
                    <ProtectedRoute>
                      <DealerRegistrationPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dealer/verification"
                  element={
                    <ProtectedRoute>
                      <DealerVerificationStatusPage />
                    </ProtectedRoute>
                  }
                />

                {/* Development-only Design System */}
                {import.meta.env.DEV && (
                  <Route path="/design-system" element={<DesignSystemPage />} />
                )}

                {/* Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected Account & Dashboard Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Sprint 4: Negotiation Threads & Notifications */}
                <Route
                  path="/negotiations/:id"
                  element={
                    <ProtectedRoute>
                      <NegotiationThreadPage type="offer" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/enquiries/:id"
                  element={
                    <ProtectedRoute>
                      <NegotiationThreadPage type="enquiry" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <NotificationsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Sprint 2: Vehicle & Listing Management */}
                <Route
                  path="/listing/new"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="seller">
                        <ListingWizardPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/vehicles"
                  element={
                    <ProtectedRoute>
                      <MyVehiclesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/listings"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="seller">
                        <MyListingsPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />

                {/* Sprint 6: Rental Requests Queue & Renter Bookings */}
                <Route
                  path="/dashboard/rental-requests"
                  element={
                    <ProtectedRoute>
                      <RentalRequestsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/bookings"
                  element={
                    <ProtectedRoute>
                      <MyBookingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Sprint 5: Dealer Dashboard Features */}
                <Route
                  path="/dashboard/inventory"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="dealer">
                        <DealerInventoryPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/inventory/upload"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="dealer">
                        <BulkUploadPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/discover"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="dealer">
                        <DiscoverOwnerListingsPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/dealer-offers"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="dealer">
                        <DealerOffersSentPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />

                {/* Sprint 8: Admin Platform Routes (Guarded for admins) */}
                <Route
                  path="/dashboard/admin"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="admin">
                        <AdminDashboardPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/listings"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="admin">
                        <AdminListingsPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/users"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="admin">
                        <AdminUsersPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/dealers"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="admin">
                        <AdminDealersPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/reports"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="admin">
                        <AdminReportsPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/offers"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="admin">
                        <AdminOffersPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/bookings"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="admin">
                        <AdminBookingsPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/settings"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="admin">
                        <AdminSettingsPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/audit-log"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="admin">
                        <AdminAuditLogPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />

                {/* Capability Protected Route Test */}
                <Route
                  path="/dashboard/seller-only"
                  element={
                    <ProtectedRoute>
                      <CapabilityRoute capability="seller">
                        <DashboardPage />
                      </CapabilityRoute>
                    </ProtectedRoute>
                  }
                />

                {/* 404 Not Found (UI 8.8) */}
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
            <CompareTray />
              <ToastContainer />
            </BrowserRouter>
          </CompareProvider>
        </FavouritesProvider>
      </AuthProvider>
    </ToastProvider>
  </ThemeProvider>
</QueryClientProvider>
</ErrorBoundary>
  );
}

export default App;
