import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ref, push, update, onValue, off, remove, query, orderByChild } from 'firebase/database'
import { database } from '../Firebase/config'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Send,
  CheckCircle,
  ArrowLeft,
  Search,
  Clock,
  X,
  Users,
  Table,
  ChevronRight,
  Building,
  Package,
  DollarSign,
  Home,
  Link as LinkIcon,
  Unlink,
  Bell,
  ChefHat,
  AlertCircle,
  CheckSquare,
  Square,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronDown,
  Star,
  Loader2,
  AlertTriangle,
  Menu,
  Grid,
  LayoutDashboard,
  Printer,
  Edit
} from 'lucide-react'

// Import the printer service
import { printerService, globalBluetoothConnection } from '../Components/printorder'

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
  const [isPrinting, setIsPrinting] = useState(false)
  const [showEditOrderModal, setShowEditOrderModal] = useState(false)
  const [orderToEdit, setOrderToEdit] = useState(null)

  // Updated floor configuration
  const floorConfig = [
    {
      id: '1',
      label: 'Ground Floor',
      color: 'text-emerald-600',
      tables: [
        { number: '1', displayName: 'T1' },
        { number: '2', displayName: 'T2' },
        { number: '3', displayName: 'T3' },
        { number: '4', displayName: 'T4' },
        { number: '5', displayName: 'T5' },
        { number: '6A', displayName: 'T6A' },
        { number: '6B', displayName: 'T6B' }
      ]
    },
    {
      id: '2',
      label: 'First Floor',
      color: 'text-amber-600',
      tables: []
    },
    {
      id: '3',
      label: 'Top Floor',
      color: 'text-blue-600',
      tables: [
        { number: 'T7', displayName: 'T7' },
        { number: 'T8', displayName: 'T8' },
        { number: 'T9', displayName: 'T9' },
        { number: 'T10', displayName: 'T10' },
        { number: 'T11', displayName: 'T11' },
        { number: 'T12', displayName: 'T12' },
        { number: 'T13', displayName: 'T13' },
        { number: 'T14', displayName: 'T14' },
        { number: 'T15', displayName: 'T15' }
      ]
    }
  ]

  const [menuItems, setMenuItems] = useState({})

  const getTableId = useCallback((tableNumber, floorId) => {
    if (floorId === '3') return `table-${tableNumber}`
    return `table-${floorId}-${tableNumber}`
  }, [])

  const getDisplayTableNumber = useCallback((tableId) => {
    const parts = tableId.split('-')
    if (parts.length === 2) return parts[1]
    return parts[2]
  }, [])

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

  // Get accurate table status
  const getTableStatus = useCallback((tableNumber, floorId) => {
    const tableId = getTableId(tableNumber, floorId)
    const table = tables[tableId]
    
    if (!table) return 'available'
    
    const activeOrdersCount = getTableActiveOrdersCount(tableId)
    
    // If no active orders and table is not joined, it should be available
    if (activeOrdersCount === 0 && !table.isJoined) {
      return 'available'
    }
    
    // If there are active orders or table is joined, it's occupied
    return 'occupied'
  }, [tables, getTableId, getTableActiveOrdersCount])

  const getFloorStats = useCallback((floorTables) => {
    if (!floorTables || floorTables.length === 0) {
      return { totalTables: 0, occupiedTables: 0, activeOrdersCount: 0, totalRevenue: 0 }
    }

    const floorTableIds = floorTables.map(table =>
      getTableId(table.number, floorTables[0]?.floorId || '1')
    )

    const occupiedTables = floorTableIds.filter(tableId => {
      const tableNumber = getDisplayTableNumber(tableId)
      const floorId = tableId.includes('table-3-') ? '3' : tableId.includes('table-1-') ? '1' : '2'
      const status = getTableStatus(tableNumber, floorId)
      return status === 'occupied'
    }).length

    const activeOrdersCount = floorTableIds.reduce((count, tableId) => {
      return count + getTableActiveOrdersCount(tableId)
    }, 0)

    const totalRevenue = floorTableIds.reduce((sum, tableId) => {
      const tableOrders = Object.values(activeOrders).filter(order =>
        order.tableId === tableId && order.status === 'active'
      )
      return sum + tableOrders.reduce((orderSum, order) => orderSum + (order.total || 0), 0)
    }, 0)

    return {
      totalTables: floorTables.length,
      occupiedTables,
      activeOrdersCount,
      totalRevenue
    }
  }, [tables, activeOrders, getTableId, getDisplayTableNumber, getTableStatus, getTableActiveOrdersCount])

  // Updated filteredMenuItems to handle 'all' category search
  const filteredMenuItems = React.useMemo(() => {
    const searchLower = searchTerm.toLowerCase().trim()

    // If no search term, return all items grouped by category
    if (!searchLower) {
      // If 'all' category is selected, return all items grouped
      if (activeCategory === 'all') {
        return menuItems
      }
      // If specific category is selected, return only that category
      return menuItems[activeCategory] ? { [activeCategory]: menuItems[activeCategory] } : {}
    }

    // When searching with 'all' category selected
    if (activeCategory === 'all') {
      const results = {}
      Object.keys(menuItems).forEach(category => {
        const filtered = menuItems[category].filter(item =>
          item.name.toLowerCase().includes(searchLower) ||
          (item.description && item.description.toLowerCase().includes(searchLower))
        )
        if (filtered.length > 0) {
          results[category] = filtered
        }
      })
      return results
    }

    // When searching within a specific category
    const categoryItems = menuItems[activeCategory] || []
    const filtered = categoryItems.filter(item =>
      item.name.toLowerCase().includes(searchLower) ||
      (item.description && item.description.toLowerCase().includes(searchLower))
    )

    return filtered.length > 0 ? { [activeCategory]: filtered } : {}
  }, [menuItems, searchTerm, activeCategory])

  const getTableOrders = useCallback((tableId) => {
    return Object.entries(activeOrders)
      .filter(([orderId, order]) => order.tableId === tableId && order.status === 'active')
      .map(([orderId, order]) => ({ id: orderId, ...order }))
  }, [activeOrders])

  const getActiveOrdersCount = useCallback((tableId) => {
    return getTableActiveOrdersCount(tableId)
  }, [getTableActiveOrdersCount])

  const getTotalTableAmount = useCallback((tableId) => {
    const orders = getTableOrders(tableId)
    return orders.reduce((sum, order) => sum + (order.total || 0), 0)
  }, [getTableOrders])

  const handleTableSelect = (tableNumber, floorId) => {
    const tableId = getTableId(tableNumber, floorId)
    const table = {
      id: tableId,
      number: tableNumber,
      floor: floorId,
      displayName: floorConfig.find(f => f.id === floorId)?.tables.find(t => t.number === tableNumber)?.displayName || `T${tableNumber}`
    }
    setSelectedTable(table)
    setCurrentStep('addItems')
    setError(null)
  }

  const toggleFloor = (floorId) => {
    setExpandedFloors(prev =>
      prev.includes(floorId)
        ? prev.filter(id => id !== floorId)
        : [...prev, floorId]
    )
  }

  const toggleTableForJoin = (tableNumber, floorId) => {
    const tableId = getTableId(tableNumber, floorId)
    setSelectedTablesForJoin(prev => {
      if (prev.includes(tableId)) {
        return prev.filter(id => id !== tableId)
      } else {
        if (prev.length < 3) return [...prev, tableId]
        return prev
      }
    })
  }

  const joinTables = async () => {
    if (selectedTablesForJoin.length < 2) {
      setError('Select 2+ tables to join')
      setTimeout(() => setError(null), 3000)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const joinedGroupId = `group-${Date.now()}`
      const updates = {}

      selectedTablesForJoin.forEach(tableId => {
        updates[`tables/${tableId}/joinedGroup`] = joinedGroupId
        updates[`tables/${tableId}/isJoined`] = true
        
        // Only mark as occupied if there are active orders
        const hasActiveOrders = getTableActiveOrdersCount(tableId) > 0
        updates[`tables/${tableId}/status`] = hasActiveOrders ? 'occupied' : 'available'
      })

      updates[`tableGroups/${joinedGroupId}`] = {
        tables: selectedTablesForJoin,
        createdAt: new Date().toISOString(),
        status: 'active',
        mainTable: selectedTablesForJoin[0]
      }

      await update(ref(database), updates)

      const mainTableId = selectedTablesForJoin[0]
      const tableNumber = getDisplayTableNumber(mainTableId)
      const floorId = mainTableId.includes('table-3-') ? '3' : '1'

      handleTableSelect(tableNumber, floorId)
      setShowTableJoinModal(false)
      setSelectedTablesForJoin([])

    } catch (error) {
      console.error('Error joining tables:', error)
      setError('Failed to join tables')
    } finally {
      setLoading(false)
    }
  }

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
    } finally {
      setLoading(false)
    }
  }

  const addToOrder = (item) => {
    const existingItem = selectedItems.find(i => i.id === item.id)
    if (existingItem) {
      setSelectedItems(selectedItems.map(i =>
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setSelectedItems([...selectedItems, {
        ...item,
        quantity: 1,
        status: 'pending',
        addedAt: new Date().toISOString()
      }])
    }
  }

  const removeFromOrder = (itemId) => {
    setSelectedItems(selectedItems.filter(item => item.id !== itemId))
  }

  const updateQuantity = (itemId, quantity) => {
    if (quantity === 0) {
      removeFromOrder(itemId)
    } else {
      setSelectedItems(selectedItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      ))
    }
  }

  const clearCurrentOrder = () => {
    setSelectedItems([])
    setCustomerNotes('')
  }

  // NEW: Function to edit individual items in an existing order
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
    } finally {
      setLoading(false)
    }
  }

  // UPDATED: Cancel order function with proper table cleanup
  const cancelOrder = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return

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
    } finally {
      setLoading(false)
    }
  }

  // NEW FUNCTION: Print order to thermal printer
  const printOrderToPrinter = async () => {
    if (!selectedTable || selectedItems.length === 0) {
      setError('No order to print')
      return false
    }

    setIsPrinting(true)
    setError(null)

    try {
      const orderData = {
        items: selectedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          specialInstructions: item.specialInstructions || customerNotes
        })),
        total: totalAmount
      }

      const orderNumber = Math.floor(1000 + Math.random() * 9000)

      // Print the order using the printer service
      const success = await printerService.printOrderReceipt(
        orderData,
        selectedTable.displayName,
        orderNumber.toString(),
        {
          onPrintStart: () => console.log('Starting to print order...'),
          onPrintComplete: () => console.log('Order printed successfully'),
          onPrintError: (error) => console.error('Print error:', error)
        }
      )

      setIsPrinting(false)
      return success ? orderNumber : Math.floor(1000 + Math.random() * 9000)

    } catch (error) {
      console.error('Error printing order:', error)
      setIsPrinting(false)
      setError('Failed to print order')
      return Math.floor(1000 + Math.random() * 9000)
    }
  }

  const submitOrder = async () => {
    if (!selectedTable || selectedItems.length === 0) {
      setError('Select table and items')
      setTimeout(() => setError(null), 3000)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // FIRST: Print the order to thermal printer
      const printedOrderNumber = await printOrderToPrinter()

      // Create order data with the printed order number
      const orderData = {
        tableId: selectedTable.id,
        tableNumber: selectedTable.displayName,
        floor: selectedTable.floor,
        items: selectedItems.map(item => ({
          ...item,
          status: 'pending',
          kitchenStatus: 'pending'
        })),
        status: 'active',
        createdAt: new Date().toISOString(),
        customerNotes: customerNotes,
        total: totalAmount,
        orderNumber: printedOrderNumber,
        captain: 'Captain',
        isNew: true,
        joinedGroup: tables[selectedTable.id]?.joinedGroup || null,
        printedAt: new Date().toISOString()
      }

      // Save order to Firebase
      const ordersRef = ref(database, 'orders')
      const newOrderRef = await push(ordersRef, orderData)

      // Create or update table entry
      const tableRef = ref(database, `tables/${selectedTable.id}`)
      await update(tableRef, {
        status: 'occupied',
        floor: selectedTable.floor,
        lastOrderAt: new Date().toISOString(),
        isJoined: tables[selectedTable.id]?.isJoined || false,
        joinedGroup: tables[selectedTable.id]?.joinedGroup || null
      })

      // Send notification to kitchen
      const notificationsRef = ref(database, 'notifications')
      await push(notificationsRef, {
        type: 'new_order',
        message: `New order from ${selectedTable.displayName}`,
        tableNumber: selectedTable.displayName,
        orderId: newOrderRef.key,
        itemsCount: selectedItems.length,
        createdAt: new Date().toISOString(),
        read: false
      })

      // Show success message
      setIsOrderPlaced(true)
      setShowOrderSummary(false)
      clearCurrentOrder()

      setTimeout(() => setIsOrderPlaced(false), 3000)

    } catch (error) {
      console.error('Error placing order:', error)
      setError('Failed to place order')
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
        clearCurrentOrder()
      }, 3000)

    } catch (error) {
      console.error('Error completing table order:', error)
      setError(error.message || 'Failed to complete')
    } finally {
      setLoading(false)
    }
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

  const handleQuantityChange = (id, action, currentQty) => {
    let newQty = currentQty;

    if (action === "plus") {
      newQty = currentQty === 0.5 ? 1 : currentQty + 1;
    }

    if (action === "minus") {
      if (currentQty === 1) {
        newQty = 0.5;
      } else {
        newQty = Math.max(0.5, currentQty - 1);
      }
    }

    updateQuantity(id, newQty);
  };

  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0)

  const getJoinedTables = useCallback((tableId) => {
    const table = tables[tableId]
    if (!table?.joinedGroup) return []

    return Object.entries(tables)
      .filter(([_, t]) => t.joinedGroup === table.joinedGroup && t.id !== tableId)
      .map(([id, _]) => getDisplayTableNumber(id))
  }, [tables, getDisplayTableNumber])

  // Helper function to render menu item card
  const renderMenuItemCard = (item) => {
    const inCart = selectedItems.find(i => i.id === item.id)

    return (
      <div
        key={item.id}
        className="bg-white rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors overflow-hidden"
      >
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{item.emoji}</span>
                {item.popular && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">
                    Popular
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 text-base mb-1">{item.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock size={14} />
                <span>{item.preparationTime} min</span>
                {item.spicy && <span className="text-red-500">🌶️</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-emerald-600">₹{item.price}</div>
            </div>
          </div>

          {inCart ? (
            <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-1">
              <button
                onClick={() => handleQuantityChange(item.id, "minus", inCart.quantity)}
                className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Minus size={14} className="text-emerald-600" />
              </button>

              <div className="flex flex-col items-center">
                <span className="font-bold text-emerald-700">
                  {inCart.quantity}
                </span>
                <span className="text-xs text-emerald-600 font-medium">
                  in cart
                </span>
              </div>

              <button
                onClick={() => handleQuantityChange(item.id, "plus", inCart.quantity)}
                className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-colors"
              >
                <Plus size={14} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToOrder(item)}
              className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>Add to Order</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  // NEW: Render Edit Order Modal
  const renderEditOrderModal = () => {
    if (!orderToEdit) return null

    const [editItems, setEditItems] = useState(orderToEdit.items || [])
    const [editNotes, setEditNotes] = useState(orderToEdit.customerNotes || '')

    const handleEditItemQuantity = (itemId, newQuantity) => {
      setEditItems(items => 
        items.map(item => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        ).filter(item => item.quantity > 0)
      )
    }

    const handleRemoveEditItem = (itemId) => {
      setEditItems(items => items.filter(item => item.id !== itemId))
    }

    const calculateEditTotal = () => {
      return editItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    }

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl w-full max-w-md border border-gray-200/80 shadow-2xl">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Edit size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Edit Order #{orderToEdit.orderNumber}</h3>
                <p className="text-sm text-gray-500">{selectedTable?.displayName}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowEditOrderModal(false)
                setOrderToEdit(null)
              }}
              className="w-8 h-8 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 max-h-64 overflow-y-auto">
            <div className="space-y-3">
              {editItems.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.emoji}</span>
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-500">₹{item.price} × {item.quantity}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditItemQuantity(item.id, Math.max(0.5, item.quantity - 1))}
                        className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleEditItemQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="font-semibold text-emerald-600">₹{item.price * item.quantity}</span>
                    <button
                      onClick={() => handleRemoveEditItem(item.id)}
                      className="w-7 h-7 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
              
              {editItems.length === 0 && (
                <div className="text-center py-8">
                  <ShoppingCart className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-gray-500">All items removed</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 border-t border-gray-100 space-y-3">
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Update special instructions..."
              className="w-full p-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-none"
              rows="2"
            />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">New Total</p>
                <p className="text-2xl font-bold text-emerald-600">₹{calculateEditTotal()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowEditOrderModal(false)
                    setOrderToEdit(null)
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => editOrderItems(orderToEdit.id, editItems)}
                  disabled={loading || editItems.length === 0}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      <span>Update Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderOrderSummaryModal = () => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl w-full max-w-md border border-gray-200/80 shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <ShoppingCart size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Order Summary</h3>
              <p className="text-sm text-gray-500">{selectedTable?.displayName}</p>
            </div>
          </div>
          <button
            onClick={() => setShowOrderSummary(false)}
            className="w-8 h-8 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 max-h-64 overflow-y-auto">
          <div className="space-y-3">
            {selectedItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.emoji}</span>
                  <div>
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-sm text-gray-500">₹{item.price} × {item.quantity}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-emerald-600">₹{item.price * item.quantity}</span>
                  <button
                    onClick={() => removeFromOrder(item.id)}
                    className="w-7 h-7 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 space-y-3">
          <textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            placeholder="Add special instructions..."
            className="w-full p-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 resize-none"
            rows="2"
          />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-emerald-600">₹{totalAmount}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearCurrentOrder}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Clear
              </button>
              <button
                onClick={submitOrder}
                disabled={loading || isPrinting}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(loading || isPrinting) ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{isPrinting ? 'Printing...' : 'Sending...'}</span>
                  </>
                ) : (
                  <>
                    <Printer size={16} />
                    <span>Print & Send Order</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Order will be printed on thermal printer and sent to kitchen
          </div>
        </div>
      </div>
    </div>
  )

  const renderCancelOrderModal = () => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl w-full max-w-md border border-gray-200/80 shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Cancel Order</h3>
              <p className="text-sm text-gray-500">#{orderToCancel?.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowCancelOrderModal(false)
              setOrderToCancel(null)
            }}
            className="w-8 h-8 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-gray-600 mb-4">Cancel this order? This cannot be undone.</p>

          {orderToCancel?.items && (
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="font-medium text-gray-800 mb-2 text-sm">Order Items:</p>
              <div className="space-y-1">
                {orderToCancel.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.quantity}x {item.name}</span>
                    <span className="font-medium">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setShowCancelOrderModal(false)
                setOrderToCancel(null)
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => cancelOrder(orderToCancel?.id)}
              disabled={loading}
              className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Cancel Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTableJoinModal = () => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl w-full max-w-md border border-gray-200/80 shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <LinkIcon size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Join Tables</h3>
              <p className="text-sm text-gray-500">Select tables (max 3)</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowTableJoinModal(false)
              setSelectedTablesForJoin([])
            }}
            className="w-8 h-8 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {floorConfig.flatMap(floor =>
              floor.tables.map(table => {
                const tableId = getTableId(table.number, floor.id)
                const isSelected = selectedTablesForJoin.includes(tableId)
                const status = getTableStatus(table.number, floor.id)
                const isOccupied = status === 'occupied'

                return (
                  <button
                    key={tableId}
                    onClick={() => !isOccupied && toggleTableForJoin(table.number, floor.id)}
                    disabled={isOccupied}
                    className={`p-3 rounded-xl border transition-colors ${isSelected
                      ? 'bg-blue-50 border-blue-500'
                      : isOccupied
                        ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                        : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <CheckSquare size={16} className="text-blue-600" />
                        ) : (
                          <Square size={16} className="text-gray-400" />
                        )}
                        <span className={`font-medium ${isOccupied ? 'text-gray-400' : 'text-gray-800'}`}>
                          {table.displayName}
                        </span>
                      </div>
                      {isOccupied && (
                        <span className="text-xs text-gray-400">Occupied</span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Selected: {selectedTablesForJoin.length} tables
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowTableJoinModal(false)
                  setSelectedTablesForJoin([])
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={joinTables}
                disabled={selectedTablesForJoin.length < 2 || loading}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <LinkIcon size={16} />
                    <span>Join Tables</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTableSelection = () => (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Link to="/parcel">
              <button className='bg-red-600 flex items-center gap-1 text-white px-3 py-2 rounded-lg'>
                <Package size={16} />
                Parcel
              </button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => setShowTableJoinModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <LinkIcon size={16} />
              <span>Join</span>
            </button>
          </div>
        </div>

        {/* Floor Navigation */}
        <div className="flex gap-1 mb-4 p-1 bg-white rounded-2xl border border-gray-200">
          {floorConfig.map(floor => (
            <button
              key={floor.id}
              onClick={() => {
                setSelectedFloor(floor.id)
                if (!expandedFloors.includes(floor.id)) {
                  setExpandedFloors([floor.id])
                }
              }}
              className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-xl transition-colors ${selectedFloor === floor.id
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Building size={16} className={floor.color} />
                <span>{floor.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tables Grid */}
      {viewMode === 'grid' ? (
        <div className="space-y-4">
          {floorConfig.map(floor => {
            const stats = getFloorStats(floor.tables)
            const isExpanded = expandedFloors.includes(floor.id)

            if (floor.tables.length === 0) return null

            return (
              <div key={floor.id} className="bg-white rounded-2xl border border-gray-200">
                <button
                  onClick={() => toggleFloor(floor.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${floor.id === '1' ? 'bg-emerald-50' :
                      floor.id === '2' ? 'bg-amber-50' :
                        'bg-blue-50'
                      }`}>
                      <Building size={20} className={floor.color} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{floor.label}</h3>
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                          {floor.tables.length} tables
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Table size={12} />
                          {stats.occupiedTables}/{stats.totalTables} occupied
                        </span>
                        {stats.activeOrdersCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Package size={12} />
                            {stats.activeOrdersCount} orders
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={20} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {floor.tables.map(table => {
                        const tableId = getTableId(table.number, floor.id)
                        const status = getTableStatus(table.number, floor.id)
                        const isOccupied = status === 'occupied'
                        const ordersCount = getActiveOrdersCount(tableId)
                        const isJoined = tables[tableId]?.isJoined

                        return (
                          <div key={tableId} className="relative">
                            <button
                              onClick={() => handleTableSelect(table.number, floor.id)}
                              className={`w-full p-4 rounded-xl border transition-colors ${isOccupied
                                ? 'bg-red-50 border-red-200 hover:border-red-300'
                                : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                                }`}
                            >
                              <div className="text-center">
                                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center ${isOccupied ? 'bg-red-100' : 'bg-emerald-100'
                                  }`}>
                                  <Table className={isOccupied ? "text-red-600" : "text-emerald-600"} size={24} />
                                </div>
                                <div className="font-semibold text-gray-900 mb-2">{table.displayName}</div>
                                <div className={`px-3 py-1 text-xs font-medium rounded-full ${isOccupied
                                  ? 'bg-red-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                  }`}>
                                  {isOccupied ? 'Occupied' : 'Available'}
                                </div>

                                {isOccupied && ordersCount > 0 && (
                                  <div className="mt-2 text-xs text-gray-600">
                                    {ordersCount} order{ordersCount > 1 ? 's' : ''}
                                  </div>
                                )}

                                {isJoined && (
                                  <div className="mt-1">
                                    <span className="text-xs text-red-600 flex items-center justify-center gap-1">
                                      <LinkIcon size={10} />
                                      Joined
                                    </span>
                                  </div>
                                )}
                              </div>

                              {ordersCount > 0 && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                  {ordersCount}
                                </div>
                              )}
                            </button>

                            {isJoined && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  unjoinTables(tableId)
                                }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                                title="Unjoin table"
                              >
                                <Unlink size={12} />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        // List View
        <div className="space-y-2">
          {floorConfig.flatMap(floor =>
            floor.tables.map(table => {
              const tableId = getTableId(table.number, floor.id)
              const status = getTableStatus(table.number, floor.id)
              const isOccupied = status === 'occupied'
              const ordersCount = getActiveOrdersCount(tableId)

              return (
                <button
                  key={tableId}
                  onClick={() => handleTableSelect(table.number, floor.id)}
                  className="w-full p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOccupied ? 'bg-red-100' : 'bg-emerald-100'
                      }`}>
                      <Table className={isOccupied ? "text-red-600" : "text-emerald-600"} size={20} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{table.displayName}</span>
                        <span className="text-xs text-gray-500">{floor.label}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {isOccupied ? `${ordersCount} active order${ordersCount !== 1 ? 's' : ''}` : 'Available'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOccupied && ordersCount > 0 && (
                      <span className="px-2.5 py-1 bg-red-600 text-white text-xs rounded-full font-medium">
                        {ordersCount}
                      </span>
                    )}
                    <ChevronRight size={20} className="text-gray-400" />
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )

  const renderOrderTaking = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                setCurrentStep('selectTable')
                clearCurrentOrder()
                setError(null)
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="text-center">
              <h2 className="font-semibold text-gray-900 text-lg">{selectedTable?.displayName}</h2>
              <div className="text-xs text-gray-500">
                {getActiveOrdersCount(selectedTable?.id)} active order{getActiveOrdersCount(selectedTable?.id) !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {kitchenNotifications.length > 0 && (
                <button
                  onClick={markNotificationsAsRead}
                  className="relative w-9 h-9 bg-yellow-100 hover:bg-yellow-200 rounded-xl flex items-center justify-center transition-colors"
                >
                  <Bell size={18} className="text-yellow-600" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {kitchenNotifications.length}
                  </span>
                </button>
              )}

              <button
                onClick={() => setShowOrderSummary(true)}
                className="relative w-9 h-9 bg-emerald-100 hover:bg-emerald-200 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedItems.length === 0}
              >
                <ShoppingCart size={18} className="text-emerald-600" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600" />
                <span className="text-sm font-medium text-red-700">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search all menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
            />
          </div>
        </div>

        {/* Category Tabs - Updated with "All" */}
        <div className="px-4 pb-2 overflow-x-auto">
          <div className="flex gap-1">
            {/* All Category Button */}
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${activeCategory === 'all'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              All
            </button>

            {/* Other Categories */}
            {Object.keys(menuItems).map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${activeCategory === category
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeCategory === 'all' ? (
          // Show all categories when 'All' is selected
          <div className="space-y-6">
            {Object.keys(filteredMenuItems).length > 0 ? (
              Object.keys(filteredMenuItems).map(category => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 px-2">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredMenuItems[category]?.map(item => renderMenuItemCard(item))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Search className="mx-auto text-gray-400 mb-3" size={32} />
                <p className="text-gray-600 font-medium">No items found</p>
                <p className="text-gray-500 text-sm mt-1">Try a different search</p>
              </div>
            )}
          </div>
        ) : (
          // Show specific category
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMenuItems[activeCategory]?.length > 0 ? (
              filteredMenuItems[activeCategory]?.map(item => renderMenuItemCard(item))
            ) : (
              <div className="col-span-full text-center py-12">
                <Search className="mx-auto text-gray-400 mb-3" size={32} />
                <p className="text-gray-600 font-medium">No items found in {activeCategory}</p>
                <p className="text-gray-500 text-sm mt-1">Try a different search or category</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Orders Sidebar */}
      <div className="lg:hidden border-t border-gray-100 bg-white">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Active Orders</h3>
            <span className="text-sm text-gray-500">
              ₹{getTotalTableAmount(selectedTable?.id)}
            </span>
          </div>

          {getActiveOrdersCount(selectedTable?.id) > 0 ? (
            <div className="space-y-2">
              {getTableOrders(selectedTable?.id).slice(0, 2).map((order) => (
                <div key={order.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium bg-blue-600 text-white px-2 py-1 rounded-full">
                        #{order.orderNumber}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setOrderToEdit(order)
                          setShowEditOrderModal(true)
                        }}
                        className="w-5 h-5 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors"
                        title="Edit order"
                      >
                        <Edit size={12} className="text-orange-500" />
                      </button>
                      <button
                        onClick={() => {
                          setOrderToCancel(order)
                          setShowCancelOrderModal(true)
                        }}
                        className="w-5 h-5 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <X size={12} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.items?.length || 0} items • ₹{order.total}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No active orders</p>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {selectedItems.length > 0 ? (
                <>
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <ShoppingCart size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Order</p>
                    <p className="font-semibold text-gray-900">{totalItems} items • ₹{totalAmount}</p>
                  </div>
                  <button
                    onClick={() => setShowOrderSummary(true)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  >
                    <Printer size={16} />
                    <span>Review & Print</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <ShoppingCart size={20} />
                  <span className="font-medium">No items yet</span>
                </div>
              )}
            </div>

            {getActiveOrdersCount(selectedTable?.id) > 0 && (
              <button
                onClick={() => setShowCompleteOrderModal(true)}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <CreditCard size={18} />
                <span>Bill: ₹{getTotalTableAmount(selectedTable?.id)}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Complete Order Modal */}
      {showCompleteOrderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl w-full max-w-2xl border border-gray-200/80 shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <CreditCard size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Generate Bill</h3>
                  <p className="text-sm text-gray-500">{selectedTable?.displayName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCompleteOrderModal(false)}
                className="w-8 h-8 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 max-h-[50vh] overflow-y-auto">
              <div className="space-y-3">
                {getTableOrders(selectedTable?.id).map((order) => (
                  <div key={order.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">#{order.orderNumber}</span>
                        <div className="flex items-center gap-1">
                          {/* <button
                            onClick={() => {
                              setOrderToEdit(order)
                              setShowEditOrderModal(true)
                            }}
                            className="w-5 h-5 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors"
                            title="Edit order"
                          >
                            <Edit size={12} className="text-blue-500" />
                          </button> */}
                          <button
                            onClick={() => {
                              setOrderToCancel(order)
                              setShowCancelOrderModal(true)
                            }}
                            className="w-5 h-5 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <X size={12} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-bold text-emerald-600">₹{order.total}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {order.items?.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{item.quantity}x {item.name}</span>
                          <span className="font-medium">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <div className="text-sm text-gray-500 text-center">
                          +{order.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 space-y-4">
              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-emerald-700">₹{getTotalTableAmount(selectedTable?.id)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{getActiveOrdersCount(selectedTable?.id)} orders</p>
                    <p className="font-medium text-emerald-600">Final Bill</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCompleteOrderModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-800 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={completeTableOrder}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <CreditCard size={20} />
                      <span>Generate Bill</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

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
        {currentStep === 'selectTable' ? renderTableSelection() : renderOrderTaking()}
      </div>

      {/* Modals */}
      {showOrderSummary && renderOrderSummaryModal()}
      {showCancelOrderModal && renderCancelOrderModal()}
      {showTableJoinModal && renderTableJoinModal()}
      {showEditOrderModal && renderEditOrderModal()}

      <style jsx>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }

        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }

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

export default Captain