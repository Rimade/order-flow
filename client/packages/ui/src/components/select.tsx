import * as SelectPrimitive from '@radix-ui/react-select';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
	className,
	children,
	...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
	return (
		<SelectPrimitive.Trigger
			className={cn(
				'flex h-10 w-full items-center justify-between rounded-of-md border border-of-border bg-of-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-of-primary disabled:cursor-not-allowed disabled:opacity-50',
				className,
			)}
			{...props}>
			{children}
			<SelectPrimitive.Icon className="text-of-muted-foreground">▾</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

export function SelectContent({
	className,
	children,
	position = 'popper',
	...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				position={position}
				className={cn(
					'z-50 max-h-60 min-w-[8rem] overflow-hidden rounded-of-md border border-of-border bg-of-card p-1 shadow-md',
					className,
				)}
				{...props}>
				<SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

export function SelectItem({
	className,
	children,
	...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			className={cn(
				'relative flex cursor-pointer select-none items-center rounded-of-md px-2 py-1.5 text-sm outline-none focus:bg-of-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
				className,
			)}
			{...props}>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}
