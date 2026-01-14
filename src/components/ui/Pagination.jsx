import { Button } from "@/components/ui/button";

const Pagination = ({
  page,
  pageSize,
  totalRecords,
  onPageChange,
  className = "",
}) => {
  const totalPages = Math.ceil(totalRecords / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-end gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Prev
      </Button>

      <span className="text-sm text-muted-foreground">
        Page <strong>{page}</strong> of <strong>{totalPages}</strong>
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
};

export default Pagination;
