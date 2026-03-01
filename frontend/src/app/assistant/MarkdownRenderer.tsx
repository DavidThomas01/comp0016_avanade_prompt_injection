import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

type Props = { content: string };

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold mt-2.5 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold mt-2 mb-0.5">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} className="text-orange-600 dark:text-orange-400 underline hover:text-orange-800 dark:hover:text-orange-300" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <pre className="bg-gray-800 dark:bg-gray-900 text-gray-100 rounded-lg px-3 py-2 my-2 overflow-x-auto text-xs leading-relaxed">
          <code>{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-gray-200/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded text-xs font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-orange-300 dark:border-orange-600 pl-3 my-2 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 bg-gray-50 dark:bg-gray-800 font-semibold text-left">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">{children}</td>
  ),
  hr: () => <hr className="my-2 border-border" />,
};

export function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
