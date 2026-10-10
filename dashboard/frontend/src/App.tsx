import { useEffect, useState } from "react";
import { fieldLabels, numericFields, type DashboardField, type DashboardTable, type NumericField } from "./database-types.ts";
import { displayTime, displayValue, displayRaw, displayRawField, displayFieldLabel, fieldUnits } from "./dashboard-view.ts";
import { useDashboard } from "./useDashboard.ts";
import { Gauge } from "./components/Gauge.tsx";
import { LineChart } from "./components/LineChart.tsx";

const motorTables: DashboardTable[] = ["real_data_01", "real_data_02", "real_data_03", "real_data_04"];
const runningFields: DashboardField[] = ["inverter_load_rate", "motor_load_rate", "system_run_time", "fault_code", "alarm_code"];
const codeFields: DashboardField[] = ["fault_code", "alarm_code", "control_word", "status_word"];
const fields = (Object.keys(fieldLabels) as DashboardField[]).filter((field) => field !== "status");
const gaugeFields = ["speed_actual", "current_actual", "torque_actual", "dc_voltage", "inverter_temp", "motor_temp"] as const;
const views = [
	{ id: "overview", title: "设备概览", description: "设备档案、运行快照与完整参数", icon: "M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8" },
	{ id: "realtime", title: "实时数据", description: "查看采样趋势与当前读数", icon: "M3 3v18h18M6 15l4-5 4 3 6-8" },
	{ id: "metrics", title: "运行指标", description: "按运动、电气、功率、温度和负荷查看指标", icon: "M4 21V11h4v10M10 21V3h4v18M16 21v-7h4v7" },
	{ id: "codes", title: "故障与报警", description: "查看故障、报警与控制代码的采样记录", icon: "m9 3-6 6v6l6 6h6l6-6V9l-6-6ZM12 7v6M12 16v1" },
	{ id: "records", title: "采样明细", description: "查看当前电机最近采样窗口的原始记录", icon: "M7 3h10l4 4v14H3V3h4M7 3v5h10V3M7 12h10M7 16h10" },
	{ id: "guide", title: "数据说明", description: "了解数据来源、时间与读数规则", icon: "M12 8v1M12 12v5M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0" },
] as const;
type View = (typeof views)[number]["id"];
const metricGroups: { title: string; description: string; fields: NumericField[] }[] = [
	{ title: "运动参数", description: "转速与转矩的设定值和实际值", fields: ["speed_setpoint", "speed_actual", "torque_setpoint", "torque_actual"] },
	{ title: "电气参数", description: "母线、电流与脉冲频率", fields: ["dc_voltage", "current_actual", "field_current", "torque_current", "pulse_frequency"] },
	{ title: "功率参数", description: "实际功率、电机功率与反馈功率", fields: ["actual_power", "motor_power", "feedback_power"] },
	{ title: "温度参数", description: "进气、电机、变频器与散热器温度", fields: ["air_intake_temp", "motor_temp", "inverter_temp", "inverter_radiator_temp"] },
	{ title: "负荷参数", description: "变频器与电机负荷率", fields: ["inverter_load_rate", "motor_load_rate"] },
];
function currentView(): View {
	return views.find((view) => `#${view.id}` === window.location.hash)?.id ?? "realtime";
}
function NavIcon({ path }: { path: string }) {
	return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
}

export function App() {
	const [view, setView] = useState<View>(currentView);
	const [motor, setMotor] = useState(1);
	const [history, setHistory] = useState(false);
	const [limit, setLimit] = useState<50 | 100 | 200>(100);
	const [metric, setMetric] = useState<"speed" | "torque" | NumericField>("speed");
	useEffect(() => {
		const navigate = () => { setView(currentView()); window.scrollTo(0, 0); };
		window.addEventListener("hashchange", navigate);
		return () => window.removeEventListener("hashchange", navigate);
	}, []);
	const table = motor === 1 && history ? "real_data" : motorTables[motor - 1];
	const { data, loading, error, update, refresh } = useDashboard(table, limit);
	const latest = data?.latest;
	const selectedSource = data?.sources.find((source) => source.table === table);
	const warnings = data?.warnings.filter((warning) => !data.sources.some((source) => source.table !== table && warning.startsWith(`${source.table}：`))) ?? [];
	const sourceLabel = table === "real_data" ? "历史真实采集" : "模拟数据";
	const page = views.find((item) => item.id === view)!;
	const chartFields: NumericField[] = metric === "speed" ? ["speed_setpoint", "speed_actual"] : metric === "torque" ? ["torque_setpoint", "torque_actual"] : [metric];
	const runningCards = (items: DashboardField[]) => items.map((field) => {
		const numeric = numericFields.includes(field as NumericField);
		return <div className="panel-card running-card" key={field}><span>{fieldLabels[field]}</span><strong>{numeric ? displayValue(latest?.values[field as NumericField]) : displayRawField(field, latest?.raw[field])}</strong><small>{numeric ? `单位：${fieldUnits[field] ?? "待确认"}` : field === "fault_code" || field === "alarm_code" ? "0 为正常 · 其他保留原始代码" : "原始值 · 格式待确认"}</small></div>;
	});
	return (
		<div className="dashboard-shell">
			<aside className="sidebar">
				<div className="brand"><img src="/assets/logo.png" alt="" /><div><strong>DCMA</strong><span>电机与变频器监控</span></div></div>
				<p className="sidebar-caption">监控工作台</p>
				<nav className="sidebar-nav" aria-label="监控页面">{views.map((item) => <a key={item.id} href={`#${item.id}`} aria-current={view === item.id ? "page" : undefined}><NavIcon path={item.icon} /><span>{item.title}</span>{view === item.id && <i aria-hidden="true" />}</a>)}</nav>
				<div className="device-controls">
					<p className="sidebar-caption">当前监控设备</p>
					<label className="sidebar-label" htmlFor="device">查看设备</label>
					<select id="device" value={motor} onChange={(event) => setMotor(Number(event.target.value))}>{motorTables.map((_, index) => <option key={index} value={index + 1}>G120 电机 {index + 1}</option>)}</select>
					<label className="sidebar-label" htmlFor="source">数据来源</label>
					<select id="source" value={motor === 1 && history ? "history" : "simulation"} disabled={motor !== 1} onChange={(event) => setHistory(event.target.value === "history")}><option value="simulation">模拟数据</option>{motor === 1 && <option value="history">历史真实采集</option>}</select>
					<p className="muted small">{motor === 1 ? "可查看模拟或历史真实采集。" : "该电机仅有模拟数据。"}</p>
				</div>
				<div className="sidebar-footer"><span className={`connection ${error ? "failed" : data ? "connected" : ""}`} />{error ? "接口查询失败" : data ? "数据库查询成功" : "正在连接接口"}<p className="muted small">只读监控 · 每 5 秒自动检查</p></div>
			</aside>
			<main className="dashboard-main">
				<header className="page-header"><div><p className="eyebrow">电机监控 / {page.title}</p><h1>{page.title}</h1><p className="muted">{page.description}</p></div><div className="header-actions"><label>采样条数 <select aria-label="采样条数" value={limit} onChange={(event) => setLimit(Number(event.target.value) as 50 | 100 | 200)}>{[50, 100, 200].map((value) => <option key={value} value={value}>{value} 条</option>)}</select></label><button className="refresh-button" onClick={refresh} disabled={loading}>{loading ? "正在查询…" : "刷新数据"}</button></div></header>
				<section className="panel-card device-detail" aria-label="当前设备详情"><div className="detail-heading"><div><p className="eyebrow">当前设备</p><h2>{latest ? displayValue(latest.raw.device_name) : `G120 电机 ${motor}`}</h2><p className="muted">变频器：{displayValue(latest?.raw.inverter_name)}</p></div><span className="source-badge">{sourceLabel}</span></div><div className="time-grid"><div><span>最后采集（北京时间）</span><strong>{displayTime(latest?.acquiredAt)}</strong></div><div><span>入库时间（北京时间）</span><strong>{displayTime(latest?.ingestedAt)}</strong></div><div><span>上次查询成功</span><strong>{displayTime(data?.queriedAt)}</strong></div><div><span>采集更新状态</span><strong>{update}</strong></div></div></section>
				<div aria-live="polite">{error && <p className="notice error">{data ? "刷新失败，以下保留上次成功结果。" : "当前选择查询失败。"}{error}</p>}{!loading && data && !latest && <p className="notice">{selectedSource?.message || "当前来源暂无采样记录。"}</p>}{warnings.map((warning) => <p className="notice" key={warning}>{warning}</p>)}</div>
				{view === "overview" && <>
					<section className="panel-card overview-intro"><div><p className="eyebrow">设备档案</p><h2>G120 电机 {motor}</h2><p className="muted">当前设备的最新采样与运行参数</p></div><a className="text-link" href="#realtime">查看采样趋势 →</a></section>
					<section aria-label="运行信息" className="running-grid">{runningCards(runningFields)}</section>
					<section className="panel-card" aria-label="完整参数"><div className="section-heading"><div><h2>完整参数</h2><p className="muted small">{fields.length} 个字段 · 保留最新记录原值</p></div><a className="text-link" href="#records">查看采样明细 →</a></div><dl className="parameter-grid">{fields.map((field) => <div key={field}><dt>{displayFieldLabel(field)}</dt><dd>{displayRawField(field, latest?.raw[field])}</dd></div>)}</dl></section>
				</>}
				{view === "realtime" && <>
					<section className="panel-card" aria-label="采样趋势">
						<div className="section-heading"><div><h2>采样趋势</h2><p className="muted small">设定值与实际值 · 最近采样窗口</p></div><div className="chart-controls"><label>查看指标 <select aria-label="查看指标" value={metric} onChange={(event) => setMetric(event.target.value as typeof metric)}><optgroup label="对比曲线"><option value="speed">转速对比</option><option value="torque">转矩对比</option></optgroup><optgroup label="单项指标">{numericFields.map((field) => <option key={field} value={field}>{displayFieldLabel(field)}</option>)}</optgroup></select></label></div></div>
						{loading && !data ? <p className="chart-empty">正在读取当前设备采样…</p> : <LineChart key={`${table}/${limit}/${metric}`} samples={data?.samples ?? []} fields={chartFields} />}
						<p className="muted small window-count">已返回 {data?.returned ?? 0} 条记录，{data?.samples.length ?? 0} 条有效时间采样{data?.hasMore ? " · 仅展示最近窗口" : ""}{data?.truncated ? " · 响应已截断" : ""}</p>
					</section>
					<section aria-label="六项采样仪表" className="gauge-grid">{gaugeFields.map((field) => <Gauge key={field} label={fieldLabels[field]} unit={fieldUnits[field]!} value={latest?.values[field] ?? null} samples={data?.samples.map((sample) => sample.values[field]) ?? []} />)}</section>
					<section aria-label="运行信息" className="running-grid">{runningCards(runningFields)}</section>
				</>}
				{view === "metrics" && <div className="metric-groups">{metricGroups.map((group) => <section className="panel-card" key={group.title} aria-label={group.title}><div className="section-heading"><div><h2>{group.title}</h2><p className="muted small">{group.description}</p></div><span className="group-count">{group.fields.length} 项指标</span></div><div className="metric-grid">{group.fields.map((field) => <div className="metric-card" key={field}><span>{fieldLabels[field]}</span><strong>{displayValue(latest?.values[field])}</strong><div><small>{fieldUnits[field] ? `单位：${fieldUnits[field]}` : "单位待确认"}</small><a href="#realtime" onClick={() => setMetric(field)} aria-label={`查看${fieldLabels[field]}趋势`}>查看趋势 →</a></div></div>)}</div>{group.title === "负荷参数" && <p className="runtime-note">系统运行时间 <strong>{displayRaw(latest?.raw.system_run_time)}</strong><span>原始值 · 格式待确认</span></p>}</section>)}</div>}
				{view === "codes" && <>
					<section aria-label="当前代码" className="running-grid code-grid">{runningCards(codeFields)}</section>
					<section className="panel-card" aria-label="代码采样记录"><div className="section-heading"><div><h2>代码采样记录</h2><p className="muted small">故障码、报警码：0 为正常，其他保留原始代码</p></div><span className="group-count">{data?.returned ?? 0} 条记录</span></div><div className="table-scroll code-table"><table><thead><tr><th>采集时间（北京时间）</th><th>记录编号</th>{codeFields.map((field) => <th key={field}>{displayFieldLabel(field)}</th>)}</tr></thead><tbody>{data?.records.map((record) => <tr key={record.id}><td>{displayTime(record.acquiredAt, false, true)}</td><td>{record.id}</td>{codeFields.map((field) => <td key={field}>{displayRawField(field, record.raw[field])}</td>)}</tr>)}</tbody></table></div>{!data?.records.length && <p className="empty-state">{loading ? "正在读取代码记录…" : "当前采样窗口暂无代码记录"}</p>}<p className="muted small window-count">仅展示当前 {limit} 条采样窗口{data?.truncated ? " · 响应已截断" : ""}</p></section>
				</>}
				{view === "records" && <section className="panel-card" aria-label="原始采样明细"><div className="section-heading"><div><h2>原始采样记录</h2><p className="muted small">{fields.length} 个字段 · 数值与代码保留原值 · 表格可横向滚动</p></div><span className="group-count">最近 {limit} 条</span></div><details open><summary>采样明细 · {data?.returned ?? 0} 条原始记录</summary><div className="table-scroll"><table><thead><tr>{fields.map((field) => <th key={field}>{displayFieldLabel(field)}</th>)}</tr></thead><tbody>{data?.records.map((record) => <tr key={record.id}>{fields.map((field) => <td key={field}>{displayRawField(field, record.raw[field])}</td>)}</tr>)}</tbody></table></div></details>{!data?.records.length && <p className="empty-state">{loading ? "正在读取采样记录…" : "当前来源暂无采样记录"}</p>}<p className="muted small window-count">已返回 {data?.returned ?? 0} 条记录{data?.hasMore ? " · 仅展示最近窗口" : ""}{data?.truncated ? " · 响应已截断" : ""}</p></section>}
				{view === "guide" && <div className="guide-grid">
					<section className="panel-card"><h2>当前数据来源</h2><p className="guide-value">G120 电机 {motor} <span className="source-badge">{sourceLabel}</span></p><p>{motor === 1 ? "电机 1 可在模拟数据和历史真实采集之间切换，两种来源分别展示。" : `电机 ${motor} 展示自己的模拟采样记录。`}</p><p>模拟数据也是已存入数据库的记录。切换侧边栏中的设备后，所有页面同步显示该电机的数据。</p></section>
					<section className="panel-card"><h2>采样与时间</h2><p>采集时间表示设备数据的采样时间；入库时间表示记录写入数据库的时间；查询时间表示页面读取成功的时间。</p><p>页面时间统一显示为北京时间。每 5 秒检查一次更新，也可点击“刷新数据”。历史采集在没有新记录时会显示“本次无新采样”。</p></section>
					<section className="panel-card"><h2>指标与代码</h2><p>展示 18 项数值指标和 {fields.length} 个字段。转速 rpm、电流 A、转矩 N·m、电压 V、功率 kW、温度 °C、负荷率 %，按参考图标注，不换算数值。脉冲频率单位、运行时间格式及额定值待确认。</p><p>故障码与报警码保留原始代码，0 标注为正常，其他代码直接显示。控制字与状态字保留原值；缺失值显示“—”。</p><a className="text-link" href="#metrics">查看分组指标 →</a></section>
					<section className="panel-card"><h2>曲线与仪表</h2><p>曲线展示最近 50、100 或 200 条记录中的有效时间采样。缺失数值处断线，无效采集时间不进入曲线。</p><p>仪表刻度由当前采样范围生成，恒定读数会扩展显示范围。仪表范围不代表安全阈值。采样明细保留记录的完整精度。</p><a className="text-link" href="#realtime">查看采样趋势 →</a></section>
				</div>}
				<footer className="page-footer">单位按参考图标注 · 故障码与报警码 0 为正常 · 仪表范围不代表安全阈值</footer>
			</main>
		</div>
	);
}
