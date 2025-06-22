// src/components/DashboardContent/DashboardCards.tsx
import React from 'react';
import { AiOutlineClose } from 'react-icons/ai'; // ใช้ icon 'X'
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

const DashboardCards: React.FC<DashboardCardsProps> = ({ cards }) => {
  return (
    <div className={styles.cardsContainer}>
      {cards.map((card, index) => (
        <div key={index} className={styles.card} style={{ backgroundColor: card.color }}>
          <h3 className={styles.cardTitle}>{card.title}</h3>
          <div className={styles.cardBody}>
            <AiOutlineClose className={styles.cardIcon} /> {/* ใช้ AiOutlineClose เป็น icon 'X' */}
            <span className={styles.cardValue}>{card.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardCards;