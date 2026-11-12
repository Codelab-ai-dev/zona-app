# 🚀 Getting Started - Zona Gol Mobile

La app habla con la **API de Zona Gol** (backend en Go, carpeta `../backend`). Ya no usa Supabase.

## 1. Levantar el backend

```bash
cd backend
make db-up   # Postgres local en Docker (puerto 55432)
make run     # API en http://localhost:8080
```

Las rutas disponibles están en `backend/api/ROUTES.md` (se regeneran con `make routes`).

## 2. Ejecutar la app

```bash
cd zona_gol_mobile
flutter pub get
flutter run                                                    # simulador iOS
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080    # emulador Android
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:8080 # teléfono físico
```

| Variable | Default | Uso |
|----------|---------|-----|
| `API_BASE_URL` | `http://localhost:8080` | Origen de la API (sin `/api/v1`) |
| `WEB_BASE_URL` | `http://localhost:8088` | Sitio público (links compartidos) |
| `ENV` | `dev` | `dev`, `staging` o `prod` (en `prod` la API debe ser `https://`) |

### Build de producción
```bash
flutter build apk --release \
  --dart-define=ENV=prod \
  --dart-define=API_BASE_URL=https://api.tu-dominio.com \
  --dart-define=WEB_BASE_URL=https://tu-dominio.com
```

## 3. Cómo está armada la capa de datos

```
Screen → BLoC → UseCase → Repository (interfaz, domain/)
                              ↓
                  RepositoryImpl (data/repositories/)
                              ↓
                  ApiClient (core/network/) → /api/v1/...
                              ↓
                  Mapper (data/mappers/) → Entity (domain/entities/)
```

- **`core/network/api_client.dart`**: cliente HTTP. Agrega `Authorization: Bearer`, renueva el access token una sola vez (single flight) cuando está por vencer o la API responde 401, y emite `sessionExpired` si el refresh token es rechazado.
- **`core/network/token_store.dart`**: guarda los tokens en Secure Storage (Keychain/Keystore).
- **`core/network/api_exception.dart`** y **`failure_mapper.dart`**: los errores de la API llegan como `ApiException` y los repositorios los convierten en `Failure` (`Either<Failure, T>`).
- **`data/mappers/`**: convierten el JSON de la API en entidades de dominio.
- **`core/di/injection.dart`**: registra `ApiClient`, repositorios, casos de uso y BLoCs en `get_it`.

### Agregar un endpoint nuevo
1. Confirma la ruta y el formato en `backend/api/ROUTES.md`.
2. Agrega el método a la interfaz en `lib/domain/repositories/`.
3. Impleméntalo en `lib/data/repositories/*_impl.dart` con `api` y el mapper que corresponda.
4. Si hace falta, crea el caso de uso y regístralo en `injection.dart`.
5. Agrega un test con un `http.Client` simulado (ver `test/core/api_client_test.dart`).

## 🛠️ Comandos útiles

```bash
flutter analyze
flutter test
dart format lib/
flutter pub run build_runner build --delete-conflicting-outputs  # código generado (Freezed/JSON)
```

## 📚 Recursos

- [Flutter BLoC](https://bloclibrary.dev/)
- [Go Router](https://pub.dev/packages/go_router)
- [Hive](https://docs.hivedb.dev/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**Última actualización:** 2026-11-12
