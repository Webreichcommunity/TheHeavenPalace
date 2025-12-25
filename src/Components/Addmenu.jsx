import React, { useState, useEffect } from 'react'
import { ref, push, onValue, off, remove, update, set } from 'firebase/database'
import { database } from '../Firebase/config'
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Clock,
  DollarSign,
  TrendingUp,
  Search,
  ChefHat,
  Package,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'

const AddMenu = () => {
  const [menuItems, setMenuItems] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [loading, setLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkData, setBulkData] = useState('')
  const [bulkPreview, setBulkPreview] = useState([])
  const [uploadMessage, setUploadMessage] = useState({ type: '', text: '' })

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    preparationTime: '',
    category: '', // Default to first category
    emoji: '🍔',
    popular: false
  })

  // Categories with default emojis
  const categories = [
    { id: 'hotandbuns', name: 'Hot And Buns', emoji: '🍔' },
    { id: 'shakesandmocktail', name: 'Shakes And Mocktail', emoji: '🥤' },
    { id: 'pasta', name: 'Pasta', emoji: '🍝' },
    { id: 'friesandburger', name: 'Fries And Burger', emoji: '🍟' },
    { id: 'papad', name: 'Papad', emoji: '🥠' },
    { id: 'pizzaandsandwich', name: 'Pizza And Sandwich', emoji: '🍕' },
    { id: 'sizzler', name: 'Sizzler', emoji: '🥘' },
    { id: 'soupandstarters', name: 'Soup And Starter', emoji: '🍲' },
    { id: 'chinesenoodlesandrice', name: 'Chinese Noodles And Rice', emoji: '🍜' },
    { id: 'tandooristarters', name: 'Tandoori Starter', emoji: '🍢' },
    { id: 'paneerkakamal', name: 'Paneer Ka Kamal', emoji: '🧀' },
    { id: 'vegkhajana', name: 'Veg Khajana', emoji: '🥗' },
    { id: 'varhadi', name: 'Varhadi', emoji: '🌶️' },
    { id: 'dalandrice', name: 'Dal And Rice', emoji: '🍚' },
    { id: 'rolls', name: 'Roll', emoji: '🌯' },
    { id: 'tandoori', name: 'Tandoori', emoji: '🍗' },
    { id: 'brownie', name: 'Brownie', emoji: '🍫' },
  ]

  // Emojis for each category
  const categoryEmojis = {
    hotandbuns: ['🍔', '🌭', '🥐', '🥪', '🥞', '🧇'],
    shakes: ['🥤', '🍹', '🍸', '🧃', '🥛', '🍵'],
    pasta: ['🍝', '🍜', '🥘', '🍲'],
    fries: ['🍟', '🍔', '🧅', '🥔'],
    papad: ['🥠', '🍘', '🥨'],
    pizza: ['🍕', '🥪', '🌮', '🌯'],
    sizzler: ['🥘', '🍳', '🔥', '🍖'],
    soup: ['🍲', '🥣', '🥘', '🍜'],
    chinese: ['🍜', '🍚', '🥢', '🥡'],
    starter: ['🍢', '🍤', '🥓', '🥠'],
    paneerkakamal: ['🧀', '🥘', '🍛', '🥄'],
    veg: ['🥗', '🥦', '🥒', '🍆'],
    varhadi: ['🌶️', '🥘', '🍛', '🔥'],
    dal: ['🍚', '🥘', '🥣', '🍲'],
    roll: ['🌯', '🌮', '🥙', '🥓'],
    tandoori: ['🍗', '🍖', '🔥', '🍢'],
    brownie: ['🍫', '🍰', '🧁', '🍮']
  }

  // Fetch menu items
  useEffect(() => {
    const menuRef = ref(database, 'menuItems')

    const unsubscribe = onValue(menuRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setMenuItems(data)
      }
    })

    return () => off(menuRef)
  }, [])

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Update emoji when category changes
    if (name === 'category' && categoryEmojis[value]) {
      setFormData(prev => ({
        ...prev,
        emoji: categoryEmojis[value][0]
      }))
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      preparationTime: '',
      category: 'hotandbuns',
      emoji: '🍔',
      popular: false
    })
    setEditingItem(null)
    setUploadMessage({ type: '', text: '' })
  }

  // Generate Firebase-like ID
  const generateFirebaseId = () => {
    return '-' + Math.random().toString(36).substr(2, 9) +
      Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  // Get random emoji for category
  const getRandomEmojiForCategory = (category) => {
    const emojis = categoryEmojis[category] || ['🍽️'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  // Save menu item
  const saveMenuItem = async () => {
    if (!formData.name || !formData.price || !formData.preparationTime) {
      setUploadMessage({ type: 'error', text: 'Please fill in all fields' })
      return
    }

    setLoading(true)

    const menuItemData = {
      name: formData.name.trim(),
      price: parseInt(formData.price),
      preparationTime: parseInt(formData.preparationTime),
      category: formData.category,
      emoji: formData.emoji,
      popular: formData.popular,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      if (editingItem) {
        // Update existing item
        const itemRef = ref(database, `menuItems/${editingItem.id}`)
        await update(itemRef, {
          ...menuItemData,
          updatedAt: new Date().toISOString()
        })
        setUploadMessage({ type: 'success', text: 'Menu item updated successfully!' })
      } else {
        // Add new item
        const menuRef = ref(database, 'menuItems')
        const newItemRef = await push(menuRef, menuItemData)
        menuItemData.id = newItemRef.key
        setUploadMessage({ type: 'success', text: 'Menu item added successfully!' })
      }

      setTimeout(() => {
        setShowAddModal(false)
        resetForm()
      }, 1500)

    } catch (error) {
      console.error('Error saving menu item:', error)
      setUploadMessage({ type: 'error', text: 'Failed to save menu item' })
    } finally {
      setLoading(false)
    }
  }

  // Edit menu item
  const editMenuItem = (item) => {
    setFormData({
      name: item.name,
      price: item.price.toString(),
      preparationTime: item.preparationTime.toString(),
      category: item.category,
      emoji: item.emoji,
      popular: item.popular || false
    })
    setEditingItem(item)
    setShowAddModal(true)
  }

  // Delete menu item
  const deleteMenuItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) {
      return
    }

    try {
      const itemRef = ref(database, `menuItems/${itemId}`)
      await remove(itemRef)
      setUploadMessage({ type: 'success', text: 'Menu item deleted successfully!' })
      setTimeout(() => setUploadMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error deleting menu item:', error)
      setUploadMessage({ type: 'error', text: 'Failed to delete menu item' })
    }
  }

  // Parse bulk data
  const parseBulkData = () => {
    try {
      const lines = bulkData.split('\n').filter(line => line.trim())
      const items = lines.map((line, index) => {
        const parts = line.split(',').map(part => part.trim())
        
        // Expected format: Name, Price, Category (optional)
        if (parts.length < 2) {
          throw new Error(`Invalid format on line ${index + 1}. Expected: Name, Price, Category(optional)`)
        }

        const name = parts[0]
        const price = parseInt(parts[1])
        const category = parts[2] || 'hotandbuns'
        
        if (!name || isNaN(price)) {
          throw new Error(`Invalid data on line ${index + 1}`)
        }

        // Validate category
        const validCategory = categories.find(cat => cat.id === category.toLowerCase()) 
          ? category.toLowerCase() 
          : 'hotandbuns'

        return {
          name,
          price,
          category: validCategory,
          emoji: getRandomEmojiForCategory(validCategory),
          preparationTime: Math.floor(Math.random() * 15) + 5, // Random prep time 5-20 min
          popular: Math.random() > 0.8 // 20% chance of being popular
        }
      })

      setBulkPreview(items)
      setUploadMessage({ type: 'info', text: `Found ${items.length} valid items` })
    } catch (error) {
      setUploadMessage({ type: 'error', text: error.message })
      setBulkPreview([])
    }
  }

  // Upload bulk items
  const uploadBulkItems = async () => {
    if (bulkPreview.length === 0) {
      setUploadMessage({ type: 'error', text: 'No items to upload' })
      return
    }

    setBulkLoading(true)
    setUploadMessage({ type: 'info', text: `Uploading ${bulkPreview.length} items...` })

    try {
      const menuRef = ref(database, 'menuItems')
      const timestamp = new Date().toISOString()

      // Upload each item
      for (const item of bulkPreview) {
        const itemId = generateFirebaseId()
        const itemRef = ref(database, `menuItems/${itemId}`)
        
        await set(itemRef, {
          ...item,
          createdAt: timestamp,
          updatedAt: timestamp
        })
      }

      setUploadMessage({ type: 'success', text: `Successfully uploaded ${bulkPreview.length} items!` })
      setTimeout(() => {
        setShowBulkModal(false)
        setBulkData('')
        setBulkPreview([])
        resetForm()
      }, 2000)

    } catch (error) {
      console.error('Error uploading bulk items:', error)
      setUploadMessage({ type: 'error', text: 'Failed to upload items. Please try again.' })
    } finally {
      setBulkLoading(false)
    }
  }

  // Download template
  const downloadTemplate = () => {
    const template = `Paneer Tikka, 250, starter
Chicken Biryani, 300, varhadi
Garlic Naan, 50, hotandbuns
Mango Shake, 80, shakes
Chocolate Brownie, 120, brownie
Spring Roll, 90, roll

Format: Item Name, Price, Category (optional)
Available categories: ${categories.map(cat => cat.id).join(', ')}`
    
    const blob = new Blob([template], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'menu_template.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Filter and search menu items
  const filteredItems = Object.entries(menuItems)
    .map(([id, item]) => ({ id, ...item }))
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      // Sort by category first, then name
      if (a.category !== b.category) {
        const catA = categories.findIndex(cat => cat.id === a.category)
        const catB = categories.findIndex(cat => cat.id === b.category)
        return catA - catB
      }
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="min-h-screen mt-14 bg-gradient-to-br from-gray-50 to-gray-100/50 p-3 md:p-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Message Display */}
        {uploadMessage.text && (
          <div className={`mb-3 p-3 rounded-lg border ${uploadMessage.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : uploadMessage.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <div className="flex items-center gap-2">
              {uploadMessage.type === 'success' ? (
                <CheckCircle2 size={16} />
              ) : uploadMessage.type === 'error' ? (
                <AlertCircle size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span className="text-sm font-medium">{uploadMessage.text}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 p-3 mb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                <ChefHat className="text-red-600" size={18} />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 text-sm">Menu Items</h1>
                <p className="text-xs text-gray-500">Manage your restaurant menu</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
              >
                <Upload size={14} />
                <span>Bulk Upload</span>
              </button>
              <button
                onClick={() => {
                  resetForm()
                  setShowAddModal(true)
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 p-3 mb-3">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-red-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.emoji} {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 mb-3 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filterCategory === 'all'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
          >
            📋 All Items
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setFilterCategory(category.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filterCategory === category.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
            >
              {category.emoji} {category.name}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 p-3">
            <div className="text-xs text-gray-500">Total Items</div>
            <div className="text-lg font-bold text-gray-800">{Object.keys(menuItems).length}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 p-3">
            <div className="text-xs text-gray-500">Showing</div>
            <div className="text-lg font-bold text-emerald-600">{filteredItems.length}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 p-3">
            <div className="text-xs text-gray-500">Popular Items</div>
            <div className="text-lg font-bold text-yellow-600">
              {Object.values(menuItems).filter(item => item.popular).length}
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 p-3">
            <div className="text-xs text-gray-500">Categories</div>
            <div className="text-lg font-bold text-blue-600">{categories.length}</div>
          </div>
        </div>

        {/* Menu Items Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {filteredItems.map(item => {
              const categoryInfo = categories.find(cat => cat.id === item.category) || categories[0]
              return (
                <div
                  key={item.id}
                  className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 overflow-hidden hover:shadow-sm transition-shadow"
                >
                  {/* Item Header */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{item.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-sm truncate">{item.name}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">
                            {categoryInfo.emoji} {categoryInfo.name}
                          </span>
                          {item.popular && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium flex items-center gap-0.5">
                              <TrendingUp size={10} />
                              <span>Popular</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Item Details */}
                  <div className="p-3">
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <DollarSign size={12} />
                          <span>Price</span>
                        </div>
                        <span className="font-bold text-red-600 text-sm">₹{item.price}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock size={12} />
                          <span>Prep Time</span>
                        </div>
                        <span className="font-medium text-gray-800 text-sm">{item.preparationTime} min</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => editMenuItem(item)}
                        className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 rounded text-xs font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        className="flex-1 py-1.5 bg-red-50 text-red-600 rounded text-xs font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 p-6 text-center">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-2">
              <Package className="text-gray-400" size={20} />
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">
              {searchTerm || filterCategory !== 'all' ? 'No items found' : 'No menu items yet'}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {searchTerm || filterCategory !== 'all'
                ? 'Try a different search term or select another category'
                : 'Start by adding your first menu item'
              }
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1"
              >
                <Upload size={14} />
                <span>Bulk Upload</span>
              </button>
              <button
                onClick={() => {
                  resetForm()
                  setShowAddModal(true)
                }}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg w-full max-w-md shadow-xl border border-gray-200/50">
            {/* Modal Header */}
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                  <ChefHat className="text-red-600" size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{editingItem ? 'Edit Item' : 'Add Item'}</h3>
                  <p className="text-xs text-gray-500">Fill in the item details</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3 space-y-3">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter item name"
                  className="w-full p-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Price and Prep Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="Price"
                    min="0"
                    className="w-full p-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Prep Time (min)
                  </label>
                  <input
                    type="number"
                    name="preparationTime"
                    value={formData.preparationTime}
                    onChange={handleInputChange}
                    placeholder="Preparation time"
                    min="0"
                    className="w-full p-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full p-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-red-500"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.emoji} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Emoji Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Emoji
                </label>
                <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                  {categoryEmojis[formData.category]?.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, emoji }))}
                      className={`w-8 h-8 text-lg rounded hover:bg-gray-200 transition-colors flex items-center justify-center ${formData.emoji === emoji ? 'bg-red-100 border-2 border-red-500' : ''
                        }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    name="emoji"
                    value={formData.emoji}
                    onChange={handleInputChange}
                    placeholder="Or type emoji"
                    className="flex-1 p-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-red-500"
                    maxLength="2"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      emoji: getRandomEmojiForCategory(prev.category)
                    }))}
                    className="px-2 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                  >
                    Random
                  </button>
                </div>
              </div>

              {/* Popular Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="popular"
                  id="popular"
                  checked={formData.popular}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-red-500 rounded focus:ring-red-500"
                />
                <label htmlFor="popular" className="flex items-center gap-1 text-xs font-medium text-gray-700">
                  <TrendingUp size={12} />
                  <span>Mark as popular item</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-gray-100">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMenuItem}
                  disabled={loading}
                  className="flex-1 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={14} />
                      <span>{editingItem ? 'Update' : 'Save'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg w-full max-w-2xl shadow-xl border border-gray-200/50">
            {/* Modal Header */}
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded flex items-center justify-center">
                  <Upload className="text-emerald-600" size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Bulk Upload Menu Items</h3>
                  <p className="text-xs text-gray-500">Upload multiple items at once</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBulkModal(false)
                  setBulkData('')
                  setBulkPreview([])
                  resetForm()
                }}
                className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3 space-y-3">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-blue-600 mt-0.5" size={14} />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">Format Instructions:</p>
                    <p>• One item per line</p>
                    <p>• Format: <code className="bg-white px-1 rounded">Item Name, Price, Category(optional)</code></p>
                    <p>• Example: <code className="bg-white px-1 rounded">Paneer Tikka, 250, starter</code></p>
                    <p>• If no category specified, "hotandbuns" will be used</p>
                    <p className="mt-1">Available categories: {categories.map(cat => cat.id).join(', ')}</p>
                  </div>
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Paste your menu items
                </label>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  onBlur={parseBulkData}
                  placeholder="Paneer Tikka, 250, starter
Chicken Biryani, 300, varhadi
Garlic Naan, 50, hotandbuns
Mango Shake, 80, shakes
..."
                  rows="6"
                  className="w-full p-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Preview */}
              {bulkPreview.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-700">
                      Preview ({bulkPreview.length} items)
                    </label>
                    <span className="text-xs text-emerald-600 font-medium">
                      All items are valid ✓
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 text-xs font-medium text-gray-500">Item</th>
                          <th className="text-left p-2 text-xs font-medium text-gray-500">Price</th>
                          <th className="text-left p-2 text-xs font-medium text-gray-500">Category</th>
                          <th className="text-left p-2 text-xs font-medium text-gray-500">Emoji</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {bulkPreview.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="p-2">{item.name}</td>
                            <td className="p-2">₹{item.price}</td>
                            <td className="p-2">
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                                {item.category}
                              </span>
                            </td>
                            <td className="p-2 text-lg">{item.emoji}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={downloadTemplate}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Download size={14} />
                  <span>Download Template</span>
                </button>
                <button
                  onClick={parseBulkData}
                  className="flex-1 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                >
                  <CheckCircle2 size={14} />
                  <span>Validate Data</span>
                </button>
                <button
                  onClick={uploadBulkItems}
                  disabled={bulkLoading || bulkPreview.length === 0}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {bulkLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Upload {bulkPreview.length} Items</span>
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
}

export default AddMenu