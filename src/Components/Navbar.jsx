import React, { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Users,
  ChefHat,
  CreditCard,
  PlusCircle,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  HelpCircle,
  BarChart4,
  Package
} from 'lucide-react'
import { auth } from '../Firebase/config'
import { signOut, onAuthStateChanged } from 'firebase/auth'

export default function Navbar({ setActiveTab }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [hasNotifications, setHasNotifications] = useState(true)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')

  const currentPath = location.pathname.replace(/^\//, '') || 'dashboard'

  // Define handleLogout with useCallback to prevent recreation
  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth)
      navigate('/login')
      setIsProfileDropdownOpen(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [navigate])

  const handleNavigation = useCallback((item) => {
    if (!user) {
      navigate('/login')
      return
    }

    if (item.path) navigate(item.path)
    if (item.id) setActiveTab?.(item.id)
    setIsMobileMenuOpen(false)
    document.body.style.overflow = 'unset'
  }, [user, navigate, setActiveTab])

  const toggleMobileMenu = useCallback(() => {
    const newState = !isMobileMenuOpen
    setIsMobileMenuOpen(newState)
    document.body.style.overflow = newState ? 'hidden' : 'unset'
  }, [isMobileMenuOpen])

  const handleProfileClick = useCallback(() => {
    if (!user) {
      navigate('/login')
      return
    }
    setIsProfileDropdownOpen(!isProfileDropdownOpen)
  }, [user, navigate, isProfileDropdownOpen])

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        // Determine user role based on email
        const email = currentUser.email || ''
        const isAdmin = email === 'admin@restaurant.com' || email.includes('admin')
        setUserRole(isAdmin ? 'admin' : 'staff')
      } else {
        setUserRole('')
      }
      setLoading(false)
    })

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false)
        document.body.style.overflow = 'unset'
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      unsubscribe()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Role-based menu items - defined AFTER all functions are declared
  const getMenuItems = useCallback(() => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/', roles: ['admin'] },
      { id: 'captain', label: 'Captain', icon: Users, path: '/captain', roles: ['admin', 'staff'] },
      { id: 'kitchen', label: 'Kitchen', icon: ChefHat, path: '/kitchen', roles: ['admin', 'staff'] },
      { id: 'billing', label: 'Billing', icon: CreditCard, path: '/billing', roles: ['admin'] },
      { id: 'reports', label: 'Reports', icon: BarChart4, path: '/reports', roles: ['admin'] },
      { id: 'addmenu', label: 'Add Menu', icon: PlusCircle, path: '/addmenu', roles: ['admin'], featured: true },
      { id: 'parcel', label: 'Parcel', icon: Package, path: '/parcel', roles: ['admin', 'staff'], featured: true },
    ]

    return baseItems.filter(item => !userRole || item.roles.includes(userRole))
  }, [userRole])

  // Secondary items - defined AFTER handleLogout
  const getSecondaryItems = useCallback(() => {
    if (!user) return []

    return [
      { id: 'logout', label: 'Logout', icon: LogOut, action: handleLogout }
    ]
  }, [user, handleLogout])

  // Call the functions to get the items
  const menuItems = getMenuItems()
  const secondaryItems = getSecondaryItems()

  // If still loading, show minimal navbar
  if (loading) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-100 h-16">
        <div className="px-4 lg:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="block">
              <img src="/logo.svg" alt="Hevan Cafe" className="w-20 h-20" />
            </div>
          </div>
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
        <div className="pt-16"></div>
      </nav>
    )
  }

  // If no user is logged in, show simplified navbar
  if (!user) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="block">
                <img src="/logo.svg" alt="Hevan Cafe" className="w-20 h-20" />
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Login
            </button>
          </div>
        </div>
        <div className="pt-16"></div>
      </nav>
    )
  }

  return (
    <>
      {/* Main Navbar - Clean & Professional */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Left Section - Logo & Mobile Menu */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden w-10 h-10 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center text-gray-600"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="block">
                  <img src="/logo.svg" alt="Hevan Cafe" className="w-20 h-20" />
                </div>
              </div>
            </div>

            {/* Center Section - Navigation (Desktop) */}
            <div className="hidden lg:flex items-center gap-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPath === item.id || (item.id === 'dashboard' && currentPath === '')

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 relative
                      ${isActive
                        ? 'text-gray-900 font-medium bg-gray-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    <Icon size={18} className={isActive ? 'text-green-600' : 'text-gray-500'} />
                    <span className="text-sm font-medium">{item.label}</span>

                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-0.5 bg-green-600 rounded-full"></div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-3">
              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <User size={16} className="text-gray-600" />
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                      {user.email ? user.email.split('@')[0] : 'User'}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">{userRole}</div>
                  </div>
                  <ChevronDown size={16} className="text-gray-500 hidden lg:block" />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {user.email ? user.email.split('@')[0] : 'User'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        <div className="text-xs text-gray-400 capitalize mt-1">Role: {userRole}</div>
                      </div>
                      {secondaryItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.id}
                            onClick={item.action}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Icon size={16} className="text-gray-500" />
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-40 top-16"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div className={`lg:hidden fixed top-16 left-0 bottom-0 w-64 bg-white shadow-xl border-r border-gray-100 z-50 transform transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="h-full overflow-y-auto">

          {/* User Info */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <User size={18} className="text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.email ? user.email.split('@')[0] : 'User'}
                </div>
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
                <div className="text-xs text-gray-400 capitalize mt-1">Role: {userRole}</div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="p-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPath === item.id || (item.id === 'dashboard' && currentPath === '')

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors mb-1 ${isActive
                      ? 'bg-gray-50 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-green-50' : 'bg-gray-100'
                    }`}>
                    <Icon size={16} className={isActive ? 'text-green-600' : 'text-gray-500'} />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>

          {/* Secondary Actions */}
          <div className="border-t border-gray-100 mt-2 pt-2">
            <div className="p-2">
              {secondaryItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors mb-1"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon size={16} className="text-gray-500" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add padding to content to account for fixed navbar */}
      <div className="pt-16">
        {/* Your page content will go here */}
      </div>
    </>
  )
}