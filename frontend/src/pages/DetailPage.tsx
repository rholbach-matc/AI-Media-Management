import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Heart, Maximize2, Star, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { OutputNode, OutputSummary } from '../types';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [output, setOutput] = useState<OutputNode | null>(null);
  const [galleryItems, setGalleryItems] = useState<OutputNode[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([api.getOutput(id), api.getOutputs({ page: 1, per_page: 100, sort_by: 'created_at', sort_order: 'desc' })])
      .then(([detail, gallery]) => {
        if (!active) return;
        setOutput(detail);
        setNotes(detail.notes ?? '');
        setGalleryItems(gallery.items);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load output');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!output || notes === (output.notes ?? '')) return;
    const timer = window.setTimeout(() => {
      void saveUpdate({ notes });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [notes, output]);

  const currentIndex = useMemo(() => galleryItems.findIndex((item) => item.id === id), [galleryItems, id]);
  const previous = currentIndex > 0 ? galleryItems[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < galleryItems.length - 1 ? galleryItems[currentIndex + 1] : null;

  async function saveUpdate(data: Partial<Pick<OutputNode, 'rating' | 'notes' | 'is_favorite' | 'moderation_outcome'>>) {
    if (!output) return;
    setSaving(true);
    try {
      const updated = await api.updateOutput(output.id, data);
      setOutput(updated);
      setNotes(updated.notes ?? '');
    } finally {
      setSaving(false);
    }
  }

  async function deleteOutput() {
    if (!output) return;
    await api.deleteOutput(output.id);
    navigate('/gallery');
  }

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !output) {
    return <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">{error || 'Output not found'}</div>;
  }

  const isVideo = output.mime_type.startsWith('video/');
  const isAnimatedImage = output.mime_type === 'image/gif';

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/gallery')}>
            <ArrowLeft size={18} />
            Gallery
          </Button>
          <Button type="button" variant="secondary" disabled={!previous} onClick={() => previous && navigate(`/outputs/${previous.id}`)}>
            <ChevronLeft size={18} />
            Previous
          </Button>
          <Button type="button" variant="secondary" disabled={!next} onClick={() => next && navigate(`/outputs/${next.id}`)}>
            Next
            <ChevronRight size={18} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">{saving ? 'Saving...' : 'Saved'}</span>
          <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={18} />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
            {isVideo ? (
              <video src={output.file_path} className="max-h-[78vh] w-full bg-black object-contain" controls playsInline />
            ) : (
              <button type="button" className="block w-full cursor-zoom-in bg-black" onClick={() => setLightboxOpen(true)}>
                <img src={output.file_path} alt="" className="mx-auto max-h-[78vh] w-full object-contain" />
              </button>
            )}
          </div>

          <section className="mt-5 rounded-lg border border-slate-800 bg-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-ink">Prompts</h3>
            </div>
            <div className="space-y-3">
              {output.prompts.length ? (
                output.prompts.map((prompt) => (
                  <div key={prompt.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium capitalize text-cyan-100">
                        {prompt.prompt_type === 'extension' ? `Extension ${prompt.extension_order ?? ''}` : prompt.prompt_type}
                      </span>
                      <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => void navigator.clipboard.writeText(prompt.prompt_text)}>
                        <Copy size={15} />
                        Copy
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-950/80 p-3 text-sm leading-6 text-slate-200">
                      {prompt.prompt_text}
                    </pre>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No prompt recorded for this output.</p>
              )}
            </div>
          </section>

          <section className="mt-5 rounded-lg border border-slate-800 bg-panel p-4">
            <h3 className="mb-3 font-semibold text-ink">Relationships</h3>
            <div className="space-y-4">
              {output.parent ? (
                <RelationshipLink label={output.node_type === 'animation' ? 'Extension of' : 'Edit of'} item={output.parent} />
              ) : (
                <p className="text-sm text-slate-400">This output has no parent.</p>
              )}
              {output.children.length ? (
                <div>
                  <p className="mb-2 text-sm text-slate-400">{output.children.length} direct children</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {output.children.slice(0, 8).map((child) => (
                      <RelationshipThumb key={child.id} item={child} />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No edits or animations branch from this output yet.</p>
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-800 bg-panel p-4">
            <h3 className="mb-4 font-semibold text-ink">Metadata</h3>
            <dl className="space-y-3 text-sm">
              <Meta label="Type" value={output.node_type.replace('_', ' ')} />
              <Meta label="Dimensions" value={`${output.width} x ${output.height}`} />
              <Meta label="File size" value={formatBytes(output.file_size)} />
              <Meta label="Duration" value={output.duration ? `${output.duration.toFixed(1)}s` : isAnimatedImage ? 'Animated image' : 'N/A'} />
              <Meta label="Generation" value={output.generation_mode} />
              <Meta label="Moderation" value={output.moderation_outcome.replace('_', ' ')} />
              <Meta label="Created" value={new Date(output.created_at).toLocaleString()} />
              <Meta label="Updated" value={new Date(output.updated_at).toLocaleString()} />
            </dl>
          </section>

          <section className="rounded-lg border border-slate-800 bg-panel p-4">
            <h3 className="mb-3 font-semibold text-ink">Rating</h3>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => void saveUpdate({ rating })}
                  className={`flex h-10 items-center justify-center rounded-md border text-sm font-semibold transition ${
                    output.rating === rating
                      ? 'border-amber-300 bg-amber-300 text-slate-950'
                      : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-amber-200'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant={output.is_favorite ? 'primary' : 'secondary'}
              className="mt-4 w-full"
              onClick={() => void saveUpdate({ is_favorite: !output.is_favorite })}
            >
              {output.is_favorite ? <Heart size={18} fill="currentColor" /> : <Star size={18} />}
              {output.is_favorite ? 'Favorited' : 'Favorite'}
            </Button>
          </section>

          <section className="rounded-lg border border-slate-800 bg-panel p-4">
            <h3 className="mb-3 font-semibold text-ink">Notes</h3>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={() => void saveUpdate({ notes })}
              rows={8}
              className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-3 text-ink outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25"
            />
          </section>
        </aside>
      </div>

      {lightboxOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxOpen(false)}
          aria-label="Close image preview"
        >
          <Maximize2 className="absolute right-5 top-5 text-slate-300" size={22} />
          <img src={output.file_path} alt="" className="max-h-full max-w-full object-contain" />
        </button>
      ) : null}

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-charcoal p-5">
            <h3 className="text-lg font-semibold text-ink">Delete output?</h3>
            <p className="mt-2 text-sm text-slate-400">This removes the database record, prompts, media file, and thumbnails.</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={() => void deleteOutput()}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right capitalize text-slate-100">{value}</dd>
    </div>
  );
}

function RelationshipLink({ label, item }: { label: string; item: OutputSummary }) {
  return (
    <div>
      <p className="mb-2 text-sm text-slate-400">{label}</p>
      <RelationshipThumb item={item} />
    </div>
  );
}

function RelationshipThumb({ item }: { item: OutputSummary }) {
  return (
    <Link to={`/outputs/${item.id}`} className="block overflow-hidden rounded-md border border-slate-800 bg-slate-950 hover:border-cyan-300/60">
      <div className="aspect-square">
        <img src={item.thumbnail_path || item.file_path} alt="" className="h-full w-full object-cover" />
      </div>
    </Link>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
