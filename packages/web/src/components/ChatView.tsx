import {
	ArrowDown,
	ArrowUpRight,
	Check,
	CheckCircle2,
	Copy,
	Cpu,
	Database,
	Download,
	LoaderCircle,
	RotateCcw,
	User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { retryQuestion, toolLabels } from "../chat.ts";
import { downloadText } from "../download.ts";
import { normalizeReply } from "../reply-text.ts";
import { messageReport } from "../report.ts";
import { messageSources, sourceHref, sourcePages } from "../sources.ts";
import type { ChatMessage } from "../types.ts";
import { MessageContent } from "./MessageContent";

function ReplyActions({ message }: { message: ChatMessage }) {
	const [copyStatus, setCopyStatus] = useState("");
	useEffect(() => {
		if (!copyStatus) return;
		const timer = setTimeout(() => setCopyStatus(""), 3000);
		return () => clearTimeout(timer);
	}, [copyStatus]);
	return (
		<div className="flex flex-wrap items-center gap-x-3 border-t border-slate-100 mt-4 pt-2">
			<button
				type="button"
				className="message-action"
				onClick={async () => {
					try {
						if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(message.content);
						else {
							const active = document.activeElement;
							const input = document.createElement("textarea");
							input.value = message.content;
							input.style.cssText = "position:fixed;opacity:0;pointer-events:none";
							document.body.append(input);
							try {
								input.select();
								if (!document.execCommand("copy")) throw new Error("复制不可用");
							} finally {
								input.remove();
								if (active instanceof HTMLElement) active.focus({ preventScroll: true });
							}
						}
						setCopyStatus("已复制");
					} catch {
						setCopyStatus("复制失败，请选中文字复制");
					}
				}}
			>
				{copyStatus === "已复制" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
				{message.status === "done" ? "复制回答" : "复制已有内容"}
			</button>
			{message.status === "done" && (
				<button
					type="button"
					className="message-action"
					onClick={() =>
						downloadText(`DCMA-${message.id}.md`, messageReport(message), "text/markdown;charset=utf-8")
					}
				>
					<Download className="w-4 h-4" />
					下载分析报告
				</button>
			)}
			<output className="text-xs text-slate-600" aria-live="polite">
				{copyStatus}
			</output>
		</div>
	);
}

export function ChatView({
	messages,
	isStreaming,
	onRetry,
}: {
	messages: ChatMessage[];
	isStreaming: boolean;
	onRetry: () => void;
}) {
	const scroll = useRef<HTMLDivElement>(null);
	const following = useRef(true);
	const [showLatest, setShowLatest] = useState(false);
	const lastUserId = messages.findLast((message) => message.role === "user")?.id;
	useEffect(() => {
		if (lastUserId) following.current = true;
	}, [lastUserId]);
	useEffect(() => {
		if (messages.length && following.current && scroll.current)
			scroll.current.scrollTop = scroll.current.scrollHeight;
	}, [messages]);
	return (
		<div className="relative flex-1 min-h-0 flex flex-col">
			<div
				ref={scroll}
				role="log"
				aria-label="对话消息"
				aria-live={isStreaming ? "off" : "polite"}
				aria-busy={isStreaming}
				onScroll={() => {
					const element = scroll.current;
					if (!element) return;
					following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
					setShowLatest(!following.current);
				}}
				className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-5 w-full"
			>
				<div className="max-w-[800px] mx-auto space-y-6 pb-12">
					{messages.map((savedMessage, index) => {
						const message = normalizeReply(savedMessage);
						const sources = messageSources(message.tools);
						const streaming = message.status === "streaming";
						const querying = message.tools?.some((tool) => tool.status === "running");
						const status = streaming
							? querying
								? "正在查询数据"
								: message.content
									? "正在生成回答"
									: "等待模型响应"
							: message.status === "error"
								? "请求失败"
								: message.status === "cancelled"
									? "已停止"
									: "回答完成";
						return (
							<div
								key={message.id}
								className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
							>
								{message.role === "assistant" && (
									<span
										className="hidden sm:flex h-8 w-8 shrink-0 rounded-full bg-blue-600 text-white items-center justify-center"
										aria-hidden="true"
									>
										<Cpu className="w-4 h-4" />
									</span>
								)}
								<article
									aria-label={message.role === "assistant" ? "Agent 回答" : "用户问题"}
									className={`min-w-0 rounded-2xl p-4 sm:p-5 ${message.role === "user" ? "max-w-[90%] bg-blue-600 text-white" : "flex-1 bg-white border border-slate-200 shadow-sm"}`}
								>
									{message.role === "assistant" && (
										<header className="border-b border-slate-100 pb-3 mb-4">
											<div className="flex flex-wrap items-center justify-between gap-2">
												<strong className="text-sm">DCMA Agent</strong>
												<output
													className={`flex gap-1.5 items-center text-xs ${message.status === "error" ? "text-red-700" : streaming ? "text-blue-700" : "text-slate-600"}`}
													aria-live="polite"
												>
													{streaming && (
														<LoaderCircle className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
													)}
													{(!message.status || message.status === "done") && (
														<CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
													)}
													{status}
												</output>
											</div>
											<p className="mt-1 text-xs text-slate-500 break-words">
												{message.engine || "DCMA"} ·{" "}
												<time dateTime={message.timestamp}>
													{new Date(message.timestamp).toLocaleTimeString("zh-CN")}
												</time>
											</p>
										</header>
									)}
									{!!message.tools?.length && (
										<details
											open={streaming}
											className="mb-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600"
										>
											<summary className="cursor-pointer px-3 py-3 focus-visible:outline-blue-600">
												查询过程 · {message.tools.length} 次调用
											</summary>
											<ol className="px-3 pb-3 space-y-2">
												{message.tools.map((tool) => (
													<li key={tool.id} className="flex justify-between gap-3">
														<span>
															{Object.hasOwn(toolLabels, tool.name) ? toolLabels[tool.name] : "执行查询"}
														</span>
														<span className={tool.status === "error" ? "text-red-700" : "text-slate-600"}>
															{tool.status === "running"
																? "查询中"
																: tool.status === "done"
																	? "已完成"
																	: tool.status === "error"
																		? "未取得数据"
																		: "已中断"}
														</span>
													</li>
												))}
											</ol>
										</details>
									)}
									{message.role === "assistant" ? (
										message.content ? (
											<MessageContent content={message.content} />
										) : (
											streaming && (
												<p className="text-sm text-slate-500">
													{querying
														? "正在读取数据，取得结果后继续回答。"
														: "正在等待模型响应，可以随时停止。"}
												</p>
											)
										)
									) : (
										<div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
											{message.content}
										</div>
									)}
									{(message.status === "error" || message.status === "cancelled") && (
										<div
											className={`mt-4 rounded-xl p-3 text-sm ${message.status === "error" ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-600"}`}
										>
											<p role={message.status === "error" ? "alert" : "status"}>
												{message.error ||
													(message.status === "error"
														? "本次请求失败，请检查连接后重试。"
														: "生成已停止。")}
											</p>
											{message.content && (
												<p className="mt-1 text-xs">以上为已生成的部分内容，回答尚未完成。</p>
											)}
										</div>
									)}
									{message.role === "assistant" && sources.length > 0 && (
										<section aria-label="回答来源" className="mt-5 border-t border-slate-100 pt-3">
											<h3 className="text-xs font-medium text-slate-500 mb-2">参考来源</h3>
											<ol className="space-y-2">
												{sources.map((source, index) => (
													<li key={`${source.table}/${source.page}/${source.queriedAt}`}>
														<a
															href={sourceHref(source)}
															target="_blank"
															rel="noopener noreferrer"
															className="source-citation"
															title={`在新标签页打开同一来源的${sourcePages[source.page]}，展板将读取当前数据`}
															aria-label={`来源 ${index + 1}：dcma.${source.table}，打开${sourcePages[source.page]}（新标签页）`}
														>
															<span className="source-citation-number">{index + 1}</span>
															<Database className="w-4 h-4 shrink-0 text-blue-600" aria-hidden="true" />
															<span className="min-w-0">
																<span className="block font-medium">
																	数据展板 · {sourcePages[source.page]}
																</span>
																<span className="block text-xs text-slate-500 break-words">
																	dcma.{source.table} ·{" "}
																	{source.table === "real_data" ? "历史真实采集" : "模拟数据"}
																</span>
															</span>
															<ArrowUpRight className="w-4 h-4 shrink-0 ml-auto" aria-hidden="true" />
														</a>
														<p className="mt-1 ml-3 text-xs text-slate-500">
															查询于 {new Date(source.queriedAt).toLocaleString("zh-CN")} · 本次返回{" "}
															{source.returned} 条
														</p>
													</li>
												))}
											</ol>
										</section>
									)}
									{message.role === "assistant" && !streaming && message.content && (
										<ReplyActions message={message} />
									)}
									{index === messages.length - 1 && retryQuestion(messages) && (
										<button
											type="button"
											disabled={isStreaming}
											onClick={onRetry}
											className="message-action mt-2 text-blue-700"
										>
											<RotateCcw className="w-4 h-4" />
											重新回答
										</button>
									)}
								</article>
								{message.role === "user" && (
									<span
										className="hidden sm:flex h-8 w-8 shrink-0 rounded-full bg-slate-200 text-slate-600 items-center justify-center"
										aria-hidden="true"
									>
										<User className="w-4 h-4" />
									</span>
								)}
							</div>
						);
					})}
				</div>
			</div>
			{showLatest && (
				<button
					type="button"
					onClick={() => {
						following.current = true;
						if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
						setShowLatest(false);
					}}
					className="absolute bottom-3 self-center flex items-center gap-2 min-h-11 px-4 rounded-full bg-white border border-blue-200 shadow-md text-sm text-blue-700"
				>
					<ArrowDown className="w-4 h-4" />
					回到最新回答
				</button>
			)}
		</div>
	);
}
