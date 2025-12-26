// src/utils/printorder.jsx
import { AlertCircle, Bluetooth } from 'lucide-react';

// Global Bluetooth connection state
export let globalBluetoothConnection = {
  device: null,
  characteristic: null,
  connected: false
};

// Printer service class
class PrinterService {
  constructor() {
    this.html2canvas = null;
  }

  // Initialize html2canvas dynamically
  async loadHtml2Canvas() {
    if (!this.html2canvas) {
      const module = await import('html2canvas');
      this.html2canvas = module.default;
    }
    return this.html2canvas;
  }

  // Connect to Bluetooth printer
  async connectBluetooth(onStateChange = null) {
    if (!navigator.bluetooth) {
      alert('Bluetooth is not supported in this browser. Please use Chrome or Edge on Android.');
      return null;
    }

    try {
      console.log('Requesting Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb'
        ]
      });

      device.addEventListener?.('gattserverdisconnected', () => {
        console.log('Bluetooth device disconnected');
        globalBluetoothConnection.connected = false;
        globalBluetoothConnection.device = null;
        globalBluetoothConnection.characteristic = null;
        if (onStateChange) onStateChange(false, device, null);
      });

      console.log('Connecting to GATT server...');
      const server = await device.gatt.connect();
      console.log('Getting primary services...');
      const services = await server.getPrimaryServices();

      let foundChar = null;
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const c of characteristics) {
            if (c.properties && (c.properties.write || c.properties.writeWithoutResponse)) {
              foundChar = c;
              break;
            }
          }
          if (foundChar) break;
        } catch (err) {
          console.warn('Could not read characteristics for service', service.uuid, err);
        }
      }

      if (!foundChar) {
        try { server.disconnect?.() } catch (e) { /* ignore */ }
        alert('Connected to printer but no writable characteristic found. Many portable printers use Bluetooth Classic (SPP) which browsers cannot access. If your printer supports BLE, enable BLE mode.');
        return null;
      }

      globalBluetoothConnection.device = device;
      globalBluetoothConnection.characteristic = foundChar;
      globalBluetoothConnection.connected = true;

      if (onStateChange) onStateChange(true, device, foundChar);
      
      console.log('Bluetooth printer connected', device.name || device.id, foundChar.uuid);
      return { device, characteristic: foundChar };
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      if (error?.name === 'NotFoundError') {
        alert('No Bluetooth printer found / selected. Make sure printer is ON and in BLE mode.');
      } else if (error?.name === 'SecurityError') {
        alert('Bluetooth permission denied. Please allow Bluetooth access.');
      } else {
        alert(`Bluetooth connection failed: ${error?.message || error}`);
      }
      return null;
    }
  }

  // Disconnect Bluetooth printer
  async disconnectBluetooth(onStateChange = null) {
    if (globalBluetoothConnection.device && globalBluetoothConnection.device.gatt.connected) {
      try {
        await globalBluetoothConnection.device.gatt.disconnect();
        console.log('Bluetooth disconnected');
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }

    globalBluetoothConnection.device = null;
    globalBluetoothConnection.characteristic = null;
    globalBluetoothConnection.connected = false;

    if (onStateChange) onStateChange(false, null, null);
    alert('Bluetooth printer disconnected');
  }

  // Convert canvas to ESC/POS raster image
  canvasToEscPosRaster(canvas) {
    const ctx = canvas.getContext('2d');
    const printerWidth = 370;
    const centeredCanvas = document.createElement('canvas');
    
    centeredCanvas.width = printerWidth;
    centeredCanvas.height = canvas.height;

    const cctx = centeredCanvas.getContext('2d');
    cctx.fillStyle = '#fff';
    cctx.fillRect(0, 0, printerWidth, centeredCanvas.height);

    const offsetX = Math.floor((printerWidth - canvas.width) / 2);
    cctx.drawImage(canvas, offsetX, 0);

    const width = centeredCanvas.width;
    const height = centeredCanvas.height;
    const widthBytes = Math.ceil(width / 8);
    const imageData = cctx.getImageData(0, 0, width, height).data;
    const rasterData = new Uint8Array(widthBytes * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const luminance = 0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2];

        if (luminance < 160) {
          const byteIndex = y * widthBytes + (x >> 3);
          rasterData[byteIndex] |= (0x80 >> (x % 8));
        }
      }
    }

    const header = [0x1D, 0x76, 0x30, 0x00];
    const xL = widthBytes & 0xff;
    const xH = (widthBytes >> 8) & 0xff;
    const yL = height & 0xff;
    const yH = (height >> 8) & 0xff;

    const command = new Uint8Array(header.length + 4 + rasterData.length);
    let offset = 0;
    command.set(header, offset); offset += header.length;
    command[offset++] = xL;
    command[offset++] = xH;
    command[offset++] = yL;
    command[offset++] = yH;
    command.set(rasterData, offset);

    return command;
  }

  // Escape HTML special characters
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Generate HTML for kitchen order slip
  generateOrderPrintHTML(orderData, tableNumber, orderNumber) {
    const restaurantName = "THE HEAVEN PALACE";
    const address = "Near Rajeshwar Dudh Dairy, Dabki Road, Akola";

    return `
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
         
          <div style="font-size:13px; margin-top:3px;">
            KITCHEN ORDER
          </div>
        </div>

        <!-- ORDER INFO -->
        <div style="padding:6px 0;">
          <div style="display:flex; justify-content:space-between;">
            <span style="font-weight:bold;">Order #${orderNumber}</span>
            <span style="font-weight:bold;">Table: ${tableNumber}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:2px;">
            <span>${new Date().toLocaleDateString('en-IN')}</span>
            <span>${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <!-- ORDER ITEMS -->
        <div style="
          text-align:center;
          font-weight:bold;
          padding:6px 0;
          margin:8px 0;
          border-top:1px solid #000;
          border-bottom:1px solid #000;
        ">
          ORDER ITEMS
        </div>

        <!-- ITEMS LIST -->
        <div>
          ${orderData.items.map(item => `
            <div style="
              padding:6px 0;
              border-bottom:1px dashed #ccc;
              margin-bottom:4px;
            ">
              <div style="font-weight:bold; font-size:14px;">
                ${this.escapeHtml(item.name)}
              </div>
              <div style="display:flex; justify-content:space-between; margin-top:3px;">
                <span style="font-weight:bold; font-size:13px;">Qty: ${item.quantity}</span>
                <span style="font-weight:bold; font-size:13px;">₹${(item.price * item.quantity).toFixed(2)}</span>
              </div>
              ${item.specialInstructions ? `
                <div style="font-size:11px; color:#d97706; margin-top:2px; font-style:italic;">
                  Note: ${this.escapeHtml(item.specialInstructions)}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- ORDER SUMMARY -->
        <div style="
          border-top:1px solid #000;
          padding-top:8px;
          margin-top:8px;
        ">
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:2px;">
            <span>Total Items:</span>
            <span style="font-weight:bold;">${orderData.items.length}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:14px; margin-top:4px; font-weight:bold;">
            <span>TOTAL:</span>
            <span>₹${orderData.total.toFixed(2)}</span>
          </div>
        </div>

        <!-- KITCHEN NOTES -->
        <div style="
          margin-top:12px;
          padding:8px;
          background:#fff7ed;
          border:1px dashed #d97706;
          border-radius:4px;
        ">
          <div style="font-weight:bold; font-size:12px; color:#d97706; margin-bottom:4px;">
            🕒 PREPARATION TIME: 15-20 MINUTES
          </div>
          <div style="font-size:11px; color:#78350f;">
            • Check special instructions<br>
            • Serve hot and fresh<br>
            • Maintain quality
          </div>
        </div>

        <!-- FOOTER -->
        <div style="
          text-align:center;
          margin-top:12px;
          padding-top:8px;
          border-top:1px solid #000;
          font-size:11px;
          color:#666;
        ">
          <div>Order received at: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          <div style="margin-top:4px; font-size:7px;">WebReich Solutions</div>
        </div>
      </div>
    `;
  }

  // Print order to thermal printer
  async printOrderReceipt(orderData, tableNumber, orderNumber, options = {}) {
    const {
      onPrintStart = null,
      onPrintComplete = null,
      onPrintError = null
    } = options;

    try {
      if (onPrintStart) onPrintStart();

      let connection;
      if (globalBluetoothConnection.connected && globalBluetoothConnection.device?.gatt?.connected) {
        connection = {
          device: globalBluetoothConnection.device,
          characteristic: globalBluetoothConnection.characteristic,
        };
      } else {
        connection = await this.connectBluetooth();
        if (!connection) {
          // Fallback to browser print if no Bluetooth connection
          this.fallbackPrintOrder(orderData, tableNumber, orderNumber);
          return true;
        }
      }

      // Generate HTML for order
      const html = this.generateOrderPrintHTML(orderData, tableNumber, orderNumber);

      // Create printable element
      const tempDiv = document.createElement('div');
      tempDiv.id = `order-print-temp-${Date.now()}`;
      tempDiv.style.width = '200px';
      tempDiv.style.padding = '12px';
      tempDiv.style.background = '#fff';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '13px';
      tempDiv.style.lineHeight = '1.3';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);

      // Convert to canvas
      const html2canvas = await this.loadHtml2Canvas();
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        backgroundColor: '#fff',
        useCORS: true,
        width: 230,
      });

      // Clean up
      document.body.removeChild(tempDiv);

      // Convert to ESC/POS
      const escImage = this.canvasToEscPosRaster(canvas);

      // Printer commands
      const init = new Uint8Array([0x1B, 0x40]); // Initialize
      const alignCenter = new Uint8Array([0x1B, 0x61, 0x01]); // Center alignment
      const cutPaper = new Uint8Array([0x0A, 0x0A, 0x1D, 0x56, 0x00]); // Cut paper

      // Combine all commands
      const payload = new Uint8Array(init.length + alignCenter.length + escImage.length + cutPaper.length);
      let offset = 0;
      payload.set(init, offset); offset += init.length;
      payload.set(alignCenter, offset); offset += alignCenter.length;
      payload.set(escImage, offset); offset += escImage.length;
      payload.set(cutPaper, offset);

      // Send to printer in chunks
      for (let i = 0; i < payload.length; i += 180) {
        const slice = payload.slice(i, i + 180);
        if (connection.characteristic.properties.writeWithoutResponse) {
          await connection.characteristic.writeValueWithoutResponse(slice);
        } else {
          await connection.characteristic.writeValue(slice);
        }
        await new Promise((r) => setTimeout(r, 40));
      }

      if (onPrintComplete) onPrintComplete();
      return true;
    } catch (error) {
      console.error('Print error:', error);
      if (onPrintError) onPrintError(error);
      
      // Fallback to browser print
      this.fallbackPrintOrder(orderData, tableNumber, orderNumber);
      return false;
    }
  }

  // Fallback print function for orders
  fallbackPrintOrder(orderData, tableNumber, orderNumber) {
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Kitchen Order #${orderNumber}</title>
          <style>
            @media print {
              body { 
                font-family: 'Courier New', monospace;
                width: 80mm;
                margin: 0;
                padding: 10px;
                font-size: 12px;
              }
              .header { text-align: center; margin-bottom: 10px; }
              .item { margin: 4px 0; }
              .item-name { font-weight: bold; }
              .instructions { color: #d97706; font-style: italic; }
              .kitchen-note { background: #fff7ed; padding: 5px; margin: 10px 0; }
              .total { font-weight: bold; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>THE HEAVEN PALACE</h2>
            <h3>KITCHEN ORDER</h3>
            <p>Order #: ${orderNumber}</p>
            <p>Table: ${tableNumber}</p>
            <p>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <hr>
          </div>
          
          <div class="items">
            ${orderData.items.map(item => `
              <div class="item">
                <div class="item-name">${item.name} x${item.quantity}</div>
                <div>₹${item.price} × ${item.quantity} = ₹${item.price * item.quantity}</div>
                ${item.specialInstructions ? `<div class="instructions">Note: ${item.specialInstructions}</div>` : ''}
              </div>
            `).join('')}
          </div>
          
          <div class="total">
            <div>Total: ₹${orderData.total}</div>
          </div>
          
          <div class="kitchen-note">
            <p><strong>Preparation Time:</strong> 15-20 minutes</p>
            <p>Check special instructions carefully</p>
          </div>
          
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  }
}

// Create and export singleton instance
export const printerService = new PrinterService();

// React component for printer status
export const PrinterStatus = ({ connected, onConnect, onDisconnect, isPrinting }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
          <div className="flex items-center gap-2">
            <Bluetooth className={connected ? "text-green-500" : "text-gray-400"} size={18} />
            <span className="text-sm text-gray-700">
              Printer: {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {!connected && (
            <button
              onClick={onConnect}
              disabled={isPrinting}
              className="ml-4 text-sm px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          )}
        </div>

        {connected && (
          <button
            onClick={onDisconnect}
            className="text-sm px-3 py-1 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
};