import { clearAuthSession, getStoredUser } from '@orderflow/auth';
import { Button } from '@orderflow/ui';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type ShellLayoutProps = {
	children: ReactNode;
};

export function ShellLayout({ children }: ShellLayoutProps) {
	const navigate = useNavigate();
	const user = getStoredUser();

	function logout() {
		clearAuthSession();
		navigate('/login', { replace: true });
	}

	return (
		<div className="min-h-screen">
			<header className="border-b border-of-border bg-of-card">
				<div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
					<Link to="/orders" className="text-lg font-semibold text-of-primary">
						OrderFlow
					</Link>
					<nav className="flex items-center gap-4 text-sm">
						<Link to="/catalog" className="hover:text-of-primary">
							Каталог
						</Link>
						<Link to="/orders" className="hover:text-of-primary">
							Заказы
						</Link>
						{user ? <span className="text-of-muted-foreground">{user.email}</span> : null}
						<Button type="button" variant="outline" size="sm" onClick={logout}>
							Выйти
						</Button>
					</nav>
				</div>
			</header>
			<main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
		</div>
	);
}
