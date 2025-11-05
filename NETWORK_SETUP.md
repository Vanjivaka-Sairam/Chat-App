# Network Access Setup Guide

This guide will help you access the chat application from your mobile device on the same network.

## Step 1: Find Your Local IP Address

### Windows:
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually Wi-Fi or Ethernet).

### Mac/Linux:
```bash
ifconfig
# or
ip addr
```
Look for your network interface (usually `en0` or `wlan0`) and find the `inet` address.

**Example:** `192.168.1.100`

## Step 2: Update Backend Configuration

Edit `backend/.env`:

```env
# Change these lines:
FRONTEND_URL=http://YOUR_LOCAL_IP:5173
HOST=0.0.0.0
```

Replace `YOUR_LOCAL_IP` with your actual IP address (e.g., `192.168.1.100`).

## Step 3: Update Frontend Configuration

Create or edit `frontend/.env`:

```env
VITE_API_URL=http://YOUR_LOCAL_IP:5000/api
VITE_SOCKET_URL=http://YOUR_LOCAL_IP:3001
```

Replace `YOUR_LOCAL_IP` with your actual IP address.

## Step 4: Restart Servers

1. Stop both backend and frontend servers (Ctrl+C)
2. Restart backend:
   ```bash
   cd backend
   npm run dev
   ```
3. Restart frontend:
   ```bash
   cd frontend
   npm run dev
   ```

## Step 5: Access from Mobile

1. Make sure your mobile device is connected to the **same Wi-Fi network** as your computer
2. Open a web browser on your mobile device
3. Navigate to: `http://YOUR_LOCAL_IP:5173`
4. You should now be able to use the app!

## Troubleshooting

### Can't connect from mobile?
- ✅ Ensure both devices are on the same Wi-Fi network
- ✅ Check Windows Firewall - allow ports 5000, 3001, and 5173
- ✅ Verify the IP address is correct
- ✅ Try accessing `http://YOUR_LOCAL_IP:5000/api/auth/me` in mobile browser to test backend connection

### Firewall Settings (Windows):
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" and enter ports: `5000, 3001, 5173`
6. Allow the connection
7. Apply to all profiles

### Still having issues?
- Check backend terminal for connection logs
- Verify CORS settings allow your mobile IP
- Try using your computer's hostname instead of IP

