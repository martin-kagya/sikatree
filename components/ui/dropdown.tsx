'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from '@/components/icons';
import { cn } from '@/lib/utils';

type Option = { value: string; label: string };

type Position = { top: number; left: number; width: number };

export function Dropdown({
  id,
  name,
  options,
  defaultValue = '',
  ariaLabel,
  size = 'md',
  tone = 'white',
  menuClassName,
}: {
  id?: string;
  name: string;
  options: Option[];
  defaultValue?: string;
  ariaLabel: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'page' | 'white';
  menuClassName?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  function place() {
    const trigger = root.current?.getBoundingClientRect();
    if (!trigger) return;
    const width = Math.min(Math.max(trigger.width, 180), 420);
    const height = Math.min(options.length * 37 + 8, 260);
    const below = trigger.bottom + 4;
    const top =
      below + height > window.innerHeight - 8
        ? Math.max(8, trigger.top - height - 4)
        : below;
    setPosition({
      top,
      left: Math.min(trigger.left, window.innerWidth - width - 8),
      width,
    });
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (root.current?.contains(target) || menu.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onViewportChange() {
      place();
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!open) place();
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!open) place();
            setOpen(true);
          }
        }}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-inner border border-hairline text-left outline-none transition-colors focus:border-green-deep focus:ring-2 focus:ring-green-deep',
          size === 'sm'
            ? 'h-8 pl-2 pr-2 text-[12px]'
            : size === 'lg'
              ? 'h-11 pl-3 pr-3 text-[14px]'
              : 'h-10 pl-3 pr-3 text-small',
          tone === 'page' ? 'bg-page text-ink' : 'bg-white text-ink',
        )}
      >
        <span className="truncate">{selected?.label ?? 'Select'}</span>
        <ChevronDown
          className={cn(
            'shrink-0 text-ink-muted transition-transform duration-200',
            size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && position
        ? createPortal(
            <div
              ref={menu}
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                width: position.width,
              }}
              className={cn(
                'z-50 max-h-[260px] overflow-y-auto rounded-[12px] border border-hairline bg-white p-1 shadow-card',
                menuClassName,
              )}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    setValue(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'block w-full whitespace-nowrap rounded-[8px] px-3 py-2 text-left text-[13px] transition-colors',
                    option.value === value
                      ? 'bg-mint-100 font-medium text-green-deep'
                      : 'text-ink hover:bg-page',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
