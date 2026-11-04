/**
 * Curated template snippets for the Composer's snippet palette.
 *
 * Each snippet provides engine-specific syntax for Velocity, Mustache, and
 * JavaScript — matching the real template variables and helpers available in
 * MockServer's template engines (see TemplateFunctions.java,
 * HttpRequestTemplateObject.java, and the per-engine test suites).
 *
 * Snippets are grouped by purpose so the palette can display them categorically.
 */
import { translate } from '../i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateEngine = 'VELOCITY' | 'MUSTACHE' | 'JAVASCRIPT';

export interface TemplateSnippet {
  /** Unique identifier for the snippet. */
  id: string;
  /** Short human-readable label shown in the palette. */
  label: string;
  /** One-line description of what the snippet does. */
  description: string;
  /** The template text to insert, keyed by engine. */
  syntax: Record<TemplateEngine, string>;
  /** A static example of what the snippet renders to (for preview). */
  exampleOutput: string;
}

export interface SnippetCategory {
  /** Category identifier. */
  id: string;
  /** Display name for the group. */
  label: string;
  /** Snippets in this group, in display order. */
  snippets: TemplateSnippet[];
}

// ---------------------------------------------------------------------------
// Snippet definitions
// ---------------------------------------------------------------------------

const REQUEST_ECHOES: TemplateSnippet[] = [
  {
    id: 'req-method',
    label: 'Request method',
    description: 'Echo the HTTP method of the incoming request.',
    syntax: {
      VELOCITY: '$request.method',
      MUSTACHE: '{{ request.method }}',
      JAVASCRIPT: 'request.method',
    },
    exampleOutput: 'GET',
  },
  {
    id: 'req-path',
    label: 'Request path',
    description: 'Echo the path of the incoming request.',
    syntax: {
      VELOCITY: '$request.path',
      MUSTACHE: '{{ request.path }}',
      JAVASCRIPT: 'request.path',
    },
    exampleOutput: '/api/users/42',
  },
  {
    id: 'req-body',
    label: 'Request body',
    description: 'Echo the full request body as a string.',
    syntax: {
      VELOCITY: '$!request.body',
      MUSTACHE: '{{ request.body }}',
      JAVASCRIPT: 'request.body',
    },
    exampleOutput: '{"name":"Alice"}',
  },
  {
    id: 'req-header',
    label: 'Request header',
    description: 'Echo a specific request header (first value). Replace "host" with the header name.',
    syntax: {
      VELOCITY: '$request.headers.host[0]',
      MUSTACHE: '{{ request.headers.host.0 }}',
      JAVASCRIPT: 'request.headers.host[0]',
    },
    exampleOutput: 'api.example.com',
  },
  {
    id: 'req-query',
    label: 'Query parameter',
    description: 'Echo a specific query string parameter. Replace "id" with the param name.',
    syntax: {
      VELOCITY: '$request.queryStringParameters.id[0]',
      MUSTACHE: '{{ request.queryStringParameters.id.0 }}',
      JAVASCRIPT: 'request.queryStringParameters.id[0]',
    },
    exampleOutput: '42',
  },
  {
    id: 'req-path-param',
    label: 'Path parameter',
    description: 'Echo a path parameter (e.g. for /users/{userId}). Replace "userId" with the param name.',
    syntax: {
      VELOCITY: '$request.pathParameters.userId[0]',
      MUSTACHE: '{{ request.pathParameters.userId.0 }}',
      JAVASCRIPT: 'request.pathParameters.userId[0]',
    },
    exampleOutput: '42',
  },
  {
    id: 'req-cookie',
    label: 'Request cookie',
    description: 'Echo a specific cookie value. Replace "session" with the cookie name.',
    syntax: {
      VELOCITY: '$request.cookies.session',
      MUSTACHE: '{{ request.cookies.session }}',
      JAVASCRIPT: 'request.cookies.session',
    },
    exampleOutput: 'abc123',
  },
];

const DYNAMIC_DATA: TemplateSnippet[] = [
  {
    id: 'uuid',
    label: 'UUID',
    description: 'Generate a random UUID (v4).',
    syntax: {
      VELOCITY: '$uuid',
      MUSTACHE: '{{ uuid }}',
      JAVASCRIPT: 'uuid',
    },
    exampleOutput: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  },
  {
    id: 'now-iso',
    label: 'Timestamp (ISO 8601)',
    description: 'Current date-time in ISO 8601 format.',
    syntax: {
      VELOCITY: '$now_iso_8601',
      MUSTACHE: '{{ now_iso_8601 }}',
      JAVASCRIPT: 'now_iso_8601',
    },
    exampleOutput: '2026-01-15T10:30:00Z',
  },
  {
    id: 'now-epoch',
    label: 'Timestamp (epoch seconds)',
    description: 'Current time as Unix epoch seconds.',
    syntax: {
      VELOCITY: '$now_epoch',
      MUSTACHE: '{{ now_epoch }}',
      JAVASCRIPT: 'now_epoch',
    },
    exampleOutput: '1768472400',
  },
  {
    id: 'now-rfc1123',
    label: 'Timestamp (RFC 1123)',
    description: 'Current date-time in RFC 1123 format (HTTP Date header style).',
    syntax: {
      VELOCITY: '$now_rfc_1123',
      MUSTACHE: '{{ now_rfc_1123 }}',
      JAVASCRIPT: 'now_rfc_1123',
    },
    exampleOutput: 'Wed, 15 Jan 2026 10:30:00 GMT',
  },
  {
    id: 'rand-int',
    label: 'Random integer (0-9)',
    description: 'A random integer between 0 and 9.',
    syntax: {
      VELOCITY: '$rand_int_10',
      MUSTACHE: '{{ rand_int_10 }}',
      JAVASCRIPT: 'rand_int_10',
    },
    exampleOutput: '7',
  },
  {
    id: 'rand-int-100',
    label: 'Random integer (0-99)',
    description: 'A random integer between 0 and 99.',
    syntax: {
      VELOCITY: '$rand_int_100',
      MUSTACHE: '{{ rand_int_100 }}',
      JAVASCRIPT: 'rand_int_100',
    },
    exampleOutput: '42',
  },
  {
    id: 'faker-name',
    label: 'Fake name',
    description: 'A random first name via Datafaker.',
    syntax: {
      VELOCITY: '$faker.name().firstName()',
      MUSTACHE: '{{ faker.name.firstName }}',
      JAVASCRIPT: "faker.name().firstName()",
    },
    exampleOutput: 'Alice',
  },
  {
    id: 'faker-email',
    label: 'Fake email',
    description: 'A random email address via Datafaker.',
    syntax: {
      VELOCITY: '$faker.internet().emailAddress()',
      MUSTACHE: '{{ faker.internet.emailAddress }}',
      JAVASCRIPT: "faker.internet().emailAddress()",
    },
    exampleOutput: 'alice.smith@example.com',
  },
];

const STRUCTURE: TemplateSnippet[] = [
  {
    id: 'json-skeleton',
    label: 'JSON response skeleton',
    description: 'A complete JSON response template echoing method, path, and body.',
    syntax: {
      VELOCITY: [
        '{',
        '  "statusCode": 200,',
        '  "headers": { "content-type": ["application/json"] },',
        '  "body": "{\\"method\\": \\"$request.method\\", \\"path\\": \\"$request.path\\"}"',
        '}',
      ].join('\n'),
      MUSTACHE: [
        '{',
        '  "statusCode": 200,',
        '  "headers": { "content-type": ["application/json"] },',
        '  "body": "{\\"method\\": \\"{{ request.method }}\\", \\"path\\": \\"{{ request.path }}\\"}"',
        '}',
      ].join('\n'),
      JAVASCRIPT: [
        'return {',
        '  statusCode: 200,',
        '  headers: { "content-type": ["application/json"] },',
        '  body: JSON.stringify({ method: request.method, path: request.path })',
        '};',
      ].join('\n'),
    },
    exampleOutput: '{ "statusCode": 200, "body": "{\\"method\\": \\"GET\\", \\"path\\": \\"/api\\"}" }',
  },
  {
    id: 'conditional',
    label: 'Conditional (if / else)',
    description: 'Return different responses based on the request method.',
    syntax: {
      VELOCITY: [
        "#if ( $request.method == 'POST' )",
        '{',
        '  "statusCode": 201,',
        '  "body": "created"',
        '}',
        '#else',
        '{',
        '  "statusCode": 200,',
        '  "body": "ok"',
        '}',
        '#end',
      ].join('\n'),
      MUSTACHE: [
        '{{#request.body}}',
        '{',
        '  "statusCode": 200,',
        '  "body": "has body: {{ request.body }}"',
        '}',
        '{{/request.body}}',
        '{{^request.body}}',
        '{',
        '  "statusCode": 200,',
        '  "body": "no body"',
        '}',
        '{{/request.body}}',
      ].join('\n'),
      JAVASCRIPT: [
        "if (request.method === 'POST') {",
        '  return { statusCode: 201, body: "created" };',
        '} else {',
        '  return { statusCode: 200, body: "ok" };',
        '}',
      ].join('\n'),
    },
    exampleOutput: '{ "statusCode": 201, "body": "created" }',
  },
  {
    id: 'loop-headers',
    label: 'Iterate over headers',
    description: 'Loop through all request headers and include them in the response.',
    syntax: {
      VELOCITY: [
        '{',
        '  "statusCode": 200,',
        "  \"body\": \"{'headers': [#foreach( $value in $request.headers.values() )'$value[0]'#if( $foreach.hasNext ), #end#end]}\"",
        '}',
      ].join('\n'),
      MUSTACHE: [
        '{',
        '  "statusCode": 200,',
        "  \"body\": \"{'headers': [{{#request.headers.entrySet}}{{^-first}}, {{/-first}}'{{ key }}={{ value.0 }}'{{/request.headers.entrySet}}]}\"",
        '}',
      ].join('\n'),
      JAVASCRIPT: [
        'var headers = [];',
        'for (var header in request.headers) {',
        "  headers.push(header + '=' + request.headers[header][0]);",
        '}',
        'return {',
        '  statusCode: 200,',
        "  body: JSON.stringify({ headers: headers })",
        '};',
      ].join('\n'),
    },
    exampleOutput: "{ \"headers\": [\"Host=example.com\", \"Accept=application/json\"] }",
  },
];

// ---------------------------------------------------------------------------
// Grouped categories — exported as the palette data source
// ---------------------------------------------------------------------------

const SNIPPET_CATEGORIES_EN: SnippetCategory[] = [
  {
    id: 'request-echoes',
    label: 'Request Echoes',
    snippets: REQUEST_ECHOES,
  },
  {
    id: 'dynamic-data',
    label: 'Dynamic Data',
    snippets: DYNAMIC_DATA,
  },
  {
    id: 'structure',
    label: 'Structure',
    snippets: STRUCTURE,
  },
];

const SNIPPET_ZH: Record<string, { label: string; description: string }> = {
  'req-method': { label: '请求方法', description: '回显传入请求的 HTTP 方法。' },
  'req-path': { label: '请求路径', description: '回显传入请求的路径。' },
  'req-body': { label: '请求消息体', description: '以字符串形式回显完整请求消息体。' },
  'req-header': { label: '请求头', description: '回显指定请求头的第一个值。请将“host”替换为请求头名称。' },
  'req-query': { label: '查询参数', description: '回显指定查询字符串参数。请将“id”替换为参数名称。' },
  'req-path-param': { label: '路径参数', description: '回显路径参数（例如 /users/{userId}）。请将“userId”替换为参数名称。' },
  'req-cookie': { label: '请求 Cookie', description: '回显指定 Cookie 的值。请将“session”替换为 Cookie 名称。' },
  uuid: { label: 'UUID', description: '生成随机 UUID (v4)。' },
  'now-iso': { label: '时间戳 (ISO 8601)', description: 'ISO 8601 格式的当前日期时间。' },
  'now-epoch': { label: '时间戳（Epoch 秒）', description: '以 Unix Epoch 秒数表示的当前时间。' },
  'now-rfc1123': { label: '时间戳 (RFC 1123)', description: 'RFC 1123 格式的当前日期时间（HTTP Date 请求头样式）。' },
  'rand-int': { label: '随机整数 (0-9)', description: '0 到 9 之间的随机整数。' },
  'rand-int-100': { label: '随机整数 (0-99)', description: '0 到 99 之间的随机整数。' },
  'faker-name': { label: '模拟姓名', description: '通过 Datafaker 生成随机名字。' },
  'faker-email': { label: '模拟电子邮件', description: '通过 Datafaker 生成随机电子邮件地址。' },
  'json-skeleton': { label: 'JSON 响应骨架', description: '回显方法、路径和消息体的完整 JSON 响应模板。' },
  conditional: { label: '条件判断 (if / else)', description: '根据请求方法返回不同响应。' },
  'loop-headers': { label: '遍历请求头', description: '遍历所有请求头并将其包含在响应中。' },
};

const CATEGORY_ZH: Record<string, string> = {
  'request-echoes': '请求回显',
  'dynamic-data': '动态数据',
  structure: '结构',
};

function localiseSnippet(snippet: TemplateSnippet): TemplateSnippet {
  return new Proxy(snippet, {
    get(target, property: string | symbol) {
      const value = Reflect.get(target, property) as unknown;
      if (property !== 'label' && property !== 'description') return value;
      return translate(value as string, SNIPPET_ZH[target.id]![property]);
    },
  });
}

export const SNIPPET_CATEGORIES: SnippetCategory[] = SNIPPET_CATEGORIES_EN.map((category) => ({
  ...category,
  get label() { return translate(category.label, CATEGORY_ZH[category.id]!); },
  snippets: category.snippets.map(localiseSnippet),
}));

/**
 * Flat list of all snippets — useful for lookup by id.
 */
export const ALL_SNIPPETS: TemplateSnippet[] = SNIPPET_CATEGORIES.flatMap((c) => c.snippets);
