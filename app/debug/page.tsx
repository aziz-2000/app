'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function DebugPage() {
  const [labId, setLabId] = useState('51')
  const [results, setResults] = useState<any[]>([])
  const { toast } = useToast()

  const addResult = (title: string, data: any) => {
    setResults(prev => [...prev, { title, data, timestamp: new Date().toLocaleTimeString() }])
  }

  const testAuth = async () => {
    try {
      const response = await fetch('/api/auth/user')
      const data = await response.json()
      addResult('اختبار المصادقة', { status: response.status, data })
    } catch (error) {
      addResult('اختبار المصادقة', { error: error instanceof Error ? error.message : String(error) })
    }
  }

  const testSessions = async () => {
    try {
      const response = await fetch(`/api/lab-sessions?labId=${labId}`)
      const data = await response.json()
      addResult('جلسات المختبر', { status: response.status, data })
    } catch (error) {
      addResult('جلسات المختبر', { error: error instanceof Error ? error.message : String(error) })
    }
  }

  const createSession = async () => {
    try {
      const response = await fetch('/api/lab-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId: Number(labId) })
      })
      const data = await response.json()
      addResult('إنشاء جلسة', { status: response.status, data })
    } catch (error) {
      addResult('إنشاء جلسة', { error: error instanceof Error ? error.message : String(error) })
    }
  }

  const testWebShell = async () => {
    try {
      const response = await fetch('/api/webshell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId: Number(labId) })
      })
      const data = await response.json()
      addResult('اختبار WebShell', { status: response.status, data })
    } catch (error) {
      addResult('اختبار WebShell', { error: error instanceof Error ? error.message : String(error) })
    }
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">صفحة تشخيص WebShell</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>اختبارات API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="labId">معرف المختبر</Label>
              <Input
                id="labId"
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
                placeholder="51"
              />
            </div>
            
            <div className="space-y-2">
              <Button onClick={testAuth} className="w-full">
                اختبار المصادقة
              </Button>
              <Button onClick={testSessions} className="w-full">
                فحص الجلسات
              </Button>
              <Button onClick={createSession} className="w-full">
                إنشاء جلسة جديدة
              </Button>
              <Button onClick={testWebShell} className="w-full">
                اختبار WebShell
              </Button>
              <Button onClick={clearResults} variant="outline" className="w-full">
                مسح النتائج
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>النتائج</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-gray-500">لا توجد نتائج بعد. اضغط على الأزرار أعلاه لبدء الاختبارات.</p>
              ) : (
                results.map((result, index) => (
                  <div key={index} className="border rounded p-3">
                    <h3 className="font-semibold">{result.title}</h3>
                    <p className="text-sm text-gray-500">{result.timestamp}</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 