import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    
    let html = value;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[(.*)\]\((.*)\)/gim, '<a href="$2" target="_blank">$1</a>');
    
    // Unordered lists
    html = html.replace(/^\s*[-*]\s+(.*)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
    
    // Ordered lists
    html = html.replace(/^\s*(\d+)\.\s+(.*)/gim, '<li>$2</li>');
    
    // Code blocks
    html = html.replace(/```(.*)```/gims, '<pre><code>$1</code></pre>');
    html = html.replace(/`(.*)`/gim, '<code>$1</code>');
    
    // Blockquotes
    html = html.replace(/^\s*>\s+(.*)/gim, '<blockquote>$1</blockquote>');
    
    // Horizontal rule
    html = html.replace(/^\s*---\s*$/gim, '<hr>');
    
    // Paragraphs (lines separated by blank lines)
    const paragraphs = html.split(/\n\s*\n/);
    html = paragraphs.map(p => {
      if (!p.trim()) return '';
      if (p.includes('<h') || p.includes('<ul>') || p.includes('<blockquote>') || p.includes('<pre>')) {
        return p;
      }
      return `<p>${p.trim()}</p>`;
    }).join('\n');
    
    return html;
  }
}