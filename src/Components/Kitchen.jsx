import React, { useEffect, useMemo, useRef, useState } from 'react'
import { off, onValue, push, ref, update } from 'firebase/database'
import { database } from '../Firebase/config'
import { Bell, CheckCircle, ChefHat, Play, Printer } from 'lucide-react'
import { printerService } from '../Components/printorder'

const Kitchen = () => {
  const [orders, setOrders] = useState({})
  const previousOrderIdsRef = useRef(new Set())
  const hasLoadedOrdersRef = useRef(false)
  const bellAudioRef = useRef(null)

  useEffect(() => {
    // prefer user-provided ring.mp3 in public/, fallback to oscillator if unavailable
    try {
      bellAudioRef.current = new Audio('/ring.mp3')
      bellAudioRef.current.preload = 'auto'
      bellAudioRef.current.addEventListener('error', () => {
        // if audio fails to load, release reference so fallback oscillator is used
        bellAudioRef.current = null
      })
    } catch (e) {
      bellAudioRef.current = null
    }
    return () => {
      bellAudioRef.current?.pause()
      bellAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    const ordersRef = ref(database, 'orders')

    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {}
      setOrders(data)

      const activeOrders = Object.entries(data).filter(([, order]) => order.status === 'active')
      const currentIds = new Set(activeOrders.map(([id]) => id))

      if (hasLoadedOrdersRef.current) {
        const hasNewOrder = activeOrders.some(([id, order]) => {
          const isNewSource =
            order.isNew ||
            order.isParcel ||
            order.source === 'captain' ||
            order.source === 'parcel'
          return !previousOrderIdsRef.current.has(id) && isNewSource
        })

        if (hasNewOrder) playOrderBell()
      }

      previousOrderIdsRef.current = currentIds
      hasLoadedOrdersRef.current = true
    })

    return () => off(ordersRef)
  }, [])

  const playOrderBell = () => {
    if (document.visibilityState !== 'visible') return

    if (bellAudioRef.current) {
      bellAudioRef.current.currentTime = 0
      bellAudioRef.current.play().catch(() => playFallbackBell())
      return
    }

    playFallbackBell()
  }

  const playFallbackBell = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()

      oscillator.connect(gain)
      gain.connect(audioContext.destination)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(860, audioContext.currentTime)
      gain.gain.setValueAtTime(0.001, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.25, audioContext.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.35)
    } catch (error) {
      console.error('Failed to play bell sound:', error)
    }
  }

  const getCounts = (order) => {
    const items = order.items || []
    const pending = items.filter((item) => item.status === 'pending').length
    const preparing = items.filter((item) => item.status === 'preparing').length
    const ready = items.filter((item) => item.status === 'ready').length
    return { pending, preparing, ready, total: items.length }
  }

  const startCookingOrder = async (orderId, shouldPrintKOT = false) => {
    const order = orders[orderId]
    if (!order || !order.items) return

    const now = new Date().toISOString()
    const updatedItems = order.items.map((item) =>
      item.status === 'pending'
        ? {
            ...item,
            status: 'preparing',
            startedAt: item.startedAt || now,
            updatedAt: now
          }
        : item
    )

    try {
      await update(ref(database, `orders/${orderId}`), {
        items: updatedItems,
        kotPrinted: shouldPrintKOT || !!order.kotPrinted,
        kotPrintedAt: shouldPrintKOT ? now : order.kotPrintedAt || null,
        startedCookingAt: order.startedCookingAt || now,
        updatedAt: now
      })

      if (shouldPrintKOT) {
        const orderItems = order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity
        }))
        const tableDisplay = order.tableNumber || 'Parcel'
        const orderNumber = order.orderNumber || orderId.slice(-4)
        await printerService.printKOT(orderItems, tableDisplay, orderNumber)
      }
    } catch (error) {
      console.error('Error starting cooking:', error)
    }
  }

  const markOrderReady = async (orderId) => {
    const order = orders[orderId]
    if (!order || !order.items) return

    const now = new Date().toISOString()

    try {
      const updatedItems = order.items.map((item) =>
        item.status === 'ready'
          ? item
          : {
              ...item,
              status: 'ready',
              updatedAt: now,
              startedAt: item.startedAt || now,
              completedAt: now
            }
      )

      const orderUpdates = {
        items: updatedItems,
        updatedAt: now,
        kitchenCompletedAt: now
      }

      if (order.isParcel) {
        orderUpdates.parcelStatus = 'ready'
        orderUpdates.readyAt = now
      }

      await update(ref(database, `orders/${orderId}`), orderUpdates)

      await push(ref(database, 'notifications'), {
        type: 'kitchen_complete',
        message: `Order #${order.orderNumber || orderId.slice(-4)} is ready for ${order.tableNumber || 'Parcel'}`,
        tableNumber: order.tableNumber || 'Parcel',
        tableId: order.tableId || 'parcel',
        orderId,
        createdAt: now,
        read: false
      })
    } catch (error) {
      console.error('Error marking order ready:', error)
    }
  }

  const printKOTOnly = async (orderId) => {
    const order = orders[orderId]
    if (!order || !order.items) return

    try {
      const tableDisplay = order.tableNumber || 'Parcel'
      const orderNumber = order.orderNumber || orderId.slice(-4)
      const orderItems = order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity
      }))

      await printerService.printKOT(orderItems, tableDisplay, orderNumber)
      await update(ref(database, `orders/${orderId}`), {
        kotPrinted: true,
        kotPrintedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error printing KOT:', error)
    }
  }

  const activeOrders = useMemo(
    () =>
      Object.entries(orders)
        .filter(([, order]) => order.status === 'active')
        .sort(([, a], [, b]) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)),
    [orders]
  )

  const stats = useMemo(() => {
    const counts = { pending: 0, preparing: 0, ready: 0 }
    activeOrders.forEach(([, order]) => {
      const c = getCounts(order)
      counts.pending += c.pending
      counts.preparing += c.preparing
      counts.ready += c.ready
    })
    return {
      ...counts,
      activeOrders: activeOrders.length
    }
  }, [activeOrders])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                <ChefHat size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Kitchen Display</h1>
                <p className="text-xs text-gray-500">Simple order workflow</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700">Pending: {stats.pending}</span>
              <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700">Cooking: {stats.preparing}</span>
              <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700">Ready: {stats.ready}</span>
              <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700">Orders: {stats.activeOrders}</span>
              <button
                onClick={playOrderBell}
                className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                title="Test bell"
              >
                <Bell size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {activeOrders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeOrders.map(([orderId, order]) => {
              const { pending, preparing, ready, total } = getCounts(order)
              const allStarted = pending === 0 && total > 0
              const allReady = ready === total && total > 0

              return (
                <div key={orderId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{order.tableNumber || 'Parcel'}</h3>
                        <p className="text-sm text-gray-500">Order #{order.orderNumber || orderId.slice(-4)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {order.isParcel && <span className="px-2 py-1 rounded-lg bg-purple-100 text-purple-700">Parcel</span>}
                        {order.kotPrinted && <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700">KOT Printed</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div className="bg-amber-50 text-amber-700 rounded-lg px-2 py-1 text-center">Pending {pending}</div>
                      <div className="bg-blue-50 text-blue-700 rounded-lg px-2 py-1 text-center">Cooking {preparing}</div>
                      <div className="bg-emerald-50 text-emerald-700 rounded-lg px-2 py-1 text-center">Ready {ready}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!allStarted && (
                        <button
                          onClick={() => startCookingOrder(orderId, true)}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Play size={16} />
                          <span className="text-sm">Print KOT & Start Cooking</span>
                        </button>
                      )}

                      {allStarted && !allReady && (
                        <button
                          onClick={() => markOrderReady(orderId)}
                          className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={16} />
                          <span className="text-sm">Food Ready</span>
                        </button>
                      )}

                      {allReady && (
                        <div className="flex-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium text-center text-sm">
                          Ready for Service
                        </div>
                      )}

                      <button
                        onClick={() => printKOTOnly(orderId)}
                        className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center gap-2"
                        title="Print KOT"
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                    {order.items?.map((item) => (
                      <div key={item.id} className="p-2 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-gray-900 truncate">{item.name}</span>
                            <span className="text-gray-500">x{item.quantity}</span>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : item.status === 'preparing'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {item.status === 'pending' ? 'Pending' : item.status === 'preparing' ? 'Cooking' : 'Ready'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
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
    </div>
  )
}

export default Kitchen

