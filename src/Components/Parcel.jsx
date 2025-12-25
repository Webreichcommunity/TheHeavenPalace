import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, push, update, onValue, off, query, orderByChild } from 'firebase/database'
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
  ChefHat,
  AlertCircle,
  Loader2,
  Package,
  Check,
  Receipt,
  ArrowRight,
  Home,
  FileText,
  DollarSign,
  Users
} from 'lucide-react'

const ParcelPage = () => {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all') // Changed to 'all' as default
  const [selectedItems, setSelectedItems] = useState([])
  const [customerNotes, setCustomerNotes] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isOrderPlaced, setIsOrderPlaced] = useState(false)
  const [showBillSentToast, setShowBillSentToast] = useState(false)
  const [activeOrders, setActiveOrders] = useState({})
  const [showOrderSummary, setShowOrderSummary] = useState(false)
  const [loading, setLoading] = useState(false)
  const [kitchenNotifications, setKitchenNotifications] = useState([])
  const [error, setError] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  
  // Parcel order state
  const [parcelOrders, setParcelOrders] = useState([])
  const [showParcelReadyModal, setShowParcelReadyModal] = useState(false)
  const [selectedParcelOrder, setSelectedParcelOrder] = useState(null)
  const [showSendToBillModal, setShowSendToBillModal] = useState(false)

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

  // Fetch orders and notifications
  useEffect(() => {
    setIsInitializing(true)
    
    const ordersRef = query(ref(database, 'orders'), orderByChild('status'))
    const notificationsRef = query(ref(database, 'notifications'), orderByChild('read'))

    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      try {
        const data = snapshot.val() || {}
        setActiveOrders(data)
        
        // Filter parcel orders
        const parcelOrdersArray = Object.entries(data)
          .filter(([_, order]) => order.isParcel && order.status === 'active')
          .map(([id, order]) => ({ id, ...order }))
        setParcelOrders(parcelOrdersArray)
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
            (notification.type === 'kitchen_complete' || notification.type === 'parcel_ready' || notification.type === 'parcel_to_bill') && !notification.read
          )
          setKitchenNotifications(notificationsArray)
        } else {
          setKitchenNotifications([])
        }
      } catch (err) {
        console.error('Error loading notifications:', err)
      }
    })

    setTimeout(() => setIsInitializing(false), 500)

    return () => {
      off(ordersRef)
      off(notificationsRef)
    }
  }, [])

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

  // Helper function to render menu item card
  const renderMenuItemCard = (item) => {
    const inCart = selectedItems.find(i => i.id === item.id)
    
    return (
      <div
        key={item.id}
        className="bg-white rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors overflow-hidden group"
      >
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{item.emoji}</span>
                {item.popular && (
                  <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium border border-emerald-100">
                    Popular
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 text-base mb-1 group-hover:text-emerald-700 transition-colors">{item.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock size={14} className="text-emerald-600" />
                <span>{item.preparationTime} min</span>
                {item.spicy && <span className="text-red-500">🌶️</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-emerald-600 text-lg">₹{item.price}</div>
            </div>
          </div>

          {inCart ? (
            <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-1 border border-emerald-100">
              <button
                onClick={() => updateQuantity(item.id, inCart.quantity - 1)}
                className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-emerald-200"
              >
                <Minus size={14} className="text-emerald-600" />
              </button>
              <div className="flex flex-col items-center">
                <span className="font-bold text-emerald-700">{inCart.quantity}</span>
                <span className="text-xs text-emerald-600 font-medium">in cart</span>
              </div>
              <button
                onClick={() => updateQuantity(item.id, inCart.quantity + 1)}
                className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-colors"
              >
                <Plus size={14} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToOrder(item)}
              className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-medium hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center justify-center gap-2 group-hover:bg-emerald-100 group-hover:border-emerald-300"
            >
              <Plus size={16} />
              <span>Add to Order</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  // Submit parcel order
  const submitParcelOrder = async () => {
    if (selectedItems.length === 0) {
      setError('Please add items to the order')
      setTimeout(() => setError(null), 3000)
      return
    }

    setLoading(true)
    setError(null)

    const orderData = {
      tableId: 'parcel',
      tableNumber: 'Parcel',
      floor: '2',
      items: selectedItems.map(item => ({
        ...item,
        status: 'pending',
        kitchenStatus: 'pending'
      })),
      status: 'active',
      createdAt: new Date().toISOString(),
      customerNotes: customerNotes,
      total: totalAmount,
      orderNumber: Math.floor(1000 + Math.random() * 9000),
      captain: 'Captain',
      isNew: true,
      isParcel: true,
      parcelStatus: 'preparing'
    }

    try {
      const ordersRef = ref(database, 'orders')
      const newOrderRef = await push(ordersRef, orderData)

      // Create parcel order notification
      const notificationsRef = ref(database, 'notifications')
      await push(notificationsRef, {
        type: 'new_parcel_order',
        message: `New parcel order #${orderData.orderNumber}`,
        tableNumber: 'Parcel',
        orderId: newOrderRef.key,
        itemsCount: selectedItems.length,
        createdAt: new Date().toISOString(),
        read: false
      })

      setIsOrderPlaced(true)
      setShowOrderSummary(false)
      clearCurrentOrder()
      
      setTimeout(() => {
        setIsOrderPlaced(false)
      }, 3000)
      
    } catch (error) {
      console.error('Error placing parcel order:', error)
      setError('Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  // Mark parcel as ready and send to bill counter
  const markParcelReady = async (orderId) => {
    setLoading(true)
    setError(null)

    try {
      const orderRef = ref(database, `orders/${orderId}`)
      
      await update(orderRef, {
        parcelStatus: 'ready',
        readyAt: new Date().toISOString(),
        status: 'active'
      })

      // Create notification for captain
      const notificationsRef = ref(database, 'notifications')
      await push(notificationsRef, {
        type: 'parcel_ready',
        message: `Parcel order #${parcelOrders.find(o => o.id === orderId)?.orderNumber} is ready`,
        orderId: orderId,
        createdAt: new Date().toISOString(),
        read: false
      })

      setShowParcelReadyModal(false)
      setSelectedParcelOrder(null)

    } catch (error) {
      console.error('Error marking parcel as ready:', error)
      setError('Failed to mark parcel as ready')
    } finally {
      setLoading(false)
    }
  }

  // Send parcel order to bill counter
  const sendParcelToBillCounter = async (orderId) => {
    setLoading(true)
    setError(null)

    try {
      const order = parcelOrders.find(o => o.id === orderId)
      if (!order) throw new Error('Order not found')

      // Update order status
      const orderRef = ref(database, `orders/${orderId}`)
      await update(orderRef, {
        parcelStatus: 'sent_to_bill',
        sentToBillAt: new Date().toISOString(),
        status: 'ready_for_billing'
      })

      // Create bill record
      const finalBill = {
        tableId: 'parcel',
        tableNumber: 'Parcel',
        floor: '2',
        orders: [{
          orderId: orderId,
          orderNumber: order.orderNumber,
          items: order.items,
          total: order.total,
          createdAt: order.createdAt
        }],
        finalTotal: order.total,
        completedAt: new Date().toISOString(),
        billNumber: Math.floor(10000 + Math.random() * 90000),
        status: 'pending',
        isParcel: true,
        parcelDetails: {
          sentToBillAt: new Date().toISOString(),
          sentBy: 'Captain'
        }
      }

      const billsRef = ref(database, 'bills')
      const newBillRef = await push(billsRef, finalBill)
      const billId = newBillRef.key

      // Update order with bill ID
      await update(orderRef, {
        billId: billId,
        status: 'sent_to_bill'
      })

      // Create notification for bill counter
      const notificationsRef = ref(database, 'notifications')
      await push(notificationsRef, {
        type: 'parcel_to_bill',
        message: `Parcel order #${order.orderNumber} sent to bill counter`,
        tableNumber: 'Parcel',
        orderId: orderId,
        billId: billId,
        billNumber: finalBill.billNumber,
        totalAmount: order.total,
        itemsCount: order.items?.length || 0,
        createdAt: new Date().toISOString(),
        read: false
      })

      setShowSendToBillModal(false)
      setSelectedParcelOrder(null)

      // Show success toast
      setShowBillSentToast(true)
      setTimeout(() => {
        setShowBillSentToast(false)
      }, 3000)

    } catch (error) {
      console.error('Error sending parcel to bill counter:', error)
      setError('Failed to send to bill counter')
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

  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0)

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
              <p className="text-sm text-gray-500">Parcel Order</p>
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
                onClick={submitParcelOrder}
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderParcelReadyModal = () => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl w-full max-w-md border border-gray-200/80 shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Parcel Ready</h3>
              <p className="text-sm text-gray-500">Order #{selectedParcelOrder?.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowParcelReadyModal(false)
              setSelectedParcelOrder(null)
            }}
            className="w-8 h-8 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="bg-emerald-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-800 mb-2">Mark this parcel order as ready from kitchen?</p>
            <div className="space-y-2">
              {selectedParcelOrder?.items?.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.quantity}x {item.name}</span>
                  <span className="font-medium text-emerald-600">₹{item.price * item.quantity}</span>
                </div>
              ))}
              {selectedParcelOrder?.items?.length > 3 && (
                <div className="text-sm text-gray-500 text-center">
                  +{selectedParcelOrder.items.length - 3} more items
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">Total:</span>
                <span className="text-lg font-bold text-emerald-600">₹{selectedParcelOrder?.total}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setShowParcelReadyModal(false)
                setSelectedParcelOrder(null)
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => markParcelReady(selectedParcelOrder?.id)}
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Check size={16} />
                  <span>Mark as Ready</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSendToBillModal = () => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl w-full max-w-md border border-gray-200/80 shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Receipt size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Send to Bill Counter</h3>
              <p className="text-sm text-gray-500">Order #{selectedParcelOrder?.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowSendToBillModal(false)
              setSelectedParcelOrder(null)
            }}
            className="w-8 h-8 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="bg-blue-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-800 mb-2">Send this parcel order to bill counter for final billing?</p>
            <div className="space-y-2">
              {selectedParcelOrder?.items?.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.quantity}x {item.name}</span>
                  <span className="font-medium text-blue-600">₹{item.price * item.quantity}</span>
                </div>
              ))}
              {selectedParcelOrder?.items?.length > 3 && (
                <div className="text-sm text-gray-500 text-center">
                  +{selectedParcelOrder.items.length - 3} more items
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-blue-100">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">Total Amount:</span>
                <span className="text-lg font-bold text-blue-600">₹{selectedParcelOrder?.total}</span>
              </div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-700">
                This will create a bill record and send notification to bill counter for final billing.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setShowSendToBillModal(false)
                setSelectedParcelOrder(null)
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => sendParcelToBillCounter(selectedParcelOrder?.id)}
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <ArrowRight size={16} />
                  <span>Send to Bill Counter</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen mt-14 bg-gradient-to-br from-emerald-50/50 to-gray-100">
      {/* App Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/captain')}
                className="flex items-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-xl transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="font-medium"></span>
              </button>
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Package size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Parcel Orders</h1>
                <p className="text-xs text-gray-500">Takeaway / Kitchen Orders</p>
              </div>
            </div>
            
            {isInitializing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
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
              <p className="font-medium text-gray-900">Parcel order sent to kitchen!</p>
              <p className="text-xs text-gray-500">Kitchen will prepare your order</p>
            </div>
          </div>
        </div>
      )}

      {showBillSentToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-4 flex items-center gap-3 animate-slideDown">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-blue-600" size={16} />
            </div>
            <div>
              <p className="font-medium text-gray-900">Parcel sent to bill counter!</p>
              <p className="text-xs text-gray-500">Ready for final billing</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-4">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="sticky rounded-2xl top-14 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
            <div className="p-4">
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
                  className={`px-3 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                    activeCategory === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  All
                </button>
                
                {/* Other Categories */}
                {Object.keys(menuItems).map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-3 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                      activeCategory === category
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
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
            {/* Active Parcel Orders */}
            {parcelOrders.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileText size={18} className="text-emerald-600" />
                    Active Parcel Orders ({parcelOrders.length})
                  </h3>
                  <div className="text-sm text-gray-500">
                    Total: ₹{parcelOrders.reduce((sum, order) => sum + (order.total || 0), 0)}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {parcelOrders.map(order => {
                    const isReady = order.parcelStatus === 'ready'
                    const isSentToBill = order.parcelStatus === 'sent_to_bill'
                    
                    return (
                      <div key={order.id} className={`bg-white rounded-xl border overflow-hidden ${
                        isSentToBill ? 'border-blue-200 shadow-sm' : 
                        isReady ? 'border-emerald-200 shadow-sm' : 'border-gray-200'
                      }`}>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                isSentToBill ? 'bg-blue-600 text-white' :
                                isReady ? 'bg-emerald-600 text-white' :
                                'bg-gray-600 text-white'
                              }`}>
                                #{order.orderNumber}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-emerald-600 text-lg">₹{order.total}</div>
                              <div className="text-xs text-gray-500">{order.items?.length || 0} items</div>
                            </div>
                          </div>
                          
                          {/* Order Items Preview */}
                          <div className="mb-3">
                            <div className="text-sm text-gray-700 font-medium mb-1">Items:</div>
                            <div className="space-y-1">
                              {order.items?.slice(0, 2).map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600 truncate">{item.quantity}x {item.name}</span>
                                  <span className="font-medium text-emerald-600">₹{item.price * item.quantity}</span>
                                </div>
                              ))}
                              {order.items?.length > 2 && (
                                <div className="text-xs text-gray-500 text-center">
                                  +{order.items.length - 2} more items
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status and Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              {order.parcelStatus === 'preparing' && (
                                <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                  🕐 Preparing
                                </span>
                              )}
                              {order.parcelStatus === 'ready' && (
                                <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                  ✓ Ready
                                </span>
                              )}
                              {order.parcelStatus === 'sent_to_bill' && (
                                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  📋 Sent to Bill
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {order.parcelStatus === 'preparing' && (
                                <button
                                  onClick={() => {
                                    setSelectedParcelOrder(order)
                                    setShowParcelReadyModal(true)
                                  }}
                                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                >
                                  <Check size={12} />
                                  <span>Mark Ready</span>
                                </button>
                              )}
                              
                              {order.parcelStatus === 'ready' && (
                                <button
                                  onClick={() => {
                                    setSelectedParcelOrder(order)
                                    setShowSendToBillModal(true)
                                  }}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                                >
                                  <ArrowRight size={12} />
                                  <span>Send to Bill</span>
                                </button>
                              )}
                              
                              {order.parcelStatus === 'sent_to_bill' && (
                                <div className="text-xs text-gray-500">
                                  Bill #: {order.billId ? order.billId.substring(0, 8) + '...' : 'Pending'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Menu Items */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ChefHat size={18} className="text-emerald-600" />
                  Menu Items
                </h3>
                <div className="text-sm text-gray-500">
                  {Object.keys(menuItems).reduce((count, category) => count + menuItems[category].length, 0)} items
                </div>
              </div>

              {/* Show all categories when 'All' is selected */}
              {activeCategory === 'all' ? (
                <div className="space-y-6">
                  {Object.keys(filteredMenuItems).length > 0 ? (
                    Object.keys(filteredMenuItems).map(category => (
                      <div key={category}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 px-2">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                /* Show specific category */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
          </div>

          {/* Bottom Action Bar */}
          <div className="sticky bottom-0 border-t rounded-2xl border-gray-100 bg-white/95 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {selectedItems.length > 0 ? (
                    <>
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center border border-emerald-200">
                        <ShoppingCart size={20} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">₹{totalAmount}</p>
                      </div>
                      <button
                        onClick={() => setShowOrderSummary(true)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                      >
                        <Send size={16} />
                        <span>Order</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <ShoppingCart size={20} />
                      <span className="font-medium">No items in cart</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {parcelOrders.length > 0 && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Active Orders</div>
                      <div className="font-semibold text-emerald-600">
                        {parcelOrders.length} order{parcelOrders.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showOrderSummary && renderOrderSummaryModal()}
      {showParcelReadyModal && renderParcelReadyModal()}
      {showSendToBillModal && renderSendToBillModal()}

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

export default ParcelPage