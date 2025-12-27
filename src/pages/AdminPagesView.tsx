import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import DOMPurify from 'dompurify';
import type { AdminPage } from '../services/firebaseAdminPages';
import { adminPagesService } from '../services/firebaseAdminPages';
import type { RootState } from '../store/store';

type PageType = 'policies' | 'about' | 'rules';

interface AdminPagesViewProps {
  isAdmin?: boolean;
}

export const AdminPagesView: React.FC<AdminPagesViewProps> = ({ isAdmin = false }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [currentPage, setCurrentPage] = useState<PageType>('about');
  const [_pageContent, setPageContent] = useState<AdminPage | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPage();
  }, [currentPage]);

  const loadPage = async () => {
    try {
      const content = await adminPagesService.getPage(currentPage);
      setPageContent(content);
      setEditedContent(content?.content || '');
    } catch (err) {
      console.error('❌ Error loading page:', err);
    }
  };

  const handleSave = async () => {
    if (!user || !isAdmin) {
      setMessage('You do not have permission to edit this page');
      return;
    }

    setSaving(true);
    try {
      await adminPagesService.updatePage(currentPage, editedContent, user.uid);
      setMessage('✅ Page saved successfully!');
      setTimeout(() => { setMessage(''); }, 3000);
      await loadPage();
    } catch (err) {
      console.error('❌ Error saving page:', err);
      setMessage('❌ Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const insertTemplate = (template: string) => {
    setEditedContent(prev => prev + template);
  };

  const pageLabels = {
    about: 'About WGYS',
    policies: 'Organization Policies',
    rules: 'Competition Rules',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Admin Pages</h2>
        <p className="text-gray-400">Manage public-facing content for your organization</p>
      </div>

      {/* Page Navigation */}
      <div className="flex gap-2">
        {(Object.keys(pageLabels) as PageType[]).map(page => (
          <button
            key={page}
            onClick={() => { setCurrentPage(page); }}
            className={`px-4 py-2 rounded-lg transition ${
              currentPage === page
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            {pageLabels[page]}
          </button>
        ))}
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('✅')
            ? 'bg-green-500/20 border border-green-500 text-green-300'
            : 'bg-red-500/20 border border-red-500 text-red-300'
        }`}>
          {message}
        </div>
      )}

      {/* Content Editor */}
      {isAdmin ? (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg space-y-3">
            <h3 className="font-medium text-gray-300">Quick Templates</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <button
                onClick={() => { insertTemplate('<h1>Heading</h1>'); }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded transition"
              >
                <code>H1</code>
              </button>
              <button
                onClick={() => { insertTemplate('<h2>Subheading</h2>'); }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded transition"
              >
                <code>H2</code>
              </button>
              <button
                onClick={() => { insertTemplate('<p>Paragraph</p>'); }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded transition"
              >
                <code>P</code>
              </button>
              <button
                onClick={() => { insertTemplate('<ul><li>Item</li></ul>'); }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded transition"
              >
                <code>List</code>
              </button>
              <button
                onClick={() => { insertTemplate('<strong>Bold</strong>'); }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded transition"
              >
                <code>B</code>
              </button>
              <button
                onClick={() => { insertTemplate('<em>Italic</em>'); }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded transition"
              >
                <code>I</code>
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Edit Content (HTML)
            </label>
            <textarea
              value={editedContent}
              onChange={(e) => { setEditedContent(e.target.value); }}
              className="w-full h-96 px-4 py-3 bg-slate-800 border border-slate-700 rounded text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Enter HTML content..."
            />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Preview</label>
            <div
              className="p-6 bg-slate-900 border border-slate-700 rounded text-gray-300 max-h-96 overflow-y-auto prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editedContent) }}
            />
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
          <div
            className="prose prose-invert max-w-none text-gray-300"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(editedContent || '<p>No content yet</p>')
            }}
          />
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-200">
        <p className="font-medium mb-2">💡 Tips:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Use HTML tags to format content (h1, h2, p, ul, strong, em, etc.)</li>
          <li>Changes are saved immediately to the database</li>
          <li>All authenticated users can view these pages</li>
          <li>Only admins can edit these pages</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPagesView;
