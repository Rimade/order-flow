import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, api } from '@orderflow/api-client';
import { setAuthSession } from '@orderflow/auth';
import {
	Alert,
	AlertDescription,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	Label,
} from '@orderflow/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

const schema = z.object({
	email: z.string().email('Введите корректный email'),
	password: z.string().min(8, 'Минимум 8 символов'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: { email: '', password: '' },
	});

	async function onSubmit(values: FormValues) {
		setError(null);
		try {
			const tokens = await api.auth.login(values.email, values.password);
			setAuthSession(tokens);
			navigate('/orders', { replace: true });
		} catch (e) {
			setError(e instanceof ApiError ? e.message : 'Не удалось войти');
		}
	}

	return (
		<div className="flex min-h-[70vh] items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Вход</CardTitle>
					<CardDescription>API: gateway :3000</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
						{error ? (
							<Alert variant="danger">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						) : null}
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                data-testid="login-email"
                {...register('email')}
              />
							{errors.email ? (
								<p className="text-sm text-of-danger">{errors.email.message}</p>
							) : null}
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                data-testid="login-password"
                {...register('password')}
              />
							{errors.password ? (
								<p className="text-sm text-of-danger">{errors.password.message}</p>
							) : null}
						</div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              data-testid="login-submit"
            >
              {isSubmitting ? 'Вход…' : 'Войти'}
            </Button>
					</form>
					<p className="mt-4 text-center text-sm text-of-muted-foreground">
						Нет аккаунта?{' '}
						<Link to="/register" className="text-of-primary hover:underline">
							Регистрация
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
