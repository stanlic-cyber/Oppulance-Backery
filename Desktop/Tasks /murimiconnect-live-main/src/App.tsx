import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { Loader2 } from 'lucide-react';

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const SellProduce = lazy(() => import("./pages/SellProduce"));
const EditListing = lazy(() => import("./pages/EditListing"));
const MyListings = lazy(() => import("./pages/MyListings"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Help = lazy(() => import("./pages/Help"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Install = lazy(() => import("./pages/Install"));
const Status = lazy(() => import("./pages/Status"));
const HireDriver = lazy(() => import("./pages/HireDriver"));
const CartPage = lazy(() => import("./pages/Cart"));
const CheckoutPage = lazy(() => import("./pages/Checkout"));
const DriverProfileView = lazy(() => import("./pages/DriverProfileView"));
const MyDriverRequests = lazy(() => import("./pages/MyDriverRequests"));
const DriverRequestDetail = lazy(() => import("./pages/DriverRequestDetail"));
const KycSubmit = lazy(() => import("./pages/KycSubmit"));
const VerifyPhone = lazy(() => import("./pages/VerifyPhone"));
const AdminKycReview = lazy(() => import("./pages/admin/KycReview"));


// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminListings = lazy(() => import("./pages/admin/Listings"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminTickets = lazy(() => import("./pages/admin/Tickets"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminWallets = lazy(() => import("./pages/admin/Wallets"));
const AdminPaymentSettings = lazy(() => import("./pages/admin/PaymentSettings"));
const AdminFeeManagement = lazy(() => import("./pages/admin/FeeManagement"));
const AdminTopUps = lazy(() => import("./pages/admin/TopUps"));
const AdminEscrow = lazy(() => import("./pages/admin/Escrow"));
const AdminWithdrawals = lazy(() => import("./pages/admin/Withdrawals"));
const WalletPage = lazy(() => import("./pages/Wallet"));

// Driver pages
const DriverSetup = lazy(() => import("./pages/driver/DriverSetup"));
const DriverDashboard = lazy(() => import("./pages/driver/DriverDashboard"));
const DriverWallet = lazy(() => import("./pages/driver/DriverWallet"));
const DeliveryDetail = lazy(() => import("./pages/driver/DeliveryDetail"));
const DriverEarnings = lazy(() => import("./pages/driver/DriverEarnings"));
const DriverDocuments = lazy(() => import("./pages/driver/DriverDocuments"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <CartProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/listing/:id" element={<ListingDetail />} />
                    <Route path="/help" element={<Help />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/install" element={<Install />} />
                    <Route path="/status" element={<Status />} />
                    


                    {/* Authenticated routes */}
                    <Route path="/sell" element={<ProtectedRoute allowedRoles={['farmer']}><SellProduce /></ProtectedRoute>} />
                    <Route path="/edit-listing/:id" element={<ProtectedRoute allowedRoles={['farmer']}><EditListing /></ProtectedRoute>} />
                    <Route path="/my-listings" element={<ProtectedRoute allowedRoles={['farmer']}><MyListings /></ProtectedRoute>} />
                    <Route path="/seller" element={<ProtectedRoute allowedRoles={['farmer']}><SellerDashboard /></ProtectedRoute>} />
                    <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<ProtectedRoute requirePhoneVerified><CheckoutPage /></ProtectedRoute>} />
                    <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/settings/profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
                    <Route path="/settings/password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
                    <Route path="/hire-driver" element={<ProtectedRoute allowedRoles={['buyer', 'farmer']} requirePhoneVerified><HireDriver /></ProtectedRoute>} />
                    <Route path="/driver-profile/:id" element={<DriverProfileView />} />
                    <Route path="/my-driver-requests" element={<ProtectedRoute><MyDriverRequests /></ProtectedRoute>} />
                    <Route path="/driver-request/:id" element={<ProtectedRoute><DriverRequestDetail /></ProtectedRoute>} />
                    <Route path="/settings/verify" element={<ProtectedRoute><KycSubmit /></ProtectedRoute>} />
                    <Route path="/settings/verify-phone" element={<ProtectedRoute><VerifyPhone /></ProtectedRoute>} />

                    {/* Driver routes */}
                    <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverDashboard /></ProtectedRoute>} />
                    <Route path="/driver/setup" element={<ProtectedRoute allowedRoles={['driver']}><DriverSetup /></ProtectedRoute>} />
                    <Route path="/driver/wallet" element={<ProtectedRoute allowedRoles={['driver']}><DriverWallet /></ProtectedRoute>} />
                    <Route path="/driver/earnings" element={<ProtectedRoute allowedRoles={['driver']}><DriverEarnings /></ProtectedRoute>} />
                    <Route path="/driver/documents" element={<ProtectedRoute allowedRoles={['driver']}><DriverDocuments /></ProtectedRoute>} />
                    <Route path="/driver/delivery/:id" element={<ProtectedRoute allowedRoles={['driver']}><DeliveryDetail /></ProtectedRoute>} />

                    {/* Admin routes */}
                    <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
                    <Route path="/admin/listings" element={<ProtectedRoute allowedRoles={['admin']}><AdminListings /></ProtectedRoute>} />
                    <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>} />
                    <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
                    <Route path="/admin/tickets" element={<ProtectedRoute allowedRoles={['admin']}><AdminTickets /></ProtectedRoute>} />
                    <Route path="/admin/wallets" element={<ProtectedRoute allowedRoles={['admin']}><AdminWallets /></ProtectedRoute>} />
                    <Route path="/admin/topups" element={<ProtectedRoute allowedRoles={['admin']}><AdminTopUps /></ProtectedRoute>} />
                    <Route path="/admin/withdrawals" element={<ProtectedRoute allowedRoles={['admin']}><AdminWithdrawals /></ProtectedRoute>} />
                    <Route path="/admin/escrow" element={<ProtectedRoute allowedRoles={['admin']}><AdminEscrow /></ProtectedRoute>} />
                    <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={['admin']}><AdminFeeManagement /></ProtectedRoute>} />
                    <Route path="/admin/settings/payments" element={<ProtectedRoute allowedRoles={['admin']}><AdminPaymentSettings /></ProtectedRoute>} />
                    <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={['admin']}><AdminAuditLogs /></ProtectedRoute>} />
                    <Route path="/admin/kyc" element={<ProtectedRoute allowedRoles={['admin']}><AdminKycReview /></ProtectedRoute>} />

                    <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
                <SpeedInsights />
                <Analytics />
              </CartProvider>
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
