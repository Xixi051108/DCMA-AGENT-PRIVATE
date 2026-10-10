import { useEffect, useId, useState } from "react";
import { fieldLabels, type CodeHistory, type DashboardTable } from "../database-types.ts";
import { displaySamplingSpan } from "../code-analysis.ts";
import { codeClassName, displayTime } from "../dashboard-view.ts";

export function CodeEventHistory({ table }: { table: DashboardTable }) {
	const [from, setFrom] = useState(""), [to, setTo] = useState("");
	const [range, setRange] = useState({ from: "", to: "" });
	const [page, setPage] = useState(1), [reload, setReload] = useState(0);
	const [validation, setValidation] = useState("");
	const [state, setState] = useState<{ key: string; data: CodeHistory | null; loading: boolean; error: string }>({ key: "", data: null, loading: true, error: "" });
	const titleId = useId();
	const key = `${table}/${range.from}/${range.to}/${page}`;
	useEffect(() => {
		let active = true, busy = false;
		let controller: AbortController | null = null;
		const request = async () => {
			if (!active || busy) return;
			busy = true;
			controller = new AbortController();
			const timeout = setTimeout(() => controller?.abort(), 65000);
			setState((current) => ({ key, data: current.key === key ? current.data : null, loading: true, error: "" }));
			try {
				const parameters = new URLSearchParams({ table, page: String(page) });
				if (range.from) parameters.set("from", range.from);
				if (range.to) parameters.set("to", range.to);
				const response = await fetch(`/api/database/code-history?${parameters}`, { signal: controller.signal });
				const body = await response.json();
				if (!response.ok) throw new Error(body.error || "异常历史查询失败。");
				if (body.table !== table || body.page !== page) throw new Error("异常历史来源与当前选择不一致。");
				if (active) setState({ key, data: body as CodeHistory, loading: false, error: "" });
			} catch (error) {
				if (active) setState((current) => ({ ...current, loading: false, error: error instanceof Error && error.name !== "AbortError" ? error.message : "异常历史查询超时，请重试。" }));
			} finally { clearTimeout(timeout); busy = false; }
		};
		void request();
		const timer = setInterval(() => void request(), 30000);
		return () => { active = false; clearInterval(timer); controller?.abort(); };
	}, [table, range.from, range.to, page, reload, key]);
	const data = state.key === key ? state.data : null;
	const loading = state.key !== key || state.loading;
	const events = data?.events ?? [];
	const first = events.length ? Math.min(...events.map((event) => Date.parse(event.startedAt))) : 0;
	const last = events.length ? Math.max(...events.map((event) => Date.parse(event.endedAt ?? event.lastSeenAt))) : 0;
	const x = (time: string) => first === last ? 350 : 70 + (Date.parse(time) - first) / (last - first) * 560;
	const maxCount = Math.max(1, ...(data?.codes.map((code) => code.count) ?? []));
	const pages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 50)));
	return <>
		<section className="panel-card" aria-label="异常时间查询">
			<div className="section-heading"><h2>历史异常查询</h2><span className="group-count">全部历史采样</span></div>
			<form className="code-filters" onSubmit={(event) => {
				event.preventDefault();
				const begin = from ? new Date(`${from}+08:00`).toISOString() : "", end = to ? new Date(`${to}+08:00`).toISOString() : "";
				if (begin && end && begin > end) { setValidation("开始时间不能晚于结束时间。"); return; }
				setValidation(""); setRange({ from: begin, to: end }); setPage(1); setReload((value) => value + 1);
			}}>
				<label>开始时间（北京时间）<input type="datetime-local" step="1" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
				<label>结束时间（北京时间）<input type="datetime-local" step="1" value={to} onChange={(event) => setTo(event.target.value)} /></label>
				<button className="refresh-button" disabled={loading}>{loading ? "查询异常中…" : "查询异常"}</button>
				<button type="button" className="code-reset" onClick={() => { setFrom(""); setTo(""); setRange({ from: "", to: "" }); setValidation(""); setPage(1); setReload((value) => value + 1); }}>全部时间</button>
			</form>
			<div aria-live="polite">{validation && <p className="notice error">{validation}</p>}{state.key === key && state.error && <p className="notice error">{data ? "历史查询失败，保留上次成功结果。" : ""}{state.error}</p>}{!!data?.invalidTimes && <p className="notice">{data.invalidTimes} 条采集时间无效的记录未参与事件时间计算。</p>}</div>
		</section>
		<section className="code-summary" aria-label="历史异常汇总">{[{ label: "异常记录", value: data?.total ?? 0 }, { label: "故障记录", value: data?.faults ?? 0, className: "fault-code-active" }, { label: "报警记录", value: data?.alarms ?? 0, className: "alarm-code-active" }, { label: "未结束记录", value: data?.open ?? 0 }].map((item) => <div className="panel-card code-summary-card" key={item.label}><span>{item.label}</span><div><strong className={item.value ? item.className : undefined}>{item.value}</strong><span>次</span></div></div>)}</section>
		<div className="code-analysis-grid">
			<section className="panel-card" aria-label="历史代码分布"><div className="section-heading"><h2>历史代码分布</h2><span className="group-count">{data?.codes.length ?? 0} 种代码</span></div>
				{data?.codes.length ? <div className="code-bars">{data.codes.map((entry) => <div className="code-bar" key={`${entry.field}/${entry.code}`}><span className="code-bar-label"><span>{fieldLabels[entry.field]}</span><strong className={codeClassName(entry.field, entry.code)}>{entry.code}</strong></span><span className="code-bar-track" aria-hidden="true"><span className={entry.field === "fault_code" ? "fault-bar" : "alarm-bar"} style={{ width: `${entry.count / maxCount * 100}%` }} /></span><span className="code-bar-count">{entry.count} 次</span></div>)}</div> : <p className="code-chart-empty">{loading ? "正在读取异常历史…" : "所选时间段暂无异常记录"}</p>}
			</section>
			<section className="panel-card" aria-label="历史异常时段"><div className="section-heading"><h2>历史异常时段</h2><span className="group-count">本页记录</span></div>
				{events.length ? <><svg className="code-timeline" viewBox="0 0 660 180" role="group" aria-labelledby={titleId}><title id={titleId}>本页故障与报警的开始和结束时间</title>
					{["fault_code", "alarm_code"].map((field, index) => <g key={field}><text x="12" y={65 + index * 70}>{field === "fault_code" ? "故障" : "报警"}</text><line x1="70" x2="630" y1={60 + index * 70} y2={60 + index * 70} stroke="#e2e8f0" /></g>)}
					{events.map((event) => { const y = event.field === "fault_code" ? 60 : 130, color = event.field === "fault_code" ? "#b91c1c" : "#a16207"; const label = `${fieldLabels[event.field]} ${event.code}，开始 ${displayTime(event.startedAt, false, true)}，结束 ${event.endedAt ? displayTime(event.endedAt, false, true) : "未结束"}`; return <g key={event.id} tabIndex={0} role="img" aria-label={label}><title>{label}</title><line x1={x(event.startedAt)} x2={x(event.endedAt ?? event.lastSeenAt)} y1={y} y2={y} stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={event.endedAt ? undefined : "6 4"} opacity=".7" /><circle cx={x(event.startedAt)} cy={y} r="5" fill={color} /><circle cx={x(event.endedAt ?? event.lastSeenAt)} cy={y} r="5" fill={event.endedAt ? color : "white"} stroke={color} strokeWidth="2" /></g>; })}
				</svg><div className="code-time-axis"><span>{displayTime(new Date(first).toISOString())}</span><span>{displayTime(new Date(last).toISOString())}</span></div></> : <p className="code-chart-empty">{loading ? "正在读取异常历史…" : "所选时间段暂无异常记录"}</p>}
			</section>
		</div>
		<section className="panel-card" aria-label="历史异常记录"><div className="section-heading"><h2>历史异常记录</h2><span className="group-count">{data?.total ?? 0} 条</span></div>
			<div className="table-scroll code-event-table"><table><thead><tr><th>类型</th><th>代码</th><th>开始时间（北京时间）</th><th>结束时间（北京时间）</th><th>持续时间</th><th>状态</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{event.field === "fault_code" ? "故障" : "报警"}</td><td className={codeClassName(event.field, event.code)}>{event.code}</td><td>{displayTime(event.startedAt, false, true)}{event.startUncertain && <span className="event-time-note">最早观察时间</span>}</td><td>{event.endedAt ? displayTime(event.endedAt, false, true) : "未结束"}</td><td>{!event.endedAt && event.samples === 1 ? "单点待续" : `${event.endedAt ? "" : "已观察 "}${displaySamplingSpan(Date.parse(event.endedAt ?? event.lastSeenAt) - Date.parse(event.startedAt))}`}</td><td>{event.ending === "zero" ? "已归零" : event.ending === "changed" ? "已换码" : "未结束"}{event.hasMissingSamples && <span className="event-time-note">采样缺失</span>}</td></tr>)}</tbody></table></div>
			{!events.length && <p className="empty-state">{loading ? "正在读取异常历史…" : "所选时间段暂无异常记录"}</p>}
			<div className="event-pagination"><button className="code-reset" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>上一页</button><span>第 {page} / {pages} 页</span><button className="code-reset" disabled={loading || page >= pages} onClick={() => setPage(page + 1)}>下一页</button></div>
		</section>
	</>;
}
