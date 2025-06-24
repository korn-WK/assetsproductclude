// src/components/DashboardContent/DashboardCards.tsx
import React, { forwardRef, ReactElement } from 'react';
import { AiOutlineAppstore, AiOutlineCheckCircle, AiOutlineWarning, AiOutlineQuestionCircle, AiOutlineSwap, AiOutlineAudit, AiOutlineDelete } from 'react-icons/ai';
import styles from './DashboardCards.module.css';

interface CardProps {
  title: string;
  value: number;
  color: string;
  icon: string; // ในที่นี้เราจะใช้ 'X'
}

interface DashboardCardsProps {
  cards: CardProps[];
}

const iconMap: Record<string, ReactElement> = {
  'Total Assets': <AiOutlineAppstore className={styles.cardIcon} style={{ color: '#4f46e5' }} />,
  'Active Assets': <AiOutlineCheckCircle className={styles.cardIcon} style={{ color: '#22c55e' }} />,
  'Broken Assets': <AiOutlineWarning className={styles.cardIcon} style={{ color: '#f97316' }} />,
  'Missing Assets': <AiOutlineQuestionCircle className={styles.cardIcon} style={{ color: '#ef4444' }} />,
  'Transferring Assets': <AiOutlineSwap className={styles.cardIcon} style={{ color: '#3b82f6' }} />,
  'Audited Assets': <AiOutlineAudit className={styles.cardIcon} style={{ color: '#8b5cf6' }} />,
  'Disposed Assets': <AiOutlineDelete className={styles.cardIcon} style={{ color: '#6b7280' }} />,
};

const DashboardCards = forwardRef<HTMLDivElement, DashboardCardsProps>(({ cards }, ref) => {
  return (
    <div ref={ref} className={styles.cardsContainer}>
      {cards.map((card, index) => (
        <div
          key={index}
          className={styles.card}
          style={{ borderLeftColor: card.color }}
        >
          <div className={styles.cardIcon}>{iconMap[card.title] || null}</div>
          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>{card.title}</h3>
            <span className={styles.cardValue}>{card.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
});

DashboardCards.displayName = 'DashboardCards';

export default DashboardCards;