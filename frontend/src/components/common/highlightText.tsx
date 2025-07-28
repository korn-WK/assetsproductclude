// highlightText.ts
import React from 'react';

export function highlightText(text: string, keyword: string): React.ReactNode {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return <>{parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={i} style={{ background: '#ffe066', color: '#222', padding: 0 }}>{part}</mark>
    ) : (
      part
    )
  )}</>;
} 