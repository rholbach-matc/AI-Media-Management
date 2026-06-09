import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, Heart, Image, Pencil, Search, Star, Upload } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import type { NodeType, OutputNode, SortBy, SortOrder } from '../types';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const nodeFilters: Array<{ label: string; value: NodeType | '' }> = [
  { label: 'All', value: '' },
  { label: 'Base', value: 'base_image' },
  { label: 'Edit', value: 'edit' },
  { label: 'Animation', value: 'animation' },
];

export function GalleryPage() {
  const location = useLocation();
  const [items, setItems] = useState<OutputNode[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [nodeType, setNodeType] = useState<NodeType | ''>('');
  const [minRating, setMinRating] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void api
      .getOutputs({
        page,
        per_page: 40,
        sort_by: sortBy,
        sort_order: sortOrder,
        node_type: nodeType || undefined,
        min_rating: minRating ? Number(minRating) : undefined,
        is_favorite: favoritesOnly || undefined,
        search: debouncedSearch || undefined,
      })
      .then((response) => {
        if (!active) return;
        setItems(response.items);
        setTotal(response.total);
        setPages(response.pages);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load gallery');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, favoritesOnly, location.key, minRating, nodeType, page, sortBy, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, favoritesOnly, minRating, nodeType, sortBy, sortOrder]);

  const pageLabel = useMemo(() => (pages ? `Page ${page} of ${pages}` : 'No pages'), [page, pages]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Gallery</h2>
            <p className="mt-1 text-sm text-slate-400">{total} outputs</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-800 bg-panel p-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-500" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search prompts and notes"
              className="h-11 w-full rounded-md border border-slate-700 bg-slate-950/70 pl-10 pr-3 text-ink outline-none focus:border-cyan-300"
            />
          </label>

          <div className="flex gap-2 overflow-x-auto">
            {nodeFilters.map((filter) => (
              <Button
                key={filter.label}
                type="button"
                variant={nodeType === filter.value ? 'primary' : 'ghost'}
                className="h-11 whitespace-nowrap px-3"
                onClick={() => setNodeType(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              className="h-11 rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-ink outline-none focus:border-cyan-300"
            >
              <option value="created_at">Date</option>
              <option value="rating">Rating</option>
              <option value="file_size">File size</option>
              <option value="updated_at">Updated</option>
            </select>
            <Button type="button" variant="secondary" className="h-11 px-3" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? 'Asc' : 'Desc'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <input
              type="number"
              min={1}
              max={10}
              value={minRating}
              onChange={(event) => setMinRating(event.target.value)}
              placeholder="Min rating"
              className="h-11 rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-ink outline-none focus:border-cyan-300"
            />
            <Button
              type="button"
              variant={favoritesOnly ? 'primary' : 'ghost'}
              className="h-11 px-3"
              onClick={() => setFavoritesOnly((current) => !current)}
            >
              <Heart size={17} />
              Favorites
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-80 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">{error}</div>
      ) : items.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-slate-800 bg-panel p-8 text-center">
          <Upload className="mb-3 text-cyan-200" size={36} />
          <h3 className="text-lg font-semibold text-ink">No outputs yet</h3>
          <p className="mt-2 max-w-md text-sm text-slate-400">Use the Upload button in the header to add images and animations.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <GalleryCard key={item.id} item={item} />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </Button>
            <span className="text-sm text-slate-400">{pageLabel}</span>
            <Button type="button" variant="secondary" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function GalleryCard({ item }: { item: OutputNode }) {
  const [hovered, setHovered] = useState(false);
  const imagePath = hovered && item.animated_thumbnail_path ? item.animated_thumbnail_path : item.thumbnail_path || item.file_path;
  const Icon = item.node_type === 'animation' ? Clapperboard : item.node_type === 'edit' ? Pencil : Image;

  return (
    <Link
      to={`/outputs/${item.id}`}
      className="group relative block overflow-hidden rounded-md border border-slate-800 bg-slate-950 outline-none transition hover:-translate-y-0.5 hover:border-cyan-300/60 focus-visible:ring-2 focus-visible:ring-cyan-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="aspect-square overflow-hidden bg-slate-900">
        <img src={imagePath} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
      </div>
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
        <span className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-950/80 px-2 text-xs font-medium text-slate-100">
          <Icon size={14} />
          {item.node_type === 'base_image' ? 'Base' : item.node_type === 'edit' ? 'Edit' : 'Anim'}
        </span>
        <div className="flex gap-1">
          {item.rating ? (
            <span className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-950/80 px-2 text-xs font-medium text-amber-200">
              <Star size={13} />
              {item.rating}
            </span>
          ) : null}
          {item.is_favorite ? (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-950/80 text-rose-200">
              <Heart size={14} fill="currentColor" />
            </span>
          ) : null}
        </div>
      </div>
      {item.mime_type.startsWith('video/') ? (
        <span className="absolute bottom-2 right-2 rounded-md bg-slate-950/80 px-2 py-1 text-xs font-medium text-cyan-100">Video</span>
      ) : null}
    </Link>
  );
}
