interface Props {
  value: number
  onChange?: (v: number) => void
  size?: number
  readonly?: boolean
}

export default function StarRating({ value, onChange, size = 20, readonly = false }: Props) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>, star: number) {
    if (readonly || !onChange) return
    const rect = e.currentTarget.getBoundingClientRect()
    const half = (e.clientX - rect.left) < rect.width / 2
    onChange(half ? star - 0.5 : star)
  }

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(star => {
        const full = value >= star
        const half = !full && value >= star - 0.5

        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={e => handleClick(e, star)}
            className={`relative transition-transform ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
            style={{ width: size, height: size }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <clipPath id={`half-${star}`}>
                  <rect x="0" y="0" width="12" height="24" />
                </clipPath>
              </defs>

              {/* Empty star base */}
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                fill="none"
                stroke="#d1d5db"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Full fill */}
              {full && (
                <polygon
                  points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                  fill="#f59e0b"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Half fill */}
              {half && (
                <polygon
                  points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                  fill="#f59e0b"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  clipPath={`url(#half-${star})`}
                />
              )}
            </svg>
          </button>
        )
      })}
    </div>
  )
}
