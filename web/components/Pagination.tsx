"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function Pagination({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between pt-6 border-t border-edge mt-2">
      <span className="text-xs text-ink-muted font-mono">
        {total} jobs &middot; page {page}/{totalPages}
      </span>
      <div className="flex gap-1">
        <PageButton label="Prev" disabled={page <= 1} onClick={() => goTo(page - 1)} />
        <PageButton
          label="Next"
          disabled={page >= totalPages}
          onClick={() => goTo(page + 1)}
        />
      </div>
    </div>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="h-8 px-3 text-xs font-medium border border-edge rounded-md
                 hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                 cursor-pointer"
    >
      {label}
    </button>
  );
}
