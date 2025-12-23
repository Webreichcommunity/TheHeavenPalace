// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, onValue, off, query, orderByChild, update } from 'firebase/database'
import { database } from '../Firebase/config'
import { 
  Users, 
  ChefHat, 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Package,
  Bell,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Receipt,
  Utensils,
  Activity,
  Calendar,
  RefreshCw,
  Settings,
  PlusCircle,
  Eye,
  Table,
  TrendingDown,
  Coffee,
  PieChart,
  Download,
  Check,
  X,
  Thermometer,
  IndianRupee
} from 'lucide-react'

const Dashboard = () => {
  const navigate = useNavigate()
  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState({})
  const [bills, setBills] = useState({})
  const [notifications, setNotifications] = useState({})
  const [dailyRevenue, setDailyRevenue] = useState({})
  const [activeTab, setActiveTab] = useState('overview')
  const [timeFilter, setTimeFilter] = useState('today')
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [loading, setLoading] = useState(true)

  // Floor configuration
  const floorConfig = [
    { 
      id: '1', 
      label: 'Ground Floor', 
      tables: ['table-1-1', 'table-1-2', 'table-1-3', 'table-1-4', 'table-1-5', 'table-1-6A', 'table-1-6B']
    },
    { 
      id: '2', 
      label: 'First Floor', 
      tables: []
    },
    { 
      id: '3', 
      label: 'Top Floor', 
      tables: ['table-T1', 'table-T2', 'table-T3', 'table-T4', 'table-T5', 'table-T6', 'table-T7', 'table-T8', 'table-T9']
    }
  ]

  // Fetch all data from Firebase
  useEffect(() => {
    setLoading(true)
    
    const tablesRef = ref(database, 'tables')
    const ordersRef = query(ref(database, 'orders'), orderByChild('status'))
    const billsRef = query(ref(database, 'bills'), orderByChild('completedAt'))
    const notificationsRef = query(ref(database, 'notifications'), orderByChild('createdAt'))
    const dailyRevenueRef = ref(database, 'dailyRevenue')

    const unsubscribeTables = onValue(tablesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const tablesArray = Object.entries(data).map(([id, table]) => ({
          id,
          ...table
        }))
        setTables(tablesArray)
      }
      setLoading(false)
      setLastUpdated(new Date())
    })

    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setOrders(data)
      }
    })

    const unsubscribeBills = onValue(billsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setBills(data)
        
        // Update daily revenue when bills are fetched
        updateDailyRevenue(data)
      }
    })

    const unsubscribeNotifications = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setNotifications(data)
        
        // Auto-clean old notifications
        cleanupOldNotifications(data)
      }
    })

    const unsubscribeDailyRevenue = onValue(dailyRevenueRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setDailyRevenue(data)
      }
    })

    return () => {
      off(tablesRef)
      off(ordersRef)
      off(billsRef)
      off(notificationsRef)
      off(dailyRevenueRef)
    }
  }, [])

  // Update daily revenue from bills
  const updateDailyRevenue = (billsData) => {
    try {
      const today = new Date()
      const todayKey = today.toISOString().split('T')[0] // Format: YYYY-MM-DD
      
      // Check if it's after 2 AM, reset if needed
      const currentHour = today.getHours()
      const currentDate = today.getDate()
      
      // Get yesterday's date key
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayKey = yesterday.toISOString().split('T')[0]
      
      // If it's after 2 AM and we haven't reset yet for today
      if (currentHour >= 2 && currentHour < 3) {
        // Check if we need to reset today's revenue
        if (!dailyRevenue[todayKey]) {
          resetDailyRevenue(todayKey)
        }
      }
      
      // Calculate today's revenue from bills
      let todayRevenue = 0
      let todayBillsCount = 0
      
      Object.values(billsData || {}).forEach(bill => {
        if (bill.completedAt) {
          const billDate = new Date(bill.completedAt)
          const billDateKey = billDate.toISOString().split('T')[0]
          
          if (billDateKey === todayKey) {
            const total = bill.finalTotal || bill.total || 0
            todayRevenue += total
            todayBillsCount++
          }
        }
      })
      
      // Update Firebase with today's revenue
      const revenueRef = ref(database, `dailyRevenue/${todayKey}`)
      update(revenueRef, {
        revenue: todayRevenue,
        billsCount: todayBillsCount,
        date: todayKey,
        lastUpdated: new Date().toISOString()
      }).catch(error => {
        console.error('Error updating daily revenue:', error)
      })
      
    } catch (error) {
      console.error('Error in updateDailyRevenue:', error)
    }
  }

  // Reset daily revenue at 2 AM
  const resetDailyRevenue = (dateKey) => {
    try {
      const revenueRef = ref(database, `dailyRevenue/${dateKey}`)
      update(revenueRef, {
        revenue: 0,
        billsCount: 0,
        date: dateKey,
        lastUpdated: new Date().toISOString(),
        resetAt: new Date().toISOString()
      }).catch(error => {
        console.error('Error resetting daily revenue:', error)
      })
    } catch (error) {
      console.error('Error in resetDailyRevenue:', error)
    }
  }

  // Cleanup old notifications (older than 1 hour)
  const cleanupOldNotifications = (notificationsData) => {
    try {
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)
      
      const notificationsToDelete = []
      
      Object.entries(notificationsData || {}).forEach(([id, notification]) => {
        if (notification.createdAt) {
          const notificationTime = new Date(notification.createdAt)
          if (notificationTime < oneHourAgo) {
            notificationsToDelete.push(id)
          }
        }
      })
      
      // Delete old notifications from Firebase
      if (notificationsToDelete.length > 0) {
        notificationsToDelete.forEach(notificationId => {
          const notificationRef = ref(database, `notifications/${notificationId}`)
          update(notificationRef, null).catch(error => {
            console.error('Error deleting old notification:', error)
          })
        })
      }
    } catch (error) {
      console.error('Error in cleanupOldNotifications:', error)
    }
  }

  // Calculate statistics with proper data handling
  const getStats = () => {
    try {
      // Convert orders object to array
      const ordersArray = Object.values(orders || {})
      
      // Filter active orders (status === 'active')
      const activeOrders = ordersArray.filter(order => order.status === 'active')
      
      // Get all items from active orders with proper status calculation
      const allItems = activeOrders.flatMap(order => 
        order.items?.map(item => ({
          ...item,
          orderId: order.id,
          tableNumber: order.tableNumber || order.displayName || 'N/A',
          // Determine final status: ready takes priority over preparing, which takes priority over pending
          finalStatus: item.status === 'ready' || item.kitchenStatus === 'ready' ? 'ready' :
                      item.status === 'preparing' || item.kitchenStatus === 'preparing' ? 'preparing' : 'pending'
        })) || []
      )
      
      // Count items by final status (ready > preparing > pending)
      const readyItems = allItems.filter(item => item.finalStatus === 'ready')
      const preparingItems = allItems.filter(item => item.finalStatus === 'preparing')
      const pendingItems = allItems.filter(item => item.finalStatus === 'pending')
      
      // Calculate total tables from floor configuration (not from database)
      const totalTables = floorConfig.reduce((sum, floor) => sum + floor.tables.length, 0)
      
      // Count occupied tables (from database)
      const occupiedTables = tables.filter(table => table.status === 'occupied').length
      const availableTables = totalTables - occupiedTables
      
      // Get today's date for filtering
      const today = new Date()
      const todayKey = today.toISOString().split('T')[0]
      
      // Get today's revenue from dailyRevenue collection
      const todayRevenueData = dailyRevenue[todayKey] || { revenue: 0, billsCount: 0 }
      const todayRevenue = todayRevenueData.revenue || 0
      const todayBills = todayRevenueData.billsCount || 0
      
      // Calculate weekly revenue from dailyRevenue collection
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      let weeklyRevenue = 0
      let weeklyBills = 0
      
      Object.entries(dailyRevenue || {}).forEach(([dateKey, data]) => {
        const revenueDate = new Date(dateKey)
        if (revenueDate >= weekAgo) {
          weeklyRevenue += (data.revenue || 0)
          weeklyBills += (data.billsCount || 0)
        }
      })
      
      // Calculate monthly revenue from dailyRevenue collection
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      
      let monthlyRevenue = 0
      let monthlyBills = 0
      
      Object.entries(dailyRevenue || {}).forEach(([dateKey, data]) => {
        const revenueDate = new Date(dateKey)
        if (revenueDate >= monthAgo) {
          monthlyRevenue += (data.revenue || 0)
          monthlyBills += (data.billsCount || 0)
        }
      })
      
      // Calculate average order value
      const avgOrderValue = todayBills > 0 
        ? todayRevenue / todayBills 
        : 0
      
      return {
        totalTables,
        occupiedTables,
        availableTables,
        activeOrders: activeOrders.length,
        pendingItems: pendingItems.length,
        preparingItems: preparingItems.length,
        readyItems: readyItems.length,
        todayRevenue,
        todayBills,
        weeklyRevenue,
        weeklyBills,
        monthlyRevenue,
        monthlyBills,
        avgOrderValue: Math.round(avgOrderValue),
        totalBills: Object.keys(bills || {}).length,
        allItemsCount: allItems.length,
        notificationsCount: Object.keys(notifications || {}).length
      }
    } catch (error) {
      console.error('Error calculating stats:', error)
      return {
        totalTables: 0,
        occupiedTables: 0,
        availableTables: 0,
        activeOrders: 0,
        pendingItems: 0,
        preparingItems: 0,
        readyItems: 0,
        todayRevenue: 0,
        todayBills: 0,
        weeklyRevenue: 0,
        weeklyBills: 0,
        monthlyRevenue: 0,
        monthlyBills: 0,
        avgOrderValue: 0,
        totalBills: 0,
        allItemsCount: 0,
        notificationsCount: 0
      }
    }
  }

  const stats = getStats()

  // Get real-time activity with proper formatting
  const getRecentActivity = () => {
    const allActivities = []
    
    // Add active orders
    Object.entries(orders || {}).forEach(([orderId, order]) => {
      if (order.status === 'active') {
        allActivities.push({
          id: orderId,
          type: 'order',
          table: order.tableNumber || order.displayName || 'Unknown',
          time: order.createdAt,
          status: 'active',
          description: `Order #${order.orderNumber || 'N/A'} from ${order.tableNumber || 'Table'}`,
          items: order.items?.length || 0,
          amount: order.total || 0
        })
      }
    })
    
    // Add recently completed orders
    Object.entries(orders || {}).forEach(([orderId, order]) => {
      if (order.status === 'closed' && order.closedAt) {
        const closedDate = new Date(order.closedAt)
        const now = new Date()
        const hoursAgo = (now - closedDate) / (1000 * 60 * 60)
        
        if (hoursAgo < 24) { // Last 24 hours
          allActivities.push({
            id: orderId,
            type: 'order_completed',
            table: order.tableNumber || order.displayName || 'Unknown',
            time: order.closedAt,
            status: 'completed',
            description: `Order #${order.orderNumber || 'N/A'} completed`,
            items: order.items?.length || 0,
            amount: order.total || 0
          })
        }
      }
    })
    
    // Add recent bills (last 5)
    Object.entries(bills || {})
      .sort(([, a], [, b]) => 
        new Date(b.completedAt || 0) - new Date(a.completedAt || 0)
      )
      .slice(0, 5)
      .forEach(([billId, bill]) => {
        allActivities.push({
          id: billId,
          type: 'bill',
          table: bill.tableNumber || bill.displayName || 'Unknown',
          time: bill.completedAt || bill.createdAt,
          status: 'paid',
          description: `Bill #${bill.billNumber || 'N/A'} paid`,
          amount: bill.finalTotal || bill.total || 0,
          billNumber: bill.billNumber
        })
      })
    
    // Add recent notifications
    Object.entries(notifications || {})
      .sort(([, a], [, b]) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      )
      .slice(0, 3)
      .forEach(([notificationId, notification]) => {
        allActivities.push({
          id: notificationId,
          type: 'notification',
          table: notification.table || 'System',
          time: notification.createdAt,
          status: notification.type || 'info',
          description: notification.message || 'New notification',
          amount: 0
        })
      })
    
    // Sort by time (newest first)
    return allActivities
      .filter(activity => activity.time)
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 8)
  }

  const recentActivity = getRecentActivity()

  // Get urgent orders (pending for > 15 minutes)
  const getUrgentOrders = () => {
    const urgentOrders = Object.entries(orders || {})
      .filter(([_, order]) => order.status === 'active')
      .map(([orderId, order]) => {
        const orderTime = new Date(order.createdAt || 0)
        const now = new Date()
        const diffInMinutes = (now - orderTime) / (1000 * 60)
        
        return {
          id: orderId,
          ...order,
          waitingTime: Math.floor(diffInMinutes)
        }
      })
      .filter(order => order.waitingTime > 15) // More than 15 minutes
      .sort((a, b) => b.waitingTime - a.waitingTime)
      .slice(0, 3)
    
    return urgentOrders
  }

  const urgentOrders = getUrgentOrders()

  // Get top performers (tables with most revenue today)
  const getTopPerformers = () => {
    const tableRevenue = {}
    
    // Get today's bills grouped by table
    const today = new Date()
    const todayKey = today.toISOString().split('T')[0]
    
    Object.values(bills || {}).forEach(bill => {
      if (!bill.completedAt) return
      
      const billDate = new Date(bill.completedAt)
      const billDateKey = billDate.toISOString().split('T')[0]
      
      if (billDateKey === todayKey) {
        const table = bill.tableNumber || 'Unknown'
        const revenue = bill.finalTotal || bill.total || 0
        
        if (!tableRevenue[table]) {
          tableRevenue[table] = { table, revenue: 0, bills: 0 }
        }
        tableRevenue[table].revenue += revenue
        tableRevenue[table].bills += 1
      }
    })
    
    return Object.values(tableRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
  }

  const topPerformers = getTopPerformers()

  // Refresh data manually
  const refreshData = () => {
    setLastUpdated(new Date())
    setLoading(true)
    // Simulate data refresh
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  // Get revenue for selected time period
  const getFilteredRevenue = () => {
    const today = new Date()
    const todayKey = today.toISOString().split('T')[0]
    
    switch (timeFilter) {
      case 'today':
        const todayData = dailyRevenue[todayKey] || { revenue: 0, billsCount: 0 }
        return todayData.revenue || 0
        
      case 'week':
        let weeklyRevenue = 0
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        
        Object.entries(dailyRevenue || {}).forEach(([dateKey, data]) => {
          const revenueDate = new Date(dateKey)
          if (revenueDate >= weekAgo) {
            weeklyRevenue += (data.revenue || 0)
          }
        })
        return weeklyRevenue
        
      case 'month':
        let monthlyRevenue = 0
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        
        Object.entries(dailyRevenue || {}).forEach(([dateKey, data]) => {
          const revenueDate = new Date(dateKey)
          if (revenueDate >= monthAgo) {
            monthlyRevenue += (data.revenue || 0)
          }
        })
        return monthlyRevenue
        
      default:
        const todayDefault = dailyRevenue[todayKey] || { revenue: 0, billsCount: 0 }
        return todayDefault.revenue || 0
    }
  }

  // Get bills count for selected time period
  const getFilteredBills = () => {
    const today = new Date()
    const todayKey = today.toISOString().split('T')[0]
    
    switch (timeFilter) {
      case 'today':
        const todayData = dailyRevenue[todayKey] || { revenue: 0, billsCount: 0 }
        return todayData.billsCount || 0
        
      case 'week':
        let weeklyBills = 0
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        
        Object.entries(dailyRevenue || {}).forEach(([dateKey, data]) => {
          const revenueDate = new Date(dateKey)
          if (revenueDate >= weekAgo) {
            weeklyBills += (data.billsCount || 0)
          }
        })
        return weeklyBills
        
      case 'month':
        let monthlyBills = 0
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        
        Object.entries(dailyRevenue || {}).forEach(([dateKey, data]) => {
          const revenueDate = new Date(dateKey)
          if (revenueDate >= monthAgo) {
            monthlyBills += (data.billsCount || 0)
          }
        })
        return monthlyBills
        
      default:
        const todayDefault = dailyRevenue[todayKey] || { revenue: 0, billsCount: 0 }
        return todayDefault.billsCount || 0
    }
  }

  const filteredRevenue = getFilteredRevenue()
  const filteredBills = getFilteredBills()

  // Get kitchen status color and text
  const getKitchenStatus = () => {
    const { pendingItems, preparingItems, readyItems } = stats
    
    if (pendingItems === 0 && preparingItems === 0 && readyItems === 0) {
      return {
        text: 'Empty',
        color: 'gray',
        bgColor: 'bg-gray-50',
        iconColor: 'text-gray-600'
      }
    } else if (readyItems > preparingItems + pendingItems) {
      return {
        text: 'Ready',
        color: 'emerald',
        bgColor: 'bg-emerald-50',
        iconColor: 'text-emerald-600'
      }
    } else if (preparingItems > pendingItems * 2) {
      return {
        text: 'Active',
        color: 'blue',
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600'
      }
    } else if (pendingItems > 5) {
      return {
        text: 'Busy',
        color: 'amber',
        bgColor: 'bg-amber-50',
        iconColor: 'text-amber-600'
      }
    } else if (pendingItems > 10) {
      return {
        text: 'Very Busy',
        color: 'red',
        bgColor: 'bg-red-50',
        iconColor: 'text-red-600'
      }
    } else {
      return {
        text: 'Active',
        color: 'emerald',
        bgColor: 'bg-emerald-50',
        iconColor: 'text-emerald-600'
      }
    }
  }

  const kitchenStatus = getKitchenStatus()

  return (
    <div className="min-h-screen mt-10 bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Restaurant Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time monitoring & management</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl">
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-sm font-medium text-gray-800">
                {loading ? 'Syncing...' : 'Live'}
              </span>
            </div>
            <button
              onClick={refreshData}
              className="p-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white transition-all duration-200 hover:shadow-sm"
              title="Refresh data"
              disabled={loading}
            >
              <RefreshCw size={18} className={`${loading ? 'animate-spin text-yellow-600' : 'text-gray-600'}`} />
            </button>
            <div className="px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl">
              <span className="text-sm text-gray-600">Updated: </span>
              <span className="text-sm font-medium text-gray-800">
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* Revenue Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-4 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Today's Revenue</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold text-gray-900">₹{stats.todayRevenue.toLocaleString()}</p>
                  <span className="text-sm text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                    {stats.todayBills} bills
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl">
                <IndianRupee className="text-emerald-700" size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Avg: ₹{stats.avgOrderValue.toLocaleString()}
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${stats.todayRevenue > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {stats.todayRevenue > 0 ? '💰 Active' : 'No sales'}
              </span>
            </div>
          </div>

          {/* Tables Card - FIXED: Shows proper table count */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-4 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tables</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold text-gray-900">{stats.occupiedTables}</p>
                  <span className="text-sm text-gray-500">/ {stats.totalTables} occupied</span>
                </div>
              </div>
              <div className="p-2.5 bg-gradient-to-br from-red-100 to-red-200 rounded-xl">
                <Table className="text-red-700" size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Occupied</span>
                <span>{stats.occupiedTables}/{stats.totalTables}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-700"
                  style={{ width: `${(stats.occupiedTables / stats.totalTables) * 100 || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Active Orders Card - FIXED: Shows only number */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-4 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeOrders}</p>
              </div>
              <div className="p-2.5 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl">
                <ShoppingCart className="text-amber-700" size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-gray-500">
                {stats.allItemsCount} items in total
              </div>
            </div>
          </div>

          {/* Kitchen Status Card - FIXED: Shows status based on ready items */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-4 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Kitchen Status</p>
                <p className={`text-2xl font-bold mt-1 ${
                  kitchenStatus.color === 'red' ? 'text-red-600' :
                  kitchenStatus.color === 'amber' ? 'text-amber-600' :
                  kitchenStatus.color === 'blue' ? 'text-blue-600' :
                  kitchenStatus.color === 'emerald' ? 'text-emerald-600' : 'text-gray-600'
                }`}>
                  {kitchenStatus.text}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${kitchenStatus.bgColor}`}>
                <ChefHat className={kitchenStatus.iconColor} size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2">
                {stats.readyItems > 0 && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg flex items-center gap-1">
                    <Check size={10} />
                    {stats.readyItems} ready
                  </span>
                )}
                {stats.preparingItems > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg flex items-center gap-1">
                    <Thermometer size={10} />
                    {stats.preparingItems} cooking
                  </span>
                )}
                {stats.pendingItems > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-lg flex items-center gap-1">
                    <Clock size={10} />
                    {stats.pendingItems} pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Quick Actions & Top Performers */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-4 h-full hover:shadow-md transition-shadow">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/captain')}
                  className="w-full p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-all duration-200 hover:border-red-300 hover:shadow-sm flex items-center gap-3 group"
                >
                  <div className="p-2 bg-gradient-to-br from-red-100 to-red-200 group-hover:from-red-200 group-hover:to-red-300 rounded-lg transition-all duration-200">
                    <Users className="text-red-700" size={18} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-800 group-hover:text-red-700">Take Order</p>
                    <p className="text-xs text-gray-500">Captain View</p>
                  </div>
                  <Eye className="text-gray-400 group-hover:text-red-500 transition-colors" size={16} />
                </button>

                <button
                  onClick={() => navigate('/kitchen')}
                  className="w-full p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-all duration-200 hover:border-emerald-300 hover:shadow-sm flex items-center gap-3 group"
                >
                  <div className="p-2 bg-gradient-to-br from-emerald-100 to-emerald-200 group-hover:from-emerald-200 group-hover:to-emerald-300 rounded-lg transition-all duration-200">
                    <ChefHat className="text-emerald-700" size={18} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-800 group-hover:text-emerald-700">Kitchen Orders</p>
                    <p className="text-xs text-gray-500">Manage preparation</p>
                  </div>
                  <Eye className="text-gray-400 group-hover:text-emerald-500 transition-colors" size={16} />
                </button>

                <button
                  onClick={() => navigate('/billing')}
                  className="w-full p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-all duration-200 hover:border-blue-300 hover:shadow-sm flex items-center gap-3 group"
                >
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 group-hover:from-blue-200 group-hover:to-blue-300 rounded-lg transition-all duration-200">
                    <Receipt className="text-blue-700" size={18} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-800 group-hover:text-blue-700">Billing</p>
                    <p className="text-xs text-gray-500">Generate bills</p>
                  </div>
                  <Eye className="text-gray-400 group-hover:text-blue-500 transition-colors" size={16} />
                </button>
              </div>
            </div>

            {/* Top Performers */}
            {topPerformers.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-4 hover:shadow-md transition-shadow">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Top Tables Today</h3>
                <div className="space-y-3">
                  {topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-all duration-200 hover:scale-[1.02]">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-100 to-yellow-200' : 
                          index === 1 ? 'bg-gradient-to-br from-gray-100 to-gray-200' : 
                          'bg-gradient-to-br from-amber-100 to-amber-200'
                        }`}>
                          <span className={`font-bold ${
                            index === 0 ? 'text-yellow-700' : 
                            index === 1 ? 'text-gray-700' : 
                            'text-amber-700'
                          }`}>
                            #{index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">Table {performer.table}</p>
                          <p className="text-xs text-gray-500">{performer.bills} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">₹{performer.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Activity & Alerts */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-4 h-full hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
                <div className="flex items-center gap-2">
                  <Activity className="text-emerald-500" size={16} />
                  <span className="text-xs text-emerald-600 font-medium">Live Updates</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-6 max-h-80 overflow-y-auto pr-2">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-100 transition-all duration-200 animate-fadeIn hover:scale-[1.01]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            activity.type === 'order' ? 'bg-gradient-to-br from-blue-100 to-blue-200' : 
                            activity.type === 'bill' ? 'bg-gradient-to-br from-emerald-100 to-emerald-200' : 
                            activity.type === 'notification' ? 'bg-gradient-to-br from-purple-100 to-purple-200' :
                            'bg-gradient-to-br from-green-100 to-green-200'
                          }`}>
                            {activity.type === 'order' ? 
                              <ShoppingCart className="text-blue-700" size={14} /> : 
                              activity.type === 'bill' ? 
                              <Receipt className="text-emerald-700" size={14} /> :
                              activity.type === 'notification' ?
                              <Bell className="text-purple-700" size={14} /> :
                              <CheckCircle className="text-green-700" size={14} />
                            }
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(activity.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {' • '}
                              {new Date(activity.time).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          activity.type === 'order' 
                            ? 'bg-blue-50 text-blue-700' 
                            : activity.type === 'bill'
                            ? 'bg-emerald-50 text-emerald-700'
                            : activity.type === 'notification'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-green-50 text-green-700'
                        }`}>
                          {activity.type === 'order' ? 
                            `${activity.items} items` : 
                            activity.type === 'bill' ?
                            `₹${activity.amount.toLocaleString()}` :
                            'Notification'
                          }
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="mx-auto text-gray-400 mb-2" size={24} />
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  </div>
                )}
              </div>

              {/* Urgent Alerts */}
              {urgentOrders.length > 0 && (
                <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="text-red-600" size={16} />
                    <h4 className="text-sm font-semibold text-red-800">Needs Attention</h4>
                    <span className="ml-auto text-xs text-red-600 font-medium bg-red-100 px-2 py-1 rounded-full">
                      {urgentOrders.length} urgent
                    </span>
                  </div>
                  <div className="space-y-2">
                    {urgentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-red-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-red-500" />
                          <span className="text-sm font-medium text-gray-800">Order #{order.orderNumber}</span>
                          <span className="text-xs text-gray-500">Table {order.tableNumber}</span>
                          <span className="text-xs text-red-600 font-medium bg-red-100 px-2 py-0.5 rounded-full">
                            {order.waitingTime} min waiting
                          </span>
                        </div>
                        <button
                          onClick={() => navigate('/kitchen')}
                          className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
                        >
                          View →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-4 mb-6 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Performance Analytics</h3>
              <p className="text-sm text-gray-500">Business overview and insights</p>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {['today', 'week', 'month'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 capitalize ${
                    timeFilter === filter
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{timeFilter === 'today' ? 'Today\'s' : timeFilter === 'week' ? 'Weekly' : 'Monthly'} Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₹{filteredRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg">
                  <IndianRupee className="text-emerald-700" size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="h-1 w-full bg-gray-100 rounded-full">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-700"
                    style={{ 
                      width: `${Math.min((filteredRevenue / Math.max(filteredBills * 1000, 1)) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {filteredBills} bills • Avg: ₹{stats.avgOrderValue.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 hover:border-red-300 transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Occupancy Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {Math.round((stats.occupiedTables / stats.totalTables) * 100) || 0}%
                  </p>
                </div>
                <div className="p-2 bg-gradient-to-br from-red-100 to-red-200 rounded-lg">
                  <Users className="text-red-700" size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="h-1 w-full bg-gray-100 rounded-full">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-700"
                    style={{ width: `${(stats.occupiedTables / stats.totalTables) * 100 || 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {stats.occupiedTables} occupied • {stats.availableTables} available
                </p>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Order Efficiency</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.allItemsCount > 0 ? 
                      Math.round((stats.readyItems / stats.allItemsCount) * 100) : 0}%
                  </p>
                </div>
                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                  <CheckCircle className="text-blue-700" size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="h-1 w-full bg-gray-100 rounded-full">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700"
                    style={{ 
                      width: `${stats.allItemsCount > 0 ? 
                        Math.round((stats.readyItems / stats.allItemsCount) * 100) : 0}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {stats.readyItems} ready • {stats.pendingItems + stats.preparingItems} in process
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${loading ? 'animate-pulse bg-yellow-500' : 'bg-emerald-500'}`}></div>
              <span className={`font-medium ${loading ? 'text-yellow-600' : 'text-emerald-600'}`}>
                {loading ? 'Syncing data...' : 'Live connection'}
              </span>
            </div>
            <div className="hidden md:block text-gray-400">•</div>
            <div className="hidden md:block text-gray-500">
              Total Orders: {Object.keys(orders || {}).length} • Total Bills: {stats.totalBills}
              {stats.notificationsCount > 0 && ` • Notifications: ${stats.notificationsCount}`}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/addmenu')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <PlusCircle size={14} />
              <span className="font-medium">Add Menu Item</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default Dashboard