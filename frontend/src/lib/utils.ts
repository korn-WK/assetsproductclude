/**
 * Format date to match database timezone (UTC)
 * This ensures the displayed time matches what's stored in the database
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Format date options (timezone is respected by the browser's locale)
    const dateOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    };
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    
    // ใช้ 'th-TH' เพื่อให้ได้รูปแบบ 01 ก.พ. 2024
    const formattedDate = date.toLocaleDateString('th-TH', dateOptions);
    const formattedTime = date.toLocaleTimeString('th-TH', timeOptions);
    
    return `${formattedDate} ${formattedTime}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date only (without time)
 */
export const formatDateOnly = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const dateOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    };
    
    // ใช้ 'th-TH' เพื่อให้ได้รูปแบบ 01 ก.พ. 2024
    return date.toLocaleDateString('th-TH', dateOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format time only
 */
export const formatTimeOnly = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Time';
    }
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    
    return date.toLocaleTimeString('en-US', timeOptions);
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid Time';
  }
};
