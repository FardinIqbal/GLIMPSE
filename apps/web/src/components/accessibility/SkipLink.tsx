"use client";

interface SkipLinkProps {
  targetId: string;
  children?: React.ReactNode;
}

/**
 * Skip link for keyboard navigation
 * Allows users to bypass navigation and jump to main content
 */
export function SkipLink({ targetId, children = "Skip to main content" }: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="skip-link"
    >
      {children}
    </a>
  );
}
