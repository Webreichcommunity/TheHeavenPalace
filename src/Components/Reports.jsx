// src/components/Reports.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, onValue, off, query, orderByChild } from 'firebase/database'
import { database } from '../Firebase/config'
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  IndianRupee,
  PieChart,
  BarChart3,
  Clock,
  Users,
  ChefHat,
  ShoppingCart,
  Receipt,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock3,
  CalendarDays,
  CalendarRange,
  Award,
  Star,
  Activity,
  CheckCircle,
  XCircle,
  Coffee,
  Utensils,
  Package,
  Tag,
  BarChart4,
  LineChart,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AlertCircle,
  Info,
  Target,
  Trophy,
  Flame,
  Heart,
  Crown,
  Sparkles,
  Table
} from 'lucide-react'

const Reports = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [bills, setBills] = useState([])
  const [notifications, setNotifications] = useState([])
  const [tables, setTables] = useState([])
  
  const [timeRange, setTimeRange] = useState('today')
  const [reportType, setReportType] = useState('overview')
  const [expandedSection, setExpandedSection] = useState(null)

  // Fetch data from Firebase
  useEffect(() => {
    setLoading(true)

    const menuItemsRef = ref(database, 'menuItems')
    const ordersRef = query(ref(database, 'orders'), orderByChild('createdAt'))
    const billsRef = query(ref(database, 'bills'), orderByChild('completedAt'))
    const notificationsRef = ref(database, 'notifications')
    const tablesRef = ref(database, 'tables')

    const unsubscribeMenu = onValue(menuItemsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const itemsArray = Object.entries(data).map(([id, item]) => ({
          id,
          ...item
        }))
        setMenuItems(itemsArray)
      }
    })

    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const ordersArray = Object.entries(data).map(([id, order]) => ({
          id,
          ...order
        }))
        setOrders(ordersArray)
      }
    })

    const unsubscribeBills = onValue(billsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const billsArray = Object.entries(data).map(([id, bill]) => ({
          id,
          ...bill
        }))
        setBills(billsArray)
      }
    })

    const unsubscribeNotifications = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const notificationsArray = Object.entries(data).map(([id, notification]) => ({
          id,
          ...notification
        }))
        setNotifications(notificationsArray)
      }
    })

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
    })

    return () => {
      off(menuItemsRef)
      off(ordersRef)
      off(billsRef)
      off(notificationsRef)
      off(tablesRef)
    }
  }, [])

  // Calculate statistics based on time range
  const calculateStats = () => {
    const now = new Date()
    let startDate = new Date()
    
    switch (timeRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setHours(0, 0, 0, 0)
    }

    // Filter bills by time range
    const filteredBills = bills.filter(bill => {
      if (!bill.completedAt) return false
      const billDate = new Date(bill.completedAt)
      return billDate >= startDate
    })

    // Filter orders by time range
    const filteredOrders = orders.filter(order => {
      if (!order.createdAt) return false
      const orderDate = new Date(order.createdAt)
      return orderDate >= startDate
    })

    // Calculate revenue by payment mode
    const revenueByPaymentMode = {}
    let totalRevenue = 0
    let totalBills = filteredBills.length
    let totalOrders = filteredOrders.length

    filteredBills.forEach(bill => {
      const paymentMode = bill.paymentMode || 'Cash'
      const amount = bill.finalTotal || bill.total || 0
      
      if (!revenueByPaymentMode[paymentMode]) {
        revenueByPaymentMode[paymentMode] = { revenue: 0, count: 0 }
      }
      revenueByPaymentMode[paymentMode].revenue += amount
      revenueByPaymentMode[paymentMode].count++
      
      totalRevenue += amount
    })

    // Calculate most ordered items
    const itemCount = {}
    const itemRevenue = {}
    
    filteredOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (!itemCount[item.name]) {
            itemCount[item.name] = 0
            itemRevenue[item.name] = 0
          }
          itemCount[item.name] += item.quantity || 1
          itemRevenue[item.name] += (item.price || 0) * (item.quantity || 1)
        })
      }
    })

    // Convert to arrays and sort
    const popularItems = Object.entries(itemCount)
      .map(([name, count]) => ({
        name,
        count,
        revenue: itemRevenue[name] || 0
      }))
      .sort((a, b) => b.count - a.count)

    const revenueItems = Object.entries(itemRevenue)
      .map(([name, revenue]) => ({
        name,
        revenue,
        count: itemCount[name] || 0
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // Calculate table performance
    const tablePerformance = {}
    filteredBills.forEach(bill => {
      const table = bill.tableNumber || 'Unknown'
      const amount = bill.finalTotal || bill.total || 0
      
      if (!tablePerformance[table]) {
        tablePerformance[table] = { revenue: 0, bills: 0 }
      }
      tablePerformance[table].revenue += amount
      tablePerformance[table].bills++
    })

    const topTables = Object.entries(tablePerformance)
      .map(([table, data]) => ({
        table,
        ...data
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // Calculate average order value
    const avgOrderValue = totalBills > 0 ? totalRevenue / totalBills : 0

    // Calculate peak hours
    const hourCount = {}
    filteredOrders.forEach(order => {
      if (order.createdAt) {
        const hour = new Date(order.createdAt).getHours()
        if (!hourCount[hour]) hourCount[hour] = 0
        hourCount[hour]++
      }
    })

    const peakHours = Object.entries(hourCount)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
        period: hour < 12 ? 'AM' : 'PM',
        displayHour: hour > 12 ? hour - 12 : hour
      }))
      .sort((a, b) => b.count - a.count)

    return {
      filteredBills,
      filteredOrders,
      revenueByPaymentMode,
      totalRevenue,
      totalBills,
      totalOrders,
      popularItems,
      revenueItems,
      topTables,
      avgOrderValue,
      peakHours
    }
  }

  const stats = calculateStats()

  // Get time range label
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'today': return "Today's"
      case 'week': return 'Weekly'
      case 'month': return 'Monthly'
      case 'year': return 'Yearly'
      default: return "Today's"
    }
  }

  // Export report as JSON
  const exportReport = () => {
    const reportData = {
      timeRange,
      date: new Date().toISOString(),
      summary: {
        totalRevenue: stats.totalRevenue,
        totalBills: stats.totalBills,
        totalOrders: stats.totalOrders,
        avgOrderValue: stats.avgOrderValue
      },
      revenueByPaymentMode: stats.revenueByPaymentMode,
      popularItems: stats.popularItems.slice(0, 10),
      topTables: stats.topTables.slice(0, 5),
      peakHours: stats.peakHours.slice(0, 5)
    }

    const dataStr = JSON.stringify(reportData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `restaurant_report_${timeRange}_${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Get payment mode icon
  const getPaymentIcon = (mode) => {
    switch(mode.toLowerCase()) {
      case 'cash': return <DollarSign size={16} />
      case 'upi': return <Receipt size={16} />
      case 'card': return <CreditCard size={16} />
      default: return <DollarSign size={16} />
    }
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mt-13 bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-700" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Restaurant Reports</h1>
                <p className="text-sm text-gray-600">Detailed analytics and insights</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                {['today', 'week', 'month', 'year'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 capitalize ${
                      timeRange === range
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              <button
                onClick={exportReport}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-300 hover:shadow-lg"
              >
                <Download size={16} />
                <span className="font-medium">Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Revenue Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white rounded-xl">
                <IndianRupee className="text-emerald-700" size={20} />
              </div>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-200 px-2 py-1 rounded-full">
                {getTimeRangeLabel()}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Total Revenue</h3>
            <p className="text-2xl font-bold text-gray-900 mb-2">
              ₹{stats.totalRevenue.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 text-emerald-600">
                <TrendingUp size={14} />
                <span>{stats.totalBills} bills</span>
              </div>
              <div className="text-gray-400">•</div>
              <span className="text-gray-600">
                Avg: ₹{Math.round(stats.avgOrderValue).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Total Orders Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white rounded-xl">
                <ShoppingCart className="text-blue-700" size={20} />
              </div>
              <span className="text-xs font-medium text-blue-700 bg-blue-200 px-2 py-1 rounded-full">
                {stats.filteredOrders.length}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Total Orders</h3>
            <p className="text-2xl font-bold text-gray-900 mb-2">
              {stats.totalOrders}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 text-blue-600">
                <Activity size={14} />
                <span>Active</span>
              </div>
              <div className="text-gray-400">•</div>
              <span className="text-gray-600">
                {stats.popularItems.length} items sold
              </span>
            </div>
          </div>

          {/* Payment Mode Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white rounded-xl">
                <Receipt className="text-purple-700" size={20} />
              </div>
              <span className="text-xs font-medium text-purple-700 bg-purple-200 px-2 py-1 rounded-full">
                {Object.keys(stats.revenueByPaymentMode).length}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Payment Modes</h3>
            <div className="space-y-1">
              {Object.entries(stats.revenueByPaymentMode)
                .slice(0, 2)
                .map(([mode, data]) => (
                  <div key={mode} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{mode}</span>
                    <span className="text-xs font-medium text-gray-900">
                      ₹{data.revenue.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Table Card */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white rounded-xl">
                <Trophy className="text-amber-700" size={20} />
              </div>
              <span className="text-xs font-medium text-amber-700 bg-amber-200 px-2 py-1 rounded-full">
                Top
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Best Table</h3>
            {stats.topTables.length > 0 ? (
              <>
                <p className="text-xl font-bold text-gray-900 mb-1">
                  Table {stats.topTables[0].table}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-amber-600 font-medium">
                    ₹{stats.topTables[0].revenue.toLocaleString()}
                  </span>
                  <div className="text-gray-400">•</div>
                  <span className="text-gray-600">
                    {stats.topTables[0].bills} orders
                  </span>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No table data</p>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Sales & Payment Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Revenue by Payment Mode */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl">
                    <PieChart className="text-emerald-700" size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Revenue by Payment Mode</h3>
                    <p className="text-sm text-gray-600">Breakdown of payment methods</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedSection(expandedSection === 'payment' ? null : 'payment')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {expandedSection === 'payment' ? 
                    <ChevronUp size={18} className="text-gray-500" /> : 
                    <ChevronDown size={18} className="text-gray-500" />
                  }
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(stats.revenueByPaymentMode)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .map(([mode, data]) => {
                    const percentage = stats.totalRevenue > 0 ? 
                      ((data.revenue / stats.totalRevenue) * 100).toFixed(1) : 0
                    
                    return (
                      <div key={mode} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                              {getPaymentIcon(mode)}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-900">{mode}</span>
                              <p className="text-xs text-gray-500">{data.count} transactions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">
                              ₹{data.revenue.toLocaleString()}
                            </p>
                            <p className="text-xs text-emerald-600 font-medium">{percentage}%</p>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-700"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>

              {expandedSection === 'payment' && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Payment Insights</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-600 mb-1">Most Used</p>
                      <p className="text-sm font-medium text-gray-900">
                        {Object.entries(stats.revenueByPaymentMode)
                          .sort((a, b) => b[1].count - a[1].count)[0]?.[0] || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-600 mb-1">Highest Revenue</p>
                      <p className="text-sm font-medium text-gray-900">
                        {Object.entries(stats.revenueByPaymentMode)
                          .sort((a, b) => b[1].revenue - a[1].revenue)[0]?.[0] || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top Performing Items */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-red-100 to-red-200 rounded-xl">
                    <Flame className="text-red-700" size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Top Selling Items</h3>
                    <p className="text-sm text-gray-600">Most popular menu items</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                  {stats.popularItems.length} items
                </span>
              </div>

              <div className="space-y-3">
                {stats.popularItems.slice(0, 5).map((item, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-[1.01]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-100 to-yellow-200' :
                          index === 1 ? 'bg-gradient-to-br from-gray-100 to-gray-200' :
                          index === 2 ? 'bg-gradient-to-br from-amber-100 to-amber-200' :
                          'bg-gradient-to-br from-blue-100 to-blue-200'
                        }`}>
                          <span className={`text-sm font-bold ${
                            index === 0 ? 'text-yellow-700' :
                            index === 1 ? 'text-gray-700' :
                            index === 2 ? 'text-amber-700' :
                            'text-blue-700'
                          }`}>
                            #{index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            ₹{item.revenue.toLocaleString()} revenue
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{item.count} sold</p>
                        <p className="text-xs text-emerald-600">
                          ₹{Math.round(item.revenue / item.count).toLocaleString()} avg
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {stats.popularItems.length === 0 && (
                <div className="text-center py-8">
                  <Package className="mx-auto text-gray-400 mb-2" size={24} />
                  <p className="text-gray-500 text-sm">No items sold in this period</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Performance & Analytics */}
          <div className="space-y-6">
            {/* Table Performance */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                    <Table className="text-blue-700" size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Table Performance</h3>
                    <p className="text-sm text-gray-600">Revenue by table</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {stats.topTables.slice(0, 4).map((table, index) => (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        <span className="text-sm font-bold">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Table {table.table}</p>
                        <p className="text-xs text-gray-500">{table.bills} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">
                        ₹{table.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {stats.topTables.length === 0 && (
                <div className="text-center py-6">
                  <Table className="mx-auto text-gray-400 mb-2" size={20} />
                  <p className="text-gray-500 text-sm">No table data</p>
                </div>
              )}
            </div>

            {/* Peak Hours */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                    <Clock className="text-purple-700" size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Peak Hours</h3>
                    <p className="text-sm text-gray-600">Busiest times</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {stats.peakHours.slice(0, 4).map((hour, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Clock3 size={14} className="text-gray-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {hour.displayHour} {hour.period}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-purple-600">
                        {hour.count} orders
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                        style={{ 
                          width: `${(hour.count / Math.max(...stats.peakHours.map(h => h.count))) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {stats.peakHours.length === 0 && (
                <div className="text-center py-6">
                  <Clock className="mx-auto text-gray-400 mb-2" size={20} />
                  <p className="text-gray-500 text-sm">No order timing data</p>
                </div>
              )}
            </div>

            {/* Quick Insights */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Insights</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Best Performer</p>
                    <p className="text-xs text-gray-600">
                      {stats.popularItems[0]?.name || 'No data'} is the most ordered item
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Info size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Average Order</p>
                    <p className="text-xs text-gray-600">
                      Customers spend ₹{Math.round(stats.avgOrderValue).toLocaleString()} on average
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Target size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Busiest Period</p>
                    <p className="text-xs text-gray-600">
                      {stats.peakHours[0]?.displayHour || 'N/A'} {stats.peakHours[0]?.period || ''} is the peak hour
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Summary */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl">
                <BarChart4 className="text-gray-700" size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{getTimeRangeLabel()} Summary</h3>
                <p className="text-sm text-gray-600">Complete performance overview</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="text-gray-400" size={16} />
              <span className="text-sm text-gray-600">
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs font-medium text-gray-500 mb-1">Revenue Generated</p>
              <p className="text-lg font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs font-medium text-gray-500 mb-1">Total Bills</p>
              <p className="text-lg font-bold text-gray-900">{stats.totalBills}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs font-medium text-gray-500 mb-1">Average Order Value</p>
              <p className="text-lg font-bold text-gray-900">₹{Math.round(stats.avgOrderValue).toLocaleString()}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs font-medium text-gray-500 mb-1">Items Sold</p>
              <p className="text-lg font-bold text-gray-900">
                {stats.popularItems.reduce((sum, item) => sum + item.count, 0)}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Key Takeaways</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-sm font-medium text-emerald-800 mb-1">💪 Strength</p>
                <p className="text-xs text-emerald-700">
                  {Object.keys(stats.revenueByPaymentMode).length} payment methods available
                </p>
              </div>
              
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-sm font-medium text-amber-800 mb-1">📈 Opportunity</p>
                <p className="text-xs text-amber-700">
                  Focus on promoting {stats.popularItems.slice(0, 2).map(i => i.name).join(' & ')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Report generated on {new Date().toLocaleString('en-IN')} • 
            Data updates in real-time • 
            <button 
              onClick={() => window.print()}
              className="ml-2 text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Print this report
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

// Note: Add this import at the top if not already present
import { CreditCard } from 'lucide-react'

export default Reports