import { useState, useRef, useEffect, type ReactNode } from 'react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TruncatedCellProps {
  children: ReactNode;
  tooltipContent?: ReactNode;
  className?: string;
  disableHoverableContent?: boolean;
}

export function TruncatedCell({
  children,
  tooltipContent,
  className,
  disableHoverableContent,
}: TruncatedCellProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        setIsOverflowing(
          contentRef.current.scrollWidth > contentRef.current.clientWidth
        );
      }
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [children]);

  const content = (
    <div
      ref={contentRef}
      className={cn(
        'overflow-hidden whitespace-nowrap',
        isOverflowing &&
          '[mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]',
        className
      )}
    >
      {children}
    </div>
  );

  if (!isOverflowing) {
    return content;
  }

  return (
    <Tooltip disableHoverableContent={disableHoverableContent}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="max-w-sm">
        {tooltipContent ?? children}
      </TooltipContent>
    </Tooltip>
  );
}
