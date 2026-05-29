import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 rounded-of-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-of-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				default: 'bg-of-primary text-of-primary-foreground hover:opacity-90',
				outline: 'border border-of-border bg-of-card text-of-foreground hover:bg-of-muted',
				ghost: 'hover:bg-of-muted text-of-foreground',
				danger: 'bg-of-danger text-white hover:opacity-90',
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-8 px-3 text-xs',
				lg: 'h-11 px-6',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
	return (
		<button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
	);
}
