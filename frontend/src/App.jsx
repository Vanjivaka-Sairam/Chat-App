import React from 'react'
import { Routes, Route, Navigate } from "react-router"
import HomePage from './pages/HomePage'
import CallPage from './pages/CallPage'
import OnboardingPage from './pages/OnboardingPage'
import ChatPage from './pages/ChatPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import { Toaster, toast } from 'react-hot-toast' // <-- Add toast here
import  useAuthUser from './hooks/useAuthUser.js'
import PageLoader from './components/PageLoader.jsx'
import Layout from './components/Layout.jsx'

const App = () => {
  const {isLoading, authUser} = useAuthUser();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboard;

  if(isLoading)return <PageLoader />
  
  return (
    <div data-theme = "forest">
      <Toaster/>
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
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : ( isOnboarded?<Navigate to="/" /> : <Navigate to = "/onboarding"/>)} />
        <Route path="/signup" element={!isAuthenticated ? <SignUpPage /> :( isOnboarded?<Navigate to="/" /> : <Navigate to = "/onboarding"/>)} />
      </Routes>
    </div>
  )
}

export default App