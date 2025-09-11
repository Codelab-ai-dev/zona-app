"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { debugSignIn, debugSupabaseConnection } from '@/lib/debug-auth'

export function DebugLogin() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<any>(null)

  const testCredentials = [
    { email: 'admin@futbol.com', password: 'password123' },
    { email: 'admin@futbol.com', password: 'admin123' },
    { email: 'liga@futbol.com', password: 'password123' },
    { email: 'liga@futbol.com', password: 'admin123' },
    { email: 'hggonzalezb84@gmail.com', password: 'password123' },
    { email: 'hggonzalezb84@gmail.com', password: 'admin123' },
  ]

  const testConnection = async () => {
    setLoading(true)
    try {
      const result = await debugSupabaseConnection()
      setConnectionStatus(result)
      console.log('Connection test result:', result)
    } catch (error) {
      console.error('Connection test error:', error)
      setConnectionStatus({ success: false, error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    setLoading(true)
    setResults([])
    
    const allResults = []
    
    for (const cred of testCredentials) {
      try {
        console.log(`Testing login with ${cred.email} / ${cred.password}`)
        const result = await debugSignIn(cred.email, cred.password)
        allResults.push({
          email: cred.email,
          password: cred.password,
          success: result.success,
          message: result.success ? 'Login exitoso' : result.error
        })
      } catch (error) {
        console.error(`Error testing ${cred.email}:`, error)
        allResults.push({
          email: cred.email,
          password: cred.password,
          success: false,
          message: String(error)
        })
      }
    }
    
    setResults(allResults)
    setLoading(false)
  }

  return (
    <Card className="w-full max-w-3xl mx-auto my-8">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Depuración de Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Button 
              onClick={testConnection} 
              disabled={loading}
              variant="outline"
            >
              Probar Conexión a Supabase
            </Button>
            <Button 
              onClick={testLogin} 
              disabled={loading}
              variant="default"
            >
              Probar Credenciales
            </Button>
          </div>

          {loading && (
            <div className="p-4 bg-blue-50 rounded-md">
              <p className="text-blue-600">Ejecutando pruebas...</p>
            </div>
          )}

          {connectionStatus && (
            <div className={`p-4 rounded-md ${connectionStatus.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className={`font-bold ${connectionStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                Estado de Conexión: {connectionStatus.success ? 'Exitoso' : 'Error'}
              </h3>
              {connectionStatus.error && (
                <p className="text-red-600 mt-2">{connectionStatus.error}</p>
              )}
              {connectionStatus.data && (
                <div className="mt-2 space-y-2">
                  <p>Usuarios en BD: {connectionStatus.data.usersCount}</p>
                  <p>Sesión activa: {connectionStatus.data.hasSession ? 'Sí' : 'No'}</p>
                </div>
              )}
            </div>
          )}

          {results && results.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold mb-2">Resultados de pruebas de login:</h3>
              <div className="space-y-2">
                {results.map((result: any, index: number) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-md ${result.success ? 'bg-green-50' : 'bg-red-50'}`}
                  >
                    <p className="font-medium">
                      {result.email} / {result.password.replace(/./g, '•')}
                    </p>
                    <p className={result.success ? 'text-green-600' : 'text-red-600'}>
                      {result.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
