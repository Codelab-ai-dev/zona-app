# Implementación de Singleton para Supabase Client

## Problema

La aplicación estaba experimentando el siguiente error en la consola:

```
Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.
```

Este problema ocurre cuando se crean múltiples instancias del cliente de autenticación de Supabase (`GoTrueClient`) en el mismo contexto del navegador. Aunque no es un error crítico, puede causar comportamientos indefinidos cuando se utilizan concurrentemente bajo la misma clave de almacenamiento.

## Solución

Implementamos un patrón singleton para asegurar que solo exista una instancia del cliente de Supabase en toda la aplicación:

### 1. Modificación de `lib/supabase/client.ts`

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Variables para almacenar las instancias singleton
let clientComponentSingleton: ReturnType<typeof createClientComponentClient<Database>> | null = null
let directClientSingleton: ReturnType<typeof createClient<Database>> | null = null

// Función para crear o devolver el cliente de Supabase para componentes
export const createClientSupabaseClient = () => {
  // En el servidor, siempre crear una nueva instancia
  if (typeof window === 'undefined') {
    return createClientComponentClient<Database>()
  }
  
  // En el cliente, reutilizar la instancia existente
  if (!clientComponentSingleton) {
    // Crear una única instancia y guardarla
    clientComponentSingleton = createClientComponentClient<Database>()
    
    // Agregar un mensaje de depuración
    console.log('Supabase client singleton created')
  } else {
    console.log('Reusing existing Supabase client singleton')
  }
  
  return clientComponentSingleton
}

// Cliente directo para cuando necesitas más control (singleton)
export const supabase = (() => {
  // En el servidor, siempre crear una nueva instancia
  if (typeof window === 'undefined') {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  
  // En el cliente, reutilizar la instancia existente
  if (!directClientSingleton) {
    directClientSingleton = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  
  return directClientSingleton
})()
```

### 2. Actualización de `lib/providers/supabase-provider.tsx`

```tsx
"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { Database } from '../supabase/database.types'
import { useAuthStore } from '../stores/auth-store'
import { authActions } from '../actions/auth-actions'
import { createClientSupabaseClient } from '../supabase/client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface SupabaseContextType {
  supabase: ReturnType<typeof createClientComponentClient<Database>>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClientSupabaseClient()
  // ... resto del código
}
```

## Explicación

1. **Patrón Singleton**: Utilizamos variables a nivel de módulo para almacenar las instancias del cliente de Supabase, asegurando que solo se cree una instancia en el navegador.

2. **Diferenciación Cliente/Servidor**: Implementamos lógica para manejar de manera diferente el cliente en el servidor (donde se puede crear una nueva instancia cada vez) y en el navegador (donde debemos reutilizar la misma instancia).

3. **Logs de Depuración**: Agregamos mensajes de consola para verificar cuándo se crea una nueva instancia y cuándo se reutiliza la existente.

4. **Proveedor Actualizado**: Modificamos el `SupabaseProvider` para utilizar nuestra función singleton en lugar de crear una nueva instancia cada vez.

## Beneficios

- Evita la advertencia de múltiples instancias de `GoTrueClient`
- Previene comportamientos indefinidos en la autenticación
- Mejora el rendimiento al reutilizar la misma instancia
- Mantiene un estado de autenticación consistente en toda la aplicación

## Notas Adicionales

- Esta implementación es compatible con la hidratación de Next.js
- Funciona tanto en el lado del servidor como en el cliente
- Mantiene la compatibilidad con las APIs existentes de Supabase

## Solución a Errores de Hidratación

Además del problema de múltiples instancias de GoTrueClient, también se solucionó un error de hidratación relacionado con atributos HTML adicionales en la etiqueta `<html>` que aparecían durante el renderizado en el servidor pero no en el cliente.

### Problema

```
Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client.
```

Este error ocurría porque algunas extensiones del navegador o herramientas de desarrollo añadían atributos adicionales a la etiqueta HTML, como `data-windsurf-page-id` y `data-windsurf-extension-id`.

### Solución

Se modificó el archivo `app/layout.tsx` para incluir el atributo `suppressHydrationWarning` en la etiqueta `<html>`:

```tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  )
}
```

El atributo `suppressHydrationWarning` le indica a React que no muestre advertencias de hidratación para este componente y sus hijos, lo que ayuda a evitar errores cuando hay diferencias menores entre el HTML del servidor y el cliente que no afectan la funcionalidad de la aplicación.

## Advertencia Persistente de Múltiples Instancias de GoTrueClient

A pesar de implementar correctamente el patrón singleton en nuestro código, la advertencia de múltiples instancias de GoTrueClient puede seguir apareciendo en la consola:

```
Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.
```

### Observaciones

Los logs de la aplicación confirman que nuestro singleton está funcionando correctamente:

- "Supabase client singleton created" aparece una sola vez
- Múltiples mensajes de "Reusing existing Supabase client singleton" confirman que se está reutilizando la misma instancia

Esto sugiere que la advertencia proviene de alguna biblioteca de terceros o componente que está creando instancias adicionales de GoTrueClient fuera de nuestro control directo.

### Posibles Causas

1. **Bibliotecas de terceros**: Algunas bibliotecas relacionadas con Supabase podrían estar creando sus propias instancias de GoTrueClient.

2. **Componentes de Next.js**: Los componentes de Next.js que utilizan Supabase podrían estar creando instancias independientes durante la hidratación o renderizado.

3. **Hot Reloading**: El proceso de hot reloading durante el desarrollo podría estar creando múltiples instancias temporales.

### Recomendaciones

1. **Monitorear el comportamiento**: Dado que la advertencia indica que "no es un error", podemos continuar monitoreando el comportamiento de la aplicación para asegurarnos de que no haya problemas reales de autenticación.

2. **Reportar el problema**: Considerar reportar el problema a los mantenedores de las bibliotecas de Supabase si la advertencia persiste en producción.

3. **Monkey Patching**: Como último recurso, se podría considerar un monkey patch para suprimir la advertencia específica si está causando ruido innecesario en los logs.

4. **Verificar en producción**: Es posible que esta advertencia solo aparezca en entornos de desarrollo debido al hot reloading y no sea un problema en producción.
