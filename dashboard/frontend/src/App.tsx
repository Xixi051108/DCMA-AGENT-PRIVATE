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
					<section className="panel-card"><div className="guide-heading"><h2>当前数据来源</h2><img className="source-illustration" src="/assets/illustrations/sampling-records.svg" alt="" aria-hidden="true" width="320" height="160" loading="lazy" /></div><p className="guide-value">G120 电机 {motor} <span className="source-badge">{sourceLabel}</span></p><p>{motor === 1 ? "电机 1 提供模拟数据和历史真实采集两种独立来源，可在侧边栏切换。" : `电机 ${motor} 当前使用模拟数据来源。`}</p><p>选择设备和数据来源后，各页面联动显示对应设备的数据。历史真实采集用于查看已有采样记录。</p></section>
					<section className="panel-card"><h2>采样与时间</h2><p>采集时间表示设备采样时刻；入库时间表示采样记录存入数据库的时刻；上次查询成功表示页面最近一次成功获取数据的时刻。所有时间均以北京时间显示。</p><p>最新读数与近期采样每 3 秒更新检查一次，也可点击“刷新数据”。“检测到新采样”表示出现新记录；“本次无新采样”表示尚未查询到新的采样记录。</p><p>历史异常每 30 秒更新检查一次，查询范围覆盖所选来源的全部历史记录，不受顶部采样条数限制。选择开始与结束时间，可查询与该时间段重叠的异常事件。</p><p>事件开始与结束时间依据采样中的代码变化确定，精度受采样间隔影响。“最早观察时间”表示首条可查询记录已存在异常；“未结束”表示尚未观察到归零或换码，持续时间仅统计已观察时段。代码缺失不视为恢复，历史事件可查询范围取决于采样记录的保存情况。</p></section>
					<section className="panel-card"><h2>指标与代码</h2><p>涵盖运动、电气、功率、温度和负荷等 18 项数值指标，共 {fields.length} 个数据字段。转速单位为 rpm，电流为 A，转矩为 N·m，电压为 V，功率为 kW，温度为 °C，负荷率为 %。脉冲频率暂未标注单位。</p><p>故障码与报警码为 0 时表示无对应异常；非零故障码以红色标识，非零报警码以深黄色标识。控制字与状态字展示设备的控制与反馈状态数据，缺失数据显示“—”。</p><a className="text-link" href="#metrics">查看分组指标 →</a></section>
					<section className="panel-card"><h2>曲线与仪表</h2><p>曲线展示最近 50、100 或 200 条记录的变化趋势，可对比设定值与实际值，或查看单项指标。缺失数值处以断线表示；采集时间无效的记录不参与曲线展示。</p><p>转速、电流、电压、两项温度仪表及实际转矩的量程：转速 −1500～1500 rpm，电流 0～3.3 A，电压 0～1200 V，变频器温度与电机温度均为 0～150 °C；实际转矩量程根据当前采样数据自动调整，数值恒定时适当扩展显示范围。</p><p>超出量程时，指针停在边界，数字显示实际读数；缺失读数显示“—”。仪表量程用于读数展示，不作为安全阈值。需要核对详细数值时，可查看采样明细。</p><a className="text-link" href="#realtime">查看采样趋势 →</a></section>
				</div>}
			</main>
		</div>
	);
}
