"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Server, Router, Network, Laptop, Wifi, Globe, HardDrive, Terminal,
  Plus, X, Edit, Trash2, Zap, Wifi as WifiIcon, Cable, Activity,
  CheckCircle, XCircle, AlertCircle, Settings, Eye, EyeOff
} from "lucide-react";
import { LabDevice, LabConnection, DEVICE_TYPES, DeviceType } from "@/app/admin/dashboard/services/labs";

interface NetworkDiagramProps {
  devices: LabDevice[];
  connections: LabConnection[];
  onDeviceMove?: (deviceId: string, x: number, y: number) => void;
  onConnectionCreate?: (sourceId: string, targetId: string, type: string) => void;
  onConnectionDelete?: (connectionId: string) => void;
  onConnectionToggle?: (connectionId: string) => void;
  readOnly?: boolean;
  labStatus?: 'active' | 'inactive' | 'stopped' | 'starting' | 'running';
  onStartLab?: () => void;
  onStopLab?: () => void;
  onResetLab?: () => void;
  onConnectVPN?: () => void;
  timer?: number;
  vpnConnected?: boolean;
}

export default function NetworkDiagram({
  devices,
  connections,
  onDeviceMove,
  onConnectionCreate,
  onConnectionDelete,
  onConnectionToggle,
  readOnly = false,
  labStatus = 'active',
  onStartLab,
  onStopLab,
  onResetLab,
  onConnectVPN,
  timer,
  vpnConnected
}: NetworkDiagramProps) {
  console.log("=== NetworkDiagram Debug ===");
  console.log("devices received:", devices);
  console.log("connections received:", connections);
  console.log("devices count:", devices?.length || 0);
  console.log("connections count:", connections?.length || 0);
  console.log("readOnly:", readOnly);
  console.log("labStatus:", labStatus);

  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [draggedDevice, setDraggedDevice] = useState<string | null>(null);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string>('');
  const [connectionTarget, setConnectionTarget] = useState<string>('');
  const [connectionType, setConnectionType] = useState<string>('ethernet');

  // === Dynamic Diagram Size ===
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  useLayoutEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
      console.log('diagramWidth', rect.width, 'diagramHeight', rect.height);
    }
  }, [devices.length]);
  const diagramWidth = dimensions.width;
  const diagramHeight = dimensions.height;
  console.log('devices', devices);
  console.log('readOnly', readOnly);
  // ===========================

  // توزيع ذكي: استخدم x/y إذا كانت موجودة، وإلا وزع دائريًا حول المركز
  const devicesWithPositions = devices.length > 0
    ? devices.map((device, i) => {
        if (typeof device.x === 'number' && typeof device.y === 'number') {
          return device;
        }
        const angle = (2 * Math.PI * i) / devices.length;
        const radius = Math.min(diagramWidth, diagramHeight) / 3;
        const centerX = diagramWidth / 2;
        const centerY = diagramHeight / 2;
        return {
          ...device,
          x: Math.round(centerX + radius * Math.cos(angle) - 48),
          y: Math.round(centerY + radius * Math.sin(angle) - 48),
        };
      })
    : devices;

  // دالة للحصول على لون الاتصال
  const getConnectionColor = (connection: LabConnection) => {
    switch (connection.status) {
      case 'connected':
        return '#10B981';
      case 'disconnected':
        return '#EF4444';
      case 'connecting':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  // دالة للحصول على عرض خط الاتصال
  const getConnectionWidth = (connection: LabConnection) => {
    return connection.status === 'connected' ? 3 : 2;
  };

  // دالة للحصول على أيقونة الجهاز
  const getDeviceIcon = (type: string) => {
    return DEVICE_TYPES[type as DeviceType]?.icon || Server;
  };

  // دالة للحصول على اتصالات الجهاز
  const getDeviceConnections = (deviceId: string) => {
    return connections.filter(
      conn => conn.source_device_id === deviceId || conn.target_device_id === deviceId
    );
  };

  // دالة معالجة السحب
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedDevice || readOnly) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clampedX = Math.max(0, Math.min(rect.width - 96, x));
    const clampedY = Math.max(0, Math.min(rect.height - 96, y));
    
    onDeviceMove?.(draggedDevice, clampedX, clampedY);
  };

  const handleMouseUp = () => {
    setDraggedDevice(null);
  };

  // دالة معالجة النقر على الجهاز
  const handleDeviceClick = (device: LabDevice) => {
    if (readOnly) return;
    setSelectedDevice(device.id);
  };

  // دالة إنشاء الاتصال
  const handleCreateConnection = () => {
    if (!connectionSource || !connectionTarget) return;
    
    onConnectionCreate?.(connectionSource, connectionTarget, connectionType);
    setConnectionSource('');
    setConnectionTarget('');
    setConnectionType('ethernet');
    setShowConnectionDialog(false);
  };

  // دالة الحصول على الأجهزة المتصلة
  const getConnectedDevices = (deviceId: string) => {
    const deviceConnections = getDeviceConnections(deviceId);
    return deviceConnections.map(conn => {
      const connectedDeviceId = conn.source_device_id === deviceId ? conn.target_device_id : conn.source_device_id;
      return devicesWithPositions.find(device => device.id === connectedDeviceId);
    }).filter(Boolean) as LabDevice[];
  };

  // دالة تنسيق الوقت
  const formatTime = (seconds?: number) => {
    if (typeof seconds !== 'number') return '0h 0m 0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden"
      style={{ minHeight: 400, border: '2px solid red' }}
    >
      {/* شريط أزرار التحكم */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-700 bg-gray-800/80 z-20 relative">
        <Button size="sm" onClick={onStartLab} disabled={!onStartLab || labStatus === 'running'}>بدء المختبر</Button>
        <Button size="sm" onClick={onStopLab} disabled={!onStopLab || labStatus !== 'running'}>إيقاف المختبر</Button>
        <Button size="sm" onClick={onResetLab} disabled={!onResetLab}>إعادة تعيين</Button>
        <Button size="sm" onClick={onConnectVPN} disabled={!onConnectVPN} variant={vpnConnected ? 'default' : 'outline'}>
          {vpnConnected ? 'قطع VPN' : 'اتصال VPN'}
        </Button>
        <span className="text-white ml-4">الوقت: {formatTime(timer)}</span>
      </div>
      <div style={{position: 'absolute', top: 0, left: 0, color: 'yellow', zIndex: 9999, fontSize: 12}}>
        w: {diagramWidth} h: {diagramHeight} | devices: {devices.length} | readOnly: {String(readOnly)}
      </div>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-semibold">مخطط الشبكة</h3>
            <Badge variant={labStatus === 'active' ? 'default' : 'outline'}>
              {labStatus === 'active' ? 'نشط' : 'غير نشط'}
            </Badge>
          </div>
          
          {/* إظهار أزرار إدارة الاتصالات فقط إذا لم يكن للقراءة فقط */}
          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConnectionDialog(true)}
                disabled={devices.length < 2}
                className="border-blue-500/20 text-blue-500 hover:bg-blue-500/10"
              >
                <Plus className="w-4 h-4 ml-1" />
                إضافة اتصال
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div 
        className="w-full h-full relative"
        style={{ paddingTop: '60px' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" width={diagramWidth} height={diagramHeight}>
          {connections.map(connection => {
            const sourceDevice = devicesWithPositions.find(d => d.id === connection.source_device_id);
            const targetDevice = devicesWithPositions.find(d => d.id === connection.target_device_id);
            if (!sourceDevice || !targetDevice) return null;
            const x1 = (sourceDevice.x ?? 0) + 50;
            const y1 = (sourceDevice.y ?? 0) + 50;
            const x2 = (targetDevice.x ?? 0) + 50;
            const y2 = (targetDevice.y ?? 0) + 50;
            const strokeColor = connection.status === 'connected' ? '#10B981' : '#EF4444';
            const strokeWidth = connection.status === 'connected' ? 3 : 2;
            return (
              <g key={connection.id} className="pointer-events-auto">
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={connection.status === 'connected' ? 'none' : '5,5'}
                />
                {/* Connection controls - إظهار فقط إذا لم يكن للقراءة فقط */}
                {!readOnly && (
                  <>
                    <circle
                      cx={(x1 + x2) / 2}
                      cy={(y1 + y2) / 2}
                      r="8"
                      fill="#1F2937"
                      stroke="#6B7280"
                      strokeWidth="1"
                      className="cursor-pointer hover:fill-gray-600"
                      onClick={() => onConnectionToggle?.(connection.id)}
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 + 3}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      className="pointer-events-none"
                    >
                      {connection.status === 'connected' ? '✓' : '✗'}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Devices */}
        {devicesWithPositions.map(device => (
          <div
            key={device.id}
            className={`absolute w-24 h-24 bg-gray-800 border-2 rounded-lg cursor-move transition-all duration-200 ${
              selectedDevice === device.id ? 'border-blue-500 shadow-lg' : 'border-gray-600'
            } ${draggedDevice === device.id ? 'scale-105 z-20' : 'z-10'}`}
            style={{
              left: device.x,
              top: device.y,
              backgroundColor: device.color || '#374151'
            }}
            onMouseDown={(e) => {
              if (!readOnly) {
                setDraggedDevice(device.id);
                setSelectedDevice(device.id);
                e.preventDefault();
              }
            }}
            onClick={() => setSelectedDevice(device.id)}
          >
            <div className="flex flex-col items-center justify-center h-full p-2">
              <div className="text-white text-2xl mb-1">
                {React.createElement(device.icon || Server, { className: "w-6 h-6" })}
              </div>
              <div className="text-center">
                <div className="text-white text-xs font-medium truncate w-full">
                  {device.name}
                </div>
                <div className="text-gray-400 text-xs truncate w-full">
                  {device.ip}
                </div>
              </div>
            </div>
            
            {/* Device controls - إظهار فقط إذا لم يكن للقراءة فقط */}
            {!readOnly && selectedDevice === device.id && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="w-6 h-6 bg-gray-700 border-gray-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    // يمكن إضافة إجراءات إضافية هنا
                  }}
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Connection Dialog - إظهار فقط إذا لم يكن للقراءة فقط */}
      {!readOnly && showConnectionDialog && (
        <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">إضافة اتصال جديد</DialogTitle>
              <DialogDescription className="text-gray-300">
                اختر الجهازين ونوع الاتصال
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="source" className="text-white">الجهاز المصدر</Label>
                <Select value={connectionSource} onValueChange={setConnectionSource}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="اختر الجهاز المصدر" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map(device => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name} ({device.ip})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target" className="text-white">الجهاز الهدف</Label>
                <Select value={connectionTarget} onValueChange={setConnectionTarget}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="اختر الجهاز الهدف" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices
                      .filter(device => device.id !== connectionSource)
                      .map(device => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name} ({device.ip})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="type" className="text-white">نوع الاتصال</Label>
                <Select value={connectionType} onValueChange={setConnectionType}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethernet">Ethernet</SelectItem>
                    <SelectItem value="wifi">Wi-Fi</SelectItem>
                    <SelectItem value="fiber">Fiber</SelectItem>
                    <SelectItem value="copper">Copper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConnectionDialog(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleCreateConnection}
                disabled={!connectionSource || !connectionTarget}
              >
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 