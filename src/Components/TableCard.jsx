// src/components/TableCard.jsx
import React from 'react'
import { Users, Clock, Eye } from 'lucide-react'

const TableCard = ({ table, onSelect }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'occupied': return 'bg-red-500'
      case 'reserved': return 'bg-yellow-500'
      case 'available': return 'bg-emerald-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'occupied': return 'Occupied'
      case 'reserved': return 'Reserved'
      case 'available': return 'Available'
      default: return 'Unknown'
    }
  }

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'occupied': return 'bg-red-50 border-red-100'
      case 'reserved': return 'bg-yellow-50 border-yellow-100'
      case 'available': return 'bg-emerald-50 border-emerald-100'
      default: return 'bg-gray-50 border-gray-100'
    }
  }

  return (
    <div 
      onClick={() => onSelect(table)}
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer group"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{table.displayName}</h3>
            <p className="text-gray-600 text-sm">Floor {table.floor}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(table.status)} text-white`}>
            {getStatusText(table.status)}
          </span>
        </div>

        <div className={`${getStatusBgColor(table.status)} rounded-xl p-4 mb-4`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Users size={16} />
                <span className="text-sm">Capacity:</span>
              </div>
              <span className="font-semibold text-gray-900">{table.capacity} Persons</span>
            </div>
            
            {table.currentOrder && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} />
                  <span className="text-sm">Order Amount:</span>
                </div>
                <span className="font-semibold text-yellow-600">₹{table.currentOrder.total || 0}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all group-hover:scale-[1.02] flex items-center justify-center gap-2">
          <Eye size={18} />
          {table.status === 'available' ? 'Take Order' : 'View Order'}
        </button>
      </div>
    </div>
  )
}

export default TableCard