import type { ReactNode } from 'react';

type AuthShellProps = {
	title: string;
	subtitle: string;
	children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
	return (
		<div className="grid min-h-screen lg:grid-cols-2">
			<div className="relative hidden overflow-hidden bg-of-primary lg:flex lg:flex-col lg:justify-between lg:p-10">
				<div
					className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
					aria-hidden
				/>
				<div
					className="pointer-events-none absolute -bottom-16 left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl"
					aria-hidden
				/>
				<div className="relative">
					<p className="text-2xl font-bold tracking-tight text-of-primary-foreground">OrderFlow</p>
					<p className="mt-2 max-w-sm text-sm text-of-primary-foreground/85">
						Учебный commerce-backend: заказы, каталог и saga до подтверждения.
					</p>
				</div>
				<p className="relative text-xs text-of-primary-foreground/70">
					Kafka · Redis · PostgreSQL · микросервисы
				</p>
			</div>
			<div className="flex flex-col justify-center px-4 py-10 sm:px-8">
				<div className="mb-8 lg:hidden">
					<p className="text-xl font-bold text-of-primary">OrderFlow</p>
				</div>
				<div className="mx-auto w-full max-w-md space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
					<p className="text-sm text-of-muted-foreground">{subtitle}</p>
				</div>
				<div className="mx-auto mt-6 w-full max-w-md">{children}</div>
			</div>
		</div>
	);
}
