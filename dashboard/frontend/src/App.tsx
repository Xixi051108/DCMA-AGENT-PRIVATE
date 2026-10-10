import { useState } from "react";
import { fieldLabels, numericFields, type DashboardField, type DashboardTable, type NumericField } from "./database-types.ts";
import { displayTime, displayValue } from "./dashboard-view.ts";
import { useDashboard } from "./useDashboard.ts";
import { Gauge } from "./components/Gauge.tsx";
import { LineChart } from "./components/LineChart.tsx";

const motorTables: DashboardTable[] = ["real_data_01", "real_data_02", "real_data_03", "real_data_04"];
const runningFields: DashboardField[] = ["inverter_load_rate", "motor_load_rate", "system_run_time", "status", "fault_code", "alarm_code"];
const fields = Object.keys(fieldLabels) as DashboardField[];
const gaugeFields = ["speed_actual", "current_actual", "torque_actual", "dc_voltage", "inverter_temp", "motor_temp"] as const;

export function App() {
	const [motor, setMotor] = useState(1);
	const [history, setHistory] = useState(false);
	const [limit, setLimit] = useState<50 | 100 | 200>(100);
	const [metric, setMetric] = useState<"speed" | "torque" | NumericField>("speed");
	const table = motor === 1 && history ? "real_data" : motorTables[motor - 1];
	const { data, loading, error, update, refresh } = useDashboard(table, limit);
	const latest = data?.latest;
	const selectedSource = data?.sources.find((source) => source.table === table);
	const sourceLabel = table === "real_data" ? "历史真实采集" : "模拟数据";
	const chartFields: NumericField[] = metric === "speed" ? ["speed_setpoint", "speed_actual"] : metric === "torque" ? ["torque_setpoint", "torque_actual"] : [metric];
	return (
		<div className="dashboard-shell">
			<aside className="sidebar">
				<div className="brand"><img src="/assets/logo.png" alt="" /><div><strong>DCMA</strong><span>电机与变频器监控</span></div></div>
				<div className="nav-current"><span aria-hidden="true">▥</span> 数据监控展板</div>
				<label className="sidebar-label" htmlFor="device">查看设备</label>
				<select id="device" value={motor} onChange={(event) => setMotor(Number(event.target.value))}>{motorTables.map((_, index) => <option key={index} value={index + 1}>G120 电机 {index + 1}</option>)}</select>
				<label className="sidebar-label" htmlFor="source">电机 1 数据来源</label>
				<select id="source" value={history ? "history" : "simulation"} onChange={(event) => setHistory(event.target.value === "history")}><option value="simulation">模拟数据</option><option value="history">历史真实采集</option></select>
				<p className="muted small">来源选择仅作用于电机 1。</p>
				<div className="sidebar-footer"><span className={`connection ${error ? "failed" : data ? "connected" : ""}`} />{error ? "接口查询失败" : data ? "数据库查询成功" : "正在连接接口"}<p className="muted small">只读查询 · 每 5 秒自动检查</p></div>
			</aside>
			<main className="dashboard-main">
				<header className="page-header"><div><p className="eyebrow">DCMA / 运行数据</p><h1>电机监控展板</h1><p className="muted">四台设备概览与单台采样详情</p></div><button className="refresh-button" onClick={refresh} disabled={loading}>{loading ? "正在查询…" : "刷新数据"}</button></header>
				<section aria-label="四台电机概览" className="motor-grid">{motorTables.map((simulationTable, index) => {
					const summary = data?.sources.find((source) => source.table === (index === 0 && history ? "real_data" : simulationTable));
					return <button key={simulationTable} className={`motor-card ${motor === index + 1 ? "selected" : ""}`} onClick={() => setMotor(index + 1)} aria-pressed={motor === index + 1}>
						<div className="card-title"><strong>{summary?.latest?.raw.device_name || `G120 电机 ${index + 1}`}</strong><span className="source-badge">{index === 0 && history ? "历史采集" : "模拟"}</span></div>
						<div className="overview-values"><div><span>实际转速</span><b>{displayValue(summary?.latest?.values.speed_actual)}</b></div><div><span>实际电流</span><b>{displayValue(summary?.latest?.values.current_actual)}</b></div></div>
						<p className="small muted">单位待确认 · 原始故障 / 报警：{displayValue(summary?.latest?.raw.fault_code)} / {displayValue(summary?.latest?.raw.alarm_code)}</p>
						<p className="small muted">采集：{displayTime(summary?.latest?.acquiredAt)}</p>{summary?.message && <p className="small source-message">{summary.message}</p>}
					</button>;
				})}</section>
				<section className="panel-card device-detail" aria-label="当前设备详情"><div className="detail-heading"><div><p className="eyebrow">当前设备</p><h2>{latest ? displayValue(latest.raw.device_name) : `G120 电机 ${motor}`}</h2><p className="muted">变频器：{displayValue(latest?.raw.inverter_name)}</p></div><span className="source-badge">{sourceLabel}</span></div><div className="time-grid"><div><span>最后采集（北京时间）</span><strong>{displayTime(latest?.acquiredAt)}</strong></div><div><span>入库时间（北京时间）</span><strong>{displayTime(latest?.ingestedAt)}</strong></div><div><span>上次查询成功</span><strong>{displayTime(data?.queriedAt)}</strong></div><div><span>采集更新状态</span><strong>{update}</strong></div></div></section>
				<div aria-live="polite">{error && <p className="notice error">{data ? "刷新失败，以下保留上次成功结果。" : "当前选择查询失败。"}{error}</p>}{!loading && data && !latest && <p className="notice">{selectedSource?.message || "当前来源暂无采样记录。"}</p>}{data?.warnings.map((warning) => <p className="notice" key={warning}>{warning}</p>)}</div>
				<section className="panel-card" aria-label="采样趋势">
					<div className="section-heading"><div><h2>采样趋势</h2><p className="muted small">设定值与实际值 · 最近采样窗口</p></div><div className="chart-controls">
						<label>查看指标 <select aria-label="查看指标" value={metric} onChange={(event) => setMetric(event.target.value as typeof metric)}><optgroup label="对比曲线"><option value="speed">转速对比</option><option value="torque">转矩对比</option></optgroup><optgroup label="单项指标">{numericFields.map((field) => <option key={field} value={field}>{fieldLabels[field]}</option>)}</optgroup></select></label>
						<label>采样条数 <select aria-label="采样条数" value={limit} onChange={(event) => setLimit(Number(event.target.value) as 50 | 100 | 200)}>{[50, 100, 200].map((value) => <option key={value} value={value}>{value} 条</option>)}</select></label>
					</div></div>
					<LineChart key={`${table}/${limit}/${metric}`} samples={data?.samples ?? []} fields={chartFields} />
					<p className="muted small window-count">已返回 {data?.returned ?? 0} 条记录，{data?.samples.length ?? 0} 条有效时间采样{data?.hasMore ? " · 仅展示最近窗口" : ""}{data?.truncated ? " · 响应已截断" : ""}</p>
				</section>
				<section aria-label="六项采样仪表" className="gauge-grid">{gaugeFields.map((field) => <Gauge key={field} label={fieldLabels[field]} value={latest?.values[field] ?? null} samples={data?.samples.map((sample) => sample.values[field]) ?? []} />)}</section>
				<section aria-label="运行信息" className="running-grid">{runningFields.map((field) => <div className="panel-card running-card" key={field}><span>{fieldLabels[field]}</span><strong>{displayValue(latest?.raw[field])}</strong><small>{numericFields.includes(field as typeof numericFields[number]) ? "单位待确认" : "原始值 · 含义待确认"}</small></div>)}</section>
				<section className="panel-card"><h2>完整参数</h2><p className="muted small">31 个原始字段 · 单位、代码映射及额定值待确认，保留原值</p><dl className="parameter-grid">{fields.map((field) => <div key={field}><dt>{fieldLabels[field]}<small>{field}</small></dt><dd>{displayValue(latest?.raw[field])}</dd></div>)}</dl></section>
				<section className="panel-card"><details><summary>采样明细 · {data?.returned ?? 0} 条原始记录</summary><div className="table-scroll"><table><thead><tr>{fields.map((field) => <th key={field}>{fieldLabels[field]}<small>{field}</small></th>)}</tr></thead><tbody>{data?.records.map((record) => <tr key={record.id}>{fields.map((field) => <td key={field}>{displayValue(record.raw[field])}</td>)}</tr>)}</tbody></table></div></details></section>
				<footer className="page-footer">采样值未作单位换算 · 状态、故障与报警保留原始代码 · 仪表范围不代表安全阈值</footer>
			</main>
		</div>
	);
}
