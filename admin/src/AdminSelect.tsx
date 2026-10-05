import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown } from "react-icons/fi";

export interface AdminSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AdminSelectProps {
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function AdminSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  disabled = false,
  required = false,
}: AdminSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef({ text: "", time: 0 });
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(selectedIndex, 0));
  const [popoverStyle, setPopoverStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !popoverRef.current?.contains(event.target)
      ) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) popoverRef.current
      ?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) {
      setPopoverStyle(null);
      return;
    }
    const positionPopover = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const bounds = trigger.getBoundingClientRect();
      const margin = 8;
      const width = Math.min(Math.max(bounds.width, 220), window.innerWidth - margin * 2);
      const left = Math.max(margin, Math.min(bounds.right - width, window.innerWidth - width - margin));
      const availableBelow = window.innerHeight - bounds.bottom - margin;
      const availableAbove = bounds.top - margin;
      const placeAbove = availableBelow < Math.min(220, options.length * 37) && availableAbove > availableBelow;
      const maxHeight = Math.max(80, Math.min(280, Math.max(availableAbove, availableBelow)));
      const estimatedHeight = Math.min(options.length * 37 + 10, maxHeight);
      setPopoverStyle({
        top: placeAbove ? Math.max(margin, bounds.top - estimatedHeight - 7) : bounds.bottom + 7,
        left,
        width,
        maxHeight,
      });
    };
    positionPopover();
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    return () => {
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
    };
  }, [open, options.length]);

  const enabledIndices = options.flatMap((option, index) => option.disabled ? [] : [index]);
  const moveActive = (direction: 1 | -1) => {
    if (enabledIndices.length === 0) return;
    const position = enabledIndices.indexOf(activeIndex);
    const nextPosition = position < 0
      ? (direction === 1 ? 0 : enabledIndices.length - 1)
      : (position + direction + enabledIndices.length) % enabledIndices.length;
    setActiveIndex(enabledIndices[nextPosition]);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const openAt = (index = enabledIndices.includes(selectedIndex) ? selectedIndex : enabledIndices[0] ?? 0) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openAt();
      else moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (enabledIndices.length > 0) {
        setActiveIndex(event.key === "Home" ? enabledIndices[0] : enabledIndices[enabledIndices.length - 1]);
        setOpen(true);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else openAt();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const text = now - typeaheadRef.current.time > 700
        ? event.key
        : typeaheadRef.current.text + event.key;
      typeaheadRef.current = { text, time: now };
      const start = selectedIndex >= 0 ? selectedIndex + 1 : 0;
      const afterSelected = enabledIndices.filter((index) => index >= start);
      const orderedIndices = [...afterSelected, ...enabledIndices.filter((index) => !afterSelected.includes(index))];
      const match = orderedIndices.find((index) => options[index].label.toLocaleLowerCase().startsWith(text.toLocaleLowerCase()));
      if (match !== undefined) {
        event.preventDefault();
        if (open) setActiveIndex(match);
        else choose(match);
      }
    }
  };

  return (
    <div className={`admin-select ${className}`.trim()} ref={rootRef}>
      <select
        className="admin-select-native"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        disabled={disabled}
        required={required}
        onInvalid={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
          setOpen(true);
        }}
        onChange={() => undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
        ))}
      </select>
      <button
        ref={triggerRef}
        type="button"
        className="admin-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openAt()}
        onKeyDown={handleKeyDown}
      >
        <span className={!selectedOption ? "admin-select-placeholder" : undefined}>
          {selectedOption?.label ?? ""}
        </span>
        <FiChevronDown className="admin-select-chevron" aria-hidden="true" />
      </button>
      {open && popoverStyle && createPortal(
        <div
          ref={popoverRef}
          id={`${id}-listbox`}
          className="admin-select-popover"
          role="listbox"
          aria-label={ariaLabel}
          style={{ position: "fixed", top: popoverStyle.top, left: popoverStyle.left, width: popoverStyle.width, maxHeight: popoverStyle.maxHeight }}
        >
          {options.map((option, index) => (
            <div
              id={`${id}-option-${index}`}
              key={option.value}
              data-option-index={index}
              className={`admin-select-option ${index === activeIndex ? "admin-select-option-active" : ""} ${option.value === value ? "admin-select-option-selected" : ""}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {option.value === value && <FiCheck aria-hidden="true" />}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
