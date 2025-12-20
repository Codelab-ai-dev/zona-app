import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button, buttonVariants } from '../button'

describe('Button', () => {
  describe('rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    })

    it('should render as button element by default', () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })

    it('should have data-slot attribute', () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-slot', 'button')
    })
  })

  describe('variants', () => {
    it('should apply default variant classes', () => {
      render(<Button>Default</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-primary')
    })

    it('should apply destructive variant classes', () => {
      render(<Button variant="destructive">Delete</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-destructive')
    })

    it('should apply outline variant classes', () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('border')
      expect(button.className).toContain('bg-background')
    })

    it('should apply secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-secondary')
    })

    it('should apply ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('hover:bg-soccer-green/10')
    })

    it('should apply link variant classes', () => {
      render(<Button variant="link">Link</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('underline-offset-4')
    })
  })

  describe('sizes', () => {
    it('should apply default size classes', () => {
      render(<Button>Default Size</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('h-10')
      expect(button.className).toContain('px-4')
    })

    it('should apply sm size classes', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('h-9')
    })

    it('should apply lg size classes', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('h-11')
      expect(button.className).toContain('px-6')
    })

    it('should apply icon size classes', () => {
      render(<Button size="icon">Icon</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('size-10')
    })
  })

  describe('interaction', () => {
    it('should call onClick handler when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)

      fireEvent.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick} disabled>Disabled</Button>)

      fireEvent.click(screen.getByRole('button'))

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should have disabled attribute when disabled', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should apply disabled styles', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('disabled:pointer-events-none')
      expect(button.className).toContain('disabled:opacity-50')
    })
  })

  describe('asChild prop', () => {
    it('should render children as the component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/link">Link Button</a>
        </Button>
      )

      const link = screen.getByRole('link', { name: 'Link Button' })
      expect(link.tagName).toBe('A')
      expect(link).toHaveAttribute('href', '/link')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Button className="custom-class">Custom</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('custom-class')
      // Should still have default classes
      expect(button.className).toContain('inline-flex')
    })
  })

  describe('buttonVariants utility', () => {
    it('should generate correct classes for default variant', () => {
      const classes = buttonVariants({ variant: 'default' })
      expect(classes).toContain('bg-primary')
    })

    it('should generate correct classes for custom variant and size', () => {
      const classes = buttonVariants({ variant: 'destructive', size: 'lg' })
      expect(classes).toContain('bg-destructive')
      expect(classes).toContain('h-11')
    })

    it('should accept custom className', () => {
      const classes = buttonVariants({ className: 'my-custom-class' })
      expect(classes).toContain('my-custom-class')
    })
  })

  describe('accessibility', () => {
    it('should be focusable', () => {
      render(<Button>Focusable</Button>)
      const button = screen.getByRole('button')
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('should support aria-label', () => {
      render(<Button aria-label="Custom label">Button</Button>)
      const button = screen.getByRole('button', { name: 'Custom label' })
      expect(button).toBeInTheDocument()
    })

    it('should support type attribute', () => {
      render(<Button type="submit">Submit</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })
  })
})
