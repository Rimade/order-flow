import { cn } from '../lib/cn';

type SpinnerProps = {
	className?: string;
	label?: string;
};

export function Spinner({ className, label = 'Загрузка…' }: SpinnerProps) {
	return (
		<div
			className={cn('inline-flex items-center gap-2 text-sm text-of-muted-foreground', className)}
			role="status"
			aria-live="polite">
			<span
				className="size-4 animate-spin rounded-full border-2 border-of-border border-t-of-primary"
				aria-hidden
			/>
			<span>{label}</span>
		</div>
	);
}
