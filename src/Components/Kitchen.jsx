import React, { useState, useEffect } from 'react'
import { ref, update, onValue, off, push } from 'firebase/database'
import { database } from '../Firebase/config'
import { Clock, ChefHat, CheckCircle, Play, Bell, Flame, TrendingUp, AlertCircle, Printer } from 'lucide-react'
import { printerService } from '../Components/printorder'

const Kitchen = () => {
  const [orders, setOrders] = useState({})
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [activeOrderId, setActiveOrderId] = useState(null)

  useEffect(() => {
    const ordersRef = ref(database, 'orders')
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setOrders(data)
        setLastUpdated(new Date())
      }
    })

    return () => off(ordersRef)
  }, [])

  const toggleItemStatus = async (orderId, itemId, currentStatus) => {
    const orderRef = ref(database, `orders/${orderId}`)
    const order = orders[orderId]
    
    if (!order || !order.items) return

    let newStatus = 'preparing'
    let shouldNotify = false
    
    // Toggle logic: pending → preparing → ready
    if (currentStatus === 'pending') {
      newStatus = 'preparing'
    } else if (currentStatus === 'preparing') {
      newStatus = 'ready'
      shouldNotify = true
    } else {
      return // Already ready
    }
    
    try {
      const updatedItems = order.items.map(item => 
        item.id === itemId ? { 
          ...item, 
          status: newStatus, 
          updatedAt: new Date().toISOString(),
          startedAt: currentStatus === 'pending' ? new Date().toISOString() : item.startedAt,
          completedAt: newStatus === 'ready' ? new Date().toISOString() : null
        } : item
      )
      
      await update(orderRef, {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      })

      // Send notification when item is marked as ready
      if (shouldNotify) {
        const item = order.items.find(i => i.id === itemId)
        const notificationsRef = ref(database, 'notifications')
        await push(notificationsRef, {
          type: 'kitchen_complete',
          message: `${item?.name || 'Item'} is ready for Table ${order.tableNumber}`,
          tableNumber: order.tableNumber,
          tableId: order.tableId,
          orderId,
          itemName: item?.name,
          createdAt: new Date().toISOString(),
          read: false
        })
      }
    } catch (error) {
      console.error('Error updating item status:', error)
    }
  }

  const startAllItems = async (orderId) => {
    const orderRef = ref(database, `orders/${orderId}`)
    const order = orders[orderId]
    
    if (!order || !order.items) return

    try {
      const updatedItems = order.items.map(item => 
        item.status === 'pending' ? { 
          ...item, 
          status: 'preparing', 
          updatedAt: new Date().toISOString(),
          startedAt: new Date().toISOString()
        } : item
      )
      
      await update(orderRef, {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error starting all items:', error)
    }
  }

  const getOrderProgress = (order) => {
    const totalItems = order.items?.length || 0
    const completedItems = order.items?.filter(item => item.status === 'ready').length || 0
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  }

  const getKitchenStats = () => {
    const allItems = Object.values(orders).flatMap(order => order.items || [])
    const activeOrders = Object.values(orders).filter(order => order.status === 'active')
    
    return {
      pending: allItems.filter(item => item.status === 'pending').length,
      preparing: allItems.filter(item => item.status === 'preparing').length,
      ready: allItems.filter(item => item.status === 'ready').length,
      activeOrders: activeOrders.length
    }
  }

  const getUrgentOrders = () => {
    return Object.values(orders).filter(order => {
      if (order.status !== 'active') return false
      const pendingItems = order.items?.filter(item => item.status === 'pending').length || 0
      return pendingItems > 2 // Consider urgent if more than 2 pending items
    }).length
  }

  const getFilteredOrders = () => {
    return Object.entries(orders)
      .filter(([orderId, order]) => order.status === 'active')
      .sort(([orderIdA, orderA], [orderIdB, orderB]) => {
        const pendingA = orderA.items?.filter(item => item.status === 'pending').length || 0
        const pendingB = orderB.items?.filter(item => item.status === 'pending').length || 0
        // Sort by pending items (urgent first), then by preparation time
        if (pendingB !== pendingA) return pendingB - pendingA
        
        const totalTimeA = orderA.items?.reduce((sum, item) => sum + (item.preparationTime || 0), 0) || 0
        const totalTimeB = orderB.items?.reduce((sum, item) => sum + (item.preparationTime || 0), 0) || 0
        return totalTimeA - totalTimeB
      })
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'border-l-yellow-500'
      case 'preparing': return 'border-l-blue-500'
      case 'ready': return 'border-l-emerald-500'
      default: return 'border-l-gray-400'
    }
  }

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Pending'
      case 'preparing': return 'Cooking'
      case 'ready': return 'Ready'
      default: return status
    }
  }

  // Print KOT (Kitchen Order Ticket)
  const printKOT = async (order) => {
    try {
      const orderItems = order.items.map(item => ({
        name: item.name,
        quantity: item.quantity
      }))

      const tableDisplay = order.tableNumber || 'Parcel'
      const orderNumber = order.orderNumber || order.id.slice(-4)

      await printerService.printKOT(
        orderItems,
        tableDisplay,
        orderNumber,
        {
          onPrintStart: () => console.log('Starting KOT print...'),
          onPrintComplete: () => console.log('KOT printed successfully'),
          onPrintError: (error) => console.error('KOT print error:', error)
        }
      )
    } catch (error) {
      console.error('Error printing KOT:', error)
    }
  }

  const stats = getKitchenStats()
  const filteredOrders = getFilteredOrders()
  const urgentOrdersCount = getUrgentOrders()

  return (
    <div className="min-h-screen mt-14 bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                <ChefHat size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Kitchen Display</h1>
                <p className="text-xs text-gray-500">Live order management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-500">Active orders</div>
                <div className="text-lg font-bold text-gray-900">{stats.activeOrders}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Orders Grid */}
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {filteredOrders.map(([orderId, order]) => {
              const pendingItems = order.items?.filter(item => item.status === 'pending').length || 0
              const preparingItems = order.items?.filter(item => item.status === 'preparing').length || 0
              const readyItems = order.items?.filter(item => item.status === 'ready').length || 0
              const isUrgent = pendingItems > 2
              
              return (
                <div 
                  key={orderId} 
                  className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 ${
                    isUrgent ? 'border-l-4 border-l-red-500' : ''
                  }`}
                >
                  {/* Order Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{order.tableNumber || 'Parcel'}</h3>
                          {isUrgent && (
                            <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-lg">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">Order #{order.orderNumber || orderId.slice(-4)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => printKOT(order)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Printer size={16} />
                          <span className="text-sm">Print KOT</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 max-h-80 overflow-y-auto">
                    <div className="space-y-3">
                      {order.items?.map((item, index) => (
                        <div 
                          key={item.id} 
                          className={`p-3 rounded-lg border ${getStatusColor(item.status)} ${
                            item.status === 'pending' ? 'bg-yellow-50' :
                            item.status === 'preparing' ? 'bg-blue-50' :
                            'bg-emerald-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{item.emoji}</span>
                              <div>
                                <h4 className="font-medium text-gray-900">{item.name}</h4>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <span>{item.quantity}x</span>
                                </div>
                              </div>
                            </div>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              item.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {getStatusText(item.status)}
                            </span>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => toggleItemStatus(orderId, item.id, item.status)}
                            className={`w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                              item.status === 'pending' 
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : item.status === 'preparing'
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-emerald-100 text-emerald-700 cursor-default'
                            }`}
                            disabled={item.status === 'ready'}
                          >
                            {item.status === 'pending' ? (
                              <>
                                <Play size={16} />
                                <span>Start Cooking</span>
                              </>
                            ) : item.status === 'preparing' ? (
                              <>
                                <CheckCircle size={16} />
                                <span>Mark as Ready</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={16} />
                                <span>Ready for Service</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ChefHat size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kitchen is Clear</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              No active orders. New orders will appear here automatically.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 4px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
        }

        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 2px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>
    </div>
  )
}

export default Kitchen