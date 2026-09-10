export default function Pagination({ page, totalPages, total, perPage, onPageChange }) {
  if (total === 0) return null

  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  const pageNumbers = []
  const windowSize = 2
  for (let p = Math.max(1, page - windowSize); p <= Math.min(totalPages, page + windowSize); p++) {
    pageNumbers.push(p)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-border">
      <span className="text-xs text-ink/50">
        Showing {from}–{to} of {total} entries
      </span>
      <div className="flex items-center gap-1">
        <button
          className="btn-secondary px-3 py-1 text-sm disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        {pageNumbers[0] > 1 && <span className="px-2 text-ink/40">…</span>}
        {pageNumbers.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 text-sm rounded-sm ${
              p === page ? 'bg-teal-700 text-white' : 'btn-secondary'
            }`}
          >
            {p}
          </button>
        ))}
        {pageNumbers[pageNumbers.length - 1] < totalPages && <span className="px-2 text-ink/40">…</span>}
        <button
          className="btn-secondary px-3 py-1 text-sm disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}