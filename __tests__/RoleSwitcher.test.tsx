import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RoleSwitcher from '@/components/RoleSwitcher'
import * as auth from '@/lib/auth'

// Mock the auth module since it has server actions
jest.mock('@/lib/auth', () => ({
  login: jest.fn(),
  logout: jest.fn()
}))

describe('RoleSwitcher Component', () => {
  it('renders correctly with an authenticated user', () => {
    render(<RoleSwitcher currentEmail="test@example.com" currentRole="VISITOR" />)
    
    // Check if authenticated email is shown
    expect(screen.getByText('Authenticated As')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Role: VISITOR')).toBeInTheDocument()
    
    // Logout button
    const logoutBtn = screen.getByRole('button', { name: /logout/i })
    expect(logoutBtn).toBeInTheDocument()
  })

  it('renders login form when unauthenticated', () => {
    render(<RoleSwitcher currentEmail={null} currentRole="VISITOR" />)
    
    expect(screen.getByText('Login Simulation')).toBeInTheDocument()
    const input = screen.getByPlaceholderText('Enter email to login')
    expect(input).toBeInTheDocument()
    const loginBtn = screen.getByRole('button', { name: /login/i })
    expect(loginBtn).toBeInTheDocument()
  })

  it('calls login when form is submitted', async () => {
    render(<RoleSwitcher currentEmail={null} currentRole="VISITOR" />)
    
    const input = screen.getByPlaceholderText('Enter email to login')
    const loginBtn = screen.getByRole('button', { name: /login/i })
    
    fireEvent.change(input, { target: { value: 'muthukamatchi.off@gmail.com' } })
    fireEvent.click(loginBtn)
    
    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith('muthukamatchi.off@gmail.com')
    })
  })
})
