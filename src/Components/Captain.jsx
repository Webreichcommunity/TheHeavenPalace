import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, push, update, onValue, off, remove, query, orderByChild } from 'firebase/database'
import { database } from '../Firebase/config'
import {
  CheckCircle,
  AlertCircle,
  X,
  LayoutDashboard,
  Loader2,
  AlertTriangle,
  CreditCard,
  ArrowLeft,
  Bell,
  Printer,
  ShoppingCart,
  Link as LinkIcon
} from 'lucide-react'
import TableManager from './TableManager'
import OrderManager from './OrderManager'

const Captain = () => {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedItems, setSelectedItems] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [customerNotes, setCustomerNotes] = useState('')
  const [tables, setTables] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [isOrderPlaced, setIsOrderPlaced] = useState(false)
  const [showBillSentToast, setShowBillSentToast] = useState(false)
  const [activeOrders, setActiveOrders] = useState({})
  const [currentStep, setCurrentStep] = useState('selectTable')
  const [showOrderSummary, setShowOrderSummary] = useState(false)
  const [showCompleteOrderModal, setShowCompleteOrderModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedFloor, setSelectedFloor] = useState('1')
  const [expandedFloors, setExpandedFloors] = useState(['1'])
  const [showTableJoinModal, setShowTableJoinModal] = useState(false)
  const [selectedTablesForJoin, setSelectedTablesForJoin] = useState([])
  const [kitchenNotifications, setKitchenNotifications] = useState([])
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState(null)
  const [tableGroups, setTableGroups] = useState({})
  const [error, setError] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [showEditOrderModal, setShowEditOrderModal] = useState(false)
  const [orderToEdit, setOrderToEdit] = useState(null)
  const [menuItems, setMenuItems] = useState({})

  // Fetch menu items
  useEffect(() => {
    const menuRef = query(ref(database, 'menuItems'), orderByChild('category'))

    const unsubscribe = onValue(menuRef, (snapshot) => {
      try {
        const data = snapshot.val()
        if (data) {
          const groupedItems = Object.entries(data).reduce((acc, [id, item]) => {
            if (!acc[item.category]) acc[item.category] = []
            acc[item.category].push({ id, ...item })
            return acc
          }, {})
          setMenuItems(groupedItems)
        } else {
          setMenuItems({})
        }
      } catch (err) {
        console.error('Error loading menu:', err)
        setError('Failed to load menu')
      }
    }, (error) => {
      console.error('Firebase error:', error)
      setError('Connection error')
    })

    return () => off(menuRef)
  }, [])

  // Fetch tables, orders, notifications
  useEffect(() => {
    setIsInitializing(true)

    const tablesRef = ref(database, 'tables')
    const ordersRef = query(ref(database, 'orders'), orderByChild('status'))
    const notificationsRef = query(ref(database, 'notifications'), orderByChild('read'))
    const tableGroupsRef = ref(database, 'tableGroups')

    const unsubscribeTables = onValue(tablesRef, (snapshot) => {
      try {
        setTables(snapshot.val() || {})
      } catch (err) {
        console.error('Error loading tables:', err)
        setError('Failed to load tables')
      }
    })

    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      try {
        setActiveOrders(snapshot.val() || {})
      } catch (err) {
        console.error('Error loading orders:', err)
        setError('Failed to load orders')
      }
    })

    const unsubscribeNotifications = onValue(notificationsRef, (snapshot) => {
      try {
        const data = snapshot.val()
        if (data) {
          const notificationsArray = Object.entries(data).map(([id, notification]) => ({
            id,
            ...notification
          })).filter(notification =>
            notification.type === 'kitchen_complete' && !notification.read
          )
          setKitchenNotifications(notificationsArray)
        } else {
          setKitchenNotifications([])
        }
      } catch (err) {
        console.error('Error loading notifications:', err)
      }
    })

    const unsubscribeTableGroups = onValue(tableGroupsRef, (snapshot) => {
      try {
        setTableGroups(snapshot.val() || {})
      } catch (err) {
        console.error('Error loading table groups:', err)
      }
    })

    setTimeout(() => setIsInitializing(false), 500)

    return () => {
      off(tablesRef)
      off(ordersRef)
      off(notificationsRef)
      off(tableGroupsRef)
    }
  }, [])

  // Helper function to get active orders count for a table
  const getTableActiveOrdersCount = useCallback((tableId) => {
    if (!tableId || !activeOrders) return 0
    return Object.values(activeOrders).filter(order =>
      order.tableId === tableId && order.status === 'active'
    ).length
  }, [activeOrders])

  const handleTableSelect = (table) => {
    setSelectedTable(table)
    setCurrentStep('addItems')
    setError(null)
  }

  const markNotificationsAsRead = async () => {
    try {
      const updates = {}
      kitchenNotifications.forEach(notification => {
        updates[`notifications/${notification.id}/read`] = true
      })

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates)
        setKitchenNotifications([])
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  // ADDED: Join Tables function
  const joinTables = async (tableIds) => {
    setLoading(true)
    setError(null)

    try {
      const joinedGroupId = `group-${Date.now()}`
      const updates = {}

      tableIds.forEach(tableId => {
        updates[`tables/${tableId}/joinedGroup`] = joinedGroupId
        updates[`tables/${tableId}/isJoined`] = true
        
        // Only mark as occupied if there are active orders
        const hasActiveOrders = getTableActiveOrdersCount(tableId) > 0
        updates[`tables/${tableId}/status`] = hasActiveOrders ? 'occupied' : 'available'
      })

      updates[`tableGroups/${joinedGroupId}`] = {
        tables: tableIds,
        createdAt: new Date().toISOString(),
        status: 'active',
        mainTable: tableIds[0]
      }

      await update(ref(database), updates)

      const mainTableId = tableIds[0]
      const tableNumber = mainTableId.includes('table-3-') ? mainTableId.replace('table-', '') : mainTableId.split('-')[2]
      const floorId = mainTableId.includes('table-3-') ? '3' : '1'

      const table = {
        id: mainTableId,
        number: tableNumber,
        floor: floorId,
        displayName: tableNumber
      }
      
      handleTableSelect(table)

    } catch (error) {
      console.error('Error joining tables:', error)
      setError('Failed to join tables')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // ADDED: Unjoin Tables function
  const unjoinTables = async (tableId) => {
    const table = tables[tableId]
    if (!table?.joinedGroup) return

    setLoading(true)
    setError(null)

    try {
      const updates = {}
      const groupTables = Object.entries(tables)
        .filter(([_, t]) => t.joinedGroup === table.joinedGroup)
        .map(([id]) => id)

      groupTables.forEach(tId => {
        updates[`tables/${tId}/joinedGroup`] = null
        updates[`tables/${tId}/isJoined`] = false

        // Check if this specific table has active orders
        const hasActiveOrders = getTableActiveOrdersCount(tId) > 0
        updates[`tables/${tId}/status`] = hasActiveOrders ? 'occupied' : 'available'
      })

      updates[`tableGroups/${table.joinedGroup}`] = null
      await update(ref(database), updates)

    } catch (error) {
      console.error('Error unjoining tables:', error)
      setError('Failed to unjoin tables')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // ADDED: Edit order items function
  const editOrderItems = async (orderId, updatedItems) => {
    setLoading(true)
    setError(null)

    try {
      const orderRef = ref(database, `orders/${orderId}`)
      const order = activeOrders[orderId]
      
      if (!order) throw new Error('Order not found')

      // Calculate new total
      const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

      await update(orderRef, {
        items: updatedItems,
        total: newTotal,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Captain'
      })

      // Send notification to kitchen about the update
      const notificationsRef = ref(database, 'notifications')
      await push(notificationsRef, {
        type: 'order_updated',
        message: `Order #${order.orderNumber} updated`,
        tableNumber: order.tableNumber,
        orderId,
        createdAt: new Date().toISOString(),
        read: false
      })

      setShowEditOrderModal(false)
      setOrderToEdit(null)

    } catch (error) {
      console.error('Error updating order:', error)
      setError('Failed to update order')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // ADDED: Cancel order function
  const cancelOrder = async (orderId) => {
    setLoading(true)
    setError(null)

    try {
      const orderRef = ref(database, `orders/${orderId}`)
      const order = activeOrders[orderId]

      if (!order) throw new Error('Order not found')

      // Delete the order from Firebase
      await remove(orderRef)

      // Get the table ID from the order
      const tableId = order.tableId

      // Check if table has any other active orders
      const hasOtherActiveOrders = Object.values(activeOrders).some(
        o => o.tableId === tableId && 
             o.status === 'active' && 
             o.id !== orderId
      )

      // If no other active orders and table is not joined, delete table entry
      if (!hasOtherActiveOrders && !tables[tableId]?.isJoined) {
        const tableRef = ref(database, `tables/${tableId}`)
        await remove(tableRef)
      } else if (!hasOtherActiveOrders && tables[tableId]?.isJoined) {
        // If joined but no active orders, update status
        const tableRef = ref(database, `tables/${tableId}`)
        await update(tableRef, {
          status: 'available',
          lastOrderAt: null
        })
      }

      // Send notification
      const notificationsRef = ref(database, 'notifications')
      await push(notificationsRef, {
        type: 'order_cancelled',
        message: `Order #${order.orderNumber} cancelled`,
        tableNumber: order.tableNumber,
        orderId,
        createdAt: new Date().toISOString(),
        read: false
      })

      setOrderToCancel(null)
      setShowCancelOrderModal(false)

    } catch (error) {
      console.error('Error cancelling order:', error)
      setError('Failed to cancel order')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const completeTableOrder = async () => {
    setLoading(true)
    setError(null)

    try {
      const tableOrders = Object.entries(activeOrders)
        .filter(([orderId, order]) => order.tableId === selectedTable.id && order.status === 'active')

      if (tableOrders.length === 0) throw new Error('No active orders')

      const finalTotal = tableOrders.reduce((sum, [_, order]) => sum + (order.total || 0), 0)
      const finalBill = {
        tableId: selectedTable.id,
        tableNumber: selectedTable.displayName,
        floor: selectedTable.floor,
        orders: tableOrders.map(([orderId, order]) => ({
          orderId,
          orderNumber: order.orderNumber,
          items: order.items,
          total: order.total,
          createdAt: order.createdAt
        })),
        finalTotal,
        completedAt: new Date().toISOString(),
        billNumber: Math.floor(10000 + Math.random() * 90000),
        status: 'paid'
      }

      const billsRef = ref(database, 'bills')
      const newBillRef = await push(billsRef, finalBill)
      const billId = newBillRef.key

      // Update all orders to closed
      for (const [orderId] of tableOrders) {
        const orderRef = ref(database, `orders/${orderId}`)
        await update(orderRef, {
          status: 'closed',
          closedAt: new Date().toISOString(),
          billId: billId
        })
      }

      // Delete table entry since order is completed
      const tableRef = ref(database, `tables/${selectedTable.id}`)
      await remove(tableRef)

      // If table was joined, clean up all joined tables
      if (tables[selectedTable.id]?.isJoined) {
        const joinedGroupId = tables[selectedTable.id].joinedGroup

        const groupTables = Object.entries(tables)
          .filter(([_, t]) => t.joinedGroup === joinedGroupId)
          .map(([id]) => id)

        for (const groupTableId of groupTables) {
          const hasActiveOrders = getTableActiveOrdersCount(groupTableId) > 0
          if (!hasActiveOrders) {
            await remove(ref(database, `tables/${groupTableId}`))
          }
        }

        await update(ref(database, `tableGroups/${joinedGroupId}`), null)
      }

      setShowBillSentToast(true)
      setShowCompleteOrderModal(false)

      setTimeout(() => {
        setShowBillSentToast(false)
        setCurrentStep('selectTable')
        setSelectedTable(null)
        setSelectedItems([])
        setCustomerNotes('')
      }, 3000)

    } catch (error) {
      console.error('Error completing table order:', error)
      setError(error.message || 'Failed to complete')
    } finally {
      setLoading(false)
    }
  }

  const getTotalTableAmount = useCallback((tableId) => {
    if (!tableId || !activeOrders) return 0
    return Object.values(activeOrders)
      .filter(order => order.tableId === tableId && order.status === 'active')
      .reduce((sum, order) => sum + (order.total || 0), 0)
  }, [activeOrders])

  const getActiveOrdersCount = useCallback((tableId) => {
    return getTableActiveOrdersCount(tableId)
  }, [getTableActiveOrdersCount])

  const clearCurrentOrder = () => {
    setSelectedItems([])
    setCustomerNotes('')
  }

  return (
    <div className="min-h-screen mt-14 bg-gray-50">
      {/* App Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <LayoutDashboard size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Captain View</h1>
                <p className="text-xs text-gray-500">Restaurant Management</p>
              </div>
            </div>

            {currentStep === 'selectTable' && isInitializing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-sm font-medium">Loading...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toasts */}
      {isOrderPlaced && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-emerald-200 p-4 flex items-center gap-3 animate-slideDown">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-emerald-600" size={16} />
            </div>
            <div>
              <p className="font-medium text-gray-900">Order sent to kitchen!</p>
              <p className="text-xs text-gray-500">Table {selectedTable?.displayName} • Printed successfully</p>
            </div>
          </div>
        </div>
      )}

      {showBillSentToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-red-200 p-4 flex items-center gap-3 animate-slideDown">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-red-600" size={16} />
            </div>
            <div>
              <p className="font-medium text-gray-900">Bill generated!</p>
              <p className="text-xs text-gray-500">Ready for payment</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-4">
        {currentStep === 'selectTable' ? (
          <TableManager
            tables={tables}
            activeOrders={activeOrders}
            viewMode={viewMode}
            setViewMode={setViewMode}
            showTableJoinModal={showTableJoinModal}
            setShowTableJoinModal={setShowTableJoinModal}
            selectedTablesForJoin={selectedTablesForJoin}
            setSelectedTablesForJoin={setSelectedTablesForJoin}
            selectedFloor={selectedFloor}
            setSelectedFloor={setSelectedFloor}
            expandedFloors={expandedFloors}
            setExpandedFloors={setExpandedFloors}
            loading={loading}
            setLoading={setLoading}
            error={error}
            setError={setError}
            onTableSelect={handleTableSelect}
            getTableActiveOrdersCount={getTableActiveOrdersCount}
            joinTables={joinTables}
            unjoinTables={unjoinTables}
            isInitializing={isInitializing}
          />
        ) : (
          <OrderManager
            selectedTable={selectedTable}
            menuItems={menuItems}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            customerNotes={customerNotes}
            setCustomerNotes={setCustomerNotes}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            showOrderSummary={showOrderSummary}
            setShowOrderSummary={setShowOrderSummary}
            showCompleteOrderModal={showCompleteOrderModal}
            setShowCompleteOrderModal={setShowCompleteOrderModal}
            showCancelOrderModal={showCancelOrderModal}
            setShowCancelOrderModal={setShowCancelOrderModal}
            showEditOrderModal={showEditOrderModal}
            setShowEditOrderModal={setShowEditOrderModal}
            orderToCancel={orderToCancel}
            setOrderToCancel={setOrderToCancel}
            orderToEdit={orderToEdit}
            setOrderToEdit={setOrderToEdit}
            loading={loading}
            setLoading={setLoading}
            error={error}
            setError={setError}
            kitchenNotifications={kitchenNotifications}
            activeOrders={activeOrders}
            tables={tables}
            onBack={() => {
              setCurrentStep('selectTable')
              clearCurrentOrder()
              setError(null)
            }}
            onOrderPlaced={() => setIsOrderPlaced(true)}
            onCompleteOrder={completeTableOrder}
            onMarkNotificationsRead={markNotificationsAsRead}
            getTotalTableAmount={getTotalTableAmount}
            getActiveOrdersCount={getActiveOrdersCount}
            editOrderItems={editOrderItems}
            cancelOrder={cancelOrder}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }

        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

export default Captain