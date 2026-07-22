import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const badgeVariants = cva(
	'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-of-primary text-of-primary-foreground',
				secondary: 'border-transparent bg-of-muted text-of-foreground',
				success: 'border-of-success/20 bg-of-success/12 text-of-success',
				warning: 'border-of-warning/25 bg-of-warning/12 text-of-warning',
				danger: 'border-of-danger/20 bg-of-danger/12 text-of-danger',
				info: 'border-of-info/20 bg-of-info/12 text-of-info',
				outline: 'border-of-border text-of-foreground',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

export type BadgeProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
	return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
