import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Locale = 'en' | 'zh-CN';

export const LOCALE_STORAGE_KEY = 'mockserver-locale';

const en = {
  'appBar.connection.connected': 'connected',
  'appBar.connection.connecting': 'connecting',
  'appBar.connection.disconnected': 'disconnected',
  'appBar.connection.error': 'error',
  'appBar.connection.tooltip': 'MockServer at {{url}}',
  'appBar.http3.tooltip': 'HTTP/3 (QUIC) on UDP port {{port}} — {{count}} active connection{{suffix}}',
  'appBar.navigate': 'Navigate',
  'appBar.openNavigation': 'Open navigation menu',
  'appBar.newWorkspace': 'New workspace',
  'appBar.newWorkspace.tooltip': 'New workspace — an independent view and set of search filters',
  'appBar.keyboardShortcuts': 'Keyboard shortcuts',
  'appBar.serverClock': 'Server clock',
  'appBar.serverClock.tooltip': 'Server clock (freeze / advance time)',
  'appBar.explainUnmatched': 'Explain unmatched requests',
  'appBar.matcherPlayground': 'Matcher test playground',
  'appBar.matcherPlayground.tooltip': 'Matcher test playground — try a request against a candidate expectation',
  'appBar.serverConfiguration': 'Server configuration',
  'appBar.stopFollowing': 'Stop following new entries',
  'appBar.follow': 'Follow new entries',
  'appBar.switchTheme': 'Switch to {{mode}} mode',
  'appBar.theme.light': 'light',
  'appBar.theme.dark': 'dark',
  'appBar.operatingMode': 'Operating mode',
  'appBar.mode.simulate': 'Match expectations; unmatched requests return 404',
  'appBar.mode.spy': 'Match expectations; forward and record unmatched requests',
  'appBar.mode.capture': 'Forward and record all traffic (captures everything when no expectations are set)',
  'appBar.mode.changed': 'Operating mode set to {{mode}}',
  'appBar.language': 'Language',
  'appBar.language.tooltip': 'Display language',
  'appBar.importExport': 'Import / export',
  'appBar.importExportTools': 'Import / export tools',
  'appBar.clear': 'Clear',
  'appBar.clearAria': 'Clear logs, expectations, or reset server',
  'appBar.clearLogs.menu': 'Clear Server Logs',
  'appBar.clearLogs.title': 'Clear server logs?',
  'appBar.clearLogs.message': 'This removes every recorded and proxied request and all server logs. Expectations are kept. This cannot be undone.',
  'appBar.clearLogs.confirm': 'Clear logs',
  'appBar.clearExpectations.menu': 'Clear Server Expectations',
  'appBar.clearExpectations.title': 'Clear all expectations?',
  'appBar.clearExpectations.message': 'This removes every registered expectation from the server. Recorded requests and logs are kept. This cannot be undone.',
  'appBar.clearExpectations.confirm': 'Clear expectations',
  'appBar.reset.menu': 'Reset Server (all)',
  'appBar.reset.title': 'Reset the entire server?',
  'appBar.reset.message': 'This clears ALL expectations, recorded requests and logs, and resets server state. This cannot be undone.',
  'appBar.reset.confirm': 'Reset server',
  'appBar.confirm': 'Confirm',
  'tools.importOpenApi': 'Import OpenAPI…',
  'tools.importWsdl': 'Import WSDL…',
  'tools.importGraphql': 'Import GraphQL Schema…',
  'tools.pact': 'Pact Contract (export / verify)…',
  'tools.oidc': 'Mock OIDC Provider…',
  'tools.saml': 'Mock SAML Provider…',
  'tools.scim': 'Mock SCIM Provider…',
  'tools.asyncApi': 'AsyncAPI Broker Mock…',
  'tools.crud': 'Register CRUD Resource…',
  'tools.fileStore': 'Mock File Store…',
  'tools.diffRequests': 'Diff Two Requests…',
  'tools.compareBaseline': 'Compare Against Baseline…',

  'nav.group.mock': 'Mock',
  'nav.group.mock.aria': 'Mock views',
  'nav.group.observe': 'Observe',
  'nav.group.observe.aria': 'Observe views',
  'nav.group.verify': 'Verify',
  'nav.group.verify.aria': 'Verify views',
  'nav.group.resilience': 'Resilience',
  'nav.group.resilience.aria': 'Resilience views',
  'nav.group.ai': 'AI',
  'nav.group.ai.aria': 'AI views',
  'nav.group.inspect': 'Inspect',
  'nav.group.inspect.aria': 'Inspect views',
  'nav.getStarted': 'Get Started',
  'nav.getStarted.aria': 'Get started view',
  'nav.composer': 'Mocks',
  'nav.composer.aria': 'Mocks view',
  'nav.composer.description': 'Create, edit, and manage mock expectations — quick mode for common cases, advanced mode for full control.',
  'nav.scenarios': 'Scenarios',
  'nav.scenarios.aria': 'Scenarios view',
  'nav.scenarios.description': 'Manage scenario states and transitions — drive stateful, multi-step mock flows through a state machine.',
  'nav.grpc': 'gRPC',
  'nav.grpc.aria': 'gRPC services view',
  'nav.grpc.description': 'Mock gRPC services and inspect gRPC calls.',
  'nav.async': 'Async',
  'nav.async.aria': 'AsyncAPI broker mock view',
  'nav.async.description': 'Mock event-driven APIs from an AsyncAPI spec — publish test messages to Kafka, MQTT, and AMQP (RabbitMQ) brokers.',
  'nav.dashboard': 'Dashboard',
  'nav.dashboard.aria': 'Dashboard view',
  'nav.dashboard.description': 'Live view of incoming requests, active expectations, and what matched.',
  'nav.traffic': 'Traffic',
  'nav.traffic.aria': 'Traffic inspector view',
  'nav.traffic.description': 'Browse recorded request and response traffic — select an item to open its full details.',
  'nav.trace': 'Trace',
  'nav.trace.aria': 'Trace inspector view',
  'nav.trace.description': 'Trace related requests grouped together — including LLM agent runs — to debug multi-step flows end to end.',
  'nav.metrics': 'Metrics',
  'nav.metrics.aria': 'Metrics view',
  'nav.metrics.description': 'Prometheus metrics plus memory and performance monitoring.',
  'nav.verification': 'Verify',
  'nav.verification.aria': 'Verification view',
  'nav.verification.description': 'Assert which requests were — or were not — received.',
  'nav.contract': 'Contract',
  'nav.contract.aria': 'Contract test view',
  'nav.contract.description': 'Validate mocks and traffic against an OpenAPI contract.',
  'nav.slo': 'SLO',
  'nav.slo.aria': 'SLO verification view',
  'nav.slo.description': 'Assert service-level objectives — latency percentiles and error rate — against recorded traffic.',
  'nav.drift': 'Drift',
  'nav.drift.aria': 'Drift detection view',
  'nav.drift.description': 'Detect when your mocks drift away from the real API they stand in for.',
  'nav.chaos': 'Chaos',
  'nav.chaos.aria': 'Service chaos view',
  'nav.chaos.description': 'Inject latency, errors, and faults to test how your system handles failure.',
  'nav.performance': 'Performance',
  'nav.performance.aria': 'Performance testing view',
  'nav.performance.description': 'Create, run, and monitor load scenarios — drive traffic at a target and watch live throughput and latency.',
  'nav.optimise': 'LLM Optimise',
  'nav.optimise.aria': 'LLM Optimise view',
  'nav.optimise.description': 'Analyse captured LLM traffic to optimise prompts, inference cost, safety, and speed.',
  'nav.mcpHealth': 'MCP Health',
  'nav.mcpHealth.aria': 'MCP server health view',
  'nav.mcpHealth.description': 'See which MCP servers your proxied tools call are slow or erroring — the MCP server is often the real bottleneck behind a slow coding assistant.',
  'nav.breakpoints': 'Breakpoints',
  'nav.breakpoints.aria': 'Breakpoints view',
  'nav.breakpoints.description': 'Pause matching requests or responses mid-flight to inspect and edit them.',
  'nav.audit': 'Audit',
  'nav.audit.aria': 'Audit trail view',
  'nav.audit.description': 'Review recent control-plane changes — a chronological trail of mutations to expectations, configuration, and server state.',
  'nav.library': 'Library',
  'nav.library.aria': 'Library of captured content',
  'nav.library.description': 'Browse and reuse captured requests, responses, and content.',
  'nav.cluster': 'Cluster',
  'nav.cluster.aria': 'Cluster status view',
  'nav.cluster.description': 'Monitor MockServer cluster nodes and shared state.',

  'shell.connectionLost.title': 'Connection lost',
  'shell.connectionLost.message': 'The dashboard has lost its live connection to MockServer and is trying to reconnect. Displayed data may be stale until the connection is restored.',
  'shell.thisView': 'this view',
  'shell.loading.default': 'Loading…',
  'shell.loading.traffic': 'Loading traffic…',
  'shell.loading.trace': 'Loading trace…',
  'shell.loading.composer': 'Loading composer…',
  'shell.loading.library': 'Loading library…',
  'shell.loading.metrics': 'Loading metrics…',
  'shell.loading.optimise': 'Loading LLM Optimise…',
  'shell.loading.mcpHealth': 'Loading MCP Health…',
  'shell.loading.chaos': 'Loading chaos…',
  'shell.loading.performance': 'Loading performance…',
  'shell.loading.drift': 'Loading drift…',
  'shell.loading.verify': 'Loading verify…',
  'shell.loading.slo': 'Loading SLO…',
  'shell.loading.async': 'Loading async…',
  'shell.loading.grpc': 'Loading gRPC…',
  'shell.loading.breakpoints': 'Loading breakpoints…',
  'shell.loading.contract': 'Loading contract…',
  'shell.loading.cluster': 'Loading cluster…',
  'shell.loading.scenarios': 'Loading scenarios…',
  'shell.loading.audit': 'Loading audit…',

  'onboarding.welcome': 'Welcome to MockServer',
  'onboarding.intro': 'Mock, proxy, and debug HTTP, HTTPS, and other APIs. These are the key things you can do — open any one below, or use the tabs above for the full feature set.',
  'onboarding.openDashboard': 'Open Dashboard',
  'onboarding.existingMocks': 'This server has {{count}} active mock{{suffix}}',
  'onboarding.hasRecordedRequests': ' and has recorded requests',
  'onboarding.sentenceEnd': '.',
  'onboarding.feature.mocking.title': 'Mocking',
  'onboarding.feature.mocking.description': 'Build mock responses by hand, or import an OpenAPI / Swagger spec, Postman collection, WSDL, or HAR file to generate stubs automatically.',
  'onboarding.feature.mocking.action': 'Create Mock',
  'onboarding.feature.mocking.secondary': 'Import OpenAPI',
  'onboarding.feature.proxy.title': 'Debugging Proxy',
  'onboarding.feature.proxy.description': 'Sit MockServer between your app and a real API to record, inspect, and replay live traffic — and validate or rewrite it on the way through.',
  'onboarding.feature.proxy.action': 'View Traffic',
  'onboarding.feature.breakpoints.title': 'Breakpoints',
  'onboarding.feature.breakpoints.description': 'Pause requests and responses mid-flight — proxied, mocked, or unmatched — then inspect, edit, continue, or abort them.',
  'onboarding.feature.breakpoints.action': 'Open Breakpoints',
  'onboarding.feature.chaos.title': 'Chaos Testing',
  'onboarding.feature.chaos.description': 'Inject latency, errors, and dropped connections to test how your system copes when the APIs it depends on misbehave.',
  'onboarding.feature.chaos.action': 'Open Chaos',
  'onboarding.feature.performance.title': 'Performance Testing',
  'onboarding.feature.performance.description': 'Inject load against any target — drive traffic at a chosen arrival rate, ramp it up and down, and watch live throughput and latency.',
  'onboarding.feature.performance.action': 'Open Performance',
  'onboarding.feature.optimise.title': 'LLM Optimise',
  'onboarding.feature.optimise.description': 'Capture LLM traffic through the proxy, then analyse it to optimise prompts, inference cost, safety, and speed.',
  'onboarding.feature.optimise.action': 'Open LLM Optimise',
  'onboarding.more': 'More in the tabs above (or see',
  'onboarding.moreSuffix': '):',
  'onboarding.uiDocs': 'UI docs',
  'onboarding.other.dashboard.label': 'Dashboard',
  'onboarding.other.dashboard.description': 'active mocks and live event log',
  'onboarding.other.library.label': 'Library',
  'onboarding.other.library.description': 'import / export, Postman, WSDL, HAR',
  'onboarding.other.verification.label': 'Verification',
  'onboarding.other.verification.description': 'assert which requests were received',
  'onboarding.other.drift.label': 'Drift',
  'onboarding.other.drift.description': 'spot when an upstream API changes',
  'onboarding.other.async.label': 'Async',
  'onboarding.other.async.description': 'Kafka / MQTT / AMQP broker mocking',
  'onboarding.other.metrics.label': 'Metrics',
  'onboarding.other.metrics.description': 'Prometheus stats',
} as const;

export type TranslationKey = keyof typeof en;
export type TranslationParams = Record<string, string | number>;
export type TranslateKey = (key: TranslationKey, params?: TranslationParams) => string;
export type TranslateInline = (english: string, chinese: string) => string;

const zhCN: Record<TranslationKey, string> = {
  'appBar.connection.connected': '已连接',
  'appBar.connection.connecting': '正在连接',
  'appBar.connection.disconnected': '已断开',
  'appBar.connection.error': '连接错误',
  'appBar.connection.tooltip': 'MockServer 地址：{{url}}',
  'appBar.http3.tooltip': 'HTTP/3 (QUIC) 使用 UDP 端口 {{port}}，当前有 {{count}} 个活动连接',
  'appBar.navigate': '导航',
  'appBar.openNavigation': '打开导航菜单',
  'appBar.newWorkspace': '新建工作区',
  'appBar.newWorkspace.tooltip': '新建工作区 — 使用独立视图和搜索筛选条件',
  'appBar.keyboardShortcuts': '键盘快捷键',
  'appBar.serverClock': '服务器时钟',
  'appBar.serverClock.tooltip': '服务器时钟（冻结或推进时间）',
  'appBar.explainUnmatched': '解释请求未匹配的原因',
  'appBar.matcherPlayground': '匹配器测试台',
  'appBar.matcherPlayground.tooltip': '匹配器测试台 — 测试请求能否匹配候选期望',
  'appBar.serverConfiguration': '服务器配置',
  'appBar.stopFollowing': '停止跟随新条目',
  'appBar.follow': '跟随新条目',
  'appBar.switchTheme': '切换到{{mode}}模式',
  'appBar.theme.light': '浅色',
  'appBar.theme.dark': '深色',
  'appBar.operatingMode': '运行模式',
  'appBar.mode.simulate': '匹配期望；未匹配的请求返回 404',
  'appBar.mode.spy': '匹配期望；转发并记录未匹配的请求',
  'appBar.mode.capture': '转发并记录所有流量（没有设置期望时会捕获全部流量）',
  'appBar.mode.changed': '运行模式已设为 {{mode}}',
  'appBar.language': '语言',
  'appBar.language.tooltip': '显示语言',
  'appBar.importExport': '导入 / 导出',
  'appBar.importExportTools': '导入 / 导出工具',
  'appBar.clear': '清除',
  'appBar.clearAria': '清除日志或期望，或重置服务器',
  'appBar.clearLogs.menu': '清除服务器日志',
  'appBar.clearLogs.title': '要清除服务器日志吗？',
  'appBar.clearLogs.message': '这会删除所有已记录和已代理的请求以及全部服务器日志。期望会保留。此操作无法撤销。',
  'appBar.clearLogs.confirm': '清除日志',
  'appBar.clearExpectations.menu': '清除服务器期望',
  'appBar.clearExpectations.title': '要清除所有期望吗？',
  'appBar.clearExpectations.message': '这会删除服务器上注册的所有期望。已记录的请求和日志会保留。此操作无法撤销。',
  'appBar.clearExpectations.confirm': '清除期望',
  'appBar.reset.menu': '重置服务器（全部）',
  'appBar.reset.title': '要重置整个服务器吗？',
  'appBar.reset.message': '这会清除所有期望、已记录的请求和日志，并重置服务器状态。此操作无法撤销。',
  'appBar.reset.confirm': '重置服务器',
  'appBar.confirm': '确认',
  'tools.importOpenApi': '导入 OpenAPI…',
  'tools.importWsdl': '导入 WSDL…',
  'tools.importGraphql': '导入 GraphQL Schema…',
  'tools.pact': 'Pact 契约（导出 / 验证）…',
  'tools.oidc': '模拟 OIDC 提供方…',
  'tools.saml': '模拟 SAML 提供方…',
  'tools.scim': '模拟 SCIM 提供方…',
  'tools.asyncApi': '模拟 AsyncAPI 消息代理…',
  'tools.crud': '注册 CRUD 资源…',
  'tools.fileStore': '模拟文件存储…',
  'tools.diffRequests': '比较两个请求的差异…',
  'tools.compareBaseline': '与基线比较…',

  'nav.group.mock': '模拟',
  'nav.group.mock.aria': '模拟功能视图',
  'nav.group.observe': '观察',
  'nav.group.observe.aria': '观察视图',
  'nav.group.verify': '验证',
  'nav.group.verify.aria': '验证视图',
  'nav.group.resilience': '韧性',
  'nav.group.resilience.aria': '韧性测试视图',
  'nav.group.ai': 'AI',
  'nav.group.ai.aria': 'AI 视图',
  'nav.group.inspect': '检查',
  'nav.group.inspect.aria': '检查与调试视图',
  'nav.getStarted': '开始使用',
  'nav.getStarted.aria': '开始使用视图',
  'nav.composer': '模拟规则',
  'nav.composer.aria': '模拟规则视图',
  'nav.composer.description': '创建、编辑和管理模拟期望；快速模式适合常见场景，高级模式提供完整控制。',
  'nav.scenarios': '场景',
  'nav.scenarios.aria': '场景视图',
  'nav.scenarios.description': '管理场景状态和转换，通过状态机驱动有状态的多步骤模拟流程。',
  'nav.grpc': 'gRPC',
  'nav.grpc.aria': 'gRPC 服务视图',
  'nav.grpc.description': '模拟 gRPC 服务并检查 gRPC 调用。',
  'nav.async': '异步 API',
  'nav.async.aria': 'AsyncAPI 消息代理模拟视图',
  'nav.async.description': '根据 AsyncAPI 规范模拟事件驱动 API，并向 Kafka、MQTT 和 AMQP (RabbitMQ) 消息代理发布测试消息。',
  'nav.dashboard': '仪表盘',
  'nav.dashboard.aria': '仪表盘视图',
  'nav.dashboard.description': '实时查看传入请求、活动期望及其匹配结果。',
  'nav.traffic': '流量',
  'nav.traffic.aria': '流量检查视图',
  'nav.traffic.description': '浏览已记录的请求和响应流量；选择条目可查看完整详情。',
  'nav.trace': '链路',
  'nav.trace.aria': '链路检查视图',
  'nav.trace.description': '将相关请求（包括 LLM Agent 运行）分组为链路，端到端调试多步骤流程。',
  'nav.metrics': '指标',
  'nav.metrics.aria': '指标视图',
  'nav.metrics.description': '查看 Prometheus 指标以及内存和性能监控数据。',
  'nav.verification': '请求验证',
  'nav.verification.aria': '请求验证视图',
  'nav.verification.description': '断言指定请求是否已收到或未收到。',
  'nav.contract': '契约',
  'nav.contract.aria': '契约测试视图',
  'nav.contract.description': '依据 OpenAPI 契约验证模拟规则和实际流量。',
  'nav.slo': 'SLO',
  'nav.slo.aria': 'SLO 验证视图',
  'nav.slo.description': '依据已记录流量验证服务级别目标，包括延迟百分位数和错误率。',
  'nav.drift': '漂移',
  'nav.drift.aria': '漂移检测视图',
  'nav.drift.description': '检测模拟行为何时偏离其所代表的真实 API。',
  'nav.chaos': '混沌',
  'nav.chaos.aria': '服务混沌测试视图',
  'nav.chaos.description': '注入延迟、错误和故障，测试系统应对依赖失败的能力。',
  'nav.performance': '性能',
  'nav.performance.aria': '性能测试视图',
  'nav.performance.description': '创建、运行并监控负载场景，按目标速率生成流量并实时观察吞吐量和延迟。',
  'nav.optimise': 'LLM 优化',
  'nav.optimise.aria': 'LLM 优化视图',
  'nav.optimise.description': '分析捕获的 LLM 流量，优化提示词、推理成本、安全性和响应速度。',
  'nav.mcpHealth': 'MCP 健康状态',
  'nav.mcpHealth.aria': 'MCP 服务器健康状态视图',
  'nav.mcpHealth.description': '查看代理工具所调用的 MCP 服务器是否缓慢或出错；MCP 服务器往往是编码助手变慢的真正瓶颈。',
  'nav.breakpoints': '断点',
  'nav.breakpoints.aria': '断点视图',
  'nav.breakpoints.description': '在传输过程中暂停匹配的请求或响应，以便检查和编辑。',
  'nav.audit': '审计',
  'nav.audit.aria': '审计跟踪视图',
  'nav.audit.description': '按时间顺序检查近期控制面变更，包括对期望、配置和服务器状态的修改。',
  'nav.library': '资源库',
  'nav.library.aria': '已捕获内容资源库',
  'nav.library.description': '浏览并复用捕获的请求、响应和其他内容。',
  'nav.cluster': '集群',
  'nav.cluster.aria': '集群状态视图',
  'nav.cluster.description': '监控 MockServer 集群节点和共享状态。',

  'shell.connectionLost.title': '连接已断开',
  'shell.connectionLost.message': '仪表盘与 MockServer 的实时连接已断开，正在尝试重新连接。恢复连接前，显示的数据可能已经过期。',
  'shell.thisView': '当前视图',
  'shell.loading.default': '正在加载…',
  'shell.loading.traffic': '正在加载流量…',
  'shell.loading.trace': '正在加载链路…',
  'shell.loading.composer': '正在加载模拟规则编辑器…',
  'shell.loading.library': '正在加载资源库…',
  'shell.loading.metrics': '正在加载指标…',
  'shell.loading.optimise': '正在加载 LLM 优化…',
  'shell.loading.mcpHealth': '正在加载 MCP 健康状态…',
  'shell.loading.chaos': '正在加载混沌测试…',
  'shell.loading.performance': '正在加载性能测试…',
  'shell.loading.drift': '正在加载漂移检测…',
  'shell.loading.verify': '正在加载请求验证…',
  'shell.loading.slo': '正在加载 SLO…',
  'shell.loading.async': '正在加载异步 API…',
  'shell.loading.grpc': '正在加载 gRPC…',
  'shell.loading.breakpoints': '正在加载断点…',
  'shell.loading.contract': '正在加载契约测试…',
  'shell.loading.cluster': '正在加载集群状态…',
  'shell.loading.scenarios': '正在加载场景…',
  'shell.loading.audit': '正在加载审计记录…',

  'onboarding.welcome': '欢迎使用 MockServer',
  'onboarding.intro': '使用 MockServer 模拟、代理和调试 HTTP、HTTPS 及其他 API。以下是最常用的功能；可直接打开任一功能，也可通过上方导航查看完整功能。',
  'onboarding.openDashboard': '打开仪表盘',
  'onboarding.existingMocks': '此服务器有 {{count}} 个活动模拟规则',
  'onboarding.hasRecordedRequests': '，并且已有请求记录',
  'onboarding.sentenceEnd': '。',
  'onboarding.feature.mocking.title': 'API 模拟',
  'onboarding.feature.mocking.description': '手动构建模拟响应，或导入 OpenAPI / Swagger 规范、Postman 集合、WSDL 或 HAR 文件，自动生成模拟规则。',
  'onboarding.feature.mocking.action': '创建模拟规则',
  'onboarding.feature.mocking.secondary': '导入 OpenAPI',
  'onboarding.feature.proxy.title': '调试代理',
  'onboarding.feature.proxy.description': '将 MockServer 放在应用与真实 API 之间，记录、检查和重放实时流量，并可在转发途中验证或改写流量。',
  'onboarding.feature.proxy.action': '查看流量',
  'onboarding.feature.breakpoints.title': '请求断点',
  'onboarding.feature.breakpoints.description': '在代理、模拟或未匹配请求及响应的传输途中暂停，然后检查、编辑、继续或中止。',
  'onboarding.feature.breakpoints.action': '打开断点',
  'onboarding.feature.chaos.title': '混沌测试',
  'onboarding.feature.chaos.description': '注入延迟、错误和连接中断，测试系统在所依赖 API 出现异常时的应对能力。',
  'onboarding.feature.chaos.action': '打开混沌测试',
  'onboarding.feature.performance.title': '性能测试',
  'onboarding.feature.performance.description': '向任意目标注入负载，按指定到达速率生成流量、逐步升降负载，并实时观察吞吐量和延迟。',
  'onboarding.feature.performance.action': '打开性能测试',
  'onboarding.feature.optimise.title': 'LLM 优化',
  'onboarding.feature.optimise.description': '通过代理捕获 LLM 流量，再分析并优化提示词、推理成本、安全性和响应速度。',
  'onboarding.feature.optimise.action': '打开 LLM 优化',
  'onboarding.more': '上方导航中还有更多功能（另请参阅',
  'onboarding.moreSuffix': '）：',
  'onboarding.uiDocs': 'UI 文档',
  'onboarding.other.dashboard.label': '仪表盘',
  'onboarding.other.dashboard.description': '查看活动模拟规则和实时事件日志',
  'onboarding.other.library.label': '资源库',
  'onboarding.other.library.description': '导入 / 导出 Postman、WSDL、HAR 等内容',
  'onboarding.other.verification.label': '请求验证',
  'onboarding.other.verification.description': '断言收到了哪些请求',
  'onboarding.other.drift.label': '漂移检测',
  'onboarding.other.drift.description': '发现上游 API 的行为变化',
  'onboarding.other.async.label': '异步 API',
  'onboarding.other.async.description': '模拟 Kafka / MQTT / AMQP 消息代理',
  'onboarding.other.metrics.label': '指标',
  'onboarding.other.metrics.description': '查看 Prometheus 统计数据',
};

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en,
  'zh-CN': zhCN,
};

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

export function translateKey(locale: Locale, key: TranslationKey, params?: TranslationParams): string {
  return interpolate(translations[locale][key], params);
}

// Framework-independent translation for utility modules. English is the safe
// default until an I18nProvider is mounted.
let currentLocale: Locale = 'en';

export function getLocale(): Locale {
  return currentLocale;
}

export function translate(english: string, chinese: string): string {
  return currentLocale === 'zh-CN' ? chinese : english;
}

export function localeFromLanguage(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

function storedLocale(): Locale | null {
  try {
    const value = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY);
    return value === 'en' || value === 'zh-CN' ? value : null;
  } catch {
    return null;
  }
}

function browserLocale(): Locale {
  return localeFromLanguage(globalThis.navigator?.language);
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateKey;
  tr: TranslateInline;
}

const defaultValue: I18nValue = {
  locale: 'en',
  setLocale: () => undefined,
  t: (key, params) => translateKey('en', key, params),
  tr: (english) => english,
};

const I18nContext = createContext<I18nValue>(defaultValue);

interface I18nProviderProps {
  children: ReactNode;
  /** Explicit locale for deterministic tests and embedded hosts. */
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, updateLocale] = useState<Locale>(() => initialLocale ?? storedLocale() ?? browserLocale());

  // Keep framework-independent translations in sync during render. Updating this
  // only in an effect leaves utility messages one render behind a locale change.
  currentLocale = locale;

  const setLocale = useCallback((next: Locale) => updateLocale(next), []);
  const t = useCallback<TranslateKey>((key, params) => translateKey(locale, key, params), [locale]);
  const tr = useCallback<TranslateInline>(
    (english, chinese) => (locale === 'zh-CN' ? chinese : english),
    [locale],
  );

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Storage can be unavailable in privacy-restricted or embedded browsers.
    }
    if (globalThis.document?.documentElement) globalThis.document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t, tr }), [locale, setLocale, t, tr]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
