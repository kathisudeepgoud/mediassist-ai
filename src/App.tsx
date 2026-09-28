import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ToastProvider } from '@/context/ToastContext'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from '@/layouts/ProtectedRoute'

import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import SignUpPage from '@/pages/SignUpPage'
import DashboardPage from '@/pages/DashboardPage'
import MedicalReportsPage from '@/pages/MedicalReportsPage'
import HealthTrendsPage from '@/pages/HealthTrendsPage'
import DiseaseRiskPage from '@/pages/DiseaseRiskPage'
import DietPlannerPage from '@/pages/DietPlannerPage'
import HealthAssistantPage from '@/pages/HealthAssistantPage'
import ReportUploadPage from '@/pages/ReportUploadPage'
import DoctorDashboardPage from '@/pages/DoctorDashboardPage'
import ProfilePage from '@/pages/ProfilePage'
import SettingsPage from '@/pages/SettingsPage'
import ErrorPage from '@/pages/ErrorPage'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/signup" element={<SignUpPage />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/doctor-dashboard" element={<DoctorDashboardPage />} />
                  <Route path="/doctor-search" element={<Navigate to="/doctor-dashboard?tab=search" replace />} />
                  <Route path="/doctor-alerts" element={<Navigate to="/doctor-dashboard?tab=alerts" replace />} />
                  <Route path="/upload" element={<ReportUploadPage />} />
                  <Route path="/reports" element={<MedicalReportsPage />} />
                  <Route path="/manual-entry" element={<Navigate to="/upload?tab=manual" replace />} />
                  <Route path="/trends" element={<HealthTrendsPage />} />
                  <Route path="/risk" element={<DiseaseRiskPage />} />
                  <Route path="/diet" element={<DietPlannerPage />} />
                  <Route path="/assistant" element={<HealthAssistantPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                <Route path="*" element={<ErrorPage code="404" message="We couldn't find the page you're looking for." />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
