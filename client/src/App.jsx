import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from './components/ui/Toast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { CapabilityRoute } from './components/auth/CapabilityRoute';

// Pages
import { DesignSystemPage } from './pages/DesignSystemPage';
import { HomePage } from './pages/HomePage';
import { BrowsePage } from './pages/BrowsePage';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ListingWizardPage } from './pages/listing/ListingWizardPage';
import { MyVehiclesPage } from './pages/dashboard/MyVehiclesPage';
import { MyListingsPage } from './pages/dashboard/MyListingsPage';
import { NegotiationThreadPage } from './pages/negotiation/NegotiationThreadPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';

// Sprint 5: Dealers
import { DealerDirectoryPage } from './pages/dealer/DealerDirectoryPage';
import { DealerProfilePage } from './pages/dealer/DealerProfilePage';
import { DealerRegistrationPage } from './pages/dealer/DealerRegistrationPage';
import { DealerVerificationStatusPage } from './pages/dealer/DealerVerificationStatusPage';
import { DealerInventoryPage } from './pages/dashboard/dealer/DealerInventoryPage';
import { BulkUploadPage } from './pages/dashboard/dealer/BulkUploadPage';
import { DiscoverOwnerListingsPage } from './pages/dashboard/dealer/DiscoverOwnerListingsPage';
import { DealerOffersSentPage } from './pages/dashboard/dealer/DealerOffersSentPage';
import { AdminDealersPage } from './pages/admin/AdminDealersPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminListingsPage } from './pages/admin/AdminListingsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminOffersPage } from './pages/admin/AdminOffersPage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminAuditLogPage } from './pages/admin/AdminAuditLogPage';

// Sprint 6: Rentals & Bookings
import { BookingPage } from './pages/booking/BookingPage';
import { RentalRequestsPage } from './pages/dashboard/RentalRequestsPage';
import { MyBookingsPage } from './pages/dashboard/MyBookingsPage';

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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Discovery Routes (Sprint 3) */}
                <Route path="/" element={<HomePage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/listings/:id" element={<VehicleDetailPage />} />

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

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/design-system" replace />} />
              </Routes>
              <ToastContainer />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
