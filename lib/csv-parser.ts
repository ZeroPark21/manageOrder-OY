// CSV Parser for TikTok Ads data
export function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  // Parse CSV with proper handling of quoted values
  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    
    return result;
  };

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: any = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        // Remove surrounding quotes if present
        value = value.replace(/^"|"$/g, '');
        row[header] = value;
      });
      data.push(row);
    }
  }
  
  return data;
}

// Extract date from various sources
export function extractDateFromFile(filename: string, data: any[]): string {
  // Try to extract date from filename
  // Patterns: 2025-08-08, 2025_08_08, 20250808, Aug 08 2025, etc.
  const patterns = [
    /(\d{4}[-_]\d{2}[-_]\d{2})/,
    /(\d{8})/,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i,
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      const dateStr = match[1];
      
      // Convert to standard format
      if (dateStr.length === 8 && !dateStr.includes('-')) {
        // Format: 20250808
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      } else if (dateStr.includes('_')) {
        // Format: 2025_08_08
        return dateStr.replace(/_/g, '-');
      } else if (dateStr.match(/[A-Za-z]/)) {
        // Format: Aug 08 2025
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } else {
        return dateStr;
      }
    }
  }

  // Try to get date from data
  if (data.length > 0) {
    const firstRow = data[0];
    
    // Check various date field names
    const dateFields = ['Date', 'date', 'Report Date', 'report_date', 'Data Date', 'data_date'];
    for (const field of dateFields) {
      if (firstRow[field]) {
        const dateStr = firstRow[field];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
  }

  // Default to today's date
  return new Date().toISOString().split('T')[0];
}

// Validate TikTok Ads CSV structure
export function validateTikTokAdsCSV(data: any[]): boolean {
  if (!data || data.length === 0) return false;
  
  const firstRow = data[0];
  
  // Check for key TikTok Ads fields
  const requiredFields = [
    ['Campaign name', 'campaign_name', 'Campaign'],
    ['Ad group name', 'ad_group_name', 'Ad Group'],
    ['Impressions', 'impressions', 'Impression'],
    ['Clicks', 'clicks', 'Click'],
    ['Cost', 'cost', 'Spend']
  ];
  
  // Check if at least 3 of the required field groups exist
  let matchCount = 0;
  for (const fieldGroup of requiredFields) {
    const hasField = fieldGroup.some(field => 
      Object.keys(firstRow).some(key => 
        key.toLowerCase().includes(field.toLowerCase())
      )
    );
    if (hasField) matchCount++;
  }
  
  return matchCount >= 3;
}