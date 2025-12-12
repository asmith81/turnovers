/**
 * Markdown conversion utilities for Google Sheets and HTML
 */

/**
 * Parse markdown text and extract formatting runs for Google Sheets
 * Returns { plainText, formatRuns } where formatRuns is an array of text format specifications
 */
export function parseMarkdownForSheets(markdown) {
  if (!markdown) return { plainText: '', formatRuns: [] };
  
  let plainText = '';
  const formatRuns = [];
  let currentIndex = 0;
  
  // Process line by line
  const lines = markdown.split('\n');
  const processedLines = [];
  
  for (let line of lines) {
    let processedLine = '';
    let lineRuns = [];
    let lineIndex = 0;
    
    // Remove headers but keep text bold
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const headerText = headerMatch[2];
      lineRuns.push({
        startIndex: currentIndex + lineIndex,
        format: { bold: true }
      });
      processedLine = headerText;
      lineIndex = headerText.length;
    } else {
      // Process inline formatting
      let i = 0;
      while (i < line.length) {
        // Bold: **text** or __text__
        const boldMatch = line.slice(i).match(/^(\*\*|__)(.+?)\1/);
        if (boldMatch) {
          lineRuns.push({
            startIndex: currentIndex + processedLine.length,
            format: { bold: true }
          });
          processedLine += boldMatch[2];
          lineRuns.push({
            startIndex: currentIndex + processedLine.length,
            format: { bold: false }
          });
          i += boldMatch[0].length;
          continue;
        }
        
        // Italic: *text* or _text_ (but not ** or __)
        const italicMatch = line.slice(i).match(/^(\*|_)(?!\1)(.+?)\1(?!\1)/);
        if (italicMatch) {
          lineRuns.push({
            startIndex: currentIndex + processedLine.length,
            format: { italic: true }
          });
          processedLine += italicMatch[2];
          lineRuns.push({
            startIndex: currentIndex + processedLine.length,
            format: { italic: false }
          });
          i += italicMatch[0].length;
          continue;
        }
        
        // Regular character
        processedLine += line[i];
        i++;
      }
    }
    
    // Convert bullet points
    processedLine = processedLine.replace(/^[-*]\s+/, '• ');
    
    // Convert numbered lists (keep the number)
    processedLine = processedLine.replace(/^(\d+)\.\s+/, '$1. ');
    
    processedLines.push(processedLine);
    formatRuns.push(...lineRuns);
    currentIndex += processedLine.length + 1; // +1 for newline
  }
  
  plainText = processedLines.join('\n');
  
  return { plainText, formatRuns };
}

/**
 * Convert markdown to Google Sheets cell data with rich text formatting
 * Returns the data for a single cell with textFormatRuns
 */
export function markdownToSheetsCellData(markdown) {
  const { plainText, formatRuns } = parseMarkdownForSheets(markdown);
  
  if (formatRuns.length === 0) {
    return {
      userEnteredValue: { stringValue: plainText }
    };
  }
  
  // Build textFormatRuns array for Sheets API
  const textFormatRuns = formatRuns.map(run => ({
    startIndex: run.startIndex,
    format: {
      bold: run.format.bold,
      italic: run.format.italic
    }
  }));
  
  return {
    userEnteredValue: { stringValue: plainText },
    textFormatRuns: textFormatRuns
  };
}

/**
 * Convert markdown to HTML for display in the GUI
 */
export function markdownToHtml(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  
  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_
  html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+?)_/g, '<em>$1</em>');
  
  // Bullet points
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    return '<ul>' + match + '</ul>';
  });
  
  // Numbered lists
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>');
  
  // Line breaks (but not for list items or headers)
  html = html.replace(/\n(?!<)/g, '<br>\n');
  
  // Clean up extra line breaks
  html = html.replace(/<br>\n(<[hul])/g, '\n$1');
  html = html.replace(/(<\/[hul][^>]*>)\n<br>/g, '$1\n');
  
  return html;
}

/**
 * Strip markdown formatting and return plain text
 */
export function stripMarkdown(markdown) {
  if (!markdown) return '';
  
  let text = markdown;
  
  // Remove headers
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // Remove bold
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  
  // Remove italic
  text = text.replace(/\*([^*]+?)\*/g, '$1');
  text = text.replace(/_([^_]+?)_/g, '$1');
  
  // Convert bullet points
  text = text.replace(/^[-*]\s+/gm, '• ');
  
  return text;
}

