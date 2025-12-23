// src/Components/ProtectedRoute.jsx
import React from 'react'
import { Navigate } from 'react-router-dom'

const ProtectedRoute = ({ children, user, allowedRoles }) => {
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Determine user role (simplified logic)
  const userRole = user?.email === 'admin@restaurant.com' ? 'admin' : 'staff'
  
  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute