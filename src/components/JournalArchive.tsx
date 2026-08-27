import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { 
  Search, 
  Trash2, 
  Edit3, 
  Download, 
  Calendar, 
  MessageSquareHeart, 
  FileText,
  Upload,
  ArrowUpDown
} from 'lucide-react';
import { exportAllDataAsJSON, exportEntryAsMarkdown } from '../utils/storage';
import { motion } from 'motion/react';

interface JournalArchiveProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => void;
  onImportEntries: (newEntries: JournalEntry[]) => void;
}

export const JournalArchive: React.FC<JournalArchiveProps> = ({
  entries,
  onSelectEntry,
  onDeleteEntry,
  onImportEntries,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMood, setFilterMood] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Filter and sort entries
  const filteredEntries = entries
    .filter((entry) => {
      const matchesQuery =
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.companionReflection && entry.companionReflection.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMood = filterMood === 'all' || entry.mood === filterMood;
      return matchesQuery && matchesMood;
    })
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

  // Handle JSON backup import
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.journalEntries && Array.isArray(json.journalEntries)) {
          onImportEntries(json.journalEntries);
          alert(`Successfully restored ${json.journalEntries.length} reflection pages!`);
        } else if (Array.isArray(json)) {
          onImportEntries(json);
          alert(`Successfully restored ${json.length} reflection pages!`);
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        console.error('Failed to import backup:', err);
        alert('Could not parse backup file. Please provide valid JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 bg-[#FDFCFB] overflow-y-auto px-4 sm:px-10 py-8 pb-24">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header & Backup tools */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#A8A29D]">
              Record of Thought
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#3C3833] mt-1">
              Reflection Archives
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <label 
              htmlFor="input-import-backup"
              className="px-4 py-2 rounded-full bg-[#FAF9F6] hover:bg-[#F7F6F3] text-[#3C3833] border border-[#EEECE8] text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-[#8C8881]" />
              <span>Import JSON</span>
              <input
                id="input-import-backup"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              id="btn-export-all-backup"
              onClick={exportAllDataAsJSON}
              className="px-4 py-2 rounded-full bg-[#3C3833] hover:bg-black text-white text-xs font-medium transition-colors flex items-center gap-2 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Archive</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#EEECE8] shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#A8A29D] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-archive"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reflections, tensions, insights..."
              className="w-full pl-10 pr-4 py-2 text-xs text-[#3C3833] bg-[#F7F6F3] rounded-full border border-[#EEECE8] focus:outline-hidden focus:border-[#A8A29D]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              id="select-filter-mood"
              value={filterMood}
              onChange={(e) => setFilterMood(e.target.value)}
              className="text-xs text-[#3C3833] bg-[#F7F6F3] border border-[#EEECE8] rounded-full px-3.5 py-2 focus:outline-hidden"
            >
              <option value="all">All Atmospheres</option>
              <option value="Grounded">Grounded</option>
              <option value="Overwhelmed">Overwhelmed</option>
              <option value="Uncertain">Uncertain</option>
              <option value="Hopeful">Hopeful</option>
              <option value="Restless">Restless</option>
              <option value="Grateful">Grateful</option>
              <option value="Heavy-hearted">Heavy-hearted</option>
              <option value="Curious">Curious</option>
              <option value="Frustrated">Frustrated</option>
              <option value="Peaceful">Peaceful</option>
            </select>

            <button
              id="btn-toggle-sort"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="p-2.5 rounded-full bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#5C5852] border border-[#EEECE8] text-xs transition-colors flex items-center gap-1.5"
              title={`Sort ${sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>

        {/* Entries List */}
        {filteredEntries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#EEECE8] p-8 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EEECE8] flex items-center justify-center text-[#A8A29D]">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-serif text-[#3C3833]">
              No reflection entries found
            </h3>
            <p className="text-xs text-[#8C8881] max-w-sm">
              {searchQuery || filterMood !== 'all'
                ? 'Try clearing your search query or atmosphere filter.'
                : 'Write your first reflection page or conversation to start your personal archive.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredEntries.map((entry) => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 border border-[#EEECE8] shadow-2xs hover:border-[#D6D3D1] transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-mono text-[#8C8881] flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-[#A8A29D]" />
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold bg-[#F7F6F3] text-[#5C5852] px-2.5 py-0.5 rounded-full border border-[#EEECE8]">
                      {entry.mood}
                    </span>
                  </div>

                  <h4 className="font-serif text-lg text-[#3C3833] group-hover:text-black transition-colors line-clamp-1 mb-2">
                    {entry.title}
                  </h4>

                  <p className="text-xs text-[#5C5852] line-clamp-3 leading-relaxed font-sans mb-4">
                    {entry.content}
                  </p>

                  {entry.companionReflection && (
                    <div className="p-3.5 rounded-2xl bg-[#F7F6F3] border border-[#EEECE8] text-xs text-[#4A4743] font-serif italic line-clamp-2 mb-4 flex items-start gap-2">
                      <MessageSquareHeart className="w-3.5 h-3.5 text-[#8C8881] shrink-0 mt-0.5" />
                      <span>{entry.companionReflection}</span>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-[#EEECE8] flex items-center justify-between text-xs">
                  <span className="text-[#8C8881] font-mono text-[10px]">
                    {entry.wordCount || entry.content.split(/\s+/).length} words
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => exportEntryAsMarkdown(entry)}
                      className="p-2 rounded-full text-[#8C8881] hover:text-[#3C3833] hover:bg-[#F7F6F3] transition-colors"
                      title="Export Markdown"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${entry.title}" from your archive?`)) {
                          onDeleteEntry(entry.id);
                        }
                      }}
                      className="p-2 rounded-full text-[#8C8881] hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onSelectEntry(entry)}
                      className="px-3.5 py-1.5 bg-[#3C3833] hover:bg-black text-white rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ml-1 shadow-2xs"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Open</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
