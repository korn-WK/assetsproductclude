import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AiOutlineMenu, AiOutlineSearch, AiOutlineUser } from 'react-icons/ai';
import styles from './Navbar.module.css';
import { useAuth } from '../../../contexts/AuthContext';
import { useAssets } from '../../../contexts/AssetContext';

interface NavbarProps {
  title?: string;
  isAdmin?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ title, isAdmin = false }) => {
  const { user, loading, logout } = useAuth();
  const { searchAssets, fetchAssets } = useAssets();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    console.log('Search triggered with query:', searchQuery);
    if (searchQuery.trim()) {
      console.log('Calling searchAssets with:', searchQuery);
      searchAssets(searchQuery);
    } else {
      console.log('Calling fetchAssets (empty search)');
      fetchAssets(); // If search is empty, fetch all assets
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log('Enter key pressed');
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    console.log('Clearing search');
    setSearchQuery('');
    fetchAssets();
  };

  console.log('User data in Navbar:', user);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <header className={styles.navbar}>
      <button className={styles.menuToggle}>
        <AiOutlineMenu />
      </button>
      <div className={styles.assetsTitle}>
        <Image src="/icontitle.png" alt="Assets Logo" width={40} height={40} />
        <h1>{title}</h1>
      </div>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by code, name, department..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button 
          className={styles.searchButton}
          onClick={handleSearch}
          title="Search"
        >
          <AiOutlineSearch className={styles.searchIcon} />
        </button>
        {searchQuery && (
          <button 
            className={styles.clearButton}
            onClick={handleClearSearch}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>
      <div className={styles.userProfile} ref={dropdownRef}>
        {loading ? (
          <p>Loading...</p>
        ) : user ? (
          <button className={styles.profileButton} onClick={() => setDropdownOpen(!isDropdownOpen)}>
            {user.picture ? (
              <Image src={user.picture} alt={user.name} width={40} height={40} className={styles.userAvatar} />
            ) : (
              <AiOutlineUser className={styles.userIcon} />
            )}
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              {isAdmin && <div className={styles.adminBadge}>Admin</div>}
            </div>
          </button>
        ) : (
          <AiOutlineUser className={styles.userIcon} />
        )}
        
        {isDropdownOpen && user && (
          <div className={styles.profileDropdown}>
            <div className={styles.dropdownHeader}>
              Signed in as <br />
              <strong>{user.name}</strong>
            </div>
            <ul className={styles.dropdownMenu}>
              <li className={styles.dropdownItem} onClick={logout}>
                Logout
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;