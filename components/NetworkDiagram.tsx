import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import {
  Globe, Router, Network, Server, HardDrive, Laptop, Wifi, Terminal
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface NetworkDevice {
  id: string;
  name: string;
  ip: string;
  type: string;
  status: "online" | "offline" | "connecting";
  x?: number;
  y?: number;
  icon: React.ElementType;
  color: string;
  url?: string;
}

export interface NetworkConnection {
  source: string;
  target: string;
  color?: string;
  dashArray?: string;
  opacity?: number;
  width?: number;
}

export interface NetworkDiagramProps {
  devices: NetworkDevice[];
  connections: NetworkConnection[];
  onDeviceClick?: (device: NetworkDevice) => void;
  width?: number | string;
  height?: number | string;
  onConnectWebshell?: (deviceId?: string) => void;
  labStatus?: 'active' | 'inactive' | 'stopped' | 'starting' | 'running';
  onDeviceMove?: (deviceId: string, x: number, y: number) => void;
  onConnectionDelete?: (connectionId: string) => void;
  onConnectionCreate?: (sourceId: string, targetId: string, type: string) => void;
  onConnectionToggle?: (connectionId: string) => void;
  readOnly?: boolean;
  hasActiveSession?: boolean;
}

const DEVICE_SIZE = 56;

const NetworkDiagram: React.FC<NetworkDiagramProps> = ({
  devices: initialDevices,
  connections,
  onDeviceClick,
  width = "100%",
  height = 500,
  onConnectWebshell,
  labStatus = 'active',
  onDeviceMove,
  onConnectionDelete,
  onConnectionCreate,
  onConnectionToggle,
  readOnly,
  hasActiveSession,
}) => {
  const [devices, setDevices] = useState<NetworkDevice[]>(initialDevices);
  const [draggedDeviceId, setDraggedDeviceId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);


  // === Dynamic Diagram Size ===
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 500 });
  useLayoutEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, [devices.length, width, height]);
  const cardWidth = dimensions.width;
  const cardHeight = dimensions.height;

  // مزامنة الأجهزة الداخلية مع props.devices
  useEffect(() => {
    setDevices(initialDevices);
  }, [initialDevices]);

  // Mouse drag logic
  const handleDeviceMouseDown = (e: React.MouseEvent<HTMLDivElement>, device: NetworkDevice) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDraggedDeviceId(device.id);
      setDragOffset({
        x: e.clientX - (device.x ?? 0) - rect.left,
        y: e.clientY - (device.y ?? 0) - rect.top,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedDeviceId || !dragOffset) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    setDevices((prev) =>
      prev.map((device) =>
        device.id === draggedDeviceId
          ? { ...device, x: Math.max(0, x), y: Math.max(0, y) }
          : device
      )
    );
  };

  const handleMouseUp = () => {
    setDraggedDeviceId(null);
    setDragOffset(null);
  };

  // Helper to get device by id
  const getDevice = (id: string): NetworkDevice | undefined => devices.find((d) => d.id === id);

  // توزيع الأجهزة في شبكة مربعة/مستطيلة في منتصف الكارد
  const margin = 16;
  const availableWidth = cardWidth - 2 * margin;
  const availableHeight = cardHeight - 2 * margin;
  const columns = Math.ceil(Math.sqrt(devices.length));
  const rows = Math.ceil(devices.length / columns);
  const gridWidth = columns * DEVICE_SIZE + (columns - 1) * 104;
  const gridHeight = rows * DEVICE_SIZE + (rows - 1) * 104;
  const startX = Math.round((availableWidth - gridWidth) / 2) + margin;
  const startY = Math.round((availableHeight - gridHeight) / 2) + margin;
  const devicesToRender = devices.map((device, i) => {
    if (typeof device.x === 'number' && typeof device.y === 'number') {
      return device;
    }
    const col = i % columns;
    const row = Math.floor(i / columns);
    return {
      ...device,
      x: startX + col * (DEVICE_SIZE + 104),
      y: startY + row * (DEVICE_SIZE + 104),
    };
  });

  // دالة تنسيق الوقت
  const formatTime = (seconds?: number) => {
    if (typeof seconds !== 'number') return '0h 0m 0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // دالة تنسيق الوقت المتبقي للجلسة
  const formatSessionTimeRemaining = (milliseconds?: number) => {
    if (typeof milliseconds !== 'number' || milliseconds <= 0) return '00:00:00';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // رابط ملف VPN (يمكن تعديله حسب الحاجة)
  const VPN_FILE_URL = "/vpn-config/lab-vpn.ovpn";

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg overflow-hidden border border-gray-600/20"
      style={{ width: width || 1200, height }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* شريط أزرار التحكم */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-700 bg-gray-800/80 z-20 relative">
        <button
          className="px-3 py-1 rounded bg-transparent border-2 border-[#10b981] text-[#10b981] hover:bg-[#10b981]/10 transition"
          onClick={() => onConnectWebshell?.()}
          disabled={!onConnectWebshell || !hasActiveSession}
        >
          <Terminal className="w-4 h-4 ml-1 inline" />
          فتح WebShell
        </button>
        
        <div className="flex items-center gap-2 text-white text-sm">
          <span className={`px-2 py-1 rounded ${labStatus === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
            {labStatus === 'running' ? 'نشط' : 'غير نشط'}
          </span>
        </div>
      </div>
      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" width="100%" height="100%">
        {connections.map((conn, idx) => {
          const source = devicesToRender.find(d => d.id === conn.source);
          const target = devicesToRender.find(d => d.id === conn.target);
          if (!source || !target || source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) return null;
          return (
            <line
              key={idx}
              x1={source.x + DEVICE_SIZE / 2}
              y1={source.y + DEVICE_SIZE / 2}
              x2={target.x + DEVICE_SIZE / 2}
              y2={target.y + DEVICE_SIZE / 2}
              stroke={conn.color || "#8648f9"}
              strokeWidth={conn.width || 2}
              strokeDasharray={conn.dashArray || "5,5"}
              opacity={conn.opacity ?? 1}
            />
          );
        })}
      </svg>
      {/* Devices */}
      {devicesToRender.map((device) => {
        const Icon = device.icon;
        return (
          <div
            key={device.id}
            className="absolute"
            style={{
              left: (device.x ?? 0),
              top: (device.y ?? 0),
              width: DEVICE_SIZE,
              height: DEVICE_SIZE,
            }}
          >
            <div
              className={`relative cursor-pointer group transition-all duration-300 ${
                device.status === "online" ? "scale-100" : "scale-90 opacity-60"
              }`}
              onMouseDown={(e) => handleDeviceMouseDown(e, device)}
              onClick={() => setSelectedDevice(device)}
              style={{ width: '100%', height: '100%' }}
            >
              {/* تأثير مزدوج: وميض + glow عند التشغيل */}
              {device.status === "online" && (
                <>
                  <span
                    className="absolute inset-0 rounded-full bg-green-400/40 animate-ping z-0"
                    style={{ filter: 'blur(10px)' }}
                  />
                  <span
                    className="absolute inset-0 rounded-full bg-green-500/30 animate-pulse z-0"
                    style={{ filter: 'blur(16px)' }}
                  />
                </>
              )}
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 relative z-10 ${
                  device.status === "online"
                    ? "bg-gradient-to-br from-green-500/20 to-green-600/20 border-2 border-green-500/40 shadow-lg shadow-green-500/20"
                    : device.status === "connecting"
                    ? "bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/40 animate-pulse"
                    : "bg-gradient-to-br from-gray-500/20 to-gray-600/20 border-2 border-gray-500/40"
                } group-hover:scale-110 group-hover:shadow-xl cursor-move`}
                style={{
                  backgroundColor: `${device.color}15`,
                  borderColor: `${device.color}60`,
                }}
              >
                {Icon && (
                  <Icon
                    className={`w-10 h-10 transition-colors ${
                      device.status === "online"
                        ? "text-green-400"
                        : device.status === "connecting"
                        ? "text-yellow-400"
                        : "text-gray-400"
                    }`}
                    style={{ color: device.status === "online" ? device.color : undefined }}
                  />
                )}
              </div>
              <div
                className="absolute left-1/2 transform -translate-x-1/2 text-center z-20"
                style={{ bottom: -48, minWidth: 120, maxWidth: 220, width: 'max-content' }}
              >
                <p className="text-white text-base font-medium truncate" style={{ fontSize: 18 }}>{device.name}</p>
                <p className="text-gray-400 text-xs truncate" style={{ fontSize: 15 }}>{device.ip}</p>
              </div>
              {device.status === "online" && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping z-20" />
              )}
            </div>
          </div>
        );
      })}
      {/* نافذة معلومات الجهاز */}
      <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-md py-4">
          <DialogTitle className="text-lg font-bold text-white mb-2 text-center">
            {selectedDevice?.name || 'معلومات الجهاز'}
          </DialogTitle>
          {selectedDevice && (
            <div className="flex flex-col items-center gap-2">
              {/* أيقونة الجهاز */}
              <div className="mb-2 flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 border-2 border-[#8648f9]">
                {selectedDevice.icon && (
                  <selectedDevice.icon className="w-10 h-10 text-[#8648f9]" />
                )}
              </div>
              {/* جدول معلومات */}
              <div className="w-full flex flex-col gap-1 text-sm text-gray-300 mb-2">
                <div className="flex justify-between border-b border-gray-700 pb-1">
                  <span className="font-semibold text-gray-400">IP</span>
                  <span>{selectedDevice.ip}</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-1">
                  <span className="font-semibold text-gray-400">النوع</span>
                  <span>{selectedDevice.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-400">الحالة</span>
                  <span className={selectedDevice.status === 'online' ? 'text-green-400' : 'text-red-400'}>
                    {selectedDevice.status === 'online' ? 'متصل' : 'غير متصل'}
                  </span>
                </div>
              </div>
              {/* زر أو رابط الاتصال إذا كان url موجود */}
              {selectedDevice.url && (
                <button
                  onClick={() => {
                    if (labStatus !== 'running' || selectedDevice.status !== 'online') {
                      alert('يجب بدء المختبر ويجب أن يكون الجهاز متصلاً قبل فتح الرابط');
                      return;
                    }
                    window.open(selectedDevice.url, '_blank');
                  }}
                  className="flex-1 px-3 py-2 rounded bg-[#10b981] hover:bg-[#059669] text-white font-semibold transition text-center w-full mt-2"
                >
                  فتح الرابط
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

function assignDefaultPositions(devices: NetworkDevice[]): NetworkDevice[] {
  const centerX = 350;
  const centerY = 200;
  const radius = 180;
  const angleStep = (2 * Math.PI) / devices.length;
  return devices.map((device, i) => ({
    ...device,
    x: Math.round(centerX + radius * Math.cos(i * angleStep)),
    y: Math.round(centerY + radius * Math.sin(i * angleStep)),
  }));
}

export default NetworkDiagram; 