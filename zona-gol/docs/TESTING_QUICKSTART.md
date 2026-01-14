# 🚀 Testing Quick Start - Zona-Gol OS

## ⚡ Getting Started in 2 Minutes

### Run All Tests
```bash
npm run test
```

### Run Tests in Watch Mode (recommended for development)
```bash
npm run test -- --watch
```

### Run Specific Test File
```bash
npm run test button.test.tsx
```

### Run Tests with Coverage
```bash
npm run test:coverage
open coverage/index.html
```

## 📝 Writing Your First Test

### 1. Component Test Example

Create `components/ui/__tests__/my-component.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from '../my-component'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Hello" />)

    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('handles click event', () => {
    const handleClick = vi.fn()
    render(<MyComponent onClick={handleClick} />)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### 2. Utility Function Test Example

Create `lib/utils/__tests__/my-util.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '../my-util'

describe('myFunction', () => {
  it('returns correct value', () => {
    const result = myFunction('input')

    expect(result).toBe('expected output')
  })

  it('handles edge cases', () => {
    expect(myFunction('')).toBe('')
    expect(myFunction(null)).toBe(null)
  })
})
```

### 3. Server Action Test Example

Create `lib/actions/__tests__/my-action.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { myAction } from '../my-action'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  getServerSupabaseClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        data: [{ id: '1', name: 'Test' }],
        error: null,
      }),
    })),
  }),
}))

describe('myAction', () => {
  it('fetches data successfully', async () => {
    const result = await myAction()

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })
})
```

## 🎯 Testing Checklist

Before committing code, ensure:

- [ ] All new code has tests
- [ ] All tests pass (`npm run test`)
- [ ] Coverage hasn't decreased (`npm run test:coverage`)
- [ ] Tests are clear and well-named
- [ ] Edge cases are covered

## 🧪 Common Test Patterns

### Testing Loading States
```typescript
it('shows loading state', async () => {
  render(<MyComponent />)

  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  await waitFor(() => {
    expect(screen.getByText(/data loaded/i)).toBeInTheDocument()
  })
})
```

### Testing Error States
```typescript
it('shows error message on failure', async () => {
  // Mock API to return error
  vi.mocked(api.fetch).mockRejectedValue(new Error('API Error'))

  render(<MyComponent />)

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
```

### Testing Async Behavior
```typescript
it('loads data asynchronously', async () => {
  render(<MyComponent />)

  await waitFor(() => {
    expect(screen.getByText('Data')).toBeInTheDocument()
  })
})
```

### Testing User Interactions
```typescript
it('submits form with correct data', async () => {
  const onSubmit = vi.fn()
  render(<MyForm onSubmit={onSubmit} />)

  await userEvent.type(screen.getByLabelText(/name/i), 'John Doe')
  await userEvent.click(screen.getByRole('button', { name: /submit/i }))

  expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' })
})
```

## 🔍 Debugging Tests

### Run Single Test
```bash
npm run test -- -t "test name"
```

### Run Tests in UI Mode
```bash
npm run test:ui
```

### See Test Output
```bash
npm run test -- --reporter=verbose
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

## 📊 Coverage Goals

| Area | Target | Current |
|------|--------|---------|
| Overall | 80% | ~20% |
| Utils | 95% | ~60% |
| Components | 70% | ~10% |
| Actions | 90% | ~5% |
| API Routes | 85% | ~0% |

## 🆘 Common Issues

### "Cannot find module '@/...'"
**Solution**: Ensure `tsconfig.json` has correct path aliases.

### "window is not defined"
**Solution**: Mock window APIs in `vitest.setup.tsx` or use `jsdom` environment.

### "Module not found after mocking"
**Solution**: Place mocks in `__mocks__` folder or use `vi.mock()` at top of file.

### Tests are slow
**Solution**:
- Use `vi.mock()` for expensive imports
- Avoid real network calls
- Use `describe.concurrent` for parallel tests

## 📚 Additional Resources

- [Full Testing Strategy](./TESTING_STRATEGY.md)
- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🎓 Next Steps

1. Write tests for your critical path first
2. Aim for one test file per source file
3. Run tests before every commit
4. Review coverage reports weekly
5. Refactor untestable code

---

**Remember**: Good tests make you faster, not slower! 🚀
