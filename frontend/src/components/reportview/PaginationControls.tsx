interface PaginationControlsProps {
    currentPage: number
    totalItems: number
    itemsPerPage: number
    onChange: (page: number) => void
}

function PaginationControls({ currentPage, totalItems, itemsPerPage, onChange }: PaginationControlsProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage)

    return (
        <div className="flex justify-between items-center mt-4">
            <button
                onClick={() => onChange(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}>
                Previous
            </button>
            <p className="text-sm text-gray-500">
                Page {currentPage + 1} of {totalPages}
            </p>
            <button
                onClick={() => onChange(currentPage + 1)}
                disabled={currentPage + 1 >= totalPages}>
                Next
            </button>
        </div>
    )
}

export default PaginationControls