// src/App.jsx
import React, { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { database, auth } from './Firebase/config'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import Dashboard from './Components/Dashboard'
import Billing from './Components/Billing'
import Kitchen from './Components/Kitchen'
import Captain from './Components/Captain'
import Addmenu from './Components/Addmenu'
import Navbar from './Components/Navbar'
import Login from './Components/Login'
import ProtectedRoute from './Components/ProtectedRoute'
import './App.css'
import Reports from './Components/Reports'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen for authentication state
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    // Listen for tables data
    const tablesRef = ref(database, 'tables')
    onValue(tablesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const tablesArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }))
        setTables(tablesArray)
      }
    })

    // Listen for orders data
    const ordersRef = ref(database, 'orders')
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const ordersArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }))
        setOrders(ordersArray)
      }
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  const userRole = user?.email === 'admin@restaurant.com' ? 'admin' : 'staff'

  return (
    <Router>
      <div className="flex h-screen">
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          user={user}
          userRole={userRole}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto p-4 bg-gray-50">
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            
            {/* Admin Routes */}
            <Route path="/" element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <Dashboard tables={tables} onTableSelect={setSelectedTable} />
              </ProtectedRoute>
            } />
            
            <Route path="/billing" element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <Billing tables={tables} orders={orders} selectedTable={selectedTable} />
              </ProtectedRoute>
            } />

             <Route path="/reports" element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="/addmenu" element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <Addmenu />
              </ProtectedRoute>
            } />
            
            {/* Staff Routes (accessible by both admin and staff) */}
            <Route path="/kitchen" element={
              <ProtectedRoute user={user} allowedRoles={['admin', 'staff']}>
                <Kitchen orders={orders} />
              </ProtectedRoute>
            } />
            
            <Route path="/captain" element={
              <ProtectedRoute user={user} allowedRoles={['admin', 'staff']}>
                <Captain onTableSelect={setSelectedTable} />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App