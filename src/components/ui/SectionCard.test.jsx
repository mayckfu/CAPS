import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SectionCard from './SectionCard';
import { User } from 'lucide-react';

describe('SectionCard Component', () => {
  it('renders correctly with title and icon', () => {
    render(
      <SectionCard title="Test Section" icon={User} opened={false} onToggle={() => {}}>
        <div>Content</div>
      </SectionCard>
    );
    
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('shows content when opened is true', () => {
    render(
      <SectionCard title="Test" opened={true} onToggle={() => {}}>
        <div data-testid="content">Section Content</div>
      </SectionCard>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Section Content')).toBeInTheDocument();
  });

  it('hides content when opened is false', () => {
    render(
      <SectionCard title="Test" opened={false} onToggle={() => {}}>
        <div data-testid="content">Section Content</div>
      </SectionCard>
    );
    
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(
      <SectionCard title="Test" opened={false} onToggle={onToggle}>
        <div>Content</div>
      </SectionCard>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
