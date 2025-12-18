# 📋 Guía de Implementación: Product Mode

## 🎯 Objetivo

Implementar un sistema de diferenciación de productos para Zona-G:
- **Zona-G Completo** ($999 MXN/mes): App móvil + QR + Reconocimiento facial + Tiempo real
- **Zona-G Web** ($499 MXN/mes): Solo portal web con captura manual

---

## 📦 Archivos Creados

### **1. Base de Datos**
- ✅ `/supabase/migrations/20250117000001_add_product_mode_to_leagues.sql`
  - Agrega columna `product_mode` ('full' | 'web_only')
  - Agrega columna `features` (JSONB con configuración flexible)
  - Triggers automáticos para setear features por modo
  - RLS policies para restringir asistencia QR/facial solo a modo 'full'
  - Funciones helper para check de features

### **2. Tipos TypeScript**
- ✅ `/lib/types/product-mode.ts`
  - Tipos `ProductMode`, `LeagueFeatures`, `LeagueWithMode`
  - Configuración de cada modo con precios y features
  - Labels y descripciones de features

### **3. React Hooks**
- ✅ `/lib/hooks/use-league-features.ts`
  - `useLeagueFeatures(leagueId)` - Hook para obtener features de una liga
  - `hasFeature(featureName)` - Función helper para check de features

### **4. Componentes UI**
- ✅ `/components/shared/feature-gate.tsx`
  - `<FeatureGate>` - Componente para renderizar condicionalmente por feature
  - `<FeatureGateMultiple>` - Requiere múltiples features (AND/OR logic)
  - `useFeatureGate()` - Hook programático

- ✅ `/components/super-admin/product-mode-selector.tsx`
  - `<ProductModeSelector>` - UI para seleccionar modo al crear/editar liga
  - `<ProductModeFeatureComparison>` - Tabla comparativa de features

---

## 🔧 Integración en Super Admin

### **Modificar: `/components/super-admin/league-management.tsx`**

#### **1. Agregar imports**

```typescript
// Al inicio del archivo, después de los imports existentes
import { ProductModeSelector } from '@/components/super-admin/product-mode-selector'
import type { ProductMode } from '@/lib/types/product-mode'
```

#### **2. Actualizar formData state**

```typescript
// Línea 44-52, agregar product_mode
const [formData, setFormData] = useState({
  name: "",
  slug: "",
  description: "",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  logo: "",
  product_mode: "full" as ProductMode, // NUEVO
})
```

#### **3. Actualizar handleCreateLeague**

```typescript
// Línea 96-100, buscar esta función
const handleCreateLeague = async () => {
  if (!formData.name || !formData.adminName || !formData.adminEmail) {
    toast.error('Por favor completa todos los campos requeridos')
    return
  }

  try {
    setCreating(true)

    // Upload logo if exists
    let logoUrl = formData.logo
    if (logoFile) {
      const result = await fileUploadService.uploadImage(logoFile, 'leagues')
      if (result.success && result.url) {
        logoUrl = result.url
      }
    }

    // Create league with admin user
    const result = await createLeagueWithAdmin({
      league: {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description,
        logo: logoUrl,
        product_mode: formData.product_mode, // NUEVO
      },
      admin: {
        name: formData.adminName,
        email: formData.adminEmail,
        phone: formData.adminPhone,
      },
    })

    // ... resto del código
  } catch (error) {
    // ... manejo de errores
  }
}
```

#### **4. Agregar ProductModeSelector al Dialog**

Buscar el DialogContent del formulario de crear liga y agregar el selector:

```typescript
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
  <DialogHeader>
    <DialogTitle>Crear Nueva Liga</DialogTitle>
    <DialogDescription>
      Completa la información de la liga y su administrador
    </DialogDescription>
  </DialogHeader>

  <div className="space-y-6 py-4">
    {/* Información de la Liga */}
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Información de la Liga</h3>

      {/* Nombre */}
      <div>
        <Label htmlFor="name">Nombre de la Liga *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ej: Liga Premier"
        />
      </div>

      {/* Slug */}
      <div>
        <Label htmlFor="slug">Identificador (slug)</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          placeholder="Se genera automáticamente"
        />
      </div>

      {/* Descripción */}
      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descripción de la liga"
        />
      </div>

      {/* Logo */}
      <div>
        <Label>Logo de la Liga</Label>
        <FileUpload
          onFileSelect={(file) => setLogoFile(file)}
          accept="image/*"
          maxSizeMB={2}
        />
      </div>
    </div>

    {/* ====== NUEVO: Product Mode Selector ====== */}
    <div className="border-t pt-6">
      <ProductModeSelector
        value={formData.product_mode}
        onChange={(mode) => setFormData({ ...formData, product_mode: mode })}
      />
    </div>
    {/* ========================================== */}

    {/* Información del Administrador */}
    <div className="space-y-4 border-t pt-6">
      <h3 className="text-lg font-medium">Administrador de la Liga</h3>

      {/* ... resto de campos de admin ... */}
    </div>
  </div>

  <DialogFooter>
    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
      Cancelar
    </Button>
    <Button onClick={handleCreateLeague} disabled={creating}>
      {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Crear Liga
    </Button>
  </DialogFooter>
</DialogContent>
```

---

## 🎨 Uso de FeatureGate en Componentes

### **Ejemplo 1: Ocultar botón de QR en modo web_only**

```typescript
// En cualquier componente que use QR
import { FeatureGate } from '@/components/shared/feature-gate'

function AttendanceComponent({ leagueId }: { leagueId: string }) {
  return (
    <div>
      <h2>Registro de Asistencia</h2>

      {/* Botón manual - siempre disponible */}
      <Button onClick={handleManualAttendance}>
        Captura Manual
      </Button>

      {/* Botón QR - solo en modo 'full' */}
      <FeatureGate leagueId={leagueId} feature="qr_codes">
        <Button onClick={handleQRScanner}>
          <QrCode className="mr-2" />
          Escanear QR
        </Button>
      </FeatureGate>

      {/* Reconocimiento facial - solo en modo 'full' */}
      <FeatureGate leagueId={leagueId} feature="facial_recognition">
        <Button onClick={handleFacialRecognition}>
          <Camera className="mr-2" />
          Reconocimiento Facial
        </Button>
      </FeatureGate>
    </div>
  )
}
```

### **Ejemplo 2: Mostrar mensaje de upgrade**

```typescript
<FeatureGate
  leagueId={leagueId}
  feature="realtime_updates"
  showUpgradeMessage={true}
>
  <RealtimeMatchUpdates matchId={matchId} />
</FeatureGate>
```

### **Ejemplo 3: Uso programático**

```typescript
import { useFeatureGate } from '@/components/shared/feature-gate'

function MyComponent({ leagueId }: { leagueId: string }) {
  const { isEnabled, productMode } = useFeatureGate(leagueId, 'mobile_app')

  if (!isEnabled) {
    return <div>Esta liga no tiene acceso a la app móvil</div>
  }

  return (
    <div>
      <h2>Descarga la App Móvil</h2>
      <p>Plan actual: {productMode}</p>
    </div>
  )
}
```

---

## 📱 Integración en Flutter App

### **Modificar: `/Zona-G/lib/main.dart`**

Al iniciar la app, verificar el product_mode de la liga:

```dart
// Al cargar la liga
final league = await supabase
    .from('leagues')
    .select('id, name, product_mode, features')
    .eq('id', leagueId)
    .single();

final productMode = league['product_mode'] as String;
final features = league['features'] as Map<String, dynamic>;

// Guardar en estado global
AppState.instance.setLeagueFeatures(productMode, features);

// Redirigir si es web_only
if (productMode == 'web_only') {
  // Mostrar mensaje de que esta liga es solo web
  showDialog(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Liga Web Only'),
      content: Text(
        'Esta liga usa Zona-G Web y no requiere la app móvil. '
        'Accede al portal web para gestionar la liga.'
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Entendido'),
        ),
      ],
    ),
  );
}
```

### **Modificar pantallas de QR/Facial**

```dart
// En qr_scanner_screen.dart
@override
void initState() {
  super.initState();

  // Verificar si la liga tiene QR habilitado
  final hasQR = AppState.instance.hasFeature('qr_codes');

  if (!hasQR) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Esta liga no tiene códigos QR habilitados'),
        ),
      );
    });
  }
}
```

---

## 🧪 Testing

### **1. Aplicar migración**

```bash
cd zona-gol
supabase db push
```

### **2. Verificar en Supabase**

```sql
-- Ver columnas nuevas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'leagues'
AND column_name IN ('product_mode', 'features', 'mode_updated_at');

-- Ver vista de features
SELECT * FROM league_features_summary;

-- Test de función helper
SELECT league_has_feature('TU-LEAGUE-ID', 'qr_codes');
```

### **3. Crear liga de prueba**

```sql
-- Liga en modo web_only
INSERT INTO leagues (name, slug, product_mode)
VALUES ('Liga Test Web', 'liga-test-web', 'web_only');

-- Verificar features
SELECT name, product_mode, features
FROM leagues
WHERE slug = 'liga-test-web';
```

### **4. Test de RLS Policies**

```sql
-- Intentar insertar asistencia QR en liga web_only (debería fallar)
INSERT INTO asistencias_qr (torneo_id, jugador_id, asistio)
VALUES ('tournament-from-web-only-league', 'player-id', true);
```

---

## ✅ Checklist de Implementación

- [ ] Aplicar migración en Supabase
- [ ] Crear tipos TypeScript (`product-mode.ts`)
- [ ] Crear hook `useLeagueFeatures`
- [ ] Crear componente `FeatureGate`
- [ ] Crear componente `ProductModeSelector`
- [ ] Integrar `ProductModeSelector` en league-management.tsx
- [ ] Actualizar `createLeagueWithAdmin` para incluir product_mode
- [ ] Agregar FeatureGate en componentes de QR
- [ ] Agregar FeatureGate en componentes de facial recognition
- [ ] Agregar FeatureGate en componentes de realtime
- [ ] Actualizar Flutter app para check de product_mode
- [ ] Testing end-to-end
- [ ] Documentar para usuarios finales

---

## 💡 Ideas Adicionales

### **1. Dashboard de Upgrade**

Crear un dashboard donde se muestre al league_admin las features que no tiene y el costo de upgrade:

```typescript
<Card>
  <CardHeader>
    <CardTitle>Mejora tu Plan</CardTitle>
    <CardDescription>
      Desbloquea todas las funcionalidades de Zona-G
    </CardDescription>
  </CardHeader>
  <CardContent>
    <ProductModeFeatureComparison />
    <Button className="w-full mt-4">
      Actualizar a Zona-G Completo
    </Button>
  </CardContent>
</Card>
```

### **2. Sistema de Trial**

Agregar columna `trial_ends_at` para dar 15 días de prueba del modo 'full':

```sql
ALTER TABLE leagues
ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Function para check de trial
CREATE FUNCTION is_in_trial(p_league_id UUID)
RETURNS BOOLEAN AS $$
  SELECT trial_ends_at > NOW()
  FROM leagues
  WHERE id = p_league_id;
$$ LANGUAGE SQL;
```

### **3. Analytics por Modo**

Ver qué features son más usadas para optimizar precios:

```sql
CREATE TABLE feature_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id),
  feature_name TEXT,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query de analytics
SELECT
  l.product_mode,
  f.feature_name,
  COUNT(*) as usage_count
FROM feature_usage_logs f
JOIN leagues l ON f.league_id = l.id
GROUP BY l.product_mode, f.feature_name
ORDER BY usage_count DESC;
```

---

## 📞 Soporte

Para dudas o problemas con la implementación, consulta:
- [Documentación de Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- Archivo: `/docs/ARCHITECTURE_DIAGRAM.md` (si existe)
