import React, { useState, useEffect } from 'react'
import { ref, push, onValue, off, remove, update } from 'firebase/database'
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
  Package
} from 'lucide-react'

const AddMenu = () => {
  const [menuItems, setMenuItems] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [loading, setLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    preparationTime: '',
    category: 'starters',
    emoji: '🍽️',
    popular: false
  })

  // Categories
  const categories = [
    { id: 'starters', name: 'Starters' },
    { id: 'mainCourse', name: 'Main Course' },
    { id: 'bread', name: 'Bread' },
    { id: 'panner', name: 'Panner' },
    { id: 'rice', name: 'Rice' },
    { id: 'noodles', name: 'Noodles' },
    { id: 'sahiSabji', name: 'Sahi Sabji' },
    { id: 'desserts', name: 'Desserts' },
    { id: 'beverages', name: 'Beverages' }
  ]

  // Emojis for food items
  const popularEmojis = [
    '🍕', '🍔', '🍟', '🌭', '🍿', '🥨', '🍗', '🍖', '🍤', '🍣',
    '🍜', '🍝', '🍛', '🍲', '🍱', '🥘', '🍙', '🍚', '🍘', '🥮',
    '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🍮', '🎂', '🍰', '🧁',
    '🍭', '🍬', '🍫', '🍩', '🍪', '🌮', '🌯', '🥙', '🥗', '🍳',
    '🥪', '🍠', '🍞', '🥐', '🥖', '🥞', '🧇', '🥛', '☕', '🍵',
    '🥤', '🍶', '🍺', '🍷', '🥃', '🍸', '🍹', '🍾'
  ]

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
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      preparationTime: '',
      category: 'starters',
      emoji: '🍽️',
      popular: false
    })
    setEditingItem(null)
  }

  // Save menu item
  const saveMenuItem = async () => {
    if (!formData.name || !formData.price || !formData.preparationTime) {
      alert('Please fill in all fields')
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
      } else {
        // Add new item
        const menuRef = ref(database, 'menuItems')
        const newItemRef = await push(menuRef, menuItemData)
        menuItemData.id = newItemRef.key
      }

      setShowAddModal(false)
      resetForm()

    } catch (error) {
      console.error('Error saving menu item:', error)
      alert('Failed to save menu item')
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
    if (!window.confirm('Delete this menu item?')) {
      return
    }

    try {
      const itemRef = ref(database, `menuItems/${itemId}`)
      await remove(itemRef)
    } catch (error) {
      console.error('Error deleting menu item:', error)
      alert('Failed to delete menu item')
    }
  }

  // Filter and search menu items
  const filteredItems = Object.entries(menuItems)
    .map(([id, item]) => ({ id, ...item }))
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen mt-14 bg-gradient-to-br from-gray-50 to-gray-100/50 p-3 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                <ChefHat className="text-red-600" size={18} />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 text-sm">Menu Items</h1>
                <p className="text-xs text-gray-500">Add and manage menu</p>
              </div>
            </div>

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
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 mb-3 overflow-x-auto">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filterCategory === 'all'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
          >
            All Items
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
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {filteredItems.map(item => (
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
                        <span className="text-xs text-gray-500 capitalize">{item.category}</span>
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
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 p-6 text-center">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-2">
              <Package className="text-gray-400" size={20} />
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">
              {searchTerm || filterCategory !== 'all' ? 'No items found' : 'No menu items'}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {searchTerm || filterCategory !== 'all'
                ? 'Try different search or filter'
                : 'Add your first menu item'
              }
            </p>
            <button
              onClick={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Add Item
            </button>
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
                  placeholder="Enter name"
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
                    placeholder="Minutes"
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
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Emoji Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Emoji
                </label>
                <div className="grid grid-cols-8 gap-1 max-h-24 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                  {popularEmojis.slice(0, 32).map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, emoji }))}
                      className={`w-7 h-7 text-base rounded hover:bg-gray-200 transition-colors flex items-center justify-center ${formData.emoji === emoji ? 'bg-red-100 border border-red-500' : ''
                        }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  name="emoji"
                  value={formData.emoji}
                  onChange={handleInputChange}
                  placeholder="Or type emoji"
                  className="w-full p-2 mt-1 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-red-500"
                  maxLength="2"
                />
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
                  <span>Mark as popular</span>
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
    </div>
  )
}

export default AddMenu