import { ChangeEvent, DragEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Film, ImagePlus, Search, Upload, X, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { GenerationMode, ModerationOutcome, OutputNode, PromptType } from '../../types';
import { Button } from '../ui/Button';

const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'queued' | 'uploading' | 'error';
  error?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  previewUrl: string;
}

interface UploadFields {
  title: string;
  prompt_text: string;
  prompt_type: PromptType;
  parent_id: string;
  generation_mode: GenerationMode;
  moderation_outcome: ModerationOutcome;
  rating: string;
  notes: string;
}

const defaultFields: UploadFields = {
  title: '',
  prompt_text: '',
  prompt_type: 'base',
  parent_id: '',
  generation_mode: 'speed',
  moderation_outcome: 'not_applicable',
  rating: '',
  notes: '',
};

export function UploadModal({ open, onClose }: UploadModalProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queuedFilesRef = useRef<QueuedFile[]>([]);
  const uploadedHistoryRef = useRef<UploadedFile[]>([]);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [uploadedHistory, setUploadedHistory] = useState<UploadedFile[]>([]);
  const [fields, setFields] = useState<UploadFields>(defaultFields);
  const [selectedParent, setSelectedParent] = useState<OutputNode | null>(null);
  const [parentSearch, setParentSearch] = useState('');
  const [parentOptions, setParentOptions] = useState<OutputNode[]>([]);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (open) resetUploadState();
  }, [open]);

  useEffect(() => {
    queuedFilesRef.current = queuedFiles;
  }, [queuedFiles]);

  useEffect(() => {
    uploadedHistoryRef.current = uploadedHistory;
  }, [uploadedHistory]);

  useEffect(() => {
    if (!open || !parentPickerOpen) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void api
        .getOutputs({ page: 1, per_page: 60, search: parentSearch || undefined })
        .then((response) => {
          if (active) setParentOptions(response.items);
        })
        .catch(() => {
          if (active) setParentOptions([]);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, parentPickerOpen, parentSearch]);

  useEffect(() => {
    return () => {
      revokeFiles(queuedFilesRef.current);
      revokeFiles(uploadedHistoryRef.current);
    };
  }, []);

  const queuedCount = queuedFiles.length;
  const uploadedCount = uploadedHistory.length;
  const displayedUploads = useMemo(() => uploadedHistory.slice(0, 3), [uploadedHistory]);
  const hiddenUploadCount = Math.max(uploadedHistory.length - displayedUploads.length, 0);

  if (!open) return null;

  function resetFields() {
    setFields(defaultFields);
    setSelectedParent(null);
    setParentSearch('');
  }

  function resetUploadState() {
    revokeFiles(queuedFilesRef.current);
    revokeFiles(uploadedHistoryRef.current);
    queuedFilesRef.current = [];
    uploadedHistoryRef.current = [];
    setQueuedFiles([]);
    setUploadedHistory([]);
    setParentOptions([]);
    setParentPickerOpen(false);
    setIsDragging(false);
    resetFields();
  }

  function appendFiles(files: FileList | File[]) {
    const validFiles = Array.from(files).filter((file) => acceptedTypes.includes(file.type));
    setQueuedFiles((current) => [
      ...current,
      ...validFiles.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'queued' as const,
      })),
    ]);
  }

  function removeQueuedFile(id: string) {
    setQueuedFiles((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    appendFiles(event.dataTransfer.files);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      appendFiles(event.target.files);
      event.target.value = '';
    }
  }

  function updateField<K extends keyof UploadFields>(field: K, value: UploadFields[K]) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function selectParent(parent: OutputNode) {
    setSelectedParent(parent);
    updateField('parent_id', parent.id);
    setParentPickerOpen(false);
  }

  function clearParent() {
    setSelectedParent(null);
    updateField('parent_id', '');
  }

  async function uploadFiles() {
    const batch = queuedFiles.filter((item) => item.status !== 'uploading');
    if (!batch.length) return;

    setIsUploading(true);
    let hasFailures = false;
    try {
      for (const item of batch) {
        setQueuedFiles((current) =>
          current.map((queued) => (queued.id === item.id ? { ...queued, status: 'uploading', error: undefined } : queued)),
        );
        const formData = new FormData();
        formData.append('file', item.file);
        if (fields.title.trim()) formData.append('title', fields.title.trim());
        if (fields.prompt_text.trim()) formData.append('prompt_text', fields.prompt_text.trim());
        formData.append('prompt_type', fields.prompt_type);
        if (fields.parent_id) formData.append('parent_id', fields.parent_id);
        formData.append('generation_mode', fields.generation_mode);
        formData.append('moderation_outcome', fields.moderation_outcome);
        if (fields.rating) formData.append('rating', fields.rating);
        if (fields.notes.trim()) formData.append('notes', fields.notes.trim());

        try {
          await api.uploadOutput(formData);
          setQueuedFiles((current) => current.filter((queued) => queued.id !== item.id));
          setUploadedHistory((current) => [{ id: item.id, name: item.file.name, type: item.file.type, previewUrl: item.previewUrl }, ...current]);
        } catch (error) {
          hasFailures = true;
          setQueuedFiles((current) =>
            current.map((queued) =>
              queued.id === item.id ? { ...queued, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' } : queued,
            ),
          );
        }
      }
      if (!hasFailures) resetFields();
      navigate('/gallery');
    } finally {
      setIsUploading(false);
    }
  }

  function closeModal() {
    if (isUploading) return;
    resetUploadState();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-lg border border-slate-700 bg-charcoal shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">Upload outputs</h2>
          <Button type="button" variant="ghost" className="h-9 w-9 px-0" onClick={closeModal} aria-label="Close upload modal">
            <XCircle size={20} />
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section>
            <div
              className={`min-h-56 cursor-pointer rounded-lg border border-dashed p-4 transition ${
                isDragging ? 'border-cyan-300 bg-cyan-400/10' : 'border-slate-700 bg-slate-950/45 hover:border-slate-500'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {queuedFiles.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {queuedFiles.map((item) => (
                    <QueuedPreview key={item.id} item={item} disabled={isUploading} onRemove={() => removeQueuedFile(item.id)} />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center text-center">
                  <ImagePlus className="mb-3 text-cyan-200" size={34} />
                  <p className="font-medium text-slate-100">Drop images or videos here</p>
                  <p className="mt-2 text-sm text-slate-400">PNG, JPG, WebP, GIF, MP4, WebM up to 100MB each</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptedTypes.join(',')}
                className="sr-only"
                onChange={handleInputChange}
              />
            </div>

            {uploadedHistory.length ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-200">Uploaded</h3>
                  {hiddenUploadCount ? <span className="text-xs text-slate-400">and {hiddenUploadCount} more uploaded</span> : null}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {displayedUploads.map((item) => (
                    <div key={item.id} className="overflow-hidden rounded-md border border-slate-800 bg-panel">
                      <div className="aspect-square bg-slate-950">
                        {item.type.startsWith('video/') ? (
                          <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-slate-300">
                            <Film className="text-cyan-200" size={30} />
                            <span className="line-clamp-2 text-xs">{item.name}</span>
                          </div>
                        ) : (
                          <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 p-3">
                        <CheckCircle2 className="shrink-0 text-emerald-300" size={16} />
                        <p className="min-w-0 truncate text-xs text-slate-300" title={item.name}>
                          {item.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Title</span>
              <input
                value={fields.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="Give this output a name (optional)"
                className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-3 text-ink outline-none focus:border-cyan-300"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Prompt text</span>
              <textarea
                value={fields.prompt_text}
                onChange={(event) => updateField('prompt_text', event.target.value)}
                rows={5}
                className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-3 text-ink outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Prompt type" value={fields.prompt_type} onChange={(value) => updateField('prompt_type', value as PromptType)}>
                <option value="base">Base</option>
                <option value="edit">Edit</option>
                <option value="extension">Extension</option>
              </Select>
              <Select
                label="Generation mode"
                value={fields.generation_mode}
                onChange={(value) => updateField('generation_mode', value as GenerationMode)}
              >
                <option value="speed">Speed</option>
                <option value="quality">Quality</option>
              </Select>
            </div>

            <Select
              label="Moderation outcome"
              value={fields.moderation_outcome}
              onChange={(value) => updateField('moderation_outcome', value as ModerationOutcome)}
            >
              <option value="not_applicable">N/A</option>
              <option value="passed">Passed</option>
              <option value="blocked">Blocked</option>
            </Select>

            <div>
              <span className="mb-2 block text-sm font-medium text-slate-200">Parent output</span>
              {selectedParent ? (
                <div className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-950/70 p-2">
                  <img src={selectedParent.thumbnail_path || selectedParent.file_path} alt="" className="h-14 w-14 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{selectedParent.title || 'Untitled'}</p>
                    <p className="truncate text-xs text-slate-400">{selectedParent.prompts[0]?.prompt_text || selectedParent.id}</p>
                  </div>
                  <Button type="button" variant="secondary" className="px-3" onClick={() => setParentPickerOpen(true)}>
                    Change
                  </Button>
                  <Button type="button" variant="ghost" className="px-3" onClick={clearParent}>
                    Clear
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border border-slate-700 bg-slate-950/70 p-3">
                  <p className="mb-3 text-sm text-slate-400">No parent (new base image)</p>
                  <Button type="button" variant="secondary" onClick={() => setParentPickerOpen(true)}>
                    Select Parent
                  </Button>
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Rating</span>
              <input
                type="number"
                min={1}
                max={10}
                value={fields.rating}
                onChange={(event) => updateField('rating', event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-3 text-ink outline-none focus:border-cyan-300"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Notes</span>
              <textarea
                value={fields.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-3 text-ink outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25"
              />
            </label>
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            {queuedCount ? `${queuedCount} queued, ${uploadedCount} uploaded` : uploadedCount ? `${uploadedCount} uploaded` : '0 queued'}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void uploadFiles()} disabled={queuedFiles.length === 0 || isUploading}>
              <Upload size={18} />
              Upload
            </Button>
          </div>
        </div>
      </div>

      {parentPickerOpen ? (
        <ParentPicker
          options={parentOptions}
          search={parentSearch}
          onSearch={setParentSearch}
          onSelect={selectParent}
          onClose={() => setParentPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}

interface QueuedPreviewProps {
  item: QueuedFile;
  disabled: boolean;
  onRemove: () => void;
}

function QueuedPreview({ item, disabled, onRemove }: QueuedPreviewProps) {
  return (
    <div className="relative overflow-hidden rounded-md border border-slate-800 bg-panel" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-slate-950/85 text-slate-100 hover:text-rose-200 disabled:opacity-50"
        onClick={onRemove}
        aria-label={`Remove ${item.file.name}`}
      >
        <X size={15} />
      </button>
      <div className="aspect-square bg-slate-950">
        {item.file.type.startsWith('video/') ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-slate-300">
            <Film className="text-cyan-200" size={30} />
            <span className="line-clamp-2 text-xs">{item.file.name}</span>
          </div>
        ) : (
          <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="space-y-2 p-3">
        <p className="truncate text-xs text-slate-300" title={item.file.name}>
          {item.file.name}
        </p>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">{formatBytes(item.file.size)}</span>
          <span className="capitalize text-slate-400">{item.status}</span>
        </div>
        {item.status === 'uploading' ? <div className="h-1.5 animate-pulse rounded-full bg-cyan-300" /> : null}
        {item.error ? <p className="text-xs text-rose-300">{item.error}</p> : null}
      </div>
    </div>
  );
}

interface ParentPickerProps {
  options: OutputNode[];
  search: string;
  onSearch: (value: string) => void;
  onSelect: (output: OutputNode) => void;
  onClose: () => void;
}

function ParentPicker({ options, search, onSearch, onSelect, onClose }: ParentPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[82vh] w-full max-w-2xl flex-col rounded-lg border border-slate-700 bg-charcoal shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <h3 className="font-semibold text-ink">Select parent</h3>
          <Button type="button" variant="ghost" className="h-9 w-9 px-0" onClick={onClose} aria-label="Close parent selector">
            <XCircle size={20} />
          </Button>
        </div>
        <div className="border-b border-slate-800 p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-500" size={16} />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search title or prompt"
              className="w-full rounded-md border border-slate-700 bg-slate-950/70 py-2.5 pl-9 pr-3 text-ink outline-none focus:border-cyan-300"
            />
          </label>
        </div>
        <div className="grid min-h-0 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-4">
          {options.length ? (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="overflow-hidden rounded-md border border-slate-800 bg-panel text-left transition hover:border-cyan-300/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                onClick={() => onSelect(option)}
              >
                <div className="aspect-square bg-slate-950">
                  <img src={option.thumbnail_path || option.file_path} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-slate-100">{option.title || 'Untitled'}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{option.prompts[0]?.prompt_text || option.node_type.replace('_', ' ')}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="col-span-full py-8 text-center text-sm text-slate-400">No outputs found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

function Select({ label, value, onChange, children }: SelectProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-3 text-ink outline-none focus:border-cyan-300"
      >
        {children}
      </select>
    </label>
  );
}

function revokeFiles(files: Array<{ previewUrl: string }>) {
  files.forEach((item) => URL.revokeObjectURL(item.previewUrl));
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
