import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const alertVariants = cva('relative w-full rounded-of-lg border p-4 text-sm', {
	variants: {
		variant: {
			default: 'border-of-border bg-of-card text-of-foreground',
			info: 'border-of-info/30 bg-of-info/10 text-of-foreground',
			success: 'border-of-success/30 bg-of-success/10 text-of-foreground',
			warning: 'border-of-warning/30 bg-of-warning/10 text-of-foreground',
			danger: 'border-of-danger/30 bg-of-danger/10 text-of-foreground',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
});

export type AlertProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>;

export function Alert({ className, variant, ...props }: AlertProps) {
	return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
	);
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
	return <div className={cn('text-sm opacity-90', className)} {...props} />;
}
