import React from 'react';

export function FormInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium mb-1 text-text-secondary">{label}</label>
      <input
        {...props}
        className="w-full border border-bg-accent bg-bg-surface text-text-primary rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none transition-colors"
      />
    </div>
  );
}

export function FormSelect({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium mb-1 text-text-secondary">{label}</label>
      <select
        {...props}
        className="w-full border border-bg-accent bg-bg-surface text-text-primary rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none transition-colors"
      >
        {children}
      </select>
    </div>
  );
}
