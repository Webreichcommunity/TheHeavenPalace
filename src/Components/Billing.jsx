import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ref, onValue, off, update, remove, query, orderByChild } from 'firebase/database'
import { database } from '../Firebase/config'
import { ArrowLeft, Printer, CheckCircle, History, Bell, MessageCircle, Download, Filter, Search, X, CreditCard, FileText, Calendar, Clock, Users, IndianRupee, Bluetooth, AlertCircle, ChevronDown } from 'lucide-react'

// Global Bluetooth connection state (same as BluetoothPrinter.jsx)
let globalBluetoothConnection = {
  device: null,
  characteristic: null,
  connected: false
}

const Billing = () => {
  const [finalBill, setFinalBill] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [taxRate] = useState(0)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('current')
  const [billHistory, setBillHistory] = useState([])
  const [showNewBillNotification, setShowNewBillNotification] = useState(false)
  const [newBillData, setNewBillData] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTable, setFilterTable] = useState('')
  const [bluetoothConnected, setBluetoothConnected] = useState(globalBluetoothConnection.connected)
  const [printerDevice, setPrinterDevice] = useState(globalBluetoothConnection.device)
  const [printerCharacteristic, setPrinterCharacteristic] = useState(globalBluetoothConnection.characteristic)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMode, setPaymentMode] = useState('')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  // Local storage for paid bills history
  const [localBillHistory, setLocalBillHistory] = useState([])

  // Initialize Bluetooth connection state from global
  useEffect(() => {
    setBluetoothConnected(globalBluetoothConnection.connected)
    setPrinterDevice(globalBluetoothConnection.device)
    setPrinterCharacteristic(globalBluetoothConnection.characteristic)
  }, [])

  // Load local bill history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('paidBillHistory')
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory)
        const sortedHistory = parsedHistory.sort((a, b) =>
          new Date(b.paidAt || b.completedAt) - new Date(a.paidAt || a.completedAt)
        )
        setLocalBillHistory(sortedHistory)
      } catch (error) {
        console.error('Error loading local bill history:', error)
      }
    }
  }, [])

  // Save bill to local storage history
  const saveBillToLocalHistory = (bill) => {
    const billWithPaidInfo = {
      ...bill,
      paymentStatus: 'paid',
      paidAt: new Date().toISOString(),
      paymentMode: paymentMode,
      id: `local_${Date.now()}`
    }

    const updatedHistory = [billWithPaidInfo, ...localBillHistory]
    setLocalBillHistory(updatedHistory)

    try {
      localStorage.setItem('paidBillHistory', JSON.stringify(updatedHistory))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  // Fetch bills from Firebase
  useEffect(() => {
    let billId = location.state?.billId
    let tablesRef = null
    let billRef = null
    let billsHistoryRef = null

    const fetchBillById = (id) => {
      if (!id) return
      billRef = ref(database, `bills/${id}`)
      onValue(billRef, (snapshot) => {
        const data = snapshot.val()
        if (data) {
          setFinalBill({ id, ...data })
        }
        setLoading(false)
      }, (error) => {
        console.error('Error fetching bill:', error)
        setLoading(false)
      })
    }

    // Fetch all bills from Firebase
    const fetchAllBills = () => {
      billsHistoryRef = query(
        ref(database, 'bills'),
        orderByChild('completedAt')
      )

      onValue(billsHistoryRef, (snapshot) => {
        const billsData = snapshot.val()
        if (billsData) {
          const billsArray = Object.entries(billsData)
            .map(([id, bill]) => ({ id, ...bill }))
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
          setBillHistory(billsArray)
        } else {
          setBillHistory([])
        }
      }, (error) => {
        console.error('Error fetching bills:', error)
        setBillHistory([])
      })
    }

    // If billId provided in navigation state, fetch it
    if (billId) {
      fetchBillById(billId)
      fetchAllBills()
      return () => {
        if (billRef) off(billRef)
        if (billsHistoryRef) off(billsHistoryRef)
      }
    }

    // Otherwise, try to find a table record that has a currentBill and fetch that bill
    tablesRef = ref(database, 'tables')
    const unsubscribeTables = onValue(tablesRef, (snapshot) => {
      const tables = snapshot.val() || {}
      const candidates = Object.entries(tables)
        .filter(([, t]) => t && t.currentBill && t.currentBill.id)
        .map(([id, t]) => ({ tableKey: id, tableNumber: t.number || id, currentBill: t.currentBill }))

      if (candidates.length === 0) {
        setLoading(false)
        return
      }

      candidates.sort((a, b) => (b.currentBill.createdAt || 0) - (a.currentBill.createdAt || 0))
      const chosen = candidates[0]
      billId = chosen.currentBill.id
      fetchBillById(billId)
    })

    fetchAllBills()

    return () => {
      if (tablesRef) off(tablesRef)
      if (billRef) off(billRef)
      if (billsHistoryRef) off(billsHistoryRef)
    }
  }, [location.state])

  // Bluetooth connection functions (from BluetoothPrinter.jsx)
  const connectBluetooth = async () => {
    if (!navigator.bluetooth) {
      alert('Bluetooth is not supported in this browser. Please use Chrome or Edge on Android.')
      return null
    }

    try {
      setIsPrinting(true)

      console.log('Requesting Bluetooth device...')
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb'
        ]
      })

      device.addEventListener?.('gattserverdisconnected', () => {
        console.log('Bluetooth device disconnected')
        globalBluetoothConnection.connected = false
        setBluetoothConnected(false)
        setPrinterDevice(null)
        setPrinterCharacteristic(null)
      })

      console.log('Connecting to GATT server...')
      const server = await device.gatt.connect()
      console.log('Getting primary services...')
      const services = await server.getPrimaryServices()

      let foundChar = null
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics()
          for (const c of characteristics) {
            if (c.properties && (c.properties.write || c.properties.writeWithoutResponse)) {
              foundChar = c
              break
            }
          }
          if (foundChar) break
        } catch (err) {
          console.warn('Could not read characteristics for service', service.uuid, err)
        }
      }

      if (!foundChar) {
        try { server.disconnect?.() } catch (e) { /* ignore */ }
        setIsPrinting(false)
        alert('Connected to printer but no writable characteristic found. Many portable printers use Bluetooth Classic (SPP) which browsers cannot access. If your printer supports BLE, enable BLE mode.')
        return null
      }

      globalBluetoothConnection.device = device
      globalBluetoothConnection.characteristic = foundChar
      globalBluetoothConnection.connected = true

      setPrinterDevice(device)
      setPrinterCharacteristic(foundChar)
      setBluetoothConnected(true)
      setIsPrinting(false)

      console.log('Bluetooth printer connected', device.name || device.id, foundChar.uuid)
      return { device, characteristic: foundChar }
    } catch (error) {
      console.error('Bluetooth connection failed:', error)
      setIsPrinting(false)
      setBluetoothConnected(false)
      if (error?.name === 'NotFoundError') {
        alert('No Bluetooth printer found / selected. Make sure printer is ON and in BLE mode.')
      } else if (error?.name === 'SecurityError') {
        alert('Bluetooth permission denied. Please allow Bluetooth access.')
      } else {
        alert(`Bluetooth connection failed: ${error?.message || error}`)
      }
      return null
    }
  }

  const disconnectBluetooth = async () => {
    if (globalBluetoothConnection.device && globalBluetoothConnection.device.gatt.connected) {
      try {
        await globalBluetoothConnection.device.gatt.disconnect()
        console.log('Bluetooth disconnected')
      } catch (error) {
        console.error('Error disconnecting:', error)
      }
    }

    globalBluetoothConnection.device = null
    globalBluetoothConnection.characteristic = null
    globalBluetoothConnection.connected = false

    setBluetoothConnected(false)
    setPrinterDevice(null)
    setPrinterCharacteristic(null)

    alert('Bluetooth printer disconnected')
  }

  // ESC/POS printing functions
   const canvasToEscPosRaster = (canvas) => {
    const ctx = canvas.getContext('2d')

    // Thermal printer width (58mm, approximately 384px)
    const printerWidth = 370

    // Create centered canvas
    const centeredCanvas = document.createElement('canvas')
    centeredCanvas.width = printerWidth
    centeredCanvas.height = canvas.height

    const cctx = centeredCanvas.getContext('2d')

    // White background
    cctx.fillStyle = '#fff'
    cctx.fillRect(0, 0, printerWidth, centeredCanvas.height)

    // Center original canvas
    const offsetX = Math.floor((printerWidth - canvas.width) / 2)
    cctx.drawImage(canvas, offsetX, 0)

    const width = centeredCanvas.width
    const height = centeredCanvas.height
    const widthBytes = Math.ceil(width / 8)

    const imageData = cctx.getImageData(0, 0, width, height).data
    const rasterData = new Uint8Array(widthBytes * height)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const luminance =
          0.299 * imageData[i] +
          0.587 * imageData[i + 1] +
          0.114 * imageData[i + 2]

        if (luminance < 160) {
          const byteIndex = y * widthBytes + (x >> 3)
          rasterData[byteIndex] |= (0x80 >> (x % 8))
        }
      }
    }

    const header = [0x1D, 0x76, 0x30, 0x00]
    const xL = widthBytes & 0xff
    const xH = (widthBytes >> 8) & 0xff
    const yL = height & 0xff
    const yH = (height >> 8) & 0xff

    const command = new Uint8Array(header.length + 4 + rasterData.length)
    let offset = 0
    command.set(header, offset); offset += header.length
    command[offset++] = xL
    command[offset++] = xH
    command[offset++] = yL
    command[offset++] = yH
    command.set(rasterData, offset)

    return command
  }

  const escapeHtml = (str) => {
    if (str === null || str === undefined) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

   const generateBillHTML = (bill, totals, options = {}) => {
    const restaurantName = "THE HEAVEN PALACE"
    const address = "Near Rajeshwar Dudh Dairy, Dabki Road, Akola"
    const phone = "+91 9518344550"
    const gstNo = "GSTIN: 27ABCDE1234F1Z5"

    const taxRate = totals.taxRate || 5
    const discount = totals.discount || 0

    let html = `
  <div style="
    width:200px;
    padding:6px 10px;
    background:#fff;
    font-family:Arial, Helvetica, sans-serif;
    font-size:13px;
    color:#000;
    box-sizing:border-box;
  ">

    <!-- HEADER -->
    <div style="text-align:center; padding-bottom:6px; border-bottom:1px solid #000;">
      <div style="font-size:16px; font-weight:bold;">
        ${restaurantName}
      </div>
      ${options.isReprint ? '<div style="font-size:12px;font-weight:bold;margin-top:2px;">REPRINT COPY</div>' : ''}
      <div style="font-size:11px; margin-top:3px;">
        ${address}
      </div>
      <div style="font-size:11px; margin-top:2px;">
        ${phone}
      </div>
    </div>

    <!-- BILL INFO -->
    <div style="padding:6px 0;">
      <div style="display:flex; justify-content:space-between;">
        <span>Bill: ${escapeHtml(bill.billNumber)}</span>
        <span>Table: ${escapeHtml(bill.tableNumber)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:1px;">
        <span>${new Date(bill.completedAt).toLocaleDateString('en-IN')}</span>
        <span>${new Date(bill.completedAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })}</span>
      </div>
    </div>

    <!-- ITEMS HEADER -->
    <div style="
      text-align:center;
      font-weight:bold;
      padding:6px 0;
      border-bottom:1px solid #000;
      margin-bottom:2px;
    ">
      ORDER DETAILS
    </div>

    <!-- ITEMS -->
    <div>
  `

    bill.orders.forEach(order => {
      order.items.forEach(item => {
        const itemName = escapeHtml(item.name)
        const qty = item.quantity
        const price = item.price
        const amount = qty * price

        html += `
        <div style="padding:4px 0;margin-bottom:4px;">
          <div style="font-weight:bold;font-size:12px;">
            ${itemName}
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:2px;font-size:12px;">
            <span>${qty} x ₹${price.toFixed(2)}</span>
            <span>₹${amount.toFixed(2)}</span>
          </div>
        </div>
      `
      })
    })

    html += `
    </div>

    <!-- SUMMARY -->
    <div style="border-top:1px solid #000; padding-top:1px; margin-top:2px;border-bottom:1px solid #000;padding-bottom:10px;">
      <div style="display:flex; justify-content:space-between;">
        <span>Subtotal</span>
        <span>₹${totals.subtotal.toFixed(2)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:bold; margin-top:5px;">
        <span>TOTAL</span>
        <span>₹${totals.subtotal.toFixed(2)}</span>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="text-align:center; margin-top:4px; font-size:12px;margin-bottom:20px;">
      <div>Served with <span style="font-weight:bold;font-style:italic;">love</span>, remembered with <span style="font-weight:bold;font-style:italic;">taste</span></div>
      <div style="margin-top:2px;"><span style="font-weight:bold;font-style:italic;">Thank you!</span> We look forward to serving you again</div>
       <div style="margin-top:4px;font-size:7px;"><span style="font-weight:bold;font-style:italic;">WebReich Solutions</span></div>
    </div>

  </div>
  `

    return html
  }

  const encodeText = (text) => new TextEncoder().encode(text)

  const loadReceiptLogo = async () => {
    try {
      const image = new Image()
      image.crossOrigin = 'anonymous'

      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = '/logo.svg'
      })

      const logoWidth = 112
      const logoHeight = 58
      const canvas = document.createElement('canvas')
      canvas.width = logoWidth
      canvas.height = logoHeight

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, logoWidth, logoHeight)

      const scale = Math.min(logoWidth / image.naturalWidth, logoHeight / image.naturalHeight)
      const drawWidth = Math.floor(image.naturalWidth * scale)
      const drawHeight = Math.floor(image.naturalHeight * scale)
      const offsetX = Math.floor((logoWidth - drawWidth) / 2)
      const offsetY = Math.floor((logoHeight - drawHeight) / 2)
      ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)

      return canvasToEscPosRaster(canvas)
    } catch (error) {
      console.warn('Receipt logo could not be loaded:', error)
      return new Uint8Array()
    }
  }

  const buildEscPosBillPayload = async (bill, totals, options = {}) => {
    const receiptWidth = 35
    const tableWidth = 33
    const restaurantName = 'THE HEAVEN PALACE'
    const address = 'Near Rajeshwar Dudh Dairy, Dabki Road, Akola'
    const phone = '+91 8055608910'
    const bytes = []

    const pushBytes = (...values) => bytes.push(...values)
    const pushText = (text = '') => bytes.push(...encodeText(text))
    const alignCenter = () => pushBytes(0x1B, 0x61, 0x01)
    const boldOn = () => pushBytes(0x1B, 0x45, 0x01)
    const boldOff = () => pushBytes(0x1B, 0x45, 0x00)
    const normalSize = () => pushBytes(0x1D, 0x21, 0x00)
    const doubleHeight = () => pushBytes(0x1D, 0x21, 0x01)
    const smallLineGap = () => {
      pushBytes(0x1B, 0x33, 0x08)
      pushText('\n')
      pushBytes(0x1B, 0x32)
    }
    const line = () => pushText(`${'-'.repeat(receiptWidth)}\n`)
    const cleanText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
    const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`
    const trimToWidth = (value, width) => {
      const text = cleanText(value)
      return text.length > width ? text.slice(0, Math.max(0, width - 1)) : text
    }
    const centerText = (value) => {
      const text = cleanText(value)
      pushText(`${text}\n`)
    }
    const tableLine = () => pushText(`${'-'.repeat(tableWidth)}\n`)
    const tableText = (value) => {
      const text = trimToWidth(value, tableWidth)
      pushText(`${text}${' '.repeat(Math.max(0, tableWidth - text.length))}\n`)
    }
    const tableSplitLine = (left, right) => {
      const rightText = trimToWidth(right, Math.min(12, tableWidth - 2))
      const leftText = trimToWidth(left, tableWidth - rightText.length - 1)
      const gap = Math.max(1, tableWidth - leftText.length - rightText.length)
      pushText(`${leftText}${' '.repeat(gap)}${rightText}\n`)
    }
    const wrapText = (value, width = receiptWidth) => {
      const words = cleanText(value).split(' ').filter(Boolean)
      const lines = []
      let current = ''

      words.forEach((word) => {
        if (!current) {
          current = word
          return
        }

        if ((current.length + 1 + word.length) <= width) {
          current += ` ${word}`
        } else {
          lines.push(current)
          current = word
        }
      })

      if (current) lines.push(current)
      return lines.length ? lines : ['']
    }

    pushBytes(0x1B, 0x40)
    normalSize()
    alignCenter()
    const logo = await loadReceiptLogo()
    if (logo.length) {
      pushBytes(...logo)
      pushText('\n')
    }
    boldOn()
    doubleHeight()
    centerText(restaurantName)
    normalSize()
    if (options.isReprint) centerText('REPRINT COPY')
    boldOff()
    wrapText(address, receiptWidth).forEach(centerText)
    centerText(phone)
    line()

    alignCenter()
    centerText(`Bill: ${bill.billNumber}  Table: ${bill.tableNumber}`)
    centerText(`${new Date(bill.completedAt).toLocaleDateString('en-IN')}  ${new Date(bill.completedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      })}`)
    pushText('\n')

    alignCenter()
    boldOn()
    centerText('ORDER DETAILS')
    boldOff()
    alignCenter()
    tableLine()
    boldOn()
    tableSplitLine('ITEM', 'AMOUNT')
    boldOff()
    tableLine()

    bill.orders.forEach(order => {
      order.items.forEach(item => {
        const qty = Number(item.quantity || 0)
        const price = Number(item.price || 0)
        const amount = qty * price

        boldOn()
        alignCenter()
        wrapText(item.name, tableWidth).forEach(tableText)
        boldOff()
        tableSplitLine(`${qty} x ${money(price)}`, money(amount))
        pushText('\n')
      })
    })

    tableLine()
    boldOn()
    doubleHeight()
    tableSplitLine('TOTAL', money(totals.subtotal))
    normalSize()
    boldOff()
    smallLineGap()

    alignCenter()
    centerText('Served with love,')
    centerText('remembered with taste')
    boldOn()
    centerText('Thank you!')
    boldOff()
    centerText('We look forward to serving')
    centerText('you again')
    centerText('WebReich')
    pushText('\n')
    pushBytes(0x1B, 0x64, 0x05)
    pushBytes(0x1D, 0x56, 0x00)

    return new Uint8Array(bytes)
  }

  const sendPrinterPayload = async (characteristic, payload) => {
    const chunkSize = 180

    for (let i = 0; i < payload.length; i += chunkSize) {
      const slice = payload.slice(i, i + chunkSize)
      if (characteristic.properties.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(slice)
      } else {
        await characteristic.writeValue(slice)
      }
    }
  }


  const printBillToPrinter = async (characteristic, bill, totals, options = {}) => {
    try {
      const payload = await buildEscPosBillPayload(bill, totals, options)
      await sendPrinterPayload(characteristic, payload)
      return true
    } catch (error) {
      console.error('Print error:', error)
      throw error
    }
  }

  // Main print function
  const printBill = async (billToPrint = finalBill, options = {}) => {
    if (!billToPrint) {
      alert('No bill to print')
      return
    }

    setIsPrinting(true)

    try {
      let connection
      if (globalBluetoothConnection.connected && globalBluetoothConnection.device?.gatt?.connected) {
        connection = {
          device: globalBluetoothConnection.device,
          characteristic: globalBluetoothConnection.characteristic,
        }
      } else {
        connection = await connectBluetooth()
      }

      if (!connection?.characteristic) {
        setIsPrinting(false)
        return
      }

      const totals = calculateTotals(billToPrint, options.discount ?? discount)
      await printBillToPrinter(connection.characteristic, billToPrint, totals, options)

      alert(options.isReprint ? 'Bill reprinted successfully.' : 'Bill printed successfully.')
    } catch (error) {
      console.error('Printing failed:', error)

      // Fallback to browser print
      const totals = calculateTotals(billToPrint, options.discount ?? discount)
      const printWindow = window.open('', '_blank')

      printWindow.document.write(`
        <html>
          <head>
            <title>${options.isReprint ? 'Reprint ' : ''}Bill #${billToPrint.billNumber}</title>
            <style>
              @media print {
                body { 
                  font-family: 'Courier New', monospace;
                  width: 90mm;
                  margin: 0;
                  padding: 8px;
                  font-size: 12px;
                }
                .header { text-align: center; margin-bottom: 10px; }
                .item { margin: 4px 0; }
                .item-name { font-weight: bold; }
                .total { font-weight: bold; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
                .thank-you { text-align: center; margin-top: 10px; font-style: italic; }
                .payment-info { font-size: 10px; margin-top: 5px; padding-top: 5px; border-top: 1px dashed #000; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>THE HEAVEN PLACE</h2>
              ${options.isReprint ? '<p><strong>REPRINT COPY</strong></p>' : ''}
              <p>Bill #: ${billToPrint.billNumber}</p>
              <p>Table: ${billToPrint.tableNumber}</p>
              <p>${new Date(billToPrint.completedAt).toLocaleDateString()} ${new Date(billToPrint.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              ${billToPrint.paymentMode ? `<p>Payment: ${billToPrint.paymentMode}</p>` : ''}
              <hr>
            </div>
            
            <div class="items">
              ${billToPrint.orders.map(order =>
        order.items.map(item => `
                  <div class="item">
                    <div class="item-name">${item.name}</div>
                    <div>x${item.quantity} = ₹${item.price * item.quantity}</div>
                  </div>
                `).join('')
      ).join('')}
            </div>
            
            <hr>
            <div>
              <div>Subtotal: ₹${totals.subtotal.toFixed(2)}</div>
              <div>GST (${taxRate}%): ₹${totals.tax.toFixed(2)}</div>
              <div>Discount: ₹${discount.toFixed(2)}</div>
              <div class="total">TOTAL: ₹${totals.total.toFixed(2)}</div>
            </div>
            
            ${billToPrint.paymentMode ? `
            <div class="payment-info">
              <div><strong>Payment Mode:</strong> ${billToPrint.paymentMode}</div>
              <div><strong>Status:</strong> PAID</div>
              <div><strong>Paid At:</strong> ${new Date(billToPrint.paidAt || billToPrint.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            ` : ''}
            
            <div class="thank-you">
              <p>Thank You!</p>
              <p>Visit Again</p>
            </div>
            <script>
              window.onload = () => {
                window.print();
                window.onafterprint = () => window.close();
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()

    } finally {
      setIsPrinting(false)
    }
  }

  // Helper functions
  const calculateTotals = (bill, appliedDiscount = discount) => {
    if (!bill) return { subtotal: 0, tax: 0, total: 0 }

    const subtotal = bill.finalTotal
    const tax = (subtotal * taxRate) / 100
    const total = subtotal + 0 - appliedDiscount

    return { subtotal, tax, total, discount: appliedDiscount, taxRate }
  }

  const markAsPaid = async (billId) => {
    try {
      const billRef = ref(database, `bills/${billId}`)
      await update(billRef, {
        paymentStatus: 'paid',
        paidAt: new Date().toISOString()
      })

      const bill = billHistory.find(b => b.id === billId)
      if (bill) {
        saveBillToLocalHistory(bill)
        alert('Bill marked as paid and saved to history!')
      }
    } catch (error) {
      console.error('Error marking bill as paid:', error)
      alert('Failed to update bill status')
    }
  }

  const deleteBill = async (billId) => {
    if (!billId) return
    const ok = window.confirm('Delete this unpaid bill? This cannot be undone.')
    if (!ok) return

    try {
      // remove bill from Firebase
      await remove(ref(database, `bills/${billId}`))

      // Also clear any table currentBill referencing this bill
      // iterate tables to find references (best-effort)
      const tablesRef = ref(database, 'tables')
      onValue(tablesRef, (snapshot) => {
        const tables = snapshot.val() || {}
        Object.entries(tables).forEach(([tableId, table]) => {
          if (table?.currentBill?.id === billId) {
            update(ref(database, `tables/${tableId}`), { currentBill: null }).catch(() => {})
          }
        })
      }, { onlyOnce: true })

      alert('Bill deleted')
    } catch (error) {
      console.error('Failed to delete bill:', error)
      alert('Failed to delete bill')
    }
  }

  const completeBillingProcess = async () => {
    if (!finalBill) return

    setPaymentMode((prev) => prev || 'Cash')
    setShowPaymentModal(true)
  }

  const handleCompleteBilling = async () => {
    if (!finalBill) return
    if (!paymentMode) return

    setIsProcessingPayment(true)

    try {
      // First, mark as paid
      if (finalBill.id) {
        const billRef = ref(database, `bills/${finalBill.id}`)
        await update(billRef, {
          paymentStatus: 'paid',
          paidAt: new Date().toISOString(),
          paymentMode: paymentMode
        })
      }

      // Save to local history with payment mode
      saveBillToLocalHistory({ ...finalBill, paymentMode })

      // Print the bill
      await printBill()

      // Remove from Firebase and table
      if (finalBill.id) {
        const billRef = ref(database, `bills/${finalBill.id}`)
        await remove(billRef)
      }

      if (finalBill.tableId) {
        const tableRef = ref(database, `tables/${finalBill.tableId}`)
        await update(tableRef, {
          currentBill: null
        })
      }

      setIsCompleted(true)

      setTimeout(() => {
        navigate('/captain')
      }, 2000)

    } catch (error) {
      console.error('Error completing billing:', error)
      alert('Failed to complete billing. Please try again.')
    } finally {
      setIsProcessingPayment(false)
      setShowPaymentModal(false)
      setPaymentMode('')
    }
  }

  const handlePaidAndPrint = async (bill) => {
    if (!bill) return
    
    setFinalBill(bill)
    setActiveTab('current')
    setPaymentMode('Cash')
    setShowPaymentModal(true)
  }

  const loadBillFromHistory = (bill) => {
    setFinalBill(bill)
    setActiveTab('current')
    setDiscount(0)
  }

  const handleReprintBill = async (bill) => {
    if (!bill) return
    setDiscount(0)
    setFinalBill(bill)
    await printBill(bill, { isReprint: true, discount: 0 })
  }

  const filteredBills = (bills) => {
    return bills.filter(bill => {
      const matchesSearch = bill.billNumber?.toString().includes(searchTerm) ||
        bill.tableNumber?.toString().includes(searchTerm)
      const matchesTable = !filterTable || bill.tableNumber?.toString() === filterTable
      return matchesSearch && matchesTable
    })
  }

  const unpaidBills = billHistory.filter(bill => bill.paymentStatus !== 'paid')
  const paidBills = [...localBillHistory]
  const visibleUnpaidBills = filteredBills(unpaidBills)
  const visiblePaidBills = filteredBills(paidBills)
  const totals = finalBill ? calculateTotals(finalBill) : { subtotal: 0, tax: 0, total: 0 }

  const groupBillsByDate = (bills) => {
    const grouped = {}
    bills.forEach(bill => {
      const date = new Date(bill.paidAt || bill.completedAt).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(bill)
    })
    return grouped
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading bills...</p>
        </div>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="text-emerald-600" size={32} />
          </div>
          <h3 className="text-lg font-bold text-emerald-800 mb-2">Billing Completed!</h3>
          <p className="text-gray-600">Bill saved to history successfully</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen mt-14 bg-gradient-to-b from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/captain')}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-700" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Billing System</h1>
                  <p className="text-sm text-gray-600">Manage bills and payments</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-500">Pending Bills</div>
                <div className="text-lg font-bold text-red-600">{unpaidBills.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bluetooth Status */}
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-white rounded-lg shadow-sm border p-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${bluetoothConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <div className="flex items-center gap-2">
                  <Bluetooth className={bluetoothConnected ? "text-green-500" : "text-gray-400"} size={18} />
                  <span className="text-sm text-gray-700">
                    Printer: {bluetoothConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {!bluetoothConnected && (
                  <button
                    onClick={connectBluetooth}
                    className="ml-4 text-sm px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>

              {bluetoothConnected && (
                <button
                  onClick={disconnectBluetooth}
                  className="text-sm px-3 py-1 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex bg-white rounded-lg shadow-sm border mb-6 overflow-hidden">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 py-3 text-sm font-medium transition-all ${activeTab === 'current'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              Current Bill
            </button>
            <button
              onClick={() => setActiveTab('unpaid')}
              className={`flex-1 py-3 text-sm font-medium transition-all ${activeTab === 'unpaid'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              Unpaid Bills ({unpaidBills.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 text-sm font-medium transition-all ${activeTab === 'history'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              History
            </button>
          </div>

          {(activeTab === 'unpaid' || activeTab === 'history') && (
            <div className="bg-white rounded-xl border p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search bill no or table"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
                <select
                  value={filterTable}
                  onChange={(e) => setFilterTable(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
                >
                  <option value="">All tables</option>
                  {[...new Set([...unpaidBills, ...paidBills].map((bill) => bill.tableNumber).filter(Boolean))].map((table) => (
                    <option key={table} value={table}>{table}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Current Bill View */}
          {activeTab === 'current' && (
            <div className="space-y-6">
              {finalBill ? (
                <>
                  {/* Bill Header */}
                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                            Bill #{finalBill.billNumber}
                          </div>
                          <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                            Table {finalBill.tableNumber}
                          </div>
                          <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {unpaidBills.some(b => b.id === finalBill.id) ? 'Unpaid' : 'Paid'}
                          </div>
                          {finalBill.paymentMode && (
                            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                              Paid via {finalBill.paymentMode}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(finalBill.completedAt).toLocaleDateString('en-IN', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {new Date(finalBill.completedAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Order Items</h3>
                      <div className="space-y-3">
                        {finalBill.orders.map((order, orderIndex) => (
                          <div key={orderIndex} className="bg-gray-50 rounded-lg p-4">
                            <div className="text-xs text-gray-500 mb-2">Order #{order.orderNumber}</div>
                            <div className="space-y-2">
                              {order.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="flex justify-between items-center">
                                  <div>
                                    <div className="font-medium text-gray-900">{item.name}</div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      ₹{item.price} × {item.quantity}
                                    </div>
                                  </div>
                                  <div className="text-lg font-bold text-gray-900">
                                    ₹{item.price * item.quantity}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="bg-gray-50 rounded-lg p-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Payment Summary</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                        </div>
                      
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Discount</span>
                          <input
                            type="number"
                            value={discount}
                            onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-right text-sm focus:outline-none focus:border-red-500"
                            min="0"
                            max={totals.subtotal + totals.tax}
                            step="0.01"
                          />
                        </div>
                        <div className="border-t pt-3 mt-3">
                          <div className="flex justify-between text-lg font-bold text-gray-900">
                            <span>TOTAL AMOUNT</span>
                            <span>₹{totals.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col gap-3">
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          onClick={completeBillingProcess}
                          disabled={isProcessingPayment || finalBill.paymentStatus === 'paid'}
                          className="py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessingPayment ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={18} />
                              <span>{finalBill.paymentStatus === 'paid' ? 'Already Completed' : 'Complete & Print Bill'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Current Bill</h3>
                  <p className="text-gray-500">Select a bill from unpaid bills or history</p>
                </div>
              )}
            </div>
          )}

          {/* Unpaid Bills View */}
          {activeTab === 'unpaid' && (
            <div className="space-y-4">
              {visibleUnpaidBills.length > 0 ? (
                visibleUnpaidBills.map((bill) => (
                  <div key={bill.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-lg font-bold text-gray-900">Bill #{bill.billNumber}</div>
                          <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Unpaid</div>
                          {bill.isParcel && (
                            <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">Parcel</div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Users size={14} />
                            Table {bill.tableNumber}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {new Date(bill.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">₹{bill.finalTotal}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(bill.completedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => loadBillFromHistory(bill)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handlePaidAndPrint(bill)}
                        className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                      >
                        Pay & Print
                      </button>
                      <button
                        onClick={() => deleteBill(bill.id)}
                        className="flex-1 py-2.5 bg-white border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Matching Unpaid Bills</h3>
                  <p className="text-gray-500">Try clearing search or table filter</p>
                </div>
              )}
            </div>
          )}

          {/* History View */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {visiblePaidBills.length > 0 ? (
                Object.entries(groupBillsByDate(visiblePaidBills)).map(([date, bills]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="text-red-600" size={18} />
                      <h3 className="text-lg font-bold text-gray-900">{date}</h3>
                      <span className="ml-auto px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {bills.length} bills
                      </span>
                    </div>
                    <div className="space-y-3">
                      {bills.map((bill) => (
                        <div key={bill.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="text-lg font-bold text-gray-900">Bill #{bill.billNumber}</div>
                                <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">Paid</div>
                                {bill.isParcel && (
                                  <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">Parcel</div>
                                )}
                                {bill.paymentMode && (
                                  <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                    {bill.paymentMode}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Users size={14} />
                                  Table {bill.tableNumber}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock size={14} />
                                  {new Date(bill.paidAt || bill.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-emerald-600">₹{bill.finalTotal}</div>
                              <div className="text-sm text-gray-500">
                                Paid: {new Date(bill.paidAt || bill.completedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              onClick={() => loadBillFromHistory(bill)}
                              className="py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                            >
                              View Bill Details
                            </button>
                            <button
                              onClick={() => handleReprintBill(bill)}
                              disabled={isPrinting}
                              className="py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <Printer size={16} />
                              <span>{isPrinting ? 'Printing...' : 'Reprint'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                  <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Matching Bill History</h3>
                  <p className="text-gray-500">Try clearing search or table filter</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Select Payment Mode</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Other'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all ${paymentMode === mode
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{mode}</span>
                      {paymentMode === mode && (
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <CheckCircle size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteBilling}
                  disabled={!paymentMode || isProcessingPayment}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingPayment ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Confirm & Print'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Billing
