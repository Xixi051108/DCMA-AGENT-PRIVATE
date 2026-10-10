export function displaySamplingSpan(milliseconds: number): string {
	const parts: string[] = [];
	for (const [unit, size] of [["天", 86400000], ["小时", 3600000], ["分", 60000]] as const) {
		const value = Math.floor(milliseconds / size);
		if (value) parts.push(`${value} ${unit}`);
		milliseconds %= size;
	}
	if (milliseconds || !parts.length) parts.push(`${milliseconds / 1000} 秒`);
	return parts.join(" ");
}
