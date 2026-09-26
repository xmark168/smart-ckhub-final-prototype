/** "Đang lọc: [chip ×] … Xóa tất cả" bar shared by list pages. */
export function FilterChips({ chips, onClearAll }: { chips: Array<[string, () => void]>; onClearAll: () => void }) {
  if (!chips.length) return null
  return (
    <div className="kpi-filter-bar" role="group" aria-label="Điều kiện đang lọc">
      Đang lọc:
      {chips.map(([label, clear]) => (
        <span className="kpi-filter-tag" key={label}>{label} <button type="button" aria-label={'Bỏ ' + label} onClick={clear}>×</button></span>
      ))}
      {chips.length > 1 && <button type="button" className="text-btn" onClick={onClearAll}>Xóa tất cả</button>}
    </div>
  )
}
