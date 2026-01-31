import React, { useState, useMemo, useRef, useEffect } from 'react'
import { ref, push, update } from 'firebase/database'
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
  Bell,
  ChefHat,
  Edit,
  CreditCard,
  Loader2,
  AlertTriangle,
  Printer,
  Package,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

const OrderManager = ({
  selectedTable,
  menuItems,
  selectedItems,
  setSelectedItems,
  customerNotes,
  setCustomerNotes,
  searchTerm,
  setSearchTerm,
  activeCategory,
  setActiveCategory,
  showOrderSummary,
  setShowOrderSummary,
  showCompleteOrderModal,
  setShowCompleteOrderModal,
  showCancelOrderModal,
  setShowCancelOrderModal,
  showEditOrderModal,
  setShowEditOrderModal,
  orderToCancel,
  setOrderToCancel,
  orderToEdit,
  setOrderToEdit,
  loading,
  setLoading,
  error,
  setError,
  kitchenNotifications,
  activeOrders,
  tables,
  onBack,
  onOrderPlaced,
  onCompleteOrder,
  onMarkNotificationsRead,
  getTotalTableAmount,
  getActiveOrdersCount,
  editOrderItems,
  cancelOrder
}) => {
  const [editItems, setEditItems] = useState([])
  const [editNotes, setEditNotes] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const searchInputRef = useRef(null)

  // Filter menu items based on search and category
  const filteredMenuItems = useMemo(() => {
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

  // Generate search suggestions
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions([])
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
      return
    }

    const searchLower = searchTerm.toLowerCase().trim()
    const allItems = []
    
    // Flatten all menu items into a single array
    Object.keys(menuItems).forEach(category => {
      menuItems[category].forEach(item => {
        allItems.push({
          ...item,
          category
        })
      })
    })

    // Filter items based on search term
    const filteredSuggestions = allItems.filter(item =>
      item.name.toLowerCase().includes(searchLower) ||
      (item.description && item.description.toLowerCase().includes(searchLower))
    )

    setSuggestions(filteredSuggestions)
    setShowSuggestions(filteredSuggestions.length > 0)
    setSelectedSuggestionIndex(-1)
  }, [searchTerm, menuItems])

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
  }

  const clearCurrentOrder = () => {
    setSelectedItems([])
    setCustomerNotes('')
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
      // Generate order number
      const orderNumber = Math.floor(1000 + Math.random() * 9000)

      // Create order data
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
        orderNumber: orderNumber,
        captain: 'Captain',
        isNew: true,
        joinedGroup: tables[selectedTable.id]?.joinedGroup || null
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
      onOrderPlaced()
      setShowOrderSummary(false)
      clearCurrentOrder()

    } catch (error) {
      console.error('Error placing order:', error)
      setError('Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  const getTableOrders = (tableId) => {
    if (!tableId || !activeOrders) return []
    return Object.entries(activeOrders)
      .filter(([orderId, order]) => order.tableId === tableId && order.status === 'active')
      .map(([orderId, order]) => ({ id: orderId, ...order }))
  }

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

  const handleEditOrder = async () => {
    if (!orderToEdit) return
    await editOrderItems(orderToEdit.id, editItems, editNotes)
  }

  // Initialize edit modal when orderToEdit changes
  React.useEffect(() => {
    if (orderToEdit) {
      setEditItems(orderToEdit.items || [])
      setEditNotes(orderToEdit.customerNotes || '')
    }
  }, [orderToEdit])

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => 
        prev > 0 ? prev - 1 : suggestions.length - 1
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        const selectedItem = suggestions[selectedSuggestionIndex]
        addToOrder(selectedItem)
        // Don't clear search term or close suggestions
      } else if (searchTerm.trim() && suggestions.length > 0) {
        // Add first suggestion if no specific suggestion selected
        addToOrder(suggestions[0])
        // Don't clear search term or close suggestions
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }
  }

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0)

  // const renderMenuItemCard = (item) => {
  //   const inCart = selectedItems.find(i => i.id === item.id)

  //   return (
  //     <div
  //       key={item.id}
  //       className="bg-white rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors overflow-hidden"
  //     >
  //       <div className="p-4">
  //         <div className="flex justify-between items-start mb-3">
  //           <div className="flex-1">
  //             <div className="flex items-center gap-2 mb-2">
  //               <span className="text-2xl">{item.emoji}</span>
  //               {item.popular && (
  //                 <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">
  //                   Popular
  //                 </span>
  //               )}
  //             </div>
  //             <h3 className="font-semibold text-gray-900 text-base mb-1">{item.name}</h3>
  //             <div className="flex items-center gap-2 text-sm text-gray-500">
  //               <Clock size={14} />
  //               <span>{item.preparationTime} min</span>
  //               {item.spicy && <span className="text-red-500">🌶️</span>}
  //             </div>
  //           </div>
  //           <div className="text-right">
  //             <div className="font-bold text-emerald-600">₹{item.price}</div>
  //           </div>
  //         </div>

  //         {inCart ? (
  //           <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-1">
  //             <button
  //               onClick={() => handleQuantityChange(item.id, "minus", inCart.quantity)}
  //               className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
  //             >
  //               <Minus size={14} className="text-emerald-600" />
  //             </button>

  //             <div className="flex flex-col items-center">
  //               <span className="font-bold text-emerald-700">
  //                 {inCart.quantity}
  //               </span>
  //               <span className="text-xs text-emerald-600 font-medium">
  //                 in cart
  //               </span>
  //             </div>

  //             <button
  //               onClick={() => handleQuantityChange(item.id, "plus", inCart.quantity)}
  //               className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-colors"
  //             >
  //               <Plus size={14} className="text-white" />
  //             </button>
  //           </div>
  //         ) : (
  //           <button
  //             onClick={() => addToOrder(item)}
  //             className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
  //           >
  //             <Plus size={16} />
  //             <span>Add to Order</span>
  //           </button>
  //         )}
  //       </div>
  //     </div>
  //   )
  // }

  const renderMenuItemCard = (item) => {
    const inCart = selectedItems.find(i => i.id === item.id)
    
    // Handle minus button click with threshold check
    const handleMinusClick = () => {
        if (inCart && inCart.quantity > 0.5) {
            handleQuantityChange(item.id, "minus", inCart.quantity)
        } else if (inCart && inCart.quantity <= 0.5) {
            // Remove from cart when quantity is 0.5 or less
            handleQuantityChange(item.id, "remove", inCart.quantity)
        }
    }

    return (
        <div
            key={item.id}
            className="bg-white rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors overflow-hidden flex flex-col md:flex-row min-h-[140px] md:min-h-0"
        >
            {/* Left side - Emoji and info */}
            <div className="flex p-4 md:p-3 md:flex-1">
                <div className="mr-3 md:mr-4 flex-shrink-0">
                    <span className="text-3xl md:text-2xl block">{item.emoji}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1.5">
                        <h3 className="font-semibold text-gray-900 text-base md:text-sm truncate">
                            {item.name}
                        </h3>
                        {item.popular && (
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0">
                                Popular
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-sm md:text-xs text-gray-500 mb-2">
                        <Clock size={12} className="flex-shrink-0" />
                        <span>{item.preparationTime} min</span>
                        {item.spicy && <span className="text-red-500 ml-1">🌶️</span>}
                    </div>
                    
                    <div className="font-bold text-emerald-600 text-lg md:text-base">
                        ₹{item.price}
                    </div>
                </div>
            </div>

            {/* Right side - Quantity controls or Add button */}
            <div className="border-t md:border-t-0 md:border-l border-gray-100 p-4 md:p-3 flex-shrink-0">
                {inCart ? (
                    <div className="flex items-center justify-between md:flex-col md:items-end md:gap-2">
                        <div className="flex items-center gap-3 md:gap-2">
                            <button
                                onClick={handleMinusClick}
                                className="w-7 h-7 md:w-6 md:h-6 bg-emerald-50 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors flex-shrink-0"
                            >
                                <Minus size={12} className="text-emerald-600" />
                            </button>

                            <div className="flex flex-col items-center min-w-[40px]">
                                <span className="font-bold text-emerald-700 text-base">
                                    {inCart.quantity}
                                </span>
                                <span className="text-xs text-emerald-600 font-medium">
                                    in cart
                                </span>
                            </div>

                            <button
                                onClick={() => handleQuantityChange(item.id, "plus", inCart.quantity)}
                                className="w-7 h-7 md:w-6 md:h-6 bg-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-colors flex-shrink-0"
                            >
                                <Plus size={12} className="text-white" />
                            </button>
                        </div>
                        
                        {/* Total price for the item */}
                        <div className="text-right md:text-center">
                            <div className="font-bold text-gray-900 text-sm">
                                ₹{(item.price * inCart.quantity).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">Total</div>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => addToOrder(item)}
                        className="w-full md:w-auto py-2 px-4 bg-emerald-50 text-emerald-700 rounded-xl font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <Plus size={14} />
                        <span className="text-sm">Add</span>
                    </button>
                )}
            </div>
        </div>
    )
}

  const renderSuggestionItem = (item, index) => {
    const inCart = selectedItems.find(i => i.id === item.id)
    const isSelected = index === selectedSuggestionIndex

    return (
      <div
        key={`${item.id}-${index}`}
        className={`p-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
          isSelected ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-gray-50'
        }`}
        onClick={() => {
          addToOrder(item)
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xl">{item.emoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-800">{item.name}</h4>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                  {item.category}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {item.preparationTime} min
                </span>
                <span>₹{item.price}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {inCart ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-emerald-50 rounded-lg px-1 py-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleQuantityChange(item.id, "minus", inCart.quantity)
                    }}
                    className="w-5 h-5 bg-white border border-emerald-300 rounded flex items-center justify-center hover:bg-emerald-50 transition-colors"
                  >
                    <Minus size={8} className="text-emerald-600" />
                  </button>
                  <span className="font-medium text-emerald-700 text-xs min-w-[16px] text-center">
                    {inCart.quantity}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleQuantityChange(item.id, "plus", inCart.quantity)
                    }}
                    className="w-5 h-5 bg-emerald-100 rounded flex items-center justify-center hover:bg-emerald-200 transition-colors"
                  >
                    <Plus size={8} className="text-emerald-700" />
                  </button>
                </div>
                <div className="text-right min-w-[50px]">
                  <div className="text-xs font-medium text-emerald-600">
                    ₹{item.price * inCart.quantity}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  addToOrder(item)
                }}
                className="w-7 h-7 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center transition-colors"
              >
                <Plus size={12} className="text-emerald-600" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderSearchSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null

    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto z-30">
        <div className="p-2">
          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
            <span className="text-xs font-medium text-gray-500">
              {suggestions.length} item{suggestions.length !== 1 ? 's' : ''} found
            </span>
            <span className="text-xs text-gray-400">
              ↑↓ to navigate • Enter to select
            </span>
          </div>
          {suggestions.map((item, index) => renderSuggestionItem(item, index))}
        </div>
      </div>
    )
  }

  const renderSearchResultsContent = () => {
    if (!searchTerm.trim()) return null

    // Flatten all menu items for search results
    const allSearchItems = []
    Object.keys(filteredMenuItems).forEach(category => {
      if (Array.isArray(filteredMenuItems[category])) {
        filteredMenuItems[category].forEach(item => {
          allSearchItems.push({
            ...item,
            category
          })
        })
      }
    })

    if (allSearchItems.length === 0) return null

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="text-lg font-semibold text-gray-900">Search Results</h3>
          <span className="text-sm text-gray-500">
            {allSearchItems.length} item{allSearchItems.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {allSearchItems.map((item, index) => {
            const inCart = selectedItems.find(i => i.id === item.id)
            return (
              <div
                key={`search-${item.id}-${index}`}
                className={`p-3 border-b border-gray-100 last:border-b-0 ${inCart ? 'bg-emerald-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xl">{item.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-800">{item.name}</h4>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {item.preparationTime} min
                        </span>
                        <span>₹{item.price}</span>
                        {item.spicy && <span className="text-red-500">🌶️</span>}
                        {item.popular && (
                          <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {inCart ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-emerald-50 rounded-lg px-1 py-0.5">
                          <button
                            onClick={() => handleQuantityChange(item.id, "minus", inCart.quantity)}
                            className="w-6 h-6 bg-white border border-emerald-300 rounded flex items-center justify-center hover:bg-emerald-50 transition-colors"
                          >
                            <Minus size={10} className="text-emerald-600" />
                          </button>
                          <span className="font-medium text-emerald-700 text-sm min-w-[20px] text-center">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, "plus", inCart.quantity)}
                            className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center hover:bg-emerald-200 transition-colors"
                          >
                            <Plus size={10} className="text-emerald-700" />
                          </button>
                        </div>
                        <div className="text-right min-w-[50px]">
                          <div className="text-xs font-medium text-emerald-600">
                            ₹{item.price * inCart.quantity}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToOrder(item)}
                        className="w-8 h-8 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <Plus size={14} className="text-emerald-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
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
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Order</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Order will be sent to kitchen
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

  const renderEditOrderModal = () => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl w-full max-w-md border border-gray-200/80 shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Edit size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Edit Order #{orderToEdit?.orderNumber}</h3>
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
                onClick={handleEditOrder}
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

  const renderCompleteOrderModal = () => (
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
                      <button
                        onClick={() => {
                          setOrderToEdit(order)
                          setShowEditOrderModal(true)
                        }}
                        className="w-5 h-5 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors"
                        title="Edit order"
                      >
                        <Edit size={12} className="text-blue-500" />
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
              onClick={onCompleteOrder}
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
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
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
                  onClick={onMarkNotificationsRead}
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
                <AlertTriangle size={16} className="text-red-600" />
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

          {/* Search with Suggestions */}
          <div className="relative" ref={searchInputRef}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search all menu items..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowSuggestions(true)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (searchTerm.trim() && suggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
            />
            {showSuggestions && renderSearchSuggestions()}
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
        {/* Show search results when searching */}
        {searchTerm.trim() && renderSearchResultsContent()}

        {/* Show regular menu items when not searching or after search results */}
        {(!searchTerm.trim() || activeCategory !== 'all') && (
          activeCategory === 'all' ? (
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
          )
        )}
      </div>

      {/* Active Orders Sidebar (Mobile) */}
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
                    <span>Review Order</span>
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

      {/* Modals */}
      {showOrderSummary && renderOrderSummaryModal()}
      {showCancelOrderModal && renderCancelOrderModal()}
      {showEditOrderModal && renderEditOrderModal()}
      {showCompleteOrderModal && renderCompleteOrderModal()}
    </div>
  )
}

export default OrderManager