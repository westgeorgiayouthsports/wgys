import React from 'react';
import { $getRoot, $getSelection, FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode, $createHeadingNode } from '@lexical/rich-text';
import { ListItemNode, ListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { TableNode, TableCellNode, TableRowNode, INSERT_TABLE_COMMAND, TablePlugin } from '@lexical/table';
import { $getSelection as getSelection, $isRangeSelection, $createParagraphNode } from 'lexical';
import './RichTextEditor.css';

interface Props {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

function MyOnChangePlugin({ onChange }: { onChange: (html: string) => void }) {
  const [editor] = useLexicalComposerContext();
  return (
    <OnChangePlugin
      onChange={(editorState) => {
        editorState.read(() => {
          const html = $generateHtmlFromNodes(editor, null);
          onChange(html);
        });
      }}
    />
  );
}

function InitialContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  
  React.useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      root.setDirection('ltr');
      root.clear();
      
      if (content) {
        const parser = new DOMParser();
        const dom = parser.parseFromString(content, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        nodes.forEach(node => {
          if (node.__type !== 'text') {
            root.append(node);
          }
        });
      }
    });
  }, [editor, content]);
  
  return null;
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [showImageDropdown, setShowImageDropdown] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const formatText = (format: 'bold' | 'italic' | 'underline') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };
  
  const formatHeading = (headingSize: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = getSelection();
      if ($isRangeSelection(selection)) {
        selection.getNodes().forEach((node) => {
          const headingNode = $createHeadingNode(headingSize);
          node.replace(headingNode);
        });
      }
    });
  };
  
  const insertList = (listType: 'bullet' | 'number') => {
    if (listType === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };
  
  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      editor.update(() => {
        const selection = getSelection();
        if ($isRangeSelection(selection)) {
          const textContent = selection.getTextContent() || url;
          selection.insertText(``);
          const root = $getRoot();
          const linkHTML = `<a href="${url}" target="_blank">${textContent}</a>`;
          const parser = new DOMParser();
          const dom = parser.parseFromString(linkHTML, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          selection.insertNodes(nodes);
        }
      });
    }
  };

  const insertImage = (src: string) => {
    editor.update(() => {
      const selection = getSelection();
      if ($isRangeSelection(selection)) {
        const imageHTML = `<p><img src="${src}" alt="Image" style="max-width: 100%; height: auto;" /></p>`;
        const parser = new DOMParser();
        const dom = parser.parseFromString(imageHTML, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        const root = $getRoot();
        if (nodes.length > 0) {
          root.append(nodes[0]);
        }
      }
    });
  };

  const handleImageFromURL = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      insertImage(url);
    }
    setShowImageDropdown(false);
  };

  const handleImageFromFile = () => {
    fileInputRef.current?.click();
    setShowImageDropdown(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        insertImage(src);
      };
      reader.readAsDataURL(file);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = () => setShowImageDropdown(false);
    if (showImageDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showImageDropdown]);
  
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={() => formatText('bold')} className="toolbar-btn" title="Bold">
          <strong>B</strong>
        </button>
        <button onClick={() => formatText('italic')} className="toolbar-btn" title="Italic">
          <em>I</em>
        </button>
        <button onClick={() => formatText('underline')} className="toolbar-btn" title="Underline">
          <u>U</u>
        </button>
      </div>
      
      <div className="toolbar-group">
        <button onClick={() => formatHeading('h1')} className="toolbar-btn" title="Heading 1">
          H1
        </button>
        <button onClick={() => formatHeading('h2')} className="toolbar-btn" title="Heading 2">
          H2
        </button>
        <button onClick={() => formatHeading('h3')} className="toolbar-btn" title="Heading 3">
          H3
        </button>
      </div>
      
      <div className="toolbar-group">
        <button onClick={() => insertList('bullet')} className="toolbar-btn" title="Bullet List">
          • List
        </button>
        <button onClick={() => insertList('number')} className="toolbar-btn" title="Numbered List">
          1. List
        </button>
      </div>
      
      <div className="toolbar-group">
        <button onClick={insertLink} className="toolbar-btn" title="Insert Link">
          🔗 Link
        </button>
        <div className="image-dropdown" style={{ position: 'relative', display: 'inline-block' }}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowImageDropdown(!showImageDropdown);
            }} 
            className="toolbar-btn" 
            title="Insert Image"
          >
            🖼️ Image ▼
          </button>
          {showImageDropdown && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 1000,
                minWidth: '150px'
              }}>
              <button 
                onClick={handleImageFromURL}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                From URL
              </button>
              <button 
                onClick={handleImageFromFile}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Upload File
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        <button onClick={() => {
          editor.update(() => {
            const selection = getSelection();
            if ($isRangeSelection(selection)) {
              const tableHTML = `<table style="border-collapse: collapse; width: 100%; margin: 16px 0;"><thead><tr><th style="border: 1px solid #d1d5db; padding: 8px; background-color: #f3f4f6;">Header 1</th><th style="border: 1px solid #d1d5db; padding: 8px; background-color: #f3f4f6;">Header 2</th><th style="border: 1px solid #d1d5db; padding: 8px; background-color: #f3f4f6;">Header 3</th></tr></thead><tbody><tr><td style="border: 1px solid #d1d5db; padding: 8px;">Cell 1</td><td style="border: 1px solid #d1d5db; padding: 8px;">Cell 2</td><td style="border: 1px solid #d1d5db; padding: 8px;">Cell 3</td></tr><tr><td style="border: 1px solid #d1d5db; padding: 8px;">Cell 4</td><td style="border: 1px solid #d1d5db; padding: 8px;">Cell 5</td><td style="border: 1px solid #d1d5db; padding: 8px;">Cell 6</td></tr></tbody></table>`;
              const parser = new DOMParser();
              const dom = parser.parseFromString(tableHTML, 'text/html');
              const nodes = $generateNodesFromDOM(editor, dom);
              selection.insertNodes(nodes);
            }
          });
        }} className="toolbar-btn" title="Insert Table">
          📊 Table
        </button>
      </div>
    </div>
  );
}

export default function RichTextEditor({ value, onChange, placeholder = 'Start typing...' }: Props) {
  const [isHtmlMode, setIsHtmlMode] = React.useState(false);
  const [htmlContent, setHtmlContent] = React.useState(value);

  const initialConfig = {
    namespace: 'MyEditor',
    theme: {
      paragraph: 'editor-paragraph',
      heading: {
        h1: 'editor-heading-h1',
        h2: 'editor-heading-h2',
        h3: 'editor-heading-h3',
      },
      list: {
        nested: {
          listitem: 'editor-nested-listitem',
        },
        ol: 'editor-list-ol',
        ul: 'editor-list-ul',
        listitem: 'editor-listitem',
      },
      link: 'editor-link',
      text: {
        bold: 'editor-text-bold',
        italic: 'editor-text-italic',
        underline: 'editor-text-underline',
      },
      table: 'editor-table',
      tableCell: 'editor-table-cell',
      tableCellHeader: 'editor-table-cell-header',
    },
    onError: (error: Error) => {
      console.error(error);
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      LinkNode,
      AutoLinkNode,
      TableNode,
      TableCellNode,
      TableRowNode,
    ],
  };

  const handleModeToggle = () => {
    if (isHtmlMode) {
      // Switching from HTML to Rich Text
      onChange(htmlContent);
    } else {
      // Switching from Rich Text to HTML
      setHtmlContent(value);
    }
    setIsHtmlMode(!isHtmlMode);
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setHtmlContent(newValue);
    onChange(newValue);
  };

  return (
    <div className="rich-text-editor">
      <div className="toolbar">
        <div className="toolbar-group">
          <button 
            onClick={handleModeToggle} 
            className="toolbar-btn" 
            title={isHtmlMode ? 'Switch to Rich Text' : 'Switch to HTML'}
            type="button"
          >
            {isHtmlMode ? '📝 Rich Text' : '🔧 HTML'}
          </button>
        </div>
      </div>
      
      {isHtmlMode ? (
        <textarea
          value={htmlContent}
          onChange={handleHtmlChange}
          placeholder="Enter HTML content..."
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '16px',
            border: 'none',
            outline: 'none',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            resize: 'vertical'
          }}
        />
      ) : (
        <LexicalComposer initialConfig={initialConfig}>
          <ToolbarPlugin />
          <div className="editor-container">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-input"
                  dir="ltr"
                  style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'embed' }}
                  placeholder={<div className="editor-placeholder">{placeholder}</div>}
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <MyOnChangePlugin onChange={onChange} />
            <InitialContentPlugin content={value} />
          </div>
        </LexicalComposer>
      )}
    </div>
  );
}