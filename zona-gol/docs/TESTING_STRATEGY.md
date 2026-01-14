# 🧪 ZONA-GOL OS - Testing Strategy

## 📋 Overview

This document outlines the comprehensive testing strategy for zona-gol OS to achieve **80%+ code coverage** and ensure production reliability.

## 🎯 Testing Goals

1. **Prevent regressions** - Catch bugs before they reach production
2. **Document behavior** - Tests serve as living documentation
3. **Enable refactoring** - Change code with confidence
4. **Improve code quality** - Better design through testability
5. **Speed up development** - Catch issues early in the cycle

## 📊 Coverage Targets

- **Overall**: 80%+ coverage
- **Critical paths**: 95%+ coverage
- **UI Components**: 70%+ coverage
- **Business logic**: 90%+ coverage
- **Utils/Helpers**: 95%+ coverage

## 🧪 Testing Pyramid

```
       /\
      /  \     E2E Tests (5%)
     /    \    - Critical user flows
    /------\
   /        \  Integration Tests (20%)
  /          \ - API endpoints
 /            \- Component integration
/--------------\
|              | Unit Tests (75%)
|              | - Components
|              | - Hooks
|              | - Utils
|              | - Actions
```

## 📁 Test Organization

```
zona-gol/
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   └── __tests__/
│   │       └── button.test.tsx
│   └── league-admin/
│       ├── calendar-view.tsx
│       └── __tests__/
│           └── calendar-view.test.tsx
├── lib/
│   ├── utils/
│   │   ├── age-utils.ts
│   │   └── __tests__/
│   │       └── age-utils.test.ts
│   └── actions/
│       ├── league-actions.ts
│       └── __tests__/
│           └── league-actions.test.ts
├── hooks/
│   ├── use-auth.ts
│   └── __tests__/
│       └── use-auth.test.ts
└── app/
    └── api/
        └── play/
            └── videos/
                ├── route.ts
                └── __tests__/
                    └── route.test.ts
```

## 🛠️ Testing Tools

### Core Stack
- **Vitest**: Test runner and framework
- **React Testing Library**: Component testing
- **Testing Library User Events**: User interaction simulation
- **JSDOM**: DOM environment
- **MSW**: API mocking (to be added)

### Utilities
- **@testing-library/jest-dom**: Custom matchers
- **vitest-mock-extended**: Advanced mocking
- **happy-dom** (optional): Faster alternative to JSDOM

## 📝 Test Types & Examples

### 1. Unit Tests - Components

**Test what matters**:
- ✅ User interactions (clicks, inputs, navigation)
- ✅ Conditional rendering
- ✅ Props validation
- ✅ Accessibility
- ❌ Implementation details
- ❌ Internal state

```typescript
// components/ui/__tests__/button.test.tsx
describe('Button', () => {
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### 2. Unit Tests - Hooks

```typescript
// hooks/__tests__/use-auth.test.ts
describe('useAuth', () => {
  it('returns user when authenticated', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toEqual({ id: '123', email: 'test@test.com' })
  })
})
```

### 3. Unit Tests - Utils

```typescript
// lib/utils/__tests__/age-utils.test.ts
describe('calculateAge', () => {
  it('calculates age correctly', () => {
    const birthDate = '2000-01-01'
    const referenceDate = '2025-01-13'

    const age = calculateAge(birthDate, referenceDate)

    expect(age).toBe(25)
  })
})
```

### 4. Integration Tests - API Routes

```typescript
// app/api/play/videos/__tests__/route.test.ts
describe('GET /api/play/videos', () => {
  it('returns videos for authenticated user', async () => {
    const request = new Request('http://localhost/api/play/videos')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.videos).toHaveLength(5)
  })
})
```

### 5. Integration Tests - Server Actions

```typescript
// lib/actions/__tests__/league-actions.test.ts
describe('serverLeagueActions', () => {
  it('creates league successfully', async () => {
    const leagueData = {
      name: 'Test League',
      slug: 'test-league',
      description: 'A test league'
    }

    const result = await serverLeagueActions.createLeague(leagueData)

    expect(result.success).toBe(true)
    expect(result.league.name).toBe('Test League')
  })
})
```

## 🎭 Mocking Strategy

### 1. Supabase Client

```typescript
// __mocks__/supabase.ts
export const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
  })),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
}
```

### 2. Next.js Modules

Already mocked in `vitest.setup.tsx`:
- ✅ `next/navigation`
- ✅ `next/image`
- ✅ Window APIs (matchMedia, IntersectionObserver, ResizeObserver)

### 3. External Services

```typescript
// __mocks__/mux.ts
export const mockMux = {
  Video: {
    Assets: {
      create: vi.fn().mockResolvedValue({ id: 'asset-123', status: 'ready' }),
      get: vi.fn().mockResolvedValue({ id: 'asset-123', status: 'ready' }),
    },
  },
}
```

## 🚀 Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test button.test.tsx

# Run tests matching pattern
npm run test -- --grep "Button"
```

## 📈 Coverage Reports

Coverage reports are generated in `/coverage/`:
- `coverage/index.html` - HTML report (open in browser)
- `coverage/lcov.info` - LCOV format (for CI)
- `coverage/coverage-summary.json` - JSON summary

View coverage:
```bash
npm run test:coverage
open coverage/index.html
```

## 🎯 Priority Testing Areas

### Phase 1: Critical Business Logic (CURRENT)
- [ ] Age validation (`lib/utils/age-utils.ts`)
- [ ] Calendar calculations (`lib/utils/calendar-adjuster.ts`)
- [ ] QR generation (`lib/utils/qr-generator.ts`)
- [ ] Auth actions (`lib/actions/auth-actions.ts`)
- [ ] League actions (`lib/actions/league-actions.ts`)

### Phase 2: Core Components
- [ ] Login form (`components/auth/login-form.tsx`)
- [ ] Team management (`components/league-admin/team-management.tsx`)
- [ ] Calendar view (`components/league-admin/calendar-view.tsx`)
- [ ] Standings table (`components/league-admin/standings-management.tsx`)

### Phase 3: API Endpoints
- [ ] `/api/play/videos` - Video management
- [ ] `/api/storage/upload` - File uploads
- [ ] `/api/auth/create-user` - User creation

### Phase 4: Hooks
- [ ] `use-auth` - Authentication
- [ ] `use-leagues-query` - League data fetching
- [ ] `use-age-validation` - Age validation

### Phase 5: E2E Tests (Future)
- [ ] User registration flow
- [ ] League creation flow
- [ ] Match result entry flow
- [ ] Video upload flow

## 🐛 Testing Best Practices

### DO ✅
- Test user behavior, not implementation
- Use semantic queries (`getByRole`, `getByLabelText`)
- Mock external dependencies
- Test edge cases and error states
- Keep tests simple and focused
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### DON'T ❌
- Test implementation details
- Use `getByTestId` unless absolutely necessary
- Test internal component state
- Create complex test setup
- Share state between tests
- Test third-party libraries
- Have tests depend on each other

## 🔄 CI/CD Integration

### GitHub Actions (Future)

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## 📚 Resources

- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [MSW for API Mocking](https://mswjs.io/)

## 🎓 Testing Guidelines

### Component Testing Checklist

```markdown
- [ ] Renders correctly with default props
- [ ] Renders correctly with custom props
- [ ] Handles user interactions (click, type, etc.)
- [ ] Shows loading states
- [ ] Shows error states
- [ ] Shows empty states
- [ ] Handles edge cases
- [ ] Is accessible (ARIA, keyboard navigation)
- [ ] Calls callbacks correctly
- [ ] Renders children correctly
```

### Function Testing Checklist

```markdown
- [ ] Returns correct value for valid input
- [ ] Handles invalid input gracefully
- [ ] Handles edge cases (null, undefined, empty)
- [ ] Handles async operations correctly
- [ ] Throws errors when expected
- [ ] Has correct side effects
```

## 🎯 Next Steps

1. ✅ Setup Vitest configuration
2. ✅ Create test examples
3. 🔄 Write tests for critical utils (IN PROGRESS)
4. ⏳ Write tests for core components
5. ⏳ Write tests for API routes
6. ⏳ Setup MSW for API mocking
7. ⏳ Integrate with CI/CD
8. ⏳ Achieve 80% coverage

---

**Last Updated**: 2026-01-13
**Maintained By**: Development Team
**Coverage Target**: 80%+
