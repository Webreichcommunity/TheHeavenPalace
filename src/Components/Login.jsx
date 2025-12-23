// src/Components/Login.jsx
import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../Firebase/config'
import { FaUtensils, FaLock, FaEnvelope, FaChevronRight } from 'react-icons/fa'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDemoVisible, setIsDemoVisible] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (type) => {
    if (type === 'admin') {
      setEmail('admin@restaurant.com')
      setPassword('admin123')
    } else {
      setEmail('staff@restaurant.com')
      setPassword('staff123')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 relative overflow-hidden">

      {/* Glassmorphism Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-900/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-900/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-red-900/3 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-green-900/3 rounded-full blur-2xl"></div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-sm sm:max-w-md bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden z-10">

        {/* Header */}
        <div className="p-2 sm:p-10 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-auto h-25 flex flex-col items-center justify-center">
              <img src="/logo.svg" alt="" />
              <p className="text-gray-600 text-sm font-semibold">Restaurant Management System</p>
            </div>
            
          </div>
        </div>

        {/* Login Form */}
        <div className="px-6 sm:px-8 pb-8 sm:pb-10">
          <form onSubmit={handleLogin} className="space-y-6">

            {/* Email Field */}
            <div className="space-y-2">
              <div className="relative">
                <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all text-gray-900 placeholder-gray-400 text-sm"
                  placeholder="Email address"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all text-gray-900 placeholder-gray-400 text-sm"
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            {/* Quick Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => quickLogin('admin')}
                className="p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all duration-200 group"
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-red-800 text-sm font-medium">Admin</span>
                  <span className="text-red-600 text-xs">Full Access</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('staff')}
                className="p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-all duration-200 group"
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-green-800 text-sm font-medium">Staff</span>
                  <span className="text-green-600 text-xs">Limited Access</span>
                </div>
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-medium text-white transition-all duration-300 ${loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-800 shadow-lg hover:shadow-xl'
                }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Sign in
                  <FaChevronRight className="ml-2 text-sm" />
                </span>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          {/* <div className="mt-8 pt-6 border-t border-gray-200/50">
            <button
              onClick={() => setIsDemoVisible(!isDemoVisible)}
              className="w-full text-center text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              {isDemoVisible ? 'Hide demo credentials' : 'Show demo credentials'}
            </button>

            {isDemoVisible && (
              <div className="mt-4 space-y-3 animate-fadeIn">
                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-800 text-sm font-medium">Admin Access</span>
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Full</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center text-gray-700">
                      <span className="w-16 text-gray-500">Email:</span>
                      <span className="font-mono">admin@restaurant.com</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="w-16 text-gray-500">Pass:</span>
                      <span className="font-mono">admin123</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-800 text-sm font-medium">Staff Access</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Limited</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center text-gray-700">
                      <span className="w-16 text-gray-500">Email:</span>
                      <span className="font-mono">staff@restaurant.com</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="w-16 text-gray-500">Pass:</span>
                      <span className="font-mono">staff123</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div> */}
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 bg-gray-50/50 border-t border-gray-200/50">
          <p className="text-center text-gray-500 text-xs">
            Secure login · Professional dashboard · Real-time updates
          </p>
           <p className="text-center text-orange-500 font-semibold text-xs">
            WebReich Solutions
          </p>
        </div>
      </div>

      {/* Add custom animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default Login