import type { DashboardRecord } from "./database-types.ts";

export function displayValue(value: unknown): string {
	if (value === null || value === undefined || value === "") return "—";
	return typeof value === "number" ? value.toLocaleString("zh-CN", { maximumFractionDigits: 4 }) : String(value);
}

export function displayTime(value: string | null | undefined, timeOnly = false): string {
	if (!value) return "—";
	return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", ...(timeOnly ? {} : { year: "numeric", month: "2-digit", day: "2-digit" }), hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value));
}

export function sampleIdentity(record: DashboardRecord | null): string {
	return record ? `${record.id}/${record.acquiredAt ?? record.raw.timestamp}` : "";
}

export function sampleRange(values: (number | null)[]): { min: number; max: number } | null {
	const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
	if (!valid.length) return null;
	const min = Math.min(...valid);
	const max = Math.max(...valid);
	if (min !== max) return { min, max };
	const padding = Math.max(Math.abs(min) * 0.1, 1);
	return { min: min - padding, max: max + padding };
}
