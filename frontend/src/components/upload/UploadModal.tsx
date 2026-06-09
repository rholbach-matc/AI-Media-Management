import { ChangeEvent, DragEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, Search, Upload, XCircle } from 'lucide-react';
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
  status: 'queued' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface UploadFields {
  prompt_text: string;
  prompt_type: PromptType;
  parent_id: string;
  generation_mode: GenerationMode;
  moderation_outcome: ModerationOutcome;
  rating: string;
  notes: string;
}

const defaultFields: UploadFields = {
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
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [fields, setFields] = useState<UploadFields>(defaultFields);
  const [parentSearch, setParentSearch] = useState('');
  const [parentOptions, setParentOptions] = useState<OutputNode[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void api
        .getOutputs({ page: 1, per_page: 12, search: parentSearch || undefined })
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
  }, [open, parentSearch]);

  useEffect(() => {
    queuedFilesRef.current = queuedFiles;
  }, [queuedFiles]);

  useEffect(() => {
    return () => {
      queuedFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const successfulCount = useMemo(
    () => queuedFiles.filter((item) => item.status === 'success').length,
    [queuedFiles],
  );

  if (!open) return null;

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

  async function uploadFiles() {
    setIsUploading(true);
    try {
      for (const item of queuedFiles) {
        if (item.status === 'success') continue;
        setQueuedFiles((current) =>
          current.map((queued) => (queued.id === item.id ? { ...queued, status: 'uploading', error: undefined } : queued)),
        );
        const formData = new FormData();
        formData.append('file', item.file);
        if (fields.prompt_text.trim()) formData.append('prompt_text', fields.prompt_text.trim());
        formData.append('prompt_type', fields.prompt_type);
        if (fields.parent_id) formData.append('parent_id', fields.parent_id);
        formData.append('generation_mode', fields.generation_mode);
        formData.append('moderation_outcome', fields.moderation_outcome);
        if (fields.rating) formData.append('rating', fields.rating);
        if (fields.notes.trim()) formData.append('notes', fields.notes.trim());

        try {
          await api.uploadOutput(formData);
          setQueuedFiles((current) =>
            current.map((queued) => (queued.id === item.id ? { ...queued, status: 'success' } : queued)),
          );
        } catch (error) {
          setQueuedFiles((current) =>
            current.map((queued) =>
              queued.id === item.id ? { ...queued, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' } : queued,
            ),
          );
        }
      }
      navigate('/gallery');
    } finally {
      setIsUploading(false);
    }
  }

  function closeModal() {
    if (isUploading) return;
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
              className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition ${
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
              <ImagePlus className="mb-3 text-cyan-200" size={34} />
              <p className="font-medium text-slate-100">Drop images or videos here</p>
              <p className="mt-2 text-sm text-slate-400">PNG, JPG, WebP, GIF, MP4, WebM up to 100MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptedTypes.join(',')}
                className="sr-only"
                onChange={handleInputChange}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {queuedFiles.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-md border border-slate-800 bg-panel">
                  <div className="aspect-square bg-slate-950">
                    {item.file.type.startsWith('video/') ? (
                      <video src={item.previewUrl} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="truncate text-xs text-slate-300" title={item.file.name}>
                      {item.file.name}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize text-slate-400">{item.status}</span>
                      {item.status === 'success' ? <CheckCircle2 className="text-emerald-300" size={16} /> : null}
                    </div>
                    {item.status === 'uploading' ? <div className="h-1.5 animate-pulse rounded-full bg-cyan-300" /> : null}
                    {item.error ? <p className="text-xs text-rose-300">{item.error}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
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

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Parent output</span>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-3 text-slate-500" size={16} />
                <input
                  value={parentSearch}
                  onChange={(event) => setParentSearch(event.target.value)}
                  placeholder="Search prompts or notes"
                  className="w-full rounded-md border border-slate-700 bg-slate-950/70 py-2.5 pl-9 pr-3 text-ink outline-none focus:border-cyan-300"
                />
              </div>
              <select
                value={fields.parent_id}
                onChange={(event) => updateField('parent_id', event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-3 text-ink outline-none focus:border-cyan-300"
              >
                <option value="">No parent</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.node_type.replace('_', ' ')} - {option.prompts[0]?.prompt_text.slice(0, 60) || option.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>

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
            {queuedFiles.length} queued, {successfulCount} uploaded
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
