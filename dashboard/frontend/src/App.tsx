import { useEffect, useState } from "react";
import { fieldLabels, numericFields, type DashboardField, type DashboardTable, type NumericField } from "./database-types.ts";
import { displayTime, displayValue, displayRawField, codeClassName, displayFieldLabel, fieldUnits } from "./dashboard-view.ts";
import { useDashboard } from "./useDashboard.ts";
import { Gauge } from "./components/Gauge.tsx";
import { LineChart } from "./components/LineChart.tsx";
import { CodeAnalysis } from "./components/CodeAnalysis.tsx";

const motorTables: DashboardTable[] = ["real_data_01", "real_data_02", "real_data_03", "real_data_04"];
const runningFields: DashboardField[] = ["inverter_load_rate", "motor_load_rate", "fault_code", "alarm_code"];
const codeFields: DashboardField[] = ["fault_code", "alarm_code", "control_word", "status_word"];
const fields = (Object.keys(fieldLabels) as DashboardField[]).filter((field) => field !== "status" && field !== "system_run_time");
const gaugeFields = ["speed_actual", "current_actual", "torque_actual", "dc_voltage", "inverter_temp", "motor_temp"] as const;
const gaugeRanges: Partial<Record<NumericField, { min: number; max: number }>> = {
	speed_actual: { min: -1500, max: 1500 }, current_actual: { min: 0, max: 3.3 },
	dc_voltage: { min: 0, max: 1200 }, inverter_temp: { min: 0, max: 150 }, motor_temp: { min: 0, max: 150 },
};
const views = [
	{ id: "overview", title: "设备概览", icon: "M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8" },
	{ id: "realtime", title: "实时数据", icon: "M3 3v18h18M6 15l4-5 4 3 6-8" },
	{ id: "metrics", title: "运行指标", icon: "M4 21V11h4v10M10 21V3h4v18M16 21v-7h4v7" },
	{ id: "codes", title: "故障与报警", icon: "m9 3-6 6v6l6 6h6l6-6V9l-6-6ZM12 7v6M12 16v1" },
	{ id: "records", title: "采样明细", icon: "M7 3h10l4 4v14H3V3h4M7 3v5h10V3M7 12h10M7 16h10" },
	{ id: "guide", title: "数据说明", icon: "M12 8v1M12 12v5M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0" },
] as const;
type View = (typeof views)[number]["id"];
const metricGroups: { title: string; fields: NumericField[] }[] = [
	{ title: "运动参数", fields: ["speed_setpoint", "speed_actual", "torque_setpoint", "torque_actual"] },
	{ title: "电气参数", fields: ["dc_voltage", "current_actual", "field_current", "torque_current", "pulse_frequency"] },
	{ title: "功率参数", fields: ["actual_power", "motor_power", "feedback_power"] },
	{ title: "温度参数", fields: ["air_intake_temp", "motor_temp", "inverter_temp", "inverter_radiator_temp"] },
	{ title: "负荷参数", fields: ["inverter_load_rate", "motor_load_rate"] },
];
const parameterGroups: { title: string; fields: DashboardField[] }[] = [
	{ title: "设备信息", fields: ["device_name", "inverter_name"] },
	{ title: "采样信息", fields: ["id", "timestamp", "date", "time", "create_time"] },
	...metricGroups,
	{ title: "故障与控制", fields: codeFields },
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
		return <div className="panel-card running-card" key={field}><span>{displayFieldLabel(field)}</span><strong className={codeClassName(field, latest?.raw[field])}>{numeric ? displayValue(latest?.values[field as NumericField]) : displayRawField(field, latest?.raw[field])}</strong></div>;
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
				</div>
				<div className="sidebar-footer"><span className={`connection ${error ? "failed" : data ? "connected" : ""}`} />{error ? "接口查询失败" : data ? "数据库查询成功" : "正在连接接口"}</div>
			</aside>
			<main className="dashboard-main">
				<header className="page-header"><div><p className="eyebrow">电机监控 / {page.title}</p><h1>{page.title}</h1></div><div className="header-actions"><label>采样条数 <select aria-label="采样条数" value={limit} onChange={(event) => setLimit(Number(event.target.value) as 50 | 100 | 200)}>{[50, 100, 200].map((value) => <option key={value} value={value}>{value} 条</option>)}</select></label><button className="refresh-button" onClick={refresh} disabled={loading}>{loading ? "正在查询…" : "刷新数据"}</button></div></header>
				<section className="panel-card device-detail" aria-label="当前设备详情"><div className="detail-heading"><div><p className="eyebrow">当前设备</p><h2>{latest ? displayValue(latest.raw.device_name) : `G120 电机 ${motor}`}</h2><p className="muted">变频器：{displayValue(latest?.raw.inverter_name)}</p></div><span className="source-badge">{sourceLabel}</span></div><div className="time-grid"><div><span>最后采集（北京时间）</span><strong>{displayTime(latest?.acquiredAt)}</strong></div><div><span>入库时间（北京时间）</span><strong>{displayTime(latest?.ingestedAt)}</strong></div><div><span>上次查询成功</span><strong>{displayTime(data?.queriedAt)}</strong></div><div><span>采集更新状态</span><strong>{update}</strong></div></div></section>
				<div aria-live="polite">{error && <p className="notice error">{data ? "刷新失败，以下保留上次成功结果。" : "当前选择查询失败。"}{error}</p>}{!loading && data && !latest && <p className="notice">{selectedSource?.message || "当前来源暂无采样记录。"}</p>}{warnings.map((warning) => <p className="notice" key={warning}>{warning}</p>)}</div>
				{view === "overview" && <>
					<section className="panel-card overview-intro"><div className="overview-copy"><div><p className="eyebrow">设备档案</p><h2>G120 电机 {motor}</h2></div><a className="text-link" href="#realtime">查看采样趋势 →</a></div><img className="equipment-illustration" src="/assets/illustrations/motor-drive.svg" alt="" aria-hidden="true" width="420" height="200" /></section>
					<section aria-label="运行信息" className="running-grid">{runningCards(runningFields)}</section>
					<section className="panel-card" aria-label="完整参数">
						<div className="section-heading"><h2>完整参数</h2><a className="text-link" href="#records">查看采样明细 →</a></div>
						<div className="parameter-groups">{parameterGroups.map((group) => <section className="parameter-group" key={group.title} aria-label={group.title}>
							<h3>{group.title}</h3>
							<dl className="parameter-grid">{group.fields.map((field) => <div key={field}><dt>{displayFieldLabel(field)}</dt><dd className={codeClassName(field, latest?.raw[field])}>{displayRawField(field, latest?.raw[field])}</dd></div>)}</dl>
						</section>)}</div>
					</section>
				</>}
				{view === "realtime" && <>
					<section className="panel-card" aria-label="采样趋势">
						<div className="section-heading"><div><h2>采样趋势</h2></div><div className="chart-controls"><label>查看指标 <select aria-label="查看指标" value={metric} onChange={(event) => setMetric(event.target.value as typeof metric)}><optgroup label="对比曲线"><option value="speed">转速对比</option><option value="torque">转矩对比</option></optgroup><optgroup label="单项指标">{numericFields.map((field) => <option key={field} value={field}>{displayFieldLabel(field)}</option>)}</optgroup></select></label></div></div>
						{loading && !data ? <p className="chart-empty">正在读取当前设备采样…</p> : <LineChart key={`${table}/${limit}/${metric}`} samples={data?.samples ?? []} fields={chartFields} />}
						<p className="muted small window-count">已返回 {data?.returned ?? 0} 条记录，{data?.samples.length ?? 0} 条有效时间采样{data?.hasMore ? " · 仅展示最近窗口" : ""}{data?.truncated ? " · 响应已截断" : ""}</p>
					</section>
					<section aria-label="六项采样仪表" className="gauge-grid">{gaugeFields.map((field) => <Gauge key={field} label={fieldLabels[field]} unit={fieldUnits[field]!} value={latest?.values[field] ?? null} range={gaugeRanges[field]} samples={data?.samples.map((sample) => sample.values[field]) ?? []} />)}</section>
					<section aria-label="运行信息" className="running-grid">{runningCards(runningFields)}</section>
				</>}
				{view === "metrics" && <div className="metric-groups">{metricGroups.map((group) => <section className="panel-card" key={group.title} aria-label={group.title}><div className="section-heading"><div><h2>{group.title}</h2></div><span className="group-count">{group.fields.length} 项指标</span></div><div className="metric-grid">{group.fields.map((field) => <div className="metric-card" key={field}><span>{displayFieldLabel(field)}</span><strong>{displayValue(latest?.values[field])}</strong><div><a href="#realtime" onClick={() => setMetric(field)} aria-label={`查看${fieldLabels[field]}趋势`}>查看趋势 →</a></div></div>)}</div></section>)}</div>}
				{view === "codes" && <>
					<section aria-label="当前代码" className="running-grid code-grid">{runningCards(codeFields)}</section>
					<CodeAnalysis key={table} table={table} records={data?.records ?? []} loading={loading} truncated={data?.truncated ?? false} />
				</>}
				{view === "records" && <section className="panel-card" aria-label="原始采样明细"><div className="section-heading"><div><h2>原始采样记录</h2></div><span className="group-count">最近 {limit} 条</span></div><details open><summary>采样明细 · {data?.returned ?? 0} 条原始记录</summary><div className="table-scroll"><table><thead><tr>{fields.map((field) => <th key={field}>{displayFieldLabel(field)}</th>)}</tr></thead><tbody>{data?.records.map((record) => <tr key={record.id}>{fields.map((field) => <td key={field} className={codeClassName(field, record.raw[field])}>{displayRawField(field, record.raw[field])}</td>)}</tr>)}</tbody></table></div></details>{!data?.records.length && <p className="empty-state">{loading ? "正在读取采样记录…" : "当前来源暂无采样记录"}</p>}<p className="muted small window-count">已返回 {data?.returned ?? 0} 条记录{data?.hasMore ? " · 仅展示最近窗口" : ""}{data?.truncated ? " · 响应已截断" : ""}</p></section>}
				{view === "guide" && <div className="guide-grid">
					<section className="panel-card"><div className="guide-heading"><h2>当前数据来源</h2><img className="source-illustration" src="/assets/illustrations/sampling-records.svg" alt="" aria-hidden="true" width="320" height="160" loading="lazy" /></div><p className="guide-value">G120 电机 {motor} <span className="source-badge">{sourceLabel}</span></p><p>{motor === 1 ? "电机 1 可在模拟数据和历史真实采集之间切换，两种来源分别展示。" : `电机 ${motor} 展示自己的模拟采样记录。`}</p><p>模拟数据也是已存入数据库的记录。切换侧边栏中的设备后，所有页面同步显示该电机的数据。</p></section>
					<section className="panel-card"><h2>采样与时间</h2><p>采集时间表示设备数据的采样时间；入库时间表示记录写入数据库的时间；查询时间表示页面读取成功的时间。</p><p>页面时间统一显示为北京时间。每 5 秒检查一次更新，也可点击“刷新数据”。历史采集在没有新记录时会显示“本次无新采样”。</p><p>异常历史读取所选来源的全部采样，不受采样条数限制；每 30 秒检查更新，可按北京时间查询与所选时间段重叠的事件。开始时间为首次观察到代码的采样时间，结束时间为首次观察到归零或换码的采样时间；实际发生、恢复时刻受采样间隔限制。最早一条历史记录已有代码时标记“最早观察时间”，尚未观察到归零或换码时显示“未结束”，持续时间只计算已观察部分。缺失代码不会作为恢复，历史依赖数据库原始记录保留。</p></section>
					<section className="panel-card"><h2>指标与代码</h2><p>展示 18 项数值指标和 {fields.length} 个字段。转速 rpm、电流 A、转矩 N·m、电压 V、功率 kW、温度 °C、负荷率 %，按参考图标注，不换算数值。脉冲频率单位及额定值待确认。</p><p>故障码与报警码保留原始代码，零值仅显示 0，其他代码直接显示。控制字与状态字保留原值；缺失值显示“—”。</p><a className="text-link" href="#metrics">查看分组指标 →</a></section>
					<section className="panel-card"><h2>曲线与仪表</h2><p>曲线展示最近 50、100 或 200 条记录中的有效时间采样。缺失数值处断线，无效采集时间不进入曲线。</p><p>转速、电流、电压和两项温度仪表采用参考图的固定量程：−1500～1500 rpm、0～3.3 A、0～1200 V、0～150 °C。实际转矩保留当前采样范围，恒定读数会扩展显示范围。读数超过量程时指针停在边界，数值保留实际读数；缺失读数显示“—”。仪表范围不代表安全阈值。采样明细保留记录的完整精度。</p><a className="text-link" href="#realtime">查看采样趋势 →</a></section>
				</div>}
			</main>
		</div>
	);
}
