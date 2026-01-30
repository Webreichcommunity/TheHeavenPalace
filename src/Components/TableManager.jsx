import React, { useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Link as LinkIcon,
  Unlink,
  Table,
  Building,
  Package,
  Grid,
  Menu,
  ChevronDown,
  ChevronRight,
  X,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react'

const TableManager = ({
  tables,
  activeOrders,
  viewMode,
  setViewMode,
  showTableJoinModal,
  setShowTableJoinModal,
  selectedTablesForJoin,
  setSelectedTablesForJoin,
  selectedFloor,
  setSelectedFloor,
  expandedFloors,
  setExpandedFloors,
  loading,
  setLoading,
  error,
  setError,
  onTableSelect,
  getTableActiveOrdersCount,
  joinTables,
  unjoinTables,
  isInitializing
}) => {
  // Floor configuration
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

  const getTableId = useCallback((tableNumber, floorId) => {
    if (floorId === '3') return `table-${tableNumber}`
    return `table-${floorId}-${tableNumber}`
  }, [])

  const getDisplayTableNumber = useCallback((tableId) => {
    const parts = tableId.split('-')
    if (parts.length === 2) return parts[1]
    return parts[2]
  }, [])

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

  const handleJoinTables = async () => {
    if (selectedTablesForJoin.length < 2) {
      setError('Select 2+ tables to join')
      setTimeout(() => setError(null), 3000)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await joinTables(selectedTablesForJoin)
      setShowTableJoinModal(false)
      setSelectedTablesForJoin([])
    } catch (error) {
      console.error('Error joining tables:', error)
      setError('Failed to join tables')
    } finally {
      setLoading(false)
    }
  }

  const handleUnjoinTables = async (tableId) => {
    try {
      await unjoinTables(tableId)
    } catch (error) {
      console.error('Error unjoining tables:', error)
      setError('Failed to unjoin tables')
    }
  }

  const handleTableClick = (tableNumber, floorId) => {
    const tableId = getTableId(tableNumber, floorId)
    const table = {
      id: tableId,
      number: tableNumber,
      floor: floorId,
      displayName: floorConfig.find(f => f.id === floorId)?.tables.find(t => t.number === tableNumber)?.displayName || `T${tableNumber}`
    }
    onTableSelect(table)
  }

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
                onClick={handleJoinTables}
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
                        const ordersCount = getTableActiveOrdersCount(tableId)
                        const isJoined = tables[tableId]?.isJoined

                        return (
                          <div key={tableId} className="relative">
                            <button
                              onClick={() => handleTableClick(table.number, floor.id)}
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
                                  handleUnjoinTables(tableId)
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
              const ordersCount = getTableActiveOrdersCount(tableId)

              return (
                <button
                  key={tableId}
                  onClick={() => handleTableClick(table.number, floor.id)}
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

  return (
    <>
      {renderTableSelection()}
      {showTableJoinModal && renderTableJoinModal()}
    </>
  )
}

export default TableManager