/** Page numbers to show: first, last, current ±1, with gaps as null. */
function pageList(page: number, pages: number): Array<number | null> {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))
  const sorted = [...wanted].sort((a, b) => a - b)
  const out: Array<number | null> = []
  sorted.forEach((n, index) => {
    if (index > 0 && n - sorted[index - 1] > 1) out.push(sorted[index - 1] + 1 === n - 1 ? n - 1 : null)
    out.push(n)
  })
  return out
}

/** Numbered pager; hidden when everything fits on one page. */
export function Pager({ page, pages, goTo, className = 'customer-pager' }: { page: number; pages: number; goTo: (page: number) => void; className?: string }) {
  if (pages <= 1) return null
  return (
    <nav className={className + ' pager'} aria-label="Phân trang">
      <button type="button" disabled={page === 1} onClick={() => goTo(page - 1)} aria-label="Trang trước">‹</button>
      {pageList(page, pages).map((n, index) =>
        n === null ? (
          <span key={'gap' + index} className="pager-gap">…</span>
        ) : (
          <button key={n} type="button" className={n === page ? 'current' : ''} aria-current={n === page ? 'page' : undefined} onClick={() => goTo(n)}>
            {n}
          </button>
        ),
      )}
      <button type="button" disabled={page === pages} onClick={() => goTo(page + 1)} aria-label="Trang sau">›</button>
    </nav>
  )
}
