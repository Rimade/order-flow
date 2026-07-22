import { clearAuthSession, getStoredUser } from '@orderflow/auth';
import { features } from '@orderflow/config';
import { Button } from '@orderflow/ui';
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

type ShellLayoutProps = {
	children: ReactNode;
};

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
	[
		'rounded-of-md px-3 py-1.5 text-sm font-medium transition-colors',
		isActive
			? 'bg-of-primary/10 text-of-primary'
			: 'text-of-muted-foreground hover:bg-of-muted hover:text-of-foreground',
	].join(' ');

export function ShellLayout({ children }: ShellLayoutProps) {
	const navigate = useNavigate();
	const user = getStoredUser();
	const initial = user?.email?.charAt(0).toUpperCase() ?? '?';

	function logout() {
		clearAuthSession();
		navigate('/login', { replace: true });
	}

	return (
		<div className="min-h-screen">
			<header className="sticky top-0 z-40 border-b border-of-border/80 bg-of-card/90 backdrop-blur-md">
				<div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
					<Link
						to="/orders"
						className="text-lg font-bold tracking-tight text-of-primary transition-opacity hover:opacity-90"
					>
						OrderFlow
					</Link>
					<nav className="flex items-center gap-1">
						{features.catalog ? (
							<NavLink to="/catalog" className={navLinkClass}>
								Каталог
							</NavLink>
						) : null}
						<NavLink to="/orders" className={navLinkClass}>
							Заказы
						</NavLink>
					</nav>
					<div className="flex items-center gap-3">
						{user ? (
							<div className="hidden items-center gap-2 sm:flex">
								<span
									className="flex h-8 w-8 items-center justify-center rounded-full bg-of-primary/10 text-sm font-semibold text-of-primary"
									aria-hidden
								>
									{initial}
								</span>
								<span className="max-w-[140px] truncate text-sm text-of-muted-foreground">
									{user.email}
								</span>
							</div>
						) : null}
						<Button type="button" variant="outline" size="sm" onClick={logout}>
							Выйти
						</Button>
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
		</div>
	);
}
