import React from 'react'
import { Routes, Route, Navigate } from "react-router"
import HomePage from './pages/HomePage'
import CallPage from './pages/CallPage'
import OnboardingPage from './pages/OnboardingPage'
import ChatPage from './pages/ChatPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import FriendsPage from './pages/FriendsPage'
import NotificationsPage from './pages/NotificationsPage'
import { Toaster, toast } from 'react-hot-toast' // <-- Add toast here
import  useAuthUser from './hooks/useAuthUser.js'
import PageLoader from './components/PageLoader.jsx'
import Layout from './components/Layout.jsx'
import { useThemeStore } from './store/useThemeStore.js'
import { WebRTCProvider } from './context/WebRTCContext.jsx'
import IncomingCallNotification from './components/IncomingCallNotification.jsx'


const App = () => {
  const {isLoading, authUser} = useAuthUser();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboard;

  const {theme} = useThemeStore();

  if(isLoading)return <PageLoader />
  
  return (
    <div data-theme = {theme}>
      <Toaster/>
      {authUser && (
        <WebRTCProvider userId={authUser._id} userInfo={authUser}>
          <IncomingCallNotification />
          <Routes>
        <Route
          path="/"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <HomePage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />

        <Route path="/call" element={isAuthenticated ? <CallPage /> : <Navigate to="/login" />} />
         <Route
          path="/onboarding"
          element={
            isAuthenticated ? (
              !isOnboarded ? (
                <OnboardingPage />
              ) : (
                <Navigate to="/" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/chat" element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />} />
        <Route path="/friends" element={isAuthenticated ? <Layout showSidebar={true}><FriendsPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/notifications" element={isAuthenticated ? <Layout showSidebar={true}><NotificationsPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : ( isOnboarded?<Navigate to="/" /> : <Navigate to = "/onboarding"/>)} />
        <Route path="/signup" element={!isAuthenticated ? <SignUpPage /> :( isOnboarded?<Navigate to="/" /> : <Navigate to = "/onboarding"/>)} />
          </Routes>
        </WebRTCProvider>
      )}
      {!authUser && (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </div>
  )
}

export default App