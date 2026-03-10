import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import type { Vulnerability } from '../../data/vulnerabilities';
import type { Mitigation, CodeLanguage } from '../../data/mitigations';
import type { Test, ChatMessage, RunResult } from '../../types/testing';
import { VulnerabilityDocument } from './vulnerability-document';
import { TestDocument } from './test-document';
import { MitigationDocument } from './mitigation-document';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function exportVulnerabilityPdf(
  vulnerability: Vulnerability,
  resolvedMitigations: Mitigation[],
): Promise<void> {
  const doc = createElement(VulnerabilityDocument, {
    vulnerability,
    resolvedMitigations,
  });
  const blob = await pdf(doc).toBlob();
  triggerDownload(blob, `vulnerability-${slugify(vulnerability.id)}-report.pdf`);
}

export async function exportTestPdf(
  test: Test,
  chatMessages: ChatMessage[],
  runResult: RunResult | null,
  mitigationOptions?: { id: string; label: string }[],
): Promise<void> {
  const doc = createElement(TestDocument, {
    test,
    chatMessages,
    runResult,
    mitigationOptions,
  });
  const blob = await pdf(doc).toBlob();
  triggerDownload(blob, `test-${slugify(test.name)}-report.pdf`);
}

export async function exportMitigationPdf(
  mitigation: Mitigation,
  languages?: CodeLanguage[],
): Promise<void> {
  const doc = createElement(MitigationDocument, { mitigation, languages });
  const blob = await pdf(doc).toBlob();
  triggerDownload(blob, `mitigation-${slugify(mitigation.id)}-report.pdf`);
}
