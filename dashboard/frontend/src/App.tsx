import { DatabasePanel } from "./components/DatabasePanel";

export function App() {
	return (
		<main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
			<header className="flex items-center gap-3">
				<img src="/assets/logo.png" alt="DCMA" className="w-10 h-10 object-contain" />
				<div>
					<h1 className="text-xl font-bold">DCMA 监控展板开发</h1>
					<p className="text-sm text-slate-500">数据库连接与原始记录预览</p>
				</div>
			</header>
			<div className="panel-card">
				<DatabasePanel />
			</div>
		</main>
	);
}
