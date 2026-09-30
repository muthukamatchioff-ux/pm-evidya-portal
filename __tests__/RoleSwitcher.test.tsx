import { render, screen, fireEvent } from '@testing-library/react'
import RoleSwitcher from '@/components/RoleSwitcher'
import * as auth from '@/lib/auth'

// Mock the auth module since it has server actions
jest.mock('@/lib/auth', () => ({
  setRole: jest.fn(),
}))

describe('RoleSwitcher Component', () => {
  it('renders correctly with the initial role', () => {
    render(<RoleSwitcher currentRole="ADMIN" />)
    
    // Check if label exists
    expect(screen.getByText('Simulate Role')).toBeInTheDocument()
    
    // Check if select has correct value
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('ADMIN')
  })

  it('calls setRole when a new role is selected', () => {
    render(<RoleSwitcher currentRole="VIEWER" />)
    
    const select = screen.getByRole('combobox')
    
    // Simulate user changing the dropdown
    fireEvent.change(select, { target: { value: 'ACCOUNTS' } })
    
    // Expect our mocked action to be called
    expect(auth.setRole).toHaveBeenCalledWith('ACCOUNTS')
  })
})
