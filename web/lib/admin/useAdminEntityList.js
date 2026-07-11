'use client';

import { useCallback, useEffect, useState } from 'react';

// Generalizes the search-debounce/paginate/load pattern proven in the
// route-pages tab (RoutePagesClient) — every geo sub-tab (cities/
// countries/airports/airlines) needs the exact same fetch/debounce/
// pagination shape against a different `/admin/api/<entity>` endpoint.
export default function useAdminEntityList({ endpoint, dataKey }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`${endpoint}?${params.toString()}`);
    const data = await res.json();
    if (data.ok) {
      setRows(data[dataKey] || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    }
    setLoading(false);
  }, [endpoint, dataKey, page, debouncedSearch, statusFilter]);

  // [SET-STATE-IN-EFFECT] setLoading/setRows/etc. all run inside this
  // setTimeout callback boundary, same pattern as AirportAutocomplete/
  // RoutePagesClient.
  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  return {
    rows, total, page, setPage, totalPages, loading,
    search, setSearch, statusFilter, setStatusFilter,
    reload: load,
  };
}
