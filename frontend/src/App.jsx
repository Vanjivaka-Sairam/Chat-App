import React from 'react'
import { Routes, Route, Navigate } from "react-router"
import HomePage from './pages/HomePage'
import CallPage from './pages/CallPage'
import OnboardingPage from './pages/OnboardingPage'
import ChatPage from './pages/ChatPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import { Toaster, toast } from 'react-hot-toast' // <-- Add toast here
import { useQuery } from '@tanstack/react-query'
import axios from "axios"
import {axiosInstance} from "./lib/lib.js"

const App = () => {
  const {isLoading, error, data : authData} = useQuery({ queryKey: ['authUser'], queryFn: async () => {
        const res = await axiosInstance.get("/auth/me");
        return res.data;
      } });

      const authUser = authData?.user;

  return (
    <div>
      <Toaster/>
      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/call" element={authUser ? <CallPage /> : <Navigate to="/login" />} />
        <Route path="/onboarding" element={authUser ? <OnboardingPage /> : <Navigate to="/login" />} />
        <Route path="/chat" element={authUser ? <ChatPage /> : <Navigate to="/login" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
      </Routes>
    </div>
  )
}

export default App